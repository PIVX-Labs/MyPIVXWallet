import { it, describe, beforeEach, expect, vi } from 'vitest';

import {
    Transaction,
    CTxOut,
    COutpoint,
    UTXO,
    CTxIn,
} from '../../scripts/transaction.js';
import { Mempool, OutpointState } from '../../scripts/mempool.js';

describe('mempool tests', () => {
    /** @type{Mempool} */
    let mempool;
    let tx;
    let txBlockHeight = 1000;
    beforeEach(() => {
        mempool = new Mempool();
        tx = new Transaction({
            version: 1,
            vin: [],
            vout: [
                new CTxOut({
                    script: '76a914f49b25384b79685227be5418f779b98a6be4c73888ac',
                    value: 4992400,
                }),
                new CTxOut({
                    script: '76a914a95cc6408a676232d61ec29dc56a180b5847835788ac',
                    value: 5000000,
                }),
            ],
            blockHeight: txBlockHeight,
        });
        mempool.addTransaction(tx);
        mempool.setOutpointStatus(
            new COutpoint({ txid: tx.txid, n: 0 }),
            OutpointState.OURS | OutpointState.P2PKH
        );
        mempool.setOutpointStatus(
            new COutpoint({ txid: tx.txid, n: 1 }),
            OutpointState.OURS | OutpointState.P2PKH
        );
    });
    it('gets UTXOs correctly', () => {
        let expectedUTXOs = [
            new UTXO({
                outpoint: new COutpoint({ txid: tx.txid, n: 0 }),
                script: '76a914f49b25384b79685227be5418f779b98a6be4c73888ac',
                value: 4992400,
            }),
            new UTXO({
                outpoint: new COutpoint({ txid: tx.txid, n: 1 }),
                script: '76a914a95cc6408a676232d61ec29dc56a180b5847835788ac',
                value: 5000000,
            }),
        ];

        // By default, it should return all UTXOs
        expect(mempool.getUTXOs()).toStrictEqual(expectedUTXOs);

        // With target, should only return the first one
        expect(
            mempool.getUTXOs({
                target: 4000000,
            })
        ).toStrictEqual([expectedUTXOs[0]]);

        mempool.setSpent(new COutpoint({ txid: tx.txid, n: 0 }));
        // After spending one UTXO, it should not return it again
        expect(mempool.getUTXOs()).toStrictEqual([expectedUTXOs[1]]);
        mempool.setSpent(new COutpoint({ txid: tx.txid, n: 1 }));
        expect(mempool.getUTXOs()).toHaveLength(0);

        [0, 1].forEach((n) =>
            mempool.removeOutpointStatus(
                new COutpoint({ txid: tx.txid, n }),
                OutpointState.SPENT
            )
        );
        mempool.addOutpointStatus(
            new COutpoint({ txid: tx.txid, n: 1 }),
            OutpointState.LOCKED
        );
        // any LOCKED UTXOs is removed
        expect(mempool.getUTXOs()).toStrictEqual([expectedUTXOs[0]]);
    });

    it('gets correct balance', () => {
        const confirmedHeight = txBlockHeight + 100;
        expect(mempool.getBalance(confirmedHeight)).toBe(4992400 + 5000000);
        // Subsequent calls should be cached
        expect(mempool.getBalance(confirmedHeight)).toBe(4992400 + 5000000);
        expect(mempool.getColdBalance(confirmedHeight)).toBe(0);
        expect(mempool.getImmatureBalance(confirmedHeight)).toBe(0);

        mempool.setSpent(new COutpoint({ txid: tx.txid, n: 0 }));
        expect(mempool.getBalance(confirmedHeight)).toBe(5000000);
        mempool.setSpent(new COutpoint({ txid: tx.txid, n: 1 }));
        expect(mempool.getBalance(confirmedHeight)).toBe(0);
    });

    it('gives correct debit', () => {
        const spendTx = new Transaction({
            version: 1,
            vin: [
                new CTxIn({
                    scriptSig: 'dummy',
                    outpoint: new COutpoint({
                        txid: tx.txid,
                        n: 1,
                    }),
                }),
                new CTxIn({
                    scriptSig: 'dummy',
                    outpoint: new COutpoint({
                        txid: tx.txid,
                        n: 0,
                    }),
                }),
            ],
            vout: [],
        });
        mempool.addTransaction(spendTx);
        expect(mempool.getDebit(spendTx)).toBe(5000000 + 4992400);

        expect(mempool.getDebit(new Transaction())).toBe(0);
    });

    it('gives correct credit', () => {
        expect(mempool.getCredit(tx)).toBe(5000000 + 4992400);

        // Result should stay the same even if the UTXOs are spent
        mempool.setSpent(new COutpoint({ txid: tx.txid, n: 1 }));
        expect(mempool.getCredit(tx)).toBe(5000000 + 4992400);
        mempool.setSpent(new COutpoint({ txid: tx.txid, n: 0 }));
        expect(mempool.getCredit(tx)).toBe(5000000 + 4992400);
        expect(mempool.getCredit(new Transaction())).toBe(0);
    });

    it('marks outpoint as spent correctly', () => {
        const o = [0, 1].map((n) => new COutpoint({ txid: tx.txid, n }));
        expect(o.map((out) => mempool.isSpent(out))).toStrictEqual([
            false,
            false,
        ]);
        mempool.setSpent(o[0]);
        expect(o.map((out) => mempool.isSpent(out))).toStrictEqual([
            true,
            false,
        ]);
        mempool.setSpent(o[1]);
        expect(o.map((out) => mempool.isSpent(out))).toStrictEqual([
            true,
            true,
        ]);
    });

    it('returns transactions', () => {
        expect(mempool.getTransactions()).toStrictEqual([tx]);
    });

    it('correctly handles statuses', () => {
        const o = new COutpoint({ txid: tx.txid, n: 0 });
        expect(mempool.getOutpointStatus(o)).toBe(
            OutpointState.P2PKH | OutpointState.OURS
        );
        // Remove removes one status
        mempool.removeOutpointStatus(o, OutpointState.P2PKH);
        expect(mempool.getOutpointStatus(o)).toBe(OutpointState.OURS);
        mempool.addOutpointStatus(o, OutpointState.P2CS);
        expect(mempool.getOutpointStatus(o)).toBe(
            OutpointState.P2CS | OutpointState.OURS
        );
        // Adding 0 should do nothing
        mempool.addOutpointStatus(o, 0);
        expect(mempool.getOutpointStatus(o)).toBe(
            OutpointState.P2CS | OutpointState.OURS
        );
        // Removing 0 should do nothing
        mempool.removeOutpointStatus(o, 0);
        expect(mempool.getOutpointStatus(o)).toBe(
            OutpointState.P2CS | OutpointState.OURS
        );
        // Set should override the status
        mempool.setOutpointStatus(o, OutpointState.SPENT);
        expect(mempool.getOutpointStatus(o)).toBe(OutpointState.SPENT);
        // Add should work with multiple flags
        mempool.addOutpointStatus(o, OutpointState.P2CS | OutpointState.OURS);
        expect(mempool.getOutpointStatus(o)).toBe(
            OutpointState.P2CS | OutpointState.SPENT | OutpointState.OURS
        );
        // Adding an already set flag should do nothing
        mempool.addOutpointStatus(o, OutpointState.SPENT);
        expect(mempool.getOutpointStatus(o)).toBe(
            OutpointState.P2CS | OutpointState.SPENT | OutpointState.OURS
        );
        // Remove should work with multiple flags
        mempool.removeOutpointStatus(
            o,
            OutpointState.LOCKED | OutpointState.P2CS | OutpointState.SPENT
        );
        expect(mempool.getOutpointStatus(o)).toBe(OutpointState.OURS);
        // Removing a non set flag should do nothing
        mempool.removeOutpointStatus(o, OutpointState.LOCKED);
        expect(mempool.getOutpointStatus(o)).toBe(OutpointState.OURS);
        // Removing MAX_SAFE_INTEGER should remove everything
        mempool.removeOutpointStatus(o, Number.MAX_SAFE_INTEGER);
        expect(mempool.getOutpointStatus(o)).toBe(0);
    });
});
