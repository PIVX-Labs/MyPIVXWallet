<script setup>
import { toRefs, ref } from 'vue';
import MasternodeRow from './MasternodeRow.vue';
import CreateMasternodeModal from './CreateMasternodeModal.vue';
import { cChainParams, COIN } from '../chain_params';
import { createAlert } from '../alerts/alert';
import { tr, translation } from '../i18n';
// New masternode list for multi-masternode.
// Currently unused. It will be implemented in a subsequent PR
const props = defineProps({
    masternodes: Array,
    possibleUTXOs: Array,
    balance: Number,
    synced: Boolean,
});

const emit = defineEmits([
    'restartMasternode',
    'deleteMasternode',
    'createMasternode',
    'importMasternode',
]);

const showCreateMasternodeModal = ref(false);

function openCreateMasternodeModal() {
    const needed = cChainParams.current.collateralInSats - props.balance;
    if (needed > 0) {
        createAlert(
            'warning',
            tr(translation.ALERTS.MN_NOT_ENOUGH_COLLAT, [
                { amount: needed / COIN },
                { ticker: cChainParams.current.TICKER },
            ])
        );
        return;
    }
    showCreateMasternodeModal.value = true;
}

/**
 * @type {{masternodes: import('vue').Ref<import('../masternode.js').default[]>}}
 */
const { masternodes } = toRefs(props);
</script>

<template>
    <!-- New Masternode list -->
    <div class="dcWallet-activity">
        <h4 class="mnTopConfigured">
            {{
                tr(translation.masternodeConfigured, [
                    { length: masternodes.length },
                ])
            }}
        </h4>

        <div class="scrollTable">
            <div>
                <table
                    class="table table-responsive table-sm stakingTx masternodeTable table-mobile-scroll"
                >
                    <thead>
                        <tr>
                            <th scope="col" style="width: 400px">
                                {{ translation.govTableStatus }}
                            </th>
                            <th scope="col" style="width: 400px">
                                {{ translation.ipAddress }}
                            </th>
                            <th scope="col" style="width: 400px">
                                {{ translation.lastSeen }}
                            </th>
                            <th scope="col" style="width: 400px"></th>
                        </tr>
                    </thead>
                    <tbody>
                        <template v-for="mn of masternodes">
                            <MasternodeRow
                                :masternode="mn"
                                @restartMasternode="
                                    (mn) => emit('restartMasternode', mn)
                                "
                                @deleteMasternode="
                                    (mn) => emit('deleteMasternode', mn)
                                "
                            />
                        </template>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <div
        style="
            display: flex;
            justify-content: center;
            width: 100%;
            margin-top: 25px;
            margin-bottom: 50px;
        "
    >
        <button
            class="pivx-button-small"
            style="height: 42px; width: 228px"
            data-toggle="modal"
            data-target="#createMasternodeModal"
            data-testid="addMasternodeButton"
            :style="{
                opacity:
                    props.balance < cChainParams.current.collateralInSats
                        ? 0.5
                        : 1,
            }"
            @click="openCreateMasternodeModal()"
        >
            <span class="buttoni-text">
                <span id="plus-icon3" class="plus-icon"></span>
                {{ translation.addMasternode }}
            </span>
        </button>
    </div>

    <CreateMasternodeModal
        :synced="synced"
        :balance="balance"
        :possibleUTXOs="possibleUTXOs"
        @createMasternode="(o) => emit('createMasternode', o)"
        @importMasternode="
            (privKey, ip, utxo) => emit('importMasternode', privKey, ip, utxo)
        "
        @close="showCreateMasternodeModal = false"
        :show="showCreateMasternodeModal"
    />

    <!-- TODO: Implement mn reward history here -->
    <div class="dcWallet-activity" v-if="false">
        <span
            style="
                color: rgb(233, 222, 255);
                display: flex;
                justify-content: center;
                margin-bottom: 24px;
                margin-top: 20px;
            "
        >
            <span data-i18n="rewardHistory" style="font-size: 24px"
                >Reward History</span
            >
            <span class="rewardsBadge" style="font-size: 20px">
                0<span style="opacity: 0.55; font-size: 15px">.00</span>
                <span style="font-size: 15px; opacity: 0.55">tPIV</span>
            </span>
        </span>
        <div class="scrollTable">
            <table
                class="table table-responsive table-sm stakingTx table-mobile-scroll"
            >
                <thead>
                    <tr>
                        <th scope="col" class="tx1">Time</th>
                        <th scope="col" class="tx2">ID</th>
                        <th scope="col" class="tx3">Amount</th>
                        <th scope="col" class="tx4"></th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>
    </div>
</template>
