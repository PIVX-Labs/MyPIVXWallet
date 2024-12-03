<script setup>
import { cChainParams } from '../chain_params';
import { translation } from '../i18n';
import { computed, toRefs } from 'vue';

const props = defineProps({
    proposal: Object,
    blockCount: Number,
});

const { proposal, blockCount } = toRefs(props);

const status = computed(() => {
    if (!proposal.value.blockHeight) {
        // If we have no blockHeight, proposal fee is still confirming
        return translation.proposalFinalisationConfirming;
    }
    const nConfsLeft =
        proposal.value.blockHeight +
        cChainParams.current.proposalFeeConfirmRequirement -
        blockCount.value;
    if (nConfsLeft > 0) {
        return (
            nConfsLeft +
            ' block' +
            (nConfsLeft === 1 ? '' : 's') +
            ' ' +
            translation.proposalFinalisationRemaining
        );
    } else if (Math.abs(nConfsLeft) >= cChainParams.current.budgetCycleBlocks) {
        return translation.proposalFinalisationExpired;
    } else {
        return translation.proposalFinalisationReady;
    }
});
const emit = defineEmits(['finalizeProposal']);
</script>
<template>
    <span
        style="
            font-size: 12px;
            line-height: 15px;
            display: block;
            margin-bottom: 15px;
        "
    >
        <span
            style="color: #fff; font-weight: 700"
            data-testid="localProposalStatus"
            >{{ status }}</span
        ><br />
    </span>
    <span class="governArrow for-mobile ptr">
        <i class="fa-solid fa-angle-down"></i>
    </span>
    <button
        v-if="status === translation.proposalFinalisationReady"
        data-testid="finalizeProposalButton"
        class="pivx-button-small"
        @click="emit('finalizeProposal')"
    >
        <i class="fas fa-check"></i>
    </button>
</template>
