import { Transaction, CTxIn, CTxOut, COutpoint } from './transaction.js';
import bs58 from 'bs58';
import { OP } from './script.js';
import { hexToBytes, bytesToHex, dSHA256 } from './utils.js';
import { isShieldAddress, isExchangeAddress } from './misc.js';
import { SAPLING_TX_VERSION } from './chain_params.js';
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
            return Array.from(front.slice(isExchangeAddress(address) ? 3 : 1));
        }
        throw new Error('Invalid address');
    }

    /**
     * Add a shield output. Automatically called by `addOutput`
     * @param {{address: string, value: number}}
     * @returns {TransactionBuilder}
     */
    #addShieldOutput({ address, value }) {
        this.#transaction.version = SAPLING_TX_VERSION;
        // We don't know how to create shieldData, so we create
        // a dummy object so we can pass it later to the Shield library
        // upon signing.
        // This is similar to how we temporarely use the UTXO script instead
        // of the scriptSig because we don't know how to sign it
        this.#transaction.shieldOutput.push({ address, value });
        return this;
    }

    /**
     * Add an exchange output to the transaction.
     * @param{{address:string, value: number}}
     */
    #addExchangeOutput({ address, value }) {
        const decoded = this.#decodeAddress(address);
        const script = [
            OP['EXCHANGEADDR'],
            OP['DUP'],
            OP['HASH160'],
            decoded.length,
            ...decoded,
            OP['EQUALVERIFY'],
            OP['CHECKSIG'],
        ];
        this.#addScript({ script, value });
    }

    #addScript({ script, value }) {
        this.#transaction.vout.push(
            new CTxOut({
                script: bytesToHex(script),
                value,
            })
        );
        this.#valueOut += value;
    }

    /**
     * Adds a P2PKH output to the transaction
     * @param {{address: string, value: number}}
     * @returns {TransactionBuilder}
     */
    #addP2pkhOutput({ address, value }) {
        const decoded = this.#decodeAddress(address);
        const script = [
            OP['DUP'],
            OP['HASH160'],
            decoded.length,
            ...decoded,
            OP['EQUALVERIFY'],
            OP['CHECKSIG'],
        ];
        this.#addScript({ script, value });
    }

    /**
     * Adds an output to the transaction
     * @param {{address: string, value: number}}
     * @returns {TransactionBuilder}
     */
    addOutput({ address, value }) {
        if (isShieldAddress(address)) {
            this.#addShieldOutput({ address, value });
        } else if (isExchangeAddress(address)) {
            this.#addExchangeOutput({ address, value });
        } else {
            this.#addP2pkhOutput({ address, value });
        }

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
        this.#addScript({
            script: [OP['RETURN'], 32, ...hexToBytes(hash)],
            value,
        });
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
        if (tx && !tx.vin.length) {
            // If the tx doesn't have any clear inputs,
            // it must be a shield transaction
            tx.version = SAPLING_TX_VERSION;
        }
        this.#transaction = null;
        return tx;
    }
}
