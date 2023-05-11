import { hexToBytes, bytesToHex, dSHA256 } from './utils.js';
import * as nobleSecp256k1 from '@noble/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import { ripemd160 } from '@noble/hashes/ripemd160';
import { generateMnemonic, mnemonicToSeed, validateMnemonic } from 'bip39';
import { doms, beforeUnloadListener } from './global.js';
import HDKey from 'hdkey';
import { getNetwork } from './network.js';
import {
    pubKeyHashNetworkLen,
    confirmPopup,
    writeToUint8,
    pubPrebaseLen,
    createQR,
    createAlert,
    sleep,
    getSafeRand,
} from './misc.js';
import {
    refreshChainData,
    hideAllWalletOptions,
    getBalance,
    getStakingBalance,
} from './global.js';
import {
    cChainParams,
    MAX_ACCOUNT_GAP,
    PRIVKEY_BYTE_LENGTH,
} from './chain_params.js';
import { ALERTS } from './i18n.js';
import { encrypt, decrypt } from './aes-gcm.js';
import bs58 from 'bs58';
import AppBtc from '@ledgerhq/hw-app-btc';
import TransportWebUSB from '@ledgerhq/hw-transport-webusb';
import createXpub from 'create-xpub';
import * as jdenticon from 'jdenticon';

export let fWalletLoaded = false;

/**
 * Abstract class masterkey
 * @abstract
 */
class MasterKey {
    _isHD = false;
    _isHardwareWallet = false;
    _isViewOnly = false;
    /**
     * @param {String} [_path] - BIP32 path pointing to the private key.
     * @return {Promise<Uint8Array>} Array of bytes containing private key
     * @abstract
     */
    getPrivateKeyBytes(_path) {
        throw new Error('Not implemented');
    }

    /**
     * @param {String} [path] - BIP32 path pointing to the private key.
     * @return {Promise<String>} encoded private key
     * @abstract
     */
    async getPrivateKey(path) {
        return generateOrEncodePrivkey(await this.getPrivateKeyBytes(path))
            .strWIF;
    }

    /**
     * @param {String} [path] - BIP32 path pointing to the address
     * @param {any} [_options]
     * @return {Promise<String>} Address
     * @abstract
     */
    async getAddress(path, _options) {
        return deriveAddress({ pkBytes: await this.getPrivateKeyBytes(path) });
    }

    /**
     * @param {String} _path - BIP32 path pointing to the xpub
     * @return {Promise<String>} xpub
     * @abstract
     */
    getxpub(_path) {
        throw new Error('Not implemented');
    }

    /**
     * Wipe all private data from key.
     * @return {void}
     * @abstract
     */
    wipePrivateData() {
        throw new Error('Not implemented');
    }

    /**
     * @return {String} private key suitable for backup.
     * @abstract
     */
    get keyToBackup() {
        throw new Error('Not implemented');
    }

    /**
     * @return {Promise<String> | String} public key to export. Only suitable for monitoring balance.
     * @abstract
     */
    get keyToExport() {
        throw new Error('Not implemented');
    }

    /**
     * @return {Boolean} Whether or not this is a Hierarchical Deterministic wallet
     */
    get isHD() {
        return this._isHD;
    }

    /**
     * @return {Boolean} Whether or not this is a hardware wallet
     */
    get isHardwareWallet() {
        return this._isHardwareWallet;
    }

    /**
     * @return {Boolean} Whether or not this key is view only or not
     */
    get isViewOnly() {
        return this._isViewOnly;
    }
}

export class HdMasterKey extends MasterKey {
    /**
     * Constructs a Hierarchical Deterministic key from a seed
     * xpub or xpriv
     * @param {Object} o
     * @param {Uint8Array | Number[]} [o.seed]
     * @param {String} [o.xpriv]
     * @param {String} [o.xpub]
     */
    constructor({ seed, xpriv, xpub }) {
        super();
        // Generate the HDKey
        if (seed) this._hdKey = HDKey.fromMasterSeed(seed);
        if (xpriv) this._hdKey = HDKey.fromExtendedKey(xpriv);
        if (xpub) this._hdKey = HDKey.fromExtendedKey(xpub);
        this._isViewOnly = !!xpub;
        if (!this._hdKey)
            throw new Error('All of seed, xpriv and xpub are undefined');
        this._isHD = true;
        this._isHardwareWallet = false;
    }

