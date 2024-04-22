vi.mock('../../../scripts/mempool.js');
vi.mock('../../../scripts/network.js');

import { Wallet } from '../../../scripts/wallet.js';
import { Mempool } from '../../../scripts/mempool.js';
import { getLegacyMainnet } from '../test_utils';
import { describe, it, vi, afterAll, expect } from 'vitest';
import {
    COutpoint,
    CTxIn,
    CTxOut,
    Transaction,
} from '../../../scripts/transaction.js';

import 'fake-indexeddb/auto';
import { TransactionBuilder } from '../../../scripts/transaction_builder.js';

vi.stubGlobal('localStorage', { length: 0 });
vi.mock('../../../scripts/global.js');
vi.mock('../../../scripts/network.js');

/**
 * @param {Wallet} wallet
 * @param {Transaction} tx
 * @param {number} feesPerBytes
 */
async function checkFees(wallet, tx, feesPerBytes) {
    let fees = 0;
    for (const vout of tx.vout) {
        fees -= vout.value;
    }

    for (const vin of tx.vin) {
        fees += wallet.outpointToUTXO(vin.outpoint).value;
    }
    // Sign and verify that it pays enough fees, and that it is greedy enough
    const nBytes = (await wallet.sign(tx)).serialize().length / 2;
    expect(fees).toBeGreaterThanOrEqual(feesPerBytes * nBytes);
    expect(fees).toBeLessThanOrEqual((feesPerBytes + 1) * nBytes);
}
describe('Wallet transaction tests', () => {
    let wallet;
    let mempool;
    let PIVXShield;
    const MIN_FEE_PER_BYTE = new TransactionBuilder().MIN_FEE_PER_BYTE;
    beforeEach(() => {
        mempool = new Mempool();
        wallet = new Wallet({ nAccount: 0, isMainWallet: false, mempool });
		wallet.setMasterKey({ mk: getLegacyMainnet() });
        PIVXShield = vi.fn();
        PIVXShield.prototype.createTransaction = vi.fn(() => {
            return {
                hex: '00',
            };
        });
        PIVXShield.prototype.getBalance = vi.fn(() => 40 * 10 ** 8);
        wallet.setShield(new PIVXShield());
        // Reset indexedDB before each test
        vi.stubGlobal('indexedDB', new IDBFactory());
        return vi.unstubAllGlobals;
    });
    it('Creates a transaction correctly', async () => {
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
        expect(tx.vout[1].script).toBe(
            '76a914f49b25384b79685227be5418f779b98a6be4c73888ac'
        );
        expect(tx.vout[0]).toStrictEqual(
            new CTxOut({
                script: '76a914a95cc6408a676232d61ec29dc56a180b5847835788ac',
                value: 5000000,
            })
        );
        await checkFees(wallet, tx, MIN_FEE_PER_BYTE);
    });

    it('creates an exchange tx correctly', async () => {
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
        expect(tx.vout[1]).toStrictEqual(
            new CTxOut({
                script: '76a914f49b25384b79685227be5418f779b98a6be4c73888ac',
                value: 4997730,
            })
        );
        expect(tx.vout[0]).toStrictEqual(
            new CTxOut({
                script: '76a914a95cc6408a676232d61ec29dc56a180b5847835788ac',
                value: 5000000,
            })
        );
        await checkFees(wallet, tx, MIN_FEE_PER_BYTE);
    });

    it('Creates a tx with change address', async () => {
		wallet.setMasterKey({ mk: getLegacyMainnet() });
        const tx = wallet.createTransaction(
            'EXMDbnWT4K3nWfK1311otFrnYLcFSipp3iez',
            0.05 * 10 ** 8,
            { changeAddress: 'D8Ervc3Ka6TuKgvXZH9Eo4ou24AiVwTbL6' }
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
        expect(tx.vout[1]).toStrictEqual(
            new CTxOut({
                script: '76a91421ff8214d09d60713b89809bb413a0651ee6931488ac',
                value: 4997720,
            })
        );
        expect(tx.vout[0]).toStrictEqual(
            new CTxOut({
                script: 'e076a9141c62aa5fb5bc8a4932491fcfc1832fb5422e0cd288ac',
                value: 5000000,
            })
        );
        await checkFees(wallet, tx, MIN_FEE_PER_BYTE);
    });

    it('Creates a proposal tx correctly', async () => {
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
        expect(tx.vout[1]).toStrictEqual(
            new CTxOut({
                script: '76a914f49b25384b79685227be5418f779b98a6be4c73888ac',
                value: 4997640,
            })
        );
        expect(tx.vout[0]).toStrictEqual(
            new CTxOut({
                script: '6a20bcea39f87b1dd7a5ba9d11d3d956adc6ce57dfff9397860cc30c11f08b3aa7c8',
                value: 5000000,
            })
        );
        await checkFees(wallet, tx, MIN_FEE_PER_BYTE);
    });

    it('Creates a cold stake tx correctly', async () => {
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
        expect(tx.vout[1]).toStrictEqual(
            new CTxOut({
                script: '76a914f49b25384b79685227be5418f779b98a6be4c73888ac',
                value: 4997470,
            })
        );
        expect(tx.vout[0]).toStrictEqual(
            new CTxOut({
                script: '76a97b63d114291a25b5b4d1802e0611e9bf724a1e57d9210e826714f49b25384b79685227be5418f779b98a6be4c7386888ac',
                value: 5000000,
            })
        );
        await checkFees(wallet, tx, MIN_FEE_PER_BYTE);
    });

    it('creates a tx with max balance', async () => {
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
                value: 9997810, // 0.1 PIV - fee
            })
        );
        await checkFees(wallet, tx, MIN_FEE_PER_BYTE);
    });

    it('creates a t->s tx correctly', () => {
        const addr =
            'ps1a0x2few52sy3t0nrdhun0re4c870e04w448qpa7c26qjw9ljs4quhja40hat95f7hy8tcuvcn2s';
        const tx = wallet.createTransaction(addr, 0.05 * 10 ** 8);
        expect(tx).toStrictEqual(
            new Transaction({
                vin: [
                    new CTxIn({
                        outpoint: new COutpoint({
                            txid: 'f8f968d80ac382a7b64591cc166489f66b7c4422f95fbd89f946a5041d285d7c',
                            n: 1,
                        }),
                        scriptSig:
                            '76a914f49b25384b79685227be5418f779b98a6be4c73888ac',
                    }),
                ],
                shieldOutput: [
                    {
                        address: addr,
                        value: 0.05 * 10 ** 8,
                    },
                ],
                version: 3,
            })
        );
    });

    it('it does not insert dust change', async () => {
        // The tipical output has 34 bytes, so a 200 satoshi change is surely going to be dust
        // a P2PKH with 1 input and 1 output will have more or less 190 bytes in size and 1900 satoshi of fees
        // Finally 0.1*10**8 is the value of the UTXO we are spending (0.1 PIVs)
        const value = 0.1 * 10 ** 8 - 1900 - 200;
        const tx = wallet.createTransaction(
            'DLabsktzGMnsK5K9uRTMCF6NoYNY6ET4Bb',
            value,
            { subtractFeeFromAmt: false }
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
                script: '76a914a95cc6408a676232d61ec29dc56a180b5847835788ac',
                value: value,
            })
        );
        await checkFees(wallet, tx, MIN_FEE_PER_BYTE);
    });

    it('creates a s->t tx correctly', async () => {
        const tx = wallet.createTransaction(
            'DLabsktzGMnsK5K9uRTMCF6NoYNY6ET4Bb',
            0.05 * 10 ** 8,
            { useShieldInputs: true }
        );
        expect(tx).toStrictEqual(
            new Transaction({
                version: 3,
                vout: [
                    new CTxOut({
                        script: '76a914a95cc6408a676232d61ec29dc56a180b5847835788ac',
                        value: 5000000,
                    }),
                ],
            })
        );
    });

    it('creates a s->s tx correctly', async () => {
        const addr =
            'ps1a0x2few52sy3t0nrdhun0re4c870e04w448qpa7c26qjw9ljs4quhja40hat95f7hy8tcuvcn2s';
        const tx = wallet.createTransaction(addr, 0.05 * 10 ** 8, {
            useShieldInputs: true,
        });
        expect(tx).toStrictEqual(
            new Transaction({
                version: 3,
                shieldOutput: [
                    {
                        address: addr,
                        value: 0.05 * 10 ** 8,
                    },
                ],
            })
        );
    });

    it('throws when balance is insufficient', () => {
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
        expect(() =>
            wallet.createTransaction(
                'DLabsktzGMnsK5K9uRTMCF6NoYNY6ET4Bb',
                50 * 10 ** 8,
                { useShieldInputs: true }
            )
        ).toThrow(/not enough balance/i);

        // Should use shield balance when `useShieldInputs` is true
        expect(
            wallet.createTransaction(
                'DLabsktzGMnsK5K9uRTMCF6NoYNY6ET4Bb',
                30 * 10 ** 8,
                { useShieldInputs: true }
            )
        ).toBeDefined();
        // MaX balance is set but we don't allow subtracting fee from amount
        expect(() =>
            wallet.createTransaction(
                'DLabsktzGMnsK5K9uRTMCF6NoYNY6ET4Bb',
                0.1 * 10 ** 8,
                { subtractFeeFromAmt: false }
            )
        ).toThrow(/not enough balance/i);
    });

    it('throws when delegateChange is set, but changeDelegationAddress is not', () => {
        expect(() =>
            wallet.createTransaction(
                'DLabsktzGMnsK5K9uRTMCF6NoYNY6ET4Bb',
                0.1 * 10 ** 8,
                { delegateChange: true }
            )
        ).toThrow(/was set to/i);
    });

    it('finalizes transaction correctly', () => {
        const tx = new Transaction();
        wallet.addTransaction(tx);
        expect(mempool.addTransaction).toBeCalled(1);
        expect(mempool.addTransaction).toBeCalledWith(tx);
    });

    afterAll(() => {
        vi.clearAllMocks();
    });
});
