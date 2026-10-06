<script setup>
import { cChainParams, COIN } from '../chain_params.js';
import { translation, tr } from '../i18n';
import { ref, computed, toRefs, watch } from 'vue';
import { useAnimatedNumber } from '../composables/use_animated_number.js';
import { beautifyNumber } from '../misc';
import { useWallets } from '../composables/use_wallet';
import { optimiseCurrencyLocale } from '../global';
import { renderWalletBreakdown } from '../charting.js';
import { guiRenderCurrentReceiveModal } from '../contacts-book';
import { getNewAddress } from '../wallet.js';
import LoadingBar from '../Loadingbar.vue';
import Tip from '../Tip.vue';
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
import iCheck from '../../assets/icons/icon-check.svg';

const props = defineProps({
    balance: Number,
    shieldBalance: Number,
    pendingShieldBalance: Number,
    immatureBalance: Number,
    immatureColdBalance: Number,
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
    // The active wallet's initial sync is in flight
    syncing: Boolean,
    // Briefly true right after a sync completes, to flash the 'synced' pill
    justSynced: Boolean,
});
const {
    balance,
    shieldBalance,
    pendingShieldBalance,
    immatureBalance,
    immatureColdBalance,
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
    syncing,
    justSynced,
} = toRefs(props);

const wallets = useWallets();

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

function resetSyncing() {
    // Transparent sync status
    transparentSyncing.value = false;
    percentage.value = 0.0;
    syncTStr.value = '';

    // Shield sync status
    shieldSyncing.value = false;
    shieldSyncingStr.value = '';

    // Shield transaction creation
    isCreatingTx.value = false;
    txPercentageCreation.value = 0.0;
    txCreationStr.value = 'Creating SHIELD transaction...';
}

watch([() => wallets.activeVault, () => wallets.activeWallet], () => {
    resetSyncing();
});

// Primary balance in coins, depending on the user's mode
const primaryCoins = computed(
    () => (publicMode.value ? balance : shieldBalance).value / COIN
);

// Snap (rather than count) whenever the account or mode changes, so switching
// context never looks like funds moving
const balanceContextKey = () => {
    const wallet = wallets.activeWallet;
    const id = wallet?.isImported ? wallet.getKeyToExport() : '';
    return `${id}:${publicMode.value}`;
};
const animatedCoins = useAnimatedNumber(
    () => primaryCoins.value,
    balanceContextKey
);

// Pulse the card when funds arrive or leave while the user is looking at it
const balancePulse = ref('');
let pulseTimer = null;
watch([primaryCoins, balanceContextKey], ([now, key], [before, oldKey]) => {
    if (key !== oldKey || !wallets.activeWallet?.isSynced || now === before)
        return;
    clearTimeout(pulseTimer);
    balancePulse.value = '';
    // Restart the CSS animation on the next frame
    requestAnimationFrame(() => {
        balancePulse.value = now > before ? 'pulse-up' : 'pulse-down';
        pulseTimer = setTimeout(() => (balancePulse.value = ''), 1600);
    });
});

