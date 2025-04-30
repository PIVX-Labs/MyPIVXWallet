<script setup>
import Modal from '../Modal.vue';
import Form from '../form/Form.vue';
import Input from '../form/Input.vue';
import NumericInput from '../form/NumericInput.vue';
import { translation } from '../i18n.js';
import { COIN, cChainParams } from '../chain_params';
import { toRefs, ref, reactive, watch } from 'vue';
import { isStandardAddress } from '../misc';

const props = defineProps({
    advancedMode: Boolean,
    isTest: Boolean,
    show: Boolean,
});
const { advancedMode, show } = toRefs(props);
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
        advancedMode.value ? data.proposalAddress : undefined
    );
}

function createConfirmationScreen(d) {
    data.proposalTitle = d.proposalTitle;
    data.proposalUrl = d.proposalUrl;
    data.proposalCycles = d.proposalCycles;
    data.proposalPayment = d.proposalPayment;
    data.proposalAddress = d.proposalAddress;
    showConfirmation.value = true;
}

const isSafeStr = /^[a-z0-9 .,;\-_/:?@()]+$/i;
</script>

<template>
    <Modal :show="show">
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

    <Modal :show="showConfirmation" :centered="true">
        <template #header>
            <h4>{{ translation.proposalConfirm }}</h4>
        </template>
        <template #body>
            <div class="row">
                <div class="col-6">
                    <div class="proposalConfirmContainer">
                        <p class="proposalConfirmLabel">Proposal name</p>
                        <code class="proposalConfirmText">{{
                            data.proposalTitle
                        }}</code>
                    </div>
                </div>

                <div class="col-6">
                    <div>
                        <p class="proposalConfirmLabel">Duration in cycles</p>
                        <code class="proposalConfirmText">{{
                            data.proposalCycles
                        }}</code>
                    </div>
                </div>

                <div class="col-6">
                    <div class="proposalConfirmContainer">
                        <p class="proposalConfirmLabel">
                            {{ cChainParams.current.TICKER }} per cycle
                        </p>
                        <code class="proposalConfirmText"
                            >{{ data.proposalPayment }}
                            {{ cChainParams.current.TICKER }}
                        </code>
                    </div>
                </div>
                <div class="col-6">
                    <div class="proposalConfirmContainer">
                        <p class="proposalConfirmLabel">
                            {{ translation.proposalTotal }}
                        </p>
                        <code class="proposalConfirmText"
                            >{{ data.proposalPayment * data.proposalCycles }}
                            {{ cChainParams.current.TICKER }}
                        </code>
                    </div>
                </div>

                <div class="col-12">
                    <div class="proposalConfirmContainer">
                        <p class="proposalConfirmLabel">URL</p>
                        <div class="proposalConfirmText link">
                            <a
                                :href="data.proposalUrl"
                                target="_blank"
                                rel="noopener noreferrer"
                                >{{ data.proposalUrl }}</a
                            >
                        </div>
                    </div>
                </div>

                <div class="col-12">
                    <div
                        v-if="data.proposalAddress"
                        class="proposalConfirmContainer"
                    >
                        <p class="proposalConfirmLabel">
                            {{ translation.popupProposalAddress2 }}
                        </p>
                        <code class="proposalConfirmText"
                            >{{ data.proposalAddress }}
                        </code>
                    </div>
                </div>
            </div>
        </template>
        <template #footer>
            <button
                type="button"
                class="pivx-button-big"
                style="float: right"
                data-testid="proposalConfirmSubmit"
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

.proposalConfirmText {
    background-color: #0000003d;
    padding: 1px 5px 2px 5px;
    border-radius: 5px;
}

.proposalConfirmText.link {
    background-color: #0000003d;
    padding: 1px 5px 2px 5px;
    border-radius: 5px;
    width: fit-content;
    word-break: break-all;
}

.proposalConfirmText.link a {
    color: #9221ff;
    font-size: 87.5%;
    font-family: SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono',
        'Courier New', monospace !important;
}

.proposalConfirmText.link a:hover {
    text-decoration: underline !important;
}

code {
    color: #e9deff;
}
</style>
