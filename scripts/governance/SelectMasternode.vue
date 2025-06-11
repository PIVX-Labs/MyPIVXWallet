<script setup>
import { ref, watch } from 'vue';
import Modal from '../Modal.vue';
const props = defineProps({
    masternodes: Array,
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
    <Modal :show="true">
        <template #header>
            Hi
            <div @click="emit('close')">CLOSE</div>
        </template>
        <template #body>
            <div
                v-for="masternode of masternodes"
                :key="masternode.addr"
                class="masternode-item"
            >
                <i class="fas fa-server"></i>

                <input
                    type="checkbox"
                    class="masternode-checkbox"
                    :id="`mn-checkbox-${masternode.addr}`"
                    v-model="selectedMasternodes"
                    :value="masternode.addr"
                />
                <label
                    :for="`mn-checkbox-${masternode.addr}`"
                    class="masternode-label"
                >
                    <code
                        class="wallet-code text-center active ptr"
                        style="padding: 4px 9px"
                        >{{ masternode.addr }}</code
                    >
                </label>
            </div>
        </template>
    </Modal>
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
