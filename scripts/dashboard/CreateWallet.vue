<script setup>
import { generateMnemonic } from 'bip39';
import { translation } from '../i18n.js';
import { ref, watch, toRefs } from 'vue';
import newWalletIcon from '../../assets/icons/icon-new-wallet.svg';
import CreateWalletModal from './import_modals/CreateWalletModal.vue';
import { getNetwork } from '../network/network_manager.js';

const emit = defineEmits(['importWallet']);
const showModal = ref(false);
const mnemonic = ref('');
const passphrase = ref('');
const label = ref('');

const props = defineProps({
    advancedMode: Boolean,
    importLock: Boolean,
});
const { advancedMode, importLock } = toRefs(props);

watch(showModal, () => {
    if (!showModal.value) {
        // Erase mnemonic and passphrase from memory, just in case
        mnemonic.value = '';
        passphrase.value = '';
    }
});
async function createWallet() {
    const network = getNetwork();
    emit(
        'importWallet',
        mnemonic.value,
        passphrase.value,
        label.value,
        await network.getBlockCount()
    );
    showModal.value = false;
}

function generateWallet() {
    if (importLock.value) return;
    mnemonic.value = generateMnemonic();
    showModal.value = true;
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
    <CreateWalletModal
        :show="showModal"
        :seed="mnemonic"
        @close="showModal = false"
        @submit="createWallet()"
        :advanced-mode="advancedMode"
        v-model:passphrase="passphrase"
        v-model:label="label"
    />
</template>
