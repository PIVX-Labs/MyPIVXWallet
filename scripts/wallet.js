import { validateMnemonic } from 'bip39';
import { decrypt } from './aes-gcm.js';
import { beforeUnloadListener } from './global.js';
import { getNetwork } from './network.js';
import { MAX_ACCOUNT_GAP } from './chain_params.js';
import { Transaction, HistoricalTx, HistoricalTxType } from './mempool.js';
import { confirmPopup, createAlert } from './misc.js';
import { cChainParams } from './chain_params.js';
import { COIN } from './chain_params.js';
import { mempool } from './global.js';
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
    getAddressFromHash,
    COLD_START_INDEX,
    P2PK_START_INDEX,
    OWNER_START_INDEX,
} from './script.js';

/**
 * Class Wallet, at the moment it is just a "realization" of Masterkey with a given nAccount
 * it also remembers which addresses we generated.
 * in future PRs this class will manage balance, UTXOs, masternode etc...
 */
export class Wallet {
    /**
     * We are using two chains: The external chain, and the internal one (i.e. change addresses)
     * See https://github.com/bitcoin/bips/blob/master/bip-0048.mediawiki for more info
     * (Change paragraph)
     */
    static chains = 2;
    /**
     * @type {import('./masterkey.js').MasterKey}
     */
    #masterKey;
    /**
     * @type {number}
     */
    #nAccount;

    /**
     * Map bip48 change -> Loaded index
     * Number of loaded indexes, loaded means that they are in the ownAddresses map
     * @type {Map<number, number>}
     */
    #loadedIndexes = new Map();
    /**
     * Map bip48 change -> Highest used index
     * Highest index used, where used means that the corresponding address is on chain (for example in a tx)
     * @type {Map<number, number>}
     */
    #highestUsedIndices = new Map();
    /**
     * @type {Map<number, number>}
     */
    #addressIndices = new Map();
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
        for (let i = 0; i < Wallet.chains; i++) {
            this.#highestUsedIndices.set(i, 0);
            this.#loadedIndexes.set(i, 0);
        }
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
        mempool.setBalance();
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
    setMasterKey(mk, nAccount = 0) {
        const isNewAcc =
            mk?.getKeyToExport(nAccount) !==
            this.#masterKey?.getKeyToExport(this.#nAccount);
        this.#masterKey = mk;
        this.#nAccount = nAccount;
        if (isNewAcc) {
            this.reset();
            // If this is the global wallet update the network master key
            if (this.#isMainWallet) {
                getNetwork().setWallet(this);
            }
            for (let i = 0; i < Wallet.chains; i++) this.loadAddresses(i);
        }
    }

    /**
     * Reset the wallet, indexes address map and so on
     */
    reset() {
        this.#highestUsedIndices = new Map();
        this.#loadedIndexes = new Map();
        this.#ownAddresses = new Map();
        this.#addressIndices = new Map();
        for (let i = 0; i < Wallet.chains; i++) {
            this.#highestUsedIndices.set(i, 0);
            this.#loadedIndexes.set(i, 0);
            this.#addressIndices.set(i, 0);
        }
        // TODO: This needs to be refactored
        // The wallet could own its own mempool and network?
        // Instead of having this isMainWallet flag
        if (this.#isMainWallet) {
            mempool.reset();
            getNetwork().reset();
        }
    }

