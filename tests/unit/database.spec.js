import 'fake-indexeddb/auto';
import { FDBFactory } from 'fake-indexeddb';
import { PromoWallet } from '../../scripts/promos.js';
import { it, describe, vi, expect } from 'vitest';
import { Database } from '../../scripts/database.js';
import { Account } from '../../scripts/accounts';
import * as misc from '../../scripts/misc.js';
import { Settings } from '../../scripts/settings';
import Masternode from '../../scripts/masternode';
describe('database tests', () => {
    beforeAll(() => {
        // Mock createAlert
        vi.spyOn(misc, 'createAlert').mockImplementation(vi.fn());
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
            coldAddress: 'very cold',
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
        expect((await db.getAccount()).coldAddress).toBe('very cold');
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

        // Unles `allowDeletion` is set to true
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

    it.todo('stores transaction correctly', () => {
        // To avoid conflicts, I will implement this after #284
    });

    it('stores masternodes correctly', async () => {
        const db = await Database.create('test');
        // Masternode should be null by default
        expect(await db.getMasternode()).toBe(null);
        let masternode = new Masternode({
            collateralTxId: 'mntxid',
        });
        await db.addMasternode(masternode);
        expect(await db.getMasternode()).toStrictEqual(masternode);
        masternode = new Masternode({
            collateralTxId: 'mntxid2',
        });
        // Subsequent calls to `addMasternode` should overwrite it.
        await db.addMasternode(masternode);
        expect(await db.getMasternode()).toStrictEqual(masternode);
        // Check that it removes mn correectly
        await db.removeMasternode();
        expect(await db.getMasternode()).toBe(null);
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

    it('migrates from local storage correctly', async () => {
        vi.stubGlobal('localStorage', {
            explorer: 'duddino.com',
            translation: 'DE',
            encwif: 'ENCRYPTED_WIF',
            publicKey: 'PUB_KEY',
            masternode: JSON.stringify(
                new Masternode({ collateralTxId: 'mntxid' })
            ),
        });
        const db = await Database.create('test');
        expect(await db.getAccount()).toStrictEqual(
            new Account({
                publicKey: 'PUB_KEY',
                encWif: 'ENCRYPTED_WIF',
            })
        );
        expect(await db.getSettings()).toStrictEqual(
            new Settings({
                explorer: 'duddino.com',
                translation: 'DE',
            })
        );
        expect(await db.getMasternode()).toStrictEqual(
            new Masternode({ collateralTxId: 'mntxid' })
        );

        vi.unstubAllGlobals();
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
