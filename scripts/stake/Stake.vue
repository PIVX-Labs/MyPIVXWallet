<script setup>
import { useWallet } from '../composables/use_wallet';
import Activity from '../dashboard/Activity.vue';
import StakeBalance from './StakeBalance.vue';
import StakeInput from './StakeInput.vue';
import { ref } from 'vue';

const {} = useWallet();
const showUnstake = ref(false);
const showStake = ref(false);
</script>

<template>
    <div class="row p-0">
        <div class="col-12 p-0 mb-5">
            <center>
                <StakeBalance
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
