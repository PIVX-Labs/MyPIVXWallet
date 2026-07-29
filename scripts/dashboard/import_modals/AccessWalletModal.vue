<script setup>
import { translation } from '../../i18n';
import Modal from '../../Modal.vue';
import { SENSITIVE_INPUT_ATTRS } from '../../dom_security.js';
import { ref, watch } from 'vue';

const value = defineModel('value');
const label = defineModel('label');
const password = defineModel('password');
const props = defineProps({
    show: Boolean,
    showPasswordField: Boolean,
    passwordPlaceholder: String,
});

/**
 * The secret is masked by default; the user opts in to revealing it to check
 * for typos. It must not default to cleartext, since the value is usually a
 * BIP39 mnemonic or a private key.
 */
const revealSecret = ref(false);

// Never leave the field revealed for the next time the modal is opened
watch(
    () => props.show,
    (show) => {
        if (!show) revealSecret.value = false;
    }
);
const emit = defineEmits(['submit', 'close']);
function submit() {
    emit('submit');
}
function close() {
    emit('close');
}
</script>

<template>
    <Modal
        v-show="props.show"
        :show="props.show"
        modalClass="exportKeysModalColor"
    >
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
                    <div class="input-group">
                        <input
                            :type="revealSecret ? 'text' : 'password'"
                            v-model="value"
                            data-testid="secretInp"
                            style="
                                width: 90%;
                                border-top-right-radius: 0;
                                border-bottom-right-radius: 0;
                            "
                            v-bind="SENSITIVE_INPUT_ATTRS"
                        />
                        <span
                            @click="revealSecret = !revealSecret"
                            class="input-group-toggle input-group-text p-0"
                            style="height: 100%"
                            data-testid="revealSecretBtn"
                        >
                            <i
                                :class="
                                    'fa-solid fa-' +
                                    (revealSecret ? 'eye' : 'eye-slash')
                                "
                            ></i>
                        </span>
                    </div>

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
                        <input
                            v-model="password"
                            data-testid="passwordInp"
                            type="password"
                            v-bind="SENSITIVE_INPUT_ATTRS"
                        />
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
                    <input
                        v-model="label"
                        maxlength="8"
                        data-testid="labelInput"
                        type="text"
                        v-bind="SENSITIVE_INPUT_ATTRS"
                    />
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
                <button
                    class="pivx-button-big"
                    data-testid="importWalletButton"
                    @click="submit()"
                >
                    <span class="buttoni-text">
                        {{ translation.accessWallet }}
                    </span>
                </button>
            </center>
        </template>
    </Modal>
</template>
