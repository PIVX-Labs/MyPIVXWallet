import { ref, watch } from 'vue';
import { defineStore } from 'pinia';
import { Database } from '../database';
import { readonly } from 'vue';

export const useGroups = defineStore('groups', () => {
    const groups = ref([]);
    
    // Remove deleted rms from groups (TODO)
    function cleanGroups(groups) {
	
    }

    async function addGroup(group) {
	const database = await Database.getInstance();
	groups.push(group);
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
	removeGroup
    }
});
