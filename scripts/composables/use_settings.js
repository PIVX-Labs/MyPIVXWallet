import { getEventEmitter } from '../event_bus.js';
import { ref, watch } from 'vue';
import {
    nDisplayDecimals,
    fAdvancedMode,
    debug as rawDebug,
    toggleDebug,
    toggleTestnet,
} from '../settings.js';
import { cChainParams } from '../chain_params.js';

export function useSettings() {
    const advancedMode = ref(fAdvancedMode);
    const displayDecimals = ref(0);
    const autoLockWallet = ref(false);
    const debug = ref(rawDebug);
    const isTestnet = ref(cChainParams.current === cChainParams.testnet);

    getEventEmitter().on('toggle-network', () => {
        isTestnet.value = cChainParams.current === cChainParams.testnet;
    });

    getEventEmitter().on('toggle-debug', () => {
        debug.value = rawDebug;
    });

    watch(debug, () => {
        toggleDebug(debug.value);
    });

    watch(isTestnet, async () => {
        await toggleTestnet(isTestnet.value);
        isTestnet.value = cChainParams.current === cChainParams.testnet;
    });

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
        debug,
        isTestnet,
    };
}
