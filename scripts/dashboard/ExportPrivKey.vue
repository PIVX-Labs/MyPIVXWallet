<script setup>
import Modal from '../Modal.vue';
import { ref } from 'vue';
import { translation } from '../i18n.js';
import KeyPng from '../../assets/key.png';
const props = defineProps({
    privateKey: String,
    show: Boolean,
});
const blur = ref(true);

const emit = defineEmits(['close']);

function close() {
    blur.value = true;
    emit('close');
}
</script>

<template>
    <Teleport to="body">
        <Modal :show="show" modalClass="exportKeysModalColor">
            <template #header>
                <h5 class="modal-title">
                    {{ translation.privateKey }}
                </h5>
                <button
                    type="button"
                    class="close"
                    @click="close()"
                    aria-label="Close"
                    data-testid="closeBtn"
                >
                    <i class="fa-solid fa-xmark closeCross"></i>
                </button>
            </template>
            <template #body>
                <div class="dcWallet-privateKeyDiv text-center">
                    <img :src="KeyPng" /><br />
                    <h3>{{ translation.viewPrivateKey }}</h3>
                    <span class="span1">{{ translation.privateWarning1 }}</span>
                    <span class="span2">{{ translation.privateWarning2 }}</span>
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
                        class="pivx-button-big"
                        @click="blur = !blur"
                        data-testid="blurBtn"
                    >
                        <span data-i18n="viewKey" class="buttoni-text"
                            >{{ translation.viewKey }}
                        </span>
                    </button>
                </center>
            </template>
        </Modal>
    </Teleport>
</template>
