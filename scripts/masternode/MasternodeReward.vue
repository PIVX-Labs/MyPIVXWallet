<script setup>
import { computed } from 'vue';
import { useWallets } from '../composables/use_wallet.js';
import { HistoricalTxType } from '../historical_tx.js';
import { cChainParams } from '../chain_params';
import { COIN } from '../chain_params';
import { timeToDate } from '../utils';
import { useNetwork } from '../composables/use_network';
import { beautifyNumber } from '../misc';
import { translation } from '../i18n.js';
const { activeWallet } = useWallets();
const rewards = computed(() =>
    activeWallet.historicalTxs.filter(
        (tx) =>
            tx.type === HistoricalTxType.STAKE &&
            tx.amount === cChainParams.current.mnReward / COIN
    )
);
const total = computed(
    () => (rewards.value.length * cChainParams.current.mnReward) / COIN
);

const network = useNetwork();
function getActivityUrl(tx) {
    return network.explorerUrl + '/tx/' + tx.id;
}
</script>

<template>
    <div class="dcWallet-activity">
        <span
            style="
                color: rgb(233, 222, 255);
                display: flex;
                justify-content: center;
                margin-bottom: 24px;
                margin-top: 20px;
            "
        >
            <span data-i18n="rewardHistory" style="font-size: 24px"
                >Reward History</span
            >
            <span class="rewardsBadge" style="font-size: 20px">
                {{ total }}
                <span style="font-size: 15px; opacity: 0.55">PIV</span>
            </span>
        </span>
        <div class="scrollTable">
            <table
                class="table table-responsive table-sm stakingTx table-mobile-scroll"
            >
                <thead>
                    <tr>
                        <th scope="col" class="tx1">{{ translation.time }}</th>
                        <th scope="col" class="tx2">{{ translation.ID }}</th>
                        <th scope="col" class="tx3">
                            {{ translation.amount }}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <template v-for="reward of rewards">
                        <tr>
                            <td
                                class="align-middle pr-10px"
                                style="font-size: 12px"
                            >
                                <span style="opacity: 50%">{{
                                    timeToDate(reward.time)
                                }}</span>
                            </td>
                            <td class="align-middle pr-10px txcode">
                                <a
                                    :href="getActivityUrl(reward)"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <code
                                        class="wallet-code text-center active ptr"
                                        style="padding: 4px 9px"
                                        >{{ reward.id }}</code
                                    >
                                </a>
                            </td>

                            <td>
                                <i
                                    class="fa-solid fa-gift"
                                    style="padding-right: 5px; color: white"
                                ></i>
                                <span
                                    v-html="
                                        beautifyNumber(
                                            reward.amount.toFixed(2),
                                            '13px'
                                        )
                                    "
                                ></span>
                                <b>
                                    <span
                                        style="font-weight: 300; opacity: 0.55"
                                        >&nbsp;{{
                                            cChainParams.current.TICKER
                                        }}</span
                                    ></b
                                >
                            </td>
                        </tr>
                    </template>
                </tbody>
            </table>
        </div>
    </div>
</template>