const primaryBalanceStr = computed(() => {
    const strBal = animatedCoins.value.toFixed(displayDecimals.value);
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

const showImmatureBalanceIcon = computed(
    () => immatureColdBalance.value > 0 && publicMode.value
);

const showImmatureBalanceTip = ref(false);

const balanceValue = computed(() => {
    // Convert our primary balance to the user's currency
    const { nValue, cLocale } = optimiseCurrencyLocale(
        animatedCoins.value * price.value
    );

    return `${beautifyNumber(nValue, '13px', cLocale)}`;
});

const ticker = computed(() => cChainParams.current.TICKER);

// Show a placeholder instead of a misleading 0.00 during the first sync
const showSkeleton = computed(
    () => syncing.value && !wallets.activeWallet?.isSynced
);

const hasImmature = computed(
    () =>
        (publicMode.value && immatureBalance.value != 0) ||
        (!publicMode.value && pendingShieldBalance.value != 0)
);

// What the status pill under the card should say, if anything
const syncPill = computed(() => {
    if (transparentSyncing.value)
        return { state: 'syncing', text: syncTStr.value };
    if (shieldSyncing.value)
        return { state: 'syncing', text: shieldSyncingStr.value };
    if (justSynced.value)
        return { state: 'done', text: translation.syncStatusSynced };
    return null;
});

const emit = defineEmits([
    'send',
    'exportPrivKeyOpen',
    'displayLockWalletModal',
    'restoreWallet',
]);

let listeners = [];

watch(
    () => wallets.activeWallet,
    () => {
        const wallet = wallets.activeWallet;

        for (const listener of listeners) {
            listener();
        }
        listeners = [];
        listeners.push(
            wallet.onTransparentSyncStatusUpdate((i, totalPages, finished) => {
                const str = tr(translation.syncStatusHistoryProgress, [
                    { current: totalPages - i + 1 },
                    { total: totalPages },
                ]);
                const progress = ((totalPages - i) / totalPages) * 100;
                syncTStr.value = str;
                percentage.value = progress;
                transparentSyncing.value = !finished;
            })
        );

        listeners.push(
            wallet.onShieldSyncStatusUpdate((bytes, totalBytes, finished) => {
                percentage.value = Math.round((100 * bytes) / totalBytes);
                const mb = bytes / 1_000_000;
                const totalMb = totalBytes / 1_000_000;
                shieldSyncingStr.value = tr(translation.syncingShield, [
                    { progress: mb.toFixed(1) },
                    { total: totalMb.toFixed(1) },
                ]);
                shieldSyncing.value = !finished;
            })
        );

        listeners.push(
            wallet.onShieldTransactionCreationUpdate(
                // state: 0 = loading shield params
                //        1 = proving tx
                //        2 = finished
                async (percentage, state) => {
                    if (state === 0) {
                        txCreationStr.value =
                            translation.syncLoadingSaplingProver;
                    } else {
                        txCreationStr.value =
                            translation.creatingShieldTransaction;
                    }

                    // If it just finished sleep for 1 second before making everything invisible
                    if (state === 2) {
                        txPercentageCreation.value = 100.0;
                        await sleep(1000);
                    }
                    isCreatingTx.value = state !== 2;
                    txPercentageCreation.value = percentage;
                }
            )
        );
    },
    { immediate: true }
);

function displayLockWalletModal() {
    emit('displayLockWalletModal');
}

function restoreWallet() {
    emit('restoreWallet');
}
</script>

<template>
    <div class="balance-wrap">
        <div
            class="balance-card"
            :class="[balancePulse, { 'is-private': !publicMode }]"
            data-testid="walletBalance"
            :data-synced="!!wallets.activeWallet?.isSynced"
        >
            <div class="balance-toolbar">
                <div>
                    <template v-if="wallets.activeVault?.isEncrypted">
                        <button
                            v-if="wallets.activeVault?.isViewOnly"
                            class="balance-icon-btn"
                            :aria-label="translation.unlockWallet"
                            @click="restoreWallet()"
                        >
                            <span
                                class="dcWallet-topLeftIcons buttoni-icon"
                                v-html="pLocked"
                            ></span>
                        </button>
                        <button
                            v-else
                            class="balance-icon-btn"
                            :aria-label="translation.lockWallet"
                            @click="displayLockWalletModal()"
                        >
                            <span
                                class="dcWallet-topLeftIcons buttoni-icon"
                                v-html="pUnlocked"
                            ></span>
                        </button>
                    </template>
                </div>

                <div class="dcWallet-topRightMenu">
                    <div class="btn-group dropleft">
                        <button
                            class="balance-icon-btn"
                            data-toggle="dropdown"
                            aria-haspopup="true"
                            aria-expanded="false"
                            aria-label="Menu"
                        >
                            <i class="fa-solid fa-ellipsis-vertical"></i>
                        </button>
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

            <img :src="logo" class="balance-logo" alt="" />

            <Transition name="collapse-y">
                <div v-if="hasImmature" class="collapse-y">
                    <div>
                        <div class="balance-chip">
                            <span
                                v-html="iHourglass"
                                class="hourglassImmatureIcon"
                            ></span>
                            <span>{{ primaryImmatureBalanceStr }}</span>
                            <i
                                v-if="showImmatureBalanceIcon"
                                class="fa-solid fa-circle-info ptr"
                                @click="showImmatureBalanceTip = true"
                            ></i>
                        </div>
                    </div>
                </div>
            </Transition>

            <Transition name="balance-swap" mode="out-in">
                <div v-if="showSkeleton" key="skeleton" class="balance-main">
                    <span class="skeleton balance-skeleton-amount"></span>
                    <span class="skeleton balance-skeleton-fiat"></span>
                </div>
                <div v-else key="balance" class="balance-main">
                    <span
                        class="balance-primary ptr"
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
                        <span class="dcWallet-pivxTicker"
                            >&nbsp;<span
                                data-testid="shieldModePrefix"
                                v-if="!publicMode"
                                >S-</span
                            >{{ ticker }}</span
                        >
                    </span>

                    <div class="balance-fiat">
                        <span class="balance-fiat-value" v-html="balanceValue">
                        </span>
                        <span class="balance-fiat-currency"
                            >&nbsp;{{ currency }}</span
                        >
                    </div>
                </div>
            </Transition>

            <div class="balance-secondary" v-if="shieldEnabled">
                <span
                    class="shieldBalanceLogo"
                    v-html="publicMode ? iShieldLogo : pLogo"
                ></span>
                <span
                    >{{ secondaryBalanceStr }} <span v-if="publicMode">S-</span
                    >{{ ticker }}</span
                >
                <span
                    class="balance-secondary-pending"
                    v-if="
                        (!publicMode && immatureBalance != 0) ||
                        (publicMode && pendingShieldBalance != 0)
                    "
                    >({{ secondaryImmatureBalanceStr }} Pending)</span
                >
            </div>

            <div class="balance-actions">
                <button class="pivx-button-small" @click="$emit('send')">
                    <i class="fa-solid fa-arrow-up"></i>
                    <span class="buttoni-text">
                        {{ translation.send }}
                    </span>
                </button>
                <button
                    class="pivx-button-small"
                    @click="guiRenderCurrentReceiveModal()"
                    data-toggle="modal"
                    data-target="#qrModal"
                >
                    <i class="fa-solid fa-arrow-down"></i>
                    <span class="buttoni-text">
                        {{ translation.receive }}
                    </span>
                </button>
            </div>
        </div>

        <!-- Outside the card: its backdrop-filter would trap position:fixed -->
        <Tip
            :body="translation.immatureRewards"
            :show="showImmatureBalanceTip"
            @close="showImmatureBalanceTip = false"
        />

        <Transition name="collapse-y">
            <div v-if="syncPill" class="collapse-y">
                <div>
                    <div
                        class="status-pill"
                        :class="'status-pill-' + syncPill.state"
                        data-testid="syncStatus"
                    >
                        <div class="status-pill-icon">
                            <Transition name="icon-pop" mode="out-in">
                                <span
                                    v-if="syncPill.state === 'done'"
                                    key="done"
                                    class="status-pill-check"
                                    v-html="iCheck"
                                ></span>
                                <i
                                    v-else
                                    key="syncing"
                                    class="fas fa-spinner spinningLoading"
                                ></i>
                            </Transition>
                        </div>
                        <div class="status-pill-body">
                            {{ syncPill.text }}
                            <LoadingBar
                                v-if="syncPill.state === 'syncing'"
                                :show="true"
                                :percentage="percentage"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </Transition>

        <Transition name="collapse-y">
            <div v-if="isCreatingTx" class="collapse-y">
                <div>
                    <div class="status-pill status-pill-syncing">
                        <div class="status-pill-icon">
                            <span
                                class="dcWallet-svgIconPurple"
                                v-html="iShieldLock"
                            ></span>
                        </div>
                        <div class="status-pill-body">
                            {{ txCreationStr }}
                            <LoadingBar
                                :show="true"
                                :percentage="txPercentageCreation"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </Transition>
    </div>
</template>
<style>
.balance-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.balance-card {
    font-family: Montserrat, sans-serif;
    position: relative;
    width: 100%;
    max-width: 340px;
    margin-bottom: 18px;
    padding: 10px 18px 20px;
    text-align: center;
    border-radius: 20px;
    border: 1px solid rgba(146, 33, 255, 0.35);
    background: radial-gradient(
            120% 80% at 50% 0%,
            rgba(146, 33, 255, 0.28),
            transparent 60%
        ),
        linear-gradient(180deg, rgba(50, 26, 88, 0.72), rgba(28, 14, 50, 0.78));
    backdrop-filter: blur(8px);
    box-shadow: var(--mpw-shadow-card), inset 0 1px 0 rgba(255, 255, 255, 0.06);
    animation: mpw-fade-up var(--mpw-dur-slow) var(--mpw-ease-out) backwards;
    transition: border-color var(--mpw-dur-slow) ease,
        box-shadow var(--mpw-dur-slow) ease;
}

.balance-card.is-private {
    border-color: rgba(197, 107, 255, 0.45);
}

.balance-card.pulse-up {
    animation: mpw-balance-pulse-up 1.6s var(--mpw-ease-out);
}

.balance-card.pulse-down {
    animation: mpw-balance-pulse-down 1.6s var(--mpw-ease-out);
}

@keyframes mpw-balance-pulse-up {
    20% {
        border-color: rgba(92, 255, 92, 0.7);
        box-shadow: var(--mpw-shadow-card), 0 0 0 4px rgba(92, 255, 92, 0.12),
            0 0 40px -6px rgba(92, 255, 92, 0.45);
    }
}

@keyframes mpw-balance-pulse-down {
    20% {
        border-color: rgba(197, 107, 255, 0.8);
        box-shadow: var(--mpw-shadow-card), 0 0 0 4px rgba(146, 33, 255, 0.16);
    }
}

.balance-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    min-height: 36px;
}

.balance-icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    margin: 0;
    padding: 0;
    border: 0;
    border-radius: 10px;
    background: transparent;
    color: #c9a8ff;
    font-size: 17px;
    transition: background-color var(--mpw-dur-fast) ease,
        transform var(--mpw-dur-fast) ease;
}

