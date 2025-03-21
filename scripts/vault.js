import { PIVXShield } from 'pivx-shield';
import { HdMasterKey } from './masterkey.js';
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
     * @fail, need to take in an array of masterKeys and shields
     */
    constructor({ masterKey, shield }) {
        this.#masterKey = masterKey;
        this.#shield = shield;
    }
    /**
     * @param {number} account - Account number, ignored if Vault::canGenerateMore returns false
     * @param {Uint8Array} seed - Seed, must be present if we're trying to generate a new wallet
     * @returns {import('./wallet.js').Wallet} a reference of a wallet. The creation is lazy.
     * Vault::forgetWallet can be called if the reference is no longer needed
     */
    async getWallet(account, seed) {
        if (this.#wallets[account]) return this.#wallets[account];
        if (!seed)
            throw new Error(
                'Trying to generate a new wallet, but no seed present'
            );
        const wallet = new Wallet({
            nAccount: account,
            masterKey: new HdMasterKey({ seed }),
            shield: await PIVXShield.create({
                seed,
                // hardcoded value considering the last checkpoint, this is good both for mainnet and testnet
                // TODO: take the wallet creation height in input from users
                blockHeight: 4200000,
                coinType: cChainParams.current.BIP44_TYPE,
                // TODO: Change account index once account system is made
                accountIndex: account,
                loadSaplingData: false,
            }),
        });
        this.#wallets[account] = wallet;
        return wallet;
    }

    /**
     * Forgets associated wallet
     * @param {number} account - Account number, ignored if Vault::canGenerateMore returns false
     * @returns {void}
     */
    forgetWallet(account) {
        delete this.#wallets[account];
    }

    /**
     * @returns {import('./wallet.js').Wallet[]} Array of cached wallets
     */
    getWallets() {
        return this.#wallets;
    }
}
