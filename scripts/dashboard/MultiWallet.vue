<script setup>
import iWalletPlus from '../../assets/icons/icon-wallet-plus.svg';
import { useWallets } from '../composables/use_wallet.js';
import { computed, ref, watch, nextTick } from 'vue';
import { COIN } from '../chain_params';
import { storeToRefs } from 'pinia';
import { useSettings } from '../composables/use_settings';
import { sleep } from '../utils';
import RestoreWallet from './RestoreWallet.vue';

const wallets = useWallets();
const { activeWallet, activeVault } = storeToRefs(wallets);

const isMultiWalletOpen = ref(false);
const multiWalletOpenedClass = ref(false);
const multiWalletOpacity = ref(false);
const settings = useSettings();
const showRestoreWallet = ref(false);

const props = defineProps({
    advancedMode: Boolean,
    importLock: Boolean,
});

const { showLogin } = storeToRefs(useSettings());

const totalBalance = computed(() => {
    return wallets.vaults.reduce((sum, vault) => {
        return (
            sum +
            vault.wallets.reduce(
                (wSum, wallet) =>
                    wSum + (wallet.balance + wallet.shieldBalance) / COIN,
                0
            )
        );
    }, 0);
});

const vClickOutside = {
    beforeMount(el, binding) {
        el.__clickOutsideHandler__ = (event) => {
            if (!(el === event.target || el.contains(event.target))) {
                binding.value(event);
            }
        };
        document.addEventListener('click', el.__clickOutsideHandler__);
    },
    unmounted(el) {
        document.removeEventListener('click', el.__clickOutsideHandler__);
        el.__clickOutsideHandler__ = null;
    },
};

/**
 * Toggle multiwallet chooser
 */
watch(isMultiWalletOpen, (newValue) => {
    if (newValue) {
        multiWalletOpenedClass.value = true;
        setTimeout(() => {
            multiWalletOpacity.value = true;
        }, 10);
    } else {
        multiWalletOpacity.value = false;
        setTimeout(() => {
            multiWalletOpenedClass.value = false;
        }, 200);
    }
});

/**
 * Select a specific wallet
 */
function select(wallet) {
    wallets.selectWallet(wallet);
}

function formatBalance(balance) {
    return balance.toFixed(settings.displayDecimals);
}

async function addWallet(vault) {
    if (activeVault.value.isViewOnly && !activeWallet.value.isHardwareWallet) {
        if (!(await restoreWallet())) return false;
    }
    vault.addWallet(vault.wallets.length);
}

async function restoreWallet() {
    if (!activeVault.value.isEncrypted) return false;
    if (activeWallet.value.isHardwareWallet) return true;
    showRestoreWallet.value = true;
    return await new Promise((res) => {
        watch(
            [showRestoreWallet, () => activeVault.value.isViewOnly],
            () => {
                showRestoreWallet.value = false;
                res(!activeVault.value.isViewOnly);
            },
            { once: true }
        );
    });
}
</script>

<template>
    <div style="position: relative">
        <div
            id="MultiWalletSwitcher"
            class="multiWalletBtn"
            @click="
                if (!isMultiWalletOpen) {
                    sleep(1).then(() => {
                        isMultiWalletOpen = true;
                    });
                }
            "
            v-if="wallets.vaults.length"
        >
            <div class="multiWalletContent">
                <div class="walletsName">{{ wallets.activeVault?.label }}</div>
                <div class="walletsRight">
                    <div class="walletsAmount">
                        <span style="margin-right: 5px">{{
                            formatBalance(totalBalance)
                        }}</span>
                        <span class="walletsTicker">PIV</span>
                    </div>
                    <i
                        class="fa-solid fa-angle-down walletsArrow"
                        :class="{ rotate: isMultiWalletOpen }"
                        id="multiWalletArrow"
                    >
                    </i>
                </div>
            </div>
            <div class="multiWalletIcon">
                <span class="switchWalletIcon" v-html="iWalletPlus"></span>
            </div>
        </div>
        <div
            id="multiWalletList"
            class="multiWalletList"
            :class="{ opened: multiWalletOpenedClass }"
            :style="{ opacity: multiWalletOpacity ? 1 : 0 }"
            v-click-outside="
                () => {
                    if (isMultiWalletOpen) {
                        isMultiWalletOpen = false;
                    }
                }
            "
        >
            <div v-for="vault of wallets.vaults" style="padding-bottom: 10px">
                <div style="display: flex; align-items: center">
                    <span
                        style="
                            text-transform: uppercase;
                            color: #9221ff;
                            font-size: 13px;
                        "
                        >{{
                            vault.label.length >= 13
                                ? vault.label.slice(0, 13) + '...'
                                : vault.label
                        }}</span
                    >
                    <span
                        style="
                            border-top: 1px solid #9221ff;
                            width: 100%;
                            height: 4px;
                            margin-left: 13px;
                        "
                    ></span>
                    <div>
                        <button
                            v-if="vault.canGenerateMore"
                            class="pivx-button-small"
                            @click="addWallet(vault)"
                            style="
                                padding: 0px;
                                height: 25px;
                                width: 25px;
                                margin-left: 11px;
                                font-size: 20px !important;
                            "
                        >
                            +
                        </button>
                    </div>
                </div>
                <div
                    v-for="(wallet, i) of vault.wallets"
                    @click="
                        select(wallet);
                        showLogin = false;
                    "
                    class="walletsItem"
                    :style="{
                        color:
                            wallet.getKeyToExport() ===
                            wallets.activeWallet.getKeyToExport()
                                ? '#9221FF'
                                : '',
                    }"
                >
                    <span>{{ vault.label }} {{ i }}</span>
                    <div class="walletsAmount">
                        <span style="margin-right: 5px">{{
                            formatBalance(
                                (wallet.balance + wallet.shieldBalance) / COIN
                            )
                        }}</span>
                        <span class="walletsTicker">PIV</span>
                    </div>
                </div>
            </div>
            <hr
                style="
                    border-top: 1px solid #9421ff;
                    margin-left: -14px;
                    margin-right: -14px;
                "
            />
            <div
                style="display: flex; justify-content: center; margin-top: 5px"
            >
                <button
                    class="pivx-button-big"
                    @click="
                        showLogin = true;
                        isMultiWalletOpen = false;
                    "
                    style="padding: 11px 12px; width: 100%"
                >
                    + ADD ACCOUNT
                </button>
            </div>
        </div>
    </div>
    <RestoreWallet
        :show="showRestoreWallet"
        :wallet="activeWallet"
        @close="showRestoreWallet = false"
    />
</template>