    getPrivateKeyBytes(path) {
        if (this.isViewOnly) {
            throw new Error(
                'Trying to get private key bytes from a view only key'
            );
        }
        return this._hdKey.derive(path).privateKey;
    }

    get keyToBackup() {
        if (this.isViewOnly) {
            throw new Error('Trying to get private key from a view only key');
        }
        return this._hdKey.privateExtendedKey;
    }

    getxpub(path) {
        if (this.isViewOnly) return this._hdKey.publicExtendedKey;
        return this._hdKey.derive(path).publicExtendedKey;
    }

    async getAddress(path) {
        let child;
        if (this.isViewOnly) {
            // If we're view only we can't derive hardened keys, so we'll assume
            // That the xpub has already been derived
            child = this._hdKey.derive(
                path
                    .split('/')
                    .filter((n) => !n.includes("'"))
                    .join('/')
            );
        } else {
            child = this._hdKey.derive(path);
        }
        return deriveAddress({ publicKey: bytesToHex(child.publicKey) });
    }

    wipePrivateData() {
        if (this._isViewOnly) return;

        this._hdKey = HDKey.fromExtendedKey(this.keyToExport);
        this._isViewOnly = true;
    }

    get keyToExport() {
        if (this._isViewOnly) return this._hdKey.publicExtendedKey;
        // We need the xpub to point at the account level
        return this._hdKey.derive(
            getDerivationPath(false).split('/').slice(0, 4).join('/')
        ).publicExtendedKey;
    }
}

export class HardwareWalletMasterKey extends MasterKey {
    constructor() {
        super();
        this._isHD = true;
        this._isHardwareWallet = true;
    }

    /**
     * @returns {never} Throws error because hardware wallets don't have exportable private keys
     */
    getPrivateKeyBytes(_path) {
        throw new Error('Hardware wallets cannot export private keys');
    }

    async getAddress(path, { verify = false } = {}) {
        return deriveAddress({
            publicKey: await this.getPublicKey(path, { verify }),
        });
    }

    async getPublicKey(path, { verify = false } = {}) {
        return deriveAddress({
            publicKey: await getHardwareWalletKeys(path, false, verify),
            output: 'COMPRESSED_HEX',
        });
    }

    /**
     * @returns {never} Throws error because hardware wallets don't have keys to backup
     */
    get keyToBackup() {
        throw new Error("Hardware wallets don't have keys to backup");
    }

    async getxpub(path) {
        if (!this.xpub) {
            this.xpub = await getHardwareWalletKeys(path, true);
        }
        return this.xpub;
    }

    // Hardware Wallets don't have exposed private data
    wipePrivateData() {}

    get isViewOnly() {
        return false;
    }
    get keyToExport() {
        return this.getxpub(
            getDerivationPath(true)
                .split('/')
                .filter((v) => !v.includes("'"))
                .join('/')
        );
    }
}

export class LegacyMasterKey extends MasterKey {
    /**
     * Constructs a legacy key, i.e. one that cannot derive
     * more addresses, but is tied to only one
     * @param {Object} o
     * @param {Number[] | Uint8Array} [o.pkBytes] - Private key bytes
     * @param {String} [o.address] - Address
     */
    constructor({ pkBytes, address }) {
        super();
        this._isHD = false;
        this._isHardwareWallet = false;
        this._pkBytes = pkBytes;
        this._address = address || super.getAddress();
        this._isViewOnly = !!address;
    }

    async getAddress() {
        return await this._address;
    }

    get keyToExport() {
        return this._address;
    }

    async getPrivateKeyBytes(_path) {
        if (this.isViewOnly) {
            throw new Error(
                'Trying to get private key bytes from a view only key'
            );
        }
        return new Uint8Array(this._pkBytes);
    }

    get keyToBackup() {
        return generateOrEncodePrivkey(this._pkBytes).strWIF;
    }

    /**
     * @returns {never} Throws error because legacy keys don't have xpubs
     */
    getxpub(_path) {
        throw new Error(
            'Trying to get an extended public key from a legacy address'
        );
    }

    wipePrivateData() {
        this._pkBytes = null;
        this._isViewOnly = true;
    }
}

