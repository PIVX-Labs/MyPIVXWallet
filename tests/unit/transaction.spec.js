import { describe, it, test, vi, beforeAll, expect } from 'vitest';
import {
    Transaction,
    CTxIn,
    CTxOut,
    COutpoint,
} from '../../scripts/transaction.js';
import { hexToBytes } from '../../scripts/utils.js';
import testVector from './transaction.test.json';
import * as encoding from '../../scripts/encoding.js';

testVector = testVector.map(([tx, txid, hex, wif]) => [
    new Transaction({
        version: tx.version,
        vin: tx.vin.map(
            (input) =>
                new CTxIn({
                    outpoint: new COutpoint({
                        txid: input.outpoint.txid,
                        n: input.outpoint.n,
                    }),
                    scriptSig: input.scriptSig,
                    sequence: input.sequence,
                })
        ),
        vout: tx.vout.map(
            (output) =>
                new CTxOut({
                    script: output.script,
                    value: output.value,
                })
        ),
        valueBalance: tx.valueBalance,
        shieldSpend: tx.shieldSpend,
        shieldOutput: tx.shieldOutput,
        shieldData: Array.from(hexToBytes(tx.shieldData ?? '')),
        bindingSig: tx.bindingSig,
        lockTime: tx.lockTime,
    }),
    txid,
    hex,
    wif,
]);

describe('transaction tests', () => {
    beforeAll(() => {
        const oldParseWIF = encoding.parseWIF;
        // Make parseWIF skip verification, we don't care about that here
        vi.spyOn(encoding, 'parseWIF').mockImplementation((strWIF) =>
            oldParseWIF(strWIF, true)
        );
        return vi.restoreAllMocks;
    });
    test('Coinstake/Coinbase detection work', () => {
        expect(testVector.map(([t]) => t.isCoinBase())).toStrictEqual([
            false,
            false,
            false,
            true,
            false,
            false,
            false,
            false,
            false,
        ]);
        expect(testVector.map(([t]) => t.isCoinStake())).toStrictEqual([
            false,
            false,
            true,
            false,
            false,
            false,
            false,
            false,
            false,
        ]);
    });
    it.each(testVector)('serializes correctly ($txid)', (tx, txid, hex) => {
        expect(tx.serialize()).toBe(hex);
        expect(tx.txid).toBe(txid);
    });
    it.each(testVector)('deserializes correctly ($txid)', (tx, _, hex) => {
        const ourTx = Transaction.fromHex(hex);
        expect(ourTx).toStrictEqual(tx);
    });

    it.sequential('updates txid when a property changes', () => {
        const [tx, txid] = testVector[0];
        const originalVersion = tx.version;
        expect(tx.txid).toBe(txid);
        tx.version = 10;
        expect(tx.txid).not.toBe(txid);
        expect(tx.txid).toBe(
            '416368b2101fab865db162d49d0540560f802e89801cad8eb1d9cf3a4e6ad5be'
        );
        tx.version = originalVersion;
    });

    it.each(testVector.filter((t) => t[3]))(
        'signs correctly ($txid)',
        async (tx, _, hex, inputs) => {
            for (let i = 0; i < inputs.length; i++) {
                const script = inputs[i][1];
                tx.vin[i].scriptSig = script;
            }
            for (let i = 0; i < inputs.length; i++) {
                const wif = inputs[i][0];
                const isColdStake = !!inputs[i][2];
                await tx.signInput(i, wif, { isColdStake });
            }
            expect(tx.serialize()).toBe(hex);
        }
    );
});
