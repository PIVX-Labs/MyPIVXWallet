<script setup>
import { toRefs, computed, ref } from 'vue';
import { tr, translation } from '../i18n.js';
import { COIN, cChainParams } from '../chain_params';
import IconArrow from '../../assets/icons/icon-arrow.svg';
const props = defineProps({
    synced: Boolean,
    balance: Number,
    possibleUTXOs: Array,
});
import PlusIcon from '../../assets/icons/icon-plus.svg';
import Modal from '../Modal.vue';

const { synced, balance, possibleUTXOs } = toRefs(props);
const showModal = ref(false);
const privateKey = ref('');
const ip = ref('');
const utxo = ref('');

const error = computed(() => {
    if (!synced.value) {
        return translation?.ALERTS?.MN_UNLOCK_WALLET;
    }
    const collat = cChainParams.current.collateralInSats / COIN;
    if (balance.value < collat) {
        return tr(translation?.ALERTS?.MN_NOT_ENOUGH_COLLAT, [
            { amount: (collat - balance.value).toFixed(2) },
            { ticker: cChainParams.current.TICKER },
        ]);
    }
    return '';
});

const emit = defineEmits(['createMasternode', 'importMasternode']);
const selection = ref();
function createMasternode() {
    emit('createMasternode', { isVPS: selection.value === 'VPS' });
}

function importMasternode() {
    emit('importMasternode', privateKey.value, ip.value, utxo.value);
}
</script>

<template>
    <div
        class="col-md-12 title-section float-left rm-pd center-text"
        style="padding-bottom: 0px"
    >
        <h3 style="margin-bottom: -2px">
            <span data-i18n="mnControlYour" style="font-weight: 300"
                >Control your</span
            >
        </h3>
        <h3 data-i18n="navMasternode" class="pivx-bold-title">Masternode</h3>
        <p data-i18n="mnSubtext" style="color: #beaed0">
            From this tab you can create and access one or more masternodes
        </p>
    </div>

    <div style="display: block">
        <br />
        <p class="center-text" data-testid="error" v-html="error"></p>
    </div>
    <div
        style="display: flex; justify-content: center; width: 100%"
        v-if="!error && !possibleUTXOs.length"
    >
        <button
            class="pivx-button-small"
            style="height: 42px; width: 228px"
            data-testid="createMasternodeButton"
            @click="showModal = true"
        >
            <span class="buttoni-text">
                <span class="plus-icon" v-html="PlusIcon"></span>
                Create Masternode</span
            >
        </button>
    </div>
    <center>
        <div
            id="accessMasternode"
            class="dashboard-item"
            style="display: inline-block; float: inherit"
            v-if="!error && possibleUTXOs.length"
        >
            <div class="container">
                <div id="accessMasternodeText"></div>
                <br />
                <input class="hide-element" type="text" />
                <div style="display: block">
                    <input
                        type="password"
                        v-model="privateKey"
                        placeholder="Masternode Private Key"
                        data-testid="importPrivateKey"
                    />
                    <input
                        type="text"
                        v-model="ip"
                        placeholder="Masternode ip address"
                        data-testid="importIpAddress"
                    />
                    <select
                        style="display: block"
                        v-model="utxo"
                        placeholder="Masternode collateral tx"
                        class="form-control"
                        data-testid="selectUTXO"
                    >
                        <option disabled value="">Select an UTXO</option>
                        <option v-for="utxo in possibleUTXOs" :value="utxo">
                            {{ `${utxo.outpoint.txid}/${utxo.outpoint.n}` }}
                        </option>
                    </select>
                    <button
                        data-testid="importMasternodeButton"
                        class="pivx-button-big"
                        @click="importMasternode()"
                    >
                        <span class="buttoni-icon"
                            ><i class="fas fa-file-upload fa-tiny-margin"></i
                        ></span>
                        <span class="buttoni-text">Access Masternode</span>
                        <span class="buttoni-arrow" v-html="IconArrow"> </span>
                    </button>
                </div>
            </div>
        </div>
    </center>
    <Modal :show="showModal" @close="showModal = false">
        <template #header>
            <button
                @click="showModal = false"
                type="button"
                class="close"
                data-dismiss="modal"
                aria-label="Close"
            >
                <i class="fa-solid fa-xmark closeCross"></i>
            </button>
        </template>
        <template #body>
            <div
                class="modal-body center-text"
                style="z-index: 100; margin-top: -35px; padding-bottom: 35px"
            >
                <div class="container">
                    <h4>Create a masternode</h4>
                    <span
                        style="
                            color: #af9cc6;
                            margin-bottom: 23px;
                            display: block;
                        "
                        >This action requires <b>10,000 PIV</b> in
                        collateral.</span
                    >
                    <input class="hide-element" type="text" />
                    <div style="display: block; text-align: left">
                        <p style="margin-bottom: 6px; color: #af9cc6">
                            Choose your Masternode type
                        </p>
                        <select
                            style="display: block; text-align: left"
                            placeholder="Masternode collateral tx"
                            class="form-control"
                            data-testid="masternodeTypeSelection"
                            v-model="selection"
                        >
                            <option value="VPS">
                                Self-hosted (a masternode server ran by you)
                            </option>
                            <option value="Third Party">
                                Third Party (a masternode server ran by someone
                                else)
                            </option>
                        </select>
                        <br />
                        <br />
                    </div>

                    <button
                        @click="createMasternode()"
                        data-testid="createMasternodeModalButton"
                        class="pivx-button-small"
                        style="height: 42px; width: 228px"
                    >
                        <span class="buttoni-text">
                            <span class="plus-icon" v-html="PlusIcon"></span>
                            Create Masternode</span
                        >
                    </button>
                </div>
            </div>
        </template>
    </Modal>
    <div
        class="modal fade"
        tabindex="-1"
        aria-labelledby="createMasternodeModalLabel"
        role="dialog"
        aria-hidden="true"
    >
        <div
            class="modal-mask black-text"
            style="z-index: 2000; background-color: rgba(32, 20, 54, 0.86)"
        >
            <div
                class="modal-dialog masternodeModalDialog modal-dialog-centered"
                role="document"
            ></div>
        </div>
    </div>
</template>
