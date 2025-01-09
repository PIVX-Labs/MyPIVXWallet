import { validateMnemonic } from 'bip39';
import { Reader } from './reader.js';
import { decrypt } from './aes-gcm.js';
import { bytesToNum, parseWIF } from './encoding.js';
import { beforeUnloadListener, blockCount } from './global.js';
import { getNetwork } from './network/network_manager.js';
import { MAX_ACCOUNT_GAP } from './chain_params.js';
import { HistoricalTx, HistoricalTxType } from './historical_tx.js';
import { COutpoint, Transaction } from './transaction.js';
import { confirmPopup, isShieldAddress } from './misc.js';
import { cChainParams } from './chain_params.js';
import { COIN } from './chain_params.js';
import { ALERTS, translation } from './i18n.js';
import { encrypt } from './aes-gcm.js';
import { Database } from './database.js';
import { RECEIVE_TYPES } from './contacts-book.js';
import { Account } from './accounts.js';
import { fAdvancedMode } from './settings.js';
import {
    bytesToHex,
    hexToBytes,
    reverseAndSwapEndianess,
    sleep,
} from './utils.js';
import { strHardwareName } from './ledger.js';
import { OutpointState, Mempool } from './mempool.js';
import { getEventEmitter } from './event_bus.js';
import { lockableFunction } from './lock.js';
import {
    isP2CS,
    isP2PKH,
    isP2EXC,
    getAddressFromHash,
    COLD_START_INDEX,
    P2PK_START_INDEX,
    OWNER_START_INDEX,
} from './script.js';
import { PIVXShield } from 'pivx-shield';
import { guiToggleReceiveType } from './contacts-book.js';
import { TransactionBuilder } from './transaction_builder.js';
import { createAlert } from './alerts/alert.js';
import { AsyncInterval } from './async_interval.js';
import {
    debugError,
    debugLog,
    debugTimerEnd,
    debugTimerStart,
    DebugTopics,
} from './debug.js';
import { OrderedArray } from './ordered_array.js';
import { SaplingParams } from './sapling_params.js';

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
    static Chains = {
        EXTERNAL: 0,
        INTERNAL: 1,
    };

    /**
     * @param {(x: number) => void} fn
     */
    #iterChains(fn) {
        for (let i in Wallet.Chains) {
            let chain = Wallet.Chains[i];
            fn(chain);
        }
    }
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
     * @type {Mempool}
     */
    #mempool;

    #isSynced = false;
    /**
     * The height of the last processed block in the wallet
     * @type {number}
     */
    #lastProcessedBlock = 0;
    /**
     * Array of historical txs, ordered by block height
     * @type OrderedArray<HistoricalTx>
     */
    #historicalTxs = new OrderedArray((hTx1, hTx2) => {
        if (hTx1.blockHeight === -1) {
            return hTx1;
        }
        if (hTx2.blockHeight === -1) {
            return hTx2;
        }
        return hTx1.blockHeight >= hTx2.blockHeight;
    });

    constructor({ nAccount, masterKey, shield, mempool = new Mempool() }) {
        this.#nAccount = nAccount;
        this.#mempool = mempool;
        this.#masterKey = masterKey;
        this.#shield = shield;
        this.#iterChains((chain) => {
            this.#highestUsedIndices.set(chain, 0);
            this.#loadedIndexes.set(chain, 0);
            this.#addressIndices.set(chain, 0);
        });
        this.#subscribeToNetworkEvents();
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
        return this.sync.isLocked();
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

    /**
     * Set or replace the active Master Key with a new Master Key
     * @param {object} o - Object to be destructured
     * @param {import('./masterkey.js').MasterKey} o.mk - The new Master Key
     * @param {number} [o.nAccount] - The account number
     * @param {string} [o.extsk] - The extended spending key
     */
    async setMasterKey({ mk, nAccount = 0, extsk }) {
        const isNewAcc =
            mk?.getKeyToExport(nAccount) !==
            this.#masterKey?.getKeyToExport(this.#nAccount);
        this.#masterKey = mk;
        this.#nAccount = nAccount;
        if (extsk) await this.setExtsk(extsk);
        if (isNewAcc) {
            this.reset();
            this.#iterChains((chain) => {
                this.#loadAddresses(chain);
            });
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
        this.#iterChains((chain) => {
            this.#highestUsedIndices.set(chain, 0);
            this.#loadedIndexes.set(chain, 0);
            this.#addressIndices.set(chain, 0);
        });
        this.#mempool = new Mempool();
        this.#lastProcessedBlock = 0;
        this.#historicalTxs.clear();
    }

    /**
     * Derive the current external address
     * @return {string} Address
     *
     */
    getCurrentAddress() {
        const ext = Wallet.Chains.EXTERNAL;
        return this.#getAddress(ext, this.#addressIndices.get(ext));
    }

    /**
     * Update the current address.
     */
    #updateCurrentAddress() {
        // No need to update the change address, as it is only handled internally by the wallet.
        const last = this.#highestUsedIndices.get(Wallet.Chains.EXTERNAL);
        const curr = this.#addressIndices.get(Wallet.Chains.EXTERNAL);
        if (curr <= last) {
            this.#addressIndices.set(Wallet.Chains.EXTERNAL, last + 1);
        }
    }

    /**
     * Derive a generic address (given nReceiving and nIndex)
     * @return {string} Address
     */
    #getAddress(nReceiving, nIndex) {
        const path = this.#getDerivationPath(nReceiving, nIndex);
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
    getXPub(nReceiving = Wallet.Chains.EXTERNAL, nIndex = 0) {
        // Get our current wallet XPub
        const derivationPath = this.#getDerivationPath(nReceiving, nIndex)
            .split('/')
            .slice(0, 4)
            .join('/');
        return this.#masterKey.getxpub(derivationPath);
    }

    /**
     * Check if the wallet (masterKey) is loaded in memory
     * @return {boolean} Return `true` if a masterKey has been loaded in the wallet
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
     * @returns {Promise<boolean>}
     */
    async encrypt(strPassword) {
        // Encrypt the wallet WIF with AES-GCM and a user-chosen password - suitable for browser storage
        let strEncWIF = await encrypt(this.#getKeyToEncrypt(), strPassword);
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
    getNewAddress(nReceiving = Wallet.Chains.EXTERNAL) {
        const last = this.#highestUsedIndices.get(nReceiving);
        const curr = this.#addressIndices.get(nReceiving);
        this.#addressIndices.set(nReceiving, Math.max(curr, last) + 1);
        if (this.#addressIndices.get(nReceiving) - last > MAX_ACCOUNT_GAP) {
            // If the user creates more than ${MAX_ACCOUNT_GAP} empty wallets we will not be able to sync them!
            this.#addressIndices.set(nReceiving, last);
        }
        const path = this.#getDerivationPath(
            nReceiving,
            this.#addressIndices.get(nReceiving)
        );
        const address = this.#getAddress(
            nReceiving,
            this.#addressIndices.get(nReceiving)
        );
        return [address, path];
    }

    /**
     * Generates a new change address
     * @returns {string}
     */
    getNewChangeAddress() {
        return this.getNewAddress(Wallet.Chains.INTERNAL)[0];
    }

    /**
     * @returns {Promise<string>} new shield address
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
    #updateHighestUsedIndex(vout) {
        const dataBytes = hexToBytes(vout.script);
        const iStart = isP2PKH(dataBytes) ? P2PK_START_INDEX : COLD_START_INDEX;
        const address = this.#getAddressFromHashCache(
            bytesToHex(dataBytes.slice(iStart, iStart + 20))
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
                this.#loadAddresses(nReceiving);
            }
        }
    }

    /**
     * Load MAX_ACCOUNT_GAP inside #ownAddresses map.
     * @param {number} chain - Chain to load
     */
    #loadAddresses(chain) {
        if (this.isHD()) {
            const start = this.#loadedIndexes.get(chain);
            const end = start + MAX_ACCOUNT_GAP;
            for (let i = start; i <= end; i++) {
                const path = this.#getDerivationPath(chain, i);
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
    #getDerivationPath(nReceiving, nIndex) {
        return this.#masterKey.getDerivationPath(
            this.#nAccount,
            nReceiving,
            nIndex
        );
    }

    getKeyToExport() {
        return this.#masterKey?.getKeyToExport(this.#nAccount);
    }

    /**
     * @returns key to backup. May be encrypted
     */
    async getKeyToBackup() {
        if (await hasEncryptedWallet()) {
            const account = await (await Database.getInstance()).getAccount();
            return account.encWif;
        }
        return this.#getKeyToEncrypt();
    }

    /**
     * @returns key to encrypt
     */
    #getKeyToEncrypt() {
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
        const address = this.#getAddressFromHashCache(
            bytesToHex(dataBytes.slice(iStart, iStart + 20))
        );
        return this.isOwnAddress(address);
    }

    /**
     * Get the outpoint state based on the script.
     * This functions only tells us the type of the script and if it's ours
     * It doesn't know about LOCK, IMMATURE or SPENT statuses, for that
     * it's necessary to interrogate the mempool
     */
    #getScriptType(script) {
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
            const address = this.#getAddressFromHashCache(
                bytesToHex(
                    dataBytes.slice(P2PK_START_INDEX, P2PK_START_INDEX + 20)
                )
            );
            return {
                type: 'p2pkh',
                addresses: [address],
            };
        } else if (isP2CS(dataBytes)) {
            const addresses = [];
            for (let i = 0; i < 2; i++) {
                const iStart = i === 0 ? OWNER_START_INDEX : COLD_START_INDEX;
                addresses.push(
                    this.#getAddressFromHashCache(
                        bytesToHex(dataBytes.slice(iStart, iStart + 20)),
                        iStart === OWNER_START_INDEX
                            ? 'coldaddress'
                            : 'pubkeyhash'
                    )
                );
            }
            return { type: 'p2cs', addresses };
        } else if (isP2EXC(dataBytes)) {
            const address = this.#getAddressFromHashCache(
                bytesToHex(
                    dataBytes.slice(
                        P2PK_START_INDEX + 1,
                        P2PK_START_INDEX + 20 + 1
                    )
                ),
                'exchangeaddress'
            );
            return {
                type: 'exchange',
                addresses: [address],
            };
        } else {
            return { type: 'unknown', addresses: [] };
        }
    }

    // Avoid calculating over and over the same getAddressFromHash by saving the result in a map
    #getAddressFromHashCache(pkh_hex, type) {
        if (!this.#knownPKH.has(pkh_hex)) {
            this.#knownPKH.set(
                pkh_hex,
                getAddressFromHash(hexToBytes(pkh_hex), type)
            );
        }
        return this.#knownPKH.get(pkh_hex);
    }

    /**
     * Return true if the transaction contains undelegations regarding the given wallet
     * @param {import('./transaction.js').Transaction} tx
     */
    #checkForUndelegations(tx) {
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
    #checkForDelegations(tx) {
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
    #getOutAddress(tx) {
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
     * @param {import('./transaction.js').Transaction} tx - A  Transaction
     * @returns {Promise<HistoricalTx>} - The corresponding `HistoricalTx`- formatted transaction
     */
    async #toHistoricalTX(tx) {
        const { credit, ownAllVout } = this.#mempool.getCredit(tx);
        const { debit, ownAllVin } = this.#mempool.getDebit(tx);
        // The total 'delta' or change in balance, from the Tx's sums
        let nAmount = (credit - debit) / COIN;

        // Shielded data
        const { shieldCredit, shieldDebit, arrShieldReceivers } =
            await this.#extractSaplingAmounts(tx);
        const nShieldAmount = (shieldCredit - shieldDebit) / COIN;
        const ownAllShield = shieldDebit - shieldCredit === tx.valueBalance;
        // The receiver addresses, if any
        let arrReceivers = this.#getOutAddress(tx);
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
        } else if (tx.isProposalFee()) {
            type = HistoricalTxType.PROPOSAL_FEE;
        } else if (this.#checkForUndelegations(tx)) {
            type = HistoricalTxType.UNDELEGATION;
            nAmount = getFilteredCredit(OutpointState.P2PKH) / COIN;
        } else if (this.#checkForDelegations(tx)) {
            type = HistoricalTxType.DELEGATION;
            arrReceivers = arrReceivers.filter((addr) => {
                return addr[0] === cChainParams.current.STAKING_PREFIX;
            });
            nAmount = getFilteredCredit(OutpointState.P2CS) / COIN;
        } else if (nAmount + nShieldAmount > 0) {
            type = HistoricalTxType.RECEIVED;
        } else if (nAmount + nShieldAmount < 0) {
            type = HistoricalTxType.SENT;
        }

        return new HistoricalTx(
            type,
            tx.txid,
            arrReceivers,
            arrShieldReceivers,
            tx.blockTime,
            tx.blockHeight,
            nAmount,
            nShieldAmount,
            ownAllVin && ownAllVout && ownAllShield
        );
    }

    /**
     * Extract the sapling spent, received and shield addressed, regarding the wallet, from a tx
     * @param {import('./transaction.js').Transaction} tx - a Transaction object
     */
    async #extractSaplingAmounts(tx) {
        let shieldCredit = 0;
        let shieldDebit = 0;
        let arrShieldReceivers = [];
        if (!tx.hasShieldData || !wallet.hasShield()) {
            return { shieldCredit, shieldDebit, arrShieldReceivers };
        }

        for (const shieldSpend of tx.shieldSpend) {
            const nullifier = reverseAndSwapEndianess(shieldSpend.nullifier);
            const spentNote = this.#shield.getNoteFromNullifier(nullifier);
            if (spentNote) {
                shieldDebit += spentNote.value;
            }
        }
        const myOutputNotes = await this.#shield.decryptTransactionOutputs(
            tx.serialize()
        );
        for (const note of myOutputNotes) {
            shieldCredit += note.value;
            arrShieldReceivers.push(note.recipient);
        }
        return { shieldCredit, shieldDebit, arrShieldReceivers };
    }
    /*
     * @param {Transaction} tx
     */
    async #pushToHistoricalTx(tx) {
        const hTx = await this.#toHistoricalTX(tx);
        this.#historicalTxs.insert(hTx);
    }

    /**
     * @returns {HistoricalTx[]}
     */
    getHistoricalTxs() {
        return this.#historicalTxs.get();
    }
    sync = lockableFunction(async () => {
        if (this.#isSynced) {
            throw new Error('Attempting to sync when already synced');
        }
        // While syncing the wallet ( DB read + network sync) disable the event balance-update
        // This is done to avoid a huge spam of event.
        getEventEmitter().disableEvent('balance-update');
        getEventEmitter().disableEvent('new-tx');

        await this.#loadShieldFromDisk();
        await this.#loadFromDisk();
        // Let's set the last processed block 5 blocks behind the actual chain tip
        // This is just to be sure since blockbook (as we know)
        // usually does not return txs of the actual last block.
        this.#lastProcessedBlock = blockCount - 5;
        await this.#transparentSync();
        if (this.hasShield()) {
            debugTimerStart(DebugTopics.WALLET, 'syncShield');
            await this.#syncShield();
            debugTimerEnd(DebugTopics.WALLET, 'syncShield');
        }
        this.#isSynced = true;
        // At this point download the last missing blocks in the range (blockCount -5, blockCount]
        await this.#getLatestBlocks(blockCount);

        // Finally avoid address re-use by updating the map #addressIndices
        this.#updateCurrentAddress();

        // Update both activities post sync
        getEventEmitter().enableEvent('balance-update');
        getEventEmitter().enableEvent('new-tx');
        getEventEmitter().emit('balance-update');
        getEventEmitter().emit('new-tx');
    });

    async #transparentSync() {
        if (!this.isLoaded() || this.#isSynced) return;
        const cNet = getNetwork();
        const addr = this.getKeyToExport();
        let nStartHeight = Math.max(
            ...this.#mempool.getTransactions().map((tx) => tx.blockHeight)
        );
        // Compute the total pages and iterate through them until we've synced everything
        const totalPages = await cNet.getNumPages(nStartHeight, addr);
        for (let i = totalPages; i > 0; i--) {
            getEventEmitter().emit(
                'transparent-sync-status-update',
                i,
                totalPages,
                false
            );

            // Fetch this page of transactions
            const iPageTxs = await cNet.getTxPage(nStartHeight, addr, i);
            for (const tx of iPageTxs.reverse()) {
                await this.addTransaction(tx, tx.blockHeight === -1);
            }
        }
        getEventEmitter().emit('transparent-sync-status-update', '', '', true);
    }

    /**
     * Initial block and prover sync for the shield object
     */
    async #syncShield() {
        if (!this.#shield || this.#isSynced) {
            return;
        }

        try {
            const network = getNetwork();
            const req = await network.getShieldData(
                wallet.#shield.getLastSyncedBlock() + 1
            );
            if (!req.ok) throw new Error("Couldn't sync shield");
            const reader = new Reader(req);

            /** @type{string[]} Array of txs in the current block */
            let txs = [];
            const length = reader.contentLength;
            /** @type {Uint8Array} Array of bytes that we are processing **/
            getEventEmitter().emit(
                'shield-sync-status-update',
                0,
                length,
                false
            );

            /**
             * Array of blocks ready to pass to the shield library
             * @type {{txs: string[]; height: number; time: number}[]}
             */
            let blocksArray = [];
            let handleBlocksTime = 0;
            const handleAllBlocks = async () => {
                const start = performance.now();
                // Process the current batch of blocks before starting to parse the next one
                if (blocksArray.length) {
                    const ownTxs = await this.#shield.handleBlocks(blocksArray);
                    // TODO: slow! slow! slow!
                    if (ownTxs.length > 0) {
                        for (const block of blocksArray) {
                            for (const tx of block.txs) {
                                if (ownTxs.includes(tx.hex)) {
                                    const parsed = Transaction.fromHex(tx.hex);
                                    parsed.blockTime = block.time;
                                    parsed.blockHeight = block.height;
                                    await this.addTransaction(parsed);
                                }
                            }
                        }
                    }
                }
                handleBlocksTime += performance.now() - start;
                blocksArray = [];
                // Emit status update
                getEventEmitter().emit(
                    'shield-sync-status-update',
                    reader.readBytes,
                    length,
                    false
                );
            };
            while (true) {
                const packetLengthBytes = await reader.read(4);
                if (!packetLengthBytes) break;
                const packetLength = Number(bytesToNum(packetLengthBytes));

                const bytes = await reader.read(packetLength);
                if (!bytes) throw new Error('Stream was cut short');
                if (bytes[0] === 0x5d) {
                    const height = Number(bytesToNum(bytes.slice(1, 5)));
                    const time = Number(bytesToNum(bytes.slice(5, 9)));

                    blocksArray.push({ txs, height, time });
                    txs = [];
                } else if (bytes[0] === 0x03) {
                    // 0x03 is the tx version. We should only get v3 transactions
                    const hex = bytesToHex(bytes);
                    txs.push({
                        hex,
                        txid: Transaction.getTxidFromHex(hex),
                    });
                } else {
                    // This is neither a block or a tx.
                    throw new Error('Failed to parse shield binary');
                }
                if (blocksArray.length >= 10) {
                    await handleAllBlocks();
                }
            }
            await handleAllBlocks();
            debugLog(
                DebugTopics.WALLET,
                `syncShield rust internal ${handleBlocksTime} ms`
            );
            // At this point it should be safe to assume that shield is ready to use
            await this.#saveShieldOnDisk();
        } catch (e) {
            debugError(DebugTopics.WALLET, e);
        }

        const networkSaplingRoot = (
            await getNetwork().getBlock(this.#shield.getLastSyncedBlock())
        ).finalsaplingroot;
        if (networkSaplingRoot)
            await this.#checkShieldSaplingRoot(networkSaplingRoot);
        this.#isSynced = true;

        getEventEmitter().emit('shield-sync-status-update', 0, 0, true);
    }

    /**
     * @todo this needs to take the `vin` as input,
     * But currently we don't have any way of getting the UTXO
     * out of the vin. This will happen after the mempool refactor,
     * But for now we can just recalculate the UTXOs
     * @param {number} target - Number of satoshis needed. See Mempool.getUTXOs
     */
    #getUTXOsForShield(target = Number.POSITIVE_INFINITY) {
        return this.#mempool
            .getUTXOs({
                requirement: OutpointState.P2PKH | OutpointState.OURS,
                target,
                blockCount,
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

    #subscribeToNetworkEvents() {
        getEventEmitter().on('new-block', async (block) => {
            if (this.#isSynced) {
                await this.#getLatestBlocks(block);
                // Invalidate the balance cache to keep immature balance updated
                this.#mempool.invalidateBalanceCache();
                // Emit a new-tx signal to update the Activity.
                // Otherwise, unconfirmed txs would not get updated
                getEventEmitter().emit('new-tx');
            }
        });
    }
    #getLatestBlocks = lockableFunction(
        /**
         * Update the shield object with the latest blocks
         * @param{number} blockCount - block count
         */
        async (blockCount) => {
            const cNet = getNetwork();
            let block;
            for (
                let blockHeight = this.#lastProcessedBlock + 1;
                blockHeight <= blockCount;
                blockHeight++
            ) {
                try {
                    block = await cNet.getBlock(blockHeight);
                    await this.#handleBlock(block, blockHeight);
                    this.#lastProcessedBlock = blockHeight;
                } catch (e) {
                    debugError(DebugTopics.WALLET, e);
                    break;
                }
            }

            // SHIELD-only checks
            if (this.hasShield()) {
                const saplingRoot = block?.finalsaplingroot;
                if (
                    saplingRoot &&
                    !(await this.#checkShieldSaplingRoot(saplingRoot))
                )
                    return;
                await this.#saveShieldOnDisk();
            }
        }
    );

    async #checkShieldSaplingRoot(networkSaplingRoot) {
        const saplingRoot = reverseAndSwapEndianess(
            await this.#shield.getSaplingRoot()
        );
        // If explorer sapling root is different from ours, there must be a sync error
        if (saplingRoot !== networkSaplingRoot) {
            createAlert('warning', translation.badSaplingRoot, 5000);
            this.#mempool = new Mempool();
            await this.#resetShield();
            this.#isSynced = false;
            await this.#transparentSync();
            await this.#syncShield();
            return false;
        }
        return true;
    }

    /**
     * Save shield data on database
     */
    async #saveShieldOnDisk() {
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
    async #loadShieldFromDisk() {
        if (this.#shield) {
            return;
        }
        const cDB = await Database.getInstance();
        const cAccount = await cDB.getAccount();
        // If the account has not been created yet or there is no shield data return
        if (!cAccount || cAccount.shieldData === '') {
            return;
        }
        const loadRes = await PIVXShield.load(cAccount.shieldData);
        this.#shield = loadRes.pivxShield;
        getEventEmitter().emit('shield-loaded-from-disk');
        // Load operation was not successful!
        // Provided data are not compatible with the latest PIVX shield version.
        // Resetting the shield object is required
        if (!loadRes.success) {
            debugLog(
                DebugTopics.WALLET,
                'Shield backup is not compatible with latest library version'
            );
            await this.#resetShield();
        }
        return;
    }

    async #resetShield() {
        // TODO: take the wallet creation height in input from users
        await this.#shield.reloadFromCheckpoint(4200000);
        await this.#saveShieldOnDisk();
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
            balance = this.coldBalance;
        } else if (useShieldInputs) {
            balance = this.#shield.getBalance();
        } else {
            balance = this.balance;
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
            if (!returnAddress) returnAddress = this.getNewChangeAddress();
            // The per-output target for maximum staking efficiency
            const nTarget = cChainParams.current.stakeSplitTarget;
            // Generate optimal staking outputs
            if (value < COIN) {
                throw new Error('below consensus');
            } else if (value < nTarget) {
                transactionBuilder.addColdStakeOutput({
                    address: returnAddress,
                    addressColdStake: address,
                    value,
                });
            } else {
                for (let i = 0; i < Math.floor(value / nTarget); i++) {
                    transactionBuilder.addColdStakeOutput({
                        address: returnAddress,
                        addressColdStake: address,
                        value: i === 0 ? nTarget + (value % nTarget) : nTarget,
                    });
                }
            }
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
                blockCount,
            });
            transactionBuilder.addUTXOs(utxos);

            // Shield txs will handle change internally
            if (isShieldTx) {
                return transactionBuilder.build();
            }

            const fee = transactionBuilder.getFee();
            const changeValue =
                transactionBuilder.valueIn - transactionBuilder.valueOut - fee;
            if (changeValue < 0) {
                if (!subtractFeeFromAmt) {
                    throw new Error('Not enough balance');
                }
                transactionBuilder.equallySubtractAmt(Math.abs(changeValue));
            } else if (changeValue > 0) {
                // TransactionBuilder will internally add the change only if it is not dust
                if (!changeAddress) changeAddress = this.getNewChangeAddress();
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

        if (!(await this.#shield.proverIsLoaded())) {
            await this.#loadProver();
        }

        const periodicFunction = new AsyncInterval(async () => {
            const percentage = (await this.#shield.getTxStatus()) * 100;
            getEventEmitter().emit(
                'shield-transaction-creation-update',
                percentage,
                // state: 0 = loading shield params
                //        1 = proving tx
                //        2 = finished
                1
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
                blockHeight: blockCount + 1,
                useShieldInputs: transaction.vin.length === 0,
                utxos: this.#getUTXOsForShield(value),
                transparentChangeAddress: this.getNewChangeAddress(),
            });
            return transaction.fromHex(hex);
        } catch (e) {
            // sleep a full period of periodicFunction
            await sleep(500);
            throw e;
        } finally {
            await periodicFunction.clearInterval();
            getEventEmitter().emit(
                'shield-transaction-creation-update',
                0.0,
                // state: 0 = loading shield params
                //        1 = proving tx
                //        2 = finished
                2
            );
        }
    }

    async #loadProver() {
        const params = new SaplingParams(
            getNetwork(),
            await Database.getInstance()
        );
        await params.fetch(this.#shield);
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
        const tx = this.#mempool.getTransaction(transaction.txid);
        this.#mempool.addTransaction(transaction);
        let i = 0;
        for (const out of transaction.vout) {
            this.#updateHighestUsedIndex(out);
            const status = this.#getScriptType(out.script);
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
            await wallet.#shield?.finalizeTransaction(transaction.txid);
        }

        if (!skipDatabase) {
            const db = await Database.getInstance();
            await db.storeTx(transaction);
        }
        if (tx) {
            this.#historicalTxs.remove((hTx) => hTx.id === tx.txid);
        }
        if (this.#isSynced) {
            this.#updateCurrentAddress();
        }
        await this.#pushToHistoricalTx(transaction);
        getEventEmitter().emit('new-tx');
        getEventEmitter().emit('balance-update');
    }

    /**
     * Handle the various transactions of a block
     * @param block - block outputted from any PIVX node
     * @param {number} blockHeight - the height of the block in the chain
     * @param {boolean} allowOwn - whether to add transaction that satisfy ownTransaction()
     */
    async #handleBlock(block, blockHeight, allowOwn = true) {
        let shieldTxs = [];
        if (
            this.hasShield() &&
            blockHeight > this.#shield.getLastSyncedBlock()
        ) {
            shieldTxs = await this.#shield.handleBlock(block);
        }
        for (const tx of block.txs) {
            const parsed = Transaction.fromHex(tx.hex);
            parsed.blockHeight = blockHeight;
            parsed.blockTime = block.time;
            // Avoid wasting memory on txs that do not regard our wallet
            const isOwned = allowOwn ? this.#ownTransaction(parsed) : false;
            if (isOwned || shieldTxs.includes(tx.hex)) {
                await this.addTransaction(parsed);
            }
        }
    }

    /**
     * Check if any vin or vout of the transaction belong to the wallet
     * @param {import('./transaction.js').Transaction} transaction
     */
    #ownTransaction(transaction) {
        const ownVout =
            transaction.vout.filter((out) => {
                return this.#getScriptType(out.script) & OutpointState.OURS;
            }).length > 0;
        const ownVin =
            transaction.vin.filter((input) => {
                return (
                    this.#mempool.getOutpointStatus(input.outpoint) &
                    OutpointState.OURS
                );
            }).length > 0;
        return ownVout || ownVin;
    }

    /**
     * Discard a transaction. Must be called only if network doesn't accept it.
     * @param {import('./transaction.js').Transaction} transaction
     */
    discardTransaction(transaction) {
        wallet.#shield?.discardTransaction(transaction.txid);
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
                blockCount,
            })
            .filter((u) => u.value === collateralValue);
    }

    get balance() {
        return this.#mempool.getBalance(blockCount);
    }

    get immatureBalance() {
        return this.#mempool.getImmatureBalance(blockCount);
    }

    get coldBalance() {
        return this.#mempool.getColdBalance(blockCount);
    }

    /**
     * Utility function to get the UTXO from an outpoint
     * @param {COutpoint} outpoint
     * @returns {UTXO?}
     */
    outpointToUTXO(outpoint) {
        return this.#mempool.outpointToUTXO(outpoint);
    }

    async #loadFromDisk() {
        const db = await Database.getInstance();
        if ((await db.getAccount())?.publicKey !== this.getKeyToExport()) {
            await db.removeAllTxs();
            return;
        }
        const txs = await db.getTxs();
        for (const tx of txs) {
            await this.addTransaction(tx, true);
        }
    }
}

/**
 * @type{Wallet}
 */
export const wallet = new Wallet({ nAccount: 0 }); // For now we are using only the 0-th account, (TODO: update once account system is done)

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
