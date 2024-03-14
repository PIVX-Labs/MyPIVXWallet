<script setup>
import { COIN, cChainParams } from '../chain_params';
import { useSettings } from '../composables/use_settings';
import { useWallet } from '../composables/use_wallet';
import Activity from '../dashboard/Activity.vue';
import { Database } from '../database';
import { getEventEmitter } from '../event_bus';
import { getNetwork } from '../network';
import StakeBalance from './StakeBalance.vue';
import StakeInput from './StakeInput.vue';
import { onMounted, ref, watch } from 'vue';

const {
    balance,
    coldBalance,
    createAndSendTransaction,
    getAddress,
    price,
    currency,
} = useWallet();
const { advancedMode, displayDecimals } = useSettings();
const showUnstake = ref(false);
const showStake = ref(false);
const coldStakingAddress = ref('');
const stakeAmount = ref('');
const unstakeAmount = ref('');
async function updateColdStakingAddress() {
    const db = await Database.getInstance();
    coldStakingAddress.value =
        (await db.getAccount()).coldAddress ||
        cChainParams.current.defaultColdStakingAddress;
}
getEventEmitter().on('toggle-network', updateColdStakingAddress);
onMounted(updateColdStakingAddress);

watch(coldStakingAddress, async (coldStakingAddress) => {
    const db = await Database.getInstance();
    const cAccount = await db.getAccount();

    // Save to DB (allowDeletion enabled to allow for resetting the Cold Address)
    cAccount.coldAddress = coldStakingAddress;
    await db.updateAccount(cAccount, true);
});
function stake(value, ownerAddress) {
    // TODO: restore wallet
    createAndSendTransaction(getNetwork(), coldStakingAddress.value, value, {
        isDelegation: true,
        returnAddress: ownerAddress,
    });
}

function unstake(value) {
    createAndSendTransaction(getNetwork(), getAddress(1), value, {
        useDelegatedInputs: true,
        delegateChange: true,
        changeDelegationAddress: coldStakingAddress.value,
    });
}
</script>

<template>
    <div class="row p-0">
        <div class="col-12 p-0 mb-5">
            <center>
                <StakeBalance
                    v-model:coldStakingAddress="coldStakingAddress"
                    :coldBalance="coldBalance"
                    :price="price"
                    :currency="currency"
                    @showUnstake="showUnstake = true"
                    @showStake="showStake = true"
                />
            </center>
        </div>

        <div class="col-12 mb-5">
            <Activity title="Reward History" :rewards="true" />
        </div>
    </div>
    <StakeInput
        :unstake="false"
        :showOwnerAddress="advancedMode"
        :show="showStake"
        :price="price"
        v-model:amount="stakeAmount"
        @maxBalance="stakeAmount = (balance / COIN).toString()"
        @close="showStake = false"
        @submit="stake"
    />
    <StakeInput
        :unstake="true"
        :showOwnerAddress="false"
        :show="showUnstake"
        :price="price"
        v-model:amount="unstakeAmount"
        @maxBalance="unstakeAmount = (coldBalance / COIN).toString()"
        @close="showUnstake = false"
        @submit="unstake"
    />
</template>
