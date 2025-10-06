import { getEventEmitter } from '../event_bus.js';
import {
    getNewAddress as guiGetNewAddress,
    wallets,
    setWallet,
    vaults as rawVaults,
    Wallet,
} from '../wallet.js';
import { ref, computed, watch, reactive } from 'vue';
import { fPublicMode, strCurrency } from '../settings.js';
import { cOracle } from '../prices.js';
import { LedgerController } from '../ledger.js';
import { defineStore } from 'pinia';
import { lockableFunction } from '../lock.js';
import { blockCount as rawBlockCount } from '../global.js';
import {
    RECEIVE_TYPES,
    cReceiveType,
    guiToggleReceiveType,
} from '../contacts-book.js';
import { Database } from '../database.js';
import { decrypt, encrypt, buff_to_base64, base64_to_buf } from '../aes-gcm.js';
import { usePrivacy } from './use_privacy.js';
import { ParsedSecret } from '../parsed_secret.js';

function addWallet(wallet) {
    const privacy = usePrivacy();
    const isImported = ref(wallet.isLoaded());
    const isViewOnly = ref(wallet.isViewOnly());
    const isSynced = ref(wallet.isSynced);
    const getKeyToBackup = async () => await wallet.getKeyToBackup();
    const getKeyToExport = () => wallet.getKeyToExport();
    const hasShield = ref(wallet.hasShield());
    const getNewAddress = (nReceiving) => wallet.getNewAddress(nReceiving);
    const blockCount = ref(0);

    const updateWallet = async () => {
        isImported.value = wallet.isLoaded();
        isHardwareWallet.value = wallet.isHardwareWallet();
        isHD.value = wallet.isHD();
        isViewOnly.value = wallet.isViewOnly();
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

    // Public/Private Mode will be loaded from disk after 'import-wallet' is emitted
    const publicMode = computed({
        get() {
            // If the wallet is not shield capable, always return true
            if (!hasShield.value) return true;
            return privacy.publicMode;
        },

        set(newValue) {
            privacy.publicMode = newValue;
            const p = publicMode.value;
            // Depending on our Receive type, flip to the opposite type.
            // i.e: from `address` to `shield`, `shield contact` to `address`, etc
            // This reduces steps for someone trying to grab their opposite-type address, which is the primary reason to mode-toggle.
            const arrFlipTypes = [
                RECEIVE_TYPES.CONTACT,
                RECEIVE_TYPES.ADDRESS,
                RECEIVE_TYPES.SHIELD,
            ];
            if (arrFlipTypes.includes(cReceiveType) && isImported.value) {
                guiToggleReceiveType(
                    p ? RECEIVE_TYPES.ADDRESS : RECEIVE_TYPES.SHIELD
                );
            }
        },
    });

    const isCreatingTransaction = () => createAndSendTransaction.isLocked();
    const getMasternodeUTXOs = () => wallet.getMasternodeUTXOs();
    const getPath = (script) => wallet.getPath(script);
    const lockCoin = (out) => wallet.lockCoin(out);
    const unlockCoin = (out) => wallet.unlockCoin(out);

    const historicalTxs = ref([]);

    getEventEmitter().on('sync-status', (status) => {
        if (status === 'stop') {
            historicalTxs.value = wallet.getHistoricalTxs();
        }
    });
    wallet.onNewTx(() => {
        historicalTxs.value = [...wallet.getHistoricalTxs()];
    });
    getEventEmitter().on('toggle-network', async () => {
        blockCount.value = rawBlockCount;
    });

    getEventEmitter().on('wallet-import', async () => {
        publicMode.value = fPublicMode;
        historicalTxs.value = [];
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
        isSynced,
        getKeyToBackup,
        getKeyToExport,
        setMasterKey,
        setExtsk,
        setShield,
        isHardwareWallet,
        getNewAddress,
        getNewChangeAddress,
        wipePrivateData: () => {
            wallet.wipePrivateData();
            isViewOnly.value = wallet.isViewOnly();
        },
        save: (encWif) => wallet.save(encWif),
        isOwnAddress: () => wallet.isOwnAddress(),
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
        loadSeed: async (seed) => {
            await wallet.loadSeed(seed);
            await updateWallet();
        },
        historicalTxs,
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

    const isSeeded = ref(v.isSeeded());
    const isEncrypted = ref(false);
    (async () => {
        const database = await Database.getInstance();
        isEncrypted.value = !!(await database.getVault(
            v.getDefaultKeyToExport()
        ));
    })();

    const isViewOnly = ref(v.isViewOnly());
    const defaultKeyToExport = ref(v.getDefaultKeyToExport());
    const label = ref(v.label);
    const checkDecryptPassword = async (password) => {
        const db = await Database.getInstance();
        const { encryptedSecret } = await db.getVault(
            v.getDefaultKeyToExport()
        );
        return !!(await decrypt(encryptedSecret, password));
    };
    const canGenerateMore = ref(v.canGenerateMore());
    (async () => {
        const database = await Database.getInstance();
        const encryptedSecret = (
            await database.getVault(v.getDefaultKeyToExport())
        )?.encryptedSecret;
        canGenerateMore.value = v.canGenerateMore() || !!encryptedSecret;
    })();
    const wipePrivateData = () => {
        v.wipePrivateData();
        for (const wallet of wallets.value) {
            wallet.wipePrivateData();
        }
        isViewOnly.value = true;
    };

    return {
        wallets,
        defaultKeyToExport,
        label,
        canGenerateMore,
        wipePrivateData,
        async addWallet(account, seed) {
            const w = await v.getWallet(account, seed);
            const wallet = reactive(addWallet(w));
            wallets.value = [...wallets.value, wallet];
            wallet.sync().then(() => {});
            const database = await Database.getInstance();
            await database.addXpubToVault(
                v.getDefaultKeyToExport(),
                wallet.getKeyToExport()
            );
            await wallet.save();
            return wallet;
        },
        async save({ encryptedSecret, encWif, isHardware = false }) {
            const database = await Database.getInstance();

            await database.addVault({
                encryptedSecret,
                isHardware,
                defaultKeyToExport: v.getDefaultKeyToExport(),
                wallets: wallets.value.map((w) => w.getKeyToExport()),
                isSeeded: v.isSeeded(),
                label: v.label,
            });
            for (const wallet of wallets.value) {
                await wallet.save(encWif);
            }
            isEncrypted.value = true;
            isSeeded.value = v.isSeeded();
            if (encryptedSecret) canGenerateMore.value = true;
        },
        async encrypt(password) {
            const secretToExport = v.getSecretToExport();
            if (!secretToExport)
                throw new Error("Can't encrypt a public vault");
            if (typeof secretToExport === 'string') {
                // If this is not a seeded vault, save without seed
                await this.save({
                    encryptedSecret: null,
                    encWif: await encrypt(secretToExport, password),
                });
                return;
            }
            const encryptedSecret = await encrypt(
                buff_to_base64(secretToExport),
                password
            );
            if (!encryptedSecret) return false;
            await this.save({ encryptedSecret });
        },
        async decrypt(password) {
            const database = await Database.getInstance();
            const { encryptedSecret } = await database.getVault(
                v.getDefaultKeyToExport()
            );
            if (encryptedSecret) {
                const encSeed = await decrypt(encryptedSecret, password);
                if (!encSeed) return false;

                const seed = base64_to_buf(encSeed);
                v.setSeed(seed);

                isSeeded.value = v.isSeeded();
                for (const wallet of wallets.value) {
                    await wallet.loadSeed(seed);
                }
                isViewOnly.value = v.isViewOnly();
                return true;
            } else {
                for (const wallet of wallets.value) {
                    const { encWif, encExtsk } = await database.getAccount(
                        wallet.getKeyToExport()
                    );
                    const wif = await decrypt(encWif, password);
                    if (!wif) return false;
                    const extsk = encExtsk
                        ? await decrypt(encExtsk, password)
                        : null;
                    const secret = await ParsedSecret.parse(wif);
                    await wallet.setMasterKey({
                        mk: secret.masterKey,
                        extsk: extsk || secret?.shield?.extsk,
                    });
                    isViewOnly.value = v.isViewOnly();
                    return true;
                }
            }
        },
        isViewOnly,
        isEncrypted,
        isSeeded,
        checkDecryptPassword,
        isHardware: computed(() => wallets.value[0]?.isHardwareWallet ?? false),
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
    /**
     * @type{import('vue').Ref<Vault>}
     */
    const activeVault = ref(null);

    const selectWallet = async (w) => {
        let i;
        let j = -1;
        for (i = 0; i < vaults.value.length; i++) {
            j = vaults.value[i].wallets.findIndex(
                (wallet) => wallet.getKeyToExport() === w.getKeyToExport()
            );
            if (j !== -1) break;
        }

        if (i === -1 || j === -1) {
            const emptyWallet = new Wallet({ nAccount: 0 });
            setWallet(emptyWallet);
            activeVault.value = null;
            activeWallet.value = addWallet(emptyWallet);
            return;
        }

        setWallet(await rawVaults[i].getWallet(j));
        activeWallet.value = vaults.value[i].wallets[j];
        activeVault.value = vaults.value[i];
    };

    return {
        vaults: vaults,
        activeWallet: activeWallet,
        activeVault,
        addVault: async (v) => {
            const vault = addVault(v);
            rawVaults.push(v);
            const i = vaults.value.findIndex(
                (other) =>
                    other.defaultKeyToExport === v.getDefaultKeyToExport()
            );
            if (i !== -1) {
                // Replace old vault, so we can seed unseeded vaults
                vaults.value[i] = vault;
            } else {
                vaults.value.push(vault);
            }
            for (let i = 0; i < v.getWallets().length; i++) {
                const wallet = await vault.addWallet(i);
                setWallet(await v.getWallet(i));
                activeWallet.value = wallet;
            }
            activeVault.value = vault;
            return vault;
        },
        removeVault: async (v) => {
            const database = await Database.getInstance();
            await database.removeVault(v.defaultKeyToExport);
            for (const wallet of v.wallets) {
                await database.removeAccount({
                    publicKey: wallet.getKeyToExport(),
                });
            }
            vaults.value = vaults.value.filter(
                (vault) => vault.defaultKeyToExport !== v.defaultKeyToExport
            );
            if (activeVault.value.defaultKeyToExport === v.defaultKeyToExport) {
                selectWallet(vaults.value[0]?.wallets[0] || null);
            }
        },
        selectWallet,
    };
});
