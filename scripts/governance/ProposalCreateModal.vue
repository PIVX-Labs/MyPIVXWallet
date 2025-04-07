<script setup>
import Modal from '../Modal.vue';
import Form from '../form/Form.vue';
import Input from '../form/Input.vue';
import NumericInput from '../form/NumericInput.vue';
import { translation } from '../i18n.js';
import { COIN, cChainParams } from '../chain_params';
import { toRefs } from 'vue';
import { isStandardAddress } from '../misc';

const props = defineProps({
    advancedMode: Boolean,
    isTest: Boolean,
});
const { advancedMode } = toRefs(props);
const emit = defineEmits(['close', 'create']);
function submit(data) {
    emit(
        'create',
        data.proposalTitle,
        data.proposalUrl,
        data.proposalCycles,
        data.proposalPayment,
        data.proposalAddress
    );
}

const isSafeStr = /^[a-z0-9 .,;\-_/:?@()]+$/i;
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
            <Form @submit="submit">
                <template #default>
                    <p
                        style="
                            margin-bottom: 12px;
                            color: #af9cc6;
                            font-size: 1rem;
                            font-weight: 500;
                        "
                    >
                        {{ translation.popupProposalName }}
                    </p>
                    <Input
                        name="proposalTitle"
                        data-testid="proposalTitle"
                        :max-length="20"
                        :placeholder="translation.popupProposalName"
                        :validation-function="
                            (value) => {
                                if (!isSafeStr.test(value))
                                    return translation.formValidationString;
                                return true;
                            }
                        "
                    />
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
                    <Input
                        name="proposalUrl"
                        data-testid="proposalUrl"
                        :max-length="64"
                        placeholder="https://forum.pivx.org/..."
                        :validation-function="
                            (value) => {
                                if (!isSafeStr.test(value))
                                    return translation.formValidationString;
                                if (
                                    !/^(https?):\/\/[^\s/$.?#][^\s]*[^\s/.]\.[^\s/.][^\s]*[^\s.]$/.test(
                                        value
                                    )
                                )
                                    return translation.formValidationUrl;
                                return true;
                            }
                        "
                    />
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
                    <NumericInput
                        name="proposalCycles"
                        data-testid="proposalCycles"
                        :min="1"
                        :max="cChainParams.current.maxPaymentCycles"
                        :placeholder="translation.popupProposalDuration"
                    />

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
                    <NumericInput
                        name="proposalPayment"
                        data-testid="proposalPayment"
                        min="10"
                        :max="cChainParams.current.maxPayment / COIN"
                        :placeholder="`${cChainParams.current.TICKER} ${translation.popupProposalPerCycle}`"
                    />
                    <span v-show="advancedMode">
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
                        <Input
                            name="proposalAddress"
                            data-testid="proposalAddress"
                            :validation-function="
                                (value) => {
                                    if (
                                        value.length !== 0 &&
                                        !isStandardAddress(value)
                                    )
                                        return translation.formValidationAddress;
                                    return true;
                                }
                            "
                            :disabled="!advancedMode"
                        />
                    </span>
                </template>

                <template #button="slotProps">
                    <Teleport
                        :disabled="props.isTest"
                        defer
                        to=".create-proposal-button-container"
                    >
                        <button
                            type="button"
                            class="pivx-button-big"
                            style="float: right"
                            data-testid="proposalSubmit"
                            @click="slotProps.onSubmit()"
                        >
                            {{ translation.popupConfirm }}
                        </button>
                    </Teleport>
                </template>
            </Form>
        </template>
        <template #footer>
            <div class="create-proposal-button-container"></div>
            <button
                type="button"
                class="pivx-button-big-cancel"
                style="float: left"
                data-testid="proposalCancel"
                @click="emit('close')"
            >
                {{ translation.popupCancel }}
            </button>
        </template>
    </Modal>
</template>
