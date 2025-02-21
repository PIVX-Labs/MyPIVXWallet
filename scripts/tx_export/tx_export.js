/**
 * Abstract class for exporting Txs
 */
export class TxExport {
    /**
     * @type{import('../historical_tx.js').HistoricalTx[]} transactions
     */
    transactions = [];

    /**
     * @param{import('../historical_tx.js').HistoricalTx[]} transactions
     */
    constructor(transactions) {
        if (new.target === TxExport) {
            throw new Error('Cannot instantiate an abstract class');
        }
        this.transactions = transactions;
    }

    /**
     * @param {string[][]} array
     */
    arrayToCsv(array) {
        return array.map((a) => a.join(',')).join('\n');
    }

    /**
     * @returns {string} csv encoded export
     */
    getCsv() {
        throw new Error('getCsv not implemented');
    }
}
