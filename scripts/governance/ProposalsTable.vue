<script setup>
import ProposalStatus from './ProposalStatus.vue';
import ProposalName from './ProposalName.vue';
import ProposalPayment from './ProposalPayment.vue';
import ProposalVotes from './ProposalVotes.vue';
import { toRefs, computed } from 'vue';
import { translation } from '../i18n.js';
import { ProposalValidator } from './status';
const props = defineProps({
    proposals: Object,
    masternodeCount: Number,
    strCurrency: String,
    price: Number,
});
const { proposals, masternodeCount, strCurrency, price } = toRefs(props);
const proposalValidator = computed(
    () => new ProposalValidator(masternodeCount.value)
);

//TODO: fetch currency from settings
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
            <tr v-for="(proposal, index) of proposals">
                <td class="governStatusCol">
                    <!-- REMEMBER TO UPDATE THIS!!! -->
                    <ProposalStatus
                        :proposal="proposal"
                        :proposalValidator="proposalValidator"
                        :nMasternodes="masternodeCount"
                    />
                </td>
                <td style="vertical-align: middle">
                    <ProposalName :proposal="proposal" />
                </td>
                <td style="vertical-align: middle">
                    <ProposalPayment
                        :proposal="proposal"
                        :price="price"
                        :strCurrency="strCurrency"
                    />
                </td>
                <td style="vertical-align: middle">
                    <ProposalVotes :proposal="proposal" />
                </td>
                <td style="vertical-align: middle">
                    <div class="proposalVoteButtons for-desktop">
                        <div
                            class="pivx-button-outline pivx-button-outline-small govNoBtnMob"
                            style="width: fit-content"
                        >
                            <span> {{ translation.no }} </span>
                        </div>
                        <div
                            class="pivx-button-small govYesBtnMob"
                            style="width: fit-content"
                        >
                            <span> {{ translation.yes }} </span>
                        </div>
                    </div>
                </td>
            </tr>
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
