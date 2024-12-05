import { Wallet } from '../../../scripts/wallet.js';
import { Mempool } from '../../../scripts/mempool.js';
import {
    legacyMainnetInitialBalance,
    setUpLegacyMainnetWallet,
} from '../../utils/test_utils';
import { describe, it, vi, afterAll, expect } from 'vitest';
import {
    COutpoint,
    CTxIn,
    CTxOut,
    Transaction,
} from '../../../scripts/transaction.js';

import 'fake-indexeddb/auto';
import { TransactionBuilder } from '../../../scripts/transaction_builder.js';
import { cChainParams } from '../../../scripts/chain_params.js';

vi.stubGlobal('localStorage', { length: 0 });
vi.mock('../../../scripts/global.js');
vi.mock('../../../scripts/network/network_manager.js');

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
    return fees;
}
describe('Wallet transaction tests', () => {
    let wallet;
    const MIN_FEE_PER_BYTE = new TransactionBuilder().MIN_FEE_PER_BYTE;
    beforeEach(async () => {
        wallet = await setUpLegacyMainnetWallet();

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
        // Delegate 5250 PIV to test Stake Pre-Splitting
        const value = 5250 * 10 ** 8;
        const tx = wallet.createTransaction(
            'SR3L4TFUKKGNsnv2Q4hWTuET2a4vHpm1b9',
            value,
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
        // The 'after split' output
        expect(tx.vout[0]).toStrictEqual(
            new CTxOut({
                script: '76a97b63d114291a25b5b4d1802e0611e9bf724a1e57d9210e826714f49b25384b79685227be5418f779b98a6be4c7386888ac',
                value:
                    cChainParams.current.stakeSplitTarget +
                    (value % cChainParams.current.stakeSplitTarget),
            })
        );
        // The split outputs (depending on chainparam 'stakeSplitTarget')
        for (const cOut of tx.vout.slice(1, tx.vout.length - 1)) {
            expect(cOut).toStrictEqual(
                new CTxOut({
                    script: '76a97b63d114291a25b5b4d1802e0611e9bf724a1e57d9210e826714f49b25384b79685227be5418f779b98a6be4c7386888ac',
                    value: cChainParams.current.stakeSplitTarget,
                })
            );
        }
        await checkFees(wallet, tx, MIN_FEE_PER_BYTE);
    });

    it('Creates a cold stake tx with max balance', async () => {
        const tx = wallet.createTransaction(
            'SR3L4TFUKKGNsnv2Q4hWTuET2a4vHpm1b9',
            legacyMainnetInitialBalance(),
            { isDelegation: true }
        );
        expect(tx.version).toBe(1);
        expect(tx.vin).toHaveLength(2);
        expect(tx.vin[0]).toStrictEqual(
            new CTxIn({
                outpoint: new COutpoint({
                    txid: 'f8f968d80ac382a7b64591cc166489f66b7c4422f95fbd89f946a5041d285d7c',
                    n: 1,
                }),
                scriptSig: '76a914f49b25384b79685227be5418f779b98a6be4c73888ac', // Script sig must be the UTXO script since it's not signed
            })
        );
        // The 'after split' output
        expect(tx.vout[0]).toStrictEqual(
            new CTxOut({
                script: '76a97b63d114291a25b5b4d1802e0611e9bf724a1e57d9210e826714f49b25384b79685227be5418f779b98a6be4c7386888ac',
                value: 50009999246,
            })
        );
        // Cold Stake split outputs
        expect(tx.vout).toHaveLength(20);
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
        // a P2PKH with 2 inputs and 1 output will have more or less 346 bytes in size and 3460 satoshi of fees
        const value = legacyMainnetInitialBalance() - 3460 - 200;
        const tx = wallet.createTransaction(
            'DLabsktzGMnsK5K9uRTMCF6NoYNY6ET4Bb',
            value,
            { subtractFeeFromAmt: false }
        );
        expect(tx.version).toBe(1);
        expect(tx.vin).toHaveLength(2);
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
        const value = legacyMainnetInitialBalance() + 1;
        expect(() =>
            wallet.createTransaction(
                'SR3L4TFUKKGNsnv2Q4hWTuET2a4vHpm1b9',
                value,
                { isDelegation: true }
            )
        ).toThrow(/not enough balance/i);
        expect(() =>
            wallet.createTransaction(
                'DLabsktzGMnsK5K9uRTMCF6NoYNY6ET4Bb',
                value
            )
        ).toThrow(/not enough balance/i);
        expect(() =>
            wallet.createTransaction(
                'DLabsktzGMnsK5K9uRTMCF6NoYNY6ET4Bb',
                value,
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
                legacyMainnetInitialBalance(),
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
        const spy = vi.spyOn(Mempool.prototype, 'addTransaction');
        const tx = new Transaction();
        wallet.addTransaction(tx);
        expect(spy).toBeCalledTimes(1);
        expect(spy).toBeCalledWith(tx);
    });

    afterAll(() => {
        vi.clearAllMocks();
    });
});
