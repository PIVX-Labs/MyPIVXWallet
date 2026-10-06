<script setup>
import { ref, computed, watch } from 'vue';
import { useNetwork } from '../composables/use_network.js';
import { cChainParams } from '../chain_params.js';
import { translation } from '../i18n.js';
import { Database } from '../database.js';
import { HistoricalTx, HistoricalTxType } from '../historical_tx.js';
import {
    getNameOrAddress,
    guiRenderCurrentReceiveModal,
} from '../contacts-book.js';

import iCheck from '../../assets/icons/icon-check.svg';
import iHourglass from '../../assets/icons/icon-hourglass.svg';
import { blockCount } from '../global.js';
import { beautifyNumber } from '../misc.js';
import TxDetails from './TxDetails.vue';
import { useWallets } from '../composables/use_wallet';
import TxExport from './TxExport.vue';
import { timeToDate } from '../utils.js';
import { storeToRefs } from 'pinia';

const props = defineProps({
    title: String,
    rewards: Boolean,
});

const txs = ref([]);
const selectedTx = ref(null);
let txCount = 0;
const updating = ref(false);
const isHistorySynced = ref(false);
const rewardAmount = ref(0);
const ticker = computed(() => cChainParams.current.TICKER);
const network = useNetwork();
const { activeWallet } = storeToRefs(useWallets());
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
    if (!activeWallet.value) return;
    if (!props.rewards) return;
    let res = 0;
    for (const tx of activeWallet.value.historicalTxs) {
        if (tx.type !== HistoricalTxType.STAKE) continue;
        res += tx.amount;
    }
    rewardAmount.value = res;
}

async function update(txToAdd = 0) {
    if (!activeWallet.value) return;
    // Prevent the user from spamming refreshes
    if (updating.value) return;
    isHistorySynced.value = false;
    let newTxs = [];

    // Set the updating animation
    updating.value = true;

    // If there are less than 10 txs loaded, append rather than update the list
    if (txCount < 10 && txToAdd == 0) txToAdd = 10;

    const historicalTxs = activeWallet.value.historicalTxs;

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

watch(translation, async () => {
    await update();
    updateReward();
});

/**
 * Parse tx to list syntax
 * @param {Array<HistoricalTx>} arrTXs
 */
// Wallet whose transactions are currently rendered
let renderedWallet = null;

async function parseTXs(arrTXs) {
    const newTxs = [];

    const cDB = await Database.getInstance();
    const cAccount = await cDB.getAccount(activeWallet.value.getKeyToExport());

    for (const cTx of arrTXs) {
        const memos = cTx.shieldReceivers
            .map((s) => s.memo)
            .filter((s) => s && s.length > 0);

        // Unconfirmed Txs are simply 'Pending'
        const strDate = timeToDate(cTx.time);
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
                    .map((addr) => [
                        activeWallet.value.isOwnAddress(addr),
                        addr,
                    ])
                    .filter(([isOwnAddress, _]) => {
                        return cTx.type === HistoricalTxType.RECEIVED
                            ? isOwnAddress
                            : !isOwnAddress;
                    })
                    .map(([_, addr]) => getNameOrAddress(cAccount, addr));
                if (cTx.type == HistoricalTxType.RECEIVED) {
                    arrAddresses = arrAddresses.concat(
                        cTx.shieldReceivers.map((s) => s.recipient)
                    );
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
            time: cTx.time,
            id: cTx.id,
            content: props.rewards ? cTx.id : content,
            formattedAmt,
            amount: amountToShow,
            confirmed: fConfirmed,
            icon,
            colour,
            memos,
        });
    }

    // Flag transactions that just arrived on top of an already-rendered
    // list so they can be highlighted (but not on first render)
    const sameWallet = renderedWallet === activeWallet.value;
    renderedWallet = activeWallet.value;
    const knownIds = new Set(txs.value.map((tx) => tx.id));
    if (sameWallet && knownIds.size) {
        for (const tx of newTxs) {
            if (knownIds.has(tx.id)) break;
            tx.isNew = true;
        }
    }

    txs.value = newTxs;
}

/**
 * Header label for the group a transaction belongs to: Today, Yesterday,
 * or its month (e.g. "September 2025")
 * @param {number} time - Unix time in seconds, falsy for unconfirmed txs
 */
function groupLabel(time) {
    if (!time) return { key: 'today', label: translation.dateToday };
    const date = new Date(time * 1000);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const dayMs = 24 * 60 * 60 * 1000;
    if (date >= startOfToday)
        return { key: 'today', label: translation.dateToday };
    if (date >= startOfToday - dayMs)
        return { key: 'yesterday', label: translation.dateYesterday };
    return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: date.toLocaleDateString(undefined, {
            month: 'long',
            year: 'numeric',
        }),
    };
}

