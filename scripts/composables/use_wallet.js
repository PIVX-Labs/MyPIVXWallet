import { getEventEmitter } from '../event_bus.js';
import { hasEncryptedWallet, wallet } from '../wallet.js';
import { ref } from 'vue';
import { strCurrency } from '../settings.js';
import { cMarket } from '../settings.js';
import { ledgerSignTransaction } from '../ledger.js';

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
    const loadFromDisk = () => wallet.loadFromDisk();
    const hasShield = ref(wallet.hasShield());
    // True only iff a shield transaction is being created
    // Transparent txs are so fast that we don't need to keep track of them.
    const isCreatingTx = ref(false);

    const setMasterKey = async (mk) => {
        wallet.setMasterKey(mk);
        isImported.value = wallet.isLoaded();
        isHardwareWallet.value = wallet.isHardwareWallet();
        isHD.value = wallet.isHD();
        isViewOnly.value = wallet.isViewOnly();
        isEncrypted.value = await hasEncryptedWallet();
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
        await wallet.encrypt(passwd);
        isEncrypted.value = await hasEncryptedWallet();
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
    };
    getEventEmitter().on('shield-loaded-from-disk', () => {
        hasShield.value = wallet.hasShield();
    });
    getEventEmitter().on(
        'shield-transaction-creation-update',
        async (_, finished) => {
            isCreatingTx.value = !finished;
        }
    );
    const createAndSendTransaction = async (network, address, value, opts) => {
        const tx = wallet.createTransaction(address, value, opts);
        if (wallet.isHardwareWallet()) {
            await ledgerSignTransaction(wallet, tx);
        } else {
            await wallet.sign(tx);
        }
        const res = await network.sendTransaction(tx.serialize());
        if (res) {
            wallet.addTransaction(tx);
        }
    };

    getEventEmitter().on('balance-update', async () => {
        balance.value = wallet.balance;
        immatureBalance.value = wallet.immatureBalance;
        currency.value = strCurrency.toUpperCase();
        shieldBalance.value = await wallet.getShieldBalance();
        pendingShieldBalance.value = await wallet.getPendingShieldBalance();
        coldBalance.value = wallet.coldBalance;
        price.value = await cMarket.getPrice(strCurrency);
    });

    return {
        isImported,
        isViewOnly,
        isEncrypted,
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
        isHD,
        balance,
        hasShield,
        shieldBalance,
        pendingShieldBalance,
        isCreatingTx,
        immatureBalance,
        currency,
        price,
        sync,
        createAndSendTransaction,
        loadFromDisk,
        coldBalance,
    };
}
