import { Transaction, CTxIn, CTxOut, COutpoint } from './transaction.js';
import bs58 from 'bs58';
import { OP } from './script.js';
import { hexToBytes, bytesToHex, dSHA256 } from './utils.js';
/**
 * @class Builds a non-signed transaction
 */
export class TransactionBuilder {
    #transaction = new Transaction();
    #valueIn = 0;
    #valueOut = 0;

    get valueIn() {
        return this.#valueIn;
    }

    get valueOut() {
        return this.#valueOut;
    }

    get value() {
        return this.#valueIn - this.#valueOut;
    }

    constructor() {
        this.#transaction.version = 1;
        this.#transaction.blockHeight = -1; // Not yet sent
        this.#transaction.blockTime = -1;
        this.#transaction.lockTime = 0;
    }

    /**
     * Utility function to make chaining easier to read.
     */
    static create() {
        return new TransactionBuilder();
    }

    getFee() {
        // Temporary: 50 sats per byte
        return this.#transaction.serialize().length * 50;
    }

    /**
     * @returns {TransactionBuilder}
     */
    #addInput({ txid, n, scriptSig }) {
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
     * Add an unspent transaction output to the inputs
     * @param {UTXO} utxo
     * @returns {TransactionBuilder}
     */
    addUTXO(utxo) {
        this.#addInput({
            txid: utxo.outpoint.txid,
            n: utxo.outpoint.n,
            scriptSig: utxo.script,
        });
        this.#valueIn += utxo.value;
        return this;
    }

    /**
     * Add an array of UTXOs to the inputs
     * @param {CTxOut[]} utxos
     * @returns {TransactionBuilder}
     */
    addUTXOs(utxos) {
        for (const utxo of utxos) {
            this.addUTXO(utxo);
        }
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
        this.#valueOut += value;
        return this;
    }

    addOutputs(outputs) {
        for (const output of outputs) {
            this.addOutput(output);
        }
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
        const tx = this.#transaction;
        this.#transaction = null;
        return tx;
    }
}
