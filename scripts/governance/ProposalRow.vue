<script setup>
import ProposalStatus from './ProposalStatus.vue';
import LocalProposalStatus from './LocalProposalStatus.vue';
import ProposalName from './ProposalName.vue';
import ProposalPayment from './ProposalPayment.vue';
import ProposalVotes from './ProposalVotes.vue';
import { translation } from '../i18n.js';
import { computed, toRefs } from 'vue';
import { ProposalValidator } from './status';
const props = defineProps({
    proposal: Object,
    masternodeCount: Number,
    strCurrency: String,
    price: Number,
    localProposal: {
        default: false,
        type: Boolean,
    },
    proposalValidator: ProposalValidator,
});
const { proposal, masternodeCount, strCurrency, price, proposalValidator } =
    toRefs(props);
const emit = defineEmits(['click', 'finalizeProposal']);
</script>

<template>
    <tr>
        <td class="governStatusCol" @click="emit('click')">
            <ProposalStatus
                v-if="!localProposal"
                :proposal="proposal"
                :proposalValidator="proposalValidator"
                :nMasternodes="masternodeCount"
            />
            <LocalProposalStatus
                v-else
                :proposal="proposal"
                @finalizeProposal="emit('finalizeProposal')"
            />
        </td>
        <td style="vertical-align: middle">
            <ProposalName :proposal="proposal" />
        </td>
        <td style="vertical-align: middle" class="for-desktop">
            <ProposalPayment
                :proposal="proposal"
                :price="price"
                :strCurrency="strCurrency"
            />
        </td>
        <td style="vertical-align: middle" class="for-desktop">
            <ProposalVotes :proposal="proposal" />
        </td>
        <template v-if="!localProposal">
            <td style="vertical-align: middle" class="for-desktop">
                <div class="proposalVoteButtons">
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
        </template>
    </tr>
</template>
