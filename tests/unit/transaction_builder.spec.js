import { describe, it } from 'vitest';
import {
    COutpoint,
    CTxIn,
    CTxOut,
    Transaction,
    UTXO,
} from '../../scripts/transaction.js';
import { TransactionBuilder } from '../../scripts/transaction_builder.js';

describe('Transaction builder tests', () => {
    it('Builds a transaction correctly', () => {
        const txBuilder = TransactionBuilder.create()
            .addUTXO(
                new UTXO({
                    outpoint: new COutpoint({
                        txid: 'abcd',
                        n: 4,
                    }),
                    script: 'script1',
                    value: 5,
                })
            )
            .addUTXOs([
                new UTXO({
                    outpoint: new COutpoint({
                        txid: 'fgea',
                        n: 2,
                    }),
                    script: 'script2',
                    value: 6,
                }),
            ])
            .addOutputs([
                {
                    address: 'DLabsktzGMnsK5K9uRTMCF6NoYNY6ET4Bb',
                    value: 3,
                },
                {
                    address: 'DShxa9sykpVUYBe2VKZfq9dzE8f2yBbtmg',
                    value: 8,
                },
            ]);
        expect(txBuilder.valueIn).toBe(5 + 6);
        expect(txBuilder.valueOut).toBe(3 + 8);
        expect(txBuilder.value).toBe(5 + 6 - 3 - 8);
        const tx = txBuilder.build();
        expect(tx).toStrictEqual(
            new Transaction({
                version: 1,
                blockHeight: -1,
                vin: [
                    new CTxIn({
                        outpoint: new COutpoint({
                            txid: 'abcd',
                            n: 4,
                        }),
                        scriptSig: 'script1',
                    }),
                    new CTxIn({
                        outpoint: new COutpoint({
                            txid: 'fgea',
                            n: 2,
                        }),
                        scriptSig: 'script2',
                    }),
                ],
                vout: [
                    new CTxOut({
                        script: '76a914a95cc6408a676232d61ec29dc56a180b5847835788ac',
                        value: 3,
                    }),
                    new CTxOut({
                        script: '76a914ec91b7a8809f5ff50439ad5c8186131cfc36ea4c88ac',
                        value: 8,
                    }),
                ],
                blockTime: -1,
                lockTime: 0,
                shieldData: [],
            })
        );
        // Subsequent builds must return null
        expect(txBuilder.build()).toBe(null);
    });
    it('throws when address is invalid', () => {
        const txBuilder = TransactionBuilder.create();
        expect(() =>
            txBuilder.addOutput({
                address: 'DLabsktzGMnsK5K9uRTMCF6NoYNY6ET4Bc',
                value: 5,
            })
        ).toThrow(/address/);
    });
});
