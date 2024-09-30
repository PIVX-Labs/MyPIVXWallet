<script setup>
import { toRef, computed } from 'vue';
import { translation } from '../i18n';
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
    <div class="row">
        <div class="col-5 fs-13 fw-600">
            {{ translation.govTableVotes }}
        </div>
        <div class="col-7" data-testid="proposalVotes">
            <b>{{ votePercentage }}%</b>
            <small class="votesBg">
                <b>
                    <div class="votesYes" style="display: inline">
                        {{ proposal.Yeas }}
                    </div>
                </b>
                /
                <b>
                    <div class="votesNo" style="display: inline">
                        {{ proposal.Nays }}
                    </div>
                </b></small
            >
        </div>
    </div>
</template>
