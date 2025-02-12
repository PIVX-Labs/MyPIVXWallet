<script setup>
import { toRefs, computed, ref } from 'vue';
import { tr, translation } from '../i18n.js';
import { COIN, cChainParams } from '../chain_params';
import IconArrow from '../../assets/icons/icon-arrow.svg';
const props = defineProps({
    synced: Boolean,
    balance: Number,
    possibleUTXOs: Array,
    show: Boolean,
});
import PlusIcon from '../../assets/icons/icon-plus.svg';
import Modal from '../Modal.vue';

const { synced, balance, possibleUTXOs, show } = toRefs(props);
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

const emit = defineEmits(['createMasternode', 'importMasternode', 'close']);
const selection = ref();
function createMasternode() {
    emit('createMasternode', { isVPS: selection.value === 'VPS' });
    emit('close');
}

function importMasternode() {
    emit('importMasternode', privateKey.value, ip.value, utxo.value);
    emit('close');
}
</script>

<template>
    <Teleport to="body">
        <Modal :show="show" v-if="!error && !possibleUTXOs.length">
            <template #header>
                <center class="container">
                    <h4>Create a masternode</h4>
                </center>
            </template>
            <template #body>
                <center>
                    <div
                        style="
                            display: flex;
                            justify-content: center;
                            width: 100%;
                        "
                        v-if="!error && !possibleUTXOs.length"
                    >
                        <div
                            class="modal-body center-text"
                            style="
                                z-index: 100;
                                margin-top: -35px;
                                padding-bottom: 35px;
                            "
                        >
                            <div class="container">
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
                                    <p
                                        style="
                                            margin-bottom: 6px;
                                            color: #af9cc6;
                                        "
                                    >
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
                                            Self-hosted (a masternode server ran
                                            by you)
                                        </option>
                                        <option value="Third Party">
                                            Third Party (a masternode server ran
                                            by someone else)
                                        </option>
                                    </select>
                                    <br />
                                    <br />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div
                        id="accessMasternode"
                        class="dashboard-item"
                        style="display: inline-block; float: inherit"
                        v-if="possibleUTXOs.length"
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
                                    <option disabled value="">
                                        Select an UTXO
                                    </option>
                                    <option
                                        v-for="utxo in possibleUTXOs"
                                        :value="utxo"
                                    >
                                        {{
                                            `${utxo.outpoint.txid}/${utxo.outpoint.n}`
                                        }}
                                    </option>
                                </select>
                                <button
                                    data-testid="importMasternodeButton"
                                    class="pivx-button-big"
                                    @click="importMasternode()"
                                >
                                    <span class="buttoni-icon"
                                        ><i
                                            class="fas fa-file-upload fa-tiny-margin"
                                        ></i
                                    ></span>
                                    <span class="buttoni-text"
                                        >Access Masternode</span
                                    >
                                    <span
                                        class="buttoni-arrow"
                                        v-html="IconArrow"
                                    >
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>
                </center>
            </template>
            <template #footer>
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
                <button
                    type="button"
                    class="pivx-button-big-cancel"
                    style="float: right"
                    @click="emit('close')"
                >
                    {{ translation.popupCancel }}
                </button>
            </template>
        </Modal>

        <Modal :show="show" v-if="possibleUTXOs.length">
            <template #header>
                <center class="container">
                    <h4>Import masternode</h4>
                </center>
            </template>
            <template #body>
                <center>
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
                                <option disabled value="">
                                    Select an UTXO
                                </option>
                                <option
                                    v-for="utxo in possibleUTXOs"
                                    :value="utxo"
                                >
                                    {{
                                        `${utxo.outpoint.txid}/${utxo.outpoint.n}`
                                    }}
                                </option>
                            </select>
                        </div>
                    </div>
                </center>
            </template>
            <template #footer>
                <button
                    data-testid="importMasternodeButton"
                    class="pivx-button-big"
                    @click="importMasternode()"
                >
                    <span class="buttoni-text">Access Masternode</span>
                </button>
                <button
                    type="button"
                    class="pivx-button-big-cancel"
                    style="float: right"
                    @click="emit('close')"
                >
                    {{ translation.popupCancel }}
                </button>
            </template>
        </Modal>
    </Teleport>
</template>
