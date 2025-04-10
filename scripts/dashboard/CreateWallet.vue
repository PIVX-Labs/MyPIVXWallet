<script setup>
import pLogo from '../../assets/p_logo.svg';
import Modal from '../Modal.vue';
import { generateMnemonic } from 'bip39';
import { translation } from '../i18n.js';
import { ref, watch, toRefs } from 'vue';
import { useWallet } from '../composables/use_wallet.js';
import newWalletIcon from '../../assets/icons/icon-new-wallet.svg';
import Password from '../Password.vue';
import { getNetwork } from '../network/network_manager.js';

const emit = defineEmits(['importWallet']);
const showModal = ref(false);
const mnemonic = ref('');
const passphrase = ref('');

const props = defineProps({
    advancedMode: Boolean,
    importLock: Boolean,
});
const { advancedMode, importLock } = toRefs(props);

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
    if (importLock.value) return;
    mnemonic.value = generateMnemonic();
    const network = getNetwork();

    await informUserOfMnemonic();
    emit(
        'importWallet',
        mnemonic.value,
        passphrase.value,
        await network.getBlockCount()
    );
    // Erase mnemonic and passphrase from memory, just in case
    mnemonic.value = '';
    passphrase.value = '';
}
</script>

<template>
    <div class="col-12 col-md-6 col-xl-3 p-2">
        <div
            class="dashboard-item dashboard-display"
            @click="generateWallet()"
            data-testid="generateWallet"
        >
            <div class="coinstat-icon" v-html="newWalletIcon"></div>
            <div class="col-md-12 dashboard-title">
                <h3 class="pivx-bold-title-smaller">
                    <span> {{ translation.dCardOneTitle }} </span>
                    <div>{{ translation.dCardOneSubTitle }}</div>
                </h3>
                <p>
                    {{ translation.dCardOneDesc }}
                </p>
            </div>
        </div>
    </div>
    <Teleport to="body">
        <modal :show="showModal" @close="showModal = false">
            <template #body>
                <p class="modal-label"></p>
                <div class="auto-fit">
                    <span v-html="translation.thisIsYourSeed"></span>
                    <b>
                        <div
                            translate="no"
                            class="seed-phrase noselect notranslate"
                        >
                            {{ mnemonic }}
                        </div>
                    </b>
                    <br />
                    <span v-html="translation.writeDownSeed"></span>
                    <br />
                    <span v-html="translation.doNotShareWarning"> </span>
                    <br />
                    <b> {{ translation.doNotShare }} </b>
                    <br />
                    <br />
                    <a
                        href="https://www.ledger.com/blog/how-to-protect-your-seed-phrase"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <i v-html="translation.digitalStoreNotAdvised"></i>
                    </a>
                    <br />
                    <div v-if="advancedMode">
                        <br />
                        <Password
                            v-model:password="passphrase"
                            testid="passPhrase"
                            :placeholder="translation.optionalPassphrase"
                        />
                    </div>
                </div>
            </template>
            <template #footer>
                <center>
                    <button
                        type="button"
                        class="pivx-button-big"
                        @click="showModal = false"
                        data-testid="seedphraseModal"
                    >
                        {{ translation.writtenDown }}
                    </button>
                </center>
            </template>
        </modal>
    </Teleport>
</template>
