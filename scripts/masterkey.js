import HDKey from 'hdkey';
import { bytesToHex } from './utils.js';
import { getHardwareWalletKeys } from './ledger.js';
import { cChainParams } from './chain_params.js';

import { deriveAddress, generateOrEncodePrivkey } from './encoding.js';

/**
 * Abstract class masterkey, it handles address generation
 * this class must not know anything about the wallet it self
 * so for example don't take for granted nAccount when generating.
 * Ideally the only class having access to those functions is the wallet itself.
 * @abstract
 */
export class MasterKey {
    constructor() {
        if (this.constructor === MasterKey) {
            throw new Error('initializing virtual class');
        }
    }

    /**
     * @param {String} [path] - BIP32 path pointing to the private key.
     * @return {Promise<Array<Number>>} Array of bytes containing private key
     * @abstract
     */
    async getPrivateKeyBytes(_path) {
        throw new Error('Not implemented');
    }

    /**
     * @param {String} [path] - BIP32 path pointing to the private key.
     * @return {Promise<String>} encoded private key
     * @abstract
     */
    async getPrivateKey(path) {
        return generateOrEncodePrivkey(await this.getPrivateKeyBytes(path))
            .strWIF;
    }

    /**
     * @param {String} [path] - BIP32 path pointing to the address
     * @return {Promise<String>} Address
     * @abstract
     */
    async getAddress(path) {
        return deriveAddress({ pkBytes: await this.getPrivateKeyBytes(path) });
    }

    /**
     * @param {String} path - BIP32 path pointing to the xpub
     * @return {Promise<String>} xpub
     * @abstract
     */
    async getxpub(_path) {
        throw new Error('Not implemented');
    }

    /**
     * Wipe all private data from key.
     * @return {void}
     * @abstract
     */
    wipePrivateData(_nAccount) {
        throw new Error('Not implemented');
    }

    /**
     * @return {String} private key suitable for backup.
     * @abstract
     */
    get keyToBackup() {
        throw new Error('Not implemented');
    }

    /**
     * @return {Promise<String>} public key to export. Only suitable for monitoring balance.
     * @abstract
     */
    getKeyToExport(_nAccount) {
        throw new Error('Not implemented');
    }

    /**
     * @return {Boolean} Whether or not this is a Hierarchical Deterministic wallet
     */
    get isHD() {
        return this._isHD;
    }

    /**
     * @return {Boolean} Whether or not this is a hardware wallet
     */
    get isHardwareWallet() {
        return this._isHardwareWallet;
    }

    /**
     * @return {Boolean} Whether or not this key is view only or not
     */
    get isViewOnly() {
        return this._isViewOnly;
    }

    // Construct a full BIP44 pubkey derivation path from it's parts
    getDerivationPath(nAccount, nReceiving, nIndex) {
        // Coin-Type is different on Ledger, as such, for local wallets; we modify it if we're using a Ledger to derive a key
        const strCoinType = this.isHardwareWallet
            ? cChainParams.current.BIP44_TYPE_LEDGER
            : cChainParams.current.BIP44_TYPE;
        if (!this.isHD && !this.isHardwareWallet) {
            return `:)//${strCoinType}'`;
        }
        return `m/44'/${strCoinType}'/${nAccount}'/${nReceiving}/${nIndex}`;
    }
}

export class HdMasterKey extends MasterKey {
    constructor({ seed, xpriv, xpub }) {
        super();
        // Generate the HDKey
        if (seed) this._hdKey = HDKey.fromMasterSeed(seed);
        if (xpriv) this._hdKey = HDKey.fromExtendedKey(xpriv);
        if (xpub) this._hdKey = HDKey.fromExtendedKey(xpub);
        this._isViewOnly = !!xpub;
        if (!this._hdKey)
            throw new Error('All of seed, xpriv and xpub are undefined');
        this._isHD = true;
        this._isHardwareWallet = false;
    }

    async getPrivateKeyBytes(path) {
        if (this.isViewOnly) {
            throw new Error(
                'Trying to get private key bytes from a view only key'
            );
        }
        return this._hdKey.derive(path).privateKey;
    }

    get keyToBackup() {
        if (this.isViewOnly) {
            throw new Error('Trying to get private key from a view only key');
        }
        return this._hdKey.privateExtendedKey;
    }

    async getxpub(path) {
        if (this.isViewOnly) return this._hdKey.publicExtendedKey;
        return this._hdKey.derive(path).publicExtendedKey;
    }

    getAddress(path) {
        let child;
        if (this.isViewOnly) {
            // If we're view only we can't derive hardened keys, so we'll assume
            // That the xpub has already been derived
            child = this._hdKey.derive(
                path
                    .split('/')
                    .filter((n) => !n.includes("'"))
                    .join('/')
            );
        } else {
            child = this._hdKey.derive(path);
        }
        return deriveAddress({ publicKey: bytesToHex(child.publicKey) });
    }

    wipePrivateData(nAccount) {
        if (this._isViewOnly) return;

        this._hdKey = HDKey.fromExtendedKey(this.getKeyToExport(nAccount));
        this._isViewOnly = true;
    }
    getKeyToExport(nAccount) {
        if (this._isViewOnly) return this._hdKey.publicExtendedKey;
        // We need the xpub to point at the account level
        return this._hdKey.derive(
            this.getDerivationPath(nAccount, 0, 0)
                .split('/')
                .slice(0, 4)
                .join('/')
        ).publicExtendedKey;
    }
}

export class HardwareWalletMasterKey extends MasterKey {
    constructor() {
        super();
        this._isHD = true;
        this._isHardwareWallet = true;
    }
    async getPrivateKeyBytes(_path) {
        throw new Error('Hardware wallets cannot export private keys');
    }

    async getAddress(path, { verify } = {}) {
        return deriveAddress({
            publicKey: await this.getPublicKey(path, { verify }),
        });
    }

    async getPublicKey(path, { verify } = {}) {
        return deriveAddress({
            publicKey: await getHardwareWalletKeys(path, false, verify),
            output: 'COMPRESSED_HEX',
        });
    }

    get keyToBackup() {
        throw new Error("Hardware wallets don't have keys to backup");
    }

    async getxpub(path) {
        if (!this.xpub) {
            this.xpub = await getHardwareWalletKeys(path, true);
        }
        return this.xpub;
    }

    // Hardware Wallets don't have exposed private data
    wipePrivateData(_nAccount) {}

    get isViewOnly() {
        return false;
    }
    getKeyToExport(nAccount) {
        const derivationPath = this.getDerivationPath(nAccount, 0, 0)
            .split('/')
            .slice(0, 4)
            .join('/');
        return this.getxpub(derivationPath);
    }
}

export class LegacyMasterKey extends MasterKey {
    constructor({ pkBytes, address }) {
        super();
        this._isHD = false;
        this._isHardwareWallet = false;
        this._pkBytes = pkBytes;
        this._address = address || super.getAddress();
        this._isViewOnly = !!address;
    }

    getAddress() {
        return this._address;
    }

    getKeyToExport(_nAccount) {
        return this._address;
    }

    async getPrivateKeyBytes(_path) {
        if (this.isViewOnly) {
            throw new Error(
                'Trying to get private key bytes from a view only key'
            );
        }
        return this._pkBytes;
    }

    get keyToBackup() {
        return generateOrEncodePrivkey(this._pkBytes).strWIF;
    }

    async getxpub(_path) {
        throw new Error(
            'Trying to get an extended public key from a legacy address'
        );
    }

    wipePrivateData(_nAccount) {
        this._pkBytes = null;
        this._isViewOnly = true;
    }
}
