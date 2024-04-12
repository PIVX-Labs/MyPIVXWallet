<script setup>
import { COIN, cChainParams } from '../chain_params';
import { useSettings } from '../composables/use_settings';
import { useWallet } from '../composables/use_wallet';
import Activity from '../dashboard/Activity.vue';
import RestoreWallet from '../dashboard/RestoreWallet.vue';
import { Database } from '../database';
import { getEventEmitter } from '../event_bus';
import { getNetwork } from '../network';
import StakeBalance from './StakeBalance.vue';
import StakeInput from './StakeInput.vue';
import { onMounted, ref, watch, nextTick } from 'vue';
import { ParsedSecret } from '../parsed_secret.js';
import { storeToRefs } from 'pinia';
import { createAlert } from '../misc';
import { ALERTS } from '../i18n';
const wallet = useWallet();
const { balance, coldBalance, price, currency, isViewOnly } =
    storeToRefs(wallet);
const { advancedMode, displayDecimals } = useSettings();
const showUnstake = ref(false);
const showStake = ref(false);
const coldStakingAddress = ref('');
const stakeAmount = ref('');
const unstakeAmount = ref('');
const showRestoreWallet = ref(false);
const restoreWalletReason = ref('');
const activity = ref(null);
async function updateColdStakingAddress() {
    const db = await Database.getInstance();
    coldStakingAddress.value =
        (await db.getAccount())?.coldAddress ||
        cChainParams.current.defaultColdStakingAddress;
}
getEventEmitter().on('toggle-network', updateColdStakingAddress);
getEventEmitter().on('new-tx', () => {
    activity?.value?.update();
});
onMounted(updateColdStakingAddress);

watch(coldStakingAddress, async (coldStakingAddress) => {
    const db = await Database.getInstance();
    const cAccount = await db.getAccount();
    if (!cAccount) return;

    // Save to DB (allowDeletion enabled to allow for resetting the Cold Address)
    cAccount.coldAddress = coldStakingAddress;
    await db.updateAccount(cAccount, true);
});
async function stake(value, ownerAddress) {
    if (wallet.isViewOnly && !(await restoreWallet())) {
        return;
    }
    const res = await wallet.createAndSendTransaction(
        getNetwork(),
        coldStakingAddress.value,
        value,
        {
            isDelegation: true,
            returnAddress: ownerAddress,
        }
    );
    if (res) showStake.value = false;
}

async function unstake(value) {
    if (wallet.isViewOnly && !(await restoreWallet())) {
        return;
    }
    const res = await wallet.createAndSendTransaction(
        getNetwork(),
        wallet.getAddress(1),
        value,
        {
            useDelegatedInputs: true,
            delegateChange: true,
            changeDelegationAddress: coldStakingAddress.value,
        }
    );
    if (res) showUnstake.value = false;
}

async function restoreWallet(strReason) {
    if (!wallet.isEncrypted) return false;
    if (wallet.isHardwareWallet) return true;
    showRestoreWallet.value = true;
    return await new Promise((res) => {
        watch(
            [showRestoreWallet, isViewOnly],
            () => {
                showRestoreWallet.value = false;
                res(!isViewOnly.value);
            },
            { once: true }
        );
    });
}

async function importWif(wif, extsk) {
    const secret = await ParsedSecret.parse(wif);
    if (secret.masterKey) {
        await wallet.setMasterKey(secret.masterKey);
        if (wallet.hasShield && !extsk) {
            createAlert(
                'warning',
                'Could not decrypt sk even if password is correct, please contact a developer'
            );
        }
        if (wallet.hasShield) {
            await wallet.setExtsk(extsk);
        }
        createAlert('success', ALERTS.WALLET_UNLOCKED, 1500);
    }
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
                    :displayDecimals="displayDecimals"
                    @showUnstake="showUnstake = true"
                    @showStake="showStake = true"
                />
            </center>
        </div>

        <div class="col-12 mb-5">
            <Activity title="Reward History" :rewards="true" ref="activity" />
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
    <RestoreWallet
        :show="showRestoreWallet"
        :reason="restoreWalletReason"
        @import="importWif"
        @close="showRestoreWallet = false"
    />
</template>
