import { Buffer } from 'buffer';
import { bytesToNum, numToBytes, numToVarInt, parseWIF } from './encoding.js';
import { hexToBytes, bytesToHex, dSHA256 } from './utils.js';
import { isProposalFee, OP } from './script.js';
import { varIntToNum, deriveAddress } from './encoding.js';
import * as nobleSecp256k1 from '@noble/secp256k1';
import { cChainParams, SAPLING_TX_VERSION } from './chain_params.js';

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

    /**
     * @param {string} str
     */
    static fromUnique(str) {
        return new COutpoint({
            txid: str.slice(0, 64),
            n: parseInt(str.slice(64)),
        });
    }
}

export class CTxOut {
    /**
     * @param {object} CTxOut
     * @param {string} CTxOut.script - Redeem script, in HEX
     * @param {number} CTxOut.value - Value in satoshi
     */
    constructor({ script, value } = {}) {
        /** Redeem script, in hex
         * @type {string} */
        this.script = script;
        /** Value in satoshi
         *  @type {number} */
        this.value = value;
    }

    isEmpty() {
        return this.value === 0 && (this.script === 'f8' || this.script === '');
    }

    serialize() {
        const scriptBytes = hexToBytes(this.script);
        return [
            ...numToBytes(BigInt(this.value), 8),
            ...numToVarInt(BigInt(scriptBytes.length)),
            ...scriptBytes,
        ];
    }
}
export class CTxIn {
    /**
     * @param {Object} CTxIn
     * @param {COutpoint} CTxIn.outpoint - Outpoint of the UTXO that the vin spends
     * @param {String} CTxIn.scriptSig - Script used to spend the corresponding UTXO, in hex
     * @param {number} CTxIn.sequence - Sequence
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
    /** @type{CTxIn[]}*/
    vin = [];
    /** @type{CTxOut[]}*/
    vout = [];
    /** @type{number} */
    blockTime;
    /** @type{number} */
    lockTime;
    /**
     * Cached txid
     * @type {string}
     */
    #txid = '';

    constructor({
        version = 1,
        blockHeight = -1,
        vin = [],
        vout = [],
        blockTime = -1,
        lockTime = 0,
        valueBalance = 0,
        shieldSpend = [],
        shieldOutput = [],
        bindingSig = '',
        txid = '',
    } = {}) {
        this.version = version;
        this.blockHeight = blockHeight;
        this.vin = vin;
        this.vout = vout;
        this.blockTime = blockTime;
        this.lockTime = lockTime;
        this.shieldSpend = shieldSpend;
        this.shieldOutput = shieldOutput;
        this.bindingSig = bindingSig;
        this.valueBalance = valueBalance;
        /** Handle to the unproxied tx for when we need to clone it */
        this.__original = this;
        // If a TXID is provided (i.e: loaded from DB), cache it
        if (txid) this.__original.#txid = txid;
        return new Proxy(this, {
            set(obj, p) {
                if (p !== 'blockHeight' && p !== 'blockTime') {
                    obj.#txid = '';
                }
                return Reflect.set(...arguments);
            },
        });
    }

    get hasSaplingVersion() {
        return this.version >= SAPLING_TX_VERSION;
    }

