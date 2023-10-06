<script setup>
import phone from '../../assets/phone.svg';
import pLogo from '../../assets/p_logo.svg';
import Modal from '../Modal.vue';
import { generateMnemonic } from 'bip39';
import { translation } from '../i18n.js';
import { ref, watch } from 'vue';
import { fAdvancedMode } from '../settings';

const emit = defineEmits(['importWallet']);
const showModal = ref(false);
const mnemonic = ref('');
const passphrase = ref('');

async function informUserOfMnemonic() {
    return await new Promise((res, _) => {
        showModal.value = true;
        const unwatch = watch(showModal, () => {
            if (!showModal.value) {
                unwatch();
                res(passphrase.value);
            }
        });
    });
}

async function generateWallet() {
    mnemonic.value = generateMnemonic();

    await informUserOfMnemonic();
    emit('importWallet', mnemonic.value, passphrase.value);
    // Erase mnemonic and passphrase from memory, just in case
    mnemonic.value = '';
    passphrase.value = '';
}
</script>

<template>
    <div class="col-12 col-lg-6 p-2">
        <div class="h-100 dashboard-item dashboard-display">
            <div class="coinstat-icon" v-html="phone"></div>
            <div class="col-md-12 dashboard-title">
                <h3 class="pivx-bold-title-smaller">
                    <span> {{ translation.dCardOneTitle }} </span>
                    <div>{{ translation.dCardOneSubTitle }}</div>
                </h3>
                <p>
                    {{ translation.dCardOneDesc }}
                </p>
            </div>

            <button class="pivx-button-big" @click="generateWallet()">
                <span class="buttoni-icon" v-html="pLogo"> </span>
                <span class="buttoni-text" data-i18n="ldCardOneButton"
                    >Create A New Wallet</span
                >
            </button>
        </div>
    </div>
    <Teleport to="body">
        <modal :show="showModal" @close="showModal = false">
            <template #body>
                <p class="modal-label"></p>
                <div class="auto-fit">
                    <span data-i18n="thisIsYourSeed"
                        >This is your seed phrase:</span
                    >
                    <b>
                        <div
                            translate="no"
                            class="seed-phrase noselect notranslate"
                        >
                            {{ mnemonic }}
                        </div>
                    </b>
                    <br />
                    <span data-i18n="writeDownSeed"
                        >Write it down somewhere. You'll only see this
                        <b>once!</b></span
                    >
                    <br />
                    <span data-i18n="doNotShareWarning"
                        >Anyone with a copy of it can access <b>all</b> of your
                        funds.</span
                    >
                    <br />
                    <b data-i18n="doNotShare">Do NOT share it with anybody.</b>
                    <br />
                    <br />
                    <a
                        href="https://www.ledger.com/blog/how-to-protect-your-seed-phrase"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <i data-i18n="digitalStoreNotAdvised"
                            >It is <b>NOT</b> advised to store this
                            digitally.</i
                        >
                    </a>
                    <br />
                    <div v-if="fAdvancedMode">
                        <br />
                        <input
                            class="center-text"
                            type="password"
                            :placeholder="translation.optionalPassphrase"
                            v-model="passphrase"
                        />
                    </div>
                </div>
            </template>
            <template #footer>
                <center>
                    <button
                        type="button"
                        data-i18n="writtenDown"
                        class="pivx-button-big"
                        @click="showModal = false"
                    >
                        I have written down my seed phrase
                    </button>
                </center>
            </template>
        </modal>
    </Teleport>
</template>
