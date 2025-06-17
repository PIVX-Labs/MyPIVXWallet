import { ref, watch, triggerRef, reactive } from 'vue';
import { defineStore, storeToRefs } from 'pinia';
import { Database } from '../database.js';
import { readonly } from 'vue';
import { Group } from '../group.js';
import { useMasternode } from './use_masternode.js';

export const useGroups = defineStore('groups', () => {
    /**
     * @type {import('vue').Ref<Group[]>}
     */
    const groups = ref([]);
    /**
     * @type {import('vue').Ref<Group> | null}
     */
    const selectedGroup = ref(null);
    const { masternodes } = storeToRefs(useMasternode());

    async function loadGroups() {
        const db = await Database.getInstance();
        groups.value = [
            reactive(
                new Group({
                    name: 'All',
                    masternodes: masternodes.value.map((m) => m.mnPrivateKey),
                    editable: false,
                })
            ),
            ...(await db.getGroups()).map((g) => reactive(g)),
        ];
        selectedGroup.value = groups.value[0];
    }

    watch(
        masternodes,
        async () => {
            await loadGroups();
            cleanGroups();
        },
        { immediate: true, deep: true }
    );

    function cleanGroups() {
        for (const group of groups.value.slice(1)) {
            group.masternodes = group.masternodes.filter((privateKey) =>
                masternodes.value
                    .map((m) => m.mnPrivateKey)
                    .includes(privateKey)
            );
        }
        triggerRef(groups);
    }

    async function addGroup(group) {
        const database = await Database.getInstance();
        groups.value = [...groups.value, reactive(group)];
        await database.addGroup(group);
    }

    async function removeGroup(group) {
        const database = await Database.getInstance();
        await database.removeGroup(group);
        groups.value = [
            reactive(
                new Group({
                    name: 'All',
                    masternodes: masternodes.value.map((m) => m.mnPrivateKey),
                    editable: false,
                })
            ),
            ...(await database.getGroups()).map((g) => reactive(g)),
        ];
        cleanGroups();
    }

    return {
        groups: readonly(groups),
        addGroup,
        removeGroup,
        selectedGroup,
    };
});
