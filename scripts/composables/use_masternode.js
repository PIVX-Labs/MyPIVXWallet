import { ref, watch, toRaw } from 'vue';
import { defineStore } from 'pinia';
import { Database } from '../database.js';
import { getEventEmitter } from '../event_bus.js';

export const useMasternode = defineStore('masternode', () => {
    /**
     * @type{import('vue').Ref<import('../masternode.js').default?>}
     */
    const masternode = ref(null);
    const localProposals = ref([]);
    watch(
        localProposals,
        async () => {
            const database = await Database.getInstance();
            const account = await database.getAccount();
            if (account) {
                account.localProposals = toRaw(localProposals.value);
                await database.updateAccount(account);
            }
        },
        {
            // We need deep reactivity to detect proposal changes e.g. proposalHeight update when it gets confirmed
            deep: true,
        }
    );
    const fetchProposalsFromDatabase = async () => {
        const database = await Database.getInstance();
        const account = await database.getAccount();
        localProposals.value = account?.localProposals ?? [];
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
