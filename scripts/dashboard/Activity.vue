<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useNetwork } from '../composables/use_network.js';
import { wallet } from '../wallet.js';
import { cChainParams } from '../chain_params.js';
import { translation } from '../i18n.js';
import { Database } from '../database.js';
import { HistoricalTx, HistoricalTxType } from '../historical_tx.js';
import { getNameOrAddress } from '../contacts-book.js';

import iCheck from '../../assets/icons/icon-check.svg';
import iHourglass from '../../assets/icons/icon-hourglass.svg';
import { blockCount } from '../global.js';
import { beautifyNumber } from '../misc.js';
import TxExport from './TxExport.vue';

const props = defineProps({
    title: String,
    rewards: Boolean,
});

const txs = ref([]);
let txCount = 0;
const updating = ref(false);
const isHistorySynced = ref(false);
const rewardAmount = ref(0);
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
            content: translation.proposalFee,
        },
        [HistoricalTxType.UNKNOWN]: {
            icon: 'fa-question',
            colour: 'white',
            content: translation.activityUnknown,
        },
    };
});

/**
 * Returns the information that we need to show (icon + label + amount) for a self transaction
 * @param {number} amount - The net amount of transparent PIVs in a transaction
 * @param {number} shieldAmount - The net amount of shielded PIVs in a transaction
 */
function txSelfMap(amount, shieldAmount) {
    if (shieldAmount == 0 || amount == 0) {
        return {
            icon: 'fa-recycle',
            colour: 'white',
            content:
                shieldAmount == 0
                    ? translation.activitySentTo
                    : translation.shieldSendToSelf,
            amount: Math.abs(shieldAmount + amount),
        };
    } else if (shieldAmount > 0) {
        return {
            icon: 'fa-shield',
            colour: 'white',
            content: translation.shielding,
            amount: shieldAmount,
        };
    } else if (shieldAmount < 0) {
        return {
            icon: 'fa-shield',
            colour: 'white',
            content: translation.deShielding,
            amount: amount,
        };
    }
}

function updateReward() {
    if (!props.rewards) return;
    let res = 0;
    for (const tx of wallet.getHistoricalTxs()) {
        if (tx.type !== HistoricalTxType.STAKE) continue;
        res += tx.amount;
    }
    rewardAmount.value = res;
}

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
    const timeOptions = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    };
    const dateOptions = {
        month: 'short',
        day: 'numeric',
    };
    const yearOptions = {
        month: 'short',
        day: 'numeric',
        year: '2-digit',
    };
    const cDB = await Database.getInstance();
    const cAccount = await cDB.getAccount();

    const cDate = new Date();
    for (const cTx of arrTXs) {
        const cTxDate = new Date(cTx.time * 1000);

        // Unconfirmed Txs are simply 'Pending'
        let strDate = 'Pending';
        if (cTx.blockHeight !== -1) {
            // Check if it was today (same day, month and year)
            const fToday =
                cTxDate.getDate() === cDate.getDate() &&
                cTxDate.getMonth() === cDate.getMonth() &&
                cTxDate.getFullYear() === cDate.getFullYear();

            // Figure out the most convenient time display for this Tx
            if (fToday) {
                // TXs made today are displayed by time (02:13 pm)
                strDate = cTxDate.toLocaleTimeString(undefined, timeOptions);
            } else if (cTxDate.getFullYear() === cDate.getFullYear()) {
                // TXs older than today are displayed by short date (18 Nov)
                strDate = cTxDate.toLocaleDateString(undefined, dateOptions);
            } else {
                // TXs in previous years are displayed by their short date and year (18 Nov 2023)
                strDate = cTxDate.toLocaleDateString(undefined, yearOptions);
            }
        }

        let amountToShow = Math.abs(cTx.amount + cTx.shieldAmount);

        // Coinbase Transactions (rewards) require coinbaseMaturity confs
        let fConfirmed =
            cTx.blockHeight > 0 &&
            blockCount - cTx.blockHeight >=
                (cTx.type === HistoricalTxType.STAKE
                    ? cChainParams.current.coinbaseMaturity
                    : 6);

        // Take the icon, colour and content based on the type of the transaction
        let { icon, colour, content } = txMap.value[cTx.type];
        const match = content.match(/{(.)}/);
        if (match) {
            let who = '';
            if (cTx.isToSelf && cTx.type !== HistoricalTxType.DELEGATION) {
                who = translation.activitySelf;
                const descriptor = txSelfMap(cTx.amount, cTx.shieldAmount);
                icon = descriptor.icon;
                colour = descriptor.colour;
                content = descriptor.content;
                amountToShow = descriptor.amount;
            } else {
                let arrAddresses = cTx.receivers
                    .map((addr) => [wallet.isOwnAddress(addr), addr])
                    .filter(([isOwnAddress, _]) => {
                        return cTx.type === HistoricalTxType.RECEIVED
                            ? isOwnAddress
                            : !isOwnAddress;
                    })
                    .map(([_, addr]) => getNameOrAddress(cAccount, addr));
                if (cTx.type == HistoricalTxType.RECEIVED) {
                    arrAddresses = arrAddresses.concat(cTx.shieldReceivers);
                }
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
                if (
                    cTx.type == HistoricalTxType.SENT &&
                    arrAddresses.length == 0
                ) {
                    // We sent a shield note to someone, but we cannot decrypt the recipient
                    // So show a generic "Sent to shield address"
                    who = translation.activityShieldedAddress;
                }
            }
            content = content.replace(/{.}/, who);
        }

        // Format the amount to reduce text size
        let formattedAmt = '';
        if (amountToShow < 0.01) {
            formattedAmt = beautifyNumber('0.01', '13px');
        } else if (amountToShow >= 100) {
            formattedAmt = beautifyNumber(
                Math.round(amountToShow).toString(),
                '13px'
            );
        } else {
            formattedAmt = beautifyNumber(`${amountToShow.toFixed(2)}`, '13px');
        }

        newTxs.push({
            date: strDate,
            id: cTx.id,
            content: props.rewards ? cTx.id : content,
            formattedAmt,
            amount: amountToShow,
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
    rewardAmount.value = 0;
    update(0);
}

function getTxCount() {
    return txCount;
}

onMounted(() => update());

defineExpose({ update, reset, getTxCount, updateReward });
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
                <span style="font-size: 24px"
                    >{{
                        rewards
                            ? translation.rewardHistory
                            : translation.activity
                    }}
                </span>
                <span
                    style="font-size: 20px"
                    class="rewardsBadge"
                    v-if="rewards"
                    v-html="rewardsText"
                ></span>
            </span>

            <div class="scrollTable" data-testid="activity">
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
                                <th scope="col" class="tx4 text-right">
                                    <TxExport />
                                </th>
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
                        data-testid="activityLoadMore"
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
