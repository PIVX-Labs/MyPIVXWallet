/**
 * A historical transaction
 */
export class HistoricalTx {
    /**
     * @param {HistoricalTxType} type - The type of transaction.
     * @param {string} id - The transaction ID.
     * @param {Array<string>} receivers - The list of 'output addresses'.
     * @param {Array<{recipient: string, memo: string}>} shieldReceivers - The list of decrypted 'shield output addresses'.
     * @param {number} time - The block time of the transaction.
     * @param {number} blockHeight - The block height of the transaction.
     * @param {number} amount - The transparent amount transacted, in coins.
     * @param {number} shieldAmount - The shielded amount transacted, in coins.
     * @param {boolean} isToSelf - If the transaction is to self.
     * @param {boolean} isConfirmed - Whether the transaction has been confirmed.
     */
    constructor(
        type,
        id,
        receivers,
        shieldReceivers,
        time,
        blockHeight,
        amount,
        shieldAmount,
        isToSelf
    ) {
        this.type = type;
        this.id = id;
        this.receivers = receivers;
        this.shieldReceivers = shieldReceivers;
        this.time = time;
        this.blockHeight = blockHeight;
        this.amount = amount;
        this.shieldAmount = shieldAmount;
        this.isToSelf = isToSelf;
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
    PROPOSAL_FEE: 6,
};
