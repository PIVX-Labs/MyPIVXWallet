import { bytesToNum, numToBytes, numToVarInt } from './encoding.js';
import { hexToBytes, bytesToHex, dSHA256 } from './utils.js';
import { OP } from './script.js';
import bs58 from 'bs58';
import { varIntToNum } from './encoding.js';

/** An Unspent Transaction Output, used as Inputs of future transactions */
export class COutpoint {
    /**
     * @param {object} COutpoint
     * @param {string} COutpoint.txid - Transaction ID
     * @param {number} COutpoint.n - Outpoint position in the corresponding transaction
     */
    constructor({ txid, n } = {}) {
        /** Transaction ID
         * @type {string} */
        this.txid = txid;
        /** Outpoint position in the corresponding transaction
         *  @type {number} */
        this.n = n;
    }
    /**
     * Sadly javascript sucks and we cannot directly compare Objects in Sets
     * @returns {string} Unique string representation of the COutpoint
     */
    toUnique() {
        return this.txid + this.n.toString();
    }
}

export class CTxOut {
    /**
     * @param {object} CTxOut
     * @param {COutpoint} CTxOut.outpoint - COutpoint of the CTxOut
     * @param {string} CTxOut.script - Redeem script, in HEX
     * @param {number} CTxOut.value - Value in satoshi
     */
    constructor({ outpoint, script, value } = {}) {
        /** COutpoint of the CTxOut
         *  @type {COutpoint} */
        this.outpoint = outpoint;
        /** Redeem script, in hex
         * @type {string} */
        this.script = script;
        /** Value in satoshi
         *  @type {number} */
        this.value = value;
    }
    isEmpty() {
        return this.value == 0 && this.script == 'f8';
    }
}
export class CTxIn {
    /**
     * @param {Object} CTxIn
     * @param {COutpoint} CTxIn.outpoint - Outpoint of the UTXO that the vin spends
     * @param {String} CTxIn.scriptSig - Script used to spend the corresponding UTXO, in hex
     */
    constructor({ outpoint, scriptSig, sequence = 4294967295 } = {}) {
        /** Outpoint of the UTXO that the vin spends
         *  @type {COutpoint} */
        this.outpoint = outpoint;
        /** Script used to spend the corresponding UTXO, in hex
         * @type {string} */
        this.scriptSig = scriptSig;
        this.sequence = sequence;
    }
}

export class Transaction {
    /** @type{number} */
    version;
    /** @type{number} */
    blockHeight;
    /** @type{CtxIn[]}*/
    vin = [];
    /** @type{CTxOut[]}*/
    vout = [];
    /** @type{number} */
    blockTime;
    /** @type{number} */
    lockTime;

    chainParams;

    get txid() {
        return bytesToHex(dSHA256(hexToBytes(this.serialize())).reverse());
    }

    isConfirmed() {
        return this.blockHeight != -1;
    }

    isCoinStake() {
        return this.vout.length >= 2 && this.vout[0].isEmpty();
    }

    isCoinBase() {
        // txid undefined happens only for coinbase inputs
        return this.vin.length == 1 && !this.vin[0].outpoint.txid;
    }

    isMature(currentHeight) {
        if (!(this.isCoinBase() || this.isCoinStake())) {
            return true;
        }
        return (
            currentHeight - this.blockHeight > this.chainParams.coinbaseMaturity
        );
    }

    /**
     * @param {string} hex - hex encoded transaction
     * @returns {Transaction}
     */
    static fromHex(hex) {
        const bytes = hexToBytes(hex);
        let offset = 0;
        const tx = new Transaction();
        tx.version = Number(bytesToNum(bytes.slice(offset, (offset += 4))));
        const { num: vinLength, readBytes } = varIntToNum(bytes.slice(offset));
        offset += readBytes;
        for (let i = 0; i < Number(vinLength); i++) {
            const txid = bytesToHex(
                bytes.slice(offset, (offset += 32)).reverse()
            );
            const n = Number(bytesToNum(bytes.slice(offset, (offset += 4))));
            const { num: scriptLength, readBytes } = varIntToNum(
                bytes.slice(offset)
            );
            offset += readBytes;
            const script = bytesToHex(
                bytes.slice(offset, (offset += Number(scriptLength)))
            );
            const sequence = Number(
                bytesToNum(bytes.slice(offset, (offset += 4)))
            );

            const input = new CTxIn({
                outpoint: new COutpoint({
                    txid,
                    n,
                }),
                scriptSig: script,
                sequence,
            });
            tx.vin.push(input);
        }
        const { num: voutLength, readBytes: readBytesOut } = varIntToNum(
            bytes.slice(offset)
        );
        offset += readBytesOut;

        for (let i = 0; i < voutLength; i++) {
            const value = bytesToNum(bytes.slice(offset, (offset += 8)));
            const { num: scriptLength, readBytes } = varIntToNum(
                bytes.slice(offset)
            );
            offset += readBytes;
            const script = bytesToHex(
                bytes.slice(offset, (offset += Number(scriptLength)))
            );

            tx.vout.push(
                new CTxOut({
                    outpoint: null,
                    script,
                    value: Number(value),
                })
            );
        }

        return tx;
    }

