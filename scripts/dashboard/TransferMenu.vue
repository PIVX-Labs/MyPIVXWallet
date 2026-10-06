<script setup>
import { translation } from '../i18n.js';
import { ref, watch, nextTick } from 'vue';
import { getAddressColor } from '../contacts-book';
import { promptForContact } from '../contacts-book';
import { isShieldAddress, sanitizeHTML } from '../misc';
import BottomPopup from '../BottomPopup.vue';
import qrIcon from '../../assets/icons/icon-qr-code.svg';
import addressbookIcon from '../../assets/icons/icon-address-book.svg';
import { computed } from 'vue';
import Form from '../form/Form.vue';

const emit = defineEmits([
    'send',
    'close',
    'max-balance',
    'openQrScan',
    'update:amount',
    'update:address',
]);
// Amount of PIVs to send in the selected currency (e.g. USD)
const amountCurrency = ref('');
const color = ref('');

const props = defineProps({
    show: Boolean,
    price: Number,
    currency: String,
    amount: String,
    desc: String,
    address: String,
    publicMode: Boolean,
    // 'idle' | 'sending' | 'sent'
    sendState: { type: String, default: 'idle' },
    // Validation errors from the parent, e.g. { address: 'Invalid address' }
    errors: { type: Object, default: () => ({}) },
});

const address = defineModel('address');
const memo = defineModel('memo', { default: '' });

const isSendingToShield = computed(() => isShieldAddress(address.value));

watch(address, (value) =>
    getAddressColor(value).then((c) => (color.value = `${c} !important`))
);

watch(
    () => props.price,
    () => {
        syncAmountCurrency();
    }
);

const amount = defineModel('amount', {
    set(value) {
        return value.toString();
    },
});

watch(amount, () => syncAmountCurrency());

// Field errors caught locally (empty fields), shown inline under the input
const localErrors = ref({ address: '', amount: '' });
const addressError = computed(
    () => localErrors.value.address || props.errors.address || ''
);
const amountError = computed(
    () => localErrors.value.amount || props.errors.amount || ''
);
watch(
    () => props.show,
    (show) => {
        if (show) localErrors.value = { address: '', amount: '' };
    }
);
watch(address, () => (localErrors.value.address = ''));
watch(amount, () => (localErrors.value.amount = ''));

const addressGroup = ref(null);
const amountGroup = ref(null);

/** Replay the shake animation on a field group */
function shake(el) {
    if (!el) return;
    el.classList.remove('shake');
    // Force a reflow so the animation restarts even if it just ran
    void el.offsetWidth;
    el.classList.add('shake');
}

// Shake whichever field the parent flagged after a failed send
watch(
    () => props.errors,
    async (errors) => {
        await nextTick();
        if (errors.address) shake(addressGroup.value);
        else if (errors.amount) shake(amountGroup.value);
    }
);

function send() {
    if (props.sendState !== 'idle') return;
    if (!address.value) {
        localErrors.value.address = translation.transactionNeedsAddress;
        shake(addressGroup.value);
        return;
    }
    if (!amount.value) {
        localErrors.value.amount = translation.transactionNeedsAmount;
        shake(amountGroup.value);
        return;
    }

    emit(
        'send',
        sanitizeHTML(address.value),
        amount.value,
        !props.publicMode,
        memo.value
    );
}

function syncAmountCurrency() {
    if (amount.value === '') {
        amountCurrency.value = '';
    } else {
        amountCurrency.value = amount.value * props.price;
    }
}

function syncAmount() {
    if (amountCurrency.value === '') {
        amount.value = '';
    } else {
        amount.value = amountCurrency.value / props.price;
    }
}

async function selectContact() {
    address.value = (await promptForContact()) || '';
}
</script>

