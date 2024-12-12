<script setup>
import Modal from '../Modal.vue';
import { ref } from 'vue';
import { translation } from '../i18n.js';
import { downloadBlob } from '../misc';
import pIconExport from '../../assets/icons/icon-export.svg';
const props = defineProps({
    privateKey: String,
    // Note: isJSON should probably be temporary, maybe we have a "Wallet Type" enum that determines the export UI?
    isJSON: Boolean,
    show: Boolean,
});
const blur = ref(true);

const emit = defineEmits(['close']);

function downloadWalletFile() {
    downloadBlob(
        props.privateKey,
        'wallet.json',
        'application/json;charset=utf-8;'
    );
}

function close() {
    blur.value = true;
    emit('close');
}
</script>

<template>
    <Teleport to="body">
        <Modal :show="show" modalClass="exportKeysModalColor">
            <template #header>
                <h5 class="modal-title modal-title-new">
                    {{ translation.privateKey }}
                </h5>
            </template>
            <template #body>
                <div class="dcWallet-privateKeyDiv text-center">
                    <span class="span2"
                        >{{ translation.privateWarning1 }}
                        {{ translation.privateWarning2 }}</span
                    >
                    <code
                        :class="{ blurred: blur }"
                        data-testid="privateKeyText"
                        >{{ privateKey }}</code
                    >
                </div>
            </template>
            <template #footer>
                <center>
                    <button
                        type="button"
                        class="pivx-button-big-cancel"
                        data-testid="closeBtn"
                        @click="close()"
                    >
                        {{ translation.popupClose }}
                    </button>
                    <button
                        class="pivx-button-big"
                        @click="blur = !blur"
                        data-testid="blurBtn"
                    >
                        <span data-i18n="viewKey" class="buttoni-text"
                            >{{ translation.viewKey }}
                        </span>
                    </button>
                    <button
                        v-if="isJSON"
                        class="pivx-button-big"
                        @click="downloadWalletFile()"
                    >
                        <span
                            data-i18n="saveWalletFile"
                            class="buttoni-icon"
                            v-html="pIconExport"
                        >
                        </span>
                    </button>
                </center>
            </template>
        </Modal>
    </Teleport>
</template>
