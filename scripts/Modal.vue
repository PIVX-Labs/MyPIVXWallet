<script setup>
const props = defineProps({
    show: Boolean,
    modalClass: String,
    centered: Boolean,
});
</script>

<template>
    <Transition name="modal">
        <div v-if="show" class="modal-mask black-text">
            <div class="modal-dialog" role="document">
                <div
                    class="modal-content exportKeysModalColor"
                    :class="modalClass"
                >
                    <div class="modal-header" v-if="!!$slots.header">
                        <slot name="header"></slot>
                    </div>
                    <div
                        class="modal-body"
                        :class="{ 'center-text': !centered }"
                        style="padding-bottom: 8px; overflow: auto"
                    >
                        <slot name="body"></slot>
                    </div>
                    <div class="modal-footer" v-if="!!$slots.footer">
                        <slot name="footer"> </slot>
                    </div>
                </div>
            </div>
        </div>
    </Transition>
</template>

<style>
.modal-mask {
    position: fixed;
    z-index: 2000;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: #201436db;
    backdrop-filter: blur(3px);
    display: flex;
    justify-content: center;
}

.modal-enter-active,
.modal-leave-active {
    transition: opacity var(--mpw-dur-slow) var(--mpw-ease-out);
}

.modal-enter-active .modal-dialog,
.modal-leave-active .modal-dialog {
    transition: transform var(--mpw-dur-slow) var(--mpw-ease-out);
}

.modal-enter-from,
.modal-leave-to {
    opacity: 0;
}

.modal-enter-from .modal-dialog {
    transform: translateY(14px) scale(0.96);
}

.modal-leave-to .modal-dialog {
    transform: translateY(6px) scale(0.98);
}

.black-text {
    color: black;
}
</style>
