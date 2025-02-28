<script setup>
import { COIN, cChainParams } from '../chain_params';
import { watch, ref, computed, onMounted } from 'vue';
import { ProposalValidator } from './status';
import { useWallet } from '../composables/use_wallet';
import Masternode from '../masternode.js';
import ProposalsTable from './ProposalsTable.vue';
import RestoreWallet from '../dashboard/RestoreWallet.vue';
import Flipdown from './Flipdown.vue';
import ProposalCreateModal from './ProposalCreateModal.vue';
import MonthlyBudget from './MonthlyBudget.vue';
import BudgetAllocated from './BudgetAllocated.vue';
import { hasEncryptedWallet } from '../wallet';
import { sanitizeHTML } from '../misc';
import { ALERTS, tr, translation } from '../i18n';
import { storeToRefs } from 'pinia';
import { useSettings } from '../composables/use_settings';
import { getNetwork } from '../network/network_manager.js';
import { useMasternode } from '../composables/use_masternode';
import { useAlerts } from '../composables/use_alerts.js';
const { createAlert } = useAlerts();

const showCreateProposalModal = ref(false);

const wallet = useWallet();
const settings = useSettings();
const { localProposals, masternode } = storeToRefs(useMasternode());
const { advancedMode } = storeToRefs(settings);
const {
    blockCount,
    currency: strCurrency,
    price,
    isViewOnly,
} = storeToRefs(wallet);
const proposals = ref([]);
const contestedProposals = ref([]);
const nextSuperBlock = ref(0);
const masternodeCount = ref(1);
const allocatedBudget = computed(() => {
    const proposalValidator = new ProposalValidator(masternodeCount.value);

    return proposals.value.reduce(
        (acc, p) =>
            acc +
            p.MonthlyPayment * Number(proposalValidator.validate(p).passing),
        0
    );
});
// This updates the timestamp every block.
const flipdownTimeStamp = computed(
    () => Date.now() / 1000 + (nextSuperBlock.value - blockCount.value) * 60
);
const showRestoreWallet = ref(false);
const restoreWalletReason = ref('');

// Each block update check if we have local proposals to update or finalize
watch(
    [blockCount, localProposals],
    async () => {
        for (const proposal of localProposals.value) {
            if (!proposal.blockHeight || proposal.blockHeight === -1) {
                let tx;
                try {
                    tx = await getNetwork().getTxInfo(proposal.txid);
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
                await finalizeProposal(proposal);
            }
        }
    },
    { immediate: true }
);

async function restoreWallet(strReason) {
    if (!wallet.isEncrypted) return false;
    if (wallet.isHardwareWallet) return true;
    showRestoreWallet.value = true;
    return await new Promise((res) => {
        watch(
            [showRestoreWallet, isViewOnly],
            () => {
                showRestoreWallet.value = false;
                res(!isViewOnly.value);
            },
            { once: true }
        );
    });
}

async function fetchProposals() {
    const arrProposals = await getNetwork().getProposals({
        fAllowFinished: false,
    });
    if (!arrProposals) return;
    nextSuperBlock.value = await getNetwork().getNextSuperblock();
    masternodeCount.value = (await getNetwork().getMasternodeCount())?.total;

    proposals.value = arrProposals.filter(
        (a) => a.Yeas + a.Nays < 100 || a.Ratio > 0.25
    );
    contestedProposals.value = arrProposals.filter(
        (a) => a.Yeas + a.Nays >= 100 && a.Ratio <= 0.25
    );
}

watch(cChainParams, () => fetchProposals());
onMounted(() => {
    document
        .getElementById('governanceTab')
        .addEventListener('click', fetchProposals);
    fetchProposals();
});

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
    // Ensure the wallet is unlocked
    if (wallet.isViewOnly && !(await restoreWallet())) {
        return;
    }
    // Must have enough funds
    if (wallet.balance * COIN < cChainParams.current.proposalFee) {
        return createAlert('warning', ALERTS.PROPOSAL_NOT_ENOUGH_FUNDS, 4500);
    }

    showCreateProposalModal.value = true;
}

async function createProposal(name, url, payments, monthlyPayment, address) {
    address = address || wallet.getNewAddress(1)[0];
    const start = await getNetwork().getNextSuperblock();
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

        createAlert('success', ALERTS.PROPOSAL_CREATED, 10000);
        showCreateProposalModal.value = false;
    }
}
async function finalizeProposal(proposal) {
    const { ok, err } = await Masternode.finalizeProposal(proposal);

    if (ok) {
        createAlert('success', ALERTS.PROPOSAL_FINALISED);
        deleteProposal(proposal);
        await fetchProposals();
    } else {
        createAlert(
            'warning',
            ALERTS.PROPOSAL_FINALISE_FAIL + '<br>' + sanitizeHTML(err)
        );
    }
}

function deleteProposal(proposal) {
    localProposals.value = localProposals.value.filter(
        (p) => p.txid !== proposal.txid
    );
}

async function vote(proposal, voteCode) {
    if (masternode.value) {
        if ((await masternode.value.getStatus()) !== 'ENABLED') {
            createAlert('warning', ALERTS.MN_NOT_ENABLED, 6000);
            return;
        }
        const result = await masternode.value.vote(proposal.Hash, voteCode);
        if (result.includes('Voted successfully')) {
            // Good vote
            masternode.value.storeVote(proposal.Hash.toString(), voteCode);
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
    } else {
        createAlert('warning', ALERTS.MN_ACCESS_BEFORE_VOTE, 6000);
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
        <div class="col-md-12 title-section rm-pd">
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
            <MonthlyBudget :price="price" :currency="strCurrency" />
            <div class="col-6 col-lg-3 text-center governBudgetCard for-mobile">
                <BudgetAllocated
                    :currency="strCurrency"
                    :price="price"
                    :allocatedBudget="allocatedBudget"
                />
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
                <BudgetAllocated
                    :currency="strCurrency"
                    :price="price"
                    :allocatedBudget="allocatedBudget"
                />
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
                @deleteProposal="(proposal) => deleteProposal(proposal)"
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
    <RestoreWallet
        :show="showRestoreWallet"
        :reason="restoreWalletReason"
        :wallet="wallet"
        @close="showRestoreWallet = false"
    />
</template>
