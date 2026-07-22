<script setup>
import iWalletPlus from '../../assets/icons/icon-wallet-plus.svg';
import { useWallets } from '../composables/use_wallet.js';
import { computed, ref, watch, nextTick } from 'vue';
import { COIN } from '../chain_params';
import { storeToRefs } from 'pinia';
import { useSettings } from '../composables/use_settings';
import { sleep } from '../utils';
import RestoreWallet from './RestoreWallet.vue';
import PlusIcon from '../../assets/icons/icon-plus.svg';

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

// Inline sub-account label editing — tracks which account (by export key) is open
const editingKey = ref(null);
const editingLabel = ref('');

function startEditLabel(wallet) {
    editingKey.value = wallet.getKeyToExport();
    editingLabel.value = wallet.label || '';
}

async function saveLabel(wallet) {
    // The editor closes before persisting, so the trailing blur is a no-op
    if (editingKey.value !== wallet.getKeyToExport()) return;
    editingKey.value = null;
    await wallet.setLabel(editingLabel.value);
}

function cancelEditLabel() {
    editingKey.value = null;
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
                            text-wrap: nowrap;
                        "
                    >
                        <strong>
                            {{
                                vault.label.length >= 13
                                    ? vault.label.slice(0, 13) + '...'
                                    : vault.label
                            }}
                        </strong></span
                    >

                    <span
                        style="
                            border-top: 1px solid #9221ff;
                            width: 100%;
                            height: 4px;
                            margin-left: 13px;
                        "
                    ></span>
                </div>
                <div
                    style="
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        gap: 10px;
                    "
                >
                    <div
                        v-for="(wallet, i) of vault.wallets"
                        @click="
                            select(wallet);
                            showLogin = false;
                        "
                        class="walletsItem walletContainer"
                        :class="{
                            walletSelected:
                                wallet.getKeyToExport() ===
                                wallets.activeWallet.getKeyToExport(),
                        }"
                    >
                        <span class="accountLabel">
                            <template
                                v-if="editingKey === wallet.getKeyToExport()"
                            >
                                <input
                                    :ref="(el) => el && el.focus()"
                                    v-model="editingLabel"
                                    class="accountLabelInput"
                                    :placeholder="`${vault.label} ${i}`"
                                    maxlength="24"
                                    @click.stop
                                    @keydown.enter.prevent="saveLabel(wallet)"
                                    @keydown.esc.prevent="cancelEditLabel()"
                                    @blur="saveLabel(wallet)"
                                />
                            </template>
                            <template v-else>
                                <i
                                    class="fa-solid fa-pencil accountEditIcon"
                                    @click.stop="startEditLabel(wallet)"
                                ></i>
                                <strong>{{
                                    wallet.label || `${vault.label} ${i}`
                                }}</strong>
                            </template>
                        </span>
                        <div class="walletsAmount">
                            <span style="margin-right: 5px">{{
                                formatBalance(
                                    (wallet.balance + wallet.shieldBalance) /
                                        COIN
                                )
                            }}</span>
                            <span class="walletsTicker">PIV</span>
                        </div>
                    </div>
                    <button
                        v-if="vault.canGenerateMore"
                        class="pivx-button"
                        @click="addWallet(vault)"
                        style="
                            padding: 6px;
                            background: none;
                            display: flex;
                            flex-direction: row;
                            align-items: center;
                            max-width: 150px;
                            align-self: center;
                            padding-left: 0.5rem;
                        "
                    >
                        <span
                            class="plus-icon purple-icon"
                            v-html="PlusIcon"
                            style="margin-bottom: 2px"
                        ></span>
                        <strong
                            style="
                                font-size: 0.8rem;
                                margin-left: 4px;
                                margin-right: 4px;
                            "
                            >ADD ACCOUNT</strong
                        >
                    </button>
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
                    + ADD NEW WALLET
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
<style>
.walletContainer {
    display: flex;
    align-items: center;
}
.accountLabel {
    display: flex;
    align-items: center;
    min-width: 0;
}
.accountEditIcon {
    cursor: pointer;
    margin-right: 8px;
    font-size: 0.8em;
    opacity: 0.5;
    transition: opacity 0.15s ease-in-out;
}
.accountEditIcon:hover {
    opacity: 1;
    color: #9221ff;
}
/* Seamless inline editor — overrides the global `input` rule (which forces a
   light background, monospace font, fixed 43px height and margins). Scoped under
   .multiWalletList + !important so it matches the static account name exactly. */
.multiWalletList .accountLabelInput {
    background: transparent !important;
    border: none !important;
    border-radius: 0 !important;
    outline: none !important;
    box-shadow: none !important;
    color: inherit !important;
    font-family: Montserrat, sans-serif !important;
    font-size: inherit !important;
    font-weight: 700 !important;
    line-height: inherit;
    height: auto !important;
    width: auto;
    min-width: 0;
    margin: 0 !important;
    padding: 0 !important;
}
.multiWalletList .accountLabelInput:focus-visible {
    outline: none !important;
    border: none !important;
}
/* Dim, same-size ghost of the account name (overrides the bright global placeholder) */
.multiWalletList .accountLabelInput::placeholder {
    color: inherit !important;
    opacity: 0.3 !important;
    font-size: inherit !important;
    font-weight: inherit !important;
}
.walletSelected {
    color: #9221ff;
    outline: 1px solid #9221ff;
    border-radius: 9px;
}
.purple-icon svg path {
    fill: #9221ff !important;
}
</style>
