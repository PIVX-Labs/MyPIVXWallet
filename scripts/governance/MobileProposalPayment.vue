<script setup>
import { translation } from '../i18n.js';
import { toRefs, computed } from 'vue';
import { cChainParams } from '../chain_params';
import { optimiseCurrencyLocale } from '../global';

const props = defineProps({
    proposal: Object,
    price: Number,
    strCurrency: String,
});
const { proposal, price, strCurrency } = toRefs(props);
const nProposalValue = computed(
    () =>
        optimiseCurrencyLocale(proposal.value.MonthlyPayment * price.value)
            .nValue
);
</script>

<template>
    <div class="row pt-2">
        <div class="col-5 fs-13 fw-600">
            {{ translation.govTablePayment }}
        </div>
        <div class="col-7">
            <span class="governValues"
                ><b data-testid="proposalMonthlyPayment">{{
                    proposal.MonthlyPayment.toLocaleString('en-gb', ',', '.')
                }}</b>
                <span class="governMarked">PIV</span>
                <span
                    style="margin-left: 10px; margin-right: 2px"
                    class="governMarked governFiatSize"
                    data-testid="proposalFiat"
                    >{{ nProposalValue.toLocaleString('en-gb') }}
                    <span style="color: #7c1dea">{{
                        strCurrency.toUpperCase()
                    }}</span>
                </span>
            </span>

            <span class="governInstallments" data-testid="governInstallments">
                {{ proposal.RemainingPaymentCount }} {{ ' ' }}
                <span v-html="translation.proposalPaymentsRemaining"></span>
                <span style="font-weight: 500"
                    >{{
                        parseInt(proposal.TotalPayment).toLocaleString(
                            'en-gb',
                            ',',
                            '.'
                        )
                    }}

                    {{ cChainParams.current.TICKER }}</span
                >
                {{ translation.proposalPaymentTotal }}</span
            >
        </div>
    </div>
</template>
