<script setup>
import fire from '../../assets/fire.svg';
import pLogo from '../../assets/p_logo.svg';
import VanityGen from './VanityGen.vue';
import CreateWallet from './CreateWallet.vue';
import AccessWallet from './AccessWallet.vue';
import { watch, toRefs } from 'vue';

defineEmits(['import-wallet']);

const props = defineProps({
    advancedMode: Boolean,
});
const { advancedMode } = toRefs(props);
</script>

<template>
    <div class="row m-0">
        <CreateWallet
            :advanced-mode="advancedMode"
            @import-wallet="
                (mnemonic, password) =>
                    $emit('import-wallet', {
                        type: 'hd',
                        secret: mnemonic,
                        password,
                    })
            "
        />

        <br />

        <VanityGen
            @import-wallet="
                (wif) => $emit('import-wallet', { type: 'legacy', secret: wif })
            "
        />

        <!-- ACCESS LEDGER HARDWARE WALLET -->
        <div class="col-12 col-lg-3 p-2">
            <div
                id="generateHardwareWallet"
                class="dashboard-item dashboard-display"
            >
                <div class="coinstat-icon" v-html="fire"></div>

                <div class="col-md-12 dashboard-title">
                    <h3 class="pivx-bold-title" style="font-size: 25px">
                        <span data-i18n="dCardThreeTitle">Access your</span>
                        <div data-i18n="dCardThreeSubTitle">
                            Ledger Wallet
                        </div>
                    </h3>
                    <p data-i18n="dCardThreeDesc">
                        Use your Ledger Hardware wallet with MPW's familiar
                        interface.
                    </p>
                </div>

                <button
                    class="pivx-button-big"
                    @click="$emit('import-wallet', { type: 'hardware' })"
                    data-testid="hardwareWalletBtn"
                >
                    <span class="buttoni-icon" v-html="pLogo"> </span>

                    <span class="buttoni-text" data-i18n="dCardThreeButton"
                        >Access my Ledger</span
                    >
                </button>
            </div>
        </div>

        <br />
        <AccessWallet
            :advancedMode="advancedMode"
            @import-wallet="
                (secret, password) =>
                    $emit('import-wallet', { type: 'hd', secret, password })
            "
        />
    </div>
</template>
