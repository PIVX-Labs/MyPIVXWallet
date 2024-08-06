<script setup>
import { translation } from '../i18n';
import { ref, computed, toRefs } from 'vue';
const props = defineProps({
    proposal: Object,
    nMasternodes: Number,
    overBudget: Boolean,
});
console.log(props.proposal);
const proposalStatus = computed(() => {
    const { Yeas, Nays } = props.proposal;
    const netYes = Yeas - Nays;

    const requiredVotes = props.nMasternodes / 10;
    const status =
        netYes >= requiredVotes
            ? translation.proposalPassing
            : translation.proposalFailing;
    let statusClass = '';
    let funding = '';
    if (netYes < requiredVotes) {
        funding = translation.proposalNotFunded;
        statusClass = 'votesNo';
    } else if (!props.proposal.IsEstablished) {
        funding = translation.proposalTooYoung;
        statusClass = 'votesNo';
    } else if (props.overBudget) {
        funding = translation.proposalOverBudget;
        statusClass = 'votesOverAllocted';
    } else {
        funding = translation.proposalFunded;
        statusClass = 'votesYes';
    }
    return {
        status,
        statusClass,
        funding,
        netYesPercent: (netYes / props.nMasternodes) * 100,
    };
});
</script>

<template>
    <span
        style="
            text-transform: uppercase;
            font-size: 12px;
            line-height: 15px;
            display: block;
            margin-bottom: 15px;
        "
    >
        <span style="font-weight: 700" :class="proposalStatus.statusClass">{{
            proposalStatus.status
        }}</span
        ><br />
        <span style="color: #9482b1">({{ proposalStatus.funding }})</span><br />
    </span>
    <span
        style="
            font-size: 12px;
            line-height: 15px;
            display: block;
            color: #9482b1;
        "
    >
        <b style="color: #e9deff"
            >{{ proposalStatus.netYesPercent.toFixed(1) }}%</b
        ><br />
        {{ translation.proposalNetYes }}
    </span>
    <span class="governArrow for-mobile ptr">
        <i class="fa-solid fa-angle-down"></i>
    </span>
</template>