    /**
     * Derive the current address (by internal index)
     * @return {string} Address
     *
     */
    getCurrentAddress() {
        return this.getAddress(0, this.#addressIndices.get(0));
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
     * @return {boolean} Return true if a masterKey has been loaded in the wallet
     */
    isLoaded() {
        return !!this.#masterKey;
    }

    /**
     * Check if the current encrypted keyToBackup can be decrypted with the given password
     * @param {string} strPassword
     * @return {Promise<boolean>}
     */
    async checkDecryptPassword(strPassword) {
        // Check if there's any encrypted WIF available
        const database = await Database.getInstance();
        const { encWif: strEncWIF } = await database.getAccount();
        if (!strEncWIF || strEncWIF.length < 1) return false;

        const strDecWIF = await decrypt(strEncWIF, strPassword);
        return !!strDecWIF;
    }

    /**
     * Encrypt the keyToBackup with a given password
     * @param {string} strPassword
     * @returns {Promise<boolean}
     */
    async encrypt(strPassword) {
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
    getNewAddress(nReceiving = 0) {
        const last = this.#highestUsedIndices.get(nReceiving);
        this.#addressIndices.set(
            nReceiving,
            (this.#addressIndices.get(nReceiving) > last
                ? this.#addressIndices.get(nReceiving)
                : last) + 1
        );
        if (this.#addressIndices.get(nReceiving) - last > MAX_ACCOUNT_GAP) {
            // If the user creates more than ${MAX_ACCOUNT_GAP} empty wallets we will not be able to sync them!
            this.#addressIndices.set(nReceiving, last);
        }
        const path = this.getDerivationPath(
            nReceiving,
            this.#addressIndices.get(nReceiving)
        );
        const address = this.getAddress(
            nReceiving,
            this.#addressIndices.get(nReceiving)
        );
        return [address, path];
    }

    isHardwareWallet() {
        return this.#masterKey?.isHardwareWallet === true;
    }

    /**
     * Check if the vout is owned and in case update highestUsedIdex
     * @param {CTxOut} vout
     */
    updateHighestUsedIndex(vout) {
        const dataBytes = hexToBytes(vout.script);
        const iStart = isP2PKH(dataBytes) ? P2PK_START_INDEX : COLD_START_INDEX;
        const address = this.getAddressFromHashCache(
            bytesToHex(dataBytes.slice(iStart, iStart + 20)),
            false
        );
        const path = this.isOwnAddress(address);
        if (path) {
            const nReceiving = parseInt(path.split('/')[4]);
            this.#highestUsedIndices.set(
                nReceiving,
                Math.max(
                    parseInt(path.split('/')[5]),
                    this.#highestUsedIndices.get(nReceiving)
                )
            );
            if (
                this.#highestUsedIndices.get(nReceiving) + MAX_ACCOUNT_GAP >=
                this.#loadedIndexes.get(nReceiving)
            ) {
                this.loadAddresses(nReceiving);
            }
        }
    }

    /**
     * Load MAX_ACCOUNT_GAP inside #ownAddresses map.
     * @param {number} chain - Chain to load
     */
    loadAddresses(chain) {
        if (this.isHD()) {
            const start = this.#loadedIndexes.get(chain);
            const end = start + MAX_ACCOUNT_GAP;
            for (let i = start; i <= end; i++) {
                const path = this.getDerivationPath(chain, i);
                const address = this.#masterKey.getAddress(path);
                this.#ownAddresses.set(address, path);
            }

            this.#loadedIndexes.set(chain, end);
        } else {
            this.#ownAddresses.set(this.getKeyToExport(), ':)');
        }
    }

    /**
     * @param {string} address - address to check
     * @return {string?} BIP32 path or null if it's not your address
     */
    isOwnAddress(address) {
        return this.#ownAddresses.get(address) ?? null;
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
            return this.getMasterKey()?.keyToBackup;
        }
    }

    //Get path from a script
    getPath(script) {
        const dataBytes = hexToBytes(script);
        // At the moment we support only P2PKH and P2CS
        const iStart = isP2PKH(dataBytes) ? P2PK_START_INDEX : COLD_START_INDEX;
        const address = this.getAddressFromHashCache(
            bytesToHex(dataBytes.slice(iStart, iStart + 20)),
            false
        );
        return this.isOwnAddress(address);
    }