.balance-icon-btn:hover {
    background-color: rgba(255, 255, 255, 0.07);
}

.balance-icon-btn:active {
    transform: scale(0.92);
}

.balance-icon-btn .dcWallet-topLeftIcons svg {
    top: 0;
}

.balance-logo {
    height: 56px;
    margin-top: -18px;
    filter: drop-shadow(0 6px 18px rgba(146, 33, 255, 0.45));
}

.balance-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 10px;
    padding: 3px 11px;
    border-radius: 999px;
    background: rgba(124, 101, 158, 0.16);
    color: #a993c9;
    font-size: 13px;
}

.balance-main {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-height: 72px;
    justify-content: center;
    margin-top: 8px;
}

.balance-primary {
    display: inline-flex;
    align-items: baseline;
    justify-content: center;
    border-radius: 12px;
    padding: 0 8px;
    transition: background-color var(--mpw-dur-fast) ease;
}

.balance-primary:hover {
    background-color: rgba(255, 255, 255, 0.04);
}

.balance-primary .logo-pivBal {
    align-self: center;
}

.balance-primary .dcWallet-pivxBalance {
    font-size: 40px;
    font-weight: 500;
    letter-spacing: -0.01em;
    color: #fff;
}

.balance-primary .dcWallet-pivxTicker {
    font-size: 17px;
    color: #c9b6e8;
}

