import { ref, watch, toRaw } from 'vue';
import { defineStore } from 'pinia';
import Masternode from '../masternode.js';
import { Database } from '../database.js';
import { getEventEmitter } from '../event_bus.js';

export const useMasternode = defineStore('masternode', () => {
    /**
     * @type{import('vue').Ref<Masternode?>}
     */
    const masternode = ref(null);
    const fetchMasternodeFromDatabase = async () => {
        const database = await Database.getInstance();
        masternode.value = await database.getMasternode();
    };
    fetchMasternodeFromDatabase().then(() => {});
    getEventEmitter().on('toggle-network', () => {
        fetchMasternodeFromDatabase().then(() => {});
    });
    watch(masternode, async () => {
        const database = await Database.getInstance();
        await database.addMasternode(
            JSON.parse(JSON.stringify(masternode.value))
        );
    });
    return { masternode };
});
