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
     * @return {number[]} array of bytes containing private key
     * @abstract
     */
    getPrivateKeyBytes(_path) {
        throw new Error('Not implemented');
    }

    /**
     * @param {String} [path] - BIP32 path pointing to the private key.
     * @return {string} encoded private key
     * @abstract
     */
    getPrivateKey(path) {
        return generateOrEncodePrivkey(this.getPrivateKeyBytes(path)).strWIF;
    }

    /**
     * @param {String} [path] - BIP32 path pointing to the address
     * @return {string} Address
     * @abstract
     */
    getAddress(path) {
        return deriveAddress({ pkBytes: this.getPrivateKeyBytes(path) });
    }

    /**
     * @param {String} path - BIP32 path pointing to the xpub
     * @return {string} xpub
     * @abstract
     */
    getxpub(_path) {
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
     * @return {string} public key to export. Only suitable for monitoring balance.
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
    getDerivationPath(_nAccount, _nReceiving, _nIndex) {
        throw new Error('Not implemented');
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

    getPrivateKeyBytes(path) {
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

    getxpub(path) {
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

    getDerivationPath(nAccount, nReceiving, nIndex) {
        return `m/44'/${cChainParams.current.BIP44_TYPE}'/${nAccount}'/${nReceiving}/${nIndex}`;
    }
}

export class HardwareWalletMasterKey extends HdMasterKey {
    /**
     * Trick to get private constructors
     */
    static #initializing = false;
    constructor(xpub) {
        if (!HardwareWalletMasterKey.#initializing) {
            throw new Error(
                'Hardware wallet master keys must be created with create'
            );
        }
        HardwareWalletMasterKey.#initializing = false;
        super({
            xpub,
        });
        this._isHardwareWallet = true;
        this._isViewOnly = true;
    }

    /**
     * @param {number} nAccount
     * @returns {Promise<HardwareWalletMasterKey>}
     */
    static async create(nAccount = 0) {
        const path = this.getDerivationPath(nAccount, 0, 0)
            .split('/')
            .slice(0, 4)
            .join('/');
        const xpub = await getHardwareWalletKeys(path, true, false);
        if (!xpub) throw new Error('Failed to get hardware wallet keys.');
        HardwareWalletMasterKey.#initializing = true;
        return new HardwareWalletMasterKey(xpub);
    }

    /**
     * Verifies that the address is correct by asking the ledger
     * directly and then the user.
     * This is considerably slower than deriving the key ourselves
     * with `getAddress`, but should be used every time we want to be sure
     * the address cannot be tampered with
     * @param {string} path - bip32 path
     * @returns {Promise<string?>} address or null if the user rejected the verification
     */
    async verifyAddress(path) {
        const publicKey = await getHardwareWalletKeys(path);

        return deriveAddress({ publicKey });
    }

    getDerivationPath(nAccount, nReceiving, nIndex) {
        return HardwareWalletMasterKey.getDerivationPath(
            nAccount,
            nReceiving,
            nIndex
        );
    }

    static getDerivationPath(nAccount, nReceiving, nIndex) {
        return `m/44'/${cChainParams.current.BIP44_TYPE_LEDGER}'/${nAccount}'/${nReceiving}/${nIndex}`;
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

    getPrivateKeyBytes(_path) {
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

    getxpub(_path) {
        throw new Error(
            'Trying to get an extended public key from a legacy address'
        );
    }

    wipePrivateData(_nAccount) {
        this._pkBytes = null;
        this._isViewOnly = true;
    }

    /**
     * This is a bit of a hack:
     * Legacy master keys don't need derivation paths.
     * We're going to make one nonetheless, to generalize things a bit
     */
    getDerivationPath(_nAccount, _nReceiving, _nIndex) {
        return `:)//${cChainParams.current.BIP44_TYPE}'`;
    }
}