.balance-fiat {
    margin-top: 2px;
    font-size: 14px;
    font-variant-numeric: tabular-nums;
}

.balance-fiat-value {
    color: #d7d7d7;
    font-weight: 500;
}

.balance-fiat-currency {
    opacity: 0.55;
}

.balance-skeleton-amount {
    width: 170px;
    height: 38px;
    border-radius: 10px;
}

.balance-skeleton-fiat {
    width: 90px;
    height: 14px;
    margin-top: 10px;
}

.balance-secondary {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin: 14px auto 0;
    padding: 6px 14px;
    width: fit-content;
    border-radius: 999px;
    background: rgba(146, 33, 255, 0.12);
    color: #b67bff;
    font-size: 14px;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
}

.balance-secondary .shieldBalanceLogo svg {
    top: 0;
    height: 14px;
    fill: currentColor;
}

.balance-secondary-pending {
    opacity: 0.75;
}

.balance-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-top: 18px;
}

.balance-actions .pivx-button-small {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 44px;
    margin: 0;
    padding: 0 16px;
}

.balance-actions .pivx-button-small i {
    font-size: 12px;
    opacity: 0.85;
}

/* Status pill (sync progress / synced / shield tx creation) */
.status-pill {
    font-family: Montserrat, sans-serif;
    display: flex;
    align-items: center;
    gap: 11px;
    width: 340px;
    max-width: 100%;
    margin: 0 auto 16px;
    padding: 9px 14px 10px 10px;
    border-radius: 14px;
    border: 1px solid rgba(159, 0, 249, 0.45);
    background: rgba(58, 12, 96, 0.55);
    backdrop-filter: blur(6px);
    color: #d3bee5;
    font-size: 14px;
    text-align: left;
    transition: border-color var(--mpw-dur-slow) ease,
        background-color var(--mpw-dur-slow) ease;
}

