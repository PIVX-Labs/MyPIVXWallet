import { openDB, IDBPDatabase } from 'idb';
import Masternode from './masternode.js';
import { Settings } from './settings.js';
import { cChainParams } from './chain_params.js';
import {
    confirmPopup,
    sanitizeHTML,
    createAlert,
    isSameType,
    isEmpty,
} from './misc.js';
import { PromoWallet } from './promos.js';
import { ALERTS, translation } from './i18n.js';
import { Account } from './accounts.js';

/** The current version of the DB - increasing this will prompt the Upgrade process for clients with an older version */
export const DB_VERSION = 2;

/**
 *
 */
export class Database {
    /**
     * Current Database Version.
     * Version 1 = Add index DB (PR #[FILL])
     * @type{Number}
     */
    static version = 1;

    /**
     * @type{IDBPDatabase}
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
     * @param {Masterkey} _masterKey - Masterkey associated to the masternode. Currently unused
     */
    async addMasternode(masternode, _masterKey) {
        const store = this.#db
            .transaction('masternodes', 'readwrite')
            .objectStore('masternodes');
        // For now the key is 'masternode' since we don't support multiple masternodes
        await store.put(masternode, 'masternode');
    }
    /**
     * Removes a masternode
     * @param {Masterkey} _masterKey - Masterkey associated to the masternode. Currently unused
     */
    async removeMasternode(_masterKey) {
        const store = this.#db
            .transaction('masternodes', 'readwrite')
            .objectStore('masternodes');
        await store.delete('masternode');
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
     * @param {string} promo - the promo code to remove
     */
    async removePromo(promo) {
        const store = this.#db
            .transaction('promos', 'readwrite')
            .objectStore('promos');
        await store.delete(promo);
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
            console.error(
                '---- addAccount() called with invalid input, input dump below ----'
            );
            console.error(account);
            console.error('---- end of account dump ----');
            createAlert(
                'warning',
                '<b>Account Creation Error</b><br>Logs were dumped in your Browser Console<br>Please submit these privately to PIVX Labs Developers!'
            );
            return false;
        }

        // Create an empty DB Account
        const cDBAccount = new Account();

        // We'll overlay the `account` keys atop the `DB Account` keys:
        // Note: Since the Account constructor defaults all properties to type-safe defaults, we can already assume `cDBAccount` is safe.
        // Note: Since `addAccount` could be called with *anything*, we must apply the same type-safety on it's input.
        for (const strKey of Object.keys(cDBAccount)) {
            // Ensure the Type is correct for the Key against the Account class
            if (!isSameType(account[strKey], cDBAccount[strKey])) {
                console.error(
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
            return console.error(
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
            console.error(
                '---- updateAccount() called with invalid input, input dump below ----'
            );
            console.error(account);
            console.error('---- end of account dump ----');
            createAlert(
                'warning',
                '<b>DB Update Error</b><br>Your wallet is safe, logs were dumped in your Browser Console<br>Please submit these privately to PIVX Labs Developers!'
            );
            return false;
        }

        // Fetch the DB account
        const cDBAccount = await this.getAccount();

        // If none exists; we should throw an error, as there's no reason for MPW to call `updateAccount` before an account was added using `addAccount`
        // Note: This is mainly to force "good standards" in which we don't lazily use `updateAccount` to create NEW accounts.
        if (!cDBAccount) {
            console.error(
                '---- updateAccount() called without an account existing, input dump below ----'
            );
            console.error(account);
            console.error('---- end of input dump ----');
            createAlert(
                'warning',
                '<b>DB Update Error</b><br>Logs were dumped in your Browser Console<br>Please submit these privately to PIVX Labs Developers!'
            );
            return false;
        }

        // We'll overlay the `account` keys atop the `DB Account` keys:
        // Note: Since `getAccount` already checks type-safety, we can already assume `cDBAccount` is safe.
        // Note: Since `updateAccount` could be called with *anything*, we must apply the same type-safety on it's input.
        for (const strKey of Object.keys(cDBAccount)) {
            // Ensure the Type is correct for the Key against the Account class
            if (!isSameType(account[strKey], cDBAccount[strKey])) {
                console.error(
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
    async removeAccount({ publicKey }) {
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
                console.error(
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
     * @returns {Promise<Masternode?>} the masternode stored in the db
     */
    async getMasternode(_masterKey) {
        const store = this.#db
            .transaction('masternodes', 'readonly')
            .objectStore('masternodes');
        return new Masternode(await store.get('masternode'));
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

    /**
     * Migrates from local storage
     * @param {IDBPDatabase} db
     */
    async #migrateLocalStorage() {
        if (localStorage.length === 0) return;
        const settings = new Settings({
            analytics: localStorage.analytics,
            explorer: localStorage.explorer,
            node: localStorage.node,
            translation: localStorage.translation,
            displayCurrency: localStorage.displayCurrency,
        });
        await this.setSettings(settings);

        if (localStorage.masternode) {
            try {
                const masternode = JSON.parse(localStorage.masternode);
                await this.addMasternode(masternode);
            } catch (e) {
                console.error(e);
                createAlert('warning', ALERTS.MIGRATION_MASTERNODE_FAILURE);
            }
        }

        if (localStorage.encwif || localStorage.publicKey) {
            try {
                const localProposals = JSON.parse(
                    localStorage.localProposals || '[]'
                );

                // Update and format the old Account data
                const cAccount = new Account({
                    publicKey: localStorage.publicKey,
                    encWif: localStorage.encwif,
                    localProposals: localProposals,
                });

                // Migrate the old Account data to the new DB
                await this.addAccount(cAccount);
            } catch (e) {
                console.error(e);
                createAlert('warning', ALERTS.MIGRATION_ACCOUNT_FAILURE);
                if (localStorage.encwif) {
                    await confirmPopup({
                        title: translation.MIGRATION_ACCOUNT_FAILURE_TITLE,
                        html: `${
                            translation.MIGRATION_ACCOUNT_FAILURE_HTML
                        } <code id="exportPrivateKeyText">${sanitizeHTML(
                            localStorage.encwif
                        )} </code>`,
                    });
                }
            }
        }
    }

    static async create(name) {
        let migrate = false;
        const database = new Database({ db: null });
        const db = await openDB(`MPW-${name}`, DB_VERSION, {
            upgrade: (db, oldVersion) => {
                console.log(
                    'DB: Upgrading from ' + oldVersion + ' to ' + DB_VERSION
                );
                if (oldVersion == 0) {
                    db.createObjectStore('masternodes');
                    db.createObjectStore('accounts');
                    db.createObjectStore('settings');
                    migrate = true;
                }

                // The introduction of PIVXPromos (safely added during <v2 upgrades)
                if (oldVersion <= 1) {
                    db.createObjectStore('promos');
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
        if (migrate) {
            database.#migrateLocalStorage();
        }
        return database;
    }

    /**
     * Map name->instnace
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