// Ledger Hardware wallet constants
export const LEDGER_ERRS = new Map([
    // Ledger error code <--> User-friendly string
    [25870, 'Open the PIVX app on your device'],
    [25873, 'Open the PIVX app on your device'],
    [57408, 'Navigate to the PIVX app on your device'],
    [27157, 'Wrong app! Open the PIVX app on your device'],
    [27266, 'Wrong app! Open the PIVX app on your device'],
    [27904, 'Wrong app! Open the PIVX app on your device'],
    [27010, 'Unlock your Ledger, then try again!'],
    [27404, 'Unlock your Ledger, then try again!'],
]);

/**
 * @type {MasterKey}
 */
export let masterKey;

// Construct a full BIP44 pubkey derivation path from it's parts
export function getDerivationPath(
    fLedger = false,
    nAccount = 0,
    nReceiving = 0,
    nIndex = 0
) {
    // Coin-Type is different on Ledger, as such, we modify it if we're using a Ledger to derive a key
    const strCoinType = fLedger
        ? cChainParams.current.BIP44_TYPE_LEDGER
        : cChainParams.current.BIP44_TYPE;
    if (masterKey && !masterKey.isHD && !fLedger) {
        return `:)//${strCoinType}'`;
    }
    return `m/44'/${strCoinType}'/${nAccount}'/${nReceiving}/${nIndex}`;
}

// Verify the integrity of a WIF private key, optionally parsing and returning the key payload
export function verifyWIF(
    strWIF = '',
    fParseBytes = false,
    skipVerification = false
) {
    // Convert from Base58
    const bWIF = bs58.decode(strWIF);

    if (!skipVerification) {
        // Verify the byte length
        if (bWIF.byteLength !== PRIVKEY_BYTE_LENGTH) {
            throw Error(
                'Private key length (' +
                    bWIF.byteLength +
                    ') is invalid, should be ' +
                    PRIVKEY_BYTE_LENGTH +
                    '!'
            );
        }

        // Verify the network byte
        if (bWIF[0] !== cChainParams.current.SECRET_KEY) {
            // Find the network it's trying to use, if any
            const cNetwork = Object.keys(cChainParams)
                .filter((strNet) => strNet !== 'current')
                .map((strNet) => cChainParams[strNet])
                .find((cNet) => cNet.SECRET_KEY === bWIF[0]);
            // Give a specific alert based on the byte properties
            throw Error(
                cNetwork
                    ? 'This private key is for ' +
                          (cNetwork.isTestnet ? 'Testnet' : 'Mainnet') +
                          ', wrong network!'
                    : 'This private key belongs to another coin, or is corrupted.'
            );
        }

        // Perform SHA256d hash of the WIF bytes
        const shaHash = dSHA256(bWIF.slice(0, 34));

        // Verify checksum (comparison by String since JS hates comparing object-like primitives)
        const bChecksumWIF = bWIF.slice(bWIF.byteLength - 4);
        const bChecksum = shaHash.slice(0, 4);
        if (bChecksumWIF.join('') !== bChecksum.join('')) {
            throw Error(
                'Private key checksum is invalid, key may be modified, mis-typed, or corrupt.'
            );
        }
    }

    return fParseBytes ? Uint8Array.from(bWIF.slice(1, 33)) : true;
}

/**
 * A convenient alias to verifyWIF that returns the raw byte payload
 * @param {String} strWIF
 * @param {Boolean} skipVerification
 * @returns {Uint8Array} parsed strWIF
 */
export function parseWIF(strWIF, skipVerification = false) {
    // @ts-ignore we know it's going to return Uint8Array
    return verifyWIF(strWIF, true, skipVerification);
}

