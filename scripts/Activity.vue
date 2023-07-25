<script setup>
import { reactive, ref, computed } from 'vue';
import { getNetwork, HistoricalTxType } from './network.js';
import { masterKey } from './wallet.js';
import { cChainParams } from './chain_params.js';

const props = defineProps({
    title: String,
    rewards: Boolean,
});

const txs = reactive([]);
const updating = ref(false);
const isHistorySynced = ref(false);
const rewardsText = ref('-');
const ticker = computed(() => cChainParams.current.TICKER);
const explorerUrl = computed(() => getNetwork().strUrl);

function addTx(tx) {
    txs.push(tx);
}

async function update(fNewOnly = false) {
    const cNet = getNetwork();

    // Prevent the user from spamming refreshes
    if (cNet.historySyncing) return;

    // Remember how much history we had previously
    const nPrevHistory = cNet.arrTxHistory.length;

    updating.value = true;
    const arrTXs = await cNet.syncTxHistoryChunk(fNewOnly);
    updating.value = false;

    // Check if all transactions are loaded
    isHistorySynced.value = cNet.isHistorySynced;

    // For Staking: Filter the list for only Stakes, display total rewards from known history
    if (props.rewards) {
        const arrStakes = arrTXs.filter(
            (a) => a.type === HistoricalTxType.STAKE
        );
        if (arrStakes.length === txs.length) {
            // No point in parsing txs if there are no new txs
            return;
        }

        const nRewards = arrStakes.reduce((a, b) => a + b.amount, 0);
        rewardsText.value = `${cNet.isHistorySynced ? '' : '≥'}${nRewards}`;
        return await parseTXs(arrStakes);
    }

    if (arrTXs.length !== txs.length) {
        await parseTXs(arrTXs);
    }
}

/**
 * Parse tx to list syntax
 */
async function parseTXs(arrTXs) {
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

        // Choose the correct icon and colour for the Tx type, or a question mark if the type is unknown
        // Defaults: Reward Activity
        let icon = 'fa-gift';
        let colour = 'white';

        // Choose the content type, for the Dashboard; use a generative description, otherwise, a TX-ID
        let txContent = props.rewards ? cTx.id : 'Block Reward';

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
        let fSendToSelf = true;
        if (
            cTx.type === HistoricalTxType.SENT ||
            cTx.type === HistoricalTxType.RECEIVED
        ) {
            // Check all addresses to find our own, caching them for performance
            for (const strAddr of cTx.receivers.concat(cTx.senders)) {
                // If a previous Tx checked this address, skip it, otherwise, check it against our own address(es)
                if (!(await masterKey.isOwnAddress(strAddr))) {
                    // External address, this is not a self-only Tx
                    fSendToSelf = false;
                }
            }
        }

        // Generate an icon, colour and description for the Tx
        if (!props.rewards) {
            switch (cTx.type) {
                case HistoricalTxType.STAKE:
                    icon = 'fa-gift';
                    break;
                case HistoricalTxType.SENT:
                    icon = 'fa-minus';
                    colour = '#f93c3c';
                    // Figure out WHO this was sent to, and focus on them contextually
                    if (fSendToSelf) {
                        txContent = 'Sent to self';
                    } else {
                        // Otherwise, anything to us is likely change, so filter it away
                        const arrExternalAddresses = (
                            await Promise.all(
                                cTx.receivers.map(async (addr) => [
                                    await masterKey.isOwnAddress(addr),
                                    addr,
                                ])
                            )
                        )
                            .filter(([isOwnAddress, _]) => {
                                return !isOwnAddress;
                            })
                            .map(([_, addr]) => addr);
                        txContent =
                            'Sent to ' +
                            (cTx.shieldedOutputs
                                ? 'Shielded address'
                                : [
                                      ...new Set(
                                          arrExternalAddresses.map((addr) =>
                                              addr.length >= 32
                                                  ? addr.substring(0, 6)
                                                  : addr
                                          )
                                      ),
                                  ].join(', ') + '...');
                    }
                    break;
                case HistoricalTxType.RECEIVED: {
                    icon = 'fa-plus';
                    colour = '#5cff5c';
                    // Figure out WHO this was sent from, and focus on them contextually
                    // Filter away any of our own addresses
                    const arrExternalAddresses = (
                        await Promise.all(
                            cTx.senders.map(async (addr) => [
                                await masterKey.isOwnAddress(addr),
                                addr,
                            ])
                        )
                    )
                        .filter(([isOwnAddress, _]) => {
                            return !isOwnAddress;
                        })
                        .map(([_, addr]) => addr);

                    if (cTx.shieldedOutputs) {
                        txContent = 'Received from Shielded address';
                    } else {
                        txContent =
                            'Received from ' +
                            [
                                ...new Set(
                                    arrExternalAddresses.map((addr) =>
                                        addr?.length >= 32
                                            ? addr.substring(0, 6)
                                            : addr
                                    )
                                ),
                            ].join(', ') +
                            '...';
                    }
                    break;
                }
                case HistoricalTxType.DELEGATION:
                    icon = 'fa-snowflake';
                    txContent =
                        'Delegated to ' +
                        cTx.receivers[0].substring(0, 6) +
                        '...';
                    break;
                case HistoricalTxType.UNDELEGATION:
                    icon = 'fa-fire';
                    txContent = 'Undelegated';
                    break;
                default:
                    icon = 'fa-question';
                    txContent = 'Unknown Tx';
            }
        }
        txs.push({
            date: strDate,
            id: cTx.id,
            content: txContent,
            formattedAmt,
            confirmed: fConfirmed,
            icon,
            colour,
        });
    }
}
defineExpose({ txs, addTx, update });
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
                            <th scope="col" class="tx1">Time</th>
                            <th scope="col" class="tx2">
                                {{ rewards ? 'ID' : 'Description' }}
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
                    @click="update"
                >
                    <span class="buttoni-icon"
                        ><i
                            class="fas fa-sync fa-tiny-margin"
                            :class="{ 'fa-spin': updating }"
                        ></i
                    ></span>
                    <span class="buttoni-text" data-i18n="loadMore"
                        >Load more</span
                    >
                </button>
            </center>
        </div>
    </div>
</template>
