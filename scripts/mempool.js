import { getNetwork } from './network.js';
import { getStakingBalance } from './global.js';
import { Database } from './database.js';
import { getEventEmitter } from './event_bus.js';
import Multimap from 'multimap';
import { wallet } from './wallet.js';
import { COIN, cChainParams } from './chain_params.js';

export class CTxOut {
    /**
     * @param {Object} CTxOut
     * @param {COutpoint} CTxOut.outpoint - COutpoint of the CTxOut
     * @param {String} CTxOut.script - Redeem script, in HEX
     * @param {Number} CTxOut.value - Value in satoshi
     */
    constructor({ outpoint, script, value } = {}) {
        /** COutpoint of the CTxOut
         *  @type {COutpoint} */
        this.outpoint = outpoint;
        /** Redeem script, in hex
         * @type {String} */
        this.script = script;
        /** Value in satoshi
         *  @type {Number} */
        this.value = value;
    }
    isEmpty() {
        return this.value == 0 && this.script == 'f8';
    }
}
export class CTxIn {
    /**
     * @param {Object} CTxIn
     * @param {COutpoint} CTxIn.outpoint - Outpoint of the UTXO that the vin spends
     * @param {String} CTxIn.scriptSig - Script used to spend the corresponding UTXO, in hex
     */
    constructor({ outpoint, scriptSig } = {}) {
        /** Outpoint of the UTXO that the vin spends
         *  @type {COutpoint} */
        this.outpoint = outpoint;
        /** Script used to spend the corresponding UTXO, in hex
         * @type {String} */
        this.scriptSig = scriptSig;
    }
}

export class Transaction {
    /**
     * @param {Object} Transaction
     * @param {String} Transaction.txid - Transaction ID
     * @param {Number} Transaction.blockHeight - Block height of the transaction (-1 if is pending)
     * @param {Array<CTxIn>} Transaction.vin - Inputs of the transaction
     * @param {Array<CTxOut>} Transaction.vout - Outputs of the transaction
     * @param {Number} Transaction.blockTime - Time of the block
     */
    constructor({ txid, blockHeight, vin, vout, blockTime } = {}) {
        /** Transaction ID
         * @type {String} */
        this.txid = txid;
        /** Block height of the transaction (-1 if is pending)
         * @param {Number} */
        this.blockHeight = blockHeight;
        /** Inputs of the transaction
         *  @type {Array<CTxIn>}*/
        this.vin = vin;
        /** Outputs of the transaction
         *  @type {Array<CTxOut>}*/
        this.vout = vout;
        /** Time of the block
         * @type {blockTime}*/
        this.blockTime = blockTime;
    }
    isConfirmed() {
        return this.blockHeight != -1;
    }
    isCoinStake() {
        return this.vout.length >= 2 && this.vout[0].isEmpty();
    }
    isCoinBase() {
        // txid undefined happens only for coinbase inputs
        return this.vin.length == 1 && !this.vin[0].outpoint.txid;
    }
    isMature() {
        if (!(this.isCoinBase() || this.isCoinStake())) {
            return true;
        }
        return (
            getNetwork().cachedBlockCount - this.blockHeight >
            cChainParams.current.coinbaseMaturity
        );
    }
}
/** An Unspent Transaction Output, used as Inputs of future transactions */
export class COutpoint {
    /**
     * @param {Object} COutpoint
     * @param {String} COutpoint.txid - Transaction ID
     * @param {Number} COutpoint.n - Outpoint position in the corresponding transaction
     */
    constructor({ txid, n } = {}) {
        /** Transaction ID
         * @type {String} */
        this.txid = txid;
        /** Outpoint position in the corresponding transaction
         *  @type {Number} */
        this.n = n;
    }
    /**
     * Sadly javascript sucks and we cannot directly compare Objects in Sets
     * @returns {String} Unique string representation of the COutpoint
     */
    toUnique() {
        return this.txid + this.n.toString();
    }
}

export const UTXO_WALLET_STATE = {
    NOT_MINE: 0, // Don't have the key to spend this utxo
    SPENDABLE: 1, // Have the key to spend this (P2PKH) utxo
    SPENDABLE_COLD: 2, // Have the key to spend this (P2CS) utxo
    COLD_RECEIVED: 4, // Have the staking key of this (P2CS) utxo
    SPENDABLE_TOTAL: 1 | 2,
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
        this.#balance = 0;
        this.#coldBalance = 0;
        getEventEmitter().emit('balance-update');
        getStakingBalance(true);
    }
    get balance() {
        return this.#balance;
    }
    get coldBalance() {
        return this.#coldBalance;
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
     * Get the total wallet balance
     * @param {UTXO_WALLET_STATE} filter the filter you want to apply
     */
    getBalance(filter, includeLocked = false) {
        let totBalance = 0;
        for (const [_, tx] of this.txmap) {
            if (!tx.isMature()) {
                continue;
            }
            for (const vout of tx.vout) {
                if (this.isSpent(vout.outpoint)) {
                    continue;
                }
                const UTXO_STATE = wallet.isMyVout(vout.script);
                if ((UTXO_STATE & filter) == 0) {
                    continue;
                }
                if (!includeLocked && wallet.isCoinLocked(vout.outpoint)) {
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
     * @returns {CTxOut[]} Array of fetched UTXOs
     */
    getUTXOs({ filter, target, onlyConfirmed = false, includeLocked }) {
        let totFound = 0;
        let utxos = [];
        for (const [_, tx] of this.txmap) {
            if (onlyConfirmed && !tx.isConfirmed()) {
                continue;
            }
            if (!tx.isMature()) {
                continue;
            }
            for (const vout of tx.vout) {
                if (this.isSpent(vout.outpoint)) {
                    continue;
                }
                const UTXO_STATE = wallet.isMyVout(vout.script);
                if ((UTXO_STATE & filter) == 0) {
                    continue;
                }
                if (!includeLocked && wallet.isCoinLocked(vout.outpoint)) {
                    continue;
                }
                utxos.push(vout);
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
     * @param {Object} tx - tx object fetched from the explorer
     * @returns {Transaction} transaction parsed
     */
    parseTransaction(tx) {
        const vout = [];
        const vin = [];
        for (const out of tx.vout) {
            vout.push(
                new CTxOut({
                    outpoint: new COutpoint({ txid: tx.txid, n: out.n }),
                    script: out.hex,
                    value: parseInt(out.value),
                })
            );
        }
        for (const inp of tx.vin) {
            const op = new COutpoint({
                txid: inp.txid,
                n: inp.vout ? inp.vout : 0,
            });
            vin.push(new CTxIn({ outpoint: op, scriptSig: inp.hex }));
        }
        return new Transaction({
            txid: tx.txid,
            blockHeight: tx.blockHeight,
            vin,
            vout,
            blockTime: tx.blockTime,
        });
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
        cNet.fullSynced = true;
        cNet.lastBlockSynced = nBlockHeights.at(-1);
        this.#highestSavedHeight = nBlockHeights.at(-1);
        this.setBalance();
        return true;
    }
}
