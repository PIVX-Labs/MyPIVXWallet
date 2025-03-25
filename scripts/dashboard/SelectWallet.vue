<script setup>
import { useWallets } from '../composables/use_wallet.js';
import { watch, toRaw, ref } from 'vue';

const wallets = useWallets();
const w = ref([]);
const emit = defineEmits(['addWallet']);

function select(wallet) {
    wallets.selectWallet(wallet);
}

function addWallet() {}
</script>

<template>
    AAAAAAAAAA AAAAAAAAAA AAAAAAAAAA AAAAAAAAAA AAAAAAAAAA
    <button @click="emit('addWallet')">Add More</button>
    <div v-for="vault of wallets.vaults">
        VAULT HERE:
        <div v-for="wallet of vault.wallets">
            <span
                :style="{
                    color:
                        wallet.getKeyToExport() ===
                        wallets.activeWallet.getKeyToExport()
                            ? 'green'
                            : 'red',
                }"
            >
                {{ wallet.getKeyToExport() + '\n' }}
            </span>
            <button @click="select(wallet)">SELECT</button>
        </div>
        <button @click="vault.addWallet(vault.wallets.length)">
            ADD WALLET
        </button>
    </div>
</template>
