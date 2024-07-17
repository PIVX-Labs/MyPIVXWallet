<script setup>
import { useSettings } from '../composables/use_settings';
import { ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
const settings = useSettings();
const { accountIndex, advancedMode } = storeToRefs(settings);
const accountIndexStr = ref(settings.accountIndex.toString());
watch(advancedMode, (advancedMode) => {
    if (!advancedMode) {
        accountIndex.value = 0;
    }
});
watch(accountIndex, () => {
    accountIndexStr.value = settings.accountIndex.toString();
});
watch(accountIndexStr, () => {
    accountIndexStr.value = accountIndexStr.value
        .toString()
        .replace(/[^0-9]/, '');
    const accountIndex = Number.parseInt(accountIndexStr.value);
    if (accountIndex > 255) {
        accountIndexStr.value = '255';
    }
});
function setAccountIndex() {
    accountIndex.value = Number.parseInt(accountIndexStr.value) || 0;
}
</script>

<template>
    <div v-if="settings.advancedMode">
        <hr />
        <div style="display: flex">
            <label style="" for="accountIndex">
                Choose a custom account index for ledger wallets.
            </label>
            <input
                id="accountIndex"
                v-model="accountIndexStr"
                @change="setAccountIndex()"
                min="0"
                max="255"
            />
        </div>
    </div>
</template>
