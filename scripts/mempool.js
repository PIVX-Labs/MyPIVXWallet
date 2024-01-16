import { getNetwork } from './network.js';
import { getStakingBalance } from './global.js';
import { Database } from './database.js';
import { getEventEmitter } from './event_bus.js';
import Multimap from 'multimap';
import { wallet } from './wallet.js';
import { cChainParams } from './chain_params.js';
import { Account } from './accounts.js';
import { Transaction, COutpoint, UTXO } from './transaction.js';

export const UTXO_WALLET_STATE = {
    NOT_MINE: 0, // Don't have the key to spend this utxo
    SPENDABLE: 1, // Have the key to spend this (P2PKH) utxo
    SPENDABLE_COLD: 2, // Have the key to spend this (P2CS) utxo
    COLD_RECEIVED: 4, // Have the staking key of this (P2CS) utxo
    SPENDABLE_TOTAL: 1 | 2,
    IMMATURE: 8, // Coinbase/ coinstake that it's not mature (and hence spendable) yet
    LOCKED: 16, // Coins in the LOCK set
};

/**
 * A historical transaction
 */
export class HistoricalTx {
    /**
     * @param {HistoricalTxType} type - The type of transaction.
     * @param {string} id - The transaction ID.
     * @param {Array<string>} receivers - The list of 'output addresses'.
     * @param {boolean} shieldedOutputs - If this transaction contains Shield outputs.
     * @param {number} time - The block time of the transaction.
     * @param {number} blockHeight - The block height of the transaction.
     * @param {number} amount - The amount transacted, in coins.
     */
    constructor(
        type,
        id,
        receivers,
        shieldedOutputs,
        time,
        blockHeight,
        amount
    ) {
        this.type = type;
        this.id = id;
        this.receivers = receivers;
        this.shieldedOutputs = shieldedOutputs;
        this.time = time;
        this.blockHeight = blockHeight;
        this.amount = amount;
    }
}

/**
 * A historical transaction type.
 * @enum {number}
 */
export const HistoricalTxType = {
    UNKNOWN: 0,
    STAKE: 1,
    DELEGATION: 2,
    UNDELEGATION: 3,
    RECEIVED: 4,
    SENT: 5,
};

/** A Mempool instance, stores and handles UTXO data for the wallet */
export class Mempool {
    /**
     * @type {number} - Immature balance
     */
    #immatureBalance = 0;
    /**
     * @type {number} - Our Public balance in Satoshis
     */
    #balance = 0;
    /**
     * @type {number} - Our Cold Staking balance in Satoshis
     */
    #coldBalance = 0;
    /**
     * @type {number} - Highest block height saved on disk
     */
    #highestSavedHeight = 0;

    constructor() {
        /**
         * Multimap txid -> spent Coutpoint
         * @type {Multimap<String, COutpoint>}
         */
        this.spent = new Multimap();
        /**
         * A map of all known transactions
         * @type {Map<String, Transaction>}
         */
        this.txmap = new Map();
        /**
         * Multimap nBlockHeight -> Transaction
         * @type {Multimap<Number, Transaction>}
         */
        this.orderedTxmap = new Multimap();
    }

    reset() {
        this.txmap = new Map();
        this.spent = new Multimap();
        this.orderedTxmap = new Multimap();
        this.setBalance();
        this.#highestSavedHeight = 0;
    }
    get balance() {
        return this.#balance;
    }
    get coldBalance() {
        return this.#coldBalance;
    }
    get immatureBalance() {
        return this.#immatureBalance;
    }

    /**
     * An Outpoint to check
     * @param {COutpoint} op
     */
    isSpent(op) {
        return this.spent.get(op.txid)?.some((x) => x.n == op.n);
    }

    /**
     * Add a transaction to the orderedTxmap, must be called once a new transaction is received.
     * @param {Transaction} tx
     */
    addToOrderedTxMap(tx) {
        if (!tx.isConfirmed()) return;
        if (
            this.orderedTxmap
                .get(tx.blockHeight)
                ?.some((x) => x.txid == tx.txid)
        )
            return;
        this.orderedTxmap.set(tx.blockHeight, tx);
    }
    /**
     * Add op to the spent map and optionally remove it from the lock set
     * @param {String} txid - transaction id
     * @param {COutpoint} op
     */
    setSpent(txid, op) {
        this.spent.set(txid, op);
        if (wallet.isCoinLocked(op)) wallet.unlockCoin(op);
    }

    /**
     * @param {Transaction} tx
     * @returns {boolean} if the tx is mature
     */
    isMature(tx) {
        if (!(tx.isCoinBase() || tx.isCoinStake())) {
            return true;
        }
        return (
            getNetwork().cachedBlockCount - tx.blockHeight >
            cChainParams.current.coinbaseMaturity
        );
    }

