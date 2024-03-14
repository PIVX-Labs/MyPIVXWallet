<script setup>
import { nextTick, ref, toRefs, watch } from 'vue';
import { translation } from '../i18n';
import BottomPopup from '../BottomPopup.vue';
import { validateAmount } from '../legacy';
import { COIN } from '../chain_params';
const props = defineProps({
    unstake: Boolean,
    showOwnerAddress: Boolean,
    show: Boolean,
    price: Number,
});
const { unstake, show, price, showOwnerAddress } = toRefs(props);
const emit = defineEmits(['close', 'submit', 'maxBalance']);

const amount = defineModel('amount', {
    default: '',
});
const ownerAddress = ref('');
const amountCurrency = ref('');

function maxBalance() {
    emit('maxBalance');
    nextTick(syncAmountCurrency);
}

watch(showOwnerAddress, () => {
    ownerAddress.value = '';
});

function submit() {
    const value = Math.round(parseFloat(amount.value) * COIN);

    if (validateAmount(value)) {
        emit('submit', value, ownerAddress.value);
    }
}

function syncAmountCurrency() {
    if (amount.value === '') {
        amountCurrency.value = '';
    } else {
        amountCurrency.value = amount.value * price.value;
    }
}

function syncAmount() {
    if (amountCurrency.value === '') {
        amount.value = '';
    } else {
        amount.value = amountCurrency.value / price.value;
    }
}
</script>

<template>
    <BottomPopup
        :title="unstake ? translation.stakeUnstake : translation.stake"
        :show="show"
        @close="emit('close')"
    >
        <div class="transferBody">
            <label
                ><span data-i18n="amount">Amount</span> (<span
                    id="availToDelegate"
                    >-</span
                >)</label
            ><br />

            <div class="row">
                <div class="col-7 pr-2">
                    <div class="input-group mb-3">
                        <input
                            class="btn-group-input"
                            style="padding-right: 0px"
                            type="number"
                            id="delegateAmount"
                            placeholder="0.00"
                            autocomplete="nope"
                            onkeydown="javascript: return event.keyCode == 69 ? false : true"
                            v-model="amount"
                            @input="$nextTick(syncAmountCurrency)"
                        />
                        <div class="input-group-append">
                            <span class="input-group-text p-0">
                                <div
                                    data-i18n="sendAmountCoinsMax"
                                    @click="maxBalance()"
                                    style="
                                        cursor: pointer;
                                        border: 0px;
                                        border-radius: 7px;
                                        padding: 3px 6px;
                                        margin: 0px 1px;
                                        background: linear-gradient(
                                            183deg,
                                            #9621ff9c,
                                            #7d21ffc7
                                        );
                                        color: #fff;
                                        font-weight: bold;
                                    "
                                >
                                    MAX
                                </div>
                            </span>
                            <span
                                id="stakeAmountCoinsTicker"
                                class="input-group-text"
                                >PIV</span
                            >
                        </div>
                    </div>
                </div>

                <div class="col-5 pl-2">
                    <div class="input-group mb-3">
                        <input
                            class="btn-group-input"
                            type="text"
                            placeholder="0.00"
                            autocomplete="nope"
                            onkeydown="javascript: return event.keyCode == 69 ? false : true"
                            v-model="amountCurrency"
                            @input="syncAmount"
                        />
                        <div class="input-group-append">
                            <span
                                id="stakeAmountValueCurrency"
                                class="input-group-text pl-0"
                                >USD</span
                            >
                        </div>
                    </div>
                </div>
            </div>

            <div id="ownerAddressContainer" v-if="showOwnerAddress">
                <label data-i18n="ownerAddress">(Optional) Owner Address</label
                ><br />

                <div class="input-group mb-3">
                    <input
                        class="btn-group-input"
                        data-i18n="ownerAddress"
                        oninput="MPW.guiCheckRecipientInput(event)"
                        style="font-family: monospace"
                        type="text"
                        :v-model="ownerAddress"
                        placeholder="(Optional) Owner Address"
                        autocomplete="nope"
                    />
                    <div class="input-group-append">
                        <span
                            class="input-group-text ptr"
                            onclick="MPW.guiSelectContact(MPW.doms.domStakeOwnerAddress)"
                            ><i class="fa-solid fa-address-book fa-2xl"></i
                        ></span>
                    </div>
                </div>
            </div>

            <div class="text-right pb-2">
                <button
                    class="pivx-button-medium w-100"
                    style="margin: 0px"
                    @click="submit()"
                >
                    <span class="buttoni-icon"
                        ><i class="fas fa-paper-plane fa-tiny-margin"></i
                    ></span>
                    <span data-i18n="stake" class="buttoni-text">{{
                        unstake ? translation.stakeUnstake : translation.stake
                    }}</span>
                </button>
            </div>
        </div>
    </BottomPopup>
</template>