<template>
    <BottomPopup :title="translation.send" :show="show" @close="$emit('close')">
        <div class="transferBody">
            <Form
                @submit="send()"
                @cancel="emit('close')"
                :show-submit-button="false"
            >
                <label>{{ translation.address }}</label
                ><br />

                <div
                    class="input-group"
                    :class="addressError ? 'mb-2' : 'mb-3'"
                    ref="addressGroup"
                >
                    <input
                        class="btn-group-input"
                        :class="{ 'input-invalid': addressError }"
                        style="font-family: monospace"
                        :style="{ color }"
                        type="text"
                        :placeholder="translation.receivingAddress"
                        v-model="address"
                        autocomplete="nope"
                    />
                    <div class="input-group-append tranferModal">
                        <span
                            class="input-group-text ptr buttonj-icon"
                            style="padding-left: 7px; padding-right: 12px"
                            @click="$emit('openQrScan')"
                            v-html="qrIcon"
                        >
                        </span>
                        <span
                            class="input-group-text ptr buttonj-icon"
                            style="padding-left: 7px; padding-right: 12px"
                            @click="selectContact()"
                            v-html="addressbookIcon"
                        >
                        </span>
                    </div>
                </div>

                <Transition name="field-error">
                    <div
                        v-if="addressError"
                        class="field-error"
                        role="alert"
                        data-testid="addressError"
                    >
                        {{ addressError }}
                    </div>
                </Transition>

                <div style="display: none">
                    <label
                        ><span>{{
                            translation.paymentRequestMessage
                        }}</span></label
                    ><br />
                    <div class="input-group">
                        <input
                            class="btn-input"
                            style="font-family: monospace"
                            type="text"
                            disabled
                            placeholder="Payment Request Description"
                            autocomplete="nope"
                        />
                    </div>
                </div>

                <label>{{ translation.amount }}</label
                ><br />
                <div class="row">
                    <div class="col-12">
                        <div
                            class="input-group"
                            :class="amountError ? 'mb-2' : 'mb-3'"
                            ref="amountGroup"
                        >
                            <input
                                class="btn-group-input balanceInput"
                                :class="{ 'input-invalid': amountError }"
                                style="padding-right: 0px; border-right: 0px"
                                type="number"
                                step="any"
                                placeholder="0.00"
                                autocomplete="nope"
                                onkeypress="return (event.charCode >= 46 && event.charCode <= 57) || event.charCode === 13"
                                inputmode="decimal"
                                onkeydown="javascript: return event.keyCode == 69 ? false : true"
                                data-testid="amount"
                                @input="syncAmountCurrency"
                                v-model="amount"
                            />
                            <div class="input-group-append">
                                <span class="input-group-text input-addon">
                                    PIVX
                                </span>
                                <span
                                    class="input-group-text input-addon-action"
                                    @click="$emit('max-balance', !publicMode)"
                                >
                                    {{ translation.sendAmountCoinsMax }}
                                </span>
                            </div>
                        </div>
                        <Transition name="field-error">
                            <div
                                v-if="amountError"
                                class="field-error"
                                role="alert"
                                data-testid="amountError"
                            >
                                {{ amountError }}
                            </div>
                        </Transition>
                    </div>

                    <div class="col-12">
                        <div class="input-group mb-3">
                            <input
                                class="btn-group-input balanceInput"
                                type="text"
                                placeholder="0.00"
                                autocomplete="nope"
                                onkeypress="return (event.charCode >= 46 && event.charCode <= 57)  || event.charCode === 13"
                                inputmode="decimal"
                                onkeydown="javascript: return event.keyCode == 69 ? false : true"
                                data-testid="amountCurrency"
                                @input="syncAmount"
                                v-model="amountCurrency"
                                style="border-right: 0px"
                            />
                            <div class="input-group-append">
                                <span
                                    class="input-group-text input-addon pl-0"
                                    >{{ currency }}</span
                                >
                            </div>
                        </div>
                        <div v-if="desc && desc.length > 0">
                            <label
                                ><span>{{
                                    translation.paymentRequestMessage
                                }}</span></label
                            ><br />
                            <div class="input-group">
                                <input
                                    class="btn-input"
                                    style="font-family: monospace"
                                    type="text"
                                    disabled
                                    placeholder="Payment Request Description"
                                    autocomplete="nope"
                                    :value="desc"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div v-if="isSendingToShield">
                    <label>{{ translation.shieldMessage }}</label
                    ><br />

                    <textarea
                        style="padding-top: 11px; height: 110px"
                        v-model="memo"
                        :maxlength="512"
                        :placeholder="translation.shieldMessageDesc"
                    ></textarea>
                </div>

                <div v-if="false">
                    <label
                        ><span>{{ translation.fee }}</span></label
                    ><br />

                    <div class="row text-center">
                        <div class="col-4 pr-1">
                            <div class="feeButton">
                                Low<br />
                                9 sat/B
                            </div>
                        </div>

                        <div class="col-4 pl-2 pr-2">
                            <div class="feeButton feeButtonSelected">
                                Medium<br />
                                11 sat/B
                            </div>
                        </div>

                        <div class="col-4 pl-1">
                            <div class="feeButton">
                                High<br />
                                14 sat/B
                            </div>
                        </div>
                    </div>
                    <br />
                </div>

                <div class="pb-2">
                    <div class="row">
                        <div class="col-6">
                            <button
                                type="button"
                                class="pivx-button-small-cancel"
                                style="height: 42px; width: 97px"
                                :disabled="sendState !== 'idle'"
                                @click="$emit('close')"
                                data-testid="closeButton"
                            >
                                <span class="buttoni-text">
                                    {{ translation.cancel }}
                                </span>
                            </button>
                        </div>

                        <div class="col-6 text-right">
                            <button
                                class="pivx-button-small send-button"
                                :class="'send-button-' + sendState"
                                :disabled="sendState !== 'idle'"
                                :aria-busy="sendState === 'sending'"
                                data-testid="sendButton"
                            >
                                <Transition name="send-label" mode="out-in">
                                    <span
                                        v-if="sendState === 'sending'"
                                        key="sending"
                                        class="buttoni-text"
                                    >
                                        <i
                                            class="fas fa-circle-notch fa-spin"
                                        ></i>
                                        {{ translation.sendingTransaction }}
                                    </span>
                                    <span
                                        v-else-if="sendState === 'sent'"
                                        key="sent"
                                        class="buttoni-text"
                                    >
                                        <i class="fas fa-check send-check"></i>
                                        {{ translation.transactionSentShort }}
                                    </span>
                                    <span
                                        v-else
                                        key="idle"
                                        class="buttoni-text"
                                    >
                                        {{ translation.send }}
                                    </span>
                                </Transition>
                            </button>
                        </div>
                    </div>
                </div>
            </Form>
        </div>
    </BottomPopup>
