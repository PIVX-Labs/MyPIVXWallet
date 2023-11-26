import { getEventEmitter } from '../event_bus.js';
import { hasEncryptedWallet, wallet } from '../wallet.js';
import { ref } from 'vue';
import { strCurrency } from '../settings.js';
import { mempool } from '../global.js';
import { cMarket } from '../settings.js';

/**
 * This is the middle ground between vue and the wallet class
 * It makes sure that everything is up to date and provides
 * a reactive interface to it
 */
export function useWallet() {
    // Eventually we want to create a new wallet
    // For now we'll just import the existing one
    // const wallet = new Wallet();

    const isImported = ref(wallet.isLoaded());
    const isViewOnly = ref(wallet.isViewOnly());
    const getKeyToBackup = async () => await wallet.getKeyToBackup();
    const isEncrypted = ref(true);
    const hasShield = ref(wallet.hasShield());
    const sync = async () => {
        await wallet.sync();
        hasShield.value = wallet.hasShield();
    };
    const setMasterKey = (mk) => {
        wallet.setMasterKey(mk);
        isImported.value = wallet.isLoaded();
        isHardwareWallet.value = wallet.isHardwareWallet();
        isHD.value = wallet.isHD();
        isViewOnly.value = wallet.isViewOnly();
        hasEncryptedWallet().then((i) => (isEncrypted.value = i));
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
        await wallet.encrypt(passwd);
        isEncrypted.value = await hasEncryptedWallet();
    };
    const balance = ref(0);
    const shieldBalance = ref(0);
    const currency = ref('USD');
    const price = ref(0.0);

    getEventEmitter().on('balance-update', async () => {
        balance.value = mempool.balance;
        currency.value = strCurrency.toUpperCase();
        shieldBalance.value = await wallet.getShieldBalance();
        price.value = await cMarket.getPrice(strCurrency);
    });

    return {
        isImported,
        isViewOnly,
        isEncrypted,
        getKeyToBackup,
        setMasterKey,
        setShield,
        isHardwareWallet,
        checkDecryptPassword,
        encrypt,
        getAddress,
        wipePrivateData: () => {
            wallet.wipePrivateData();
            isViewOnly.value = wallet.isViewOnly();
        },
        isHD,
        balance,
        hasShield,
        shieldBalance,
        currency,
        price,
        sync,
    };
}
