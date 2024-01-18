import { Wallet } from '../../scripts/wallet.js';
import { getLegacyMainnet } from './test_utils';
import { describe, it, vi, afterAll, expect } from 'vitest';
import {
    COutpoint,
    CTxIn,
    CTxOut,
    UTXO,
    Transaction,
} from '../../scripts/transaction.js';
import { mempool } from '../../scripts/global';
import { hexToBytes } from '../../scripts/utils';

vi.mock('../../scripts/global.js', (g) => {
    const Mempool = vi.fn();

    Mempool.prototype.reset = vi.fn();
    Mempool.prototype.balance = 0.1 * 10 ** 8;
    Mempool.prototype.coldBalance = 0;
    Mempool.prototype.isSpent = vi.fn(() => false);
    Mempool.prototype.addToOrderedTxMap = vi.fn();
    Mempool.prototype.setSpent = vi.fn();
    Mempool.prototype.updateMempool = vi.fn();
    Mempool.prototype.setBalance = vi.fn();
    Mempool.prototype.getUTXOs = vi.fn(() => [
        new UTXO({
            outpoint: new COutpoint({
                txid: 'f8f968d80ac382a7b64591cc166489f66b7c4422f95fbd89f946a5041d285d7c',
                n: 1,
            }),
            script: '76a914f49b25384b79685227be5418f779b98a6be4c73888ac',
            value: 0.1 * 10 ** 8,
        }),
    ]);
    return {
        mempool: new Mempool(),
    };
});

