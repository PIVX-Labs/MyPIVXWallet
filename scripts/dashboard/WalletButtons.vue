<script setup>
import { toRefs, onMounted, watch } from 'vue';
import * as jdenticon from 'jdenticon';
import { renderWalletBreakdown } from '../charting.js';
import { openExplorer } from '../global';
import { guiRenderContacts } from '../contacts-book';

import pStats from '../../assets/icons/icon-stats-circle.svg';
import pCompass from '../../assets/icons/icon-compass.svg';
import pAddressBook from '../../assets/icons/icon-address-book.svg';
import pGift from '../../assets/icons/icon-gift.svg';

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
                <span class="dashboardActionIcon" v-html="pStats"></span><br>
                <span style="color:#eddaffc7;">Balance</span>
            </div>
            <div class="col-3 p-0 cur-pointer" @click="openExplorer()">
                <span class="dashboardActionIcon" v-html="pCompass"></span><br>
                <span style="color:#eddaffc7;">Explorer</span>
            </div>
            <div class="col-3 p-0 cur-pointer" @click="guiRenderContacts()" data-toggle="modal" data-target="#contactsModal">
                <span class="dashboardActionIcon" v-html="pAddressBook"></span><br>
                <span style="color:#eddaffc7;">Contacts</span>
            </div>
            <div class="col-3 p-0 cur-pointer" data-toggle="modal" data-target="#redeemCodeModal">
                <span class="dashboardActionIcon" v-html="pGift"></span><br>
                <span style="color:#eddaffc7;">Gift Code</span>
            </div>
        </div>
    </center>
</template>