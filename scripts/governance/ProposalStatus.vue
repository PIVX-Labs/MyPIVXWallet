<script setup>
import { translation } from '../i18n';
import { computed, toRefs } from 'vue';
import { ProposalValidator, reasons } from './status';
const props = defineProps({
    proposal: Object,
    nMasternodes: Number,
    proposalValidator: ProposalValidator,
});
const { proposal, nMasternodes, proposalValidator } = toRefs(props);
const proposalStatus = computed(() => {
    const { Yeas, Nays } = proposal.value;
    const netYes = Yeas - Nays;

    let statusClass = '';
    let funding = '';
    const { passing, reason } = proposalValidator.value.validate(
        proposal.value
    );
    const status = passing
        ? translation.proposalPassing
        : translation.proposalFailing;

    if (passing) {
        funding = translation.proposalFunded;
        statusClass = 'votesYes';
    } else {
        switch (reason) {
            case reasons.NOT_FUNDED: {
                funding = translation.proposalNotFunded;
                statusClass = 'votesNo';
                break;
            }
            case reasons.OVER_BUDGET: {
                funding = translation.proposalOverBudget;
                statusClass = 'votesOverAllocated';
                break;
            }
            case reasons.TOO_YOUNG: {
                funding = translation.proposalTooYoung;
                statusClass = 'votesNo';
                break;
            }
        }
    }

    return {
        status,
        statusClass,
        funding,
        netYesPercent: (netYes / nMasternodes.value) * 100,
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
        <span
            style="font-weight: 700"
            data-testid="proposalStatus"
            :class="proposalStatus.statusClass"
            >{{ proposalStatus.status }}</span
        ><br />
        <span style="color: #9482b1" data-testid="proposalFunding"
            >({{ proposalStatus.funding }})</span
        ><br />
    </span>
    <span
        style="
            font-size: 12px;
            line-height: 15px;
            display: block;
            color: #9482b1;
        "
        data-testid="proposalPercentage"
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
