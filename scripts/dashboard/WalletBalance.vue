<script setup>
import { cChainParams, COIN } from '../chain_params.js';
import { tr, translation } from '../i18n';
import { ref, computed, toRefs, onMounted, watch } from 'vue';
import { beautifyNumber } from '../misc';
import { getEventEmitter } from '../event_bus';
import * as jdenticon from 'jdenticon';
import { optimiseCurrencyLocale, openExplorer } from '../global';
import { renderWalletBreakdown } from '../charting.js';
import {
    guiRenderCurrentReceiveModal,
    guiRenderContacts,
} from '../contacts-book';
import { getNewAddress } from '../wallet.js';
import LoadingBar from '../Loadingbar.vue';
import { sleep } from '../utils.js';
import shieldLogo from '../../assets/shield_logo.svg';

const props = defineProps({
    jdenticonValue: String,
    balance: Number,
    shieldBalance: Number,
    pendingShieldBalance: Number,
    immatureBalance: Number,
    isHdWallet: Boolean,
    isViewOnly: Boolean,
    isEncrypted: Boolean,
    needsToEncrypt: Boolean,
    isImported: Boolean,
    isHardwareWallet: Boolean,
    currency: String,
    price: Number,
    displayDecimals: Number,
    shieldEnabled: Boolean,
});
const {
    jdenticonValue,
    balance,
    shieldBalance,
    pendingShieldBalance,
    immatureBalance,
    isHdWallet,
    isViewOnly,
    isEncrypted,
    isImported,
    needsToEncrypt,
    isHardwareWallet,
    currency,
    price,
    displayDecimals,
    shieldEnabled,
} = toRefs(props);

onMounted(() => {
    jdenticon.configure();
    watch(
        jdenticonValue,
        () => {
            jdenticon.update('#identicon', jdenticonValue.value);
        },
        {
            immediate: true,
        }
    );
});

// Transparent sync status
const transparentSyncing = ref(false);
const syncTStr = ref('');

// Shield sync status
const shieldSyncing = ref(false);
const syncSStr = ref('');

// Shield transaction creation
const isCreatingTx = ref(false);
const txPercentageCreation = ref(0.0);
const txCreationStr = 'Creating SHIELD transaction...';

const updating = ref(false);
const balanceStr = computed(() => {
    const nCoins = balance.value / COIN;
    const strBal = nCoins.toFixed(displayDecimals.value);
    const nLen = strBal.length;
    return beautifyNumber(strBal, nLen >= 10 ? '17px' : '25px');
});
const shieldBalanceStr = computed(() => {
    const nCoins = shieldBalance.value / COIN;
    return nCoins.toFixed(displayDecimals.value);
});

const pendingShieldBalanceStr = computed(() => {
    const nCoins = pendingShieldBalance.value / COIN;
    return nCoins.toFixed(displayDecimals.value);
});

const immatureBalanceStr = computed(() => {
    const nCoins = immatureBalance.value / COIN;
    const strBal = nCoins.toFixed(displayDecimals.value);
    return beautifyNumber(strBal);
});

const balanceValue = computed(() => {
    const { nValue, cLocale } = optimiseCurrencyLocale(
        (balance.value / COIN) * price.value
    );

    return nValue.toLocaleString('en-gb', cLocale);
});

const ticker = computed(() => cChainParams.current.TICKER);

getEventEmitter().on('sync-status', (value) => {
    updating.value = value === 'start';
});

const emit = defineEmits(['reload', 'send', 'exportPrivKeyOpen', 'displayLockWalletModal']);

getEventEmitter().on('transparent-sync-status-update', (str, finished) => {
    syncTStr.value = str;
    transparentSyncing.value = !finished;
});

getEventEmitter().on('shield-sync-status-update', (str, finished) => {
    syncSStr.value = str;
    shieldSyncing.value = !finished;
});

getEventEmitter().on(
    'shield-transaction-creation-update',
    async (percentage, finished) => {
        // If it just finished sleep for 1 second before making everything invisible
        txPercentageCreation.value = 100.0;
        if (finished) {
            await sleep(1000);
        }
        isCreatingTx.value = !finished;
        txPercentageCreation.value = percentage;
    }
);

function reload() {
    if (!updating) {
        updating.value = true;
        emit('reload');
    }
}

function displayLockWalletModal() {
    emit('displayLockWalletModal');
}
</script>

