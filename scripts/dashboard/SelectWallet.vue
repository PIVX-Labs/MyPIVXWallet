<script setup>
import { useWallets } from '../composables/use_wallet.js';
import { watch, toRaw, ref } from 'vue';

const wallets = useWallets();
const w = ref([]);
const emit = defineEmits(['addWallet']);
watch(wallets, () => {
    w.value = [];
    w.value = wallets.wallets;
});
</script>

<template>
    AAAAAAAAAA AAAAAAAAAA AAAAAAAAAA AAAAAAAAAA AAAAAAAAAA
    <button @click="emit('addWallet')">Add More</button>
    <div v-for="wallet of w">
        {{ wallet.getKeyToExport() + '\n' }}
    </div>
</template>
