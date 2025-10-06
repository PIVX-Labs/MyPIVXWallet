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
            <div class="memo-header">
                <h4 class="memo-title">
                    <i class="fa-solid fa-message-text memo-icon"></i>
                    Transaction Memo
                </h4>
                <button
                    @click="emit('close')"
                    type="button"
                    class="close"
                    data-dismiss="modal"
                    aria-label="Close"
                >
                    <i class="fa-solid fa-xmark closeCross"></i>
                </button>
            </div>
        </template>
        <template #body>
            <div class="memo-container">
                <div
                    v-if="
                        props.selectedTx.memos &&
                        props.selectedTx.memos.length > 0
                    "
                    class="memo-content"
                >
                    <div class="memo-text">
                        {{ props.selectedTx.memos.join('\n') }}
                    </div>
                </div>
                <div v-else class="memo-empty">
                    <i class="fa-solid fa-comment-slash empty-icon"></i>
                    <span>No memo attached to this transaction</span>
                </div>
            </div>
        </template>
    </Modal>
</template>

<style scoped>
.memo-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: 0 20px;
}

.memo-title {
    color: #d5adff !important;
    font-size: 22px;
    font-weight: 600;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 12px;
}

.memo-icon {
    color: #9221ff;
    font-size: 20px;
}

.memo-container {
    padding: 20px;
    min-height: 95px;
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.memo-content {
    background: linear-gradient(
        135deg,
        rgba(43, 9, 80, 0.4),
        rgba(115, 0, 255, 0.1)
    );
    border: 1px solid #6222ab;
    border-radius: 12px;
    padding: 20px;
    transition: all 0.3s ease-in-out;
    position: relative;
    overflow: hidden;
}

.memo-content::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background: linear-gradient(to bottom, #9221ff, #6410c7);
    border-radius: 2px;
}

.memo-text {
    color: #e9deff;
    font-size: 16px;
    line-height: 1.6;
    font-family: 'Montserrat', sans-serif;
    white-space: pre-wrap;
    word-wrap: break-word;
    margin: 0;
    position: relative;
    z-index: 1;
}

.memo-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #7a7387;
    font-size: 16px;
    gap: 15px;
    padding: 30px 20px;
}

.empty-icon {
    font-size: 32px;
    color: #7a7387;
    opacity: 0.6;
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .memo-header {
        padding: 0 15px;
    }

    .memo-title {
        font-size: 20px;
    }

    .memo-container {
        padding: 7px;
    }

    .memo-content {
        padding: 15px;
    }

    .memo-text {
        font-size: 15px;
    }
}
</style>
