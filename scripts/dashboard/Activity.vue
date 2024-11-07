<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useNetwork } from '../composables/use_network.js';
import { wallet } from '../wallet.js';
import { cChainParams } from '../chain_params.js';
import { translation } from '../i18n.js';
import { Database } from '../database.js';
import { HistoricalTx, HistoricalTxType } from '../historical_tx.js';
import { getNameOrAddress } from '../contacts-book.js';
import { getEventEmitter } from '../event_bus';
import { beautifyNumber } from '../misc';

import iCheck from '../../assets/icons/icon-check.svg';
import iHourglass from '../../assets/icons/icon-hourglass.svg';
import { blockCount } from '../global.js';

const props = defineProps({
    title: String,
    rewards: Boolean,
});

const txs = ref([]);
let txCount = 0;
const updating = ref(false);
const isHistorySynced = ref(false);
const rewardAmount = ref(0);
let nRewardUpdateHeight = 0;
const ticker = computed(() => cChainParams.current.TICKER);
const network = useNetwork();
function getActivityUrl(tx) {
    return network.explorerUrl + '/tx/' + tx.id;
}
const txMap = computed(() => {
    return {
        [HistoricalTxType.STAKE]: {
            icon: 'fa-gift',
            colour: 'white',
            content: translation.activityBlockReward,
        },
        [HistoricalTxType.SENT]: {
            icon: 'fa-minus',
            colour: '#f93c4c',
            content: translation.activitySentTo,
        },
        [HistoricalTxType.RECEIVED]: {
            icon: 'fa-plus',
            colour: '#5cff5c',
            content: translation.activityReceivedWith,
        },
        [HistoricalTxType.DELEGATION]: {
            icon: 'fa-snowflake',
            colour: 'white',
            content: translation.activityDelegatedTo,
        },
        [HistoricalTxType.UNDELEGATION]: {
            icon: 'fa-fire',
            colour: 'white',
            content: translation.activityUndelegated,
        },
        [HistoricalTxType.PROPOSAL_FEE]: {
            icon: 'fa-minus',
            colour: '#f93c4c',
            content: 'Proposal Submission Fee',
        },
        [HistoricalTxType.UNKNOWN]: {
            icon: 'fa-question',
            colour: 'white',
            content: translation.activityUnknown,
        },
    };
});

async function update(txToAdd = 0) {
    // Return if wallet is not synced yet
    if (!wallet.isSynced) {
        return;
    }

    // Prevent the user from spamming refreshes
    if (updating.value) return;
    let newTxs = [];

    // Set the updating animation
    updating.value = true;

    // If there are less than 10 txs loaded, append rather than update the list
    if (txCount < 10 && txToAdd == 0) txToAdd = 10;

    const historicalTxs = wallet.getHistoricalTxs();

    // For Rewards: aggregate the total amount
    if (props.rewards) {
        for (const tx of historicalTxs) {
            // If this Tx Height is under our last scanned height, we stop
            if (tx.blockHeight <= nRewardUpdateHeight) break;
            // Only compute rewards
            if (tx.type != HistoricalTxType.STAKE) continue;
            // Aggregate the total rewards
            rewardAmount.value += tx.amount;
        }
        // Keep track of the scan block height
        if (historicalTxs.length) {
            nRewardUpdateHeight = historicalTxs[0].blockHeight;
        }
    }

    let i = 0;
    let found = 0;
    while (found < txCount + txToAdd) {
        if (i === historicalTxs.length) {
            isHistorySynced.value = true;
            break;
        }
        const tx = historicalTxs[i];
        i += 1;
        if (props.rewards && tx.type != HistoricalTxType.STAKE) continue;
        newTxs.push(tx);
        found++;
    }

    txCount = found;
    await parseTXs(newTxs);
    updating.value = false;
}

watch(translation, async () => await update());

/**
 * Parse tx to list syntax
 * @param {Array<HistoricalTx>} arrTXs
 */
