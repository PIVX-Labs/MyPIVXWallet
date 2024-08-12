import { getEventEmitter } from '../event_bus.js';
import { ref, watch } from 'vue';
import { nDisplayDecimals, fAdvancedMode } from '../settings.js';
import { defineStore } from 'pinia';
import { Database } from '../database.js';

export const useSettings = defineStore('settings', () => {
    const advancedMode = ref(fAdvancedMode);
    const displayDecimals = ref(0);
    const autoLockWallet = ref(false);

    getEventEmitter().on('advanced-mode', (fAdvancedMode) => {
        advancedMode.value = fAdvancedMode;
    });
    getEventEmitter().on('balance-update', async () => {
        displayDecimals.value = nDisplayDecimals;
    });
    getEventEmitter().on('auto-lock-wallet', (fAutoLockWallet) => {
        autoLockWallet.value = fAutoLockWallet;
    });
    return {
        advancedMode,
        displayDecimals,
        autoLockWallet,
    };
});
