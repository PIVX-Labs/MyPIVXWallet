import { openDB } from 'idb';
import Masternode from './masternode.js';
import { Settings } from './settings.js';
import { cChainParams } from './chain_params.js';
import { isSameType, isEmpty } from './misc.js';
import { createAlert } from './alerts/alert.js';
import { PromoWallet } from './promos.js';
import { Account } from './accounts.js';
import { COutpoint, CTxIn, CTxOut, Transaction } from './transaction.js';
import { debugError, debugLog, DebugTopics } from './debug.js';

export class Database {
    /**
     * The current version of the DB - increasing this will prompt the Upgrade process for clients with an older version
     * Version 1 = Add index DB (#121)
     * Version 2 = Promos Integration (#124)
     * Version 3 = TX Database (#235)
     * Version 4 = Tx Refactor (#284)
     * Version 5 = Tx shield data (#295)
     * Version 6 = Filter unconfirmed txs (#415)
     * Version 7 = Store shield params in indexed db (#511)
     * Version 8 = Multi MNs (#517)
     * Version 9 = Store shield syncing data in indexed db (#543)
     * @type {number}
     */
    static version = 9;

    /**
     * @type{import('idb').IDBPDatabase}
     */
    #db;

    constructor({ db }) {
        this.#db = db;
    }

    close() {
        this.#db.close();
        this.#db = null;
    }

    /**
     * Add masternode to the database
     * @param {Masternode} masternode
     */
    async addMasternode(masternode) {
        const store = this.#db
            .transaction('masternodes', 'readwrite')
            .objectStore('masternodes');
        await store.put(masternode);
    }
    /**
     * Removes a masternode
     * @param {Masternode} mn - Masternode to delete
     */
    async removeMasternode(mn) {
        const store = this.#db
            .transaction('masternodes', 'readwrite')
            .objectStore('masternodes');
        await store.delete(mn.mnPrivateKey);
    }

    /**
     * Store a tx inside the database
     * @param {Transaction} tx
     */
    async storeTx(tx) {
        if (!tx) throw new Error('Cannot store undefined');
        const store = this.#db
            .transaction('txs', 'readwrite')
            .objectStore('txs');
        await store.put(tx.__original, tx.txid);
    }

    /**
     * Remove a tx from the database
     * @param {String} txid - transaction id
     */
    async removeTx(txid) {
        const store = this.#db
            .transaction('txs', 'readwrite')
            .objectStore('txs');
        await store.delete(txid);
    }

    /**
     * Add Promo Code to the database for tracking and management
     * @param {PromoWallet} promo
     */
    async addPromo(promo) {
        const store = this.#db
            .transaction('promos', 'readwrite')
            .objectStore('promos');
        // The plaintext code is our key, since codes are unique and deterministic anyway
        await store.put(promo, promo.code);
    }
    /**
     * Removes a Promo Code from the Promo management system
     * @param {string} promoCode - the promo code to remove
     */
    async removePromo(promoCode) {
        const store = this.#db
            .transaction('promos', 'readwrite')
            .objectStore('promos');
        await store.delete(promoCode);
    }

    /**
     * Adds an account to the database
     *
     * This will also apply missing Account keys from the Account class automatically, and check high-level type safety.
     * @param {Account} account - The Account to add
     */
    async addAccount(account) {
        // Critical: Ensure the input is an Account instance
        if (!(account instanceof Account)) {
            debugError(
                '---- addAccount() called with invalid input, input dump below ----'
            );
            debugError(DebugTopics.DATABASE, account);
            debugError(DebugTopics.DATABASE, '---- end of account dump ----');
            createAlert(
                'warning',
                '<b>Account Creation Error</b><br>Logs were dumped in your Browser Console<br>Please submit these privately to PIVX Labs Developers!'
            );
            throw new Error(
                'addAccount was called with with an invalid account'
            );
        }

        // Create an empty DB Account
        const cDBAccount = new Account();

        // We'll overlay the `account` keys atop the `DB Account` keys:
        // Note: Since the Account constructor defaults all properties to type-safe defaults, we can already assume `cDBAccount` is safe.
        // Note: Since `addAccount` could be called with *anything*, we must apply the same type-safety on it's input.
        for (const strKey of Object.keys(cDBAccount)) {
            // Ensure the Type is correct for the Key against the Account class
            if (!isSameType(account[strKey], cDBAccount[strKey])) {
                debugError(
                    DebugTopics.DATABASE,
                    'DB: addAccount() key "' +
                        strKey +
                        '" does NOT match the correct class type, likely data mismatch, please report!'
                );
                continue;
            }

            // Overlay the 'new' keys on top of the DB keys
            cDBAccount[strKey] = account[strKey];
        }

        const store = this.#db
            .transaction('accounts', 'readwrite')
            .objectStore('accounts');

        // Check this account isn't already added (by pubkey once multi-account)
        if (await store.get('account'))
            throw new Error(
                'DB: Ran addAccount() when account already exists!'
            );

        // When the account system is going to be added, the key is gonna be the publicKey
        await store.put(cDBAccount, 'account');
    }