// Flat list of group headers and transactions, for a single keyed v-for
const rows = computed(() => {
    const res = [];
    let lastKey = null;
    let indexInGroup = 0;
    for (const tx of txs.value) {
        const { key, label } = groupLabel(tx.time);
        if (key !== lastKey) {
            res.push({ header: true, key: `group-${key}`, label });
            lastKey = key;
            indexInGroup = 0;
        }
        // Within Today/Yesterday the header says the day, so show the hour
        const timeLabel =
            tx.time && (key === 'today' || key === 'yesterday')
                ? new Date(tx.time * 1000).toLocaleTimeString(undefined, {
                      hour: '2-digit',
                      minute: '2-digit',
                  })
                : tx.date;
        res.push({
            header: false,
            key: tx.id,
            tx,
            timeLabel,
            stagger: indexInGroup++,
        });
    }
    return res;
});

// Tint class for the amount icon, derived from the tx type colour
function iconTone(tx) {
    if (tx.colour === '#5cff5c') return 'tx-icon-in';
    if (tx.colour === '#f93c4c') return 'tx-icon-out';
    return 'tx-icon-neutral';
}

// Only while a loaded wallet is still syncing (not when no wallet exists)
const showSkeleton = computed(
    () =>
        !txs.value.length &&
        activeWallet.value?.isImported &&
        !activeWallet.value?.isSynced
);
const showEmpty = computed(
    () =>
        !txs.value.length &&
        activeWallet.value?.isSynced &&
        isHistorySynced.value &&
        !updating.value
);

const rewardsText = computed(() => {
    const strBal = rewardAmount.value.toLocaleString('en-GB');
    return `${strBal} <span style="font-size:15px; opacity: 0.55;">${ticker.value}</span>`;
});

watch(
    () => activeWallet.value.historicalTxs,
    async () => {
        await update();
        updateReward();
    }
);
</script>

<template>
    <center class="activity-wrap">
        <div class="dcWallet-activity">
            <span class="activity-title">
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
                        <tbody v-if="showSkeleton">
                            <tr v-for="i in 4" :key="i" class="tx-skeleton-row">
                                <td class="align-middle">
                                    <span
                                        class="skeleton"
                                        style="width: 48px; height: 12px"
                                    ></span>
                                </td>
                                <td class="align-middle">
                                    <span
                                        class="skeleton"
                                        style="width: 150px; height: 24px"
                                    ></span>
                                </td>
                                <td class="align-middle">
                                    <span
                                        class="skeleton"
                                        style="width: 90px; height: 14px"
                                    ></span>
                                </td>
                                <td class="text-right align-middle">
                                    <span
                                        class="skeleton"
                                        style="width: 22px; height: 22px"
                                    ></span>
                                </td>
                            </tr>
                        </tbody>
                        <TransitionGroup v-else tag="tbody" name="tx-row">
                            <tr
                                v-for="row in rows"
                                :key="row.key"
                                :class="
                                    row.header
                                        ? 'tx-group-row'
                                        : {
                                              'tx-new': row.tx.isNew,
                                              ptr: row.tx.memos.length,
                                          }
                                "
                                :style="{
                                    '--stagger': Math.min(row.stagger ?? 0, 8),
                                }"
                                @click="
                                    !row.header &&
                                        row.tx.memos.length &&
                                        (selectedTx = row.tx)
                                "
                            >
                                <td v-if="row.header" colspan="4">
                                    {{ row.label }}
                                </td>
                                <template v-else>
                                    <td class="align-middle pr-10px tx-time">
                                        {{ row.timeLabel }}
                                    </td>
                                    <td class="align-middle pr-10px txcode">
                                        <a
                                            :href="getActivityUrl(row.tx)"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            @click.stop
                                        >
                                            <code
                                                class="wallet-code text-center active ptr"
                                                >{{ row.tx.content }}</code
                                            >
                                        </a>
                                    </td>
                                    <td
                                        class="align-middle pr-10px tx-amount-cell"
                                    >
                                        <span class="tx-amount">
                                            <span
                                                class="tx-icon"
                                                :class="iconTone(row.tx)"
                                                ><i
                                                    class="fa-solid"
                                                    :class="[row.tx.icon]"
                                                ></i
                                            ></span>
                                            <span
                                                v-html="row.tx.formattedAmt"
                                            ></span>
                                            <span class="tx-ticker"
                                                >&nbsp;{{ ticker }}</span
                                            >
                                        </span>
                                    </td>
                                    <td
                                        class="text-right pr-10px align-middle tx-status-cell"
                                    >
                                        <span
                                            v-if="!row.tx.memos.length"
                                            class="tx-status"
                                            :class="
                                                row.tx.confirmed
                                                    ? 'tx-status-confirmed'
                                                    : 'tx-status-pending'
                                            "
                                        >
                                            <span
                                                class="checkIcon"
                                                v-if="row.tx.confirmed"
                                                v-html="iCheck"
                                            ></span>
                                            <span
                                                class="checkIcon"
                                                v-else
                                                v-html="iHourglass"
                                            ></span>
                                        </span>
                                        <span
                                            v-else
                                            class="tx-status tx-status-memo"
                                        >
                                            <i class="fa-solid fa-envelope"></i>
                                        </span>
                                    </td>
                                </template>
                            </tr>
                        </TransitionGroup>
                    </table>
                </div>

                <Transition name="tx-empty">
                    <div v-if="showEmpty" class="activity-empty">
                        <div class="activity-empty-icon">
                            <i
                                class="fa-solid"
                                :class="rewards ? 'fa-gift' : 'fa-receipt'"
                            ></i>
                        </div>
                        <div class="activity-empty-title">
                            {{
                                rewards
                                    ? translation.activityRewardsEmpty
                                    : translation.activityEmpty
                            }}
                        </div>
                        <div class="activity-empty-desc">
                            {{
                                rewards
                                    ? translation.activityRewardsEmptyDesc
                                    : translation.activityEmptyDesc
                            }}
                        </div>
                        <button
                            v-if="!rewards"
                            class="pivx-button-small"
                            data-toggle="modal"
                            data-target="#qrModal"
                            @click="guiRenderCurrentReceiveModal()"
                        >
                            <span class="buttoni-text">{{
                                translation.receive
                            }}</span>
                        </button>
                    </div>
                </Transition>

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
    <TxDetails :selectedTx="selectedTx" @close="selectedTx = null" />
