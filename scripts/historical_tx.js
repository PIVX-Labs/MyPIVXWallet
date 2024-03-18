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
