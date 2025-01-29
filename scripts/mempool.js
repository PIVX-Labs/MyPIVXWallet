import { getEventEmitter } from './event_bus.js';
import { COutpoint, UTXO } from './transaction.js';

export const OutpointState = {
    OURS: 1 << 0, // This outpoint is ours

    P2PKH: 1 << 1, // This is a P2PKH outpoint
    P2CS: 1 << 2, // This is a P2CS outpoint

    SPENT: 1 << 3, // This outpoint has been spent
    LOCKED: 1 << 5, // Coins in the LOCK set
};

export class Mempool {
    /** @type{Map<string, number>} */
    #outpointStatus = new Map();

    /**
     * Maps txid -> Transaction
     * @type{Map<string, import('./transaction.js').Transaction>}
     */
    #txmap = new Map();

    /**
     * Object containing balances of the wallet
     */
    #balances = {
        balance: new CachableBalance(),
        coldBalance: new CachableBalance(),
        immatureBalance: new CachableBalance(),
        immatureColdBalance: new CachableBalance(),
    };

    /**
     * Add a transaction to the mempool
     * And mark the input as spent.
     * @param {import('./transaction.js').Transaction} tx
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
        this.invalidateBalanceCache();
    }

    /**
     * Adds `status` to the outpoint status, keeping the old status
     * @param {COutpoint} outpoint
     * @param {number} status
     */
    addOutpointStatus(outpoint, status) {
        const oldStatus = this.#outpointStatus.get(outpoint.toUnique());
        this.#outpointStatus.set(outpoint.toUnique(), oldStatus | status);
        this.invalidateBalanceCache();
    }

    /**
     * Removes `status` to the outpoint status, keeping the old status
     * @param {COutpoint} outpoint
     * @param {number} status
     */
    removeOutpointStatus(outpoint, status) {
        const oldStatus = this.#outpointStatus.get(outpoint.toUnique());
        this.#outpointStatus.set(outpoint.toUnique(), oldStatus & ~status);
        this.invalidateBalanceCache();
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
    outpointToUTXO(outpoint) {
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
     * @param {import('./transaction.js').Transaction} tx
     */
    getDebit(tx) {
        const filteredVin = tx.vin.filter(
            (input) =>
                this.getOutpointStatus(input.outpoint) & OutpointState.OURS
        );
        const debit = filteredVin
            .map((i) => this.outpointToUTXO(i.outpoint))
            .reduce((acc, u) => acc + (u?.value || 0), 0);
        const ownAllVin = tx.vin.length === filteredVin.length;
        return { debit, ownAllVin };
    }

    /**
     * Get the credit of a transaction in satoshi
     * @param {import('./transaction.js').Transaction} tx
     */
    getCredit(tx) {
        const txid = tx.txid;

        const filteredVout = tx.vout.filter(
            (_, i) =>
                this.getOutpointStatus(
                    new COutpoint({
                        txid,
                        n: i,
                    })
                ) & OutpointState.OURS
        );
        const credit = filteredVout.reduce((acc, u) => acc + u?.value ?? 0, 0);
        const ownAllVout = tx.vout.length === filteredVout.length;
        return {
            credit,
            ownAllVout,
        };
    }

    /**
     * Loop through the unspent balance of the wallet
     * @template T
     * @param {number} requirement - Requirement that outpoints must have
     * @param {T} initialValue - initial value of the result
     * @param {balanceIterator} fn
     * @returns {T}
     */
    loopSpendableBalance(requirement, initialValue, fn) {
        for (const tx of this.#txmap.values()) {
            for (const [index, vout] of tx.vout.entries()) {
                const status = this.getOutpointStatus(
                    new COutpoint({ txid: tx.txid, n: index })
                );
                if (status & (OutpointState.SPENT | OutpointState.LOCKED)) {
                    continue;
                }
                if ((status & requirement) === requirement) {
                    initialValue = fn(tx, vout, initialValue);
                }
            }
        }
        return initialValue;
    }

    /**
     * @param {object} o - options
     * @param {number} [o.requirement] - A requirement to apply to all UTXOs. For example
     * `OutpointState.P2CS` will only return P2CS transactions.
     * @param {number} [o.target] - Number of satoshis needed. The method will return early when the value of the UTXOs has been reached, plus a bit to account for change
     * By default it's MAX_SAFE_INTEGER
     * @param {boolean} [o.includeImmature] - If set to true immature UTXOs will be included
     * @param {number} [o.blockCount] - Current number of blocks
     * @returns {UTXO[]} a list of unspent transaction outputs
     */
    getUTXOs({
        requirement = 0,
        includeImmature = false,
        target = Number.POSITIVE_INFINITY,
        blockCount,
    } = {}) {
        return this.loopSpendableBalance(
            requirement,
            { utxos: [], bal: 0 },
            (tx, vout, currentValue) => {
                if (
                    (!includeImmature && tx.isImmature(blockCount)) ||
                    (currentValue.bal >= (target * 11) / 10 &&
                        currentValue.bal > 0)
                ) {
                    return currentValue;
                }
                const n = tx.vout.findIndex((element) => element === vout);
                currentValue.utxos.push(
                    new UTXO({
                        outpoint: new COutpoint({ txid: tx.txid, n }),
                        script: vout.script,
                        value: vout.value,
                    })
                );
                currentValue.bal += vout.value;
                return currentValue;
            }
        ).utxos;
    }

    #balanceInternal(requirement, blockCount, includeImmature = false) {
        return this.loopSpendableBalance(
            requirement,
            0,
            (tx, vout, currentValue) => {
                if (!tx.isImmature(blockCount)) {
                    return currentValue + vout.value;
                } else if (includeImmature) {
                    return currentValue + vout.value;
                }
                return currentValue;
            }
        );
    }

    invalidateBalanceCache() {
        this.#balances.immatureBalance.invalidate();
        this.#balances.balance.invalidate();
        this.#balances.coldBalance.invalidate();
        getEventEmitter().emit('balance-update');
    }

    /**
     * @returns {import('./transaction.js').Transaction[]} a list of all transactions
     */
    getTransactions() {
        return Array.from(this.#txmap.values());
    }

    /**
     * @param {string} txid - transaction id
     * @returns {import('./transaction.js').Transaction | undefined}
     */
    getTransaction(txid) {
        return this.#txmap.get(txid);
    }

    /**
     * @param blockCount - chain height
     */
    getBalance(blockCount) {
        return this.#balances.balance.getOrUpdateInvalid(() => {
            return this.#balanceInternal(
                OutpointState.OURS | OutpointState.P2PKH,
                blockCount
            );
        });
    }

    /**
     * @param blockCount - chain height
     */
    getColdBalance(blockCount) {
        return this.#balances.coldBalance.getOrUpdateInvalid(() => {
            return this.#balanceInternal(
                OutpointState.OURS | OutpointState.P2CS,
                blockCount
            );
        });
    }

    /**
     * @param blockCount - chain height
     */
    getImmatureBalance(blockCount) {
        return this.#balances.immatureBalance.getOrUpdateInvalid(() => {
            return (
                this.#balanceInternal(OutpointState.OURS, blockCount, true) -
                this.getBalance(blockCount) -
                this.getColdBalance(blockCount)
            );
        });
    }

    /**
     * @param {number} blockCount - chain height
     * @returns {number} immature cold stake balance
     */
    getImmatureColdBalance(blockCount) {
        return this.#balances.immatureColdBalance.getOrUpdateInvalid(() => {
            return (
                this.#balanceInternal(
                    OutpointState.OURS | OutpointState.P2CS,
                    blockCount,
                    true
                ) - this.getColdBalance()
            );
        });
    }
}

class CachableBalance {
    /**
     * @type {number}
     * represents a cachable balance
     */
    value = -1;

    isValid() {
        return this.value !== -1;
    }
    invalidate() {
        this.value = -1;
    }

    /**
     * Return the cached balance if it's valid, or re-compute and return.
     * @param {Function} fn - function with which calculate the balance
     * @returns {number} cached balance
     */
    getOrUpdateInvalid(fn) {
        if (!this.isValid()) {
            this.value = fn();
        }
        return this.value;
    }
}

/**
 * @template T
 * @typedef {Function} balanceIterator
 * @param {import('./transaction.js').Transaction} tx
 * @param {CTxOut} vout
 * @param {T} currentValue - the current value iterated
 * @returns {number} amount
 */
