import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { lockableFunction } from '../../scripts/lock.js';
import { AlertController } from '../../scripts/alerts/alert.js';
import { Database } from '../../scripts/database.js';
import { Account } from '../../scripts/accounts.js';

/**
 * The name service path leaves `send()` early, resolves over the network, and comes
 * back later through `onPinsSend` -> `executeSend`. Wallet state therefore has to be
 * checked in `executeSend`, where every send path converges. The copy in `send()` is
 * only there to save a lookup the user gains nothing from; on its own it would be a
 * check made at some arbitrary earlier moment.
 *
 * The transaction lock is the one that bites. `lockableFunction` does not queue: a
 * second call made while the lock is held discards its own arguments and awaits the
 * first call's promise. A name-service send landing on a held lock would resolve
 * happily with an unrelated transaction's result, pay nobody, and raise no error for
 * anything to catch.
 */
const h = vi.hoisted(() => ({ wallet: null, resolve: null, cancel: null }));

// The name service itself is covered in pins.spec.js. Here only the Dashboard's side
// of the contract matters: whether it starts a resolve, and whether it cancels one.
vi.mock('../../scripts/dashboard/PiNS.vue', async () => {
    const { defineComponent } = await import('vue');
    return {
        default: defineComponent({
            setup(_, { expose }) {
                expose({
                    resolveAndVerify: (...args) => h.resolve(...args),
                    cancel: () => h.cancel(),
                });
                return () => null;
            },
        }),
    };
});

vi.mock('../../scripts/global.js', () => ({
    start: vi.fn(),
    doms: {},
    updateLogOutButton: vi.fn(),
}));
vi.mock('../../scripts/network/network_manager.js', () => ({
    getNetwork: () => ({ enabled: true, getBlockCount: () => 1 }),
}));
vi.mock('../../scripts/composables/use_wallet.js', async () => {
    const { defineStore } = await import('pinia');
    const { ref } = await import('vue');
    const useWallets = defineStore('wallets-mock', () => {
        const activeWallet = ref(h.wallet);
        const activeVault = ref({ isEncrypted: true, isViewOnly: false });
        const vaults = ref([{ isEncrypted: true, isViewOnly: false }]);
        return { activeWallet, activeVault, vaults, addVault: vi.fn() };
    });
    return { useWallets };
});

/** A real Sapling address, so nothing rejects it before the guards are reached. */
const SHIELD_ADDRESS =
    'ps19wd4eft4mw2mlwad6tjrny5hlvtdxymatu2e3dge7jr6scqask0llvdsa3xhx06499vmzymatxr';
/** Somebody else's address, for contacts that should or should not win. */
const OTHER_ADDRESS = 'DLabsktzGMnsK5K9uRTMCF6NoYNY6ET4Bb';