</template>

<style>
/* The parent .row is a flex container; without this the card shrinks to its
   content and hugs the left edge */
.activity-wrap {
    width: 100%;
}

.activity-wrap .scrollTable::-webkit-scrollbar {
    width: 6px;
    height: 6px;
}

.activity-wrap .scrollTable::-webkit-scrollbar-track {
    background: transparent;
}

.activity-wrap .scrollTable::-webkit-scrollbar-thumb {
    background: rgba(146, 33, 255, 0.45);
}

.activity-title {
    font-family: Montserrat, sans-serif;
    color: rgb(233, 222, 255);
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 20px;
    margin-top: 16px;
}

.stakingTx .tx-group-row td {
    padding: 16px 20px 6px !important;
    border-bottom: 0 !important;
    color: #9c86c0;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    text-align: left;
}

.stakingTx tbody tr:hover.tx-group-row {
    background-color: transparent;
}

.stakingTx .tx-time {
    font-size: 12px;
    color: rgba(242, 248, 250, 0.55);
    white-space: nowrap;
}

.stakingTx .txcode code.wallet-code {
    padding: 4px 9px;
    border-radius: 7px;
    background-color: rgba(146, 33, 255, 0.1);
    transition: background-color var(--mpw-dur-fast) ease;
}

.stakingTx .txcode a:hover code.wallet-code {
    background-color: rgba(146, 33, 255, 0.22);
}

.tx-amount {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
}

.tx-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 999px;
    font-size: 10px;
}

.tx-icon-in {
    color: #5cff5c;
    background-color: rgba(92, 255, 92, 0.12);
}

.tx-icon-out {
    color: #ff6b78;
    background-color: rgba(249, 60, 76, 0.14);
}

.tx-icon-neutral {
    color: #e9deff;
    background-color: rgba(233, 222, 255, 0.1);
}

.tx-ticker {
    margin-left: -8px;
    opacity: 0.55;
}

.tx-status {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 7px;
}

.tx-status .checkIcon svg {
    height: 12px;
    fill: #fff;
}

.tx-status-confirmed {
    background-color: rgba(100, 16, 199, 0.85);
}

.tx-status-pending {
    background-color: rgba(230, 160, 40, 0.2);
    border: 1px solid rgba(230, 160, 40, 0.55);
}

.tx-status-pending .checkIcon svg {
    fill: #f5b942;
    animation: mpw-hourglass 2.4s ease-in-out infinite;
}

.tx-status-memo {
    color: #c9a8ff;
    background-color: rgba(146, 33, 255, 0.18);
}

@keyframes mpw-hourglass {
    0%,
    40% {
        transform: rotate(0deg);
    }
    50%,
    90% {
        transform: rotate(180deg);
    }
    100% {
        transform: rotate(360deg);
    }
}

/* Rows fade in, staggered within their group */
.tx-row-enter-active {
    transition: opacity 0.4s ease, transform 0.45s var(--mpw-ease-out);
    transition-delay: calc(var(--stagger, 0) * 35ms);
}

.tx-row-enter-from {
    opacity: 0;
    transform: translateY(6px);
}

/* Freshly arrived transactions get a short highlight */
.stakingTx tbody tr.tx-new {
    animation: mpw-tx-new 2.4s ease-out;
}

