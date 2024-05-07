<script setup>
import { computed, defineEmits, ref, toRefs, watch, nextTick } from 'vue';
import { optimiseCurrencyLocale } from '../global.js';
import { translation, ALERTS } from '../i18n.js';
import Modal from '../Modal.vue';
import { createAlert, isColdAddress } from '../misc';
import { COIN, cChainParams } from '../chain_params';
import { beautifyNumber } from '../misc';

import pLogo from '../../assets/p_logo.svg';
import logo from '../../assets/pivx.png';

const coldStakingAddress = defineModel('coldStakingAddress');
const csAddrInternal = ref(coldStakingAddress.value);
watch(coldStakingAddress, (addr) => (csAddrInternal.value = addr));
const showColdStakingAddressModal = ref(false);
const emit = defineEmits(['showUnstake', 'showStake', 'setColdStakingAddress']);
const coldAddrInput = ref(null);
const props = defineProps({
    coldBalance: Number,
    price: Number,
    currency: String,
    displayDecimals: Number,
});
const { coldBalance, price, currency, displayDecimals } = toRefs(props);
const coldBalanceStr = computed(() => {
    const nCoins = coldBalance.value / COIN;
    const strBal = nCoins.toFixed(displayDecimals.value);
    const nLen = strBal.length;
    return beautifyNumber(strBal, nLen >= 10 ? '17px' : '25px');
});
const coldBalanceValue = computed(() => {
    const { nValue, cLocale } = optimiseCurrencyLocale(
        (coldBalance.value / COIN) * price.value
    );

    return nValue.toLocaleString('en-gb', cLocale);
});

const ticker = computed(() => cChainParams.current.TICKER);

watch(showColdStakingAddressModal, (showColdStakingAddressModal) => {
    nextTick(() => {
        if (showColdStakingAddressModal) coldAddrInput.value.focus();
    });
});

function submit() {
    if (csAddrInternal.value === '') {
        csAddrInternal.value = cChainParams.current.defaultColdStakingAddress;
    }
    if (isColdAddress(csAddrInternal.value)) {
        coldStakingAddress.value = csAddrInternal.value;
        showColdStakingAddressModal.value = false;
        createAlert('info', ALERTS.STAKE_ADDR_SET, 5000);
    } else {
        createAlert('warning', ALERTS.STAKE_ADDR_BAD, 2500);
    }
}
</script>

<template>
    <center>
        <div class="dcWallet-balances mb-4">
            <div class="row lessBot p-0">
                <div class="col-6 d-flex dcWallet-topLeftMenu" style="justify-content: flex-start">
                    <h3 class="noselect balance-title">
                        <span class="reload noselect" @click="reload()"><i class="fa-solid fa-rotate-right topCol"
                                :class="{ playAnim: updating }"></i></span>
                    </h3>
                </div>

                <div class="col-6 d-flex dcWallet-topRightMenu" style="justify-content: flex-end">
                    <div class="btn-group dropleft">
                        <i class="fa-solid fa-gear topCol" style="width: 20px; position: relative; top: 3px; right: 8px;"
                            data-testid="setColdStakeButton"
                            @click="showColdStakingAddressModal = true"></i>
                    </div>
                </div>
            </div>


            
            <div style="margin-top:22px; padding-left:15px; padding-right:15px; margin-bottom: 35px;">
                <div style="background-color:#32224e61; border:2px solid #361562; border-bottom:none; border-top:none;">
                    <div>
                        <img :src="logo" style="height: 60px; margin-top:14px">
                    </div>
                    <span class="ptr" data-toggle="modal" data-target="#walletBreakdownModal" @click="renderWalletBreakdown()">
                        <span class="logo-pivBal" v-html="pLogo"></span>
                        <span class="dcWallet-pivxBalance" v-html="coldBalanceStr"> </span>
                        <span class="dcWallet-pivxTicker" style="position: relative; left: 4px">&nbsp;{{ ticker }}&nbsp;</span>
                    </span>

                    <div class="dcWallet-usdBalance" style="padding-bottom: 12px; padding-top: 3px;">
                        <span class="dcWallet-usdValue" style="color:#d7d7d7; font-weight: 500;" v-html="coldBalanceValue"></span>
                        <span class="dcWallet-usdValue" style="opacity: 0.55;">&nbsp;{{ currency }}</span>
                    </div>
                </div>
            </div>
            
            
            <div class="row lessTop p-0" style="margin-left:15px; margin-right:15px; margin-bottom: 19px; margin-top: -16px;">
                <div class="col-6 d-flex p-0" style="justify-content: flex-start">
                    <button class="pivx-button-small" style="height: 42px; width: 97px;" @click="emit('showStake')">
                        <span class="buttoni-text">
                            {{ translation.stake }}
                        </span>
                    </button>
                </div>

                <div class="col-6 d-flex p-0" style="justify-content: flex-end">
                    <button class="pivx-button-small" style="height: 42px; width: 106px;" @click="emit('showUnstake')">
                        <span class="buttoni-text">
                            {{ translation.stakeUnstake }}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    </center>

    <Teleport to="body">
        <Modal :show="showColdStakingAddressModal">
            <template #header>
                <h3
                    class="modal-title"
                    style="text-align: center; width: 100%; color: #8e21ff"
                >
                    Set your Cold Staking address
                </h3>
            </template>
            <template #body>
                <p>
                    <span
                        style="opacity: 0.65; margin: 10px; margin-buttom: 0px"
                    >
                        {{ translation.popupColdStakeNote }}
                    </span>
                </p>
                <input
                    type="text"
                    ref="coldAddrInput"
                    :placeholder="`${
                        translation.popupExample
                    } ${coldStakingAddress.substring(0, 6)}...`"
                    data-testid="csAddrInput"
                    v-model="csAddrInternal"
                    style="text-align: center"
                />
            </template>
            <template #footer>
                <button
                    type="button"
                    class="pivx-button-big"
                    style="float: right"
                    data-testid="csAddrSubmit"
                    @click="submit()"
                >
                    {{ translation.popupConfirm }}
                </button>
                <button
                    type="button"
                    class="pivx-button-big"
                    style="float: right; opacity: 0.7"
                    data-testid="csAddrCancel"
                    @click="showColdStakingAddressModal = false"
                >
                    {{ translation.popupCancel }}
                </button>
            </template>
        </Modal>
    </Teleport>
</template>
