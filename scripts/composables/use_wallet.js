import { getEventEmitter } from '../event_bus.js';
import { hasEncryptedWallet, wallet } from '../wallet.js';
import { ref } from 'vue';
import { strCurrency } from '../settings.js';
import { cOracle } from '../prices.js';
import { ledgerSignTransaction } from '../ledger.js';
import { defineStore } from 'pinia';
import { lockableFunction } from '../lock.js';

/**
 * This is the middle ground between vue and the wallet class
 * It makes sure that everything is up to date and provides
 * a reactive interface to it
 */
export const useWallet = defineStore('wallet', () => {
    // Eventually we want to create a new wallet
    // For now we'll just import the existing one
    // const wallet = new Wallet();

    const isImported = ref(wallet.isLoaded());
    const isViewOnly = ref(wallet.isViewOnly());
    const isSynced = ref(wallet.isSynced);
    const getKeyToBackup = async () => await wallet.getKeyToBackup();
    const isEncrypted = ref(true);
    const loadFromDisk = () => wallet.loadFromDisk();
    const hasShield = ref(wallet.hasShield());

    const setMasterKey = async ({ mk, extsk }) => {
        wallet.setMasterKey({ mk, extsk });
        isImported.value = wallet.isLoaded();
        isHardwareWallet.value = wallet.isHardwareWallet();
        isHD.value = wallet.isHD();
        isViewOnly.value = wallet.isViewOnly();
        isEncrypted.value = await hasEncryptedWallet();
        isSynced.value = wallet.isSynced;
    };
    const setExtsk = async (extsk) => {
        await wallet.setExtsk(extsk);
    };
    const setShield = (shield) => {
        wallet.setShield(shield);
        hasShield.value = wallet.hasShield();
    };
    const getAddress = () => wallet.getAddress();
    const isHardwareWallet = ref(wallet.isHardwareWallet());
    const isHD = ref(wallet.isHD());
    const checkDecryptPassword = async (passwd) =>
        await wallet.checkDecryptPassword(passwd);

    hasEncryptedWallet().then((r) => {
        isEncrypted.value = r;
    });

    const encrypt = async (passwd) => {
        const res = await wallet.encrypt(passwd);
        isEncrypted.value = await hasEncryptedWallet();
        return res;
    };
    const balance = ref(0);
    const shieldBalance = ref(0);
    const coldBalance = ref(0);
    const pendingShieldBalance = ref(0);
    const immatureBalance = ref(0);
    const currency = ref('USD');
    const price = ref(0.0);
    const sync = async () => {
        await wallet.sync();
        balance.value = wallet.balance;
        shieldBalance.value = await wallet.getShieldBalance();
        pendingShieldBalance.value = await wallet.getPendingShieldBalance();
        isSynced.value = wallet.isSynced;
    };
    getEventEmitter().on('shield-loaded-from-disk', () => {
        hasShield.value = wallet.hasShield();
    });
    const sendTransaction = async (network, tx) => {
        const res = await network.sendTransaction(tx.serialize());
        if (res) {
            await wallet.addTransaction(tx);
        } else {
            wallet.discardTransaction(tx);
        }
        return res;
    };
    const createAndSendTransaction = lockableFunction(
        async (network, address, value, opts) => {
            const tx = wallet.createTransaction(address, value, opts);
            if (wallet.isHardwareWallet()) {
                await ledgerSignTransaction(wallet, tx);
            } else {
                await wallet.sign(tx);
            }
            return await sendTransaction(network, tx);
        }
    );
    const createAutoshieldTransactions = async (network, address, value) => {
        const txs = await wallet.createAutoshieldTransactions(address, value);
        let res = true;
        for (const tx of txs) {
            res = res && (await sendTransaction(network, tx));
        }
        return res;
    };
    const isCreatingTransaction = () => createAndSendTransaction.isLocked();

    getEventEmitter().on('toggle-network', async () => {
        isEncrypted.value = await hasEncryptedWallet();
    });

    getEventEmitter().on('balance-update', async () => {
        balance.value = wallet.balance;
        immatureBalance.value = wallet.immatureBalance;
        currency.value = strCurrency.toUpperCase();
        shieldBalance.value = await wallet.getShieldBalance();
        pendingShieldBalance.value = await wallet.getPendingShieldBalance();
        coldBalance.value = wallet.coldBalance;
        price.value = cOracle.getCachedPrice(strCurrency);
    });

    return {
        isImported,
        isViewOnly,
        isEncrypted,
        isSynced,
        getKeyToBackup,
        setMasterKey,
        setExtsk,
        setShield,
        isHardwareWallet,
        checkDecryptPassword,
        encrypt,
        getAddress,
        wipePrivateData: () => {
            wallet.wipePrivateData();
            isViewOnly.value = wallet.isViewOnly();
        },
        isCreatingTransaction,
        isHD,
        balance,
        hasShield,
        shieldBalance,
        pendingShieldBalance,
        immatureBalance,
        currency,
        price,
        sync,
        createAndSendTransaction,
        loadFromDisk,
        coldBalance,
        createAutoshieldTransactions,
    };
});