    /**
     * Update specified keys for an Account in the DB.
     *
     * This will also apply new Account keys from MPW updates automatically, and check high-level type safety.
     *
     * ---
     *
     * To allow "deleting/clearing/resetting" keys, for example, when removing Proposals or Contacts, toggle `allowDeletion`.
     *
     * **Do NOT toggle unless otherwise necessary**, to avoid overwriting keys from code errors or misuse.
     * @param {Account} account - The Account to update, with new data inside
     * @param {boolean} allowDeletion - Allow setting keys to an "empty" state (`""`, `[]`, `{}`)
     */
    async updateAccount(account, allowDeletion = false) {
        // Critical: Ensure the input is an Account instance
        if (!(account instanceof Account)) {
            debugError(
                DebugTopics.DATABASE,
                '---- updateAccount() called with invalid input, input dump below ----'
            );
            debugError(DebugTopics.DATABASE, account);
            debugError(DebugTopics.DATABASE, '---- end of account dump ----');
            createAlert(
                'warning',
                '<b>DB Update Error</b><br>Your wallet is safe, logs were dumped in your Browser Console<br>Please submit these privately to PIVX Labs Developers!'
            );
            throw new Error(
                'addAccount was called with with an invalid account'
            );
        }

        // Fetch the DB account
        const cDBAccount = await this.getAccount();

        // If none exists; we should throw an error, as there's no reason for MPW to call `updateAccount` before an account was added using `addAccount`
        // Note: This is mainly to force "good standards" in which we don't lazily use `updateAccount` to create NEW accounts.
        if (!cDBAccount) {
            debugError(
                DebugTopics.DATABASE,
                '---- updateAccount() called without an account existing, input dump below ----'
            );
            debugError(DebugTopics.DATABASE, account);
            debugError(DebugTopics.DATABASE, '---- end of input dump ----');
            createAlert(
                'warning',
                '<b>DB Update Error</b><br>Logs were dumped in your Browser Console<br>Please submit these privately to PIVX Labs Developers!'
            );
            throw new Error(
                "updateAccount was called, but the account doesn't exist"
            );
        }

        // We'll overlay the `account` keys atop the `DB Account` keys:
        // Note: Since `getAccount` already checks type-safety, we can already assume `cDBAccount` is safe.
        // Note: Since `updateAccount` could be called with *anything*, we must apply the same type-safety on it's input.
        for (const strKey of Object.keys(cDBAccount)) {
            // Ensure the Type is correct for the Key against the Account class
            if (!isSameType(account[strKey], cDBAccount[strKey])) {
                debugError(
                    DebugTopics.DATABASE,
                    'DB: updateAccount() key "' +
                        strKey +
                        '" does NOT match the correct class type, likely data mismatch, please report!'
                );
                continue;
            }

            // Ensure the 'updated' key (which may not exist) is NOT a default or EMPTY value
            // Note: this can be overriden manually when erasing data such as Contacts, Local Proposals, etc.
            if (!allowDeletion && isEmpty(account[strKey])) continue;

            // Overlay the 'new' keys on top of the DB keys
            cDBAccount[strKey] = account[strKey];
        }

        const store = this.#db
            .transaction('accounts', 'readwrite')
            .objectStore('accounts');
        // When the account system is going to be added, the key is gonna be the publicKey
        await store.put(cDBAccount, 'account');
    }

    /**
     * Removes an account from the database
     * @param {Object} o
     * @param {String} o.publicKey - Public key associated to the account.
     */
    async removeAccount({ publicKey: _publicKey }) {
        const store = this.#db
            .transaction('accounts', 'readwrite')
            .objectStore('accounts');
        // When the account system is going to be added, the key is gonna be the publicKey
        await store.delete('account');
    }