    /**
     * @returns {string} txid of the transaction
     */
    get txid() {
        if (!this.__original.#txid) {
            this.__original.#txid = Transaction.getTxidFromHex(
                this.serialize()
            );
        }
        return this.__original.#txid;
    }

    /**
     * @param {string} hex - Hex encoded transaction
     * @returns {string} txid
     */
    static getTxidFromHex(hex) {
        return bytesToHex(dSHA256(hexToBytes(hex)).reverse());
    }

    get hasShieldData() {
        return this.bindingSig !== '';
    }

    isConfirmed() {
        return this.blockHeight !== -1;
    }

    isCoinStake() {
        return this.vout.length >= 2 && this.vout[0].isEmpty();
    }

    isCoinBase() {
        // txid is full of 0s for coinbase inputs
        return (
            this.vin.length === 1 && !!this.vin[0].outpoint.txid.match(/^0*$/)
        );
    }

    isProposalFee() {
        for (let out of this.vout) {
            if (out.value === cChainParams.current.proposalFee) {
                const dataBytes = hexToBytes(out.script);
                if (isProposalFee(dataBytes)) return true;
            }
        }
        return false;
    }

    /**
     * @param {Transaction} tx - transaction we want to check
     * @returns {boolean}
     */
    isImmature(blockCount) {
        if (this.isCoinStake() || this.isCoinBase()) {
            return (
                blockCount - this.blockHeight <
                cChainParams.current.coinbaseMaturity
            );
        }
        return false;
    }

    static fromHex(hex) {
        const tx = new Transaction();
        return tx.fromHex(hex);
    }

    /**
     * @param {string} hex - hex encoded transaction
     * @returns {Transaction}
     */
    fromHex(hex) {
        const bytes = hexToBytes(hex);
        let offset = 0;
        this.version = Number(bytesToNum(bytes.slice(offset, (offset += 4))));
        const { num: vinLength, readBytes } = varIntToNum(bytes.slice(offset));
        offset += readBytes;
        this.vin = [];
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
            this.vin.push(input);
        }
        const { num: voutLength, readBytes: readBytesOut } = varIntToNum(
            bytes.slice(offset)
        );
        offset += readBytesOut;

        this.vout = [];
        for (let i = 0; i < voutLength; i++) {
            const value = bytesToNum(bytes.slice(offset, (offset += 8)));
            const { num: scriptLength, readBytes } = varIntToNum(
                bytes.slice(offset)
            );
            offset += readBytes;
            const script = bytesToHex(
                bytes.slice(offset, (offset += Number(scriptLength)))
            );

            this.vout.push(
                new CTxOut({
                    script,
                    value: Number(value),
                })
            );
        }

        this.lockTime = Number(bytesToNum(bytes.slice(offset, (offset += 4))));
        this.shieldSpend = [];
        this.shieldOutput = [];
        if (this.hasSaplingVersion) {
            const hasShield = bytesToNum(bytes.slice(offset, (offset += 1)));
            if (hasShield) {
                this.valueBalance = Number(
                    new BigInt64Array([
                        bytesToNum(bytes.slice(offset, (offset += 8))),
                    ])[0]
                );

                const { num: shieldSpendLen, readBytes } = varIntToNum(
                    bytes.slice(offset)
                );
                offset += readBytes;
                for (let i = 0; i < shieldSpendLen; i++) {
                    const cv = bytesToHex(
                        bytes.slice(offset, (offset += 32)).reverse()
                    );
                    const anchor = bytesToHex(
                        bytes.slice(offset, (offset += 32)).reverse()
                    );
                    const nullifier = bytesToHex(
                        bytes.slice(offset, (offset += 32)).reverse()
                    );
                    const rk = bytesToHex(
                        bytes.slice(offset, (offset += 32)).reverse()
                    );
                    const proof = bytesToHex(
                        bytes.slice(offset, (offset += 192))
                    );
                    const spendAuthSig = bytesToHex(
                        bytes.slice(offset, (offset += 64))
                    );

                    this.shieldSpend.push({
                        cv,
                        anchor,
                        nullifier,
                        rk,
                        proof,
                        spendAuthSig,
                    });
                }
                const { num: outputLen, readBytes: readOutBytes } = varIntToNum(
                    bytes.slice(offset)
                );
                offset += readOutBytes;
                for (let i = 0; i < outputLen; i++) {
                    const cv = bytesToHex(
                        bytes.slice(offset, (offset += 32)).reverse()
                    );
                    const cmu = bytesToHex(
                        bytes.slice(offset, (offset += 32)).reverse()
                    );
                    const ephemeralKey = bytesToHex(
                        bytes.slice(offset, (offset += 32)).reverse()
                    );
                    const encCiphertext = bytesToHex(
                        bytes.slice(offset, (offset += 580))
                    );
                    const outCiphertext = bytesToHex(
                        bytes.slice(offset, (offset += 80))
                    );
                    const proof = bytesToHex(
                        bytes.slice(offset, (offset += 192))
                    );

                    this.shieldOutput.push({
                        cv,
                        cmu,
                        ephemeralKey,
                        encCiphertext,
                        outCiphertext,
                        proof,
                    });
                }
                this.bindingSig = bytesToHex(
                    bytes.slice(offset, (offset += 64))
                );
            }
        }
        this.__original.#txid = bytesToHex(dSHA256(hexToBytes(hex)).reverse());
        return this;
    }

    serialize() {
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
                ...numToVarInt(BigInt(scriptBytes.length)),
                ...scriptBytes,
                ...numToBytes(BigInt(input.sequence), 4),
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
        buffer = [...buffer, ...numToBytes(BigInt(this.lockTime), 4)];

        if (this.hasSaplingVersion) {
            const valueBalance = Buffer.alloc(8);
            valueBalance.writeBigInt64LE(BigInt(this.valueBalance));
            buffer = [
                ...buffer,
                Number(this.hasShieldData),
                ...valueBalance,
                ...numToVarInt(BigInt(this.shieldSpend.length)),
            ];
            for (const spend of this.shieldSpend) {
                buffer = [
                    ...buffer,
                    ...hexToBytes(spend.cv).reverse(),
                    ...hexToBytes(spend.anchor).reverse(),
                    ...hexToBytes(spend.nullifier).reverse(),
                    ...hexToBytes(spend.rk).reverse(),
                    ...hexToBytes(spend.proof),
                    ...hexToBytes(spend.spendAuthSig),
                ];
            }
            buffer = [
                ...buffer,
                ...numToVarInt(BigInt(this.shieldOutput.length)),
            ];
            for (const output of this.shieldOutput) {
                buffer = [
                    ...buffer,
                    ...hexToBytes(output.cv).reverse(),
                    ...hexToBytes(output.cmu).reverse(),
                    ...hexToBytes(output.ephemeralKey).reverse(),
                    ...hexToBytes(output.encCiphertext),
                    ...hexToBytes(output.outCiphertext),
                    ...hexToBytes(output.proof),
                ];
            }
            buffer = [...buffer, ...hexToBytes(this.bindingSig)];
        }

        return bytesToHex(buffer);
    }

    /**
     * Get the transaction hash of the indexth input
     * Using the sighash type SIGHASH_ALL
     */
    transactionHash(index) {
        if (this.hasSaplingVersion) {
            throw new Error('tx version too high, cannot use base tx hash');
        }
        const copy = structuredClone(this.__original);
        // Black out all inputs
        for (let i = 0; i < copy.vin.length; i++) {
            if (i !== index) copy.vin[i].scriptSig = '';
        }
        return bytesToHex(
            dSHA256([
                ...hexToBytes(this.serialize.bind(copy)()),
                //...hexToBytes(this.serialize()),
                ...numToBytes(1n, 4), // SIGHASH_ALL
            ])
        );
    }

    /**
     * Signs an input using the given wif
     * @param {number} index - Which vin to sign
     * @param {string} wif - base58 encoded private key
     * @param {object} [options]
     * @param {boolean} [isColdStake] - Whether or not we're signing a cold stake input
     */
    async signInput(index, wif, { isColdStake = false } = {}) {
        const pubkeyBytes = hexToBytes(
            deriveAddress({
                pkBytes: parseWIF(wif),
                output: 'COMPRESSED_HEX',
            })
        );
        const txhash = this.transactionHash(index);
        let signature = Array.from(
            await nobleSecp256k1.sign(txhash, parseWIF(wif), {
                canonical: true,
            })
        );
        signature.push(1); // SIGHASH_ALL

        this.vin[index].scriptSig = bytesToHex([
            signature.length,
            ...signature,
            // OP_FALSE to flag the redeeming of the delegation back to the Owner Address
            ...(isColdStake ? [OP['FALSE']] : []),
            pubkeyBytes.length,
            ...pubkeyBytes,
        ]);
    }
}

export class UTXO {
    /** @type {COutpoint} */
    outpoint;
    /**
     * @type {string} script in hex
     */
    script;
    /**
     * @type {number} value in satoshi
     */
    value;

    /**
     * @param {{outpoint: COutpoint, script: string, value: number}}
     */
    constructor({ outpoint, script, value }) {
        this.outpoint = outpoint;
        this.script = script;
        this.value = value;
    }
}
