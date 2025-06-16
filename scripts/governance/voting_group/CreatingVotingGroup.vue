<script setup>
import { translation } from '../../i18n.js';
import { computed, ref, watch } from 'vue';
import Modal from '../../Modal.vue';
import { Database } from '../../database';
import { useGroups } from '../../composables/use_groups.js';
import { Group } from '../../group';
import { toRaw } from 'vue';

const emit = defineEmits(['close']);
const { addGroup } = useGroups();

const props = defineProps({
    masternodes: Array,
    availableMasternodes: Array,
});

const groupName = ref('');
const mode = ref('count');
const mnCount = ref(1);
const selectedMNs = ref([]);

const selectedMasternodes = computed(() => {
    if (mode.value === 'manual') {
        return selectedMNs.value;
    } else {
        return props.availableMasternodes.slice(0, mnCount.value);
    }
});

function close() {
    groupName.value = '';
    mode.value = 'count';
    selectedMNs.value = [];
    mnCount.value = 1;
    emit('close');
}

const voteWeightPercent = computed(() => {
    if (props.masternodes.length === 0) return 0;
    return (
        (selectedMasternodes.value.length / props.masternodes.length) *
        100
    ).toFixed(1);
});

async function saveGroup() {
    if (!groupName.value.trim()) {
        alert('Group name is required');
        return;
    }

    await addGroup(
        new Group({
            name: groupName.value,
            masternodes: toRaw(selectedMasternodes.value),
            editable: true,
        })
    );
    close();
}
</script>

<template>
    <Modal :show="true">
        <template #header>
            {{ translation.createGroup }}
            <div @click="close()">CLOSE</div>
        </template>
        <template #body>
            <div class="p-4 max-w-3xl mx-auto space-y-6 flex flex-column">
                <div>
                    <label class="block text-sm font-medium mb-1">{{
                        translation.groupName
                    }}</label>
                    <input
                        v-model="groupName"
                        type="text"
                        class="w-full border border-gray-300 rounded px-3 py-2"
                        :placeholder="translation.groupNamePlaceholder"
                    />
                </div>

                <div class="p-4">
                    <label class="block text-sm font-medium mb-1">{{
                        translation.selectMasternodeBy
                    }}</label>
                    <div class="space-x-4 flex flex-row">
                        <label>
                            <input type="radio" value="count" v-model="mode" />
                            {{ translation.selectMasternodeAuto }}
                        </label>
                        <label>
                            <input type="radio" value="manual" v-model="mode" />
                            {{ translation.selectMasternodeManual }}
                        </label>
                    </div>
                </div>

                <div v-if="mode === 'count'">
                    <label class="block text-sm font-medium mt-4 mb-1">{{
                        translation.selectMasternodeNumber
                    }}</label>
                    <input
                        type="number"
                        min="1"
                        :max="props.availableMasternodes.length"
                        v-model.number="mnCount"
                        class="w-full border border-gray-300 rounded px-3 py-2"
                    />
                </div>

                <div v-if="mode === 'manual'">
                    <label class="block text-sm font-medium mt-4 mb-2">{{
                        translation.selectMasternodes
                    }}</label>
                    <div
                        class="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto border border-gray-200 p-2 rounded"
                    >
                        <div
                            v-for="mn in props.availableMasternodes"
                            :key="mn.addr"
                            class="flex items-center gap-2"
                        >
                            <input
                                type="checkbox"
                                :id="mn.addr"
                                v-model="selectedMNs"
                                :value="mn.mnPrivateKey"
                            />
                            <label :for="mn.addr" class="text-sm font-mono">{{
                                mn.addr
                            }}</label>
                        </div>
                    </div>
                </div>

                <div class="text-sm text-gray-700">
                    <p>
                        <strong>{{ translation.selectedMasternode }}</strong>
                        {{ selectedMasternodes.length }}
                    </p>
                    <p>
                        <strong>{{ translation.voteWeight }}</strong>
                        {{ voteWeightPercent }}%
                    </p>
                </div>

                <div class="pt-4">
                    <button
                        class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                        @click="saveGroup"
                    >
                        {{ translation.saveGroup }}
                    </button>
                </div>
            </div>
        </template>
    </Modal>
</template>
