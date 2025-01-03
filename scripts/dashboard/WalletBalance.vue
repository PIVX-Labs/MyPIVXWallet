<script setup>
import { cChainParams, COIN } from '../chain_params.js';
import { translation, tr } from '../i18n';
import { ref, computed, toRefs } from 'vue';
import { beautifyNumber } from '../misc';
import { getEventEmitter } from '../event_bus';
import { optimiseCurrencyLocale } from '../global';
import { renderWalletBreakdown } from '../charting.js';
import { guiRenderCurrentReceiveModal } from '../contacts-book';
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
import pExport from '../../assets/icons/icon-export.svg';
import pShieldCheck from '../../assets/icons/icon-shield-check.svg';
import pRefresh from '../../assets/icons/icon-refresh.svg';

const props = defineProps({
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
const percentage = ref(0.0);
const syncTStr = ref('');

// Shield sync status
const shieldSyncing = ref(false);
const shieldSyncingStr = ref('');

// Shield transaction creation
const isCreatingTx = ref(false);
const txPercentageCreation = ref(0.0);
const txCreationStr = ref('Creating SHIELD transaction...');

const primaryBalanceStr = computed(() => {
    // Get the primary balance, depending on the user's mode
    const nCoins = (publicMode.value ? balance : shieldBalance).value / COIN;
    const strBal = nCoins.toFixed(displayDecimals.value);
    return beautifyNumber(strBal, strBal.length >= 10 ? '17px' : '25px');
});

const secondaryBalanceStr = computed(() => {
    // Get the secondary balance
    const nCoins = (publicMode.value ? shieldBalance : balance).value / COIN;
    return nCoins.toFixed(displayDecimals.value);
});

const secondaryImmatureBalanceStr = computed(() => {
    // Get the secondary immature balance
    const nCoins =
        (publicMode.value ? pendingShieldBalance : immatureBalance).value /
        COIN;
    return nCoins.toFixed(displayDecimals.value);
});

const primaryImmatureBalanceStr = computed(() => {
    // Get the primary immature balance
    const nCoins =
        (publicMode.value ? immatureBalance : pendingShieldBalance).value /
        COIN;
    const strPrefix = publicMode.value ? ' ' : ' S-';

    return nCoins.toFixed(displayDecimals.value) + strPrefix + ticker.value;
});

const balanceValue = computed(() => {
    // Convert our primary balance to the user's currency
    const nCoins = (publicMode.value ? balance : shieldBalance).value / COIN;
    const { nValue, cLocale } = optimiseCurrencyLocale(nCoins * price.value);

    cLocale.minimumFractionDigits = 0;
    cLocale.maximumFractionDigits = 0;

    return `${nValue.toLocaleString('en-gb', cLocale)}${beautifyNumber(
        nValue.toFixed(2),
        '13px',
        false
    )}`;
});

const ticker = computed(() => cChainParams.current.TICKER);

const emit = defineEmits([
    'send',
    'exportPrivKeyOpen',
    'displayLockWalletModal',
    'restoreWallet',
]);

getEventEmitter().on(
    'transparent-sync-status-update',
    (i, totalPages, finished) => {
        const str = tr(translation.syncStatusHistoryProgress, [
            { current: totalPages - i + 1 },
            { total: totalPages },
        ]);
        const progress = ((totalPages - i) / totalPages) * 100;
        syncTStr.value = str;
        percentage.value = progress;
        transparentSyncing.value = !finished;
    }
);

getEventEmitter().on(
    'shield-sync-status-update',
    (bytes, totalBytes, finished) => {
        percentage.value = Math.round((100 * bytes) / totalBytes);
        const mb = bytes / 1_000_000;
        const totalMb = totalBytes / 1_000_000;
        shieldSyncingStr.value = `Syncing Shield (${mb.toFixed(
            1
        )}MB/${totalMb.toFixed(1)}MB)`;
        shieldSyncing.value = !finished;
    }
);

getEventEmitter().on(
    'shield-transaction-creation-update',
    // state: 0 = loading shield params
    //        1 = proving tx
    //        2 = finished
    async (percentage, state) => {
        if (state === 0) {
            txCreationStr.value = translation.syncLoadingSaplingProver;
        } else {
            txCreationStr.value = translation.creatingShieldTransaction;
        }

        // If it just finished sleep for 1 second before making everything invisible
        if (state === 2) {
            txPercentageCreation.value = 100.0;
            await sleep(1000);
        }
        isCreatingTx.value = state !== 2;
        txPercentageCreation.value = percentage;
    }
);

function displayLockWalletModal() {
    emit('displayLockWalletModal');
}

function restoreWallet() {
    emit('restoreWallet');
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
                        <span
                            class="reload"
                            v-if="isViewOnly && isEncrypted && isImported"
                            @click="restoreWallet()"
                        >
                            <span
                                class="dcWallet-topLeftIcons buttoni-icon topCol"
                                v-html="pLocked"
                            ></span>
                        </span>
                        <span
                            class="reload"
                            v-if="!isViewOnly && !needsToEncrypt && isImported"
                            @click="displayLockWalletModal()"
                        >
                            <span
                                class="dcWallet-topLeftIcons buttoni-icon topCol"
                                v-html="pUnlocked"
                            ></span>
                        </span>
                    </h3>
                    <h3 class="noselect balance-title"></h3>
                </div>

                <div
                    class="col-6 d-flex dcWallet-topRightMenu"
                    style="justify-content: flex-end"
                >
                    <div class="btn-group dropleft">
                        <i
                            class="fa-solid fa-ellipsis-vertical topCol"
                            style="width: 20px"
                            data-toggle="dropdown"
                            aria-haspopup="true"
                            aria-expanded="false"
                        ></i>
                        <div class="dropdown">
                            <div class="dropdown-move">
                                <div
                                    class="dropdown-menu"
                                    style="border-radius: 10px"
                                    aria-labelledby="dropdownMenuButton"
                                >
                                    <a
                                        class="dropdown-item ptr"
                                        data-toggle="modal"
                                        data-target="#exportPrivateKeysModal"
                                        data-backdrop="static"
                                        data-keyboard="false"
                                        v-if="!isHardwareWallet"
                                        @click="$emit('exportPrivKeyOpen')"
                                    >
                                        <span
                                            class="buttoni-icon iconList"
                                            v-html="pExport"
                                        ></span>
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
                                        <span
                                            class="buttoni-icon iconList"
                                            v-html="pRefresh"
                                        ></span>
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
                                        <span
                                            class="buttoni-icon iconList"
                                            v-html="pShieldCheck"
                                        ></span>
                                        <span
                                            >&nbsp;{{
                                                translation.newShieldAddress
                                            }}</span
                                        >
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div
                style="
                    margin-top: 22px;
                    padding-left: 15px;
                    padding-right: 15px;
                    margin-bottom: 35px;
                "
            >
                <div
                    style="
                        background-color: #32224e61;
                        border: 2px solid #361562;
                        border-top-left-radius: 10px;
                        border-top-right-radius: 10px;
                    "
                >
                    <div
                        class="immatureBalanceSpan"
                        v-if="
                            (publicMode && immatureBalance != 0) ||
                            (!publicMode && pendingShieldBalance != 0)
                        "
                    >
                        <span
                            v-html="iHourglass"
                            class="hourglassImmatureIcon"
                        ></span>
                        <span
                            style="
                                position: relative;
                                left: 4px;
                                font-size: 14px;
                            "
                            >{{ primaryImmatureBalanceStr }}</span
                        >
                    </div>
                </div>
                <div
                    style="
                        background-color: #32224e61;
                        border: 2px solid #361562;
                        border-bottom: none;
                        border-top: none;
                    "
                >
                    <div>
                        <img
                            :src="logo"
                            style="height: 60px; margin-top: 14px"
                        />
                    </div>
                    <span
                        class="ptr"
                        data-toggle="modal"
                        data-target="#walletBreakdownModal"
                        @click="renderWalletBreakdown()"
                    >
                        <span
                            class="logo-pivBal"
                            v-html="publicMode ? pLogo : iShieldLogo"
                        ></span>
                        <span
                            class="dcWallet-pivxBalance"
                            data-testid="primaryBalance"
                            v-html="primaryBalanceStr"
                        >
                        </span>
                        <span
                            class="dcWallet-pivxTicker"
                            style="position: relative; left: 4px"
                            >&nbsp;<span
                                data-testid="shieldModePrefix"
                                v-if="!publicMode"
                                >S-</span
                            >{{ ticker }}&nbsp;</span
                        >
                    </span>

                    <div
                        class="dcWallet-usdBalance"
                        style="padding-bottom: 12px; padding-top: 3px"
                    >
                        <span
                            class="dcWallet-usdValue"
                            style="color: #d7d7d7; font-weight: 500"
                            v-html="balanceValue"
                        ></span>
                        <span class="dcWallet-usdValue" style="opacity: 0.55"
                            >&nbsp;{{ currency }}</span
                        >
                    </div>
                </div>
                <div
                    style="
                        background-color: #32224e61;
                        border: 2px solid #361562;
                        border-bottom-left-radius: 10px;
                        border-bottom-right-radius: 10px;
                    "
                >
                    <div class="dcWallet-usdBalance" v-if="shieldEnabled">
                        <span
                            class="dcWallet-usdValue"
                            style="
                                display: flex;
                                justify-content: center;
                                color: #9221ff;
                                font-weight: 500;
                                padding-top: 21px;
                                padding-bottom: 11px;
                                font-size: 16px;
                            "
                        >
                            <span
                                class="shieldBalanceLogo"
                                v-if="shieldEnabled"
                            ></span
                            >&nbsp;{{ secondaryBalanceStr }}
                            <span v-if="publicMode">&nbsp;S-</span>{{ ticker }}
                            <span
                                style="opacity: 0.75"
                                v-if="
                                    (!publicMode && immatureBalance != 0) ||
                                    (publicMode && pendingShieldBalance != 0)
                                "
                                >&nbsp;({{
                                    secondaryImmatureBalanceStr
                                }}
                                Pending)</span
                            >
                        </span>
                    </div>
                </div>
            </div>

            <div
                class="row lessTop p-0"
                style="
                    margin-left: 15px;
                    margin-right: 15px;
                    margin-bottom: 19px;
                    margin-top: -16px;
                "
            >
                <div
                    class="col-6 d-flex p-0"
                    style="justify-content: flex-start"
                >
                    <button
                        class="pivx-button-small"
                        style="height: 42px; width: 97px"
                        @click="$emit('send')"
                    >
                        <span class="buttoni-text">
                            {{ translation.send }}
                        </span>
                    </button>
                </div>

                <div class="col-6 d-flex p-0" style="justify-content: flex-end">
                    <button
                        class="pivx-button-small"
                        style="height: 42px; width: 97px"
                        @click="guiRenderCurrentReceiveModal()"
                        data-toggle="modal"
                        data-target="#qrModal"
                    >
                        <span class="buttoni-text">
                            {{ translation.receive }}
                        </span>
                    </button>
                </div>
            </div>
        </div>
        <center>
            <div
                v-if="transparentSyncing || shieldSyncing"
                style="
                    display: flex;
                    font-size: 15px;
                    background-color: #3a0c60;
                    border: 1px solid #9f00f9;
                    padding: 8px 15px 10px 15px;
                    border-radius: 10px;
                    color: #d3bee5;
                    width: 310px;
                    text-align: left;
                    margin-bottom: 20px;
                "
            >
                <div
                    style="
                        width: 48px;
                        height: 38px;
                        background-color: #310b51;
                        margin-right: 9px;
                        border-radius: 9px;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        font-size: 20px;
                    "
                >
                    <i class="fas fa-spinner spinningLoading"></i>
                </div>
                <div style="width: 100%">
                    {{ transparentSyncing ? syncTStr : shieldSyncingStr }}
                    <LoadingBar
                        :show="true"
                        :percentage="percentage"
                        style="
                            border: 1px solid #932ecd;
                            border-radius: 4px;
                            background-color: #2b003a;
                        "
                    ></LoadingBar>
                </div>
            </div>
        </center>
        <center>
            <div
                v-if="isCreatingTx"
                style="
                    display: flex;
                    font-size: 15px;
                    background-color: #3a0c60;
                    border: 1px solid #9f00f9;
                    padding: 8px 15px 10px 15px;
                    border-radius: 10px;
                    color: #d3bee5;
                    width: 310px;
                    text-align: left;
                    margin-bottom: 20px;
                "
            >
                <div
                    style="
                        width: 48px;
                        height: 38px;
                        background-color: #310b51;
                        margin-right: 9px;
                        border-radius: 9px;
                    "
                >
                    <span
                        class="dcWallet-svgIconPurple"
                        style="margin-left: 1px; top: 14px; left: 7px"
                        v-html="iShieldLock"
                    ></span>
                </div>
                <div style="width: 100%">
                    {{ txCreationStr }}
                    <LoadingBar
                        :show="true"
                        :percentage="txPercentageCreation"
                        style="
                            border: 1px solid #932ecd;
                            border-radius: 4px;
                            background-color: #2b003a;
                        "
                    ></LoadingBar>
                </div>
            </div>
        </center>
    </center>
</template>
