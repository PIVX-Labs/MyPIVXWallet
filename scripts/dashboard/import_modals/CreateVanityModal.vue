<script setup>
import { ref } from 'vue';
import Modal from '../../Modal.vue';
import { translation } from '../../i18n';
import { cChainParams } from '../../chain_params';

const show = ref(false);
</script>
<template>
    <Modal :show="show" modalClass="exportKeysModalColor">
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
                        <u
                            ><div v-html="translation.walletsStart"></div>
                            <b>{{
                                cChainParams.current.PUBKEY_PREFIX.join(' or ')
                            }}</b></u
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
                    <input type="text" />

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
                    <input type="text" />
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
                    <span class="buttoni-text"> Create Wallet </span>
                </button>
            </center>
        </template>
    </Modal>
</template>
