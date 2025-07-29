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
                shieldOutput: [],
            })
        );
        // Subsequent builds must return null
        expect(txBuilder.build()).toBe(null);
    });

    it('builds an exchange tx correctly', () => {
        const tx = TransactionBuilder.create()
            .addOutput({
                address: 'EXMDbnWT4K3nWfK1311otFrnYLcFSipp3iez',
                value: 1,
            })
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
            .build();
        expect(tx).toStrictEqual(
            new Transaction({
                vin: [
                    new CTxIn({
                        outpoint: new COutpoint({
                            txid: 'abcd',
                            n: 4,
                        }),
                        scriptSig: 'script1',
                    }),
                ],
                vout: [
                    new CTxOut({
                        script: 'e076a9141c62aa5fb5bc8a4932491fcfc1832fb5422e0cd288ac',
                        value: 1,
                    }),
                ],
            })
        );
    });

    it('builds a s->s transaction correctly', () => {
        const tx = TransactionBuilder.create()
            .addOutput({
                address:
                    'ps1kw7d704cpvy4f5e5usk3xhykytxnjfk872fpty7ct6znvmdepsxq4s90p9a3arg0qg8tzjk7vkn',
                value: 1000,
                memo: 'Super secret memo',
            })
            .build();
        expect(tx).toStrictEqual(
            new Transaction({
                version: 3,
                shieldOutput: [
                    {
                        address:
                            'ps1kw7d704cpvy4f5e5usk3xhykytxnjfk872fpty7ct6znvmdepsxq4s90p9a3arg0qg8tzjk7vkn',
                        value: 1000,
                        memo: 'Super secret memo',
                    },
                ],
            })
        );
    });

    it('builds a s->t transaction correctly', () => {
        const tx = TransactionBuilder.create()
            .addOutput({
                address: 'DLabsktzGMnsK5K9uRTMCF6NoYNY6ET4Bb',
                value: 3,
            })
            .build();
        expect(tx).toStrictEqual(
            new Transaction({
                version: 3, // The important thing here is version=3
                vout: [
                    new CTxOut({
                        script: '76a914a95cc6408a676232d61ec29dc56a180b5847835788ac',
                        value: 3,
                    }),
                ],
            })
        );
    });

    it('builds a t->s transaction correctly', () => {
        const tx = TransactionBuilder.create()
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
            .addOutput({
                address:
                    'ps1kw7d704cpvy4f5e5usk3xhykytxnjfk872fpty7ct6znvmdepsxq4s90p9a3arg0qg8tzjk7vkn',
                value: 1000,
            })
            .build();
        expect(tx).toStrictEqual(
            new Transaction({
                version: 3,
                shieldOutput: [
                    {
                        address:
                            'ps1kw7d704cpvy4f5e5usk3xhykytxnjfk872fpty7ct6znvmdepsxq4s90p9a3arg0qg8tzjk7vkn',
                        value: 1000,
                        memo: '',
                    },
                ],
                vin: [
                    new CTxIn({
                        outpoint: new COutpoint({
                            txid: 'abcd',
                            n: 4,
                        }),
                        scriptSig: 'script1',
                    }),
                ],
            })
        );
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
