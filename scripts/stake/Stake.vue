<script setup>
import { useWallet } from '../composables/use_wallet';
import Activity from '../dashboard/Activity.vue';
import { Database } from '../database';
import StakeBalance from './StakeBalance.vue';
import StakeInput from './StakeInput.vue';
import { ref, watch } from 'vue';

const { coldBalance } = useWallet();
const showUnstake = ref(false);
const showStake = ref(false);
const coldStakingAddress = ref('');
Database.getInstance().then(async (db) => {
    coldStakingAddress.value = (await db.getAccount()).coldAddress;
});

watch(coldStakingAddress, async (coldStakingAddress) => {
    const db = await Database.getInstance();
    const cAccount = await db.getAccount();

    // Save to DB (allowDeletion enabled to allow for resetting the Cold Address)
    cAccount.coldAddress = coldStakingAddress;
    await db.updateAccount(cAccount, true);
});
</script>

<template>
    <div class="row p-0">
        <div class="col-12 p-0 mb-5">
            <center>
                <StakeBalance
                    v-model:coldStakingAddress="coldStakingAddress"
                    :coldBalance="coldBalance"
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
        :showOwnerAddress="false"
        :show="showStake"
        @close="showStake = false"
    />
    <StakeInput
        :unstake="true"
        :showOwnerAddress="false"
        :show="showUnstake"
        @close="showUnstake = false"
    />
</template>
