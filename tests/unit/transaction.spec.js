import { describe, it } from 'vitest';
import {
    Transaction,
    CTxIn,
    CTxOut,
    COutpoint,
} from '../../scripts/transaction.js';
import { dSHA256 } from '../../scripts/utils';
import { bytesToHex } from '@noble/hashes/utils';

describe('transaction tests', () => {
    function getDummyTx() {
        const tx = new Transaction();
        tx.version = 1;
        tx.vin = [
            new CTxIn({
                outpoint: new COutpoint({
                    txid: 'f8f968d80ac382a7b64591cc166489f66b7c4422f95fbd89f946a5041d285d7c',
                    n: 1,
                }),
                scriptSig:
                    '483045022100a4eac56caaf3700c4f53822fbb858256f3a5c154d268f416ade685de3fe61de202206fb38cfe8fd4faf8b14dc7ac0799c4acfd50a81c4d93509ebd6fb0bca3bb8a7a0121035b57e0afed95b86ad3ccafb9a8c752dc173cea16274cf9dd9b7a43364d36cf38',
            }),
        ];
        tx.vout = [
            new CTxOut({
                outpoint: null, // Outpoint not needed for serialization
                script: '76a914f49b25384b79685227be5418f779b98a6be4c73888ac',
                value: 0.049924 * 10 ** 8,
            }),
            new CTxOut({
                outpoint: null, // Outpoint not needed for serialization
                script: '76a914a95cc6408a676232d61ec29dc56a180b5847835788ac',
                value: 0.05 * 10 ** 8,
            }),
        ];
        return tx;
    }
    function getDummyTxid() {
        return '9cf01cffc85d53b80a9c7ca106fc7326efa0f4f1db3eaf5be0ac45eb6105b8ab';
    }
    function getDummyTxHex() {
        return '01000000017c5d281d04a546f989bd5ff922447c6bf6896416cc9145b6a782c30ad868f9f8010000006b483045022100a4eac56caaf3700c4f53822fbb858256f3a5c154d268f416ade685de3fe61de202206fb38cfe8fd4faf8b14dc7ac0799c4acfd50a81c4d93509ebd6fb0bca3bb8a7a0121035b57e0afed95b86ad3ccafb9a8c752dc173cea16274cf9dd9b7a43364d36cf38ffffffff02902d4c00000000001976a914f49b25384b79685227be5418f779b98a6be4c73888ac404b4c00000000001976a914a95cc6408a676232d61ec29dc56a180b5847835788ac00000000';
    }
    it('serializes correctly', () => {
        const tx = getDummyTx();
        expect(tx.serialize()).toBe(getDummyTxHex());
        expect(tx.txid).toBe(getDummyTxid());
    });

    it('deserializes correctly', () => {
        const tx = Transaction.fromHex(getDummyTxHex());
        expect(tx).toStrictEqual(getDummyTx());
    });

    it('computes sighash correctly', () => {
        const tx = getDummyTx();
        //expect(tx.transactionHash(0)).toBe('642bd7df1ddd9998afb2826200754a586acc72ce6229c48b40d392eb1b7281b1');
    });

    it('signs correctly', async () => {
        const tx = getDummyTx();
        tx.vin[0].scriptSig =
            '76a914f49b25384b79685227be5418f779b98a6be4c73888ac';
        const wif = 'YU12G8Y9LwC3wb2cwUXvvg1iMvBey1ibCF23WBAapCuaKhd6a4R6';
        await tx.signInput(0, wif);
        expect(tx.vin[0].scriptSig).toBe(getDummyTx().vin[0].scriptSig);
    });
});