.status-pill-done {
    border-color: rgba(92, 255, 92, 0.45);
    background: rgba(28, 70, 30, 0.45);
    color: #c8f5c8;
}

.status-pill-icon {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: 10px;
    background-color: rgba(49, 11, 81, 0.85);
    font-size: 16px;
}

.status-pill-done .status-pill-icon {
    background-color: rgba(46, 120, 46, 0.55);
}

.status-pill-check svg {
    display: block;
    width: 16px;
    height: 16px;
    fill: #9dff9d;
}

.status-pill-icon .dcWallet-svgIconPurple {
    margin-top: 0;
    top: 0;
}

.status-pill-body {
    flex: 1 1 auto;
    min-width: 0;
}

/* Height-collapsing wrapper: animates layout instead of jumping */
.collapse-y {
    display: grid;
    grid-template-rows: 1fr;
    width: 100%;
}

.collapse-y > div {
    min-height: 0;
    overflow: hidden;
}

.collapse-y-enter-active,
.collapse-y-leave-active {
    transition: grid-template-rows var(--mpw-dur-slow) var(--mpw-ease-out),
        opacity var(--mpw-dur-slow) ease;
}

.collapse-y-enter-from,
.collapse-y-leave-to {
    grid-template-rows: 0fr;
    opacity: 0;
}

.balance-swap-enter-active,
.balance-swap-leave-active {
    transition: opacity var(--mpw-dur-base) ease,
        transform var(--mpw-dur-base) var(--mpw-ease-out);
}

.balance-swap-enter-from {
    opacity: 0;
    transform: translateY(6px);
}

.balance-swap-leave-to {
    opacity: 0;
}

.icon-pop-enter-active {
    transition: transform var(--mpw-dur-slow) var(--mpw-ease-spring),
        opacity var(--mpw-dur-base) ease;
}

.icon-pop-enter-from {
    transform: scale(0.3);
    opacity: 0;
}
</style>
