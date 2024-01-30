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

const props = defineProps({
    jdenticonValue: String,
    balance: Number,
    shieldBalance: Number,
    immatureBalance: Number,
    isHdWallet: Boolean,
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
    immatureBalance,
    isHdWallet,
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

const emit = defineEmits(['reload', 'send', 'exportPrivKeyOpen']);

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
</script>

<template>
    <center>
        <div class="dcWallet-balances mb-4">
            <div class="row lessBot p-0">
                <div
                    class="col-6 d-flex dcWallet-topLeftMenu"
                    style="justify-content: flex-start"
                >
                    <h3 class="noselect balance-title">
                        <span class="reload noselect" @click="reload()"
                            ><i
                                class="fa-solid fa-rotate-right"
                                :class="{ playAnim: updating }"
                            ></i
                        ></span>
                    </h3>
                </div>

                <div
                    class="col-6 d-flex dcWallet-topRightMenu"
                    style="justify-content: flex-end"
                >
                    <div class="btn-group dropleft">
                        <i
                            class="fa-solid fa-ellipsis-vertical"
                            style="width: 20px"
                            data-toggle="dropdown"
                            aria-haspopup="true"
                            aria-expanded="false"
                        ></i>
                        <div class="dropdown">
                            <div class="dropdown-move">
                                <div
                                    class="dropdown-menu"
                                    aria-labelledby="dropdownMenuButton"
                                >
                                    <a
                                        class="dropdown-item ptr"
                                        @click="renderWalletBreakdown()"
                                        data-toggle="modal"
                                        data-target="#walletBreakdownModal"
                                    >
                                        <i class="fa-solid fa-chart-pie"></i>
                                        <span
                                            >&nbsp;{{
                                                translation.balanceBreakdown
                                            }}</span
                                        >
                                    </a>
                                    <a
                                        class="dropdown-item ptr"
                                        @click="openExplorer()"
                                    >
                                        <i
                                            class="fa-solid fa-magnifying-glass"
                                        ></i>
                                        <span
                                            >&nbsp;{{
                                                translation.viewOnExplorer
                                            }}</span
                                        >
                                    </a>
                                    <a
                                        class="dropdown-item ptr"
                                        @click="guiRenderContacts()"
                                        data-toggle="modal"
                                        data-target="#contactsModal"
                                    >
                                        <i class="fa-solid fa-address-book"></i>
                                        <span
                                            >&nbsp;{{
                                                translation.contacts
                                            }}</span
                                        >
                                    </a>
                                    <a
                                        class="dropdown-item ptr"
                                        data-toggle="modal"
                                        data-target="#exportPrivateKeysModal"
                                        data-backdrop="static"
                                        data-keyboard="false"
                                        v-if="!isHardwareWallet"
                                        @click="$emit('exportPrivKeyOpen')"
                                    >
                                        <i class="fas fa-key"></i>
                                        <span
                                            >&nbsp;{{
                                                translation.export
                                            }}</span
                                        >
                                    </a>

                                    <a
                                        class="dropdown-item ptr"
                                        v-if="isHdWallet"
                                        data-toggle="modal"
                                        data-target="#qrModal"
                                        @click="
                                            getNewAddress({
                                                updateGUI: true,
                                                verify: true,
                                            })
                                        "
                                    >
                                        <i class="fas fa-sync-alt"></i>
                                        <span
                                            >&nbsp;{{
                                                translation.refreshAddress
                                            }}</span
                                        >
                                    </a>
                                    <a
                                        class="dropdown-item ptr"
                                        v-if="shieldEnabled"
                                        data-toggle="modal"
                                        data-target="#qrModal"
                                        @click="
                                            getNewAddress({
                                                updateGUI: true,
                                                verify: true,
                                                shield: true,
                                            })
                                        "
                                    >
                                        <i class="fas fa-shield"></i>
                                        <span
                                            >&nbsp;{{
                                                translation.newShieldAddress
                                            }}</span
                                        >
                                    </a>
                                    <a
                                        class="dropdown-item ptr"
                                        data-toggle="modal"
                                        data-target="#redeemCodeModal"
                                    >
                                        <i class="fa-solid fa-gift"></i>
                                        <span
                                            >&nbsp;{{
                                                translation.redeemOrCreateCode
                                            }}</span
                                        >
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <canvas
                id="identicon"
                class="innerShadow"
                width="65"
                height="65"
                style="width: 65px; height: 65px"
            ></canvas
            ><br />
            <span
                class="ptr"
                @click="renderWalletBreakdown()"
                data-toggle="modal"
                data-target="#walletBreakdownModal"
            >
                <span class="dcWallet-pivxBalance" v-html="balanceStr"> </span>
                <i
                    class="fa-solid fa-plus"
                    v-if="immatureBalance != 0"
                    style="opacity: 0.5; position: relative; left: 2px"
                ></i>
                <span
                    style="position: relative; left: 4px; font-size: 17px"
                    v-if="immatureBalance != 0"
                    v-html="immatureBalanceStr"
                ></span>
                <span
                    class="dcWallet-pivxTicker"
                    style="position: relative; left: 4px"
                    >&nbsp;{{ ticker }}&nbsp;</span
                >
            </span>
            <br />
            <div class="dcWallet-usdBalance">
                <span
                    class="dcWallet-usdValue"
                    v-if="shieldEnabled"
                    v-html="shieldBalanceStr"
                >
                </span>
                <span style="margin-left: 5px">
                    <i class="fas fa-shield fa-xs" v-if="shieldEnabled"> </i>
                </span>
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
                    <div
                        class="dcWallet-btn-right"
                        @click="guiRenderCurrentReceiveModal()"
                        data-toggle="modal"
                        data-target="#qrModal"
                    >
                        {{ translation.receive }}
                    </div>
                </div>
            </div>
        </div>
        <center>
            <div
                v-if="transparentSyncing || shieldSyncing"
                style="
                    background-color: #0000002b;
                    width: fit-content;
                    padding: 8px;
                    border-radius: 15px;
                "
            >
                {{ transparentSyncing ? syncTStr : syncSStr }}
            </div>
        </center>
        <center>
            <div
                v-if="isCreatingTx"
                style="
                display:flex;
                    font-size: 15px;
                    background-color: #3a0c60;
                    border: 1px solid #9f00f9;
                    padding: 8px 15px 10px 15px;
                    border-radius: 10px;
                    color: #d3bee5;
                    width: 310px;
                    text-align: left;
                "
            >

                <div style="
                    width: 38px;
                    height: 38px;
                    background-color: #310b51;
                    margin-right: 9px;
                    border-radius: 9px;
                    ">
                    <span class="dcWallet-svgIconPurple" style="margin-left:1px;top:14px;left:7px;"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M85.967 10.65l-32.15-9.481a13.466 13.466 0 00-7.632 0l-32.15 9.48C11.661 11.351 10 13.567 10 16.042v26.623c0 12.321 3.67 24.186 10.609 34.31 6.774 9.885 16.204 17.49 27.264 21.99a5.612 5.612 0 004.251 0c11.061-4.5 20.491-12.104 27.266-21.99C86.329 66.85 90 54.985 90 42.664V16.042a5.656 5.656 0 00-4.033-5.392zM69 68.522C69 70.907 67.03 72 64.584 72H34.092C31.646 72 30 70.907 30 68.522v-23.49C30 42.647 31.646 41 34.092 41H37v-9.828C37 24.524 41.354 18.5 49.406 18.5 57.37 18.5 62 24.066 62 31.172V41h2.584C67.03 41 69 42.647 69 45.032v23.49zM58 41v-9.828c0-4.671-3.708-8.472-8.5-8.472-4.791 0-8.5 3.8-8.5 8.472V41h17z"></path></svg></span>
                </div>
                <div style="width: -webkit-fill-available;">
                    {{ txCreationStr }}
                    <LoadingBar
                        :show="true"
                        :percentage="txPercentageCreation"
                        style="
                            border: 1px solid #932ecd;
                            border-radius: 4px;
                            background-color:#2b003a;
                        "
                    ></LoadingBar>
                </div>
            </div>
        </center>
    </center>
</template>