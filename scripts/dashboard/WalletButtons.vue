<script setup>
import { renderWalletBreakdown } from '../charting.js';
import { guiRenderContacts } from '../contacts-book';

import pStats from '../../assets/icons/icon-stats-circle.svg';
import pCompass from '../../assets/icons/icon-compass.svg';
import pAddressBook from '../../assets/icons/icon-address-book.svg';
import pGift from '../../assets/icons/icon-gift.svg';
import { useNetwork } from '../composables/use_network.js';
import { useWallet } from '../composables/use_wallet.js';
import { getBlockbookUrl } from '../utils.js';
import { translation } from '../i18n.js';

const wallet = useWallet();
const network = useNetwork();

function getWalletUrl() {
    return getBlockbookUrl(network.explorerUrl, wallet.getKeyToExport());
}
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
                <span style="color: #eddaffc7">{{ translation.balance }}</span>
            </div>
            <div class="col-3 p-0 cur-pointer">
                <a :href="getWalletUrl()" target="_blank">
                    <span class="dashboardActionIcon" v-html="pCompass"></span
                    ><br />
                    <span style="color: #eddaffc7">{{
                        translation.explorer
                    }}</span>
                </a>
            </div>
            <div
                class="col-3 p-0 cur-pointer"
                :style="{ opacity: wallet.isEncrypted ? 1 : 0.5 }"
                @click="guiRenderContacts()"
                :data-toggle="wallet.isEncrypted ? 'modal' : null"
                :data-target="wallet.isEncrypted ? '#contactsModal' : null"
            >
                <span class="dashboardActionIcon" v-html="pAddressBook"></span
                ><br />
                <span style="color: #eddaffc7">{{ translation.contacts }}</span>
            </div>
            <div
                class="col-3 p-0 cur-pointer"
                data-toggle="modal"
                data-target="#redeemCodeModal"
            >
                <span class="dashboardActionIcon" v-html="pGift"></span><br />
                <span style="color: #eddaffc7">{{ translation.giftCode }}</span>
            </div>
        </div>
    </center>
</template>
