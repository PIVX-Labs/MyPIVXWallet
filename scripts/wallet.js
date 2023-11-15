import { validateMnemonic } from 'bip39';
import { decrypt } from './aes-gcm.js';
import { beforeUnloadListener } from './global.js';
import { ExplorerNetwork, getNetwork } from './network.js';
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
import { bytesToHex, hexToBytes, startBatch } from './utils.js';
import { strHardwareName } from './ledger.js';
import { COutpoint, UTXO_WALLET_STATE } from './mempool.js';
import { getEventEmitter } from './event_bus.js';
import {
    isP2CS,
    isP2PKH,
    getAddressFromHash,
    COLD_START_INDEX,
    P2PK_START_INDEX,
    OWNER_START_INDEX,
} from './script.js';
import { PIVXShield } from 'pivx-shield';

/**
 * Class Wallet, at the moment it is just a "realization" of Masterkey with a given nAccount
 * it also remembers which addresses we generated.
 * in future PRs this class will manage balance, UTXOs, masternode etc...
 */
export class Wallet {
    /**
     * @type {import('./masterkey.js').MasterKey?}
     */
    #masterKey;
    /**
     * @type {import('pivx-shield').PIVXShield?}
     */
    #shield = null;
    /**
     * @type {number}
     */
    #nAccount;
    /**
     * Number of loaded indexes, loaded means that they are in the ownAddresses map
     * @type {number}
     */
    #loadedIndexes = 0;
    /**
     * Highest index used, where used means that the corresponding address is on chain (for example in a tx)
     * @type {number}
     */
    #highestUsedIndex = 0;
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
    /**
     * Whether shielding is ready to use or not
     * @type {Boolean}
     */
    #isShieldSynced = false;
    constructor({
        nAccount = 0,
        isMainWallet = true,
        masterKey = null,
        shield = null,
    } = {}) {
        this.#nAccount = nAccount;
        this.#isMainWallet = isMainWallet;
        this.#lockedCoins = new Set();
        this.#masterKey = masterKey;
        this.#shield = shield;
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

    get isShieldSynced() {
        return this.#isShieldSynced;
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
        if (
            mk?.getKeyToExport(nAccount) !==
            this.#masterKey?.getKeyToExport(this.#nAccount)
        )
            this.reset();
        this.#masterKey = mk;
        this.#nAccount = nAccount;
        // If this is the global wallet update the network master key
        if (this.#isMainWallet) {
            getNetwork().setWallet(this);
        }
        this.loadAddresses();
    }

    /**
     * This should really be provided with the constructor,
     * This will be done once `Dashboard.vue` is the owner of the wallet
     * @param {import('pivx-shield').PIVXShield} shield object to set
     */
    setShield(shield) {
        if (shield) this.#shield = shield;
    }

    hasShield() {
        return !!this.#shield;
    }

    /**
     * Reset the wallet, indexes address map and so on
     */
    reset() {
        this.#highestUsedIndex = 0;
        this.#loadedIndexes = 0;
        this.#ownAddresses = new Map();
        this.#isShieldSynced = false;
        this.#shield = null;
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
        let strEncExtsk = '';
        let shieldData = '';
        if (this.#shield) {
            strEncExtsk = await encrypt(this.#shield.extsk, strPassword);
            shieldData = this.#shield.save();
        }
        if (!strEncWIF) return false;

        // Prepare to Add/Update an account in the DB
        const cAccount = new Account({
            publicKey: this.getKeyToExport(),
            encWif: strEncWIF,
            encExtsk: strEncExtsk,
            shieldData: shieldData,
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
        const last = this.#highestUsedIndex;
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
            this.#highestUsedIndex = Math.max(
                parseInt(path.split('/')[5]),
                this.#highestUsedIndex
            );
            if (
                this.#highestUsedIndex + MAX_ACCOUNT_GAP >=
                this.#loadedIndexes
            ) {
                this.loadAddresses();
            }
        }
    }

    /**
     * Load MAX_ACCOUNT_GAP inside #ownAddresses map.
     */
    loadAddresses() {
        if (this.isHD()) {
            for (
                let i = this.#loadedIndexes;
                i <= this.#loadedIndexes + MAX_ACCOUNT_GAP;
                i++
            ) {
                const path = this.getDerivationPath(0, i);
                const address = this.#masterKey.getAddress(path);
                this.#ownAddresses.set(address, path);
            }
            this.#loadedIndexes += MAX_ACCOUNT_GAP;
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
            return this.getMasterKey().keyToBackup;
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
    /**
     * Initial block and prover sync for the shield object
     */
    async syncShield() {
        if (!this.#shield || this.#isShieldSynced) {
            return;
        }
        /**
         * @type {ExplorerNetwork}
         */
        const cNet = getNetwork();
        getEventEmitter().emit(
            'shield-sync-status-update',
            translation.syncLoadingSaplingProver,
            false
        );
        await this.#shield.loadSaplingProver();
        try {
            const blockHeights = (await cNet.getShieldBlockList()).filter(
                (b) => b > this.#shield.getLastSyncedBlock()
            );
            const batchSize = Number.parseInt(prompt('Insert batch size', '8'));
            console.time('sync_start');
            let processed = 1;
            let handled = 0;
            const blocks = [];
            await startBatch(
                async (i) => {
                    const block = await cNet.getBlock(blockHeights[i]);
                    blocks[i] = block;
                    // We need to process blocks monotically
                    // When we get a block, start from the first unhandled
                    // One and handle as many as possible
                    for (let j = handled; blocks[j]; j = handled) {
                        handled++;
                        await this.#shield.handleBlock(blocks[j]);
                        // Delete so we don't have to hold all blocks in memory
                        // until we finish syncing
                        delete blocks[j];
                    }

                    getEventEmitter().emit(
                        'shield-sync-status-update',
                        tr(translation.syncShieldProgress, [
                            { current: ++processed },
                            { total: blockHeights.length },
                        ]),
                        false
                    );
                },
                blockHeights.length,
                batchSize
            );
            console.timeEnd('sync_start');
            getEventEmitter().emit('shield-sync-status-update', '', true);
            // TODO: update this once all wallet sync is in the wallet class
            if (cNet.fullSynced) {
                createAlert('success', translation.syncStatusFinished, 12500);
            }
        } catch (e) {
            console.error(e);
        }
        // At this point it should be safe to assume that shield is ready to use
        await this.saveShieldOnDisk();
        this.#isShieldSynced = true;
    }

    async createShieldTransaction(address, amount) {
        const { hex, txid } = this.#shield.createTransaction({
            address,
            amount,
            blockHeight: getNetwork().cachedBlockCount,
            useShieldInputs: true,
        });
        return hex;
    }

    /**
     * Update the shield object with the latest blocks
     */
    async getLatestBlocks() {
        /**
         * @type {ExplorerNetwork}
         */
        const cNet = getNetwork();
        console.log(
            'New block arrived! Syncing shield:',
            this.#shield.getLastSyncedBlock() + 1,
            cNet.cachedBlockCount
        );
        for (
            let blockHeight = this.#shield.getLastSyncedBlock() + 1;
            blockHeight < cNet.cachedBlockCount;
            blockHeight++
        ) {
            try {
                const block = await cNet.getBlock(blockHeight);
                if (block.txs) {
                    await this.#shield.handleBlock(block);
                } else {
                    break;
                }
            } catch (e) {
                console.error(e);
                break;
            }
        }
        await this.saveShieldOnDisk();
    }
    /**
     * Save shield data on database
     */
    async saveShieldOnDisk() {
        console.log('Saving shield data on disk!');
        const cDB = await Database.getInstance();
        const cAccount = await cDB.getAccount();
        // If the account has not been created yet (for example no encryption) return
        if (!cAccount) {
            return;
        }
        cAccount.shieldData = this.#shield.save();
        await cDB.updateAccount(cAccount);
    }
    /**
     * Load shield data from database
     */
    async loadShieldFromDisk() {
        if (this.#shield) {
            return;
        }
        const cDB = await Database.getInstance();
        const cAccount = await cDB.getAccount();
        // If the account has not been created yet or there is no shield data return
        if (!cAccount || cAccount.shieldData == '') {
            return;
        }
        this.#shield = await PIVXShield.load(cAccount.shieldData);
        console.log('Shield has been loaded from disk!');
        return;
    }
}

/**
 * @type{Wallet}
 */
export const wallet = new Wallet(); // For now we are using only the 0-th account, (TODO: update once account system is done)

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
