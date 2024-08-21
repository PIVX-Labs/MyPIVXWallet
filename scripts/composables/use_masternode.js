import { ref, watch, toRaw, reactive } from 'vue';
import { defineStore } from 'pinia';
import Masternode from '../masternode.js';
import { Database } from '../database.js';
import { getEventEmitter } from '../event_bus.js';

export const useMasternode = defineStore('masternode', () => {
    /**
     * @type{import('vue').Ref<Masternode?>}
     */
    const masternode = ref(null);
    const localProposals = ref(null);
    watch(localProposals, async () => {
        const database = await Database.getInstance();
        const account = await database.getAccount();
        if (account) {
            account.localProposals = toRaw(localProposals.value);
            await database.updateAccount(account);
        }
    });
    const fetchProposalsFromDatabase = async () => {
        const database = await Database.getInstance();
        const account = await database.getAccount();
        localProposals.value = account?.localProposals;
    };

    const fetchMasternodeFromDatabase = async () => {
        const database = await Database.getInstance();
        masternode.value = await database.getMasternode();
    };

    watch(masternode, async () => {
        const database = await Database.getInstance();
        await database.addMasternode(toRaw(masternode.value));
    });

    fetchProposalsFromDatabase().then(() => {});
    fetchMasternodeFromDatabase().then(() => {});
    getEventEmitter().on('toggle-network', () => {
        fetchProposalsFromDatabase().then(() => {});
        fetchMasternodeFromDatabase().then(() => {});
    });
    return { masternode, localProposals };
});
