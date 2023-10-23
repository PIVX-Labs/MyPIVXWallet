import { parseWIF } from './encoding.js';
import { generateMnemonic, mnemonicToSeed, validateMnemonic } from 'bip39';
import {
    doms,
    beforeUnloadListener,
    activityDashboard,
    stakingDashboard,
} from './global.js';
import { getNetwork } from './network.js';
import { MAX_ACCOUNT_GAP } from './chain_params.js';
import {
    Transaction,
    HistoricalTx,
    HistoricalTxType,
    CTxOut,
} from './mempool.js';
import {
    LegacyMasterKey,
    HdMasterKey,
    HardwareWalletMasterKey,
} from './masterkey.js';
import { generateOrEncodePrivkey } from './encoding.js';
import {
    confirmPopup,
    createAlert,
    isXPub,
    isStandardAddress,
} from './misc.js';
import { cChainParams } from './chain_params.js';
import { COIN } from './chain_params.js';
import {
    refreshChainData,
    setDisplayForAllWalletOptions,
    getStakingBalance,
    mempool,
} from './global.js';
import { ALERTS, tr, translation } from './i18n.js';
import { encrypt, decrypt } from './aes-gcm.js';
import * as jdenticon from 'jdenticon';
import { Database } from './database.js';
import { guiRenderCurrentReceiveModal } from './contacts-book.js';
import { Account } from './accounts.js';
import { debug, fAdvancedMode } from './settings.js';
import { bytesToHex, hexToBytes } from './utils.js';
import { strHardwareName, getHardwareWalletKeys } from './ledger.js';
import { COutpoint, UTXO_WALLET_STATE } from './mempool.js';
import {
    isP2CS,
    isP2PKH,
    getAddressFromHash,
    COLD_START_INDEX,
    P2PK_START_INDEX,
    OWNER_START_INDEX,
} from './script.js';
import { getEventEmitter } from './event_bus.js';
export let fWalletLoaded = false;

/**
 * Class Wallet, at the moment it is just a "realization" of Masterkey with a given nAccount
 * it also remembers which addresses we generated.
 * in future PRs this class will manage balance, UTXOs, masternode etc...
 */
export class Wallet {
    /**
     * @type {import('./masterkey.js').MasterKey}
     */
    #masterKey;
    /**
     * @type {number}
     */
    #nAccount;
    /**
     * Number of loaded indexes, loaded means that they are in the ownAddresses map
     * @type {number}
     */
    #loadedIndexes = 0;
    /**
     * Highest index used, where used means that the corresponding address is on chain (for example in a tx)
     * @type {number}
     */
    #highestUsedIndex = 0;
    /**
     * @type {number}
     */
    #addressIndex = 0;
    /**
     * Map our own address -> Path
     * @type {Map<String, String?>}
     */
    #ownAddresses = new Map();
    /**
     * Map public key hash -> Address
     * @type {Map<String,String>}
     */
    #knownPKH = new Map();
    /**
     * True if this is the global wallet, false otherwise
     * @type {Boolean}
     */
    #isMainWallet;
    /**
     * Set of unique representations of Outpoints that keep track of locked utxos.
     * @type {Set<String>}
     */
    #lockedCoins;
    constructor(nAccount, isMainWallet) {
        this.#nAccount = nAccount;
        this.#isMainWallet = isMainWallet;
        this.#lockedCoins = new Set();
    }

    /**
     * Check whether a given outpoint is locked
     * @param {COutpoint} opt
     * @return {Boolean} true if opt is locked, false otherwise
     */
    isCoinLocked(opt) {
        return this.#lockedCoins.has(opt.toUnique());
    }

    /**
     * Lock a given Outpoint
     * @param {COutpoint} opt
     */
    lockCoin(opt) {
        this.#lockedCoins.add(opt.toUnique());
        mempool.setBalance();
    }

    /**
     * Unlock a given Outpoint
     * @param {COutpoint} opt
     */
    unlockCoin(opt) {
        this.#lockedCoins.delete(opt.toUnique());
    }

