<script setup>
import {} from 'vue';
import { translation } from '../i18n';
import BottomPopup from '../BottomPopup.vue';
const { unstake, show } = defineProps({
    unstake: Boolean,
    showOwnerAddress: Boolean,
    show: Boolean,
});
const emit = defineEmits(['close']);
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
                        />
                        <div class="input-group-append">
                            <span class="input-group-text p-0">
                                <div
                                    data-i18n="sendAmountCoinsMax"
                                    onclick="MPW.selectMaxBalance(MPW.doms.domStakeAmount, MPW.doms.domStakeAmountValue)"
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
                            id="stakeAmountValue"
                            placeholder="0.00"
                            autocomplete="nope"
                            onkeydown="javascript: return event.keyCode == 69 ? false : true"
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
                        id="delegateOwnerAddress"
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
                    onclick="MPW.delegateGUI()"
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
