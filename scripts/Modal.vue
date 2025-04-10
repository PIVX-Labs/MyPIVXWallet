<script setup>
const props = defineProps({
    show: Boolean,
    modalClass: String,
    centered: Boolean,
});
</script>

<template>
    <Transition
        name="modal"
        style="
            display: flex;
            justify-content: center;
            z-index: 2000;
            background-color: #201436db;
        "
    >
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
    z-index: 9998;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    transition: opacity 0.3s ease;
}

.modal-enter-from {
    opacity: 0;
}

.modal-leave-to {
    opacity: 0;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
    -webkit-transform: scale(1.1);
    transform: scale(1.1);
}
.black-text {
    color: black;
}
input,
select,
textarea {
    color: #000000;
}

textarea:focus,
input:focus {
    color: #000000;
}
</style>
