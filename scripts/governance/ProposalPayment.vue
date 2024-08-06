<script setup>
import { cChainParams } from '../chain_params';
import { useSettings } from '../composables/use_settings.js';
import { translation } from '../i18n';
import { cOracle } from '../prices';
import { toRef, computed } from 'vue';
import { optimiseCurrencyLocale } from '../global.js';
//const {  } = useSettings()
const props = defineProps({
    proposal: Object,
});
// TODO: use settings
const strCurrency = 'usd';
const price = cOracle.getCachedPrice(strCurrency);
const proposal = toRef(props, 'proposal');
const nMonthlyPayment = computed(() => parseInt(proposal.value.MonthlyPayment));
const nProposalValue = computed(
    () => optimiseCurrencyLocale(nMonthlyPayment * price).nValue
);
</script>
<template>
    <div class="for-desktop">
        <span class="governValues"
            ><b>{{ nMonthlyPayment.toLocaleString('en-gb', ',', '.') }}</b>
            <span class="governMarked">{{ cChainParams.current.TICKER }}</span>
            <br />
            <b class="governFiatSize"
                >{{ nProposalValue.toLocaleString('en-gb') }}
                <span style="color: #7c1dea">{{
                    strCurrency.toUpperCase()
                }}</span></b
            ></span
        >

        <span class="governInstallments">
            {{ proposal.RemainingPaymentCount }}
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
</template>
