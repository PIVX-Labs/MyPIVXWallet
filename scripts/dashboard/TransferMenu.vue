<script setup>
import { translation } from '../i18n.js';
import { ref, watch } from 'vue';
import { getAddressColor } from '../contacts-book';
import { promptForContact } from '../contacts-book';
import { sanitizeHTML } from '../misc';
import BottomPopup from '../BottomPopup.vue';
import qrIcon from '../../assets/icons/icon-qr-code.svg';
import addressbookIcon from '../../assets/icons/icon-address-book.svg';

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
});

const address = defineModel('address');

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

function send() {
    // TODO: Maybe in the future do one of those cool animation that set the
    // Input red
    if (address.value && amount.value)
        emit(
            'send',
            sanitizeHTML(address.value),
            amount.value,
            !props.publicMode
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
            <label>{{ translation.address }}</label
            ><br />

            <div class="input-group mb-3">
                <input
                    class="btn-group-input"
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

            <div style="display: none">
                <label
                    ><span>{{ translation.paymentRequestMessage }}</span></label
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
                    <div class="input-group mb-3">
                        <input
                            class="btn-group-input balanceInput"
                            style="padding-right: 0px; border-right: 0px"
                            type="number"
                            placeholder="0.00"
                            autocomplete="nope"
                            onkeypress="return event.charCode >= 46 && event.charCode <= 57"
                            inputmode="decimal"
                            onkeydown="javascript: return event.keyCode == 69 ? false : true"
                            data-testid="amount"
                            @input="syncAmountCurrency"
                            v-model="amount"
                        />
                        <div class="input-group-append">
                            <span
                                class="input-group-text"
                                style="
                                    background-color: #e9deff;
                                    color: #af9cc6;
                                    border: 2px solid #af9cc6;
                                    border-left: 0px;
                                "
                            >
                                PIVX
                            </span>
                            <span
                                class="input-group-text p-0"
                                style="
                                    cursor: pointer;
                                    background-color: #7f20ff;
                                    border: 2px solid #af9cc6;
                                    color: #e9deff;
                                    font-weight: 700;
                                    padding: 0px 10px 0px 10px !important;
                                "
                                @click="$emit('max-balance', !publicMode)"
                            >
                                {{ translation.sendAmountCoinsMax }}
                            </span>
                        </div>
                    </div>
                </div>

                <div class="col-12">
                    <div class="input-group mb-3">
                        <input
                            class="btn-group-input balanceInput"
                            type="text"
                            placeholder="0.00"
                            autocomplete="nope"
                            onkeypress="return event.charCode >= 46 && event.charCode <= 57"
                            inputmode="decimal"
                            onkeydown="javascript: return event.keyCode == 69 ? false : true"
                            data-testid="amountCurrency"
                            @input="syncAmount"
                            v-model="amountCurrency"
                            style="border-right: 0px"
                        />
                        <div class="input-group-append">
                            <span
                                class="input-group-text pl-0"
                                style="
                                    background-color: #e9deff;
                                    color: #af9cc6;
                                    border: 2px solid #af9cc6;
                                    border-left: 0px;
                                "
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

            <div v-if="!publicMode && false">
                <label>SHIELD Message</label><br />

                <textarea
                    style="padding-top: 11px; height: 110px"
                    placeholder="Max. 512 characters"
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
                            class="pivx-button-small-cancel"
                            style="height: 42px; width: 97px"
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
                            class="pivx-button-small"
                            style="height: 42px; width: 97px"
                            @click="send()"
                            data-testid="sendButton"
                        >
                            <span class="buttoni-text">
                                {{ translation.send }}
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </BottomPopup>
</template>

<style>
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
