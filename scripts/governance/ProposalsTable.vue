<script setup>
import MobileProposalRow from './MobileProposalRow.vue';
import ProposalRow from './ProposalRow.vue';
import { toRefs, ref } from 'vue';

import { ProposalValidator } from './status';
import { COIN } from '../chain_params';
import { useWallet } from '../composables/use_wallet';
const props = defineProps({
    proposals: Array,
    localProposals: {
        type: Array,
        default: [],
    },
    masternodeCount: Number,
    strCurrency: String,
    price: Number,
});
const { proposals, localProposals, masternodeCount, strCurrency, price } =
    toRefs(props);
// this is a method rather than a computed property so it updates each re-render
const getProposalValidator = () => new ProposalValidator(masternodeCount.value);
const wallet = useWallet();

const emit = defineEmits(['finalizeProposal', 'vote', 'deleteProposal']);

/**
 * @param{localProposal} Local proposal to convert
 * @returns Returns the proposal in the format the RPC node sends us
 */
function localProposalToRPC(localProposal) {
    return {
        Name: localProposal.name,
        URL: localProposal.url,
        BlockStart: localProposal.start,
        // Remaining count is equal to total payments since it hasn't been finalized yet
        RemainingPaymentCount: localProposal.nPayments,
        TotalPaymentCount: localProposal.nPayments,
        PaymentAddress: localProposal.address,
        Ratio: 0,
        Yeas: 0,
        Nays: 0,
        TotalPayment:
            (localProposal.monthlyPayment * localProposal.nPayments) / COIN,
        MonthlyPayment: localProposal.monthlyPayment / COIN,
        IsEstablished: false,
        IsValid: true,
        blockHeight: localProposal.blockHeight,
    };
}
/**
 * @type{import('vue').Ref<number?>} Index of the row opened on mobile mode. Null if nothing is open
 */
const opened = ref(null);

function openOrCloseRow(i) {
    opened.value = opened.value === i ? null : i;
}
</script>
<template>
    <table
        id="proposalsTable"
        class="table table-hover table-dark bg-transparent governTable"
        style="width: 100%; margin-bottom: 0px"
    >
        <thead>
            <tr>
                <td class="text-center btlr-7p">
                    <b data-i18n="govTableStatus"> Status </b>
                </td>
                <td class="text-center">
                    <b data-i18n="govTableName"> Name </b>
                </td>
                <td class="text-center for-desktop">
                    <b data-i18n="govTablePayment"> Payment </b>
                </td>
                <td class="text-center for-desktop">
                    <b data-i18n="govTableVotes"> Votes </b>
                </td>
                <td class="text-center for-desktop btrr-7p">
                    <b data-i18n="govTableVote"> Vote </b>
                </td>
            </tr>
        </thead>
        <tbody
            id="proposalsTableBody"
            style="text-align: center; vertical-align: middle"
        >
            <template v-for="(proposal, i) of localProposals">
                <ProposalRow
                    :proposal="localProposalToRPC(proposal)"
                    :masternodeCount="masternodeCount"
                    :strCurrency="strCurrency"
                    :price="price"
                    :localProposal="true"
                    :proposalValidator="getProposalValidator()"
                    :blockCount="wallet.blockCount"
                    @click="openOrCloseRow(i)"
                    @deleteProposal="emit('deleteProposal', proposal)"
                    @finalizeProposal="emit('finalizeProposal', proposal)"
                />
                <MobileProposalRow
                    v-if="opened == i"
                    :proposal="localProposalToRPC(proposal)"
                    :price="price"
                    :localProposal="true"
                    :strCurrency="strCurrency"
                    @deleteProposal="emit('deleteProposal', proposal)"
                    @finalizeProposal="emit('finalizeProposal', proposal)"
                />
            </template>
            <template v-for="(proposal, i) of proposals">
                <ProposalRow
                    :proposal="proposal"
                    :masternodeCount="masternodeCount"
                    :strCurrency="strCurrency"
                    :price="price"
                    :proposalValidator="getProposalValidator()"
                    @click="openOrCloseRow(i)"
                    @vote="(code) => emit('vote', proposal, code)"
                />
                <MobileProposalRow
                    v-if="opened == i"
                    :proposal="proposal"
                    :price="price"
                    :strCurrency="strCurrency"
                    @vote="(code) => emit('vote', proposal, code)"
                />
            </template>
        </tbody>
    </table>
</template>
<style>
.proposalVoteButtons {
    vertical-align: middle;
    display: flex;
    justify-content: center;
    align-items: center;
}
</style>
