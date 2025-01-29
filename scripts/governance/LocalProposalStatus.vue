<script setup>
import { cChainParams } from '../chain_params';
import { translation } from '../i18n';
import { computed, toRefs, ref } from 'vue';
import Modal from '../Modal.vue';

const props = defineProps({
    proposal: Object,
    blockCount: Number,
});

const { proposal, blockCount } = toRefs(props);
const showDeleteConfirmation = ref(false);

const status = computed(() => {
    if (!proposal.value.blockHeight || proposal.value.blockHeight === -1) {
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
const emit = defineEmits(['finalizeProposal', 'deleteProposal']);
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
    <button class="pivx-button-small" @click="showDeleteConfirmation = true">
        <i class="fas fa-trash"></i>
    </button>

    <Teleport to="body">
        <Modal :show="showDeleteConfirmation">
            <template #header>
                <h3
                    class="modal-title"
                    style="text-align: center; width: 100%; color: #8e21ff"
                >
                    {{ translation.deleteProposal }}
                </h3>
            </template>

            <template #body>
                {{ translation.deleteProposalBody }}
            </template>
            <template #footer>
                <button
                    data-i18n="popupConfirm"
                    type="button"
                    class="pivx-button-big"
                    style="float: right"
                    @click="
                        emit('deleteProposal');
                        showDeleteConfirmation = false;
                    "
                >
                    Confirm
                </button>
                <button
                    type="button"
                    class="pivx-button-big-cancel"
                    style="float: right"
                    @click="showDeleteConfirmation = false"
                >
                    {{ translation.popupCancel }}
                </button>
            </template>
        </Modal>
    </Teleport>
</template>
