<script setup>
import { toRefs } from 'vue';
import { COIN } from '../chain_params';
import { numberToCurrency } from '../misc.js';
const props = defineProps({
    currency: String,
    price: Number,
    allocatedBudget: Number,
});
const { currency, price, allocatedBudget } = toRefs(props);
</script>

<template>
    <span
        data-i18n="govAllocBudget"
        style="font-weight: 400; color: #e9deff; font-size: 18px"
        >Budget Allocated</span
    >

    <div
        style="
            width: 180px;
            background-color: #3b1170;
            margin-top: 11px;
            border-radius: 9px;
            padding-left: 13px;
            padding-right: 13px;
            padding-bottom: 6px;
            padding-top: 4px;
        "
    >
        <span style="font-size: 19px; color: #e9deff"
            ><span id="allocatedGovernanceBudget2">{{
                allocatedBudget.toLocaleString('en-gb', ',', '.') + ' '
            }}</span>
            <span
                style="
                    color: #9131ea;
                    font-size: 16px;
                    position: relative;
                    top: 1px;
                "
                >PIV</span
            ></span
        >
        <hr
            style="
                border-top-width: 2px;
                background-color: #201431;
                margin-top: 5px;
                margin-bottom: -2px;
                margin-left: -13px;
                margin-right: -13px;
            "
        />
        <span style="font-size: 12px; color: #af9cc6"
            ><span id="allocatedGovernanceBudgetValue2">{{
                numberToCurrency(allocatedBudget, price)
            }}</span>
            {{ ' ' }}
            <span style="color: #7c1dea">{{ currency.toUpperCase() }} </span>
        </span>
    </div>
</template>
