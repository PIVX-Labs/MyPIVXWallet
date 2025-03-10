<script setup>
import { useWallets } from '../composables/use_wallet.js';
import { watch, toRaw, ref } from 'vue';

const wallets = useWallets();
const w = ref([]);
const emit = defineEmits(['addWallet']);

function select(wallet) {
    wallets.selectWallet(wallet);
}

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
        <button @click="select(wallet)">SELECT</button>
    </div>
</template>
