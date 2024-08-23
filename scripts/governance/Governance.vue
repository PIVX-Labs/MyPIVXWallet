<script setup>
import { COIN, cChainParams } from '../chain_params';
import { watch, ref, computed, reactive } from 'vue';
import { cOracle } from '../prices';
import { ProposalValidator } from './status';
import { useWallet } from '../composables/use_wallet';
import Masternode from '../masternode.js';
import ProposalsTable from './ProposalsTable.vue';
import Flipdown from './Flipdown.vue';
import ProposalCreateModal from './ProposalCreateModal.vue';
import { hasEncryptedWallet } from '../wallet';
import { createAlert, sanitizeHTML } from '../misc';
import { ALERTS, tr, translation } from '../i18n';
import { storeToRefs } from 'pinia';
import { useSettings } from '../composables/use_settings';
import { getNetwork } from '../network';
import { useMasternode } from '../composables/use_masternode';

const strCurrency = 'usd';
const price = ref(0);
const showCreateProposalModal = ref(false);
watch(
    strCurrency,
    async () => {
        price.value = await cOracle.getPrice(strCurrency);
    },
    { immediate: true }
);

const wallet = useWallet();
const settings = useSettings();
const { localProposals, masternode } = storeToRefs(useMasternode());
const { advancedMode } = storeToRefs(settings);
const { blockCount } = storeToRefs(wallet);
const proposals = ref([]);
const contestedProposals = ref([]);
const nextSuperBlock = ref(0);
const masternodeCount = ref(1);
const allocatedBudget = computed(() => {
    const proposalValidator = new ProposalValidator(masternodeCount.value);
    return proposals.value.reduce(
        (acc, p) =>
            acc + p.Allotted * Number(proposalValidator.validate(p).passing),
        0
    );
});
const flipdownTimeStamp = ref(0);
// Each block update check if we have local proposals to update or finalize
watch(blockCount, async () => {
    for (const proposal of localProposals.value) {
        if (!proposal.blockHeight) {
            let tx;
            try {
                tx = await getNetwork().getTxInfo(txid);
            } catch (_) {}
            if (!tx || !tx.blockHeight) {
                // Tx hasn't been confirmed yet, wait for next block
                continue;
            }
            proposal.blockHeight = tx.blockHeight;
        }
        if (
            blockCount.value - proposal.blockHeight >=
            cChainParams.current.proposalFeeConfirmRequirement
        ) {
            // Proposal fee has the required amounts of confirms, stop watching and try to finalize
            // TODO: remove propsal
            finalizeProposal(proposal);
        }
    }
});

function numberToCurrency(number, price) {
    return (number * price).toLocaleString('en-gb', ',', '.', {
        style: 'currency',
    });
}

async function fetchProposals() {
    console.log('updating');
    const arrProposals = await Masternode.getProposals({
        fAllowFinished: false,
    });
    nextSuperBlock.value = await Masternode.getNextSuperblock();
    masternodeCount.value = (await Masternode.getMasternodeCount()).total;

    flipdownTimeStamp.value =
        Date.now() / 1000 + (nextSuperBlock.value - blockCount.value) * 60;
    proposals.value = arrProposals.filter(
        (a) => a.Yeas + a.Nays < 100 || a.Ratio > 0.25
    );
    contestedProposals.value = arrProposals.filter(
        (a) => a.Yeas + a.Nays >= 100 && a.Ratio <= 0.25
    );
}
fetchProposals();
watch(cChainParams, () => fetchProposals());

/**
 * Asynchronously wait for a Proposal Tx to confirm, then cache the height.
 *
 * Do NOT await unless you want to lock the thread for a long time.
 * @param {ProposalCache} cProposalCache - The proposal cache to wait for
 * @returns {Promise<boolean>} Returns `true` once the block height is cached
 */
async function waitForSubmissionBlockHeight(cProposalCache) {
    let nHeight = null;

    // Wait in a permanent throttled loop until we successfully fetch the block
    const cNet = getNetwork();
    while (true) {
        // If a proposal is already fetching, then consequtive calls will be rejected
        cProposalCache.fFetching = true;

        // Attempt to fetch the submission Tx (may not exist yet!)
        let cTx = null;
        try {
            cTx = await cNet.getTxInfo(cProposalCache.txid);
        } catch (_) {}

        if (!cTx || !cTx.blockHeight) {
            // Didn't get the TX, throttle the thread by sleeping for a bit, then try again.
            await sleep(30000);
        } else {
            nHeight = cTx.blockHeight;
            break;
        }
    }

    // Update the proposal finalisation cache
    cProposalCache.nSubmissionHeight = nHeight;

    return true;
}

