<script setup>
import { defineEmits } from 'vue';
const emit = defineEmits(['showUnstake', 'showStake']);
</script>

<template>
    <div class="dcWallet-balances mb-4" style="margin-top: 37px">
        <div class="row lessBot p-0">
            <div
                class="col-6 d-flex dcWallet-topLeftMenu"
                style="justify-content: flex-start"
            >
                <h3 class="noselect balance-title">
                    <span
                        class="reload noselect"
                        onclick="MPW.refreshChainData()"
                        ><i
                            id="balanceReloadStaking"
                            class="fa-solid fa-rotate-right cur-pointer"
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
                        class="fa-solid fa-gear"
                        style="width: 20px"
                        onclick="MPW.guiSetColdStakingAddress()"
                    ></i>
                </div>
            </div>
        </div>

        <span data-i18n="staking">Staking</span><br />
        <span class="dcWallet-pivxBalance" id="guiBalanceStaking">0</span>
        <span id="guiBalanceStakingTicker" class="dcWallet-pivxTicker">PIV</span
        ><br />
        <div class="dcWallet-usdBalance">
            <span id="guiStakingValue" class="dcWallet-usdValue">$-</span>
            <span id="guiStakingValueCurrency" class="dcWallet-usdValue"
                >USD</span
            >
        </div>

        <div class="row lessTop p-0">
            <div class="col-6 d-flex" style="justify-content: flex-start">
                <div
                    data-i18n="stake"
                    class="dcWallet-btn-left"
                    @click="emit('showStake')"
                >
                    Stake
                </div>
            </div>

            <div class="col-6 d-flex" style="justify-content: flex-end">
                <div
                    data-i18n="stakeUnstake"
                    class="dcWallet-btn-right"
                    @click="emit('showUnstake')"
                >
                    Unstake
                </div>
            </div>
        </div>
    </div>
</template>
