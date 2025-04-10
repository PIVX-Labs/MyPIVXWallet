<script setup>
import { toRefs } from 'vue';
import MobileProposalPayment from './MobileProposalPayment.vue';
import MobileProposalVotes from './MobileProposalVotes.vue';
import MobileProposalVote from './MobileProposalVote.vue';
const props = defineProps({
    proposal: Object,
    price: Number,
    strCurrency: String,
});
const { proposal, price, strCurrency } = toRefs(props);
const emit = defineEmits(['vote', 'deleteProposal']);
</script>

<template>
    <tr class="for-mobile">
        <td
            style="vertical-align: middle"
            id="governMob0"
            colspan="2"
            class="text-left for-mobile"
        >
            <MobileProposalPayment
                :proposal="proposal"
                :price="price"
                :strCurrency="strCurrency"
            />
            <hr class="governHr" />
            <MobileProposalVotes :proposal="proposal" />
            <hr class="governHr" />
            <MobileProposalVote
                @vote="(...args) => emit('vote', ...args)"
                @deleteProposal="emit('deleteProposal')"
            />
        </td>
    </tr>
</template>
