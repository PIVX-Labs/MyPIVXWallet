import { getEventEmitter } from '../event_bus.js';
import { ref, watch } from 'vue';
import { nDisplayDecimals, fAdvancedMode } from '../settings.js';
import { defineStore } from 'pinia';
import { Database } from '../database.js';

export const useSettings = defineStore('settings', () => {
    const advancedMode = ref(fAdvancedMode);
    const displayDecimals = ref(0);
    const autoLockWallet = ref(false);
    const accountIndex = ref(0);
    (async () => {
        const database = await Database.getInstance();
        const settings = await database.getSettings();
        accountIndex.value = settings?.accountIndex ?? 0;
        watch(accountIndex, async () => {
            const database = await Database.getInstance();
            const settings = await database.getSettings();
            settings.accountIndex = accountIndex.value;
            await database.setSettings(settings);
        });
    })();

    getEventEmitter().on('advanced-mode', (fAdvancedMode) => {
        advancedMode.value = fAdvancedMode;
    });
    getEventEmitter().on('balance-update', async () => {
        displayDecimals.value = nDisplayDecimals;
    });
    getEventEmitter().on('auto-lock-wallet', (fAutoLockWallet) => {
        autoLockWallet.value = fAutoLockWallet;
    });
    getEventEmitter().on('account-index', (accountIndex) => {
        accountIndex.value = accountIndex;
    });
    return {
        advancedMode,
        displayDecimals,
        autoLockWallet,
        accountIndex,
    };
});
