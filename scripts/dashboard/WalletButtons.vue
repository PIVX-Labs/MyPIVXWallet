<script setup>
import { toRefs, onMounted, watch } from 'vue';
import * as jdenticon from 'jdenticon';
import { renderWalletBreakdown } from '../charting.js';
import { openExplorer } from '../global';
import { guiRenderContacts } from '../contacts-book';

const props = defineProps({
    jdenticonValue: String,
});
const {
    jdenticonValue,
} = toRefs(props);

onMounted(() => {
    jdenticon.configure();
    watch(
        jdenticonValue,
        () => {
            jdenticon.update('#identicon', jdenticonValue.value);
        },
        {
            immediate: true,
        }
    );
});
</script>

<template>
    <center>
        <div class="row mb-5" style="max-width: 310px; font-size:13px;">
            <div class="col-3 p-0 cur-pointer" @click="renderWalletBreakdown()" data-toggle="modal" data-target="#walletBreakdownModal">
                <i class="fa-solid fa-chart-pie" style="color:#9621FF; height: 25px; font-size:20px"></i><br>
                Balance
            </div>
            <div class="col-3 p-0 cur-pointer" @click="openExplorer()">
                <i class="fa-solid fa-magnifying-glass" style="color:#9621FF; height: 25px; font-size:20px"></i><br>
                Explorer
            </div>
            <div class="col-3 p-0 cur-pointer" @click="guiRenderContacts()" data-toggle="modal" data-target="#contactsModal">
                <i class="fa-solid fa-address-book" style="color:#9621FF; height: 25px; font-size:20px"></i><br>
                Contacts
            </div>
            <div class="col-3 p- cur-pointer" data-toggle="modal" data-target="#redeemCodeModal">
                <i class="fa-solid fa-gift" style="color:#9621FF; height: 25px; font-size:20px"></i><br>
                Gift Code
            </div>
        </div>
    </center>
</template>