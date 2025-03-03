<script setup>
import Modal from '../Modal.vue';
import { translation } from '../i18n.js';
import { COIN, cChainParams } from '../chain_params';
import { toRefs, ref, watch } from 'vue';

const props = defineProps({
    advancedMode: Boolean,
});
const name = ref('');
const url = ref('');
const payments = ref(0);
const monthlyPayment = ref('');
const address = ref('');
const { advancedMode } = toRefs(props);
const emit = defineEmits(['close', 'create']);
function submit() {
    emit(
        'create',
        name.value,
        url.value,
        payments.value,
        monthlyPayment.value,
        address.value
    );
}
watch(advancedMode, () => (address.value = ''));
</script>

<template>
    <Modal :show="true">
        <template #header>
            <h4>{{ translation.popupCreateProposal }}</h4>
            <span
                style="
                    color: #af9cc6;
                    font-size: 1rem;
                    margin-bottom: 23px;
                    display: block;
                "
                >{{ translation.popupCreateProposalCost }}
                <b
                    >{{ cChainParams.current.proposalFee / COIN }}
                    {{ cChainParams.current.TICKER }}</b
                ></span
            >
        </template>
        <template #body>
            <div style="padding-left: 10px; padding-right: 10px">
                <p
                    style="
                        margin-bottom: 12px;
                        color: #af9cc6;
                        font-size: 1rem;
                        font-weight: 500;
                    "
                >
                    {{ translation.proposalName }}
                </p>
                <input
                    data-testid="proposalTitle"
                    maxlength="20"
                    :placeholder="translation.popupProposalName"
                    style="text-align: start; margin-bottom: 25px"
                    v-model="name"
                /><br />

                <p
                    style="
                        margin-bottom: 12px;
                        color: #af9cc6;
                        font-size: 1rem;
                        font-weight: 500;
                    "
                >
                    {{ translation.proposalUrl }}
                </p>
                <input
                    data-testid="proposalUrl"
                    maxlength="64"
                    placeholder="https://forum.pivx.org/..."
                    style="margin-bottom: 25px; text-align: start"
                    v-model="url"
                /><br />

                <p
                    style="
                        margin-bottom: 12px;
                        color: #af9cc6;
                        font-size: 1rem;
                        font-weight: 500;
                    "
                >
                    {{ translation.popupProposalDuration }}
                </p>
                <input
                    type="number"
                    data-testid="proposalCycles"
                    min="1"
                    :max="cChainParams.current.maxPaymentCycles"
                    :placeholder="translation.popupProposalDuration"
                    style="margin-bottom: 25px; text-align: start"
                    v-model="payments"
                /><br />

                <p
                    style="
                        margin-bottom: 12px;
                        color: #af9cc6;
                        font-size: 1rem;
                        font-weight: 500;
                    "
                >
                    {{ cChainParams.current.TICKER }}
                    {{ translation.popupProposalPerCycle }}
                </p>
                <input
                    type="number"
                    data-testid="proposalPayment"
                    min="10"
                    :max="cChainParams.current.maxPayment / COIN"
                    :placeholder="
                        cChainParams.current.TICKER +
                        ' ' +
                        translation.popupProposalPerCycle
                    "
                    style="margin-bottom: 25px; text-align: start"
                    v-model="monthlyPayment"
                />
                <br v-if="!advancedMode" />
                <span v-if="advancedMode">
                    <p
                        style="
                            margin-bottom: 12px;
                            color: #af9cc6;
                            font-size: 1rem;
                            font-weight: 500;
                        "
                    >
                        {{ translation.popupProposalAddress }}
                    </p>
                    <input
                        data-testid="proposalAddress"
                        maxlength="34"
                        :placeholder="translation.popupProposalAddress"
                        style="margin-bottom: 25px; text-align: start"
                        v-model="address"
                    />
                </span>
            </div>
        </template>
        <template #footer>
            <button
                type="button"
                class="pivx-button-big-cancel"
                style="float: left"
                data-testid="proposalCancel"
                @click="emit('close')"
            >
                {{ translation.popupCancel }}
            </button>
            <button
                type="button"
                class="pivx-button-big"
                style="float: right"
                data-testid="proposalSubmit"
                @click="submit()"
            >
                {{ translation.popupConfirm }}
            </button>
        </template>
    </Modal>
</template>
