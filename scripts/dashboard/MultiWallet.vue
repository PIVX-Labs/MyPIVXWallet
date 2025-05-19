<script setup>
import iWalletPlus from '../../assets/icons/icon-wallet-plus.svg';
import { useWallets } from '../composables/use_wallet.js';
import { computed, ref, watch } from 'vue';
import { COIN } from '../chain_params';
import { storeToRefs } from 'pinia';
import { useSettings } from '../composables/use_settings';

const wallets = useWallets();

const isMultiWalletOpen = ref(false);
const multiWalletOpenedClass = ref(false);
const multiWalletOpacity = ref(false);
const settings = useSettings();

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
</script>

<template>
    <div style="position: relative">
        <div
            id="MultiWalletSwitcher"
            class="multiWalletBtn"
            @click="isMultiWalletOpen = !isMultiWalletOpen"
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
                            v-if="vault.canGenerateMore()"
                            class="pivx-button-small"
                            @click="vault.addWallet(vault.wallets.length)"
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
</template>