vi.mock('../../scripts/network.js', () => {
    return {
        getNetwork: vi.fn(() => {
            return {
                cachedBlockCount: 1504903,
                reset: vi.fn(),
                setWallet: vi.fn(),
            };
        }),
    };
});
describe('Wallet transaction tests', () => {
    it('Creates a transaction correctly', async () => {
        const wallet = new Wallet(0, false);
        wallet.setMasterKey(getLegacyMainnet());
        const tx = wallet.createTransaction(
            'DLabsktzGMnsK5K9uRTMCF6NoYNY6ET4Bb',
            0.05 * 10 ** 8
        );
        expect(tx.version).toBe(1);
        expect(tx.vin[0]).toStrictEqual(
            new CTxIn({
                outpoint: new COutpoint({
                    txid: 'f8f968d80ac382a7b64591cc166489f66b7c4422f95fbd89f946a5041d285d7c',
                    n: 1,
                }),
                scriptSig: '76a914f49b25384b79685227be5418f779b98a6be4c73888ac', // Script sig must be the UTXO script since it's not signed
            })
        );
        expect(tx.vout[0]).toStrictEqual(
            new CTxOut({
                script: '76a914f49b25384b79685227be5418f779b98a6be4c73888ac',
                value: 4992400,
            })
        );
        expect(tx.vout[1]).toStrictEqual(
            new CTxOut({
                script: '76a914a95cc6408a676232d61ec29dc56a180b5847835788ac',
                value: 5000000,
            })
        );
    });

    it('Creates a proposal tx correctly', async () => {
        const wallet = new Wallet(0, false);
        wallet.setMasterKey(getLegacyMainnet());
        const tx = wallet.createTransaction(
            'bcea39f87b1dd7a5ba9d11d3d956adc6ce57dfff9397860cc30c11f08b3aa7c8',
            0.05 * 10 ** 8,
            { isProposal: true }
        );
        expect(tx.version).toBe(1);
        expect(tx.vin[0]).toStrictEqual(
            new CTxIn({
                outpoint: new COutpoint({
                    txid: 'f8f968d80ac382a7b64591cc166489f66b7c4422f95fbd89f946a5041d285d7c',
                    n: 1,
                }),
                scriptSig: '76a914f49b25384b79685227be5418f779b98a6be4c73888ac', // Script sig must be the UTXO script since it's not signed
            })
        );
        expect(tx.vout[0]).toStrictEqual(
            new CTxOut({
                script: '76a914f49b25384b79685227be5418f779b98a6be4c73888ac',
                value: 4992400,
            })
        );
        expect(tx.vout[1]).toStrictEqual(
            new CTxOut({
                script: '6a20bcea39f87b1dd7a5ba9d11d3d956adc6ce57dfff9397860cc30c11f08b3aa7c8',
                value: 5000000,
            })
        );
    });

    it('Creates a cold stake tx correctly', async () => {
        const wallet = new Wallet(0, false);
        wallet.setMasterKey(getLegacyMainnet());
        const tx = wallet.createTransaction(
            'SR3L4TFUKKGNsnv2Q4hWTuET2a4vHpm1b9',
            0.05 * 10 ** 8,
            { isDelegation: true }
        );
        expect(tx.version).toBe(1);
        expect(tx.vin[0]).toStrictEqual(
            new CTxIn({
                outpoint: new COutpoint({
                    txid: 'f8f968d80ac382a7b64591cc166489f66b7c4422f95fbd89f946a5041d285d7c',
                    n: 1,
                }),
                scriptSig: '76a914f49b25384b79685227be5418f779b98a6be4c73888ac', // Script sig must be the UTXO script since it's not signed
            })
        );
        expect(tx.vout[0]).toStrictEqual(
            new CTxOut({
                script: '76a914f49b25384b79685227be5418f779b98a6be4c73888ac',
                value: 4992400,
            })
        );
        expect(tx.vout[1]).toStrictEqual(
            new CTxOut({
                script: '76a97b63d114291a25b5b4d1802e0611e9bf724a1e57d9210e826714f49b25384b79685227be5418f779b98a6be4c7386888ac',
                value: 5000000,
            })
        );
    });

    it('creates a tx with max balance', () => {
        const wallet = new Wallet(0, false);
        wallet.setMasterKey(getLegacyMainnet());
        const tx = wallet.createTransaction(
            'SR3L4TFUKKGNsnv2Q4hWTuET2a4vHpm1b9',
            0.1 * 10 ** 8,
            { isDelegation: true }
        );
        expect(tx.version).toBe(1);
        expect(tx.vin).toHaveLength(1);
        expect(tx.vin[0]).toStrictEqual(
            new CTxIn({
                outpoint: new COutpoint({
                    txid: 'f8f968d80ac382a7b64591cc166489f66b7c4422f95fbd89f946a5041d285d7c',
                    n: 1,
                }),
                scriptSig: '76a914f49b25384b79685227be5418f779b98a6be4c73888ac', // Script sig must be the UTXO script since it's not signed
            })
        );
        expect(tx.vout).toHaveLength(1);
        expect(tx.vout[0]).toStrictEqual(
            new CTxOut({
                script: '76a97b63d114291a25b5b4d1802e0611e9bf724a1e57d9210e826714f49b25384b79685227be5418f779b98a6be4c7386888ac',
                value: 9992400, // 0.1 PIV - fee
            })
        );
    });

    it('throws when balance is insufficient', () => {
        const wallet = new Wallet(0, false);
        wallet.setMasterKey(getLegacyMainnet());
        expect(() =>
            wallet.createTransaction(
                'SR3L4TFUKKGNsnv2Q4hWTuET2a4vHpm1b9',
                20 * 10 ** 8,
                { isDelegation: true }
            )
        ).toThrow(/not enough balance/i);
        expect(() =>
            wallet.createTransaction(
                'DLabsktzGMnsK5K9uRTMCF6NoYNY6ET4Bb',
                20 * 10 ** 8
            )
        ).toThrow(/not enough balance/i);
    });

    it('throws when delegateChange is set, but changeDelegationAddress is not', () => {
        const wallet = new Wallet(0, false);
        wallet.setMasterKey(getLegacyMainnet());
        expect(() =>
            wallet.createTransaction(
                'DLabsktzGMnsK5K9uRTMCF6NoYNY6ET4Bb',
                0.1 * 10 ** 8,
                { delegateChange: true }
            )
        ).toThrow(/was set to/i);
    });

    it('finalizes transaction correctly', () => {
        const wallet = new Wallet(0, false);
        const tx = {};
        wallet.finalizeTransaction(tx);
        expect(mempool.updateMempool).toBeCalled(1);
        expect(mempool.updateMempool).toBeCalledWith(tx);
        expect(mempool.setBalance).toBeCalled(1);
        expect(mempool.setBalance).toBeCalledWith();
    });

    afterAll(() => {
        vi.clearAllMocks();
    });
});

