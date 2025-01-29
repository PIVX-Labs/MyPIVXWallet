<script setup>
import Modal from './Modal.vue';

const emit = defineEmits(['close']);

const props = defineProps({
    show: Boolean,
    body: String,
});
</script>

<template>
    <Teleport to="body">
        <Modal :show="show">
            <template #body>
                <div class="tipBody">
                    <p class="tipText">{{ body }}</p>
                    <i
                        class="fa-solid fa-xmark closeButton"
                        @click="emit('close')"
                    ></i>
                </div>
            </template>
        </Modal>
    </Teleport>
</template>

<style>
.tipBody {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem;
}

.tipText {
    flex: 1;
    /* Take available space for the text */
    margin: 0;
    font-size: 1rem;
}
.closeButton {
    font-size: 1.25rem;
    position: absolute;
    top: 0.5rem;
    /* Adjust vertically */
    right: 0.5rem;
    /* Adjust horizontally */
    color: #999;
    cursor: pointer;
    transition: color 0.2s ease;
}
.closeButton:hover {
    color: #666;
}
</style>