</template>

<style>
.send-button {
    height: 42px;
    min-width: 97px;
    padding-left: 16px !important;
    padding-right: 16px !important;
    white-space: nowrap;
}

.send-button .buttoni-text {
    display: inline-flex;
    align-items: center;
    gap: 7px;
}

.send-button:disabled.send-button-sending {
    opacity: 0.85;
    cursor: progress;
    filter: none;
}

.send-button.send-button-sent,
.send-button:disabled.send-button-sent {
    opacity: 1;
    filter: none;
    background-image: linear-gradient(183deg, #3fae3f, #2b8a2b);
    box-shadow: 0 8px 24px -8px rgba(92, 255, 92, 0.6);
}

.send-check {
    animation: mpw-pop var(--mpw-dur-slow) var(--mpw-ease-spring);
}

.send-label-enter-active,
.send-label-leave-active {
    transition: opacity var(--mpw-dur-fast) ease,
        transform var(--mpw-dur-fast) ease;
}

.send-label-enter-from {
    opacity: 0;
    transform: translateY(4px);
}

.send-label-leave-to {
    opacity: 0;
    transform: translateY(-4px);
}

.field-error-enter-active,
.field-error-leave-active {
    transition: opacity var(--mpw-dur-base) ease,
        transform var(--mpw-dur-base) var(--mpw-ease-out);
}

.field-error-enter-from,
.field-error-leave-to {
    opacity: 0;
    transform: translateY(-4px);
}

.transferAnimation {
    transform: translate3d(0, 390px, 0);
}

.transferItem {
    cursor: pointer;
    margin: 9px 12px;
    display: flex;
}

.transferItem .transferIcon {
    margin-right: 10px;
}

.transferItem .transferText {
    line-height: 17px;
    font-size: 15px;
}

.transferItem .transferText span {
    font-size: 11px;
    color: #dbdbdb;
}

.transferMenu .transferBody {
    padding: 9px 12px;
    font-size: 15px;
}

.transferMenu .transferBody .feeButton {
    background-color: #ffffff00;
    border: 1px solid #ffffff1f;
    border-radius: 8px;
    padding: 5px 0px;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.125s ease-in-out;
}

.transferMenu .transferBody .feeButtonSelected {
    background-color: #ffffff0f;
}

.transferMenu .transferBody .pasteAddress i {
    transition: all 0.125s ease-in-out;
    cursor: pointer;
}

.transferMenu .transferBody .pasteAddress i:hover {
    color: #9621ff9c;
}
</style>
