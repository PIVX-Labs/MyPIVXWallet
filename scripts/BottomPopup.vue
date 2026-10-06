<script setup>
const { show, title } = defineProps({
    show: Boolean,
    title: String,
});
defineEmits(['close']);
</script>

<template>
    <Transition name="bottomPopupMask">
        <div v-show="show" class="v-mask" @click.self="$emit('close')"></div>
    </Transition>
    <Transition name="bottomPopup">
        <div v-show="show" class="exportKeysModalColor bottomPopup">
            <div class="bottomPopupHeader" style="justify-content: center">
                <div class="sendHeaderoText">{{ title }}</div>
            </div>

            <div class="popupBody">
                <slot> </slot>
            </div>
        </div>
    </Transition>
</template>

<style>
.v-mask {
    position: fixed;
    z-index: 1050;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(10, 4, 22, 0.6);
    backdrop-filter: blur(3px);
}
.bottomPopup {
    width: calc(100% - 30px);
    position: fixed;
    left: 15px;
    bottom: 0px;
    z-index: 1050;
    border-top-left-radius: var(--mpw-radius-lg);
    border-top-right-radius: var(--mpw-radius-lg);
    min-height: 155px;
    font-size: 15px;
    border: 1px solid #42117e;
    border-bottom: 0;
    box-shadow: 0 -18px 50px -20px rgba(146, 33, 255, 0.45);
}
@media (min-width: 768px) {
    .bottomPopup {
        width: 310px !important;
        left: calc((100% - 310px) / 2) !important;
    }
}

.bottomPopupMask-enter-active,
.bottomPopupMask-leave-active {
    transition: opacity var(--mpw-dur-slow) ease;
}
.bottomPopupMask-enter-from,
.bottomPopupMask-leave-to {
    opacity: 0;
}

.bottomPopup-enter-active {
    transition: transform 420ms var(--mpw-ease-out),
        opacity var(--mpw-dur-base) ease;
}
.bottomPopup-leave-active {
    transition: transform var(--mpw-dur-slow) cubic-bezier(0.4, 0, 1, 1),
        opacity var(--mpw-dur-slow) ease;
}
.bottomPopup-enter-from,
.bottomPopup-leave-to {
    transform: translateY(100%);
    opacity: 0.4;
}

.bottomPopup .bottomPopupHeader {
    padding: 9px 12px;
    display: flex;
}

.bottomPopup .sendHeaderoText {
    color: #e9deff;
    font-size: 21px;
    font-weight: 500;
    font-family: Montserrat, sans-serif !important;
    margin-top: 20px;
    margin-bottom: 15px;
}

.bottomPopup .bottomPopupHeader .bottomPopupHeaderText {
    width: 100%;
}

.bottomPopupExit {
    position: absolute;
    right: 15px;
}

.popupBody {
    padding: 9px 17px;
}
</style>