    /**
     * Get addresses from a script
     * @returns {{ type: 'p2pkh'|'p2cs'|'unknown', addresses: string[] }}
     */
    #getAddressesFromScript(script) {
        const dataBytes = hexToBytes(script);
        if (isP2PKH(dataBytes)) {
            const address = this.getAddressFromHashCache(
                bytesToHex(
                    dataBytes.slice(P2PK_START_INDEX, P2PK_START_INDEX + 20)
                ),
                false
            );
            return {
                type: 'p2pkh',
                addresses: [address],
            };
        } else if (isP2CS(dataBytes)) {
            const addresses = [];
            for (let i = 0; i < 2; i++) {
                const iStart = i == 0 ? OWNER_START_INDEX : COLD_START_INDEX;
                addresses.push(
                    this.getAddressFromHashCache(
                        bytesToHex(dataBytes.slice(iStart, iStart + 20)),
                        iStart === OWNER_START_INDEX
                    )
                );
            }
            return { type: 'p2cs', addresses };
        } else {
            return { type: 'unknown', addresses: [] };
        }
    }

    isMyVout(script) {
        const { type, addresses } = this.#getAddressesFromScript(script);
        const index = addresses.findIndex((s) => this.isOwnAddress(s));
        if (index === -1) return UTXO_WALLET_STATE.NOT_MINE;
        if (type === 'p2pkh') return UTXO_WALLET_STATE.SPENDABLE;
        if (type === 'p2cs') {
            return index === 0
                ? UTXO_WALLET_STATE.COLD_RECEIVED
                : UTXO_WALLET_STATE.SPENDABLE_COLD;
        }
    }
    // Avoid calculating over and over the same getAddressFromHash by saving the result in a map
    getAddressFromHashCache(pkh_hex, isColdStake) {
        if (!this.#knownPKH.has(pkh_hex)) {
            this.#knownPKH.set(
                pkh_hex,
                getAddressFromHash(hexToBytes(pkh_hex), isColdStake)
            );
        }
        return this.#knownPKH.get(pkh_hex);
    }

    /**
     * Get the debit of a transaction in satoshi
     * @param {Transaction} tx
     */
    getDebit(tx) {
        let debit = 0;
        for (const vin of tx.vin) {
            if (mempool.txmap.has(vin.outpoint.txid)) {
                const spentVout = mempool.txmap.get(vin.outpoint.txid).vout[
                    vin.outpoint.n
                ];
                if (
                    (this.isMyVout(spentVout.script) &
                        UTXO_WALLET_STATE.SPENDABLE_TOTAL) !=
                    0
                ) {
                    debit += spentVout.value;
                }
            }
        }
        return debit;
    }

    /**
     * Get the credit of a transaction in satoshi
     * @param {Transaction} tx
     */
    getCredit(tx, filter) {
        let credit = 0;
        for (const vout of tx.vout) {
            if ((this.isMyVout(vout.script) & filter) != 0) {
                credit += vout.value;
            }
        }
        return credit;
    }

    /**
     * Return true if the transaction contains undelegations regarding the given wallet
     * @param {Transaction} tx
     */
    checkForUndelegations(tx) {
        for (const vin of tx.vin) {
            if (mempool.txmap.has(vin.outpoint.txid)) {
                const spentVout = mempool.txmap.get(vin.outpoint.txid).vout[
                    vin.outpoint.n
                ];
                if (
                    (this.isMyVout(spentVout.script) &
                        UTXO_WALLET_STATE.SPENDABLE_COLD) !=
                    0
                ) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Return true if the transaction contains delegations regarding the given wallet
     * @param {Transaction} tx
     */
    checkForDelegations(tx) {
        for (const vout of tx.vout) {
            if (
                (this.isMyVout(vout.script) &
                    UTXO_WALLET_STATE.SPENDABLE_COLD) !=
                0
            ) {
                return true;
            }
        }
        return false;
    }

    /**
     * Return the output addresses for a given transaction
     * @param {Transaction} tx
     */
    getOutAddress(tx) {
        return tx.vout.reduce(
            (acc, vout) => [
                ...acc,
                ...this.#getAddressesFromScript(vout.script).addresses,
            ],
            []
        );
    }

    /**
     * Convert a list of Blockbook transactions to HistoricalTxs
     * @param {Array<Transaction>} arrTXs - An array of the Blockbook TXs
     * @returns {Promise<Array<HistoricalTx>>} - A new array of `HistoricalTx`-formatted transactions
     */
    // TODO: add shield data to txs
    toHistoricalTXs(arrTXs) {
        let histTXs = [];
        for (const tx of arrTXs) {
            // The total 'delta' or change in balance, from the Tx's sums
            let nAmount =
                (this.getCredit(tx, UTXO_WALLET_STATE.SPENDABLE_TOTAL) -
                    this.getDebit(tx)) /
                COIN;

            // The receiver addresses, if any
            let arrReceivers = this.getOutAddress(tx);

            // Figure out the type, based on the Tx's properties
            let type = HistoricalTxType.UNKNOWN;
            if (tx.isCoinStake()) {
                type = HistoricalTxType.STAKE;
            } else if (this.checkForUndelegations(tx)) {
                type = HistoricalTxType.UNDELEGATION;
            } else if (this.checkForDelegations(tx)) {
                type = HistoricalTxType.DELEGATION;
                arrReceivers = arrReceivers.filter((addr) => {
                    return addr[0] === cChainParams.current.STAKING_PREFIX;
                });
                nAmount =
                    this.getCredit(tx, UTXO_WALLET_STATE.SPENDABLE_COLD) / COIN;
            } else if (nAmount > 0) {
                type = HistoricalTxType.RECEIVED;
            } else if (nAmount < 0) {
                type = HistoricalTxType.SENT;
            }

            histTXs.push(
                new HistoricalTx(
                    type,
                    tx.txid,
                    arrReceivers,
                    false,
                    tx.blockTime,
                    tx.blockHeight,
                    Math.abs(nAmount)
                )
            );
        }
        return histTXs;
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
 * @returns {Promise<boolean>} If the wallet has an encrypted database backup
 */
export async function hasEncryptedWallet() {
    const database = await Database.getInstance();
    const account = await database.getAccount();
    return !!account?.encWif;
}

export async function getNewAddress({
    updateGUI = false,
    verify = false,
    nReceiving = 0,
} = {}) {
    const [address, path] = wallet.getNewAddress(nReceiving);
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
