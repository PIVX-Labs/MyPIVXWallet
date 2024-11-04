import {
    getLegacyMainnet,
    PIVXShield,
    setUpLegacyMainnetWallet,
} from '../../utils/test_utils';
import { describe, it, vi, expect } from 'vitest';
import 'fake-indexeddb/auto';
import {
    COutpoint,
    CTxIn,
    CTxOut,
    Transaction,
} from '../../../scripts/transaction.js';
import { hexToBytes } from '../../../scripts/utils';

vi.mock('../../../scripts/network/network_manager.js');
vi.mock('../../../scripts/global.js');

describe('Wallet signature tests', () => {
    let wallet;
    beforeEach(async () => {
        wallet = await setUpLegacyMainnetWallet();
        // Reset indexedDB before each test
        vi.stubGlobal('indexedDB', new IDBFactory());
    });

    it('throws when is view only', async () => {
        wallet.wipePrivateData();
        expect(wallet.sign({})).rejects.toThrow(/view only/i);
    });
    it('signs a transaction correctly', async () => {
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
        const tx = new Transaction({
            version: 3,
            blockHeight: -1,
            vin: [],
            vout: [],
            shieldOutput: [
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
            blockHeight: 1504904,
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
        expect(PIVXShield.prototype.getTxStatus).toHaveBeenCalled();
    });
    it('signs a s->t tx correctly', async () => {
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
            shieldOutput: [],
        });
        const txRef = await wallet.sign(tx);
        expect(txRef).toBe(tx);
        expect(PIVXShield.prototype.createTransaction).toHaveBeenCalledWith({
            address: 'DTSTGkncpC86sbEUZ2rCBLEe2aXSeZPLnC',
            amount: 4992400,
            blockHeight: 1504904,
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
        expect(PIVXShield.prototype.getTxStatus).toHaveBeenCalled();
    });
    it('signs a t->s tx correctly', async () => {
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
            shieldOutput: [
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
            blockHeight: 1504904,
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
        expect(PIVXShield.prototype.getTxStatus).toHaveBeenCalled();
    });
});
