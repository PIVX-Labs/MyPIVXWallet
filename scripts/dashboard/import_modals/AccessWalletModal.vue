<script setup>
import { translation } from '../../i18n';
import Modal from '../../Modal.vue';

const value = defineModel('value');
const label = defineModel('label');
const password = defineModel('password');
const props = defineProps({
    show: Boolean,
    showPasswordField: Boolean,
    passwordPlaceholder: String,
    cloakSecret: Boolean,
});
const emit = defineEmits(['submit', 'close']);
function submit() {
    emit('submit');
}
function close() {
    emit('close');
}
</script>

<template>
    <Modal :show="props.show" modalClass="exportKeysModalColor">
        <template #header>
            <h5 class="modal-title modal-title-new">
                {{ translation.accessWallet }}
            </h5>
        </template>
        <template #body>
            <div style="color: #a49bb5">
                <center>
                    <div style="color: #c4becf !important">
                        {{ translation.importPivxWallet }}<br /><br />
                    </div>
                </center>

                <div style="text-align: left">
                    <span
                        style="
                            margin-bottom: 3px;
                            font-size: 15px;
                            display: block;
                            margin-left: 6px;
                        "
                        >{{ translation.seedPhraseXpriv }}</span
                    >
                    <input
                        :type="cloakSecret ? 'password' : 'text'"
                        v-model="value"
                        type="text"
                    />

                    <template v-if="props.showPasswordField">
                        <span
                            style="
                                margin-bottom: 3px;
                                font-size: 15px;
                                display: block;
                                margin-left: 6px;
                            "
                            >{{ props.passwordPlaceholder }}</span
                        >
                        <input v-model="password" type="text" />
                    </template>

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
                    <input v-model="label" type="text" />
                </div>
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
                    {{ translation.popupCancel }}
                </button>
                <button class="pivx-button-big" @click="submit()">
                    <span class="buttoni-text">
                        {{ translation.accessWallet }}
                    </span>
                </button>
            </center>
        </template>
    </Modal>
</template>
