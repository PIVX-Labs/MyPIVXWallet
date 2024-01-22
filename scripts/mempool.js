//import { getNetwork } from './network.js';
//import { getStakingBalance } from './global.js';
import { getEventEmitter } from './event_bus.js';
import { Transaction, COutpoint, UTXO } from './transaction.js';

export const OutpointState = {
    OURS: 1 << 0, // This outpoint is ours

    P2PKH: 1 << 1, // This is a P2PKH outpoint
    P2CS: 1 << 2, // This is a P2CS outpoint

    SPENT: 1 << 3, // This outpoint has been spent
    IMMATURE: 1 << 4, // Coinbase/coinstake that it's not mature (hence not spendable) yet
    LOCKED: 1 << 5, // Coins in the LOCK set
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

export class Mempool {
    /** @type{Map<string, number>} */
    #outpointStatus = new Map();

    /**
     * Maps txid -> Transaction
     * @type{Map<string, Transaction>}
     */
    #txmap = new Map();

    /**
     * balance cache, mapping filter -> balance
     * @type{Map<number, number>}
     */
    #balances = new Map();

    /**
     * Add a transaction to the mempool
     * And mark the input as spent.
     * @param {Transaction} tx
     */
    addTransaction(tx) {
        this.#txmap.set(tx.txid, tx);
        for (const input of tx.vin) {
            this.setSpent(input.outpoint);
        }
    }

    /**
     * @param {COutpoint} outpoint
     */
    getOutpointStatus(outpoint) {
        return this.#outpointStatus.get(outpoint.toUnique()) ?? 0;
    }

    /**
     * Sets outpoint status to `status`, overriding the old one
     * @param {COutpoint} outpoint
     * @param {number} status
     */
    setOutpointStatus(outpoint, status) {
        this.#outpointStatus.set(outpoint.toUnique(), status);
        this.#invalidateBalanceCache();
    }

    /**
     * Adds `status` to the outpoint status, keeping the old status
     * @param {COutpoint} outpoint
     * @param {number} status
     */
    addOutpointStatus(outpoint, status) {
        if (!outpoint.toUnique) {
            debugger;
        }
        const oldStatus = this.#outpointStatus.get(outpoint.toUnique());
        this.#outpointStatus.set(outpoint.toUnique(), oldStatus | status);
        this.#invalidateBalanceCache();
    }

    /**
     * Removes `status` to the outpoint status, keeping the old status
     * @param {COutpoint} outpoint
     * @param {number} status
     */
    removeOutpointStatus(outpoint, status) {
        const oldStatus = this.#outpointStatus.get(outpoint.toUnique());
        this.#outpointStatus.set(outpoint.toUnique(), oldStatus & ~status);
        this.#invalidateBalanceCache();
    }

    /**
     * Mark an outpoint as spent
     * @param {COutpoint} outpoint
     */
    setSpent(outpoint) {
        this.addOutpointStatus(outpoint, OutpointState.SPENT);
    }

    /**
     * @param {COutpoint} outpoint
     * @returns {boolean} whether or not the outpoint has been marked as spent
     */
    isSpent(outpoint) {
        return !!(this.getOutpointStatus(outpoint) & OutpointState.SPENT);
    }

    /**
     * Utility function to get the UTXO from an outpoint
     * @param {COutpoint} outpoint
     * @returns {UTXO?}
     */
    #outpointToUTXO(outpoint) {
        const tx = this.#txmap.get(outpoint.txid);
        if (!tx) return null;
        return new UTXO({
            outpoint,
            script: tx.vout[outpoint.n].script,
            value: tx.vout[outpoint.n].value,
        });
    }

    /**
     * Get the debit of a transaction in satoshi
     * @param {Transaction} tx
     */
    getDebit(tx) {
        return tx.vin
            .filter(
                (input) =>
                    this.getOutpointStatus(input.outpoint) & OutpointState.OURS
            )
            .map((i) => this.#outpointToUTXO(i.outpoint))
            .reduce((acc, u) => acc + (u?.value || 0), 0);
    }

    /**
     * Get the credit of a transaction in satoshi
     * @param {Transaction} tx
     */
    getCredit(tx) {
        const txid = tx.txid;
        return tx.vout
            .map(
                (_, i) =>
                    new COutpoint({
                        txid,
                        n: i,
                    })
            )
            .filter(
                (outpoint) =>
                    this.getOutpointStatus(outpoint) & OutpointState.OURS
            )
            .map((o) => this.#outpointToUTXO(o))
            .reduce((acc, u) => acc + u?.value ?? 0, 0);
    }

    /**
     * @param {{filter: number, target: number}}
     * @returns {UTXO[]} a list of unspent transaction outputs
     */
    getUTXOs({ filter, target = Number.POSITIVE_INFINITY }) {
        const utxos = [];
        let value = 0;
        for (const [o, status] of this.#outpointStatus) {
            const outpoint = COutpoint.fromUnique(o);
            if (!this.isSpent(outpoint) && status & filter) {
                utxos.push(this.#outpointToUTXO(outpoint));
                value += utxos.at(-1).value;
                if (value >= (target * 11) / 10) {
                    break;
                }
            }
        }
        return utxos;
    }

    /**
     * @param {number} filter
     */
    getBalance(filter) {
        if (this.#balances.has(filter)) {
            return this.#balances.get(filter);
        }
        const bal = Array.from(this.#outpointStatus)
            .filter(([_, status]) => !(status & OutpointState.SPENT))
            .filter(([_, status]) => status & filter)
            .reduce((acc, [o]) => {
                const outpoint = COutpoint.fromUnique(o);
                const tx = this.#txmap.get(outpoint.txid);
                return acc + tx.vout[outpoint.n].value;
            }, 0);
        this.#balances.set(filter, bal);
        return bal;
    }

    #invalidateBalanceCache() {
        this.#balances = new Map();

        // TODO: remove once staking page refactor
        getEventEmitter().emit('balance-update');
        //getStakingBalance(true);
    }

    /**
     * @returns {Transaction[]} a list of all transactions
     */
    getTransactions() {
        return Array.from(this.#txmap.values());
    }

    get balance() {
        return this.getBalance(OutpointState.P2PKH);
    }

    get coldBalance() {
        return this.getBalance(OutpointState.P2CS);
    }

    get immatureBalance() {
        return this.getBalance(OutpointState.IMMATURE);
    }
}