    serialize() {
        const locktime = 4294967295n;
        let buffer = [
            ...numToBytes(BigInt(this.version), 4),
            ...numToVarInt(BigInt(this.vin.length)),
        ];

        for (const input of this.vin) {
            const scriptBytes = hexToBytes(input.scriptSig);
            buffer = [
                ...buffer,
                ...hexToBytes(input.outpoint.txid).reverse(),
                ...numToBytes(BigInt(input.outpoint.n), 4),
                ...numToVarInt(BigInt(scriptBytes.length), 4),
                ...scriptBytes,
                ...numToBytes(locktime, 4),
            ];
        }

        buffer = [...buffer, ...numToVarInt(BigInt(this.vout.length))];
        for (const output of this.vout) {
            const scriptBytes = hexToBytes(output.script);
            buffer = [
                ...buffer,
                ...numToBytes(BigInt(output.value), 8),
                ...numToVarInt(BigInt(scriptBytes.length)),
                ...scriptBytes,
            ];
        }
        buffer = [...buffer, ...numToBytes(0n, 4)];

        return bytesToHex(buffer);
    }
}

/**
 * @class Builds a non-signed transaction
 */
export class TransactionBuilder {
    #transaction = new Transaction();

    constructor() {}

    /**
     * @returns {TransactionBuilder}
     */
    addInput({ txid, n }) {
        this.#transaction.vin.push(
            new CTxIn({
                outpoint: new COutpoint({
                    txid,
                    n,
                }),
                scriptSig,
            })
        );
        return this;
    }

    /**
     * @param {string} address - Address to decode
     * @returns {number[]} Decoded address in bytes
     */
    #decodeAddress(address) {
        const bytes = bs58.decode(address);
        const front = bytes.slice(0, bytes.length - 4);
        const back = bytes.slice(bytes.length - 4);
        const checksum = dSHA256(front).slice(0, 4);
        if (checksum + '' == back + '') {
            return Array.from(front.slice(1));
        }
        throw new Error('Invalid address');
    }

    /**
     * Adds a P2PKH output to the transaction
     * @param {{address: string, value: number}}
     * @returns {TransactionBuilder}
     */
    addOutput({ address, value }) {
        const decoded = this.#decodeAddress(address);
        const script = [
            OP['DUP'],
            OP['HASH160'],
            decoded.length,
            ...decoded,
            OP['EQUALVERIFY'],
            OP['CHECKSIG'],
        ];
        this.#transaction.vout.push(
            new CTxOut({
                script: bytesToHex(script),
                value,
            })
        );
        return this;
    }

    /**
     * Adds a proposal output to the transaction
     * @param {{hash: string, value: number}}
     * @returns {TransactionBuilder}
     */
    addProposalOutput({ hash, value }) {
        this.#transaction.vout.push(
            new CTxOut({
                script: bytesToHex([OP['RETURN'], 32, ...hexToBytes(hash)]),
                value,
            })
        );
        return this;
    }

    /**
     * Adds a cold stake output to the transaction
     * @param {{address: string, addressColdStake: string, value: number}}
     * @returns {TransactionBuilder}
     */
    addColdStakeOutput({ address, addressColdStake, value }) {
        const decodedAddress = this.#decodeAddress(address);
        const decodedAddressColdStake = this.#decodeAddress(addressColdStake);
        const script = [
            OP['DUP'],
            OP['HASH160'],
            OP['ROT'],
            OP['IF'],
            OP['CHECKCOLDSTAKEVERIFY_LOF'],
            decodedAddressColdStake.length,
            ...decodedAddressColdStake,
            OP['ELSE'],
            decodedAddress.length,
            ...decodedAddress,
            OP['ENDIF'],
            OP['EQUALVERIFY'],
            OP['CHECKSIG'],
        ];
        this.#transaction.vout.push(
            new CTxOut({
                script: bytesToHex(script),
                value,
            })
        );
        return this;
    }

    build() {
        return this.#transaction;
    }
}
