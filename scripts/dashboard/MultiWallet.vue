<script setup>
import { useWallets } from '../composables/use_wallet.js';
import { computed } from 'vue';

import iWalletPlus from '../../assets/icons/icon-wallet-plus.svg';

const wallets = useWallets();

const totalBalance = computed(() => {
  return wallets.vaults.reduce((sum, vault) => {
    return sum + vault.wallets.reduce((wSum, wallet) => wSum + Number(wallet.balance), 0);
  }, 0);
});

/**
 * Toggle multiwallet chooser
 */
function toggleMultiwallet() {
    let multiWalletListDom = document.getElementById('multiWalletList');
    let multiWalletArrowDom = document.getElementById('multiWalletArrow');

    if(multiWalletListDom.classList.value.includes('opened')) {
        multiWalletArrowDom.classList.remove('rotate');
        multiWalletList.style.opacity = 0;
        
        setTimeout(() => {
            multiWalletList.classList.remove('opened');
        }, 200);
    } else {
        multiWalletArrowDom.classList.add('rotate');
        multiWalletList.classList.add('opened');
        
        setTimeout(() => {
            multiWalletList.style.opacity = 1;
        }, 1);
    }
}
</script>

<template>
    <div style="position:relative;">
        <div id="MultiWalletSwitcher" class="multiWalletBtn" @click="toggleMultiwallet()">
            <div class="multiWalletContent">
                <div class="walletsName">Core 1</div>
                <div class="walletsRight">
                    <div class="walletsAmount">
                        <span v-html="totalBalance"></span> <span class="walletsTicker">PIV</span>
                    </div>
                    <i class="fa-solid fa-angle-down walletsArrow" id="multiWalletArrow"></i>
                </div>
            </div>
            <div class="multiWalletIcon">
                <span
                    class="checkIcon"
                    v-html="iWalletPlus"
                ></span>
            </div>
        </div>
        <div id="multiWalletList" class="multiWalletList">
            <div v-for="vault of wallets.vaults" style="padding-bottom: 10px;">
                <div style="display:flex; align-items: center;">
                    <span style="text-transform: uppercase; color:#9221ff; font-size:13px;" v-html="(vault.label.length >= 13 ? vault.label.slice(0, 13) + '...' : vault.label)"></span>
                    <span style="border-top:1px solid #9221ff; width:100%; height:4px; margin-left:13px;"></span>
                    <div>
                        <button class="pivx-button-small" style="padding: 0px; height: 25px; width: 25px; margin-left: 11px; font-size: 20px !important;">+</button>
                    </div>
                </div>
                <div v-for="wallet of vault.wallets" class="walletsItem">
                    <span>Wallet</span>
                    <div class="walletsAmount">
                        <span v-html="wallet.balance"></span> <span class="walletsTicker">PIV</span>
                    </div>
                </div>
            </div>
            <hr style="border-top: 1px solid #9421FF; margin-left: -14px; margin-right: -14px;">
            <div style="display: flex; justify-content: center; margin-top:5px;">
                <button class="pivx-button-big" style="padding: 11px 12px; width: 100%;">+ ADD ACCOUNT</button>
            </div>
        </div>
    </div>
</template>