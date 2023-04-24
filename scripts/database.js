import { openDB, IDBPDatabase } from 'idb';
import Masternode from './masternode.js';
import { Settings } from './settings.js';

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
        // When the account system is gonig to be added, the key is gonna be the publicKey
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
        // WHen the account system is gonig to be added, the key is gonna be the publicKey
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
        console.log({
            ...oldSettings,
            ...settings,
        });
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
	const settings = new Settings(
	    {
		analytics: localStorage.analytics,
		explorer: localStorage.explorer,
		node: localStorage.node,
		translation: localStorage.translation,
		displayCurrency: localStorage.displayCurrency
	    }
	);
	await this.setSettings(settings);

	if (localStorage.masternode) {
	    try {
		const masternode = JSON.parse(localStorage.masternode);
		await this.addMasternode(masternode);
	    } catch(e) {
		console.error(e);
		createAlert('warning', 'Failed to recover your masternode. Please reimport it.');
	    }
	}

	if (localStorage.encwif || localStorage.publicKey) {
	    try {
		const localProposals = JSON.parse(localStorage.localProposals || '[]');
		await this.addAccount({
		    publicKey: localStorage.publicKey,
		    encWif: localStorage.encwif,
		    localProposals
		});
	    } catch (e) {
		console.error(e);
		createAlert('warning', 'Failed to recover your account. Please reimport it.');
	    }
	}
    }

    static async create() {
	let migrate = false;
        const db = await openDB('MPW', 1, {
            upgrade: (db, oldVersion) => {
                if (oldVersion == 0) {
                    db.createObjectStore('masternodes');
                    db.createObjectStore('accounts');
                    db.createObjectStore('settings');
		    migrate = true;
                }
            },
            blocking: () => {
                // TODO: close
            },
        });
	const database = new Database({ db });
	if (migrate) {
	    database.#migrateLocalStorage();
	}
        return database;
    }

    static #instance = null;

    /**
     * @return {Promise<Database>} the default database instance
     */
    static async getInstance() {
        if (!this.#instance) {
            this.#instance = await Database.create();
        }

        return this.#instance;
    }
}