<template>
    <center>
        <div class="dcWallet-balances mb-4">
            <div class="row lessBot p-0">
                <div class="col-6 d-flex dcWallet-topLeftMenu" style="justify-content: flex-start">
                    <h3 class="noselect balance-title">
                        <span class="reload" v-if="isViewOnly &&
                            isEncrypted &&
                            isImported
                            " onclick="MPW.restoreWallet()">
                            <i class="fas fa-lock"></i>
                        </span>
                        <span class="reload" v-if="!isViewOnly &&
                            !needsToEncrypt &&
                            isImported
                            " @click="displayLockWalletModal()">
                            <i class="fas fa-unlock"></i>
                        </span>
                        <span class="reload noselect" @click="reload()"><i class="fa-solid fa-rotate-right"
                                :class="{ playAnim: updating }"></i></span>
                    </h3>
                </div>

                <div class="col-6 d-flex dcWallet-topRightMenu" style="justify-content: flex-end">
                    <div class="btn-group dropleft">
                        <i class="fa-solid fa-ellipsis-vertical topCol" style="width: 20px" data-toggle="dropdown"
                            aria-haspopup="true" aria-expanded="false"></i>
                        <div class="dropdown">
                            <div class="dropdown-move">
                                <div class="dropdown-menu" style="border-radius: 10px;" aria-labelledby="dropdownMenuButton">
                                    <a class="dropdown-item ptr" data-toggle="modal"
                                        data-target="#exportPrivateKeysModal" data-backdrop="static"
                                        data-keyboard="false" v-if="!isHardwareWallet"
                                        @click="$emit('exportPrivKeyOpen')">
                                        <i class="fas fa-key icoCol"></i>
                                        <span>&nbsp;{{
                            translation.export
                        }}</span>
                                    </a>

                                    <a class="dropdown-item ptr" v-if="isHdWallet" data-toggle="modal"
                                        data-target="#qrModal" @click="
                            getNewAddress({
                                updateGUI: true,
                                verify: true,
                            })
                            ">
                                        <i class="fas fa-sync-alt icoCol"></i>
                                        <span>&nbsp;{{
                            translation.refreshAddress
                        }}</span>
                                    </a>
                                    <a class="dropdown-item ptr" v-if="shieldEnabled" data-toggle="modal"
                                        data-target="#qrModal" @click="
                            getNewAddress({
                                updateGUI: true,
                                verify: true,
                                shield: true,
                            })
                            ">
                                        <i class="fas fa-shield icoCol"></i>
                                        <span>&nbsp;{{
                            translation.newShieldAddress
                        }}</span>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <canvas id="identicon" class="innerShadow" width="65" height="65"
                style="width: 65px; height: 65px"></canvas><br />
            <span class="ptr" @click="renderWalletBreakdown()" data-toggle="modal" data-target="#walletBreakdownModal">
                <span class="dcWallet-pivxBalance" v-html="balanceStr"> </span>
                <i class="fa-solid fa-plus" v-if="immatureBalance != 0"
                    style="opacity: 0.5; position: relative; left: 2px"></i>
                <span style="position: relative; left: 4px; font-size: 17px" v-if="immatureBalance != 0"
                    v-html="immatureBalanceStr"></span>
                <span class="dcWallet-pivxTicker" style="position: relative; left: 4px">&nbsp;{{ ticker }}&nbsp;</span>
            </span>
            <br />
            <div class="dcWallet-usdBalance">
                <span class="dcWallet-usdValue" v-if="shieldEnabled">
                    <i class="fas fa-shield fa-xs" style="margin-right: 4px" v-if="shieldEnabled">
                    </i>{{ shieldBalanceStr }}
                    <span style="opacity: 0.75" v-if="pendingShieldBalance != 0">
                        ({{ pendingShieldBalanceStr }} Pending)</span></span>
            </div>
            <div class="dcWallet-usdBalance">
                <span class="dcWallet-usdValue">{{ balanceValue }}</span>
                <span class="dcWallet-usdValue">&nbsp;{{ currency }}</span>
            </div>

            <div class="row lessTop p-0">
                <div class="col-6 d-flex" style="justify-content: flex-start">
                    <div class="dcWallet-btn-left" @click="$emit('send')">
                        {{ translation.send }}
                    </div>
                </div>

                <div class="col-6 d-flex" style="justify-content: flex-end">
                    <div class="dcWallet-btn-right" @click="guiRenderCurrentReceiveModal()" data-toggle="modal"
                        data-target="#qrModal">
                        {{ translation.receive }}
                    </div>
                </div>
            </div>
        </div>
        <center>
            <div v-if="transparentSyncing || shieldSyncing" style="
                    display: block;
                    font-size: 15px;
                    background-color: #3a0c60;
                    border: 1px solid #9f00f9;
                    padding: 8px 15px 10px 15px;
                    border-radius: 10px;
                    color: #d3bee5;
                    width: 310px;
                    text-align: center;
                ">
                {{ transparentSyncing ? syncTStr : syncSStr }}
            </div>
        </center>
        <center>
            <div v-if="isCreatingTx" style="
                    display: flex;
                    font-size: 15px;
                    background-color: #3a0c60;
                    border: 1px solid #9f00f9;
                    padding: 8px 15px 10px 15px;
                    border-radius: 10px;
                    color: #d3bee5;
                    width: 310px;
                    text-align: left;
                ">
                <div style="
                        width: 38px;
                        height: 38px;
                        background-color: #310b51;
                        margin-right: 9px;
                        border-radius: 9px;
                    ">
                    <span class="dcWallet-svgIconPurple" style="margin-left: 1px; top: 14px; left: 7px"
                        v-html="shieldLogo"></span>
                </div>
                <div style="width: -webkit-fill-available">
                    {{ txCreationStr }}
                    <LoadingBar :show="true" :percentage="txPercentageCreation" style="
                            border: 1px solid #932ecd;
                            border-radius: 4px;
                            background-color: #2b003a;
                        "></LoadingBar>
                </div>
            </div>
        </center>
    </center>
</template>
