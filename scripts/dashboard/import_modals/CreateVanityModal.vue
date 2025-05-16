<script setup>
import Modal from '../../Modal.vue';
import { translation } from '../../i18n';
import { cChainParams } from '../../chain_params';

const label = defineModel('label');
const addressPrefix = defineModel('addressPrefix');
const props = defineProps({
    isGenerating: Boolean,
    attempts: Number,
    show: Boolean,
});
const emit = defineEmits(['close', 'submit']);
</script>
<template>
    <Modal :show="props.show" modalClass="exportKeysModalColor">
        <template #header>
            <h5 class="modal-title modal-title-new">
                {{ translation.createANewVanityWallet }}
            </h5>
        </template>
        <template #body>
            <div style="color: #a49bb5">
                <center>
                    <div style="color: #c4becf !important">
                        {{ translation.dCardTwoDesc }} <br />
                        <u>
                            <div v-html="translation.walletsStart"></div>
                            <b>{{
                                cChainParams.current.PUBKEY_PREFIX.join(' or ')
                            }}</b> </u
                        ><br /><br />
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
                        >{{ translation.vanityPrefixInput }}</span
                    >
                    <input
                        type="text"
                        v-model="addressPrefix"
                        :disabled="props.isGenerating"
                    />

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
                        :disabled="props.isGenerating"
                        v-model="label"
                    />
                </div>
            </div>

            <span
                style="
                    border: 2px solid rgb(80, 23, 151);
                    background: rgba(72, 15, 133, 0.49);
                    border-radius: 9px;
                    padding: 5px 13px;
                    margin-top: 2px;
                    margin-bottom: 8px;
                    font-family: monospace !important;
                    font-size: 15px;
                    width: 100%;
                "
                v-if="props.isGenerating"
            >
                Searched {{ props.attempts.toLocaleString('en-gb') }} keys
            </span>
        </template>
        <template #footer>
            <center>
                <button
                    type="button"
                    class="pivx-button-big-cancel"
                    data-testid="closeBtn"
                    @click="emit('close')"
                >
                    {{
                        isGenerating
                            ? translation.stop
                            : translation.popupCancel
                    }}
                </button>
                <button class="pivx-button-big" @click="emit('submit')">
                    <span class="buttoni-text"> Create Wallet </span>
                </button>
            </center>
        </template>
    </Modal>
</template>
