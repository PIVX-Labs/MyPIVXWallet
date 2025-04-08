import { ref, watch, toRaw } from 'vue';
import { defineStore } from 'pinia';
import { Database } from '../database.js';
import { getEventEmitter } from '../event_bus.js';

export const useMasternode = defineStore('masternode', () => {
    /**
     * @type{import('vue').Ref<import('../masternode.js').default[]?>}
     */
    const masternodes = ref([]);
    const localProposals = ref([]);
    watch(
        localProposals,
        async (localProposals) => {
            const database = await Database.getInstance();
            const account = await database.getAccount();
            if (account) {
                account.localProposals = toRaw(localProposals);
                await database.updateAccount(account, true);
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
        masternodes.value = await database.getMasternodes();
    };

    watch(
        masternodes,
        async () => {
            const database = await Database.getInstance();
            // Ideally we would avoid this db read,
            // but since adding and removing an array is a relatively rare occurrance
            // This shouldn't be much of a problem
            const storedMns = await database.getMasternodes();

            const hasMn = (mn, array) => {
                return array
                    .map((arrayMn) => arrayMn.mnPrivateKey)
                    .includes(mn.mnPrivateKey);
            };

            const toAdd = masternodes.value.filter(
                (mn) => !hasMn(mn, storedMns)
            );
            const toRemove = storedMns.filter(
                (storedMn) => !hasMn(storedMn, masternodes.value)
            );

            for (const mn of toAdd) {
                await database.addMasternode(toRaw(mn));
            }

            for (const mn of toRemove) {
                await database.removeMasternode(toRaw(mn));
            }
        },
        {
            deep: true,
        }
    );

    getEventEmitter().on('wallet-import', () => {
        fetchProposalsFromDatabase().then(() => {});
        fetchMasternodeFromDatabase().then(() => {});
    });
    getEventEmitter().on('toggle-network', () => {
        fetchProposalsFromDatabase().then(() => {});
        fetchMasternodeFromDatabase().then(() => {});
    });
    return { masternodes, localProposals };
});
