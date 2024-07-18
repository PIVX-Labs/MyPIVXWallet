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
                <div class="bottomPopupHeader" style="justify-content: center;">
                    <div class="sendHeaderoText">{{ title }}</div>
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
    font-size: 15px;
    border: 1px solid #42117e;
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

.bottomPopup-enter-active .bottomPopup-leave-active {
    transition: all 0.3 ease;
}
.bottomPopupExit {
    position: absolute;
    right: 15px;
}

.popupBody {
    padding: 9px 17px;
}
</style>
