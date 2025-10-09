import { PIVXShield } from 'pivx-shield';
import { HardwareWalletMasterKey, HdMasterKey } from './masterkey.js';
import { Wallet } from './wallet.js';
import { cChainParams } from './chain_params.js';

/**
 * Hold one or more related wallets.
 * E.g. holds wallet of an HD xpriv
 */
export class Vault {
    /**
     * @type{import('./wallet.js').Wallet[]}
     */
    #wallets = [];
    /**
     * @type{Uint8Array|null} seed
     */
    #seed;

    /**
     * @type{string}
     */
    label;

    constructor({ masterKey, shield, seed, wallets, label }) {
        if (masterKey) {
            this.#wallets.push(
                new Wallet({
                    nAccount: 0,
                    masterKey,
                    shield,
                })
            );
        }
        if (seed) {
            this.setSeed(seed);
        }
        if (wallets) this.#wallets = wallets;
        this.label = label;
    }

    async #getHardwareWallet(account) {
        const wallet = new Wallet({
            nAccount: account,
            masterKey: await HardwareWalletMasterKey.create(account),
        });
        this.#wallets[account] = wallet;
        return wallet;
    }

    /**
     * @param {number} account - Account number, ignored if Vault::canGenerateMore returns false
     * @param {Uint8Array} seed - Seed, must be present if we're trying to generate a new wallet
     * @returns {Promise<import('./wallet.js').Wallet>} a reference of a wallet. The creation is lazy.
     * Vault::forgetWallet can be called if the reference is no longer needed
     */
    async getWallet(account) {
        if (this.#wallets[account]) return this.#wallets[account];
        if (this.getDefaultWallet().isHardwareWallet())
            return this.#getHardwareWallet(account);
        if (!this.#seed)
            throw new Error(
                'Trying to generate a new wallet, but no seed present'
            );
        const wallet = new Wallet({
            nAccount: account,
            masterKey: new HdMasterKey({ seed: this.#seed }),
            shield: await PIVXShield.create({
                seed: this.#seed,
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
     * @returns {import('./wallet.js').Wallet} Default Wallet. Guaranteed to exist.
     */
    getDefaultWallet() {
        return this.#wallets[0];
    }

    /**
     * @returns {string} Default Key to export. Guaranteed to exist.
     */
    getDefaultKeyToExport() {
        return this.getDefaultWallet().getKeyToExport();
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

    setSeed(seed) {
        this.#seed = seed;
    }

    isSeeded() {
        return !!this.#seed;
    }

    wipePrivateData() {
        this.#seed = null;
        for (const wallet of this.#wallets) {
            wallet.wipePrivateData();
        }
    }

    isViewOnly() {
        return this.getDefaultWallet().isViewOnly();
    }

    getSecretToExport() {
        // Either return the seed, or the key to export
        // if this is a seedless vault
        if (this.#seed) return this.#seed;
        return this.#wallets[0].getKeyToEncrypt();
    }

    canGenerateMore() {
        return !!this.#seed || this.getDefaultWallet().isHardwareWallet();
    }
}
