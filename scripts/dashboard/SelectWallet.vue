<script setup>
import { useWallets } from '../composables/use_wallet.js';
import { watch, toRaw, ref } from 'vue';

const wallets = useWallets();
const w = ref([]);
watch(wallets, () => {
    w.value = [];
    w.value = wallets.wallets;
});
</script>

<template>
    AAAAAAAAAA AAAAAAAAAA AAAAAAAAAA AAAAAAAAAA AAAAAAAAAA
    <div v-for="wallet of w">
        {{ wallet.getKeyToExport() + '\n' }}
    </div>
</template>
