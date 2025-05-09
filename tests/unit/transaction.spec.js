import { describe, it, test, vi, beforeAll, expect } from 'vitest';
import {
    Transaction,
    CTxIn,
    CTxOut,
    COutpoint,
} from '../../scripts/transaction.js';
import { hexToBytes } from '../../scripts/utils.js';
import testVectorRaw from './transaction.test.json';
import * as encoding from '../../scripts/encoding.js';

const testVector = testVectorRaw.map(([tx, txid, hex, wif]) => [
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
            '69f75c046610514156fdd816ed562ba8a9f1578008740c0cbd752254a9767d2c'
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

describe('COutpoint tests', () => {
    it.each([
        new COutpoint({
            txid: 'c463e9484973e085fac81763f4ba882dad961885890edd02be55b94aa291a739',
            n: 123,
        }),
        new COutpoint({
            txid: '25ffc9a52fe7f4b7b0865d6f5db7aefd17871971ef09fabafe519ceef2174c89',
            n: 0,
        }),
        new COutpoint({
            txid: 'aab36ff5f222ef56f569b5c84d335f522339db8755e5eeae0cee5a447126a9d6',
            n: 1,
        }),
        new COutpoint({
            txid: 'b067b802d4cc673ebf0f124fe4d2304ca5ca7d733fde573011ed29a90dee8e39',
            n: 13,
        }),
        new COutpoint({
            txid: '5be92981ac013a819bd4490aa2f64ef45e4eb0f48abb9e6ed0d5a6cfbf4965f8',
            n: 19348113,
        }),
    ])('converts from and to unique', (outpoint) => {
        const unique = outpoint.toUnique();
        expect(COutpoint.fromUnique(unique)).toStrictEqual(outpoint);
    });
});