// Generate a new private key OR encode an existing private key from raw bytes
export function generateOrEncodePrivkey(pkBytesToEncode) {
    // Private Key Generation
    const pkBytes = pkBytesToEncode || getSafeRand();
    const pkNetBytesLen = pkBytes.length + 2;
    const pkNetBytes = new Uint8Array(pkNetBytesLen);

    // Network Encoding
    pkNetBytes[0] = cChainParams.current.SECRET_KEY; // Private key prefix (1 byte)
    writeToUint8(pkNetBytes, pkBytes, 1); // Private key bytes  (32 bytes)
    pkNetBytes[pkNetBytesLen - 1] = 1; // Leading digit      (1 byte)

    // Double SHA-256 hash
    const shaObj = dSHA256(pkNetBytes);

    // WIF Checksum
    const checksum = shaObj.slice(0, 4);
    const keyWithChecksum = new Uint8Array(pkNetBytesLen + checksum.length);
    writeToUint8(keyWithChecksum, pkNetBytes, 0);
    writeToUint8(keyWithChecksum, checksum, pkNetBytesLen);

    // Return both the raw bytes and the WIF format
    return { pkBytes, strWIF: bs58.encode(keyWithChecksum) };
}

/**
 * Compress an uncompressed Public Key in byte form
 * @param {Array<Number> | Uint8Array} pubKeyBytes - The uncompressed public key bytes
 * @returns {Uint8Array} The compressed public key bytes
 */
function compressPublicKey(pubKeyBytes) {
    if (pubKeyBytes.length != 65)
        throw new Error('Attempting to compress an invalid uncompressed key');
    const x = pubKeyBytes.slice(1, 33);
    const y = pubKeyBytes.slice(33);

    // Compressed key is [key_parity + 2, x]
    return new Uint8Array([y[31] % 2 === 0 ? 2 : 3, ...x]);
}

/**
 * Derive a Secp256k1 network-encoded public key (coin address) from raw private or public key bytes
 * @param {Object} options - The object to deconstruct
 * @param {String} [options.publicKey] - The hex encoded public key. Can be both compressed or uncompressed
 * @param {Array<Number> | Uint8Array} [options.pkBytes] - An array of bytes containing the private key
 * @param {"ENCODED" | "UNCOMPRESSED_HEX" | "COMPRESSED_HEX"} [options.output] - Output
 * @return {String} the public key with the specified encoding
 */
export function deriveAddress({ pkBytes, publicKey, output = 'ENCODED' }) {
    if (!pkBytes && !publicKey) return null;
    const compress = output !== 'UNCOMPRESSED_HEX';
    // Public Key Derivation
    let pubKeyBytes = publicKey
        ? hexToBytes(publicKey)
        : // @ts-ignore trust me it works
          nobleSecp256k1.getPublicKey(pkBytes, compress);

    if (output === 'UNCOMPRESSED_HEX') {
        if (pubKeyBytes.length !== 65) {
            // It's actually possible, but it's probably not something that we'll need
            throw new Error("Can't uncompress an already compressed key");
        }
        return bytesToHex(pubKeyBytes);
    }

    if (pubKeyBytes.length === 65) {
        pubKeyBytes = compressPublicKey(pubKeyBytes);
    }

    if (pubKeyBytes.length != 33) {
        throw new Error('Invalid public key');
    }

    if (output === 'COMPRESSED_HEX') {
        return bytesToHex(pubKeyBytes);
    }

    // First pubkey SHA-256 hash
    const pubKeyHashing = sha256(new Uint8Array(pubKeyBytes));

    // RIPEMD160 hash
    const pubKeyHashRipemd160 = ripemd160(pubKeyHashing);

    // Network Encoding
    const pubKeyHashNetwork = new Uint8Array(pubKeyHashNetworkLen);
    pubKeyHashNetwork[0] = cChainParams.current.PUBKEY_ADDRESS;
    writeToUint8(pubKeyHashNetwork, pubKeyHashRipemd160, 1);

    // Double SHA-256 hash
    const pubKeyHashingSF = dSHA256(pubKeyHashNetwork);

    // Checksum
    const checksumPubKey = pubKeyHashingSF.slice(0, 4);

    // Public key pre-base58
    const pubKeyPreBase = new Uint8Array(pubPrebaseLen);
    writeToUint8(pubKeyPreBase, pubKeyHashNetwork, 0);
    writeToUint8(pubKeyPreBase, checksumPubKey, pubKeyHashNetworkLen);

    // Encode as Base58 human-readable network address
    return bs58.encode(pubKeyPreBase);
}

