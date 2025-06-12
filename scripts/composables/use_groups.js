import { ref, watch } from 'vue';
import { defineStore, storeToRefs } from 'pinia';
import { Database } from '../database.js';
import { readonly } from 'vue';
import { Group } from '../group.js';
import { useMasternode } from './use_masternode.js';

export const useGroups = defineStore('groups', () => {
    const groups = ref([]);
    /**
     * @type {import('vue').Ref<Group> | null}
     */
    const selectedGroup = ref(null);
    const { masternodes } = storeToRefs(useMasternode());

    async function loadGroups() {
        const db = await Database.getInstance();
        groups.value = [
            new Group({
                name: 'All',
                masternodes: masternodes.value.map((m) => m.mnPrivateKey),
                editable: false,
            }),
            ...(await db.getGroups()),
        ];
	selectedGroup.value = groups.value[0];
    }

    watch(masternodes, () => {
	cleanGroups();
	loadGroups();
    }, {immediate: true})
    
    // Remove deleted mns from groups (TODO)
    function cleanGroups(groups) {}

    async function addGroup(group) {
        const database = await Database.getInstance();
        groups.value.push(group);
        await database.addGroup(group);
    }

    async function removeGroup(group) {
        const database = await Database.getInstance();
        await database.removeGroup(group);
        groups.value = await database.getGroups();
    }

    return {
        groups: readonly(groups),
        addGroup,
        removeGroup,
	selectedGroup,
    };
});
