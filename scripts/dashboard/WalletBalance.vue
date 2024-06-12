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

import iShieldLock from '../../assets/icons/icon_shield_lock_locked.svg';
import iShieldLogo from '../../assets/icons/icon_shield_pivx.svg';
import iHourglass from '../../assets/icons/icon-hourglass.svg';
import pLogo from '../../assets/p_logo.svg';
import logo from '../../assets/pivx.png';

import pLocked from '../../assets/icons/icon-lock-locked.svg';
import pUnlocked from '../../assets/icons/icon-lock-unlocked.svg';

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
    publicMode: Boolean,
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
    publicMode,
} = toRefs(props);

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

const balanceStr = computed(() => {
    let nCoins;
    if(publicMode.value) {
        nCoins = balance.value / COIN
    } else {
        nCoins = shieldBalance.value / COIN;
    }
    
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
    return strBal + " " + cChainParams.current.TICKER;
});

const balanceValue = computed(() => {
    let balanceVal;
    if(publicMode.value) {
        balanceVal = (balance.value / COIN) * price.value;
    } else {
        balanceVal = (shieldBalance.value / COIN) * price.value;
    }

    const { nValue, cLocale } = optimiseCurrencyLocale(
        balanceVal
    );
    
    cLocale.minimumFractionDigits = 0;
    cLocale.maximumFractionDigits = 0;

    return `${nValue.toLocaleString('en-gb', cLocale)}${beautifyNumber(nValue.toFixed(2), '13px', false)}`;
});

const ticker = computed(() => cChainParams.current.TICKER);

const emit = defineEmits(['send', 'exportPrivKeyOpen', 'displayLockWalletModal']);

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
                            <span class="dcWallet-topLeftIcons buttoni-icon topCol" v-html="pLocked"></span>
                        </span>
                        <span class="reload" v-if="!isViewOnly &&
                            !needsToEncrypt &&
                            isImported
                            " @click="displayLockWalletModal()">
                            <span class="dcWallet-topLeftIcons buttoni-icon topCol" v-html="pUnlocked"></span>
                        </span>
                        <span class="reload noselect" @click="reload()"><i class="fa-solid fa-rotate-right topCol"
                                :class="{ playAnim: updating }"></i></span>
                    </h3>
		            <h3 class="noselect balance-title"></h3>
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

            <div style="margin-top:22px; padding-left:15px; padding-right:15px; margin-bottom: 35px;">
                <div style="background-color:#32224e61; border:2px solid #361562; border-top-left-radius:10px; border-top-right-radius:10px;">
                    <div class="immatureBalanceSpan" v-if="immatureBalance != 0">
                        <span v-html="iHourglass" class="hourglassImmatureIcon"></span>
                        <span style="position: relative; left: 4px; font-size: 14px;" v-html="immatureBalanceStr"></span>
                    </div>
                </div>
                <div style="background-color:#32224e61; border:2px solid #361562; border-bottom:none; border-top:none;">
                    <div>
                        <img :src="logo" style="height: 60px; margin-top:14px">
                    </div>
                    <span class="ptr" data-toggle="modal" data-target="#walletBreakdownModal" @click="renderWalletBreakdown()">
                        <span class="logo-pivBal" v-html="pLogo"></span>
                        <span class="dcWallet-pivxBalance" v-html="balanceStr"> </span>
                        <span class="dcWallet-pivxTicker" style="position: relative; left: 4px">&nbsp;{{ ticker }}&nbsp;</span>
                    </span>

                    <div class="dcWallet-usdBalance" style="padding-bottom: 12px; padding-top: 3px;">
                        <span class="dcWallet-usdValue" style="color:#d7d7d7; font-weight: 500;" v-html="balanceValue"></span>
                        <span class="dcWallet-usdValue" style="opacity: 0.55;">&nbsp;{{ currency }}</span>
                    </div>
                </div>
                <div style="background-color:#32224e61; border:2px solid #361562; border-bottom-left-radius:10px; border-bottom-right-radius:10px;">
                    <div class="dcWallet-usdBalance">
                        <span class="dcWallet-usdValue" style="display: flex; justify-content: center; color:#9221FF; font-weight:500; padding-top: 21px; padding-bottom: 11px; font-size:16px;">
                            <span class="shieldBalanceLogo" v-html="iShieldLogo"></span>&nbsp;{{ shieldBalanceStr }} S-{{ ticker }}
                            <span style="opacity: 0.75" v-if="pendingShieldBalance != 0">({{ pendingShieldBalanceStr }} Pending)</span>
                        </span>
                    </div>
                </div>
            </div>
            
            
            <div class="row lessTop p-0" style="margin-left:15px; margin-right:15px; margin-bottom: 19px; margin-top: -16px;">
                <div class="col-6 d-flex p-0" style="justify-content: flex-start">
                    <button class="pivx-button-small" style="height: 42px; width: 97px;" @click="$emit('send')">
                        <span class="buttoni-text">
                            {{ translation.send }}
                        </span>
                    </button>
                </div>

                <div class="col-6 d-flex p-0" style="justify-content: flex-end">
                    <button class="pivx-button-small" style="height: 42px; width: 97px;" @click="guiRenderCurrentReceiveModal()" data-toggle="modal" data-target="#qrModal">
                        <span class="buttoni-text">
                            {{ translation.receive }}
                        </span>
                    </button>
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
                        v-html="iShieldLock"></span>
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
