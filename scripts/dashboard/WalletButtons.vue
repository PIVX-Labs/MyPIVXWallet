<script setup>
import { renderWalletBreakdown } from '../charting.js';
import { guiRenderContacts } from '../contacts-book';
import { watch, ref } from 'vue';
import { storeToRefs } from 'pinia';

import pStats from '../../assets/icons/icon-stats-circle.svg';
import pCompass from '../../assets/icons/icon-compass.svg';
import pAddressBook from '../../assets/icons/icon-address-book.svg';
import pGift from '../../assets/icons/icon-gift.svg';
import { useNetwork } from '../composables/use_network.js';
import { useWallets } from '../composables/use_wallet.js';
import { getBlockbookUrl } from '../utils.js';

const { activeWallet } = storeToRefs(useWallets());
const network = useNetwork();
const walletUrl = ref('');

watch(
    [activeWallet, network],
    () => {
        console.log('Updating');
        walletUrl.value = getBlockbookUrl(
            network.explorerUrl,
            activeWallet.value.getKeyToExport()
        );
    },
    {
        immediate: true,
    }
);
</script>

<template>
    <center>
        <div class="row mb-5" style="max-width: 310px; font-size: 13px">
            <div
                class="col-3 p-0 cur-pointer"
                @click="renderWalletBreakdown()"
                data-toggle="modal"
                data-target="#walletBreakdownModal"
            >
                <span class="dashboardActionIcon" v-html="pStats"></span><br />
                <span style="color: #eddaffc7">Balance</span>
            </div>
            <div class="col-3 p-0 cur-pointer">
                <a :href="walletUrl" target="_blank">
                    <span class="dashboardActionIcon" v-html="pCompass"></span
                    ><br />
                    <span style="color: #eddaffc7">Explorer</span>
                </a>
            </div>
            <div
                class="col-3 p-0 cur-pointer"
                :style="{ opacity: activeWallet.isEncrypted ? 1 : 0.5 }"
                @click="guiRenderContacts()"
                :data-toggle="activeWallet.isEncrypted ? 'modal' : null"
                :data-target="
                    activeWallet.isEncrypted ? '#contactsModal' : null
                "
            >
                <span class="dashboardActionIcon" v-html="pAddressBook"></span
                ><br />
                <span style="color: #eddaffc7">Contacts</span>
            </div>
            <div
                class="col-3 p-0 cur-pointer"
                data-toggle="modal"
                data-target="#redeemCodeModal"
            >
                <span class="dashboardActionIcon" v-html="pGift"></span><br />
                <span style="color: #eddaffc7">Gift Code</span>
            </div>
        </div>
    </center>
</template>
