<script setup>
const { show, title } = defineProps({
    show: Boolean,
    title: String,
});
defineEmits(['close']);
</script>

<template>
    <div v-show="show" class="v-mask">
        <Transition name="bottomPopup">
            <div v-show="show" class="exportKeysModalColor bottomPopup">
                <div class="bottomPopupHeader">
                    <div class="sendHeaderoText">{{ title }}</div>
                    <div
                        class="bottomPopupExit ptr"
                        @click="$emit('close')"
                        data-testid="closeButton"
                    >
                        <i class="fa-solid fa-xmark"></i>
                    </div>
                </div>

                <div class="popupBody">
                    <slot> </slot>
                </div>
            </div>
        </Transition>
    </div>
</template>

<style>
.v-mask {
    position: fixed;
    z-index: 1050;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    transition: opacity 0.3s ease;
}
.bottomPopup {
    width: calc(100% - 30px);
    position: fixed;
    left: 15px;
    bottom: 0px;
    z-index: 1050;
    border-top-left-radius: 10px;
    border-top-right-radius: 10px;
    min-height: 155px;
    transition: 0.4s;
    /*background-color:rgba(255, 255, 255, 12%)!important;*/
    background-color: #5d2f83c9;

    font-size: 15px;
}
@media (min-width: 768px) {
    .bottomPopup {
        width: 310px !important;
        left: calc((100% - 310px) / 2) !important;
    }
}

.bottomPopup-enter-from,
.bottomPopup-leave-to {
    transform: translateY(200%);
}

.bottomPopup .bottomPopupHeader {
    padding: 9px 12px;
    display: flex;
}

.bottomPopup .bottomPopupHeader .bottomPopupHeaderText {
    width: 100%;
}

.bottomPopup-enter-active .bottomPopup-leave-active {
    transition: all 0.3 ease;
}
.bottomPopupExit {
    position: absolute;
    right: 15px;
}

.popupBody {
    padding: 9px 12px;
}
</style>
