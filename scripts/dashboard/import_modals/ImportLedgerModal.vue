<script setup>
import { translation } from '../../i18n.js';
import Modal from '../../Modal.vue';

const label = defineModel('label');
const props = defineProps({
    isSupported: Boolean,
    show: Boolean,
});
const emit = defineEmits(['submit', 'close']);
</script>

<template>
    <Modal :show="props.show" modalClass="exportKeysModalColor">
        <template #header>
            <h5 class="modal-title modal-title-new">
                {{ translation.accessPivxLedgerWallet }}
            </h5>
        </template>
        <template #body>
            <div style="color: #a49bb5">
                <center>
                    <div style="color: #c4becf !important">
                        {{ translation.dCardThreeDesc }}
                        <br /><br />
                        Compatible hardware wallet will be automatically found
                        if it's plugged in and unlocked.<br /><br />
                    </div>
                </center>

                <div style="text-align: left">
                    <span
                        style="
                            margin-bottom: 3px;
                            font-size: 15px;
                            display: block;
                            margin-left: 6px;
                            margin-top: 6px;
                        "
                        >{{ translation.customWalletName }}
                        <span style="color: #a082d9">{{
                            translation.maxEightChars
                        }}</span></span
                    >
                    <input
                        v-model="label"
                        maxlength="8"
                        data-testid="label"
                        type="text"
                    />
                    <div
                        :style="{ color: 'red' }"
                        v-if="!isSupported"
                        v-html="
                            translation.ALERTS.WALLET_HARDWARE_USB_UNSUPPORTED
                        "
                    ></div>
                </div>
            </div>
        </template>
        <template #footer>
            <center>
                <button
                    type="button"
                    class="pivx-button-big-cancel"
                    data-testid="closeBtn"
                    @click="emit('close')"
                >
                    {{ translation.popupCancel }}
                </button>
                <button
                    class="pivx-button-big"
                    :disabled="!isSupported"
                    :style="{ opacity: isSupported ? 1 : 0.5 }"
                    data-testid="accessHardwareWallet"
                    @click="emit('submit')"
                >
                    <span class="buttoni-text">
                        {{ translation.accessWallet }}
                    </span>
                </button>
            </center>
        </template>
    </Modal>
</template>