async function openCreateProposal() {
    // Must have a wallet
    if (!wallet.isImported) {
        return createAlert('warning', ALERTS.PROPOSAL_IMPORT_FIRST, 4500);
    }
    // Wallet must be encrypted
    if (!(await hasEncryptedWallet())) {
        return createAlert(
            'warning',
            tr(translation.popupProposalEncryptFirst, [
                { button: translation.secureYourWallet },
            ]),
            4500
        );
    }
    // Must have enough funds
    if (wallet.balance * COIN < cChainParams.current.proposalFee) {
        return createAlert('warning', ALERTS.PROPOSAL_NOT_ENOUGH_FUNDS, 4500);
    }

    showCreateProposalModal.value = true;
}

async function createProposal(name, url, payments, monthlyPayment, address) {
    address = address || wallet.getNewAddress(1)[0];
    const start = await Masternode.getNextSuperblock();
    const proposal = {
        name,
        url,
        nPayments: payments,
        start,
        address,
        monthlyPayment: monthlyPayment * COIN,
    };
    const validation = Masternode.isValidProposal(proposal);
    if (!validation.ok) {
        createAlert(
            'warning',
            `${ALERTS.PROPOSAL_INVALID_ERROR} ${validation.err}`,
            7500
        );
        return;
    }
    const hash = Masternode.createProposalHash(proposal);
    const txid = await wallet.createAndSendTransaction(
        getNetwork(),
        hash,
        cChainParams.current.proposalFee,
        {
            isProposal: true,
        }
    );
    if (txid) {
        proposal.txid = txid;
        localProposals.value = [...localProposals.value, proposal];

        createAlert('success', translation.PROPOSAL_CREATED, 10000);
        showCreateProposalModal.value = false;
    }
}
async function finalizeProposal(proposal) {
    console.log('hi');
    const { ok, err } = await Masternode.finalizeProposal(proposal);
    if (ok) {
        createAlert('success', translation.PROPOSAL_FINALISED);
    } else {
        createAlert(
            'warning',
            translation.PROPOSAL_FINALISE_FAIL + '<br>' + sanitizeHTML(err)
        );
    }
}

async function vote(hash, voteCode) {
    if (masternode.value) {
        if ((await masternode.value.getStatus()) !== 'ENABLED') {
            createAlert('warning', ALERTS.MN_NOT_ENABLED, 6000);
            return;
        }
        const result = await masternode.value.vote(hash, voteCode);
        if (result.includes('Voted successfully')) {
            // Good vote
            masternode.value.storeVote(hash.toString(), voteCode);
            createAlert('success', ALERTS.VOTE_SUBMITTED, 6000);
        } else if (result.includes('Error voting :')) {
            // If you already voted return an alert
            createAlert('warning', ALERTS.VOTED_ALREADY, 6000);
        } else if (result.includes('Failure to verify signature.')) {
            // wrong masternode private key
            createAlert('warning', ALERTS.VOTE_SIG_BAD, 6000);
        } else {
            // this could be everything
            console.error(result);
            createAlert('warning', ALERTS.INTERNAL_ERROR, 6000);
        }
    }
}
</script>

