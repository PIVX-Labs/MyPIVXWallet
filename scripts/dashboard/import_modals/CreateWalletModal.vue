<script setup>
import Modal from '../../Modal.vue';
import { translation } from '../../i18n.js';

const props = defineProps({
    seed: String,
    show: Boolean,
    advancedMode: Boolean,
});
const emit = defineEmits(['submit', 'close']);
const passphrase = defineModel('passphrase');
const label = defineModel('label');

function close() {
    emit('close');
}
function submit() {
    emit('submit');
}
</script>
<template>
    <Modal :show="props.show" modalClass="exportKeysModalColor">
        <template #header>
            <h5 class="modal-title modal-title-new">
                {{ translation.createANewPivxWallet }}
            </h5>
        </template>
        <template #body>
            <div style="color: #a49bb5" data-testid="seedphraseModal">
                <center>
                    <div style="color: #c4becf !important">
                        {{ translation.thisIsYourSeed }}
                        <span v-html="translation.writeDownSeed"></span>
                        <br />
                        <span v-html="translation.doNotShateWarning"></span>
                        <br />
                        <br />
                    </div>
                </center>

                <div
                    style="
                        display: flex;
                        justify-content: center;
                        flex-wrap: wrap;
                    "
                >
                    <div
                        class="privateKeysBadgeWrapper"
                        v-for="(word, i) of props.seed.split(' ')"
                    >
                        {{ i }} <br />
                        <div class="privateKeysBadge">
                            <span>{{ word }}</span>
                        </div>
                    </div>
                </div>
                <br />

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
                        type="text"
                        style="margin-bottom: 0px"
                        data-testid="labelInput"
                        v-model="label"
                    />
                </div>
                <br v-if="advancedMode" />

                <div style="text-align: left" v-if="advancedMode">
                    <span
                        style="
                            margin-bottom: 3px;
                            font-size: 15px;
                            display: block;
                            margin-left: 6px;
                            margin-top: 6px;
                        "
                        >{{ translation.optionalPassphrase }}
                    </span>
                    <input
                        type="text"
                        data-testid="passPhrase"
                        style="margin-bottom: 0px"
                        v-model="passphrase"
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
                <button class="pivx-button-big">
                    <span
                        @click="submit()"
                        data-testid="wroteSeedphraseDown"
                        aclass="buttoni-text"
                    >
                        {{ translation.wroteItDown }}
                    </span>
                </button>
            </center>
        </template>
    </Modal>
</template>