/**
 * Import a wallet (with it's private, public or encrypted data)
 * @param {object} options
 * @param {string | Array<number> | null} [options.newWif] - The import data (if omitted, the UI input is accessed)
 * @param {boolean} [options.fRaw] - Whether the import data is raw bytes or encoded (WIF, xpriv, seed)
 * @param {boolean} [options.isHardwareWallet] - Whether the import is from a Hardware wallet or not
 * @param {boolean} [options.skipConfirmation] - Whether to skip the import UI confirmation or not
 * @param {boolean} [options.fSavePublicKey] - Whether to save the derived public key to disk (for View Only mode)
 * @param {boolean} [options.fStartup] - Whether the import is at Startup or at Runtime
 * @returns {Promise<void>}
 */
export async function importWallet({
    newWif = null,
    fRaw = false,
    isHardwareWallet = false,
    skipConfirmation = false,
    fSavePublicKey = false,
    fStartup = false,
} = {}) {
    const strImportConfirm =
        "Do you really want to import a new address? If you haven't saved the last private key, the wallet will be LOST forever.";
    const walletConfirm =
        fWalletLoaded && !skipConfirmation
            ? await confirmPopup({
                  title: 'Confirm the import?',
                  html: strImportConfirm,
              })
            : true;

    if (walletConfirm) {
        if (isHardwareWallet) {
            // Firefox does NOT support WebUSB, thus cannot work with Hardware wallets out-of-the-box
            if (navigator.userAgent.includes('Firefox')) {
                return createAlert(
                    'warning',
                    ALERTS.WALLET_FIREFOX_UNSUPPORTED,
                    [],
                    7500
                );
            }
            const publicKey = await getHardwareWalletKeys(
                getDerivationPath(true)
            );
            // Errors are handled within the above function, so there's no need for an 'else' here, just silent ignore.
            if (!publicKey) return;

            // Derive our hardware address and import!
            setMasterKey(new HardwareWalletMasterKey());

            // Hide the 'export wallet' button, it's not relevant to hardware wallets
            doms.domExportWallet.hidden = true;

            createAlert(
                'info',
                ALERTS.WALLET_HARDWARE_WALLET,
                [{ hardwareWallet: strHardwareName }],
                12500
            );
        } else {
            // If raw bytes: purely encode the given bytes rather than generating our own bytes
            if (fRaw) {
                newWif = generateOrEncodePrivkey(newWif).strWIF;

                // A raw import likely means non-user owned key (i.e: created via VanityGen), thus, we assume safety first and add an exit blocking listener
                addEventListener('beforeunload', beforeUnloadListener, {
                    capture: true,
                });
            }

            // Select WIF from internal source OR user input (could be: WIF, Mnemonic or xpriv)
            const privateImportValue = newWif || doms.domPrivKey.value;
            const passphrase = doms.domPrivKeyPassword.value;
            doms.domPrivKey.value = '';
            doms.domPrivKeyPassword.value = '';

            if (await verifyMnemonic(privateImportValue)) {
                // Generate our masterkey via Mnemonic Phrase
                const seed = await mnemonicToSeed(
                    privateImportValue,
                    passphrase
                );
                setMasterKey(new HdMasterKey({ seed }));
            } else {
                // Public Key Derivation
                try {
                    if (privateImportValue.startsWith('xpub')) {
                        setMasterKey(
                            new HdMasterKey({
                                xpub: privateImportValue,
                            })
                        );
                    } else if (privateImportValue.startsWith('xprv')) {
                        setMasterKey(
                            new HdMasterKey({
                                xpriv: privateImportValue,
                            })
                        );
                    } else if (
                        privateImportValue.length === 34 &&
                        cChainParams.current.PUBKEY_PREFIX.includes(
                            privateImportValue[0]
                        )
                    ) {
                        setMasterKey(
                            new LegacyMasterKey({
                                address: privateImportValue,
                            })
                        );
                    } else {
                        // Lastly, attempt to parse as a WIF private key
                        const pkBytes = parseWIF(privateImportValue);

                        // Import the raw private key
                        setMasterKey(new LegacyMasterKey({ pkBytes }));
                    }
                } catch (e) {
                    return createAlert(
                        'warning',
                        ALERTS.FAILED_TO_IMPORT + e.message,
                        [],
                        6000
                    );
                }
            }
        }

        // Reaching here: the deserialisation was a full cryptographic success, so a wallet is now imported!
        fWalletLoaded = true;

        // Hide wipe wallet button if there is no private key
        if (masterKey.isViewOnly || masterKey.isHardwareWallet) {
            doms.domWipeWallet.hidden = true;
            if (hasEncryptedWallet()) {
                doms.domRestoreWallet.hidden = false;
            }
        }

        // If allowed and requested, save the public key to disk for future View Only mode
        if (fSavePublicKey && !masterKey.isHardwareWallet) {
            localStorage.setItem('publicKey', await masterKey.keyToExport);
        }

        // For non-HD wallets: hide the 'new address' button, since these are essentially single-address MPW wallets
        if (!masterKey.isHD) doms.domNewAddress.style.display = 'none';

        // Update the loaded address in the Dashboard
        await getNewAddress({ updateGUI: true });

        // Display Text
        doms.domGuiWallet.style.display = 'block';
        doms.domDashboard.click();

        // Update identicon
        doms.domIdenticon.dataset.jdenticonValue = masterKey.getAddress(
            getDerivationPath()
        );
        jdenticon.update('#identicon');

        // Hide the encryption prompt if the user is in Testnet mode
        // ... or is using a hardware wallet, or is view-only mode.
        if (
            !(
                cChainParams.current.isTestnet ||
                isHardwareWallet ||
                masterKey.isViewOnly
            )
        ) {
            if (
                // If the wallet was internally imported (not UI pasted), like via vanity, display the encryption prompt
                (((fRaw && newWif.length) || newWif) &&
                    !hasEncryptedWallet()) ||
                // If the wallet was pasted and is an unencrypted key, then display the encryption prompt
                !hasEncryptedWallet()
            ) {
                doms.domGenKeyWarning.style.display = 'block';
            } else if (hasEncryptedWallet()) {
                // If the wallet was pasted and is an encrypted import, display the lock wallet UI
                doms.domWipeWallet.hidden = false;
            }
        }

        // Fetch state from explorer, if this import was post-startup
        if (getNetwork().enabled && !fStartup) refreshChainData();

        // Hide all wallet starter options
        hideAllWalletOptions();
    }
}

