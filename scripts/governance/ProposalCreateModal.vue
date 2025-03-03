<script setup>
import Modal from '../Modal.vue';
import Form from '../form/Form.vue';
import Input from '../form/Input.vue';
import NumericInput from '../form/NumericInput.vue';
import { translation } from '../i18n.js';
import { COIN, cChainParams } from '../chain_params';
import { toRefs, ref, reactive } from 'vue';
import { isStandardAddress } from '../misc';

const props = defineProps({
    advancedMode: Boolean,
    isTest: Boolean,
});
const { advancedMode } = toRefs(props);
const emit = defineEmits(['close', 'create']);
 const data = reactive({});
const showConfirmation = ref(false);
function submit() {
	showConfirmation.value = false;
    emit(
        'create',
        data.proposalTitle,
        data.proposalUrl,
        data.proposalCycles,
        data.proposalPayment,
        data.proposalAddress
    );
}

function createConfirmationScreen(d) {
    data.proposalTitle = d.proposalTitle;
    data.proposalUrl = d.proposalUrl;
    data.proposalCycles = d.proposalCycles;
    data.proposalPayment = d.proposalPayment;
    data.proposalAddress = d.proposalAddress;
    console.log(d);
    console.log(data);
    showConfirmation.value = true;
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
            <Form @submit="createConfirmationScreen">
                <template #default>
                    <p
                        style="
                            margin-bottom: 12px;
                            color: #af9cc6;
                            font-size: 1rem;
                            font-weight: 500;
                        "
                    >
                        Proposal name
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
                        URL
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
                        Duration in cycles
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
                        {{ cChainParams.current.TICKER }} per cycle
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
                            Proposal Address
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

    <Modal :show="showConfirmation">
        <template #header>
            <h4>{{ translation.proposalConfirm }}</h4>
        </template>
        <template #body>
            <div class="proposalConfirmContainer">
                <p class="proposalConfirmLabel">Proposal name</p>
                <code class="proposalConfirmText">{{
                    data.proposalTitle
                }}</code>
            </div>
            <div class="proposalConfirmContainer">
                <p class="proposalConfirmLabel">URL</p>
                <code class="proposalConfirmText">{{ data.proposalUrl }}</code>
            </div>
            <div>
                <p class="proposalConfirmLabel">Duration in cycles</p>
                <code class="proposalConfirmText">{{
                    data.proposalCycles
                }}</code>
            </div>

            <div class="proposalConfirmContainer">
                <p class="proposalConfirmLabel">
                    {{ cChainParams.current.TICKER }} per cycle
                </p>
                <code class="proposalConfirmText"
                    >{{ data.proposalPayment }}
                </code>
            </div>
            <div class="proposalConfirmContainer">
                <p class="proposalConfirmLabel">
                    {{ translation.proposalTotal }}
                </p>
                <code class="proposalConfirmText"
                    >{{ data.proposalPayment * data.proposalCycles }}
                </code>
            </div>
            <div v-if="data.proposalAddress" class="proposalConfirmContainer">
                <p class="proposalConfirmLabel">Proposal Address</p>
                <code class="proposalConfirmText"
                    >{{ data.proposalAddress }}
                </code>
            </div>
        </template>
        <template #footer>
            <button
                type="button"
                class="pivx-button-big"
                style="float: right"
                data-testid="proposalSubmit"
                @click="submit()"
            >
                {{ translation.popupConfirm }}
            </button>

            <button
                type="button"
                class="pivx-button-big-cancel"
                style="float: left"
                data-testid="proposalCancel"
                @click="showConfirmation = false"
            >
                {{ translation.popupCancel }}
            </button>
        </template>
    </Modal>
</template>
<style>
.proposalConfirmLabel {
    margin-bottom: 0px;
    color: #af9cc6;
    font-size: 1rem;
    font-weight: 500;
}
 .proposalConfirmContainer {
     margin-bottom: 10px;
 }
</style>