    getMasterKey() {
        return this.#masterKey;
    }

    /**
     * Gets the Cold Staking Address for the current wallet, while considering user settings and network automatically.
     * @return {Promise<String>} Cold Address
     */
    async getColdStakingAddress() {
        // Check if we have an Account with custom Cold Staking settings
        const cDB = await Database.getInstance();
        const cAccount = await cDB.getAccount();

        // If there's an account with a Cold Address, return it, otherwise return the default
        return (
            cAccount?.coldAddress ||
            cChainParams.current.defaultColdStakingAddress
        );
    }

    get nAccount() {
        return this.#nAccount;
    }

    wipePrivateData() {
        this.#masterKey.wipePrivateData(this.#nAccount);
    }

    isViewOnly() {
        if (!this.#masterKey) return false;
        return this.#masterKey.isViewOnly;
    }

    isHD() {
        if (!this.#masterKey) return false;
        return this.#masterKey.isHD;
    }

    async hasWalletUnlocked(fIncludeNetwork = false) {
        if (fIncludeNetwork && !getNetwork().enabled)
            return createAlert(
                'warning',
                ALERTS.WALLET_OFFLINE_AUTOMATIC,
                5500
            );
        if (!this.isLoaded()) {
            return createAlert(
                'warning',
                tr(ALERTS.WALLET_UNLOCK_IMPORT, [
                    {
                        unlock: (await hasEncryptedWallet())
                            ? 'unlock '
                            : 'import/create',
                    },
                ]),
                3500
            );
        } else {
            return true;
        }
    }

    /**
     * Set or replace the active Master Key with a new Master Key
     * @param {import('./masterkey.js').MasterKey} mk - The new Master Key to set active
     */
    async setMasterKey(mk) {
        this.#masterKey = mk;
        // If this is the global wallet update the network master key
        if (this.#isMainWallet) {
            getNetwork().setWallet(this);
        }
        this.loadAddresses();
    }

    /**
     * Reset the wallet, indexes address map and so on
     */
    reset() {
        this.#highestUsedIndex = 0;
        this.#loadedIndexes = 0;
        this.#ownAddresses = new Map();
    }

    /**
     * Derive the current address (by internal index)
     * @return {string} Address
     *
     */
    getCurrentAddress() {
        return this.getAddress(0, this.#addressIndex);
    }

    /**
     * Derive a generic address (given nReceiving and nIndex)
     * @return {string} Address
     */
    getAddress(nReceiving = 0, nIndex = 0) {
        const path = this.getDerivationPath(nReceiving, nIndex);
        return this.#masterKey.getAddress(path);
    }

    /**
     * Derive a generic address (given the full path)
     * @return {string} Address
     */
    getAddressFromPath(path) {
        return this.#masterKey.getAddress(path);
    }

    /**
     * Derive xpub (given nReceiving and nIndex)
     * @return {string} Address
     */
    getXPub(nReceiving = 0, nIndex = 0) {
        // Get our current wallet XPub
        const derivationPath = this.getDerivationPath(nReceiving, nIndex)
            .split('/')
            .slice(0, 4)
            .join('/');
        return this.#masterKey.getxpub(derivationPath);
    }

    /**
     * Derive xpub (given nReceiving and nIndex)
     * @return {bool} Return true if a masterKey has been loaded in the wallet
     */
    isLoaded() {
        return !!this.#masterKey;
    }

    async encryptWallet(strPassword = '') {
        // Encrypt the wallet WIF with AES-GCM and a user-chosen password - suitable for browser storage
        let strEncWIF = await encrypt(this.#masterKey.keyToBackup, strPassword);
        if (!strEncWIF) return false;

        // Hide the encryption warning
        doms.domGenKeyWarning.style.display = 'none';

        // Prepare to Add/Update an account in the DB
        const cAccount = new Account({
            publicKey: this.getKeyToExport(),
            encWif: strEncWIF,
        });

        // Incase of a "Change Password", we check if an Account already exists
        const database = await Database.getInstance();
        if (await database.getAccount()) {
            // Update the existing Account (new encWif) in the DB
            await database.updateAccount(cAccount);
        } else {
            // Add the new Account to the DB
            await database.addAccount(cAccount);
        }

        // Remove the exit blocker, we can annoy the user less knowing the key is safe in their database!
        removeEventListener('beforeunload', beforeUnloadListener, {
            capture: true,
        });
    }

    /**
     * @return [string, string] Address and its BIP32 derivation path
     */
    getNewAddress() {
        const last = this.#highestUsedIndex;
        this.#addressIndex =
            (this.#addressIndex > last ? this.#addressIndex : last) + 1;
        if (this.#addressIndex - last > MAX_ACCOUNT_GAP) {
            // If the user creates more than ${MAX_ACCOUNT_GAP} empty wallets we will not be able to sync them!
            this.#addressIndex = last;
        }
        const path = this.getDerivationPath(0, this.#addressIndex);
        const address = this.getAddress(0, this.#addressIndex);
        return [address, path];
    }

    isHardwareWallet() {
        return this.#masterKey?.isHardwareWallet === true;
    }

    /**
     * Check if the vout is owned and in case update highestUsedIdex
     * @param {CTxOut} vout
     */
    updateHighestUsedIndex(vout) {
        const dataBytes = hexToBytes(vout.script);
        const iStart = isP2PKH(dataBytes) ? P2PK_START_INDEX : COLD_START_INDEX;
        const address = this.getAddressFromHashCache(
            bytesToHex(dataBytes.slice(iStart, iStart + 20)),
            false
        );
        const path = this.isOwnAddress(address);
        if (path) {
            this.#highestUsedIndex = Math.max(
                parseInt(path.split('/')[5]),
                this.#highestUsedIndex
            );
            if (
                this.#highestUsedIndex + MAX_ACCOUNT_GAP >=
                this.#loadedIndexes
            ) {
                this.loadAddresses();
            }
        }
    }

    /**
     * Load MAX_ACCOUNT_GAP inside #ownAddresses map.
     */
    loadAddresses() {
        if (this.isHD()) {
            for (
                let i = this.#loadedIndexes;
                i <= this.#loadedIndexes + MAX_ACCOUNT_GAP;
                i++
            ) {
                const path = this.getDerivationPath(0, i);
                const address = this.#masterKey.getAddress(path);
                this.#ownAddresses.set(address, path);
            }
            this.#loadedIndexes += MAX_ACCOUNT_GAP;
        } else {
            this.#ownAddresses.set(this.getKeyToExport(), ':)');
        }
    }

    /**
     * @param {string} address - address to check
     * @return {string?} BIP32 path or null if it's not your address
     */
    isOwnAddress(address) {
        return this.#ownAddresses.get(address) ?? null;
    }

    /**
     * @return {String} BIP32 path or null if it's not your address
     */
    getDerivationPath(nReceiving = 0, nIndex = 0) {
        return this.#masterKey.getDerivationPath(
            this.#nAccount,
            nReceiving,
            nIndex
        );
    }

    getKeyToExport() {
        return this.#masterKey?.getKeyToExport(this.#nAccount);
    }

    //Get path from a script
    getPath(script) {
        const dataBytes = hexToBytes(script);
        // At the moment we support only P2PKH and P2CS
        const iStart = isP2PKH(dataBytes) ? P2PK_START_INDEX : COLD_START_INDEX;
        const address = this.getAddressFromHashCache(
            bytesToHex(dataBytes.slice(iStart, iStart + 20)),
            false
        );
        return this.isOwnAddress(address);
    }

    /**
     * Get addresses from a script
     * @returns {{ type: 'p2pkh'|'p2cs'|'unknown', addresses: string[] }}
     */
    #getAddressesFromScript(script) {
        const dataBytes = hexToBytes(script);
        if (isP2PKH(dataBytes)) {
            const address = this.getAddressFromHashCache(
                bytesToHex(
                    dataBytes.slice(P2PK_START_INDEX, P2PK_START_INDEX + 20)
                ),
                false
            );
            return {
                type: 'p2pkh',
                addresses: [address],
            };
        } else if (isP2CS(dataBytes)) {
            const addresses = [];
            for (let i = 0; i < 2; i++) {
                const iStart = i == 0 ? OWNER_START_INDEX : COLD_START_INDEX;
                addresses.push(
                    this.getAddressFromHashCache(
                        bytesToHex(dataBytes.slice(iStart, iStart + 20)),
                        iStart === OWNER_START_INDEX
                    )
                );
            }
            return { type: 'p2cs', addresses };
        } else {
            return { type: 'unknown', addresses: [] };
        }
    }

    isMyVout(script) {
        const { type, addresses } = this.#getAddressesFromScript(script);
        const index = addresses.findIndex((s) => this.isOwnAddress(s));
        if (index === -1) return UTXO_WALLET_STATE.NOT_MINE;
        if (type === 'p2pkh') return UTXO_WALLET_STATE.SPENDABLE;
        if (type === 'p2cs') {
            return index === 0
                ? UTXO_WALLET_STATE.COLD_RECEIVED
                : UTXO_WALLET_STATE.SPENDABLE_COLD;
        }
    }
    // Avoid calculating over and over the same getAddressFromHash by saving the result in a map
    getAddressFromHashCache(pkh_hex, isColdStake) {
        if (!this.#knownPKH.has(pkh_hex)) {
            this.#knownPKH.set(
                pkh_hex,
                getAddressFromHash(hexToBytes(pkh_hex), isColdStake)
            );
        }
        return this.#knownPKH.get(pkh_hex);
    }

    /**
     * Get the debit of a transaction in satoshi
     * @param {Transaction} tx
     */
    getDebit(tx) {
        let debit = 0;
        for (const vin of tx.vin) {
            if (mempool.txmap.has(vin.outpoint.txid)) {
                const spentVout = mempool.txmap.get(vin.outpoint.txid).vout[
                    vin.outpoint.n
                ];
                if (
                    (this.isMyVout(spentVout.script) &
                        UTXO_WALLET_STATE.SPENDABLE_TOTAL) !=
                    0
                ) {
                    debit += spentVout.value;
                }
            }
        }
        return debit;
    }

    /**
     * Get the credit of a transaction in satoshi
     * @param {Transaction} tx
     */
    getCredit(tx, filter) {
        let credit = 0;
        for (const vout of tx.vout) {
            if ((this.isMyVout(vout.script) & filter) != 0) {
                credit += vout.value;
            }
        }
        return credit;
    }

    /**
     * Return true if the transaction contains undelegations regarding the given wallet
     * @param {Transaction} tx
     */
    checkForUndelegations(tx) {
        for (const vin of tx.vin) {
            if (mempool.txmap.has(vin.outpoint.txid)) {
                const spentVout = mempool.txmap.get(vin.outpoint.txid).vout[
                    vin.outpoint.n
                ];
                if (
                    (this.isMyVout(spentVout.script) &
                        UTXO_WALLET_STATE.SPENDABLE_COLD) !=
                    0
                ) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Return true if the transaction contains delegations regarding the given wallet
     * @param {Transaction} tx
     */
    checkForDelegations(tx) {
        for (const vout of tx.vout) {
            if (
                (this.isMyVout(vout.script) &
                    UTXO_WALLET_STATE.SPENDABLE_COLD) !=
                0
            ) {
                return true;
            }
        }
        return false;
    }

    /**
     * Return the output addresses for a given transaction
     * @param {Transaction} tx
     */
    getOutAddress(tx) {
        return tx.vout.reduce(
            (acc, vout) => [
                ...acc,
                ...this.#getAddressesFromScript(vout.script).addresses,
            ],
            []
        );
    }

    /**
     * Convert a list of Blockbook transactions to HistoricalTxs
     * @param {Array<Transaction>} arrTXs - An array of the Blockbook TXs
     * @returns {Promise<Array<HistoricalTx>>} - A new array of `HistoricalTx`-formatted transactions
     */
    // TODO: add shield data to txs
    toHistoricalTXs(arrTXs) {
        let histTXs = [];
        for (const tx of arrTXs) {
            // The total 'delta' or change in balance, from the Tx's sums
            let nAmount =
                (this.getCredit(tx, UTXO_WALLET_STATE.SPENDABLE_TOTAL) -
                    this.getDebit(tx)) /
                COIN;

            // The receiver addresses, if any
            let arrReceivers = this.getOutAddress(tx);

            // Figure out the type, based on the Tx's properties
            let type = HistoricalTxType.UNKNOWN;
            if (tx.isCoinStake()) {
                type = HistoricalTxType.STAKE;
            } else if (this.checkForUndelegations(tx)) {
                type = HistoricalTxType.UNDELEGATION;
            } else if (this.checkForDelegations(tx)) {
                type = HistoricalTxType.DELEGATION;
                arrReceivers = arrReceivers.filter((addr) => {
                    return addr[0] === cChainParams.current.STAKING_PREFIX;
                });
                nAmount =
                    this.getCredit(tx, UTXO_WALLET_STATE.SPENDABLE_COLD) / COIN;
            } else if (nAmount > 0) {
                type = HistoricalTxType.RECEIVED;
            } else if (nAmount < 0) {
                type = HistoricalTxType.SENT;
            }

            histTXs.push(
                new HistoricalTx(
                    type,
                    tx.txid,
                    arrReceivers,
                    false,
                    tx.blockTime,
                    tx.blockHeight,
                    Math.abs(nAmount)
                )
            );
        }
        return histTXs;
    }
}

/**
 * @type{Wallet}
 */
export const wallet = new Wallet(0, true); // For now we are using only the 0-th account, (TODO: update once account system is done)

/**
 * Import a wallet (with it's private, public or encrypted data)
 * @param {object} options
 * @param {string | Array<number>} options.newWif - The import data (if omitted, the UI input is accessed)
 * @param {boolean} options.fRaw - Whether the import data is raw bytes or encoded (WIF, xpriv, seed)
 * @param {boolean} options.isHardwareWallet - Whether the import is from a Hardware wallet or not
 * @param {boolean} options.fSavePublicKey - Whether to save the derived public key to disk (for View Only mode)
 * @param {boolean} options.fStartup - Whether the import is at Startup or at Runtime
 * @returns {Promise<void>}
 */
export async function importWallet({
    newWif = false,
    fRaw = false,
    isHardwareWallet = false,
    fSavePublicKey = false,
    fStartup = false,
} = {}) {
    // TODO: remove `walletConfirm`, it is useless as Accounts cannot be overriden, and multi-accounts will come soon anyway
    // ... just didn't want to add a huge whitespace change from removing the `if (walletConfirm) {` line
    const walletConfirm = true;
    if (walletConfirm) {
        if (isHardwareWallet) {
            // Firefox does NOT support WebUSB, thus cannot work with Hardware wallets out-of-the-box
            if (navigator.userAgent.includes('Firefox')) {
                return createAlert(
                    'warning',
                    ALERTS.WALLET_FIREFOX_UNSUPPORTED,
                    7500
                );
            }
            // Derive our hardware address and import!
            try {
                const key = await HardwareWalletMasterKey.create(0);
                await wallet.setMasterKey(key);
            } catch (e) {
                // Display a properly translated error if it's a ledger error
                if (
                    e instanceof Error &&
                    e.message === 'Failed to get hardware wallet keys.'
                ) {
                    // console.error so we get a backtrace if needed
                    console.error(e);
                    return createAlert(
                        'warning',
                        translation.FAILED_TO_IMPORT_HARDWARE,
                        5000
                    );
                } else {
                    throw e;
                }
            }

            createAlert(
                'info',
                tr(ALERTS.WALLET_HARDWARE_WALLET, [
                    { hardwareWallet: strHardwareName },
                ]),
                12500
            );
        } else {
            // If raw bytes: purely encode the given bytes rather than generating our own bytes
            if (fRaw) {
                newWif = generateOrEncodePrivkey(newWif).strWIF;

                // A raw import likely means non-user owned key (i.e: created via VanityGen), thus, we assume safety first and add an exit blocking listener
                addEventListener('beforeunload', beforeUnloadListener, {
                    capture: true,
                });
            }

            // Select WIF from internal source OR user input (could be: WIF, Mnemonic or xpriv)
            const privateImportValue = newWif || doms.domPrivKey.value;
            const passphrase = doms.domPrivKeyPassword.value;
            doms.domPrivKey.value = '';
            doms.domPrivKeyPassword.value = '';

            // Clean and verify the Seed Phrase (if one exists)
            const cPhraseValidator = await cleanAndVerifySeedPhrase(
                privateImportValue,
                true
            );

            // If Debugging is enabled, show what the validator returned
            if (debug) {
                const fnLog = cPhraseValidator.ok ? console.log : console.warn;
                fnLog('Seed Import Validator: ' + cPhraseValidator.msg);
            }

            // If the Seed is OK, proceed
            if (cPhraseValidator.ok) {
                // Generate our HD MasterKey with the cleaned (Mnemonic) Seed Phrase
                const seed = await mnemonicToSeed(
                    cPhraseValidator.phrase,
                    passphrase
                );
                await wallet.setMasterKey(new HdMasterKey({ seed }));
            } else if (cPhraseValidator.phrase.includes(' ')) {
                // The Phrase Validator failed, but the input contains at least one space; possibly a Seed Typo?
                return createAlert('warning', cPhraseValidator.msg, 5000);
            } else {
                // The input definitely isn't a seed, so we'll try every other import method
                try {
                    // XPub import (HD view only)
                    if (isXPub(privateImportValue)) {
                        await wallet.setMasterKey(
                            new HdMasterKey({
                                xpub: privateImportValue,
                            })
                        );
                        // XPrv import (HD full access)
                    } else if (privateImportValue.startsWith('xprv')) {
                        await wallet.setMasterKey(
                            new HdMasterKey({
                                xpriv: privateImportValue,
                            })
                        );
                        // Pubkey import (non-HD view only)
                    } else if (isStandardAddress(privateImportValue)) {
                        await wallet.setMasterKey(
                            new LegacyMasterKey({
                                address: privateImportValue,
                            })
                        );
                        // WIF import (non-HD full access)
                    } else {
                        // Attempt to import a raw WIF private key
                        const pkBytes = parseWIF(privateImportValue);
                        await wallet.setMasterKey(
                            new LegacyMasterKey({ pkBytes })
                        );
                    }
                } catch (e) {
                    return createAlert(
                        'warning',
                        ALERTS.FAILED_TO_IMPORT + '<br>' + e.message,
                        6000
                    );
                }
            }
        }

        // Lock the masternode, if any
        const masternode = await (await Database.getInstance()).getMasternode();
        if (masternode) {
            wallet.lockCoin(
                new COutpoint({
                    txid: masternode.collateralTxId,
                    n: masternode.outidx,
                })
            );
        }
        // Reaching here: the deserialisation was a full cryptographic success, so a wallet is now imported!
        fWalletLoaded = true;

        // Hide wipe wallet button if there is no private key
        if (wallet.isViewOnly() || wallet.isHardwareWallet()) {
            doms.domWipeWallet.hidden = true;
            if (await hasEncryptedWallet()) {
                doms.domRestoreWallet.hidden = false;
            }
        }

        // For non-HD wallets: hide the 'new address' button, since these are essentially single-address MPW wallets

        // Update the loaded address in the Dashboard
        getNewAddress({ updateGUI: true });

        // Display Text
        doms.domGuiWallet.style.display = 'block';
        doms.domDashboard.click();

        // Update identicon
        doms.domIdenticon.dataset.jdenticonValue = wallet.getAddress();
        jdenticon.update('#identicon');

        // Hide the encryption prompt if the user is using
        // a hardware wallet, or is view-only mode.
        if (!(isHardwareWallet || wallet.isViewOnly())) {
            if (
                // If the wallet was internally imported (not UI pasted), like via vanity, display the encryption prompt
                (((fRaw && newWif.length) || newWif) &&
                    !(await hasEncryptedWallet())) ||
                // If the wallet was pasted and is an unencrypted key, then display the encryption prompt
                !(await hasEncryptedWallet())
            ) {
                doms.domGenKeyWarning.style.display = 'block';
            } else if (await hasEncryptedWallet()) {
                // If the wallet was pasted and is an encrypted import, display the lock wallet UI
                doms.domWipeWallet.hidden = false;
            }
        } else {
            // Hide the encryption UI
            doms.domGenKeyWarning.style.display = 'none';
        }

        // Hide all wallet starter options
        setDisplayForAllWalletOptions('none');
        getEventEmitter().emit('wallet-import');

        getEventEmitter().emit('sync-status', 'start');
        if (!(await mempool.loadFromDisk()) && getNetwork().enabled) {
            createAlert('info', translation.syncStatusStarting, 12500);
            await getNetwork().walletFullSync();
        }
        await activityDashboard.update(50);
        await stakingDashboard.update(50);
        getEventEmitter().emit('sync-status', 'stop');

        if (getNetwork().enabled && !fStartup) {
            refreshChainData();
        }
    }
}

// Wallet Generation
export async function generateWallet(noUI = false) {
    // TODO: remove `walletConfirm`, it is useless as Accounts cannot be overriden, and multi-accounts will come soon anyway
    // ... just didn't want to add a huge whitespace change from removing the `if (walletConfirm) {` line
    const walletConfirm = true;
    if (walletConfirm) {
        const mnemonic = generateMnemonic();

        const passphrase = !noUI
            ? await informUserOfMnemonic(mnemonic)
            : undefined;
        const seed = await mnemonicToSeed(mnemonic, passphrase);

        // Prompt the user to encrypt the seed
        await wallet.setMasterKey(new HdMasterKey({ seed }));
        fWalletLoaded = true;

        doms.domGenKeyWarning.style.display = 'block';
        // Add a listener to block page unloads until we are sure the user has saved their keys, safety first!
        addEventListener('beforeunload', beforeUnloadListener, {
            capture: true,
        });

        // Display the dashboard
        doms.domGuiWallet.style.display = 'block';
        setDisplayForAllWalletOptions('none');

        // Update identicon
        doms.domIdenticon.dataset.jdenticonValue = wallet.getAddress();
        jdenticon.update('#identicon');

        await getNewAddress({ updateGUI: true });

        // Refresh the balance UI (why? because it'll also display any 'get some funds!' alerts)
        getStakingBalance(true);

        // Wallet has just been generated: set the network status as full synced
        getNetwork().fullSynced = true;
    }

    return wallet;
}

/**
 * Clean a Seed Phrase string and verify it's integrity
 *
 * This returns an object of the validation status and the cleaned Seed Phrase for safe low-level usage.
 * @param {String} strPhraseInput - The Seed Phrase string
 * @param {Boolean} fPopupConfirm - Allow a warning bypass popup if the Seed Phrase is unusual
 */
export async function cleanAndVerifySeedPhrase(
    strPhraseInput = '',
    fPopupConfirm = true
) {
    // Clean the phrase (removing unnecessary spaces) and force to lowercase
    const strPhrase = strPhraseInput.trim().replace(/\s+/g, ' ').toLowerCase();

    // Count the Words
    const nWordCount = strPhrase.trim().split(' ').length;

    // Ensure it's a word count that makes sense
    if (nWordCount === 12 || nWordCount === 24) {
        if (!validateMnemonic(strPhrase)) {
            // If a popup is allowed and Advanced Mode is enabled, warn the user that the
            // ... seed phrase is potentially bad, and ask for confirmation to proceed
            if (!fPopupConfirm || !fAdvancedMode)
                return {
                    ok: false,
                    msg: translation.importSeedErrorTypo,
                    phrase: strPhrase,
                };

            // The reason we want to ask the user for confirmation is that the mnemonic
            // could have been generated with another app that has a different dictionary
            const fSkipWarning = await confirmPopup({
                title: translation.popupSeedPhraseBad,
                html: translation.popupSeedPhraseBadNote,
            });

            if (fSkipWarning) {
                // User is probably an Arch Linux user and used `-f`
                return {
                    ok: true,
                    msg: translation.importSeedErrorSkip,
                    phrase: strPhrase,
                };
            } else {
                // User heeded the warning and rejected the phrase
                return {
                    ok: false,
                    msg: translation.importSeedError,
                    phrase: strPhrase,
                };
            }
        } else {
            // Valid count and mnemonic
            return {
                ok: true,
                msg: translation.importSeedValid,
                phrase: strPhrase,
            };
        }
    } else {
        // Invalid count
        return {
            ok: false,
            msg: translation.importSeedErrorSize,
            phrase: strPhrase,
        };
    }
}

/**
 * Display a Seed Phrase popup to the user and optionally wait for a Seed Passphrase
 * @param {string} mnemonic - The Seed Phrase to display to the user
 * @returns {Promise<string>} - The Mnemonic Passphrase (empty string if omitted by user)
 */
function informUserOfMnemonic(mnemonic) {
    return new Promise((res, _) => {
        // Configure the modal
        $('#mnemonicModal').modal({ keyboard: false });

        // Render the Seed Phrase and configure the button
        doms.domMnemonicModalContent.innerText = mnemonic;
        doms.domMnemonicModalButton.onclick = () => {
            res(doms.domMnemonicModalPassphrase.value);
            $('#mnemonicModal').modal('hide');

            // Wipe the mnemonic displays of sensitive data
            doms.domMnemonicModalContent.innerText = '';
            doms.domMnemonicModalPassphrase.value = '';
        };

        // Display the modal
        $('#mnemonicModal').modal('show');
    });
}

export async function decryptWallet(strPassword = '') {
    // Check if there's any encrypted WIF available
    const database = await Database.getInstance();
    const { encWif: strEncWIF } = await database.getAccount();
    if (!strEncWIF || strEncWIF.length < 1) return false;

    // Prompt to decrypt it via password
    const strDecWIF = await decrypt(strEncWIF, strPassword);
    if (!strDecWIF || strDecWIF === 'decryption failed!') {
        if (strDecWIF)
            return createAlert('warning', ALERTS.INCORRECT_PASSWORD, 6000);
    } else {
        await importWallet({
            newWif: strDecWIF,
            // Save the public key to disk for View Only mode
            fSavePublicKey: true,
        });
        return true;
    }
}

/**
 * @returns {Promise<bool>} If the wallet has an encrypted database backup
 */
export async function hasEncryptedWallet() {
    const database = await Database.getInstance();
    const account = await database.getAccount();
    return !!account?.encWif;
}

export async function getNewAddress({
    updateGUI = false,
    verify = false,
} = {}) {
    const [address, path] = wallet.getNewAddress();
    if (verify && wallet.isHardwareWallet()) {
        // Generate address to present to the user without asking to verify
        const confAddress = await confirmPopup({
            title: ALERTS.CONFIRM_POPUP_VERIFY_ADDR,
            html: createAddressConfirmation(address),
            resolvePromise: wallet.getMasterKey().verifyAddress(path),
        });
        console.log(address, confAddress);
        if (address !== confAddress) {
            throw new Error('User did not verify address');
        }
    }

    // If we're generating a new address manually, then render the new address in our Receive Modal
    if (updateGUI) {
        guiRenderCurrentReceiveModal();
    }

    return [address, path];
}

function createAddressConfirmation(address) {
    return `${translation.popupHardwareAddrCheck} ${strHardwareName}.
              <div class="seed-phrase">${address}</div>`;
}
