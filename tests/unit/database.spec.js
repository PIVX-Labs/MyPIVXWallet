import 'fake-indexeddb/auto';
import { PromoWallet } from '../../scripts/promos.js';
import { it, describe, vi, expect } from 'vitest';
import { Database } from '../../scripts/database.js';
import { Account } from '../../scripts/accounts';
import * as alert from '../../scripts/alerts/alert.js';
import { Settings } from '../../scripts/settings';
import Masternode from '../../scripts/masternode';
import { Transaction } from '../../scripts/transaction';
describe('database tests', () => {
    beforeAll(() => {
        // Mock createAlert
        vi.spyOn(alert, 'createAlert').mockImplementation(vi.fn());
        vi.stubGlobal(global.console, 'error');
        return () => {
            vi.restoreAllMocks();
            vi.unstubAllGlobals();
        };
    });
    beforeEach(async () => {
        // Reset indexedDB before each test
        vi.stubGlobal('indexedDB', new IDBFactory());
        return vi.unstubAllGlobals;
    });
    it('stores account correctly', async () => {
        const db = await Database.create('test');
        const account = new Account({
            publicKey: 'test1',
        });
        await db.addAccount(account);
        expect(await db.getAccount()).toStrictEqual(account);
        await db.updateAccount(
            new Account({
                encWif: 'newWIF!',
                localProposals: ['prop1', 'prop2'],
            })
        );
        expect((await db.getAccount()).encWif).toBe('newWIF!');
        expect((await db.getAccount()).publicKey).toBe('test1');
        expect((await db.getAccount()).localProposals).toStrictEqual([
            'prop1',
            'prop2',
        ]);

        // Setting localProposals as empty doesn't overwrite the array
        await db.updateAccount(
            new Account({
                encWif: 'newWIF2!',
                localProposals: [],
            })
        );
        expect((await db.getAccount()).localProposals).toStrictEqual([
            'prop1',
            'prop2',
        ]);

        // Unless `allowDeletion` is set to true
        await db.updateAccount(
            new Account({
                encWif: 'newWIF2!',
                localProposals: [],
            }),
            true
        );
        expect((await db.getAccount()).localProposals).toHaveLength(0);

        await db.removeAccount({ publicKey: 'test1' });

        expect(await db.getAccount()).toBeNull();
    });

    it('stores transaction correctly', async () => {
        const transactions = [
            '0100000001d895a1dfa0198d6b8c8cf2eacccca96586ee0d2281b19c36b995aad096899cdb010000006c473044022030b9d2447e976562133a7c2b9fb70b25f427b205491d14a4f11c5096426a4d8202204bde1afbdd4dd8eb4ec6ab3b22512354dc917c4eccb464f228c2c6a28fed46080101512102883374ead5b57d8db4a302f64b0b72e214f6a428dd1eff85919ec289ad92c52effffffff030000000000000000007bd4532b0f0000003376a97b63d114b3be8567d0190c67ca4675a0019089c55fe695f967142bd00337677ee0216d47a2dbdf1f4e107e54e4206888ac0046c323000000001976a914f5f49c7ed95e5b7f54b0f93a81d9699472011feb88ac00000000',
            '01000000019e07debe5a00f18f9343b270dc7d408c3116e605dd937eb432e1cab23ea407fa010000006d483045022100e4ecab97c5c733c9d883046653045fa269031a89812921ae2bb956e063b911d9022053413e4c8e0aae5ac580bbd6c9a3eb08222ecb0ab6821a96d3389872a304ec3a01015121025559a792b8805da7f5d61237a45d7e70c9b3133a176e755e7e90514e37673720ffffffff03000000000000000000900a44e8100000003376a97b63d114490254a35e71df73197db35a8d4c5f50068cd1f26714f250ed27afc2f51164c67501471a52661cd8f62f6888ac0046c323000000001976a914074610f922bee2ec55dc15a1e335e8ca9cec991388ac00000000',
            '01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff05038bce3f00ffffffff0100000000000000000000000000',
        ].map((h) => Transaction.fromHex(h));
        const db = await Database.create('test');
        for (const tx of transactions) {
            await db.storeTx(tx);
        }
        expect(
            (await db.getTxs()).sort((a, b) => a.txid.localeCompare(b.txid))
        ).toStrictEqual(
            transactions.sort((a, b) => a.txid.localeCompare(b.txid))
        );
        // If we store a tx multiple times, it won't repeat the transaction
        await db.storeTx(transactions[0]);
        expect(
            (await db.getTxs()).sort((a, b) => a.txid.localeCompare(b.txid))
        ).toStrictEqual(
            transactions.sort((a, b) => a.txid.localeCompare(b.txid))
        );
    });

    it('stores masternodes correctly', async () => {
        const db = await Database.create('test');
        // Masternode array should be empty by default
        expect(await db.getMasternodes()).toHaveLength(0);
        const masternode = new Masternode({
            collateralTxId: 'mntxid',
            mnPrivateKey: '1',
        });
        await db.addMasternode(masternode);
        expect(await db.getMasternodes()).toStrictEqual([masternode]);
        const masternode2 = new Masternode({
            collateralTxId: 'mntxid2',
            mnPrivateKey: '2',
        });
        // Subsequent calls to `addMasternode` should add the new mn.
        await db.addMasternode(masternode2);
        expect(await db.getMasternodes()).toStrictEqual([
            masternode,
            masternode2,
        ]);
        // If mn private key is the same, it should replace the old one
        const masternode3 = new Masternode({
            collateralTxId: 'mntxid3',
            mnPrivateKey: '2',
        });
        // Subsequent calls to `addMasternode` should add the new mn.
        await db.addMasternode(masternode3);
        expect(await db.getMasternodes()).toStrictEqual([
            masternode,
            masternode3,
        ]);
        // Check that it removes mn correctly
        await db.removeMasternode(masternode);
        expect(await db.getMasternodes()).toStrictEqual([masternode3]);
    });

    it('stores promos correctly', async () => {
        const testPromos = new Array(50).fill(0).map(
            (_, i) =>
                new PromoWallet({
                    code: `${i}`,
                })
        );
        const db = await Database.create('test');
        // It starts with no promos
        expect(await db.getAllPromos()).toHaveLength(0);

        await db.addPromo(testPromos[0]);
        expect(await db.getAllPromos()).toStrictEqual([testPromos[0]]);

        // If we add the same promo twice, it should not duplicate it
        await db.addPromo(testPromos[0]);
        expect(await db.getAllPromos()).toStrictEqual([testPromos[0]]);

        // Removes correctly
        await db.removePromo(testPromos[0].code);
        expect(await db.getAllPromos()).toHaveLength(0);

        for (const promo of testPromos) {
            await db.addPromo(promo);
        }
        expect(
            (await db.getAllPromos()).sort(
                (a, b) => parseInt(a.code) - parseInt(b.code)
            )
        ).toStrictEqual(testPromos);
        await db.removePromo('23');
        expect(
            (await db.getAllPromos()).sort(
                (a, b) => parseInt(a.code) - parseInt(b.code)
            )
        ).toStrictEqual(testPromos.filter((p) => p.code != '23'));
    });

    it('stores settings correctly', async () => {
        const db = await Database.create('test');
        const settings = new Settings({
            explorer: 'duddino.com',
            node: 'pivx.com',
        });
        // Settings should be left as default at the beginning
        expect(await db.getSettings()).toStrictEqual(new Settings());
        await db.setSettings(settings);
        expect(await db.getSettings()).toStrictEqual(settings);
        // Test that overwrite works as expected
        await db.setSettings({
            node: 'pivx.org',
        });
        expect(await db.getSettings()).toStrictEqual(
            new Settings({
                explorer: 'duddino.com',
                node: 'pivx.org',
            })
        );
    });

    it('throws when calling addAccount twice', async () => {
        const db = await Database.create('test');
        const account = new Account();
        db.addAccount(account);
        expect(() => db.addAccount(account)).rejects.toThrow(
            /account already exists/i
        );
    });
    it('throws when called with an invalid account', async () => {
        const db = await Database.create('test');
        expect(() => db.addAccount({ publicKey: 'jaeir' })).rejects.toThrow(
            /invalid account/
        );
        expect(() => db.updateAccount({ publicKey: 'jaeir' })).rejects.toThrow(
            /invalid account/
        );
    });
    it("throws when updating an account that doesn't exist", async () => {
        const db = await Database.create('test');
        expect(() => db.updateAccount(new Account())).rejects.toThrow(
            /account doesn't exist/
        );
    });

    it('is isolated between different instances', async () => {
        const db = await Database.create('test');
        const db2 = await Database.create('test2');
        // Initially, both accounts are null
        expect(await db.getAccount()).toBe(null);
        expect(await db2.getAccount()).toBe(null);
        const account = new Account({
            publicKey: 'test1',
        });
        // Let's add an account to the first db
        await db.addAccount(account);
        // First DB has the account, the second one is undefined
        expect((await db.getAccount())?.publicKey).toBe('test1');
        expect((await db2.getAccount())?.publicKey).toBeUndefined();
    });
});