async function parseTXs(arrTXs) {
    const newTxs = [];

    // Prepare time formatting
    const dateOptions = {
        year: '2-digit',
        month: '2-digit',
        day: '2-digit',
    };
    const timeOptions = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    };
    // And also keep track of our last Tx's timestamp, to re-use a cache, which is much faster than the slow `.toLocaleDateString`
    let prevDateString = '';
    let prevTimestamp = 0;
    const cDB = await Database.getInstance();
    const cAccount = await cDB.getAccount();

    for (const cTx of arrTXs) {
        const dateTime = new Date(cTx.time * 1000);
        // If this Tx is older than 24h, then hit the `Date` cache logic, otherwise, use a `Time` and skip it
        let strDate =
            Date.now() / 1000 - cTx.time > 86400
                ? ''
                : dateTime.toLocaleTimeString(undefined, timeOptions);
        if (!strDate) {
            if (
                prevDateString &&
                prevTimestamp - cTx.time * 1000 < 12 * 60 * 60 * 1000
            ) {
                // Use our date cache
                strDate = prevDateString;
            } else {
                // Create a new date, this Tx is too old to use the cache
                prevDateString = dateTime.toLocaleDateString(
                    undefined,
                    dateOptions
                );
                strDate = prevDateString;
            }
        }
        // Update the time cache
        prevTimestamp = cTx.time * 1000;

        // Coinbase Transactions (rewards) require coinbaseMaturity confs
        const fConfirmed =
            blockCount - cTx.blockHeight >=
            (cTx.type === HistoricalTxType.STAKE
                ? cChainParams.current.coinbaseMaturity
                : 6);

        // Choose the content type, for the Dashboard; use a generative description, otherwise, a TX-ID
        // let txContent = props.rewards ? cTx.id : 'Block Reward';

        // Format the amount to reduce text size
        let formattedAmt = '';
        if (cTx.amount < 0.01) {
            formattedAmt = beautifyNumber('0.01', '13px');
        } else if (cTx.amount >= 100) {
            formattedAmt = beautifyNumber(
                Math.round(cTx.amount).toString(),
                '13px'
            );
        } else {
            formattedAmt = beautifyNumber(`${cTx.amount.toFixed(2)}`, '13px');
        }

        // For 'Send' TXs: Check if this is a send-to-self transaction
        let fSendToSelf = false;
        if (cTx.type === HistoricalTxType.SENT) {
            fSendToSelf = true;
            // Check all addresses to find our own, caching them for performance
            for (const strAddr of cTx.receivers) {
                // If a previous Tx checked this address, skip it, otherwise, check it against our own address(es)
                if (!wallet.isOwnAddress(strAddr)) {
                    // External address, this is not a self-only Tx
                    fSendToSelf = false;
                }
            }
        }

        // Take the icon, colour and content based on the type of the transaction
        let { icon, colour, content } = txMap.value[cTx.type];
        const match = content.match(/{(.)}/);
        if (match) {
            let who = '';
            if (fSendToSelf) {
                who = translation.activitySelf;
            } else if (cTx.shieldedOutputs) {
                who = translation.activityShieldedAddress;
            } else {
                const arrAddresses = cTx.receivers
                    .map((addr) => [wallet.isOwnAddress(addr), addr])
                    .filter(([isOwnAddress, _]) => {
                        return cTx.type === HistoricalTxType.RECEIVED
                            ? isOwnAddress
                            : !isOwnAddress;
                    })
                    .map(([_, addr]) => getNameOrAddress(cAccount, addr));
                who =
                    [
                        ...new Set(
                            arrAddresses.map((addr) =>
                                addr?.length >= 32
                                    ? addr?.substring(0, 6)
                                    : addr
                            )
                        ),
                    ].join(', ') + '...';
            }
            content = content.replace(/{.}/, who);
        }

        newTxs.push({
            date: strDate,
            id: cTx.id,
            content: props.rewards ? cTx.id : content,
            formattedAmt,
            amount: cTx.amount,
            confirmed: fConfirmed,
            icon,
            colour,
        });
    }

    txs.value = newTxs;
}

