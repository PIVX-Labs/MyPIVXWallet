import { ref } from 'vue';
import { getEventEmitter } from '../event_bus.js';
import { defineStore } from 'pinia';

export const useNetwork = defineStore('network', () => {
    const explorerUrl = ref('');

    getEventEmitter().on('explorer_changed', (url) => {
        explorerUrl.value = url;
    });
    return {
        explorerUrl,
    };
});
