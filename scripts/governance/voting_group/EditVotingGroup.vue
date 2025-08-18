<script setup>
import { ref, watch } from 'vue';
import Modal from '../../Modal.vue';
import { translation } from '../../i18n.js';
import { useMasternode } from '../../composables/use_masternode';
import { Group } from '../../group';
const props = defineProps({
    groupToBeEdited: Object,
    availableMasternodes: Array,
});
const emit = defineEmits(['close', 'editGroup']);
const { masternodes } = useMasternode();

const groupName = ref();
const selectedMNs = ref([]);

const selectableMasternodes = ref();
function close() {
    emit(
        'close',
        new Group({
            name: groupName.value,
            masternodes: [...selectedMNs.value],
            editable: true,
        })
    );
    groupName.value = '';
    selectedMNs.value = [];
}
watch([() => props.groupToBeEdited, () => props.availableMasternodes], () => {
    if (!props.groupToBeEdited) return;
    selectableMasternodes.value = [
        ...props.groupToBeEdited.masternodes.map((m1) => {
            return { ...masternodes.find((m2) => m2.mnPrivateKey === m1) };
        }),
        ...props.availableMasternodes,
    ];
    selectedMNs.value = [...props.groupToBeEdited.masternodes];
});

watch(
    () => props.groupToBeEdited,
    () => {
        groupName.value = props.groupToBeEdited?.name;
    }
);
</script>

<template>
    <Modal :show="true">
        <template #header>
            Cool modal
            <div @click="close()">Close</div>
        </template>
        <template #body>
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
            <label class="block text-sm font-medium mt-4 mb-2">{{
                translation.selectMasternodes
            }}</label>
            <div
                class="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto border border-gray-200 p-2 rounded"
            >
                <div
                    v-for="mn in selectableMasternodes"
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
        </template>
    </Modal>
</template>