const rewardsText = computed(() => {
    const strBal = rewardAmount.value.toLocaleString('en-GB');
    return `${strBal} <span style="font-size:15px; opacity: 0.55;">${ticker.value}</span>`;
});

function reset() {
    txs.value = [];
    txCount = 0;
    nRewardUpdateHeight = 0;
    update(0);
}

function getTxCount() {
    return txCount;
}

getEventEmitter().on(
    'transparent-sync-status-update',
    (i, totalPages, done) => done && update()
);
getEventEmitter().on(
    'shield-sync-status-update',
    (blocks, totalBlocks, done) => done && update()
);
onMounted(() => update());

defineExpose({ update, reset, getTxCount });
</script>

<template>
    <center>
        <div class="dcWallet-activity">
            <span
                style="
                    font-family: 'Montserrat Regular';
                    color: rgb(233, 222, 255);
                    display: flex;
                    justify-content: center;
                    margin-bottom: 24px;
                    margin-top: 20px;
                "
            >
                <span
                    style="font-size: 24px"
                    :data-i18n="rewards ? 'rewardHistory' : 'activity'"
                    >{{ title }}</span
                >
                <span
                    style="font-size: 20px"
                    class="rewardsBadge"
                    v-if="rewards"
                    v-html="rewardsText"
                ></span>
            </span>

            <div class="scrollTable">
                <div>
                    <table
                        class="table table-responsive table-sm stakingTx table-mobile-scroll"
                    >
                        <thead>
                            <tr>
                                <th scope="col" class="tx1">
                                    {{ translation.time }}
                                </th>
                                <th scope="col" class="tx2">
                                    {{
                                        rewards
                                            ? translation.ID
                                            : translation.description
                                    }}
                                </th>
                                <th scope="col" class="tx3">
                                    {{ translation.amount }}
                                </th>
                                <th scope="col" class="tx4 text-right"></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="tx in txs">
                                <td
                                    class="align-middle pr-10px"
                                    style="font-size: 12px"
                                >
                                    <span style="opacity: 50%">{{
                                        tx.date
                                    }}</span>
                                </td>
                                <td class="align-middle pr-10px txcode">
                                    <a
                                        :href="getActivityUrl(tx)"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <code
                                            class="wallet-code text-center active ptr"
                                            style="padding: 4px 9px"
                                            >{{ tx.content }}</code
                                        >
                                    </a>
                                </td>
                                <td class="align-middle pr-10px">
                                    <b
                                        style="
                                            font-family: 'Montserrat Medium';
                                            font-size: 13px;
                                            font-weight: 100;
                                        "
                                        ><i
                                            class="fa-solid"
                                            style="padding-right: 5px"
                                            :class="[tx.icon]"
                                            :style="{ color: tx.colour }"
                                        ></i>
                                        <span
                                            style="font-weight: 300"
                                            v-html="tx.formattedAmt"
                                        ></span>
                                        <span
                                            style="
                                                font-weight: 300;
                                                opacity: 0.55;
                                            "
                                            >&nbsp;{{ ticker }}</span
                                        ></b
                                    >
                                </td>
                                <td class="text-right pr-10px align-middle">
                                    <span
                                        class="badge mb-0"
                                        :class="{
                                            'badge-purple': tx.confirmed,
                                            'badge-danger': !tx.confirmed,
                                        }"
                                    >
                                        <span
                                            class="checkIcon"
                                            v-if="tx.confirmed"
                                            v-html="iCheck"
                                        ></span>
                                        <span
                                            class="checkIcon"
                                            v-else
                                            v-html="iHourglass"
                                        ></span>
                                    </span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <center>
                    <button
                        v-if="!isHistorySynced"
                        class="pivx-button-medium"
                        @click="update(10)"
                    >
                        <span class="buttoni-icon"
                            ><i
                                class="fas fa-sync fa-tiny-margin"
                                :class="{ 'fa-spin': updating }"
                            ></i
                        ></span>
                        <span class="buttoni-text">{{
                            translation.loadMore
                        }}</span>
                    </button>
                </center>
            </div>
        </div>
    </center>
</template>