function setMasterKey(mk) {
    masterKey = mk;
    // Update the network master key
    getNetwork().setMasterKey(masterKey);
}

// Wallet Generation
export async function generateWallet(noUI = false) {
    const strImportConfirm =
        "Do you really want to import a new address? If you haven't saved the last private key, the wallet will be LOST forever.";
    const walletConfirm =
        fWalletLoaded && !noUI
            ? await confirmPopup({
                  title: 'Import new address?',
                  html: strImportConfirm,
              })
            : true;
    if (walletConfirm) {
        const mnemonic = generateMnemonic();

        const passphrase = !noUI
            ? await informUserOfMnemonic(mnemonic)
            : undefined;
        const seed = await mnemonicToSeed(mnemonic, passphrase);

        // Prompt the user to encrypt the seed
        setMasterKey(new HdMasterKey({ seed }));
        fWalletLoaded = true;

        if (!cChainParams.current.isTestnet)
            doms.domGenKeyWarning.style.display = 'block';
        // Add a listener to block page unloads until we are sure the user has saved their keys, safety first!
        addEventListener('beforeunload', beforeUnloadListener, {
            capture: true,
        });

        // Display the dashboard
        doms.domGuiWallet.style.display = 'block';
        hideAllWalletOptions();

        // Update identicon
        doms.domIdenticon.dataset.jdenticonValue = masterKey.getAddress(
            getDerivationPath()
        );
        jdenticon.update('#identicon');

        await getNewAddress({ updateGUI: true });

        // Refresh the balance UI (why? because it'll also display any 'get some funds!' alerts)
        getBalance(true);
        getStakingBalance(true);
    }

    return masterKey;
}

export async function verifyMnemonic(strMnemonic = '', fPopupConfirm = true) {
    const nWordCount = strMnemonic.trim().split(/\s+/g).length;

    // Sanity check: Convert to lowercase
    strMnemonic = strMnemonic.toLowerCase();

    // Ensure it's a word count that makes sense
    if (nWordCount >= 12 && nWordCount <= 24) {
        if (!validateMnemonic(strMnemonic)) {
            // The reason we want to ask the user for confirmation is that the mnemonic
            // Could have been generated with another app that has a different dictionary
            return (
                fPopupConfirm &&
                (await confirmPopup({
                    title: 'Unexpected Seed Phrase',
                    html: 'The seed phrase is either invalid, or was not generated by MPW.<br>Do you still want to proceed?',
                }))
            );
        } else {
            // Valid count and mnemonic
            return true;
        }
    } else {
        // Invalid count
        return false;
    }
}

