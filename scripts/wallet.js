import { parseWIF } from './encoding.js';
import { generateMnemonic, mnemonicToSeed, validateMnemonic } from 'bip39';
import { doms, beforeUnloadListener } from './global.js';
import { getNetwork } from './network.js';
import { MAX_ACCOUNT_GAP, cChainParams } from './chain_params.js';
import {
    LegacyMasterKey,
    HdMasterKey,
    HardwareWalletMasterKey,
} from './masterkey.js';
import { generateOrEncodePrivkey } from './encoding.js';
import {
    confirmPopup,
    createAlert,
    isXPub,
    isStandardAddress,
} from './misc.js';
import {
    refreshChainData,
    setDisplayForAllWalletOptions,
    getStakingBalance,
} from './global.js';
import { ALERTS, tr, translation } from './i18n.js';
import { encrypt, decrypt } from './aes-gcm.js';
import * as jdenticon from 'jdenticon';
import { Database } from './database.js';
import { guiRenderCurrentReceiveModal } from './contacts-book.js';
import { Account } from './accounts.js';
import { debug, fAdvancedMode } from './settings.js';
import { bytesToHex, hexToBytes } from './utils.js';
import { strHardwareName, getHardwareWalletKeys } from './ledger.js';
import { UTXO_WALLET_STATE } from './mempool.js';
import {
    isP2CS,
    isP2PKH,
    getAddressFromPKH,
    COLD_START_INDEX,
    P2PK_START_INDEX,
    OWNER_START_INDEX,
} from './script.js';
import { getEventEmitter } from './event_bus.js';
export let fWalletLoaded = false;

/**
 * Class Wallet, at the moment it is just a "realization" of Masterkey with a given nAccount
 * it also remembers which addresses we generated.
 * in future PRs this class will manage balance, UTXOs, masternode etc...
 */
export class Wallet {
    /**
     * @type {import('./masterkey.js').MasterKey}
     */
    #masterKey;
    /**
     * @type {number}
     */
    #nAccount;
    /**
     * @type {number}
     */
    #addressIndex = 0;
    /**
     * Map our own address -> Path
     * @type {Map<String, String?>}
     */
    #ownAddresses = new Map();
    /**
     * Map public key hash -> Address
     * @type {Map<String,String>}
     */
    #knownPKH = new Map();
    /**
     * True if this is the global wallet, false otherwise
     * @type {Boolean}
     */
    #isMainWallet;
    constructor(nAccount, isMainWallet) {
        this.#nAccount = nAccount;
        this.#isMainWallet = isMainWallet;
    }

    getMasterKey() {
        return this.#masterKey;
    }

    /**
     * Gets the Cold Staking Address for the current wallet, while considering user settings and network automatically.
     * @return {Promise<String>} Cold Address
     */
    async getColdStakingAddress() {
        // Check if we have an Account with custom Cold Staking settings
        const cDB = await Database.getInstance();
        const cAccount = await cDB.getAccount();

        // If there's an account with a Cold Address, return it, otherwise return the default
        return (
            cAccount?.coldAddress ||
            cChainParams.current.defaultColdStakingAddress
        );
    }

    get nAccount() {
        return this.#nAccount;
    }

    wipePrivateData() {
        this.#masterKey.wipePrivateData(this.#nAccount);
    }

