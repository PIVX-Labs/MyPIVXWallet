<script setup>
import { HistoricalTx } from '../historical_tx';
import Modal from '../Modal.vue';

const props = defineProps({
    selectedTx: HistoricalTx,
});
const emit = defineEmits(['close']);
</script>

<template>
    <Modal :show="props.selectedTx" v-if="props.selectedTx">
        <template #header>
            <button
                @click="emit('close')"
                type="button"
                class="close"
                data-dismiss="modal"
                aria-label="Close"
            >
                <i class="fa-solid fa-xmark closeCross"></i>
            </button>
        </template>
        <template #body>
            <!-- For now just show memo -->
            {{ props.selectedTx.memos.join('\n') }}
        </template>
    </Modal>
</template>
