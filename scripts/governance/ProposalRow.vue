<script setup>
import ProposalStatus from './ProposalStatus.vue';
import LocalProposalStatus from './LocalProposalStatus.vue';
import ProposalName from './ProposalName.vue';
import ProposalPayment from './ProposalPayment.vue';
import ProposalVotes from './ProposalVotes.vue';
import Modal from '../Modal.vue';
import { translation } from '../i18n.js';
import { toRefs, ref } from 'vue';
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
    blockCount: Number,
});
const {
    proposal,
    masternodeCount,
    strCurrency,
    price,
    proposalValidator,
    blockCount,
} = toRefs(props);
const emit = defineEmits([
    'click',
    'finalizeProposal',
    'vote',
    'deleteProposal',
]);
const showConfirmVoteModal = ref(false);
const selectedVoteCode = ref(0);
function vote(voteCode) {
    selectedVoteCode.value = voteCode;
    showConfirmVoteModal.value = true;
}
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
                :blockCount="blockCount"
                @finalizeProposal="emit('finalizeProposal')"
                @deleteProposal="emit('deleteProposal')"
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
                    <button
                        class="pivx-button-outline pivx-button-outline-small govNoBtnMob"
                        style="width: fit-content"
                        @click="vote(2)"
                    >
                        <span> {{ translation.no }} </span>
                    </button>
                    <button
                        class="pivx-button-small govYesBtnMob"
                        style="width: fit-content; height: 36px"
                        @click="vote(1)"
                    >
                        <span style="vertical-align: middle">
                            {{ translation.yes }}
                        </span>
                    </button>
                </div>
            </td>
        </template>
    </tr>
    <Teleport to="body">
        <Modal :show="showConfirmVoteModal">
            <template #header>
                <span> {{ translation.ALERTS.CONFIRM_POPUP_VOTE }} </span>
            </template>
            <template #body>
                <span
                    v-html="translation.ALERTS.CONFIRM_POPUP_VOTE_HTML"
                ></span>
            </template>
            <template #footer>
                <button
                    @click="showConfirmVoteModal = false"
                    class="pivx-button-small-cancel"
                    style="height: 42px; width: 228px"
                >
                    {{ translation.popupCancel }}
                </button>
                <button
                    @click="
                        emit('vote', selectedVoteCode);
                        showConfirmVoteModal = false;
                    "
                    data-testid="confirmVote"
                    class="pivx-button-small"
                    style="height: 42px; width: 228px"
                >
                    {{ translation.popupConfirm }}
                </button>
            </template>
        </Modal>
    </Teleport>
</template>
