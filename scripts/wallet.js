import { validateMnemonic } from 'bip39';
import { beforeUnloadListener } from './global.js';
import { getNetwork } from './network.js';
import { MAX_ACCOUNT_GAP, cChainParams } from './chain_params.js';
import {
    LegacyMasterKey,
    HdMasterKey,
    HardwareWalletMasterKey,
} from './masterkey.js';
import { confirmPopup, createAlert } from './misc.js';
import {
    refreshChainData,
    setDisplayForAllWalletOptions,
    getStakingBalance,
    mempool,
} from './global.js';
import { ALERTS, tr, translation } from './i18n.js';
import { encrypt } from './aes-gcm.js';
import { Database } from './database.js';
import { guiRenderCurrentReceiveModal } from './contacts-book.js';
import { Account } from './accounts.js';
import { fAdvancedMode } from './settings.js';
import { bytesToHex, hexToBytes } from './utils.js';
import { strHardwareName } from './ledger.js';
import { COutpoint, UTXO_WALLET_STATE } from './mempool.js';
import {
    isP2CS,
    isP2PKH,
    getAddressFromPKH,
    COLD_START_INDEX,
    P2PK_START_INDEX,
    OWNER_START_INDEX,
} from './script.js';
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
    /**
     * Set of unique representations of Outpoints that keep track of locked utxos.
     * @type {Set<String>}
     */
    #lockedCoins;
    constructor(nAccount, isMainWallet) {
        this.#nAccount = nAccount;
        this.#isMainWallet = isMainWallet;
        this.#lockedCoins = new Set();
    }

    /**
     * Check whether a given outpoint is locked
     * @param {COutpoint} opt
     * @return {Boolean} true if opt is locked, false otherwise
     */
    isCoinLocked(opt) {
        return this.#lockedCoins.has(opt.toUnique());
    }

    /**
     * Lock a given Outpoint
     * @param {COutpoint} opt
     */
    lockCoin(opt) {
        this.#lockedCoins.add(opt.toUnique());
        mempool.setBalance();
    }

    /**
     * Unlock a given Outpoint
     * @param {COutpoint} opt
     */
    unlockCoin(opt) {
        this.#lockedCoins.delete(opt.toUnique());
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
     * Derive a generic address (given the full path)
     * @return {string} Address
     */
    getAddressFromPath(path) {
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
        return true;
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

    async getKeyToBackup() {
        if (await hasEncryptedWallet()) {
            const account = await (await Database.getInstance()).getAccount();
            return account.encWif;
        } else {
            return this.getMasterKey().keyToBackup;
        }
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