    /**
     * Gets an account from the database.
     *
     * This also will apply new keys from MPW updates automatically, and check high-level type safety.
     * @returns {Promise<Account?>}
     */
    async getAccount() {
        const store = this.#db
            .transaction('accounts', 'readonly')
            .objectStore('accounts');
        const cDBAccount = await store.get('account');

        // If there's no DB Account, we'll return null early
        if (!cDBAccount) return null;

        // We'll generate an Account Class for up-to-date keys, then layer the 'new' type-checked properties on it one-by-one
        const cAccount = new Account();
        for (const strKey of Object.keys(cAccount)) {
            // If the key is missing: this is fine, `cAccount` will auto-fill it with the default blank Account Class type and value
            if (!Object.prototype.hasOwnProperty.call(cDBAccount, strKey))
                continue;

            // Ensure the Type is correct for the Key against the Account class (with instanceof to also check Class validity)
            if (!isSameType(cDBAccount[strKey], cAccount[strKey])) {
                debugError(
                    DebugTopics.DATABASE,
                    'DB: getAccount() key "' +
                        strKey +
                        '" does NOT match the correct class type, likely bad data saved, please report!'
                );
                continue;
            }

            // Overlay the 'DB' keys on top of the Class Instance keys
            cAccount[strKey] = cDBAccount[strKey];
        }

        // Return the Account Class
        return cAccount;
    }

    /**
     * @returns {Promise<Masternode[]>} the masternodes stored in the db
     */
    async getMasternodes() {
        const store = this.#db
            .transaction('masternodes', 'readonly')
            .objectStore('masternodes');
        const mns = await store.getAll();
        return mns.map((mn) => new Masternode(mn));
    }

    /**
     * @returns {Promise<Array<PromoWallet>>} all Promo Codes stored in the db
     */
    async getAllPromos() {
        const store = this.#db
            .transaction('promos', 'readonly')
            .objectStore('promos');
        // Convert all promo objects in to their Class and return them as a new array
        return (await store.getAll()).map((promo) => new PromoWallet(promo));
    }

    /**
     * Get all txs from the database
     * @returns {Promise<Transaction[]>}
     */
    async getTxs() {
        const store = this.#db
            .transaction('txs', 'readonly')
            .objectStore('txs');

        // We'll manually cursor iterate to merge the Index (TXID) with it's components
        const cursor = await store.openCursor();
        const txs = [];
        while (cursor) {
            if (!cursor.value) break;
            // Append the TXID from the Index key
            cursor.value.txid = cursor.key;
            txs.push(cursor.value);
            try {
                await cursor.continue();
            } catch {
                break;
            }
        }

        // Now convert the raw TX components to Transaction Classes
        return txs
            .map((tx) => {
                const vin = tx.vin.map(
                    (x) =>
                        new CTxIn({
                            outpoint: new COutpoint({
                                txid: x.outpoint.txid,
                                n: x.outpoint.n,
                            }),
                            scriptSig: x.scriptSig,
                            sequence: x.sequence,
                        })
                );
                const vout = tx.vout.map(
                    (x) =>
                        new CTxOut({
                            script: x.script,
                            value: x.value,
                        })
                );
                return new Transaction({
                    version: tx.version,
                    blockHeight: tx.blockHeight,
                    blockTime: tx.blockTime,
                    vin: vin,
                    vout: vout,
                    valueBalance: tx.valueBalance,
                    shieldSpend: tx.shieldSpend,
                    shieldOutput: tx.shieldOutput,
                    bindingSig: tx.bindingSig,
                    lockTime: tx.lockTime,
                    txid: tx.txid,
                });
            })
            .sort((a, b) => a.blockHeight - b.blockHeight);
    }

    /**
     * Remove all txs from db
     */
    async removeAllTxs() {
        const store = this.#db
            .transaction('txs', 'readwrite')
            .objectStore('txs');
        await store.clear();
    }

    /**
     * @returns {Promise<Settings>}
     */
    async getSettings() {
        const store = this.#db
            .transaction('settings', 'readonly')
            .objectStore('settings');
        return new Settings(await store.get('settings'));
    }

    /**
     * @param {Settings} settings - settings to use
     * @returns {Promise<void>}
     */
    async setSettings(settings) {
        const oldSettings = await this.getSettings();
        const store = this.#db
            .transaction('settings', 'readwrite')
            .objectStore('settings');
        await store.put(
            {
                ...oldSettings,
                ...settings,
            },
            'settings'
        );
    }

