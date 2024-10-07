<script setup>
import { toRef, computed } from 'vue';
const props = defineProps({
    proposal: Object,
});
const proposal = toRef(props, 'proposal');
const votePercentage = computed(() =>
    parseFloat(proposal.value.Ratio * 100).toLocaleString(
        'en-gb',
        { minimumFractionDigits: 0, maximumFractionDigits: 1 },
        ',',
        '.'
    )
);
</script>

<template>
    <div class="for-desktop" data-testid="proposalVotes">
        <b>{{ votePercentage }}%</b> <br />
        <small class="votesBg">
            <b
                ><div class="votesYes" style="display: inline">
                    {{ proposal.Yeas }}
                </div></b
            >
            /
            <b
                ><div class="votesNo" style="display: inline">
                    {{ proposal.Nays }}
                </div></b
            ></small
        >
    </div>
</template>