    /**
     * Get the total wallet balance
     * @param {UTXO_WALLET_STATE} filter the filter you want to apply
     */
    getBalance(filter) {
        let totBalance = 0;
        for (const [_, tx] of this.txmap) {
            // Check if tx is mature (or if we want to include immature)
            if (!this.isMature(tx) && !(filter & UTXO_WALLET_STATE.IMMATURE)) {
                continue;
            }
            for (let i = 0; i < tx.vout.length; i++) {
                const vout = tx.vout[i];
                const outpoint = new COutpoint({ txid: tx.txid, n: i });
                if (this.isSpent(outpoint)) {
                    continue;
                }
                const UTXO_STATE = wallet.isMyVout(vout.script);
                if ((UTXO_STATE & filter) == 0) {
                    continue;
                }

                if (
                    !(filter & UTXO_WALLET_STATE.LOCKED) &&
                    wallet.isCoinLocked(outpoint)
                ) {
                    continue;
                }
                totBalance += vout.value;
            }
        }
        return totBalance;
    }

    /**
     * Get a list of UTXOs
     * @param {Object} o
     * @param {Number} o.filter enum element of UTXO_WALLET_STATE
     * @param {Number | null} o.target PIVs in satoshi that we want to spend
     * @param {Boolean} o.onlyConfirmed Consider only confirmed transactions
     * @param {Boolean} o.includeLocked Include locked coins
     * @returns {UTXO[]} Array of fetched UTXOs
     */
    getUTXOs({ filter, target, onlyConfirmed = false, includeLocked }) {
        let totFound = 0;
        let utxos = [];
        for (const [_, tx] of this.txmap) {
            if (onlyConfirmed && !tx.isConfirmed()) {
                continue;
            }
            if (!this.isMature(tx)) {
                continue;
            }
            for (let i = 0; i < tx.vout.length; i++) {
                const vout = tx.vout[i];
                const outpoint = new COutpoint({
                    txid: tx.txid,
                    n: i,
                });
                if (this.isSpent(outpoint)) {
                    continue;
                }
                const UTXO_STATE = wallet.isMyVout(vout.script);
                if ((UTXO_STATE & filter) == 0) {
                    continue;
                }
                if (!includeLocked && wallet.isCoinLocked(outpoint)) {
                    continue;
                }
                utxos.push(
                    new UTXO({
                        outpoint,
                        script: vout.script,
                        value: vout.value,
                    })
                );
                // Return early if you found enough PIVs (11/10 is to make sure to pay fee)
                totFound += vout.value;
                if (target && totFound > (11 / 10) * target) {
                    return utxos;
                }
            }
        }
        return utxos;
    }

    /**
     * Update the mempool status
     * @param {Transaction} tx
     */
    updateMempool(tx) {
        if (this.txmap.get(tx.txid)?.isConfirmed()) return;
        this.txmap.set(tx.txid, tx);
        for (const vin of tx.vin) {
            const op = vin.outpoint;
            if (!this.isSpent(op)) {
                this.setSpent(op.txid, op);
            }
        }
        for (const vout of tx.vout) {
            wallet.updateHighestUsedIndex(vout);
        }
        this.addToOrderedTxMap(tx);
    }

    setBalance() {
        this.#balance = this.getBalance(UTXO_WALLET_STATE.SPENDABLE);
        this.#coldBalance = this.getBalance(UTXO_WALLET_STATE.SPENDABLE_COLD);
        this.#immatureBalance =
            this.getBalance(
                UTXO_WALLET_STATE.SPENDABLE | UTXO_WALLET_STATE.IMMATURE
            ) - this.#balance;
        getEventEmitter().emit('balance-update');
        getStakingBalance(true);
    }

    /**
     * Save txs on database
     */
    async saveOnDisk() {
        const nBlockHeights = Array.from(this.orderedTxmap.keys())
            .sort((a, b) => a - b)
            .reverse();
        if (nBlockHeights.length == 0) {
            return;
        }
        const database = await Database.getInstance();
        for (const nHeight of nBlockHeights) {
            if (this.#highestSavedHeight > nHeight) {
                break;
            }
            await Promise.all(
                this.orderedTxmap.get(nHeight).map(async function (tx) {
                    await database.storeTx(tx);
                })
            );
        }
        this.#highestSavedHeight = nBlockHeights[0];
    }
    /**
     * Load txs from database
     * @returns {Promise<Boolean>} true if database was non-empty and transaction are loaded successfully
     */
    async loadFromDisk() {
        const database = await Database.getInstance();
        // Check if the stored txs are linked to this wallet
        if (
            (await database.getAccount())?.publicKey != wallet.getKeyToExport()
        ) {
            await database.removeAllTxs();
            await database.removeAccount({ publicKey: null });
            const cAccount = new Account({
                publicKey: wallet.getKeyToExport(),
            });
            await database.addAccount(cAccount);
            return;
        }
        const txs = await database.getTxs();
        if (txs.length == 0) {
            return false;
        }
        for (const tx of txs) {
            this.addToOrderedTxMap(tx);
        }
        const nBlockHeights = Array.from(this.orderedTxmap.keys()).sort(
            (a, b) => a - b
        );
        for (const nHeight of nBlockHeights) {
            for (const tx of this.orderedTxmap.get(nHeight)) {
                this.updateMempool(tx);
            }
        }
        const cNet = getNetwork();
        cNet.lastBlockSynced = nBlockHeights.at(-1);
        this.#highestSavedHeight = nBlockHeights.at(-1);
        return true;
    }
}
