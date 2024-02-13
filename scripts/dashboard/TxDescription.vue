<script setup>
import Modal from '../Modal.vue';
import { translation } from '../i18n.js';
import { watch, ref, toRefs, defineProps } from 'vue';
import { getNetwork } from '../network';
import { COIN, cChainParams } from '../chain_params';
import { beautifyNumber } from '../misc';
/** @type {{show: boolean, tx: import('../mempool.js').HistoricalTx, wallet: import('../wallet.js').Wallet}} */
const props = defineProps({
    show: Boolean,
    tx: Object,
    wallet: Object,
    displayDecimals: Number,
});
const { show, tx, wallet, displayDecimals } = toRefs(props);
const emit = defineEmits(['close']);
const inputs = ref([]);
watch(tx, async () => {
    inputs.value = [];
    for (const input of tx.value.senders) {
        const inputTx = await getNetwork().getTxInfo(input.txid);
        const txout = inputTx.vout[input.n];

        inputs.value.push({
            address: txout.addresses[0],
            amount: txout.value,
        });
    }
});
function satsToStr(sats) {
    console.log(displayDecimals);
    return `${(sats / COIN).toFixed(displayDecimals.value)} ${
        cChainParams.current.TICKER
    }`;
}
</script>

<template>
    <Modal :show="show" modalClass="exportKeysModalColor">
        <template #header>
            <h5 class="modal-title">Transaction Description</h5>
            <button
                type="button"
                class="close"
                aria-label="Close"
                data-testid="closeBtn"
                @click="emit('close')"
            >
                <i class="fa-solid fa-xmark closeCross"></i>
            </button>
        </template>
        <template #body>
            <div>
                <code class="wallet-code"> {{ tx.id }} </code>
                <hr />
                <div class="tx-container">
                    <div class="io-container">
                        <div
                            v-for="input in inputs"
                            style="
                                display: flex;
                                flex-direction: row;
                                margin: 10px;
                                gap: 10px;
                            "
                        >
                            <code class="wallet-code" style="color: white">
                                {{ input.address }}
                            </code>
                            <span style="flex-shrink: 0">
                                {{ satsToStr(input.amount) }}
                            </span>
                        </div>
                        <span v-if="!tx.senders.length">
                            {{ translation.noInputs }}
                        </span>
                    </div>
                    <p><i class="arrow down"></i></p>
                    <div class="io-container">
                        <div
                            v-for="output in tx.receivers"
                            style="
                                display: flex;
                                flex-direction: row;
                                margin: 10px;
                                gap: 10px;
                            "
                        >
                            <code class="wallet-code" style="">
                                {{ output.address }}
                            </code>
                            <span style="flex-shrink: 0">
                                {{ satsToStr(output.amount) }}
                            </span>
                        </div>

                        <span v-if="!tx.receivers.length">
                            {{ translation.noOutputs }}
                        </span>
                    </div>
                </div>
            </div>
        </template>
    </Modal>
</template>

<style>
.tx-container {
    display: flex;
    flex-direction: column;
}
.io-container {
    display: flex;
    flex-direction: column;
}
.arrow {
    border: solid white;
    border-width: 0 3px 3px 0;
    display: inline-block;
    padding: 3px;
}

.down {
    transform: rotate(45deg);
    -webkit-transform: rotate(45deg);
}
</style>
