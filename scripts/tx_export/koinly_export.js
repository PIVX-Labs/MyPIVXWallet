import { TxExport } from './tx_export.js';
import { HistoricalTxType } from '../historical_tx.js';

export class KoinlyExport extends TxExport {
    getCsv() {
        const res = [['Koinly Date', 'Amount', 'Currency', 'Label', 'TxHash']];
        this.transactions.forEach((t) => {
            const type = this.getLabel(t.type);
            if (type !== 'SKIP')
                res.push([
                    this.convertToUTCDateTime(t.time * 1000),
                    t.amount,
                    'PIVX',
                    this.getLabel(t.type),
                    t.id,
                ]);
        });
        return this.arrayToCsv(res);
    }

    getLabel(type) {
        switch (type) {
            case HistoricalTxType.STAKE:
                return 'REWARD';
            case HistoricalTxType.DELEGATION:
            case HistoricalTxType.UNDELEGATION:
                return 'SKIP';
            case HistoricalTxType.SENT:
            case HistoricalTxType.PROPOSAL_FEE:
                return 'Send';
            case HistoricalTxType.RECEIVED:
                return 'Income';
            case HistoricalTxType.UNKNOWN:
            default:
                return 'UNKNOWN';
        }
    }

    convertToUTCDateTime(time) {
        const date = new Date(time);
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        const hours = String(date.getUTCHours()).padStart(2, '0');
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes} UTC`;
    }
}