function informUserOfMnemonic(mnemonic) {
    return new Promise((res, _) => {
        // @ts-ignore
        $('#mnemonicModal').modal({ keyboard: false });
        doms.domMnemonicModalContent.innerText = mnemonic;
        doms.domMnemonicModalButton.onclick = () => {
            res(doms.domMnemonicModalPassphrase.value);
            // @ts-ignore
            $('#mnemonicModal').modal('hide');
        };
        // @ts-ignore
        $('#mnemonicModal').modal('show');
    });
}

export async function encryptWallet(strPassword = '') {
    // Encrypt the wallet WIF with AES-GCM and a user-chosen password - suitable for browser storage
    let strEncWIF = await encrypt(masterKey.keyToBackup, strPassword);
    if (!strEncWIF) return false;

    // Set the encrypted wallet in localStorage
    localStorage.setItem('encwif', strEncWIF);
    localStorage.setItem('publicKey', await masterKey.keyToExport);

    // Hide the encryption warning
    doms.domGenKeyWarning.style.display = 'none';

    // Remove the exit blocker, we can annoy the user less knowing the key is safe in their localstorage!
    removeEventListener('beforeunload', beforeUnloadListener, {
        capture: true,
    });
}

export async function decryptWallet(strPassword = '') {
    // Check if there's any encrypted WIF available
    const strEncWIF = localStorage.getItem('encwif');
    if (!strEncWIF || strEncWIF.length < 1) return false;

    // Prompt to decrypt it via password
    const strDecWIF = await decrypt(strEncWIF, strPassword);
    if (!strDecWIF || strDecWIF === 'decryption failed!') {
        if (strDecWIF)
            return createAlert('warning', 'Incorrect password!', 6000);
    } else {
        await importWallet({
            newWif: strDecWIF,
            skipConfirmation: true,
            // Save the public key to disk for View Only mode
            fSavePublicKey: true,
        });
        return true;
    }
}

export function hasEncryptedWallet() {
    return localStorage.getItem('encwif') ? true : false;
}

// If the privateKey is null then the user connected a hardware wallet
export function hasHardwareWallet() {
    if (!masterKey) return false;
    return masterKey.isHardwareWallet == true;
}

export function hasWalletUnlocked(fIncludeNetwork = false) {
    if (fIncludeNetwork && !getNetwork().enabled)
        return createAlert(
            'warning',
            ALERTS.WALLET_OFFLINE_AUTOMATIC,
            [],
            5500
        );
    if (!masterKey) {
        return createAlert(
            'warning',
            ALERTS.WALLET_UNLOCK_IMPORT,
            [{ unlock: hasEncryptedWallet() ? 'unlock ' : 'import/create' }],
            3500
        );
    } else {
        return true;
    }
}

let addressIndex = 0;
export async function isYourAddress(address) {
    let i = 0;
    while (i < addressIndex) {
        const path = getDerivationPath(masterKey.isHardwareWallet, 0, 0, i);
        const testAddress = await masterKey.getAddress(path);
        if (address === testAddress) {
            return [true, path];
        }
        i++;
    }
    return [false, 0];
}

function createAddressConfirmation(address) {
    return `Please confirm this is the address you see on your ${strHardwareName}.
              <div class="seed-phrase">${address}</div>`;
}

