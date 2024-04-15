import { getEventEmitter } from './event_bus.js';
import { COutpoint, UTXO } from './transaction.js';

export const OutpointState = {
    OURS: 1 << 0, // This outpoint is ours

    P2PKH: 1 << 1, // This is a P2PKH outpoint
    P2CS: 1 << 2, // This is a P2CS outpoint

    SPENT: 1 << 3, // This outpoint has been spent
    IMMATURE: 1 << 4, // Coinbase/coinstake that it's not mature (hence not spendable) yet
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
     * balance cache, mapping filter -> balance
     * @type{Map<number, number>}
     */
    #balances = new Map();

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
     * Return owned vin of a given transaction
     * @param {import('./transaction.js').Transaction} tx
     * @returns {UTXO[]} List of UTXO corresponding to the owned vin
     */
    getOwnedVin(tx) {
        return tx.vin
            .filter(
                (input) =>
                    this.getOutpointStatus(input.outpoint) & OutpointState.OURS
            )
            .map((i) => this.outpointToUTXO(i.outpoint));
    }
    /**
     * Return owned vout of a given transaction
     * @param {import('./transaction.js').Transaction} tx
     * @returns {CTxOut[]} List of UTXO corresponding to the owned vin
     */
    getOwnedVout(tx) {
        const txid = tx.txid;
        return tx.vout.filter(
            (_, i) =>
                this.getOutpointStatus(
                    new COutpoint({
                        txid,
                        n: i,
                    })
                ) & OutpointState.OURS
        );
    }
    /**
     * Check if we own any transparent input our output of a given transaction
     * @param {import('./transaction.js').Transaction} tx
     * @returns {boolean} whether we own at least a input or an output of the tx
     */
    ownTransaction(tx) {
        return (
            this.getOwnedVout(tx).length !== 0 ||
            this.getOwnedVin(tx).length !== 0
        );
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
        return this.getOwnedVin(tx).reduce(
            (acc, u) => acc + (u?.value || 0),
            0
        );
    }

    /**
     * Get the credit of a transaction in satoshi
     * @param {import('./transaction.js').Transaction} tx
     */
    getCredit(tx) {
        return this.getOwnedVout(tx).reduce((acc, u) => acc + u?.value ?? 0, 0);
    }

    /**
     * @param {object} o - options
     * @param {number} [o.filter] - A filter to apply to all UTXOs. For example
     * `OutpointState.P2CS` will NOT return P2CS transactions.
     * By default it's `OutpointState.SPENT | OutpointState.IMMATURE | OutpointState.LOCKED`
     * @param {number} [o.requirement] - A requirement to apply to all UTXOs. For example
     * `OutpointState.P2CS` will only return P2CS transactions.
     * By default it's MAX_SAFE_INTEGER
     * @returns {UTXO[]} a list of unspent transaction outputs
     */
    getUTXOs({
        filter = OutpointState.SPENT |
            OutpointState.IMMATURE |
            OutpointState.LOCKED,
        requirement = 0,
        target = Number.POSITIVE_INFINITY,
    } = {}) {
        const utxos = [];
        let value = 0;
        for (const [o, status] of this.#outpointStatus) {
            const outpoint = COutpoint.fromUnique(o);
            if (status & filter) {
                continue;
            }
            if ((status & requirement) !== requirement) {
                continue;
            }
            utxos.push(this.outpointToUTXO(outpoint));
            value += utxos.at(-1).value;
            if (value >= (target * 11) / 10) {
                break;
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
        this.#emitBalanceUpdate();
    }

    #emittingBalanceUpdate = false;

    #emitBalanceUpdate() {
        if (this.#emittingBalanceUpdate) return;
        this.#emittingBalanceUpdate = true;
        // TODO: This is not ideal, we are limiting the mempool to only emit 1 balance-update per frame,
        // but we don't want the mempool to know about animation frames. This is needed during
        // sync to avoid spamming balance-updates and slowing down the sync.
        // The best course of action is to probably add a loading page/state and avoid
        // listening to the balance-update event until the sync is done
        requestAnimationFrame(() => {
            getEventEmitter().emit('balance-update');
            this.#emittingBalanceUpdate = false;
        });
    }

    /**
     * @returns {import('./transaction.js').Transaction[]} a list of all transactions
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
