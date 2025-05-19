<script setup>
import ledgerWallet from '../../assets/icons/icon-ledger-wallet.svg';
import VanityGen from './VanityGen.vue';
import CreateWallet from './CreateWallet.vue';
import AccessWallet from './AccessWallet.vue';
import ImportLedgerModal from './import_modals/ImportLedgerModal.vue';
import { toRefs, ref, watch } from 'vue';

const emit = defineEmits(['import-wallet']);

const isUSBSupported = !!navigator.usb;
const ledgerLabel = ref('');

const props = defineProps({
    advancedMode: Boolean,
});
const { advancedMode } = toRefs(props);
const showLedgerModal = ref(false);
const importLock = defineModel('importLock');

function importWallet(importObj) {
    if (!importLock.value) {
        importLock.value = true;
        emit('import-wallet', importObj);
    }
}

watch(showLedgerModal, () => {
    if (!showLedgerModal.value) {
        ledgerLabel.value = '';
    }
});
</script>

<template>
    <div class="row m-0">
        <CreateWallet
            :advanced-mode="advancedMode"
            @import-wallet="
                (mnemonic, password, label, blockCount) =>
                    importWallet({
                        type: 'hd',
                        secret: mnemonic,
                        password,
                        blockCount,
                        label,
                    })
            "
            :import-lock="importLock"
        />

        <br />

        <VanityGen
            @import-wallet="
                (wif, label) =>
                    importWallet({ type: 'legacy', secret: wif, label })
            "
        />

        <!-- ACCESS LEDGER HARDWARE WALLET -->
        <div class="col-12 col-md-6 col-xl-3 p-2">
            <div
                id="generateHardwareWallet"
                class="dashboard-item dashboard-display"
                :style="{ opacity: isUSBSupported ? 1 : 0.5 }"
                @click="showLedgerModal = true"
                data-testid="hardwareWalletBtn"
            >
                <div class="coinstat-icon" v-html="ledgerWallet"></div>

                <div class="col-md-12 dashboard-title">
                    <h3 class="pivx-bold-title" style="font-size: 25px">
                        <span data-i18n="dCardThreeTitle">Access your</span>
                        <div data-i18n="dCardThreeSubTitle">Ledger Wallet</div>
                    </h3>
                    <p data-i18n="dCardThreeDesc">
                        Use your Ledger Hardware wallet with MPW's familiar
                        interface.
                    </p>
                </div>
            </div>
        </div>

        <br />
        <AccessWallet
            :advancedMode="advancedMode"
            @import-wallet="
                (secret, password, label) =>
                    importWallet({ type: 'hd', secret, password, label })
            "
        />
        <ImportLedgerModal
            @submit="
                importWallet({ type: 'hardware', label: ledgerLabel });
                showLedgerModal = false;
            "
            @close="showLedgerModal = false"
            :show="showLedgerModal"
            :isSupported="isUSBSupported"
            v-label="ledgerLabel"
        />
    </div>
</template>