<template>
    <ProposalCreateModal
        v-show="showCreateProposalModal"
        :advancedMode="advancedMode"
        @close="showCreateProposalModal = false"
        @create="createProposal"
    />
    <div>
        <div class="col-md-12 title-section float-left rm-pd">
            <span
                style="
                    font: 23px 'Montserrat Regular';
                    text-align: center;
                    display: block;
                    font-weight: 300;
                "
                >Vote on Governance</span
            >
            <h3 data-i18n="navGovernance" class="pivx-bold-title center-text">
                Proposals
            </h3>
            <p data-i18n="govSubtext" class="center-text">
                From this tab you can check the proposals and, if you have a
                masternode, be a part of the <b>DAO</b> and vote!
            </p>
        </div>

        <div class="row mb-5">
            <div class="col-6 col-lg-3 text-center governBudgetCard">
                <span
                    data-i18n="govMonthlyBudget"
                    style="font-weight: 400; color: #e9deff; font-size: 18px"
                    >Monthly Budget</span
                >

                <div
                    style="
                        width: 180px;
                        background-color: #3b1170;
                        margin-top: 11px;
                        border-radius: 9px;
                        padding-left: 13px;
                        padding-right: 13px;
                        padding-bottom: 6px;
                        padding-top: 4px;
                    "
                >
                    <span style="font-size: 19px; color: #e9deff"
                        ><span>
                            {{
                                (
                                    cChainParams.current.maxPayment / COIN
                                ).toLocaleString('en-gb', ',', '.')
                            }}
                            {{ ' ' }}
                        </span>
                        <span
                            style="
                                color: #9131ea;
                                font-size: 16px;
                                position: relative;
                                top: 1px;
                            "
                            >{{ cChainParams.current.TICKER }}</span
                        ></span
                    >
                    <hr
                        style="
                            border-top-width: 2px;
                            background-color: #201431;
                            margin-top: 5px;
                            margin-bottom: -2px;
                            margin-left: -13px;
                            margin-right: -13px;
                        "
                    />
                    <span style="font-size: 12px; color: #af9cc6"
                        ><span>
                            {{
                                numberToCurrency(
                                    cChainParams.current.maxPayment / COIN,
                                    price
                                )
                            }}
                            {{ ' ' }}
                        </span>
                        <span style="color: #7c1dea"
                            >{{ strCurrency.toUpperCase() }}
                        </span>
                    </span>
                </div>
            </div>
            <div class="col-6 col-lg-3 text-center governBudgetCard for-mobile">
                <span
                    data-i18n="govAllocBudget"
                    style="font-weight: 400; color: #e9deff; font-size: 18px"
                    >Budget Allocated</span
                >

                <div
                    style="
                        width: 180px;
                        background-color: #3b1170;
                        margin-top: 11px;
                        border-radius: 9px;
                        padding-left: 13px;
                        padding-right: 13px;
                        padding-bottom: 6px;
                        padding-top: 4px;
                    "
                >
                    <span style="font-size: 19px; color: #e9deff"
                        ><span id="allocatedGovernanceBudget"> </span>
                        <span
                            style="
                                color: #9131ea;
                                font-size: 16px;
                                position: relative;
                                top: 1px;
                            "
                            >PIV</span
                        ></span
                    >
                    <hr
                        style="
                            border-top-width: 2px;
                            background-color: #201431;
                            margin-top: 5px;
                            margin-bottom: -2px;
                            margin-left: -13px;
                            margin-right: -13px;
                        "
                    />
                    <span style="font-size: 12px; color: #af9cc6"
                        ><span>{{ allocatedBudget }} {{ 'hi' }}</span>
                    </span>
                </div>
            </div>
            <div
                class="col-12 col-lg-6 text-center governPayoutTime for-desktopTime"
            >
                <span
                    data-i18n="govNextPayout"
                    style="font-weight: 400; color: #e9deff; font-size: 20px"
                    >Next Treasury Payout</span
                >
                <Flipdown :timeStamp="flipdownTimeStamp" />
            </div>
            <div
                class="col-12 col-lg-3 text-center governBudgetCard for-desktop"
            >
                <span
                    data-i18n="govAllocBudget"
                    style="font-weight: 400; color: #e9deff; font-size: 18px"
                    >Budget Allocated</span
                >

                <div
                    style="
                        width: 180px;
                        background-color: #3b1170;
                        margin-top: 11px;
                        border-radius: 9px;
                        padding-left: 13px;
                        padding-right: 13px;
                        padding-bottom: 6px;
                        padding-top: 4px;
                    "
                >
                    <span style="font-size: 19px; color: #e9deff"
                        ><span id="allocatedGovernanceBudget2">{{
                            allocatedBudget.toLocaleString('en-gb', ',', '.') +
                            ' '
                        }}</span>
                        <span
                            style="
                                color: #9131ea;
                                font-size: 16px;
                                position: relative;
                                top: 1px;
                            "
                            >PIV</span
                        ></span
                    >
                    <hr
                        style="
                            border-top-width: 2px;
                            background-color: #201431;
                            margin-top: 5px;
                            margin-bottom: -2px;
                            margin-left: -13px;
                            margin-right: -13px;
                        "
                    />
                    <span style="font-size: 12px; color: #af9cc6"
                        ><span id="allocatedGovernanceBudgetValue2">{{
                            numberToCurrency(allocatedBudget, price)
                        }}</span>
                        {{ ' ' }}
                        <span style="color: #7c1dea"
                            >{{ strCurrency.toUpperCase() }}
                        </span>
                    </span>
                </div>
            </div>
        </div>

        <div class="pivx-button-small governAdd" @click="openCreateProposal()">
            <i class="fas fa-plus"></i>
        </div>

        <div class="dcWallet-activity" style="padding: 16px">
            <ProposalsTable
                :proposals="proposals"
                :localProposals="localProposals"
                :masternodeCount="masternodeCount"
                :strCurrency="strCurrency"
                :price="price"
                @vote="vote"
                @finalizeProposal="(proposal) => finalizeProposal(proposal)"
            />
        </div>

        <hr />
        <br />
        <h3
            data-i18n="contestedProposalsTitle"
            style="width: 100%; text-align: center"
        >
            Contested Proposals
        </h3>
        <p
            data-i18n="contestedProposalsDesc"
            style="width: 100%; text-align: center"
        >
            These are proposals that received an overwhelming amount of
            downvotes, making it likely spam or a highly contestable proposal.
        </p>
        <br />
        <ProposalsTable
            :proposals="contestedProposals"
            :masternodeCount="masternodeCount"
            :strCurrency="strCurrency"
            :price="price"
            @vote="vote"
        />
    </div>
</template>
