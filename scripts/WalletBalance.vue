<script setup>
import { cChainParams, COIN } from './chain_params.js';
import { translation } from './i18n';
import { ref, computed } from 'vue';

import { nDisplayDecimals } from './settings';
import { beautifyNumber } from './misc';
import { getEventEmitter } from './event_bus';
import { cMarket, strCurrency } from './settings.js';
import {
    mempool,
    optimiseCurrencyLocale,
    refreshChainData,
    openExplorer,
    toggleExportUI,
    toggleBottomMenu,
} from './global';
import { renderWalletBreakdown } from './charting';
import {
    guiRenderCurrentReceiveModal,
    guiRenderContacts,
} from './contacts-book';
import { wallet, getNewAddress } from './wallet';

const balance = ref(0);
const price = ref(0.0);
const displayDecimals = ref(0);
const updating = ref(false);
const currency = ref('USD');
const balanceStr = computed(() => {
    const nCoins = balance.value / COIN;
    const strBal = nCoins.toFixed(displayDecimals.value);
    const nLen = strBal.length;
    return beautifyNumber(strBal, nLen >= 10 ? '17px' : '25px');
});
const balanceValue = computed(() => {
    const { nValue, cLocale } = optimiseCurrencyLocale(
        (balance.value / COIN) * price.value
    );

    return nValue.toLocaleString('en-gb', cLocale);
});

const ticker = computed(() => cChainParams.current.TICKER);

async function reload() {
    if (updating.value) return;

    try {
        updating.value = true;
        await refreshChainData();
    } finally {
        updating.value = false;
    }
}

getEventEmitter().on('balance-update', async () => {
    balance.value = mempool.getBalance();
    currency.value = strCurrency.toUpperCase();
    price.value = await cMarket.getPrice(strCurrency);
    displayDecimals.value = nDisplayDecimals;
});

getEventEmitter().on('sync-status', (value) => {
    updating.value = value === 'start';
});

const isHdWallet = ref(false);
const isHardwareWallet = ref(false);

getEventEmitter().on('wallet-import', () => {
    isHdWallet.value = wallet.isHD();
    isHardwareWallet.value = wallet.isHardwareWallet();
});
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
                                        @click="toggleExportUI()"
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
                style="width: 65px; height: 65px"
                data-jdenticon-value=""
            ></canvas
            ><br />
            <span
                class="ptr"
                @click="renderWalletBreakdown()"
                data-toggle="modal"
                data-target="#walletBreakdownModal"
            >
                <span class="dcWallet-pivxBalance" v-html="balanceStr"> </span>
                <span class="dcWallet-pivxTicker"
                    >&nbsp;{{ ticker }}&nbsp;</span
                >

                <i
                    class="fa-solid fa-plus"
                    style="opacity: 0.5; position: relative; left: 2px"
                ></i>
            </span>
            <br />
            <div class="dcWallet-usdBalance">
                <span class="dcWallet-usdValue">{{ balanceValue }}</span>
                <span class="dcWallet-usdValue">&nbsp;{{ currency }}</span>
            </div>

            <div class="row lessTop p-0">
                <div class="col-6 d-flex" style="justify-content: flex-start">
                    <div
                        class="dcWallet-btn-left"
                        @click="
                            toggleBottomMenu(
                                'transferMenu',
                                'transferAnimation'
                            )
                        "
                    >
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
    </center>
</template>
