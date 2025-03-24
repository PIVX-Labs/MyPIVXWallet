import { getEventEmitter } from '../event_bus.js';
import {
    hasEncryptedWallet,
    getNewAddress as guiGetNewAddress,
    wallets,
    setWallet,
    vaults as rawVaults,
} from '../wallet.js';
import { ref, computed, toRaw, watch, reactive } from 'vue';
import { fPublicMode, strCurrency, togglePublicMode } from '../settings.js';
import { cOracle } from '../prices.js';
import { LedgerController } from '../ledger.js';
import { defineStore } from 'pinia';
import { lockableFunction } from '../lock.js';
import { blockCount as rawBlockCount } from '../global.js';
import { doms } from '../global.js';
import {
    RECEIVE_TYPES,
    cReceiveType,
    guiToggleReceiveType,
} from '../contacts-book.js';
import { Database } from '../database.js';
import { encrypt } from '../aes-gcm.js';

function addWallet(wallet) {
    const isImported = ref(wallet.isLoaded());
    const isViewOnly = ref(wallet.isViewOnly());
    const isSynced = ref(wallet.isSynced);
    const getKeyToBackup = async () => await wallet.getKeyToBackup();
    const getKeyToExport = () => wallet.getKeyToExport();
    const isEncrypted = ref(true);
    const hasShield = ref(wallet.hasShield());
    const getNewAddress = (nReceiving) => wallet.getNewAddress(nReceiving);
    const blockCount = ref(0);

    const updateWallet = async () => {
        isImported.value = wallet.isLoaded();
        isHardwareWallet.value = wallet.isHardwareWallet();
        isHD.value = wallet.isHD();
        isViewOnly.value = wallet.isViewOnly();
        isEncrypted.value = await hasEncryptedWallet();
        isSynced.value = wallet.isSynced;
    };
    const setMasterKey = async ({ mk, extsk }) => {
        await wallet.setMasterKey({ mk, extsk });
        await updateWallet();
    };
    watch(wallet, async () => {
        await updateWallet();
    });

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
    // @fail remvoe
    const checkDecryptPassword = async (passwd) =>
        await wallet.checkDecryptPassword(passwd);

    hasEncryptedWallet().then((r) => {
        isEncrypted.value = r;
    });

    // @fail remove
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
    const immatureColdBalance = ref(0);
    const currency = ref('USD');
    const price = ref(0.0);
    const sync = async () => {
        await wallet.sync();
        balance.value = wallet.balance;
        shieldBalance.value = await wallet.getShieldBalance();
        pendingShieldBalance.value = await wallet.getPendingShieldBalance();
        isSynced.value = wallet.isSynced;
    };
    wallet.onShieldLoadedFromDisk(() => {
        hasShield.value = wallet.hasShield();
    });
    const createAndSendTransaction = lockableFunction(
        async (network, address, value, opts) => {
            let tx;
            if (wallet.isHardwareWallet()) {
                const [changeAddress] = await guiGetNewAddress({
                    verify: true,
                    nReceiving: 0,
                });
                tx = wallet.createTransaction(address, value, {
                    ...opts,
                    changeAddress,
                });
                await LedgerController.getInstance().signTransaction(
                    wallet,
                    tx
                );
            } else {
                tx = wallet.createTransaction(address, value, opts);
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

    wallet.onBalanceUpdate(async () => {
        balance.value = wallet.balance;
        immatureBalance.value = wallet.immatureBalance;
        immatureColdBalance.value = wallet.immatureColdBalance;
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

    const onNewTx = (fun) => {
        return wallet.onNewTx(fun);
    };

    const onTransparentSyncStatusUpdate = (fun) => {
        return wallet.onTransparentSyncStatusUpdate(fun);
    };

    const onShieldSyncStatusUpdate = (fun) => {
        return wallet.onShieldSyncStatusUpdate(fun);
    };

    const onShieldTransactionCreationUpdate = (fun) => {
        return wallet.onShieldTransactionCreationUpdate(fun);
    };

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
        immatureColdBalance,
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
        onNewTx,
        onTransparentSyncStatusUpdate,
        onShieldSyncStatusUpdate,
        onShieldTransactionCreationUpdate,
    };
}

/**
 * @param{import('../vault.js').Vault} v
 */
function addVault(v) {
    const wallets = ref([]);

    return {
        wallets,
        canGenerateMore() {
            return v.canGenerateMore();
        },
        async addWallet(account, seed) {
            const w = await v.getWallet(account, seed);
            const wallet = reactive(addWallet(w));
            wallets.value = [...wallets.value, wallet];
            return wallet;
        },
        forgetWallet(account) {
            //TODO
        },
        async encrypt(password) {
            // @fail, needs to be more robust
            const database = await Database.getInstance();
            const secretToExport = v.getSecretToExport();
            if (!secretToExport)
                throw new Error("Can't encrypt a public vault");
            const encryptedSecret = await encrypt(secretToExport, password);
            if (!encryptedSecret) return false;
            await database.addVault({
                encryptedSecret,
                wallets: wallets.value.map((w) => w.getKeyToExport()),
                // @fail change
                isSeeded: true,
            });
            for (const wallet of wallets.value) {
                wallet.encrypt(password);
            }
        },
    };
}

export const useWallets = defineStore('wallets', () => {
    /**
     * @type{import('vue').Ref<import('../wallet.js').Wallet[]>}
     */
    const walletsArray = ref(
        wallets.map((w) => {
            return addWallet(w);
        })
    );

    const vaults = ref([]);

    /**
     * @type{import('vue').Ref<import('../wallet.js').Wallet>}
     */
    const activeWallet = ref(walletsArray.value[0]);
    const activeVault = ref(null);

    return {
        wallets: walletsArray,
        vaults: vaults,
        activeWallet: activeWallet,
        activeVault,
        addWallet: (w) => {
            throw new Error('No longer relevant');
            // TODO: check that wallet is not already added
            wallets.push(w);

            setWallet(w);
            const newWallet = reactive(addWallet(w));

            activeWallet.value = newWallet;
            walletsArray.value = [...walletsArray.value, newWallet];
        },
        addVault: async (v) => {
            const vault = addVault(v);
            rawVaults.push(v);

            vaults.value.push(vault);
            const wallet = await vault.addWallet(0);
            setWallet(await v.getWallet(0));
            console.log(await v.getWallet(0));
            activeWallet.value = wallet;
        },
        removeWallet: (w) => {
            const i = walletsArray.value.findIndex(
                (wallet) => wallet.getKeyToExport() === w.getKeyToExport()
            );
            if (i === -1) return false;
            walletsArray.value.splice(i, 1);
            return true;
        },
        selectWallet: async (w) => {
            let i;
            let j;
            for (i = 0; i < vaults.value.length; i++) {
                j = vaults.value[i].wallets.findIndex(
                    (wallet) => wallet.getKeyToExport() === w.getKeyToExport()
                );
                if (j !== -1) break;
            }

            if (i === -1 || j === -1)
                throw new Error('Selected invalid wallet');

            setWallet(await rawVaults[i].getWallet(j));
            activeWallet.value = vaults.value[i].wallets[j];
            activeVault.value = vaults.value[i];
        },
    };
});