export async function getNewAddress({
    updateGUI = false,
    verify = false,
} = {}) {
    const last = getNetwork().lastWallet;
    addressIndex = addressIndex > last ? addressIndex : last + 1;
    if (addressIndex - last > MAX_ACCOUNT_GAP) {
        // If the user creates more than ${MAX_ACCOUNT_GAP} empty wallets we will not be able to sync them!
        addressIndex = last;
    }
    const path = getDerivationPath(
        masterKey.isHardwareWallet,
        0,
        0,
        addressIndex
    );
    // Use Xpub?
    const address = await masterKey.getAddress(path);
    if (verify && masterKey.isHardwareWallet) {
        // Generate address to present to the user without asking to verify
        const confAddress = await confirmPopup({
            title: ALERTS.CONFIRM_POPUP_VERIFY_ADDR,
            html: createAddressConfirmation(address),
            resolvePromise: masterKey.getAddress(path, { verify }),
        });
        if (address !== confAddress) {
            throw new Error('User did not verify address');
        }
    }

    if (updateGUI) {
        createQR('pivx:' + address, doms.domModalQR);
        doms.domModalQrLabel.innerHTML =
            'pivx:' +
            address +
            `<i onclick="MPW.toClipboard('${address}', this)" id="guiAddressCopy" class="fas fa-clipboard" style="cursor: pointer; width: 20px;"></i>`;
        doms.domModalQR.firstChild.style.width = '100%';
        doms.domModalQR.firstChild.style.height = 'auto';
        doms.domModalQR.firstChild.classList.add('no-antialias');
        // @ts-ignore
        document.getElementById('clipboard').value = address;
    }
    addressIndex++;
    return [address, path];
}

/**
 * @type{AppBtc?}
 */
export let cHardwareWallet = null;
export let strHardwareName = '';
let transport;
async function getHardwareWalletKeys(
    path,
    xpub = false,
    verify = false,
    _attempts = 0
) {
    try {
        // Check if we haven't setup a connection yet OR the previous connection disconnected
        if (!cHardwareWallet || transport._disconnectEmitted) {
            transport = await TransportWebUSB.create();
            cHardwareWallet = new AppBtc({ transport, currency: 'PIVX' });
        }

        // Update device info and fetch the pubkey
        strHardwareName =
            transport.device.manufacturerName +
            ' ' +
            transport.device.productName;

        // Prompt the user in both UIs
        if (verify) createAlert('info', ALERTS.WALLET_CONFIRM_L, [], 3500);
        const cPubKey = await cHardwareWallet.getWalletPublicKey(path, {
            verify,
            format: 'legacy',
        });

        if (xpub) {
            return createXpub({
                depth: 3,
                childNumber: 2147483648,
                chainCode: cPubKey.chainCode,
                publicKey: cPubKey.publicKey,
            });
        } else {
            return cPubKey.publicKey;
        }
    } catch (e) {
        if (e.message.includes('denied by the user')) {
            // User denied an operation
            return false;
        }

        // If there's no device, nudge the user to plug it in.
        if (e.message.toLowerCase().includes('no device selected')) {
            createAlert('info', ALERTS.WALLET_NO_HARDWARE, [], 10000);
            return false;
        }

        // If the device is unplugged, or connection lost through other means (such as spontanious device explosion)
        if (e.message.includes("Failed to execute 'transferIn'")) {
            createAlert(
                'info',
                ALERTS.WALLET_HARDWARE_CONNECTION_LOST,
                [
                    {
                        hardwareWallet: strHardwareName,
                    },
                ],
                10000
            );
            return false;
        }
        if (_attempts < 10) {
            // This is an ugly hack :(
            // in the event where multiple parts of the code decide to ask for an address, just
            // Retry at most 10 times waiting 200ms each time
            await sleep(200);
            return await getHardwareWalletKeys(
                path,
                xpub,
                verify,
                _attempts + 1
            );
        }

        // If the ledger is busy, just nudge the user.
        if (e.message.includes('is busy')) {
            createAlert(
                'info',
                ALERTS.WALLET_HARDWARE_BUSY,
                [
                    {
                        hardwareWallet: strHardwareName,
                    },
                ],
                7500
            );
            return false;
        }

        // Check if this is an expected error
        if (!e.statusCode || !LEDGER_ERRS.has(e.statusCode)) {
            console.error(
                'MISSING LEDGER ERROR-CODE TRANSLATION! - Please report this below error on our GitHub so we can handle it more nicely!'
            );
            console.error(e);
        }

        // Translate the error to a user-friendly string (if possible)
        createAlert(
            'warning',
            ALERTS.WALLET_HARDWARE_ERROR,
            [
                {
                    hardwareWallet: strHardwareName,
                },
                {
                    error: LEDGER_ERRS.get(e.statusCode),
                },
            ],
            5500
        );

        return false;
    }
}
