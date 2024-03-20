import { validateMnemonic } from 'bip39';
import { decrypt } from './aes-gcm.js';
import { parseWIF } from './encoding.js';
import { beforeUnloadListener } from './global.js';
import { getNetwork } from './network.js';
import { MAX_ACCOUNT_GAP, SHIELD_BATCH_SYNC_SIZE } from './chain_params.js';
import { HistoricalTx, HistoricalTxType } from './historical_tx.js';
import { COutpoint } from './transaction.js';
import { confirmPopup, createAlert, isShieldAddress } from './misc.js';
import { cChainParams } from './chain_params.js';
import { COIN } from './chain_params.js';
import { ALERTS, tr, translation } from './i18n.js';
import { encrypt } from './aes-gcm.js';
import { Database } from './database.js';
import { RECEIVE_TYPES } from './contacts-book.js';
import { Account } from './accounts.js';
import { fAdvancedMode } from './settings.js';
import { bytesToHex, hexToBytes, sleep, startBatch } from './utils.js';
import { strHardwareName } from './ledger.js';
import { OutpointState, Mempool } from './mempool.js';
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
import { guiToggleReceiveType } from './contacts-book.js';
import { TransactionBuilder } from './transaction_builder.js';

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
     * @type {Mempool}
     */
    #mempool;

    #isSynced = false;
    #isFetchingLatestBlocks = false;

    constructor({
        nAccount,
        isMainWallet,
        masterKey,
        shield,
        mempool = new Mempool(),
    }) {
        this.#nAccount = nAccount;
        this.#isMainWallet = isMainWallet;
        this.#mempool = mempool;
        this.#masterKey = masterKey;
        this.#shield = shield;
        for (let i = 0; i < Wallet.chains; i++) {
            this.#highestUsedIndices.set(i, 0);
            this.#loadedIndexes.set(i, 0);
        }
    }

    /**
     * Check whether a given outpoint is locked
     * @param {import('./transaction.js').COutpoint} opt
     * @return {boolean} true if opt is locked, false otherwise
     */
    isCoinLocked(opt) {
        return !!(this.#mempool.getOutpointStatus(opt) & OutpointState.LOCKED);
    }

    /**
     * Lock a given Outpoint
     * @param {import('./transaction.js').COutpoint} opt
     */
    lockCoin(opt) {
        this.#mempool.addOutpointStatus(opt, OutpointState.LOCKED);
    }

    /**
     * Unlock a given Outpoint
     * @param {import('./transaction.js').COutpoint} opt
     */
    unlockCoin(opt) {
        this.#mempool.removeOutpointStatus(opt, OutpointState.LOCKED);
    }

    /**
     * Get master key
     * @deprecated use the wallet functions instead
     */
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

    get isSynced() {
        return this.#isSynced;
    }

    get isSyncing() {
        return this.#syncing;
    }

    wipePrivateData() {
        this.#masterKey.wipePrivateData(this.#nAccount);
        if (this.#shield) {
            this.#shield.extsk = null;
        }
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
     * Set the extended spending key of a shield object
     * @param {String} extsk encoded extended spending key
     */
    async setExtsk(extsk) {
        await this.#shield.loadExtendedSpendingKey(extsk);
    }

    /**
     * This should really be provided with the constructor,
     * This will be done once `Dashboard.vue` is the owner of the wallet
     * @param {import('pivx-shield').PIVXShield} shield object to set
     */
    setShield(shield) {
        this.#shield = shield;
    }

    hasShield() {
        return !!this.#shield;
    }

    /**
     * Reset the wallet, indexes address map and so on
     */
    reset() {
        this.#highestUsedIndices = new Map();
        this.#loadedIndexes = new Map();
        this.#ownAddresses = new Map();
        this.#isSynced = false;
        this.#shield = null;
        this.#addressIndices = new Map();
        for (let i = 0; i < Wallet.chains; i++) {
            this.#highestUsedIndices.set(i, 0);
            this.#loadedIndexes.set(i, 0);
            this.#addressIndices.set(i, 0);
        }
        this.#mempool = new Mempool();
        // TODO: This needs to be refactored to remove the getNetwork dependency
        if (this.#isMainWallet) {
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
        let strEncWIF = await encrypt(await this.getKeyToBackup(), strPassword);
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
     * @return {[string, string]} Address and its BIP32 derivation path
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

    /**
     * @returns {Promsie<string>} new shield address
     */
    async getNewShieldAddress() {
        return await this.#shield.getNewAddress();
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
        const path = this.#ownAddresses.get(address) ?? null;
        return path;
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
        }
        return JSON.stringify({
            mk: this.getMasterKey()?.keyToBackup,
            shield: this.#shield?.extsk,
        });
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
     * Get the outpoint state based on the script.
     * This functions only tells us the type of the script and if it's ours
     * It doesn't know about LOCK, IMMATURE or SPENT statuses, for that
     * it's necessary to interrogate the mempool
     */
    getScriptType(script) {
        const { type, addresses } = this.getAddressesFromScript(script);
        let status = 0;
        const isOurs = addresses.some((s) => this.isOwnAddress(s));
        if (isOurs) status |= OutpointState.OURS;
        if (type === 'p2pkh') status |= OutpointState.P2PKH;
        if (type === 'p2cs') {
            status |= OutpointState.P2CS;
        }
        return status;
    }

    /**
     * Get addresses from a script
     * @returns {{ type: 'p2pkh'|'p2cs'|'unknown', addresses: string[] }}
     */
    getAddressesFromScript(script) {
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
     * Return true if the transaction contains undelegations regarding the given wallet
     * @param {import('./transaction.js').Transaction} tx
     */
    checkForUndelegations(tx) {
        for (const vin of tx.vin) {
            const status = this.#mempool.getOutpointStatus(vin.outpoint);
            if (status & OutpointState.P2CS) {
                return true;
            }
        }
        return false;
    }

    /**
     * Return true if the transaction contains delegations regarding the given wallet
     * @param {import('./transaction.js').Transaction} tx
     */
    checkForDelegations(tx) {
        const txid = tx.txid;
        for (let i = 0; i < tx.vout.length; i++) {
            const outpoint = new COutpoint({
                txid,
                n: i,
            });
            if (
                this.#mempool.getOutpointStatus(outpoint) & OutpointState.P2CS
            ) {
                return true;
            }
        }
        return false;
    }

    /**
     * Return the output addresses for a given transaction
     * @param {import('./transaction.js').Transaction} tx
     */
    getOutAddress(tx) {
        return tx.vout.reduce(
            (acc, vout) => [
                ...acc,
                ...this.getAddressesFromScript(vout.script).addresses,
            ],
            []
        );
    }

    /**
     * Convert a list of Blockbook transactions to HistoricalTxs
     * @param {import('./transaction.js').Transaction[]} arrTXs - An array of the Blockbook TXs
     * @returns {Array<HistoricalTx>} - A new array of `HistoricalTx`-formatted transactions
     */
    // TODO: add shield data to txs
    toHistoricalTXs(arrTXs) {
        let histTXs = [];
        for (const tx of arrTXs) {
            // The total 'delta' or change in balance, from the Tx's sums
            let nAmount =
                (this.#mempool.getCredit(tx) - this.#mempool.getDebit(tx)) /
                COIN;

            // The receiver addresses, if any
            let arrReceivers = this.getOutAddress(tx);

            const getFilteredCredit = (filter) => {
                return tx.vout
                    .filter((_, i) => {
                        const status = this.#mempool.getOutpointStatus(
                            new COutpoint({
                                txid: tx.txid,
                                n: i,
                            })
                        );
                        return status & filter && status & OutpointState.OURS;
                    })
                    .reduce((acc, o) => acc + o.value, 0);
            };

            // Figure out the type, based on the Tx's properties
            let type = HistoricalTxType.UNKNOWN;
            if (tx.isCoinStake()) {
                type = HistoricalTxType.STAKE;
            } else if (this.checkForUndelegations(tx)) {
                type = HistoricalTxType.UNDELEGATION;
                nAmount = getFilteredCredit(OutpointState.P2PKH) / COIN;
            } else if (this.checkForDelegations(tx)) {
                type = HistoricalTxType.DELEGATION;
                arrReceivers = arrReceivers.filter((addr) => {
                    return addr[0] === cChainParams.current.STAKING_PREFIX;
                });
                nAmount = getFilteredCredit(OutpointState.P2CS) / COIN;
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
    #syncing = false;

    async sync() {
        if (this.#isSynced || this.#syncing) {
            throw new Error('Attempting to sync when already synced');
        }
        try {
            this.#syncing = true;
            await this.loadFromDisk();
            await this.loadShieldFromDisk();
            await getNetwork().walletFullSync();
            if (this.hasShield()) {
                await this.#syncShield();
            }
            this.#isSynced = true;
        } finally {
            this.#syncing = false;
        }
    }
    /**
     * Initial block and prover sync for the shield object
     */
    async #syncShield() {
        if (!this.#shield || this.#isSynced) {
            return;
        }
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
            const batchSize = SHIELD_BATCH_SYNC_SIZE;
            let handled = 0;
            const blocks = [];
            let syncing = false;
            await startBatch(
                async (i) => {
                    let block;
                    block = await cNet.getBlock(blockHeights[i]);
                    blocks[i] = block;
                    // We need to process blocks monotically
                    // When we get a block, start from the first unhandled
                    // One and handle as many as possible
                    for (let j = handled; blocks[j]; j = handled) {
                        if (syncing) break;
                        syncing = true;
                        handled++;
                        await this.#shield.handleBlock(blocks[j]);
                        // Delete so we don't have to hold all blocks in memory
                        // until we finish syncing
                        delete blocks[j];
                        syncing = false;
                    }

                    getEventEmitter().emit(
                        'shield-sync-status-update',
                        tr(translation.syncShieldProgress, [
                            { current: handled - 1 },
                            { total: blockHeights.length },
                        ]),
                        false
                    );
                },
                blockHeights.length,
                batchSize
            );
            getEventEmitter().emit('shield-sync-status-update', '', true);
        } catch (e) {
            console.error(e);
        }

        // At this point it should be safe to assume that shield is ready to use
        await this.saveShieldOnDisk();
        this.#isSynced = true;
    }

    /**
     * @todo this needs to take the `vin` as input,
     * But currently we don't have any way of getting the UTXO
     * out of the vin. This will hapèen after the mempool refactor,
     * But for now we can just recalculate the UTXOs
     */
    #getUTXOsForShield() {
        return this.#mempool
            .getUTXOs({
                requirement: OutpointState.P2PKH | OutpointState.OURS,
            })
            .map((u) => {
                return {
                    vout: u.outpoint.n,
                    amount: u.value,
                    private_key: parseWIF(
                        this.#masterKey.getPrivateKey(this.getPath(u.script))
                    ),
                    script: hexToBytes(u.script),
                    txid: u.outpoint.txid,
                };
            });
    }

    /**
     * Update the shield object with the latest blocks
     */
    async getLatestBlocks() {
        // Exit if this function is still processing
        // (this might take some time if we had many consecutive blocks without shield txs)
        if (this.#isFetchingLatestBlocks) return;
        // Exit if there is no shield loaded
        if (!this.hasShield()) return;
        this.#isFetchingLatestBlocks = true;

        const cNet = getNetwork();
        // Don't ask for the exact last block that arrived,
        // since it takes around 1 minute for blockbook to make it API available
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
        this.#isFetchingLatestBlocks = false;
        await this.saveShieldOnDisk();
    }
    /**
     * Save shield data on database
     */
    async saveShieldOnDisk() {
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
        getEventEmitter().emit('shield-loaded-from-disk');
        return;
    }

    /**
     * @returns {Promise<number>} Number of shield satoshis of the account
     */
    async getShieldBalance() {
        return this.#shield?.getBalance() || 0;
    }

    /**
     * @returns {Promise<number>} Number of pending shield satoshis of the account
     */
    async getPendingShieldBalance() {
        return this.#shield?.getPendingBalance() || 0;
    }

    /**
     * Create a non signed transaction
     * @param {string} address - Address to send to
     * @param {number} value - Amount of satoshis to send
     * @param {object} [opts] - Options
     * @param {boolean} [opts.isDelegation] - Whether or not this delegates PIVs to `address`.
     *     If set to true, `address` must be a valid cold staking address
     * @param {boolean} [opts.useDelegatedInputs] - Whether or not cold stake inputs are to be used.
     *    Should be set if this is an undelegation transaction.
     * @param {string?} [opts.changeDelegationAddress] - Which address to use as change when `useDelegatedInputs` is set to true.
     *     Only changes >= 1 PIV can be delegated
     * @param {boolean} [opts.isProposal] - Whether or not this is a proposal transaction
     */
    createTransaction(
        address,
        value,
        {
            isDelegation = false,
            useDelegatedInputs = false,
            useShieldInputs = false,
            delegateChange = false,
            changeDelegationAddress = null,
            isProposal = false,
            subtractFeeFromAmt = true,
            changeAddress = '',
            returnAddress = '',
        } = {}
    ) {
        let balance;
        if (useDelegatedInputs) {
            balance = this.#mempool.coldBalance;
        } else if (useShieldInputs) {
            balance = this.#shield.getBalance();
        } else {
            balance = this.#mempool.balance;
        }
        if (balance < value) {
            throw new Error('Not enough balance');
        }
        if (delegateChange && !changeDelegationAddress)
            throw new Error(
                '`delegateChange` was set to true, but no `changeDelegationAddress` was provided.'
            );
        const transactionBuilder = TransactionBuilder.create();
        const isShieldTx = useShieldInputs || isShieldAddress(address);

        // Add primary output
        if (isDelegation) {
            if (!returnAddress) [returnAddress] = this.getNewAddress(1);
            transactionBuilder.addColdStakeOutput({
                address: returnAddress,
                addressColdStake: address,
                value,
            });
        } else if (isProposal) {
            transactionBuilder.addProposalOutput({
                hash: address,
                value,
            });
        } else {
            transactionBuilder.addOutput({
                address,
                value,
            });
        }

        if (!useShieldInputs) {
            const requirement = useDelegatedInputs
                ? OutpointState.P2CS
                : OutpointState.P2PKH;
            const utxos = this.#mempool.getUTXOs({
                requirement: requirement | OutpointState.OURS,
                target: value,
            });
            transactionBuilder.addUTXOs(utxos);

            // Shield txs will handle change internally
            if (isShieldTx) {
                return transactionBuilder.build();
            }

            const fee = transactionBuilder.getFee();
            const changeValue = transactionBuilder.valueIn - value - fee;
            if (changeValue < 0) {
                if (!subtractFeeFromAmt) {
                    throw new Error('Not enough balance');
                }
                transactionBuilder.equallySubtractAmt(Math.abs(changeValue));
            } else if (changeValue > 0) {
                // TransactionBuilder will internally add the change only if it is not dust
                if (!changeAddress) [changeAddress] = this.getNewAddress(1);
                if (delegateChange && changeValue >= 1 * COIN) {
                    transactionBuilder.addColdStakeOutput({
                        address: changeAddress,
                        value: changeValue,
                        addressColdStake: changeDelegationAddress,
                        isChange: true,
                    });
                } else {
                    transactionBuilder.addOutput({
                        address: changeAddress,
                        value: changeValue,
                        isChange: true,
                    });
                }
            }
        }
        return transactionBuilder.build();
    }

    /**
     * Sign a shield transaction
     * @param {import('./transaction.js').Transaction} transaction
     */
    async #signShield(transaction) {
        if (!transaction.hasSaplingVersion) {
            throw new Error(
                '`signShield` was called with a tx that cannot have shield data'
            );
        }
        if (!this.hasShield()) {
            throw new Error(
                'trying to create a shield transaction without having shield enable'
            );
        }

        const periodicFunction = setInterval(async () => {
            const percentage = 5 + (await this.#shield.getTxStatus()) * 95;
            getEventEmitter().emit(
                'shield-transaction-creation-update',
                percentage,
                false
            );
        }, 500);

        const value =
            transaction.shieldOutput[0]?.value || transaction.vout[0].value;
        try {
            const { hex } = await this.#shield.createTransaction({
                address:
                    transaction.shieldOutput[0]?.address ||
                    this.getAddressesFromScript(transaction.vout[0].script)
                        .addresses[0],
                amount: value,
                blockHeight: getNetwork().cachedBlockCount,
                useShieldInputs: transaction.vin.length === 0,
                utxos: this.#getUTXOsForShield(),
                transparentChangeAddress: this.getNewAddress(1)[0],
            });
            return transaction.fromHex(hex);
        } catch (e) {
            // sleep a full period of periodicFunction
            await sleep(500);
            throw new Error(e);
        } finally {
            clearInterval(periodicFunction);
            getEventEmitter().emit(
                'shield-transaction-creation-update',
                0.0,
                true
            );
        }
    }

    /**
     * @param {import('./transaction.js').Transaction} transaction - transaction to sign
     * @throws {Error} if the wallet is view only
     * @returns {Promise<import('./transaction.js').Transaction>} a reference to the same transaction, signed
     */
    async sign(transaction) {
        if (this.isViewOnly()) {
            throw new Error('Cannot sign with a view only wallet');
        }
        if (!transaction.vin.length || transaction.shieldOutput[0]) {
            // TODO: separate signing and building process for shield?
            return await this.#signShield(transaction);
        }
        for (let i = 0; i < transaction.vin.length; i++) {
            const input = transaction.vin[i];
            const { type } = this.getAddressesFromScript(input.scriptSig);
            const path = this.getPath(input.scriptSig);
            const wif = this.getMasterKey().getPrivateKey(path);
            await transaction.signInput(i, wif, {
                isColdStake: type === 'p2cs',
            });
        }
        return transaction;
    }

    /**
     * Adds a transaction to the mempool. To be called after it's signed and sent to the network, if successful
     * @param {import('./transaction.js').Transaction} transaction
     */
    async addTransaction(transaction, skipDatabase = false) {
        this.#mempool.addTransaction(transaction);
        let i = 0;
        for (const out of transaction.vout) {
            this.updateHighestUsedIndex(out);
            const status = this.getScriptType(out.script);
            if (status & OutpointState.OURS) {
                this.#mempool.addOutpointStatus(
                    new COutpoint({
                        txid: transaction.txid,
                        n: i,
                    }),
                    status
                );
            }
            i++;
        }

        if (transaction.hasShieldData) {
            wallet.#shield?.finalizeTransaction(transaction.txid);
        }

        if (!skipDatabase) {
            const db = await Database.getInstance();
            await db.storeTx(transaction);
        }
    }

    /**
     * @returns {UTXO[]} Any UTXO that has value of
     * exactly `cChainParams.current.collateralInSats`
     */
    getMasternodeUTXOs() {
        const collateralValue = cChainParams.current.collateralInSats;
        return this.#mempool
            .getUTXOs({
                requirement: OutpointState.P2PKH | OutpointState.OURS,
            })
            .filter((u) => u.value === collateralValue);
    }

    /**
     * @returns {import('./transaction.js').Transaction[]} a list of all transactions
     */
    getTransactions() {
        return this.#mempool.getTransactions();
    }

    get balance() {
        return this.#mempool.balance;
    }

    get immatureBalance() {
        return this.#mempool.immatureBalance;
    }

    get coldBalance() {
        return this.#mempool.coldBalance;
    }

    /**
     * Utility function to get the UTXO from an outpoint
     * @param {COutpoint} outpoint
     * @returns {UTXO?}
     */
    outpointToUTXO(outpoint) {
        return this.#mempool.outpointToUTXO(outpoint);
    }

    async loadFromDisk() {
        const db = await Database.getInstance();
        if ((await db.getAccount())?.publicKey !== this.getKeyToExport()) {
            await db.removeAllTxs();
            return;
        }
        const txs = await db.getTxs();
        for (const tx of txs) {
            this.addTransaction(tx, true);
        }
    }
}

/**
 * @type{Wallet}
 */
export const wallet = new Wallet({ nAccountL: 0, isMainWallet: true }); // For now we are using only the 0-th account, (TODO: update once account system is done)

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
    shield = false,
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
        if (address !== confAddress) {
            throw new Error('User did not verify address');
        }
    }

    // If we're generating a new address manually, then render the new address in our Receive Modal
    if (updateGUI) {
        guiToggleReceiveType(
            shield ? RECEIVE_TYPES.SHIELD : RECEIVE_TYPES.ADDRESS
        );
    }

    return [address, path];
}

function createAddressConfirmation(address) {
    return `${translation.popupHardwareAddrCheck} ${strHardwareName}.
              <div class="seed-phrase">${address}</div>`;
}
