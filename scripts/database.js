import { openDB, IDBPDatabase } from 'idb';
import Masternode from './masternode.js';
import { Settings } from './settings.js';
import { cChainParams } from './chain_params.js';
import { confirmPopup, sanitizeHTML, createAlert } from './misc.js';
import { PromoWallet } from './promos.js';
import { ALERTS, translation } from './i18n.js';

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
     * @param {Object} o
     * @param {String} o.publicKey - Public key associated to the account. Can be an xpub
     * @param {String} o.encWif - Encrypted private key associated to the account
     * @param {Array<any>} o.localProposals - Local proposals awaiting to be finalized
     */
    async addAccount({ publicKey, encWif, localProposals = [] }) {
        const oldAccount = await this.getAccount();
        const newAccount = { publicKey, encWif, localProposals };
        const store = this.#db
            .transaction('accounts', 'readwrite')
            .objectStore('accounts');
        // When the account system is going to be added, the key is gonna be the publicKey
        await store.put({ ...oldAccount, ...newAccount }, 'account');
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
     * Gets an account from the database
     * @returns {Promise<{publicKey: String, encWif: String?, localProposals: Array<any>}?>}
     */
    async getAccount() {
        const store = this.#db
            .transaction('accounts', 'readonly')
            .objectStore('accounts');
        return await store.get('account');
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
                await this.addAccount({
                    publicKey: localStorage.publicKey,
                    encWif: localStorage.encwif,
                    localProposals,
                });
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
