<script setup>
import { ref, watch, computed } from 'vue';
import Modal from '../../Modal.vue';
import CreateVotingGroup from './CreatingVotingGroup.vue';
import { translation } from '../../i18n';
import { useGroups } from '../../composables/use_groups';
import { storeToRefs } from 'pinia';
const props = defineProps({
    masternodes: Array,
});

const showCreateVotingGroup = ref(false);
const { groups, selectedGroup } = storeToRefs(useGroups());
const availableMasternodes = computed(() => {
    const map = new Map();
    debugger;
    for (const mn of props.masternodes) {
        map.set(mn.mnPrivateKey, mn);
    }
    // Slice 1 to remove the `All` group
    for (const group of groups.value.slice(1)) {
        for (const mnKey of group.masternodes) {
            map.delete(mnKey);
        }
    }
    return Array.from(map.values());
});

const selectedMasternodes = defineModel('selectedMasternodes', { default: [] });
watch(
    () => props.masternodes,
    () => {
        selectedMasternodes.value = props.masternodes;
    }
);
const emit = defineEmits(['close']);
</script>
<template>
    <Modal :show="true" :width="800">
        <template #header>
            {{ translation.votingGroupListTitle }}
            <div @click="emit('close')">CLOSE</div>
        </template>
        <template #body>
            <table class="table-auto w-full border border-gray-300 rounded-md">
                <thead>
                    <tr>
                        <th class="px-4 py-2 text-left">
                            {{ translation.group }}
                        </th>
                        <th class="px-4 py-2 text-center">
                            {{ translation.mnNumber }}
                        </th>
                        <th class="px-4 py-2 text-center">
                            {{ translation.weight }}
                        </th>
                        <th class="px-4 py-2 text-center">
                            {{ translation.actions }}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="group in groups" :key="group.name">
                        <td class="px-4 py-2 font-medium">{{ group.name }}</td>
                        <td class="px-4 py-2 text-center">
                            {{ group.mnNumber() }}
                        </td>
                        <td class="px-4 py-2 text-center">
                            {{
                                (
                                    (group.mnNumber() /
                                        props.masternodes.length) *
                                    100
                                ).toFixed(0)
                            }}%
                        </td>
                        <td class="px-4 py-2 text-center flex">
                            <button
                                class="bg-blue-600 text-white text-sm px-3 py-1 rounded hover:bg-blue-700"
                                @click="
                                    selectedGroup = group;
                                    emit('close');
                                "
                            >
                                Vote
                            </button>
                            <button
                                v-if="group.editable"
                                class="ml-2 bg-gray-300 text-white text-sm px-3 py-1 rounded hover:bg-gray-400"
                            >
                                Edit
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>

            <button
                class="mt-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                @click="showCreateVotingGroup = true"
                v-if="availableMasternodes.length"
            >
                Create New Group
            </button>
        </template>
    </Modal>
    <CreateVotingGroup
        @close="showCreateVotingGroup = false"
        :masternodes="masternodes"
        :available-masternodes="availableMasternodes"
        :show="showCreateVotingGroup"
    />
</template>
<style>
.masternode-item {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
}

.masternode-checkbox {
    accent-color: #4caf50;
    width: auto;
    height: auto;
    margin-bottom: 0px;
}

.masternode-label {
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0px;
}

.masternode-addr {
    font-family: monospace;
}
</style>