describe('Wallet signature tests', () => {
    let PIVXShield;
    beforeEach(() => {
        PIVXShield = vi.fn();
        PIVXShield.prototype.createTransaction = vi.fn(() => {
            return {
                hex: '00',
            };
        });
    });

    it('throws when is view only', async () => {
        const wallet = new Wallet(0, false);
        const mk = getLegacyMainnet();
        mk.wipePrivateData();
        wallet.setMasterKey(mk);
        expect(wallet.sign({})).rejects.toThrow(/view only/i);
    });
    it('signs a transaction correctly', async () => {
        const wallet = new Wallet(0, false);
        const mk = getLegacyMainnet();
        wallet.setMasterKey(mk);
        const tx = new Transaction();
        tx.version = 1;
        tx.blockHeight = -1;
        tx.blockTime = -1;
        tx.vin = [
            new CTxIn({
                outpoint: new COutpoint({
                    txid: 'f8f968d80ac382a7b64591cc166489f66b7c4422f95fbd89f946a5041d285d7c',
                    n: 1,
                }),
                scriptSig: '76a914f49b25384b79685227be5418f779b98a6be4c73888ac', // Script sig must be the UTXO script since it's not signed
            }),
        ];
        tx.vout = [
            new CTxOut({
                script: '76a914f49b25384b79685227be5418f779b98a6be4c73888ac',
                value: 4992400,
            }),
            new CTxOut({
                script: '76a914a95cc6408a676232d61ec29dc56a180b5847835788ac',
                value: 5000000,
            }),
        ];
        const signedTx = await wallet.sign(tx);
        // Return value must reference the same tx
        expect(signedTx).toBe(tx);
        expect(signedTx.txid).toBe(
            '9cf01cffc85d53b80a9c7ca106fc7326efa0f4f1db3eaf5be0ac45eb6105b8ab'
        );
    });

    it('signs a s->s transaction correctly', async () => {
        const wallet = new Wallet(0, false);
        wallet.setMasterKey(getLegacyMainnet());
        wallet.setShield(new PIVXShield());
        const tx = new Transaction({
            version: 3,
            blockHeight: -1,
            vin: [],
            vout: [],
            shieldData: [
                {
                    value: 100000,
                    address: 'ptest1234567',
                },
            ],
        });
        const txRef = await wallet.sign(tx);
        expect(txRef).toBe(tx);
        expect(PIVXShield.prototype.createTransaction).toHaveBeenCalledWith({
            address: 'ptest1234567',
            amount: 100000,
            blockHeight: 1504903,
            transparentChangeAddress: 'DTSTGkncpC86sbEUZ2rCBLEe2aXSeZPLnC',
            useShieldInputs: true, // Because vin is empty
            utxos: [
                {
                    amount: 10000000,
                    private_key: getLegacyMainnet().getPrivateKeyBytes(),
                    script: hexToBytes(
                        '76a914f49b25384b79685227be5418f779b98a6be4c73888ac'
                    ),
                    txid: 'f8f968d80ac382a7b64591cc166489f66b7c4422f95fbd89f946a5041d285d7c',
                    vout: 1,
                },
            ],
        });
    });
    it('signs a s->t tx correctly', async () => {
        const wallet = new Wallet(0, false);
        wallet.setMasterKey(getLegacyMainnet());
        wallet.setShield(new PIVXShield());
        const tx = new Transaction({
            version: 3,
            blockHeight: -1,
            vin: [],
            vout: [
                new CTxOut({
                    script: '76a914f49b25384b79685227be5418f779b98a6be4c73888ac',
                    value: 4992400,
                }),
            ],
            shieldData: [],
        });
        const txRef = await wallet.sign(tx);
        expect(txRef).toBe(tx);
        expect(PIVXShield.prototype.createTransaction).toHaveBeenCalledWith({
            address: 'DTSTGkncpC86sbEUZ2rCBLEe2aXSeZPLnC',
            amount: 4992400,
            blockHeight: 1504903,
            transparentChangeAddress: 'DTSTGkncpC86sbEUZ2rCBLEe2aXSeZPLnC',
            useShieldInputs: true, // Because vin is empty
            utxos: [
                {
                    amount: 10000000,
                    private_key: getLegacyMainnet().getPrivateKeyBytes(),
                    script: hexToBytes(
                        '76a914f49b25384b79685227be5418f779b98a6be4c73888ac'
                    ),
                    txid: 'f8f968d80ac382a7b64591cc166489f66b7c4422f95fbd89f946a5041d285d7c',
                    vout: 1,
                },
            ],
        });
    });
    it('signs a t->s tx correctly', async () => {
        const wallet = new Wallet(0, false);
        wallet.setMasterKey(getLegacyMainnet());
        wallet.setShield(new PIVXShield());
        const tx = new Transaction({
            version: 3,
            blockHeight: -1,
            vin: [
                new CTxIn({
                    outpoint: new COutpoint({
                        txid: 'f8f968d80ac382a7b64591cc166489f66b7c4422f95fbd89f946a5041d285d7c',
                        n: 1,
                    }),
                    script: '76a914f49b25384b79685227be5418f779b98a6be4c73888ac',
                }),
            ],
            vout: [],
            shieldData: [
                {
                    value: 100000,
                    address: 'ptest1234567',
                },
            ],
        });
        const txRef = await wallet.sign(tx);
        expect(txRef).toBe(tx);
        expect(PIVXShield.prototype.createTransaction).toHaveBeenCalledWith({
            address: 'ptest1234567',
            amount: 100000,
            blockHeight: 1504903,
            transparentChangeAddress: 'DTSTGkncpC86sbEUZ2rCBLEe2aXSeZPLnC',
            useShieldInputs: false,
            utxos: [
                {
                    amount: 10000000,
                    private_key: getLegacyMainnet().getPrivateKeyBytes(),
                    script: hexToBytes(
                        '76a914f49b25384b79685227be5418f779b98a6be4c73888ac'
                    ),
                    txid: 'f8f968d80ac382a7b64591cc166489f66b7c4422f95fbd89f946a5041d285d7c',
                    vout: 1,
                },
            ],
        });
    });
});
