import { Wallet } from './wallet.js';

/**
 * Hold one or more related wallets.
 * E.g. holds wallet of an HD xpriv
 */
export class Vault {
    /**
     * @type {import('./masterkey.js').MasterKey}
     */
    #masterKey;

    /**
     * @type {import('pivx-shield').PIVXShield}
     */
    #shield;
    /**
     * @type{import('./wallet.js').Wallet[]}
     */
    #wallets = [];
    
    /**
     * @param {import('./masterkey.js').MasterKey} masterKey
     * @param {import('pivx-shield').PIVXShield} shield
     */
    constructor(masterKey, shield) {
	this.#masterKey = masterKey;
	this.#shield = shield;
	console.log(shield)
    }

    /**
     * @returns {boolean} whether or not it can generate more wallets
     */
    canGenerateMore() {
        console.log(this.#masterKey);
        // If it's an xpub, it's already tied to an account since MPW
        // only export account xpubs
        const isXpub =
            this.#masterKey.isViewOnly && !this.#masterKey.isHardwareWallet;
        return this.#masterKey.isHD && !isXpub;
    }

    /**
     * @param {number} account - Account number, ignored if Vault::canGenerateMore returns false
     * @returns {import('./wallet.js').Wallet} a reference of a wallet. The creation is lazy.
     * Vault::forgetWallet can be called if the reference is no longer needed
     */
    getWallet(account) {
        // @fail
        if (this.canGenerateMore() || true) {
            if (this.#wallets[account]) return this.#wallets[account];
            const wallet = new Wallet({
                nAccount: account,
                masterKey: this.#masterKey,
                shield: this.#shield,
            });
            this.#wallets[account] = wallet;
            return wallet;
        } else {
            throw new Error('Not implemented');
        }
    }

    /**
     * Forgets associated wallet
     * @param {number} account - Account number, ignored if Vault::canGenerateMore returns false
     * @returns {void}
     */
    forgetWallet(account) {
        if (this.canGenerateMore()) delete this.#wallets[account];
    }

    /**
     * @returns {import('./wallet.js').Wallet[]} Array of cached wallets
     */
    getWallets() {
        return this.#wallets;
    }
}
