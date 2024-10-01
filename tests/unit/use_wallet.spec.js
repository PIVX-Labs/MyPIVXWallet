import 'fake-indexeddb/auto';
import { getEventEmitter } from '../../scripts/event_bus.js';
import { describe, it, beforeEach, vi } from 'vitest';
import { useWallet } from '../../scripts/composables/use_wallet.js';
import { hasEncryptedWallet, wallet } from '../../scripts/wallet.js';
import { LegacyMasterKey } from '../../scripts/masterkey.js';
import { getNetwork } from '../../scripts/network.js';
import { strCurrency } from '../../scripts/settings.js';
import { setUpLegacyMainnetWallet } from '../utils/test_utils';

vi.mock('../../scripts/network.js');

describe('useWallet tests', () => {
    let walletComposable;
    beforeEach(async () => {
        walletComposable = useWallet();
        vi.stubGlobal('indexedDB', new IDBFactory());
        vi.stubGlobal('wallet', await setUpLegacyMainnetWallet());
        getEventEmitter().emit('balance-update');
    });

    async function isSyncedWithWallet() {
        expect(wallet.isLoaded()).toBe(walletComposable.isImported);
        expect(wallet.isViewOnly()).toBe(walletComposable.isViewOnly);
        expect(wallet.isSynced).toBe(walletComposable.isSynced);
        expect(await hasEncryptedWallet()).toBe(walletComposable.isEncrypted);
        expect(wallet.hasShield()).toBe(walletComposable.hasShield);
        expect(wallet.isHardwareWallet()).toBe(
            walletComposable.isHardwareWallet
        );
        expect(wallet.isHD()).toBe(walletComposable.isHD);
        expect(wallet.balance).toBe(walletComposable.balance);
        expect(await wallet.getShieldBalance()).toBe(
            walletComposable.shieldBalance
        );
        expect(wallet.coldBalance).toBe(walletComposable.coldBalance);
        expect(await wallet.getPendingShieldBalance()).toBe(
            walletComposable.pendingShieldBalance
        );
        expect(wallet.immatureBalance).toBe(walletComposable.immatureBalance);
        expect(walletComposable.currency).toBe(strCurrency.toUpperCase());

        return true;
    }

    it('is synced initially', async () => {
        expect(await isSyncedWithWallet()).toBe(true);
    });

    it('is synced after importing key', async () => {
        await walletComposable.setMasterKey({
            mk: new LegacyMasterKey({
                pkBytes: new Uint8Array([
                    181, 66, 141, 90, 213, 58, 137, 158, 160, 57, 109, 252, 51,
                    227, 221, 192, 8, 4, 223, 42, 42, 8, 191, 7, 251, 231, 167,
                    119, 54, 161, 194, 229,
                ]),
            }),
        });
        expect(await isSyncedWithWallet()).toBe(true);
    });

    it('is synced after encryption', async () => {
        await walletComposable.encrypt('123456');
        expect(await isSyncedWithWallet()).toBe(true);
    });

    it('is synced after syncing', async () => {
        await walletComposable.sync();
        expect(await isSyncedWithWallet()).toBe(true);
    });

    it('is synced after creating tx', async () => {
        await walletComposable.setMasterKey({
            mk: new LegacyMasterKey({
                pkBytes: new Uint8Array([
                    181, 66, 141, 90, 213, 58, 137, 158, 160, 57, 109, 252, 51,
                    227, 221, 192, 8, 4, 223, 42, 42, 8, 191, 7, 251, 231, 167,
                    119, 54, 161, 194, 229,
                ]),
            }),
        });

        await walletComposable.createAndSendTransaction(
            getNetwork(),
            'DLabsktzGMnsK5K9uRTMCF6NoYNY6ET4Bb',
            0
        );
        expect(await isSyncedWithWallet()).toBe(true);
    });
});
