<script setup>
import { ref } from 'vue';
import Modal from '../../Modal.vue';
import { translation } from '../../i18n.js';

const show = ref(false);
const seed = ref('test test test test aerojaer aerjaepri jaerpaej rpaer');

function close() {}
function submit() {}
</script>
<template>
    <Modal :show="show" modalClass="exportKeysModalColor">
        <template #header>
            <h5 class="modal-title modal-title-new">
                {{ translation.createANewPivxWallet }}
            </h5>
        </template>
        <template #body>
            <div style="color: #a49bb5">
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
                        v-for="(word, i) of seed.split(' ')"
                    >
                        {{ i }} <br />
                        <div class="privateKeysBadge">
                            <span class="filterBlur">{{ word }}</span>
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
                    <input type="text" style="margin-bottom: 0px" />
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
                    <span @click="submit()" class="buttoni-text">
                        {{ translation.wroteItDown }}
                    </span>
                </button>
            </center>
        </template>
    </Modal>
</template>