@keyframes mpw-tx-new {
    0%,
    30% {
        background-color: rgba(146, 33, 255, 0.22);
    }
    100% {
        background-color: transparent;
    }
}

.activity-empty {
    font-family: Montserrat, sans-serif;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 28px 16px 22px;
    color: #af9cc6;
}

.activity-empty-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    margin-bottom: 14px;
    border-radius: 18px;
    font-size: 22px;
    color: #c9a8ff;
    background: radial-gradient(
        circle at 30% 20%,
        rgba(197, 107, 255, 0.35),
        rgba(100, 16, 199, 0.25)
    );
    box-shadow: 0 10px 30px -10px rgba(146, 33, 255, 0.7);
    animation: mpw-float 4s ease-in-out infinite;
}

.activity-empty-title {
    color: #e9deff;
    font-size: 17px;
    font-weight: 500;
}

.activity-empty-desc {
    max-width: 320px;
    margin: 6px 0 16px;
    font-size: 14px;
    line-height: 1.45;
}

.tx-empty-enter-active {
    transition: opacity var(--mpw-dur-slow) ease,
        transform var(--mpw-dur-slow) var(--mpw-ease-out);
}

.tx-empty-enter-from {
    opacity: 0;
    transform: translateY(8px);
}

@keyframes mpw-float {
    0%,
    100% {
        transform: translateY(0);
    }
    50% {
        transform: translateY(-4px);
    }
}

/* Phones: stack each transaction into a two-line row instead of squeezing a
   four-column table into ~360px */
@media (max-width: 576px) {
    .activity-wrap .dcWallet-activity {
        position: relative;
        width: calc(100% - 24px);
        max-width: none;
        padding: 6px 12px 12px;
    }

    .activity-wrap .activity-title {
        flex-wrap: wrap;
        gap: 8px;
        margin: 14px 0 8px;
        /* Room for the CSV export icon pinned top-right */
        padding: 0 30px;
    }

    .activity-wrap .activity-title > span:first-child {
        font-size: 22px !important;
        white-space: nowrap;
    }

    .activity-wrap .rewardsBadge {
        margin-left: 0;
        top: 0;
        font-size: 15px !important;
    }

    .activity-wrap .scrollTable {
        max-height: none;
        overflow: visible;
    }

    .activity-wrap .stakingTx,
    .activity-wrap .stakingTx tbody {
        display: block;
        width: 100%;
        overflow: visible;
        white-space: normal;
    }

    /* Keep only the CSV export, pinned beside the title */
    .activity-wrap .stakingTx thead {
        display: block;
        height: 0;
        border: 0;
    }

    .activity-wrap .stakingTx thead th.tx1,
    .activity-wrap .stakingTx thead th.tx2,
    .activity-wrap .stakingTx thead th.tx3 {
        display: none;
    }

    .activity-wrap .stakingTx thead th.tx4 {
        position: absolute;
        top: 22px;
        right: 16px;
        width: auto;
        padding: 0;
        background: none;
    }

    .activity-wrap .stakingTx tbody tr:not(.tx-group-row) {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        grid-template-areas:
            'desc amount'
            'time status';
        align-items: center;
        column-gap: 12px;
        row-gap: 4px;
        padding: 11px 4px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }

    .activity-wrap .stakingTx tbody tr:not(.tx-group-row) td {
        display: block;
        width: auto;
        padding: 0 !important;
        border: 0 !important;
    }

    .activity-wrap .stakingTx tbody tr td:nth-child(1) {
        grid-area: time;
    }

    .activity-wrap .stakingTx tbody tr td:nth-child(2) {
        grid-area: desc;
        min-width: 0;
    }

    .activity-wrap .stakingTx tbody tr td:nth-child(3) {
        grid-area: amount;
        justify-self: end;
    }

    .activity-wrap .stakingTx tbody tr td:nth-child(4) {
        grid-area: status;
        justify-self: end;
    }

    .activity-wrap .stakingTx tbody tr.tx-group-row {
        display: block;
    }

    .activity-wrap .stakingTx .tx-group-row td {
        display: block;
        padding: 18px 4px 4px !important;
    }

    .activity-wrap .stakingTx .tx-time {
        font-size: 12px;
    }

    .activity-wrap .stakingTx .txcode a {
        display: block;
        min-width: 0;
    }

    .activity-wrap .stakingTx .txcode code.wallet-code {
        display: block;
        width: fit-content;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        text-align: left !important;
    }

    .activity-wrap .tx-amount {
        font-size: 14px;
    }

    .activity-wrap .tx-status {
        width: 20px;
        height: 20px;
        border-radius: 6px;
    }

    .activity-wrap .tx-status .checkIcon svg {
        height: 10px;
    }
}
</style>
