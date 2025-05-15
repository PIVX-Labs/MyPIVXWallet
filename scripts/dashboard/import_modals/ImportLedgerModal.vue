<script setup>
import { translation } from '../../i18n.js';
import { ref } from 'vue';
import Modal from '../../Modal.vue';

const walletName = ref('');
const show = ref(false);
function submit() {
    console.log('Todo');
}
</script>

<template>
    <Modal :show="show" modalClass="exportKeysModalColor">
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
                        if it's plugged in and unlocked. (??) <br /><br />
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
                    <input v-model="walletName" type="text" />
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