    isViewOnly() {
        if (!this.#masterKey) return false;
        return this.#masterKey.isViewOnly;
    }

    isHD() {
        if (!this.#masterKey) return false;
        return this.#masterKey.isHD;
    }

    async hasWalletUnlocked(fIncludeNetwork = false) {
        if (fIncludeNetwork && !getNetwork().enabled)
            return createAlert(
                'warning',
                ALERTS.WALLET_OFFLINE_AUTOMATIC,
                5500
            );
        if (!this.isLoaded()) {
            return createAlert(
                'warning',
                tr(ALERTS.WALLET_UNLOCK_IMPORT, [
                    {
                        unlock: (await hasEncryptedWallet())
                            ? 'unlock '
                            : 'import/create',
                    },
                ]),
                3500
            );
        } else {
            return true;
        }
    }

    /**
     * Set or replace the active Master Key with a new Master Key
     * @param {import('./masterkey.js').MasterKey} mk - The new Master Key to set active
     */
    async setMasterKey(mk) {
        this.#masterKey = mk;
        // If this is the global wallet update the network master key
        if (this.#isMainWallet) {
            await getNetwork().setWallet(this);
        }
    }

    /**
     * Derive the current address (by internal index)
     * @return {string} Address
     *
     */
    getCurrentAddress() {
        return this.getAddress(0, this.#addressIndex);
    }

    /**
     * Derive a generic address (given nReceiving and nIndex)
     * @return {string} Address
     */
    getAddress(nReceiving = 0, nIndex = 0) {
        const path = this.getDerivationPath(nReceiving, nIndex);
        return this.#masterKey.getAddress(path);
    }

    /**
     * Derive xpub (given nReceiving and nIndex)
     * @return {string} Address
     */
    getXPub(nReceiving = 0, nIndex = 0) {
        // Get our current wallet XPub
        const derivationPath = this.getDerivationPath(nReceiving, nIndex)
            .split('/')
            .slice(0, 4)
            .join('/');
        return this.#masterKey.getxpub(derivationPath);
    }

    /**
     * Derive xpub (given nReceiving and nIndex)
     * @return {bool} Return true if a masterKey has been loaded in the wallet
     */
    isLoaded() {
        return !!this.#masterKey;
    }

    async encryptWallet(strPassword = '') {
        // Encrypt the wallet WIF with AES-GCM and a user-chosen password - suitable for browser storage
        let strEncWIF = await encrypt(this.#masterKey.keyToBackup, strPassword);
        if (!strEncWIF) return false;

        // Hide the encryption warning
        doms.domGenKeyWarning.style.display = 'none';

        // Prepare to Add/Update an account in the DB
        const cAccount = new Account({
            publicKey: this.getKeyToExport(),
            encWif: strEncWIF,
        });

        // Incase of a "Change Password", we check if an Account already exists
        const database = await Database.getInstance();
        if (await database.getAccount()) {
            // Update the existing Account (new encWif) in the DB
            await database.updateAccount(cAccount);
        } else {
            // Add the new Account to the DB
            await database.addAccount(cAccount);
        }

        // Remove the exit blocker, we can annoy the user less knowing the key is safe in their database!
        removeEventListener('beforeunload', beforeUnloadListener, {
            capture: true,
        });
    }

    /**
     * @return [string, string] Address and its BIP32 derivation path
     */
    getNewAddress() {
        const last = getNetwork().lastWallet;
        this.#addressIndex =
            (this.#addressIndex > last ? this.#addressIndex : last) + 1;
        if (this.#addressIndex - last > MAX_ACCOUNT_GAP) {
            // If the user creates more than ${MAX_ACCOUNT_GAP} empty wallets we will not be able to sync them!
            this.#addressIndex = last;
        }
        const path = this.getDerivationPath(0, this.#addressIndex);
        const address = this.getAddress(0, this.#addressIndex);
        return [address, path];
    }

    isHardwareWallet() {
        return this.#masterKey?.isHardwareWallet === true;
    }

    /**
     * @param {string} address - address to check
     * @return {string?} BIP32 path or null if it's not your address
     */
    isOwnAddress(address) {
        if (this.#ownAddresses.has(address)) {
            return this.#ownAddresses.get(address);
        }
        const last = getNetwork().lastWallet;
        this.#addressIndex =
            this.#addressIndex > last ? this.#addressIndex : last;
        if (this.isHD()) {
            for (let i = 0; i <= this.#addressIndex + MAX_ACCOUNT_GAP; i++) {
                const path = this.getDerivationPath(0, i);
                const testAddress = this.#masterKey.getAddress(path);
                if (address === testAddress) {
                    this.#ownAddresses.set(address, path);
                    return path;
                }
            }
        } else {
            const value = address === this.getKeyToExport() ? ':)' : null;
            this.#ownAddresses.set(address, value);
            return value;
        }
        this.#ownAddresses.set(address, null);
        return null;
    }

    /**
     * @return {String} BIP32 path or null if it's not your address
     */
    getDerivationPath(nReceiving = 0, nIndex = 0) {
        return this.#masterKey.getDerivationPath(
            this.#nAccount,
            nReceiving,
            nIndex
        );
    }

    getKeyToExport() {
        return this.#masterKey?.getKeyToExport(this.#nAccount);
    }

    //Get path from a script
    getPath(script) {
        const dataBytes = hexToBytes(script);
        // At the moment we support only P2PKH and P2CS
        const iStart = isP2PKH(dataBytes) ? P2PK_START_INDEX : COLD_START_INDEX;
        const address = this.getAddressFromPKHCache(
            bytesToHex(dataBytes.slice(iStart, iStart + 20))
        );
        return this.isOwnAddress(address);
    }

    isMyVout(script) {
        let address;
        const dataBytes = hexToBytes(script);
        if (isP2PKH(dataBytes)) {
            address = this.getAddressFromPKHCache(
                bytesToHex(
                    dataBytes.slice(P2PK_START_INDEX, P2PK_START_INDEX + 20)
                )
            );
            if (this.isOwnAddress(address)) {
                return UTXO_WALLET_STATE.SPENDABLE;
            }
        } else if (isP2CS(dataBytes)) {
            for (let i = 0; i < 2; i++) {
                const iStart = i == 0 ? OWNER_START_INDEX : COLD_START_INDEX;
                address = this.getAddressFromPKHCache(
                    bytesToHex(dataBytes.slice(iStart, iStart + 20))
                );
                if (this.isOwnAddress(address)) {
                    return i == 0
                        ? UTXO_WALLET_STATE.COLD_RECEIVED
                        : UTXO_WALLET_STATE.SPENDABLE_COLD;
                }
            }
        }
        return UTXO_WALLET_STATE.NOT_MINE;
    }
    // Avoid calculating over and over the same getAddressFromPKH by saving the result in a map
    getAddressFromPKHCache(pkh_hex) {
        if (!this.#knownPKH.has(pkh_hex)) {
            this.#knownPKH.set(pkh_hex, getAddressFromPKH(hexToBytes(pkh_hex)));
        }
        return this.#knownPKH.get(pkh_hex);
    }
}

/**
 * @type{Wallet}
 */
export const wallet = new Wallet(0, true); // For now we are using only the 0-th account, (TODO: update once account system is done)

/**
 * Import a wallet (with it's private, public or encrypted data)
 * @param {object} options
 * @param {string | Array<number>} options.newWif - The import data (if omitted, the UI input is accessed)
 * @param {boolean} options.fRaw - Whether the import data is raw bytes or encoded (WIF, xpriv, seed)
 * @param {boolean} options.isHardwareWallet - Whether the import is from a Hardware wallet or not
 * @param {boolean} options.fSavePublicKey - Whether to save the derived public key to disk (for View Only mode)
 * @param {boolean} options.fStartup - Whether the import is at Startup or at Runtime
 * @returns {Promise<void>}
 */
export async function importWallet({
    newWif = false,
    fRaw = false,
    isHardwareWallet = false,
    fSavePublicKey = false,
    fStartup = false,
} = {}) {
    // TODO: remove `walletConfirm`, it is useless as Accounts cannot be overriden, and multi-accounts will come soon anyway
    // ... just didn't want to add a huge whitespace change from removing the `if (walletConfirm) {` line
    const walletConfirm = true;
    if (walletConfirm) {
        if (isHardwareWallet) {
            // Firefox does NOT support WebUSB, thus cannot work with Hardware wallets out-of-the-box
            if (navigator.userAgent.includes('Firefox')) {
                return createAlert(
                    'warning',
                    ALERTS.WALLET_FIREFOX_UNSUPPORTED,
                    7500
                );
            }
            // Derive our hardware address and import!
            try {
                const key = await HardwareWalletMasterKey.create(0);
                await wallet.setMasterKey(key);
            } catch (e) {
                // Display a properly translated error if it's a ledger error
                if (
                    e instanceof Error &&
                    e.message === 'Failed to get hardware wallet keys.'
                ) {
                    // console.error so we get a backtrace if needed
                    console.error(e);
                    return createAlert(
                        'warning',
                        translation.FAILED_TO_IMPORT_HARDWARE,
                        5000
                    );
                } else {
                    throw e;
                }
            }

            createAlert(
                'info',
                tr(ALERTS.WALLET_HARDWARE_WALLET, [
                    { hardwareWallet: strHardwareName },
                ]),
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

            // Clean and verify the Seed Phrase (if one exists)
            const cPhraseValidator = await cleanAndVerifySeedPhrase(
                privateImportValue,
                true
            );

            // If Debugging is enabled, show what the validator returned
            if (debug) {
                const fnLog = cPhraseValidator.ok ? console.log : console.warn;
                fnLog('Seed Import Validator: ' + cPhraseValidator.msg);
            }

            // If the Seed is OK, proceed
            if (cPhraseValidator.ok) {
                // Generate our HD MasterKey with the cleaned (Mnemonic) Seed Phrase
                const seed = await mnemonicToSeed(
                    cPhraseValidator.phrase,
                    passphrase
                );
                await wallet.setMasterKey(new HdMasterKey({ seed }));
            } else if (cPhraseValidator.phrase.includes(' ')) {
                // The Phrase Validator failed, but the input contains at least one space; possibly a Seed Typo?
                return createAlert('warning', cPhraseValidator.msg, 5000);
            } else {
                // The input definitely isn't a seed, so we'll try every other import method
                try {
                    // XPub import (HD view only)
                    if (isXPub(privateImportValue)) {
                        await wallet.setMasterKey(
                            new HdMasterKey({
                                xpub: privateImportValue,
                            })
                        );
                        // XPrv import (HD full access)
                    } else if (privateImportValue.startsWith('xprv')) {
                        await wallet.setMasterKey(
                            new HdMasterKey({
                                xpriv: privateImportValue,
                            })
                        );
                        // Pubkey import (non-HD view only)
                    } else if (isStandardAddress(privateImportValue)) {
                        await wallet.setMasterKey(
                            new LegacyMasterKey({
                                address: privateImportValue,
                            })
                        );
                        // WIF import (non-HD full access)
                    } else {
                        // Attempt to import a raw WIF private key
                        const pkBytes = parseWIF(privateImportValue);
                        await wallet.setMasterKey(
                            new LegacyMasterKey({ pkBytes })
                        );
                    }
                } catch (e) {
                    return createAlert(
                        'warning',
                        ALERTS.FAILED_TO_IMPORT + '<br>' + e.message,
                        6000
                    );
                }
            }
        }

        // Reaching here: the deserialisation was a full cryptographic success, so a wallet is now imported!
        fWalletLoaded = true;

        // Hide wipe wallet button if there is no private key
        if (wallet.isViewOnly() || wallet.isHardwareWallet()) {
            doms.domWipeWallet.hidden = true;
            if (await hasEncryptedWallet()) {
                doms.domRestoreWallet.hidden = false;
            }
        }

        // For non-HD wallets: hide the 'new address' button, since these are essentially single-address MPW wallets

        // Update the loaded address in the Dashboard
        getNewAddress({ updateGUI: true });

        // Display Text
        doms.domGuiWallet.style.display = 'block';
        doms.domDashboard.click();

        // Update identicon
        doms.domIdenticon.dataset.jdenticonValue = wallet.getAddress();
        jdenticon.update('#identicon');

        // Hide the encryption prompt if the user is using
        // a hardware wallet, or is view-only mode.
        if (!(isHardwareWallet || wallet.isViewOnly())) {
            if (
                // If the wallet was internally imported (not UI pasted), like via vanity, display the encryption prompt
                (((fRaw && newWif.length) || newWif) &&
                    !(await hasEncryptedWallet())) ||
                // If the wallet was pasted and is an unencrypted key, then display the encryption prompt
                !(await hasEncryptedWallet())
            ) {
                doms.domGenKeyWarning.style.display = 'block';
            } else if (await hasEncryptedWallet()) {
                // If the wallet was pasted and is an encrypted import, display the lock wallet UI
                doms.domWipeWallet.hidden = false;
            }
        } else {
            // Hide the encryption UI
            doms.domGenKeyWarning.style.display = 'none';
        }

        // Fetch state from explorer, if this import was post-startup
        if (getNetwork().enabled && !fStartup) {
            refreshChainData();
            getNetwork().getUTXOs();
        }

        // Hide all wallet starter options
        setDisplayForAllWalletOptions('none');
        getEventEmitter().emit('wallet-import');
    }
}

// Wallet Generation
export async function generateWallet(noUI = false) {
    // TODO: remove `walletConfirm`, it is useless as Accounts cannot be overriden, and multi-accounts will come soon anyway
    // ... just didn't want to add a huge whitespace change from removing the `if (walletConfirm) {` line
    const walletConfirm = true;
    if (walletConfirm) {
        const mnemonic = generateMnemonic();

        const passphrase = !noUI
            ? await informUserOfMnemonic(mnemonic)
            : undefined;
        const seed = await mnemonicToSeed(mnemonic, passphrase);

        // Prompt the user to encrypt the seed
        await wallet.setMasterKey(new HdMasterKey({ seed }));
        fWalletLoaded = true;

        doms.domGenKeyWarning.style.display = 'block';
        // Add a listener to block page unloads until we are sure the user has saved their keys, safety first!
        addEventListener('beforeunload', beforeUnloadListener, {
            capture: true,
        });

        // Display the dashboard
        doms.domGuiWallet.style.display = 'block';
        setDisplayForAllWalletOptions('none');

        // Update identicon
        doms.domIdenticon.dataset.jdenticonValue = wallet.getAddress();
        jdenticon.update('#identicon');

        await getNewAddress({ updateGUI: true });

        // Refresh the balance UI (why? because it'll also display any 'get some funds!' alerts)
        getStakingBalance(true);
    }

    return wallet;
}

/**
 * Clean a Seed Phrase string and verify it's integrity
 *
 * This returns an object of the validation status and the cleaned Seed Phrase for safe low-level usage.
 * @param {String} strPhraseInput - The Seed Phrase string
 * @param {Boolean} fPopupConfirm - Allow a warning bypass popup if the Seed Phrase is unusual
 */
export async function cleanAndVerifySeedPhrase(
    strPhraseInput = '',
    fPopupConfirm = true
) {
    // Clean the phrase (removing unnecessary spaces) and force to lowercase
    const strPhrase = strPhraseInput.trim().replace(/\s+/g, ' ').toLowerCase();

    // Count the Words
    const nWordCount = strPhrase.trim().split(' ').length;

    // Ensure it's a word count that makes sense
    if (nWordCount === 12 || nWordCount === 24) {
        if (!validateMnemonic(strPhrase)) {
            // If a popup is allowed and Advanced Mode is enabled, warn the user that the
            // ... seed phrase is potentially bad, and ask for confirmation to proceed
            if (!fPopupConfirm || !fAdvancedMode)
                return {
                    ok: false,
                    msg: translation.importSeedErrorTypo,
                    phrase: strPhrase,
                };

            // The reason we want to ask the user for confirmation is that the mnemonic
            // could have been generated with another app that has a different dictionary
            const fSkipWarning = await confirmPopup({
                title: translation.popupSeedPhraseBad,
                html: translation.popupSeedPhraseBadNote,
            });

            if (fSkipWarning) {
                // User is probably an Arch Linux user and used `-f`
                return {
                    ok: true,
                    msg: translation.importSeedErrorSkip,
                    phrase: strPhrase,
                };
            } else {
                // User heeded the warning and rejected the phrase
                return {
                    ok: false,
                    msg: translation.importSeedError,
                    phrase: strPhrase,
                };
            }
        } else {
            // Valid count and mnemonic
            return {
                ok: true,
                msg: translation.importSeedValid,
                phrase: strPhrase,
            };
        }
    } else {
        // Invalid count
        return {
            ok: false,
            msg: translation.importSeedErrorSize,
            phrase: strPhrase,
        };
    }
}

/**
 * Display a Seed Phrase popup to the user and optionally wait for a Seed Passphrase
 * @param {string} mnemonic - The Seed Phrase to display to the user
 * @returns {Promise<string>} - The Mnemonic Passphrase (empty string if omitted by user)
 */
function informUserOfMnemonic(mnemonic) {
    return new Promise((res, _) => {
        // Configure the modal
        $('#mnemonicModal').modal({ keyboard: false });

        // Render the Seed Phrase and configure the button
        doms.domMnemonicModalContent.innerText = mnemonic;
        doms.domMnemonicModalButton.onclick = () => {
            res(doms.domMnemonicModalPassphrase.value);
            $('#mnemonicModal').modal('hide');

            // Wipe the mnemonic displays of sensitive data
            doms.domMnemonicModalContent.innerText = '';
            doms.domMnemonicModalPassphrase.value = '';
        };

        // Display the modal
        $('#mnemonicModal').modal('show');
    });
}

export async function decryptWallet(strPassword = '') {
    // Check if there's any encrypted WIF available
    const database = await Database.getInstance();
    const { encWif: strEncWIF } = await database.getAccount();
    if (!strEncWIF || strEncWIF.length < 1) return false;

    // Prompt to decrypt it via password
    const strDecWIF = await decrypt(strEncWIF, strPassword);
    if (!strDecWIF || strDecWIF === 'decryption failed!') {
        if (strDecWIF)
            return createAlert('warning', ALERTS.INCORRECT_PASSWORD, 6000);
    } else {
        await importWallet({
            newWif: strDecWIF,
            // Save the public key to disk for View Only mode
            fSavePublicKey: true,
        });
        return true;
    }
}

/**
 * @returns {Promise<bool>} If the wallet has an encrypted database backup
 */
export async function hasEncryptedWallet() {
    const database = await Database.getInstance();
    const account = await database.getAccount();
    return !!account?.encWif;
}

export async function getNewAddress({
    updateGUI = false,
    verify = false,
} = {}) {
    const [address, path] = wallet.getNewAddress();
    if (verify && wallet.isHardwareWallet()) {
        // Generate address to present to the user without asking to verify
        const confAddress = await confirmPopup({
            title: ALERTS.CONFIRM_POPUP_VERIFY_ADDR,
            html: createAddressConfirmation(address),
            resolvePromise: wallet.getMasterKey().verifyAddress(path),
        });
        console.log(address, confAddress);
        if (address !== confAddress) {
            throw new Error('User did not verify address');
        }
    }

    // If we're generating a new address manually, then render the new address in our Receive Modal
    if (updateGUI) {
        guiRenderCurrentReceiveModal();
    }

    return [address, path];
}

function createAddressConfirmation(address) {
    return `${translation.popupHardwareAddrCheck} ${strHardwareName}.
              <div class="seed-phrase">${address}</div>`;
}
