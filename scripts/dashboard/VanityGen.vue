<script setup>
import pLogo from '../../assets/p_logo.svg';
import vanityWalletIcon from '../../assets/icons/icon-vanity-wallet.svg';
import { ALERTS, translation, tr } from '../i18n.js';
import { ref, computed, watch, nextTick } from 'vue';
import { cChainParams } from '../chain_params.js';
import { MAP_B58 } from '../misc.js';
import { useAlerts } from '../composables/use_alerts.js';
import { debugLog, DebugTopics } from '../debug.js';
import CreateVanityModal from './import_modals/CreateVanityModal.vue';

const { createAlert } = useAlerts();
const addressPrefix = ref('');
const isGenerating = ref(false);
const addressPrefixShow = ref(false);
const attempts = ref(0);
const label = ref('');
/**
 * @type {Worker[]}
 */
const arrWorkers = [];

const emit = defineEmits(['import-wallet']);

watch(addressPrefix, (newValue, oldValue) => {
    if (newValue.length > oldValue.length) {
        const char = newValue.charAt(newValue.length - 1);
        if (!MAP_B58.toLowerCase().includes(char.toLowerCase())) {
            createAlert(
                'warning',
                tr(ALERTS.UNSUPPORTED_CHARACTER, [{ char }]),
                3500
            );
        }
    }
});

function closeModal() {
    if (isGenerating.value) {
        stop();
    } else {
        addressPrefixShow.value = false;
    }
}

function stop() {
    while (arrWorkers.length) {
        const worker = arrWorkers.pop();
        worker.terminate();
    }
    attempts.value = 0;
    isGenerating.value = false;
}

function generate() {
    if (isGenerating.value) return;

    if (typeof Worker === 'undefined')
        return createAlert('error', ALERTS.UNSUPPORTED_WEBWORKERS, 7500);
    if (addressPrefix.value.length === 0) {
        addressPrefixElement.value.focus();
        return;
    }

    // Remove space from prefix
    addressPrefix.value = addressPrefix.value.replace(/ /g, '');
    const prefix = addressPrefix.value.toLowerCase();
    for (const char of prefix) {
        if (!MAP_B58.toLowerCase().includes(char))
            return createAlert(
                'warning',
                tr(ALERTS.UNSUPPORTED_CHARACTER, [{ char: char }]),
                3500
            );
    }

    isGenerating.value = true;
    const nThreads = Math.max(
        Math.floor(window.navigator.hardwareConcurrency * 0.75),
        1
    );
    debugLog(
        DebugTopics.VANITY_GEN,
        'Spawning ' + nThreads + ' vanity search threads!'
    );
    for (let i = 0; i < nThreads; i++) {
        const worker = new Worker(
            new URL('../vanitygen_worker.js', import.meta.url)
        );

        const checkResult = ({ data }) => {
            attempts.value++;
            if (data.pub.substr(1, prefix.length).toLowerCase() === prefix) {
                try {
                    addressPrefixShow.value = false;
                    emit('import-wallet', data.priv, label.value);
                    debugLog(
                        DebugTopics.VANITY_GEN,
                        `VANITY: Found an address after ${attempts.value} attempts!`
                    );
                } finally {
                    // Stop search even if import fails
                    stop();
                }
            }
        };
        worker.onmessage = checkResult;
        worker.postMessage(cChainParams.current.name);
        arrWorkers.push(worker);
    }
}

watch(addressPrefixShow, () => {
    if (!addressPrefixShow.value) {
        addressPrefix.value = '';
        label.value = '';
    }
});
</script>

<style>
.v-enter-active,
.v-leave-active {
    transition: opacity 0.3s ease;
}

.v-enter-from,
.v-leave-to {
    opacity: 0;
}
</style>
<template>
    <div class="col-12 col-md-6 col-xl-3 p-2">
        <div
            class="dashboard-item dashboard-display"
            @click="addressPrefixShow = true"
            data-testid="vanityWalletButton"
        >
            <div class="coinstat-icon" v-html="vanityWalletIcon"></div>

            <div class="col-md-12 dashboard-title">
                <h3 class="pivx-bold-title" style="font-size: 25px">
                    <span data-i18n="dCardTwoTitle">Create a new</span>
                    <div data-i18n="dCardTwoSubTitle">Vanity Wallet</div>
                </h3>
                <p data-i18n="dCardTwoDesc">
                    Create a wallet with a custom prefix, this can take a long
                    time!
                </p>
            </div>
        </div>
    </div>
    <CreateVanityModal
        :isGenerating="isGenerating"
        :attempts="attempts"
        :show="addressPrefixShow"
        v-model:label="label"
        v-model:addressPrefix="addressPrefix"
        @submit="generate()"
        @close="closeModal()"
    />
</template>