describe('Dashboard wallet-state guards on the name service path', () => {
    let nAlertsBefore = 0;
    let fnBuilder;

    beforeEach(() => {
        setActivePinia(createPinia());
        nAlertsBefore = AlertController.getInstance().getAlerts().length;

        h.resolve = vi.fn();
        h.cancel = vi.fn();
        fnBuilder = vi.fn(
            () => new Promise((resolve) => setTimeout(() => resolve({}), 50))
        );
        const createAndSendTransaction = lockableFunction(fnBuilder);
        h.wallet = {
            sync: async () => true,
            isSynced: true,
            hasShield: true,
            getKeyToExport: () => 'xpub',
            isHardwareWallet: false,
            createAndSendTransaction,
            isCreatingTransaction: () => createAndSendTransaction.isLocked(),
        };
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    function newAlerts() {
        return AlertController.getInstance()
            .getAlerts()
            .slice(nAlertsBefore)
            .map((a) => String(a.message));
    }

    async function mountDashboard() {
        const Dashboard = (
            await import('../../scripts/dashboard/Dashboard.vue')
        ).default;
        return mount(Dashboard);
    }

    it('refuses a resolved name send while another transaction is being built', async () => {
        const wrapper = await mountDashboard();

        // Something else took the lock while the name was being resolved.
        h.wallet.createAndSendTransaction(
            'DLabsktzGMnfKUuLTrRZKoVtrfMHvyM6bB',
            1
        );
        expect(h.wallet.isCreatingTransaction()).toBe(true);

        await wrapper.vm.onPinsSend({
            address: SHIELD_ADDRESS,
            amount: 1,
            useShieldInputs: false,
            memo: '',
        });

        expect(
            newAlerts().some((m) =>
                m.includes('Already creating a transaction')
            )
        ).toBe(true);
        // and the send did not quietly evaporate into the other transaction
        const arrTargets = fnBuilder.mock.calls.map((c) => c[0]);
        expect(arrTargets).not.toContain(SHIELD_ADDRESS);
    });

    it('refuses a resolved name send while the wallet is still syncing', async () => {
        h.wallet.isSynced = false;
        const wrapper = await mountDashboard();

        await wrapper.vm.onPinsSend({
            address: SHIELD_ADDRESS,
            amount: 1,
            useShieldInputs: false,
            memo: '',
        });

        expect(newAlerts().length).toBeGreaterThan(0);
        const arrTargets = fnBuilder.mock.calls.map((c) => c[0]);
        expect(arrTargets).not.toContain(SHIELD_ADDRESS);
    });

    /** The addresses the transaction builder was actually handed. */
    function builtFor() {
        return fnBuilder.mock.calls.flat();
    }

    function withContacts(arrContacts) {
        const cAccount = new Account({ contacts: arrContacts });
        vi.spyOn(Database, 'getInstance').mockResolvedValue({
            getAccount: async () => cAccount,
        });
    }

    it('does not resolve a name for a wallet that cannot send', async () => {
        h.wallet.isSynced = false;
        const wrapper = await mountDashboard();

        await wrapper.vm.send('victim.pivx', 1, false, '');

        expect(newAlerts().length).toBeGreaterThan(0);
        expect(h.resolve).not.toHaveBeenCalled();
    });

    it('hands a plain name to the name service', async () => {
        const wrapper = await mountDashboard();
        withContacts([]);

        await wrapper.vm.send('victim.pivx', 1, false, '');

        expect(h.resolve).toHaveBeenCalledWith('victim.pivx', 1, false, '');
    });

    /**
     * The contact picker fills in labels, and contacts predate the name service. A
     * private nickname like `dad.pivx` that a stranger has since registered must not
     * quietly pay the stranger - and a label planted by a contact link must not
     * quietly shadow a real name either. Neither reading is safe, so neither is taken.
     */
    it('refuses a contact label that is also a registrable name', async () => {
        const wrapper = await mountDashboard();
        withContacts([{ label: 'Dad.pivx', pubkey: OTHER_ADDRESS }]);

        await wrapper.vm.send('dad.pivx', 1, false, '');

        expect(newAlerts().length).toBeGreaterThan(0);
        expect(h.resolve).not.toHaveBeenCalled();
        expect(builtFor()).not.toContain(OTHER_ADDRESS);
    });

    it('treats a name-shaped label nobody can register as a plain contact', async () => {
        const wrapper = await mountDashboard();
        withContacts([{ label: 'my dad.pivx', pubkey: OTHER_ADDRESS }]);

        await wrapper.vm.send('my dad.pivx', 1, false, '');

        expect(h.resolve).not.toHaveBeenCalled();
        expect(builtFor()).toContain(OTHER_ADDRESS);
    });

    it('cancels a name send when the transfer menu closes', async () => {
        const wrapper = await mountDashboard();
        wrapper.vm.showTransferMenu = true;
        await nextTick();
        expect(h.cancel).not.toHaveBeenCalled();

        wrapper.vm.showTransferMenu = false;
        await nextTick();
        expect(h.cancel).toHaveBeenCalled();
    });

    it('cancels a name send when the active wallet changes', async () => {
        await mountDashboard();
        const { useWallets } = await import(
            '../../scripts/composables/use_wallet.js'
        );
        useWallets().activeWallet = { ...h.wallet };
        await nextTick();
        expect(h.cancel).toHaveBeenCalled();
    });

    /**
     * What a proof verified is what gets paid. A contact labelled with that very address
     * cannot be created today - contact names stop at 32 characters - but that limit
     * belongs to an unrelated feature and was never put there for this.
     */
    it('never swaps a verified name address for a contact', async () => {
        const wrapper = await mountDashboard();
        withContacts([{ label: SHIELD_ADDRESS, pubkey: OTHER_ADDRESS }]);

        await wrapper.vm.onPinsSend({
            address: SHIELD_ADDRESS,
            amount: 1,
            useShieldInputs: false,
            memo: '',
        });

        expect(builtFor()).toContain(SHIELD_ADDRESS);
        expect(builtFor()).not.toContain(OTHER_ADDRESS);
    });

    it('still sends to a contact by name on the ordinary path', async () => {
        const wrapper = await mountDashboard();
        withContacts([{ label: 'Bob', pubkey: OTHER_ADDRESS }]);

        await wrapper.vm.send('Bob', 1, false, '');

        expect(builtFor()).toContain(OTHER_ADDRESS);
    });
});