    static async create(name) {
        const database = new Database({ db: null });
        const db = await openDB(`MPW-${name}`, Database.version, {
            upgrade: (db, oldVersion, _, transaction) => {
                debugLog(
                    DebugTopics.DATABASE,
                    'DB: Upgrading from ' +
                        oldVersion +
                        ' to ' +
                        Database.version
                );
                if (oldVersion === 0) {
                    db.createObjectStore('masternodes');
                    db.createObjectStore('accounts');
                    db.createObjectStore('settings');
                }

                // The introduction of PIVXPromos (safely added during <v2 upgrades)
                if (oldVersion <= 1) {
                    db.createObjectStore('promos');
                }
                if (oldVersion <= 2) {
                    db.createObjectStore('txs');
                }
                if (oldVersion < 5) {
                    // Recreate tx db due to transaction class changes
                    db.deleteObjectStore('txs');
                    db.createObjectStore('txs');
                }

                if (oldVersion < 6) {
                    // Delete all txs with -1 as blockHeight (unconfirmed)
                    (async () => {
                        const store = transaction.objectStore('txs');
                        let cursor = await store.openCursor();
                        while (cursor) {
                            if (!cursor.value) break;
                            if (cursor.value.blockHeight === -1) {
                                await cursor.delete();
                            }
                            try {
                                cursor = await cursor.continue();
                            } catch {
                                break;
                            }
                        }
                    })();
                }
                if (oldVersion < 7) {
                    db.createObjectStore('shieldParams');
                }
                if (oldVersion < 8) {
                    db.createObjectStore('shieldSyncData');
                }
                if (oldVersion < 9) {
                    (async () => {
                        const store = transaction.objectStore('masternodes');
                        const mn = await store.get('masternode');

                        db.deleteObjectStore('masternodes');
                        const newStore = db.createObjectStore('masternodes', {
                            keyPath: 'mnPrivateKey',
                        });
                        if (mn) {
                            await newStore.add(mn);
                        }
                    })();
                }
            },
            blocking: () => {
                // Another instance is waiting to upgrade, and we're preventing it
                // Close the database and refresh the page
                // (This would only happen if the user opened another window after MPW got an update)
                database.close();
                alert('New update received!');
                window.location.reload();
            },
        });
        database.#db = db;
        return database;
    }

    /**
     * @returns {Promise<[Uint8Array, Uint8Array] | null>} Respectively sapling output and spend
     * or null if they haven't been cached
     */
    async getShieldParams() {
        const store = this.#db
            .transaction('shieldParams', 'readonly')
            .objectStore('shieldParams');
        const saplingOutput = await store.get('saplingOutput');
        const saplingSpend = await store.get('saplingSpend');
        if (!saplingOutput || !saplingSpend) return null;
        return [saplingOutput, saplingSpend];
    }

    /**
     * @param {Uint8Array} saplingOutput - Sapling output bytes
     * @param {Uint8Array} saplingSpend - Sapling spend bytes
     * @returns {Promise<void>} Resolves when db write has completed
     */
    async setShieldParams(saplingOutput, saplingSpend) {
        const store = this.#db
            .transaction('shieldParams', 'readwrite')
            .objectStore('shieldParams');
        await store.put(saplingOutput, 'saplingOutput');
        await store.put(saplingSpend, 'saplingSpend');
    }

    /**
     * @returns {Promise<{lastSyncedBlock: number, shieldData: Uint8Array}>}
     */
    async getShieldSyncData() {
        const store = this.#db
            .transaction('shieldSyncData', 'readonly')
            .objectStore('shieldSyncData');
        const lastSyncedBlock = (await store.get('lastSyncedBlock')) ?? 4190531;
        const shieldData =
            (await store.get('shieldData')) ?? new Uint8Array([]);
        return {
            lastSyncedBlock,
            shieldData,
        };
    }

    async setShieldSyncData({ shieldData, lastSyncedBlock }) {
        const store = this.#db
            .transaction('shieldSyncData', 'readwrite')
            .objectStore('shieldSyncData');
        await store.put(lastSyncedBlock, 'lastSyncedBlock');
        await store.put(shieldData, 'shieldData');
    }

    /**
     * Map name->instance
     * @type{Map<String, Database>}
     */
    static #instances = new Map();

    /**
     * @return {Promise<Database>} the default database instance
     */
    static async getInstance() {
        const name = cChainParams.current.name;
        const instance = this.#instances.get(name);
        if (!instance || !instance.#db) {
            this.#instances.set(name, await Database.create(name));
        }

        return this.#instances.get(name);
    }
}
