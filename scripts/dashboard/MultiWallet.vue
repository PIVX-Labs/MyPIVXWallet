<script setup>
import { useWallets } from '../composables/use_wallet.js';
import Modal from '../Modal.vue';
import { translation } from '../i18n.js';

import { computed, ref, toRefs, watch } from 'vue';

import iWalletPlus from '../../assets/icons/icon-wallet-plus.svg';
import { COIN } from '../chain_params';

const wallets = useWallets();

const isMultiWalletOpen = ref(false);
const multiWalletOpenedClass = ref(false);
const multiWalletOpacity = ref(false);
const blur = ref(true);
const showAccessLedger = ref(false);
const showAccessWallet = ref(false);
const showCreateVanity = ref(false);
const showCreateWallet = ref(true);

const props = defineProps({
    advancedMode: Boolean,
    importLock: Boolean,
});

const { importLock } = toRefs(props);

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
</script>

<template>
    <div style="position: relative">
        <div
            id="MultiWalletSwitcher"
            class="multiWalletBtn"
            @click="isMultiWalletOpen = !isMultiWalletOpen"
        >
            <div class="multiWalletContent">
                <div class="walletsName">Core 1</div>
                <div class="walletsRight">
                    <div class="walletsAmount">
                        <span style="margin-right: 5px">{{
                            totalBalance
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
                            class="pivx-button-small"
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
                    v-for="wallet of vault.wallets"
                    @click="select(wallet)"
                    class="walletsItem"
                    :style="{
                        color:
                            wallet.getKeyToExport() ===
                            wallets.activeWallet.getKeyToExport()
                                ? '#9221FF'
                                : '',
                    }"
                >
                    <span>Wallet</span>
                    <div class="walletsAmount">
                        <span style="margin-right: 5px">{{
                            wallet.balance / COIN
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
                    @click="generateWallet"
                    style="padding: 11px 12px; width: 100%"
                >
                    + ADD ACCOUNT
                </button>
            </div>
        </div>
    </div>
    
    <Modal :show="showAccessLedger" modalClass="exportKeysModalColor">
        <template #header>
            <h5 class="modal-title modal-title-new">
                Access PIVX Ledger Wallet
            </h5>
        </template>
        <template #body>
            <div style="color:#a49bb5;">
                <center>
                    <div style="color:#c4becf!important">
                        Use your Ledger Hardware wallet with MPW's familiar interface.<br><br>
                        Compatible hardware wallet will be automatically found if it's plugged in and unlocked.<br><br>
                    </div>
                </center>

                <div style="text-align:left">
                    <span style="margin-bottom: 3px; font-size: 15px; display: block; margin-left: 6px; margin-top: 6px;">Custom wallet name <span style="color:#a082d9;">(max. 8 characters)</span></span>
                    <input type="text">
                </div>
            </div>
        </template>
        <template #footer>
            <center>
                <button
                    type="button"
                    class="pivx-button-big-cancel"
                    data-testid="closeBtn"
                    @click="close()"
                >
                    {{ translation.popupCancel }}
                </button>
                <button
                    class="pivx-button-big"
                    @click="blur = !blur"
                    data-testid="blurBtn"
                >
                    <span class="buttoni-text">
                        Access Wallet
                    </span>
                </button>
            </center>
        </template>
    </Modal>

    <Modal :show="showAccessWallet" modalClass="exportKeysModalColor">
        <template #header>
            <h5 class="modal-title modal-title-new">
                Access PIVX Ledger Wallet
            </h5>
        </template>
        <template #body>
            <div style="color:#a49bb5;">
                <center>
                    <div style="color:#c4becf!important">
                        Import a PIVX wallet using a Private Key, xpriv, or Seed Phrase.<br><br>
                    </div>
                </center>

                <div style="text-align:left">
                    <span style="margin-bottom: 3px; font-size: 15px; display: block; margin-left: 6px;">Seed Phrase, XPriv or WIF Private Key</span>
                    <input type="text">

                    <span style="margin-bottom: 3px; font-size: 15px; display: block; margin-left: 6px; margin-top: 6px;">Custom wallet name <span style="color:#a082d9;">(max. 8 characters)</span></span>
                    <input type="text">
                </div>
            </div>
        </template>
        <template #footer>
            <center>
                <button
                    type="button"
                    class="pivx-button-big-cancel"
                    data-testid="closeBtn"
                    @click="close()"
                >
                    {{ translation.popupCancel }}
                </button>
                <button
                    class="pivx-button-big"
                    @click="blur = !blur"
                    data-testid="blurBtn"
                >
                    <span class="buttoni-text">
                        Access Wallet
                    </span>
                </button>
            </center>
        </template>
    </Modal>

    <Modal :show="showCreateVanity" modalClass="exportKeysModalColor">
        <template #header>
            <h5 class="modal-title modal-title-new">
                Create a Vanity PIVX Wallet
            </h5>
        </template>
        <template #body>
            <div style="color:#a49bb5;">
                <center>
                    <div style="color:#c4becf!important">
                        Create a wallet with a custom prefix, this can take a long time!<br>
                        <u><b>Note:</b> addresses will always start with: <b>D</b></u><br><br>
                    </div>
                </center>

                <div style="text-align:left">
                    <span style="margin-bottom: 3px; font-size: 15px; display: block; margin-left: 6px;">Address prefix</span>
                    <input type="text">

                    <span style="margin-bottom: 3px; font-size: 15px; display: block; margin-left: 6px; margin-top: 6px;">Custom wallet name <span style="color:#a082d9;">(max. 8 characters)</span></span>
                    <input type="text">
                </div>
            </div>
        </template>
        <template #footer>
            <center>
                <button
                    type="button"
                    class="pivx-button-big-cancel"
                    data-testid="closeBtn"
                    @click="close()"
                >
                    {{ translation.popupCancel }}
                </button>
                <button
                    class="pivx-button-big"
                    @click="blur = !blur"
                    data-testid="blurBtn"
                >
                    <span class="buttoni-text">
                        Create Wallet
                    </span>
                </button>
            </center>
        </template>
    </Modal>

    <Modal :show="showCreateWallet" modalClass="exportKeysModalColor">
        <template #header>
            <h5 class="modal-title modal-title-new">
                Create a New PIVX Wallet
            </h5>
        </template>
        <template #body>
            <div style="color:#a49bb5;">
                <center>
                    <div style="color:#c4becf!important">
                        This is your seed phrase, <b>write it down somewhere.<br>
                        <u>You'll only see this once!</u></b><br><br>
                    </div>
                </center>

                <div style="display: flex; justify-content: center; flex-wrap: wrap;">
                    <div class="privateKeysBadgeWrapper">
                        1<br>
                        <div class="privateKeysBadge"><span class="filterBlur">somewhere</span></div>
                    </div>
                    
                    <div class="privateKeysBadgeWrapper">
                        2<br>
                        <div class="privateKeysBadge"><span class="filterBlur">test</span></div>
                    </div>
                    
                    <div class="privateKeysBadgeWrapper">
                        3<br>
                        <div class="privateKeysBadge"><span class="filterBlur">test</span></div>
                    </div>
                    
                    <div class="privateKeysBadgeWrapper">
                        4<br>
                        <div class="privateKeysBadge"><span class="filterBlur">test</span></div>
                    </div>
                    
                    <div class="privateKeysBadgeWrapper">
                        5<br>
                        <div class="privateKeysBadge"><span class="filterBlur">test</span></div>
                    </div>
                    
                    <div class="privateKeysBadgeWrapper">
                        6<br>
                        <div class="privateKeysBadge"><span class="filterBlur">test</span></div>
                    </div>
                    
                    <div class="privateKeysBadgeWrapper">
                        7<br>
                        <div class="privateKeysBadge"><span class="filterBlur">test</span></div>
                    </div>
                    
                    <div class="privateKeysBadgeWrapper">
                        8<br>
                        <div class="privateKeysBadge"><span class="filterBlur">test</span></div>
                    </div>
                    
                    <div class="privateKeysBadgeWrapper">
                        9<br>
                        <div class="privateKeysBadge"><span class="filterBlur">test</span></div>
                    </div>
                    
                    <div class="privateKeysBadgeWrapper">
                        10<br>
                        <div class="privateKeysBadge"><span class="filterBlur">test</span></div>
                    </div>
                    
                    <div class="privateKeysBadgeWrapper">
                        11<br>
                        <div class="privateKeysBadge"><span class="filterBlur">test</span></div>
                    </div>
                    
                    <div class="privateKeysBadgeWrapper">
                        12<br>
                        <div class="privateKeysBadge"><span class="filterBlur">test</span></div>
                    </div>
                </div><br>

                <div style="text-align:left;">
                    <span style="margin-bottom: 3px; font-size: 15px; display: block; margin-left: 6px; margin-top: 6px;">Custom wallet name <span style="color:#a082d9;">(max. 8 characters)</span></span>
                    <input type="text" style="margin-bottom: 0px;">
                </div>
            </div>
        </template>
        <template #footer>
            <center>
                <button
                    type="button"
                    class="pivx-button-big-cancel"
                    data-testid="closeBtn"
                    @click="close()"
                >
                    {{ translation.popupCancel }}
                </button>
                <button
                    class="pivx-button-big"
                    @click="blur = !blur"
                    data-testid="blurBtn"
                >
                    <span class="buttoni-text">
                        Wrote it down
                    </span>
                </button>
            </center>
        </template>
    </Modal>
</template>
