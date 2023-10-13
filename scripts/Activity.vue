<script setup>
import { ref, computed, watch } from 'vue';
import { getNetwork, HistoricalTxType } from './network.js';
import { wallet } from './wallet.js';
import { mempool } from './global.js';
import { cChainParams } from './chain_params.js';
import { translation } from './i18n.js';
import { Database } from './database.js';
import { getNameOrAddress } from './contacts-book.js';

const props = defineProps({
    title: String,
    rewards: Boolean,
});

const txs = ref([]);
let txCount = 0;
const updating = ref(false);
const isHistorySynced = ref(false);
const rewardsText = ref('-');
const ticker = computed(() => cChainParams.current.TICKER);
const explorerUrl = computed(() => getNetwork().strUrl);
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
            content: translation.activityReceivedFrom,
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
        [HistoricalTxType.UNKNOWN]: {
            icon: 'fa-question',
            colour: 'white',
            content: translation.activityUnknown,
        },
    };
});

async function update(fNewOnly = false, sync = true) {
    const cNet = getNetwork();

    // If mempool is not loaded yet do not update the activity GUI
    // or we might end up in a state where many of our addresses are considered invalid
    if (!mempool.isLoaded) {
        return;
    }

    if (!cNet) return;

    // Prevent the user from spamming refreshes
    if (updating.value) return;

    let arrTXs;
    try {
        // Set the updating animation
        updating.value = true;

        // If our txCount is lower than the tx history loaded
        // Use the txhistory array, otherwise sync more
        if (txCount !== cNet.arrTxHistory.length || !sync) {
            arrTXs = cNet.arrTxHistory;
        } else {
            arrTXs = await cNet.syncTxHistoryChunk(fNewOnly);
        }
        // If the network has changed, or the sync has failed
        // Ignore the array
        if (!arrTXs || cNet !== getNetwork()) return;

        txCount = arrTXs.length;
    } finally {
        updating.value = false;
    }

    // Check if all transactions are loaded
    isHistorySynced.value = cNet.isHistorySynced;

    // For Staking: Filter the list for only Stakes, display total rewards from known history
    if (props.rewards) {
        const arrStakes = arrTXs.filter(
            (a) => a.type === HistoricalTxType.STAKE
        );

        if (arrStakes.length !== txs.length) {
            const nRewards = arrStakes.reduce((a, b) => a + b.amount, 0);
            rewardsText.value = `${cNet.isHistorySynced ? '' : '≥'}${nRewards}`;
            parseTXs(arrStakes);
            return;
        }
    }
    if (txs.length !== arrTXs.length) parseTXs(arrTXs);
}

watch(translation, async () => await update(false, false));

/**
 * Parse tx to list syntax
 */
async function parseTXs(arrTXs) {
    const newTxs = [];
    const cNet = getNetwork();

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

        // Coinbase Transactions (rewards) require 100 confs
        const fConfirmed =
            cNet.cachedBlockCount - cTx.blockHeight >= props.rewards ? 100 : 6;

        // Choose the content type, for the Dashboard; use a generative description, otherwise, a TX-ID
        // let txContent = props.rewards ? cTx.id : 'Block Reward';

        // Format the amount to reduce text size
        let formattedAmt = '';
        if (cTx.amount < 0.01) {
            formattedAmt = '<0.01';
        } else if (cTx.amount >= 100) {
            formattedAmt = Math.round(cTx.amount).toString();
        } else {
            formattedAmt = cTx.amount.toFixed(2);
        }

        // For 'Send' or 'Receive' TXs: Check if this is a send-to-self transaction
        let fSendToSelf = false;
        if (
            cTx.type === HistoricalTxType.SENT ||
            cTx.type === HistoricalTxType.RECEIVED
        ) {
            fSendToSelf = true;
            // Check all addresses to find our own, caching them for performance
            for (const strAddr of cTx.receivers.concat(cTx.senders)) {
                // If a previous Tx checked this address, skip it, otherwise, check it against our own address(es)
                if (!(await wallet.isOwnAddress(strAddr))) {
                    // External address, this is not a self-only Tx
                    fSendToSelf = false;
                }
            }
        }

        // Take the icon, colour and content based on the type of the transaction
        let { icon, colour, content } = txMap.value[cTx.type];
        const match = content.match(/{(.)}/);
        if (match) {
            // Use the senders array if `s` was provided in the template
            // Use the receivers array if `r` was provided
            const where = {
                r: 'receivers',
                s: 'senders',
            }[match[1]];

            let who = '';
            if (fSendToSelf) {
                who = translation.activitySelf;
            } else if (cTx.shieldedOutputs) {
                who = translation.activityShieldedAddress;
            } else {
                const arrExternalAddresses = (
                    await Promise.all(
                        cTx[where].map(async (addr) => [
                            await wallet.isOwnAddress(addr),
                            addr,
                        ])
                    )
                )
                    .filter(([isOwnAddress, _]) => {
                        return !isOwnAddress;
                    })
                    .map(([_, addr]) => getNameOrAddress(cAccount, addr));
                who =
                    [
                        ...new Set(
                            arrExternalAddresses.map((addr) =>
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
            confirmed: fConfirmed,
            icon,
            colour,
        });
    }

    txs.value = newTxs;
}

function reset() {
    txs.value = [];
    txCount = 0;
    update(false);
}

function getTxCount() {
    return txCount;
}

defineExpose({ update, reset, getTxCount });
</script>

<template>
    <center>
        <span class="dcWallet-activityLbl"
            >{{ title }}
            <span v-if="rewards"> ({{ rewardsText }} {{ ticker }}) </span>
        </span>
    </center>
    <div class="dcWallet-activity">
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
                            <th scope="col" class="tx3">Amount</th>
                            <th scope="col" class="tx4 text-right"></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="tx in txs">
                            <td
                                class="align-middle pr-10px"
                                style="font-size: 12px"
                            >
                                <i style="opacity: 0.75">{{ tx.date }}</i>
                            </td>
                            <td class="align-middle pr-10px txcode">
                                <a
                                    :href="explorerUrl + '/tx/' + tx.id"
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
                                <b style="font-family: monospace"
                                    ><i
                                        class="fa-solid"
                                        style="padding-right: 3px"
                                        :class="[tx.icon]"
                                        :style="{ color: tx.colour }"
                                    ></i>
                                    {{ tx.formattedAmt }} {{ ticker }}</b
                                >
                            </td>
                            <td class="text-right pr-10px align-middle">
                                <span
                                    class="badge mb-0"
                                    :class="{
                                        'badge-purple': tx.confirmed,
                                        'bg-danger': !tx.confirmed,
                                    }"
                                >
                                    <i
                                        v-if="tx.confirmed"
                                        class="fas fa-check"
                                    ></i>
                                    <i v-else class="fas fa-hourglass-end"></i>
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
                    @click="update()"
                >
                    <span class="buttoni-icon"
                        ><i
                            class="fas fa-sync fa-tiny-margin"
                            :class="{ 'fa-spin': updating }"
                        ></i
                    ></span>
                    <span class="buttoni-text">{{ translation.loadMore }}</span>
                </button>
            </center>
        </div>
    </div>
</template>
