import { Wallet } from '../../scripts/wallet.js';
import { getLegacyMainnet } from './test_utils';
import { describe, it, vi, afterAll, expect, beforeEach } from 'vitest';
import {
    COutpoint,
    CTxIn,
    CTxOut,
    UTXO,
    Transaction,
} from '../../scripts/transaction.js';

const Mempool = vi.fn();

Mempool.prototype.reset = vi.fn();
Mempool.prototype.balance = 0.1 * 10 ** 8;
Mempool.prototype.coldBalance = 0;
Mempool.prototype.isSpent = vi.fn(() => false);
Mempool.prototype.addToOrderedTxMap = vi.fn();
Mempool.prototype.setSpent = vi.fn();
Mempool.prototype.addTransaction = vi.fn();
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

vi.mock('../../scripts/network.js', () => {
    return {
        getNetwork: vi.fn(() => {
            return {
                cachedBlockCount: 1504903,
            };
        }),
    };
});
describe('Wallet transaction tests', () => {
    let wallet;
    let mempool;
    beforeEach(() => {
        mempool = new Mempool();
        wallet = new Wallet(0, false, mempool);
    });
    it('Creates a transaction correctly', async () => {
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
        wallet.setMasterKey(getLegacyMainnet());
        expect(() =>
            wallet.createTransaction(
                'DLabsktzGMnsK5K9uRTMCF6NoYNY6ET4Bb',
                0.1 * 10 ** 8,
                { delegateChange: true }
            )
        ).toThrow(/was set to/i);
    });

    it.todo('finalizes transaction correctly', () => {
        const tx = {};
        wallet.addTransaction(tx);
        expect(mempool.addTransaction).toBeCalled(1);
        expect(mempool.addTransaction).toBeCalledWith(tx);
    });

    afterAll(() => {
        vi.clearAllMocks();
    });
});

describe('Wallet signature tests', () => {
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
});
