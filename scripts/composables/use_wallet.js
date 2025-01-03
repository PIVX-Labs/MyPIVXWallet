import { getEventEmitter } from '../event_bus.js';
import { hasEncryptedWallet, wallet } from '../wallet.js';
import { ref, computed } from 'vue';
import { fPublicMode, strCurrency, togglePublicMode } from '../settings.js';
import { cOracle } from '../prices.js';
import { ledgerSignTransaction } from '../ledger.js';
import { defineStore } from 'pinia';
import { lockableFunction } from '../lock.js';
import { blockCount as rawBlockCount } from '../global.js';
import { doms } from '../global.js';
import {
    RECEIVE_TYPES,
    cReceiveType,
    guiToggleReceiveType,
} from '../contacts-book.js';

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
    const getKeyToExport = () => wallet.getKeyToExport();
    const isEncrypted = ref(true);
    const hasShield = ref(wallet.hasShield());
    const getNewAddress = (nReceiving) => wallet.getNewAddress(nReceiving);
    const blockCount = ref(0);

    const setMasterKey = async ({ mk, extsk }) => {
        await wallet.setMasterKey({ mk, extsk });
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
    const getNewChangeAddress = () => wallet.getNewChangeAddress();
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
    const createAndSendTransaction = lockableFunction(
        async (network, address, value, opts) => {
            const tx = wallet.createTransaction(address, value, opts);
            if (wallet.isHardwareWallet()) {
                await ledgerSignTransaction(wallet, tx);
            } else {
                await wallet.sign(tx);
            }
            const res = await network.sendTransaction(tx.serialize());
            if (res) {
                // Don't add unconfirmed txs to the database
                await wallet.addTransaction(tx, true);
            } else {
                wallet.discardTransaction(tx);
            }
            return res;
        }
    );

    const _publicMode = ref(true);
    // Public/Private Mode will be loaded from disk after 'import-wallet' is emitted
    const publicMode = computed({
        get() {
            // If the wallet is not shield capable, always return true
            if (!hasShield.value) return true;
            return _publicMode.value;
        },

        set(newValue) {
            _publicMode.value = newValue;
            const publicMode = _publicMode.value;
            doms.domNavbar.classList.toggle('active', !publicMode);
            doms.domLightBackground.style.opacity = publicMode ? '1' : '0';
            // Depending on our Receive type, flip to the opposite type.
            // i.e: from `address` to `shield`, `shield contact` to `address`, etc
            // This reduces steps for someone trying to grab their opposite-type address, which is the primary reason to mode-toggle.
            const arrFlipTypes = [
                RECEIVE_TYPES.CONTACT,
                RECEIVE_TYPES.ADDRESS,
                RECEIVE_TYPES.SHIELD,
            ];
            if (arrFlipTypes.includes(cReceiveType)) {
                guiToggleReceiveType(
                    publicMode ? RECEIVE_TYPES.ADDRESS : RECEIVE_TYPES.SHIELD
                );
            }

            // Save the mode state to DB
            togglePublicMode(publicMode);
        },
    });

    const isCreatingTransaction = () => createAndSendTransaction.isLocked();
    const getMasternodeUTXOs = () => wallet.getMasternodeUTXOs();
    const getPath = (script) => wallet.getPath(script);
    const lockCoin = (out) => wallet.lockCoin(out);
    const unlockCoin = (out) => wallet.unlockCoin(out);

    getEventEmitter().on('toggle-network', async () => {
        isEncrypted.value = await hasEncryptedWallet();
        blockCount.value = rawBlockCount;
    });

    getEventEmitter().on('wallet-import', async () => {
        publicMode.value = fPublicMode;
    });

    getEventEmitter().on('balance-update', async () => {
        balance.value = wallet.balance;
        immatureBalance.value = wallet.immatureBalance;
        shieldBalance.value = await wallet.getShieldBalance();
        pendingShieldBalance.value = await wallet.getPendingShieldBalance();
        coldBalance.value = wallet.coldBalance;
    });
    getEventEmitter().on('price-update', async () => {
        currency.value = strCurrency.toUpperCase();
        price.value = cOracle.getCachedPrice(strCurrency);
    });

    getEventEmitter().on('new-block', () => {
        blockCount.value = rawBlockCount;
    });

    return {
        publicMode,
        isImported,
        isViewOnly,
        isEncrypted,
        isSynced,
        getKeyToBackup,
        getKeyToExport,
        setMasterKey,
        setExtsk,
        setShield,
        isHardwareWallet,
        checkDecryptPassword,
        encrypt,
        getNewAddress,
        getNewChangeAddress,
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
        coldBalance,
        getMasternodeUTXOs,
        getPath,
        blockCount,
        lockCoin,
        unlockCoin,
    };
});
