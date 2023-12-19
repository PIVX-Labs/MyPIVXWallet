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

const props = defineProps({
    jdenticonValue: String,
    balance: Number,
    immatureBalance: Number,
    isHdWallet: Boolean,
    isHardwareWallet: Boolean,
    currency: String,
    price: Number,
    displayDecimals: Number,
});
const {
    jdenticonValue,
    balance,
    immatureBalance,
    isHdWallet,
    isHardwareWallet,
    currency,
    price,
    displayDecimals,
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

const totalSyncPages = ref(0);
const currentSyncPage = ref(0);
const isSyncing = ref(false);
const syncStr = computed(() => {
    return tr(translation.syncStatusHistoryProgress, [
        { current: currentSyncPage.value },
        { total: totalSyncPages.value },
    ]);
});

const updating = ref(false);
const balanceStr = computed(() => {
    const nCoins = balance.value / COIN;
    const strBal = nCoins.toFixed(displayDecimals.value);
    const nLen = strBal.length;
    return beautifyNumber(strBal, nLen >= 10 ? '17px' : '25px');
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

getEventEmitter().on(
    'sync-status-update',
    (currentPage, totalPages, finished) => {
        totalSyncPages.value = totalPages;
        currentSyncPage.value = currentPage;
        isSyncing.value = finished === false;
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
                v-if="isSyncing"
                style="
                    background-color: #0000002b;
                    width: fit-content;
                    padding: 8px;
                    border-radius: 15px;
                "
            >
                {{ syncStr }}
            </div>
        </center>
    </center>
</template>
