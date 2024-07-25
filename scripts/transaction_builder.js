import { Transaction, CTxIn, CTxOut, COutpoint } from './transaction.js';
import bs58 from 'bs58';
import { OP } from './script.js';
import { hexToBytes, bytesToHex, dSHA256 } from './utils.js';
import { isShieldAddress, isExchangeAddress } from './misc.js';
import { SAPLING_TX_VERSION } from './chain_params.js';
import { numToVarInt } from './encoding.js';
/**
 * @class Builds a non-signed transaction
 */
export class TransactionBuilder {
    #transaction = new Transaction();
    #valueIn = 0;
    #valueOut = 0;

    // Part of the tx fee that has been already handled
    #handledFee = 0;
    static MIN_FEE_PER_BYTE = 10;
    // This number is larger or equal than the max size of the script sig for a P2CS and P2PKH transaction
    static SCRIPT_SIG_MAX_SIZE = 108;

    get valueIn() {
        return this.#valueIn;
    }

    get valueOut() {
        return this.#valueOut;
    }

    get value() {
        return this.#valueIn - this.#valueOut;
    }
    /**
     * See if the given CTxOut is plain dust
     * @param{{out:CTxOut, value: number}}
     */
    isDust({ out, value }) {
        // Dust is a transaction such that its creation costs more than its value
        return (
            value < out.serialize().length * TransactionBuilder.MIN_FEE_PER_BYTE
        );
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

    /**
     * @returns {number} Amount of fee in sats of a standard transaction based on the
     * number of inputs and outputs
     */
    static getStandardTxFee(nInputs, nOutputs) {
        const inputVarIntLength = numToVarInt(nInputs).length;
        const outputVarIntLength = numToVarInt(nOutputs).length;
        return (
            (nInputs * (TransactionBuilder.SCRIPT_SIG_MAX_SIZE + 41) +
                nOutputs * 34 +
                8 +
                inputVarIntLength +
                outputVarIntLength) *
            TransactionBuilder.MIN_FEE_PER_BYTE
        );
    }

    getFee() {
        //TODO: find a cleaner way to add the dummy signature
        let scriptSig = [];
        for (let vin of this.#transaction.vin) {
            scriptSig.push(vin.scriptSig);
            // Insert a dummy signature just to compute fees
            vin.scriptSig = bytesToHex(
                Array(TransactionBuilder.SCRIPT_SIG_MAX_SIZE).fill(0)
            );
        }

        const fee =
            Math.ceil(this.#transaction.serialize().length / 2) *
                TransactionBuilder.MIN_FEE_PER_BYTE -
            this.#handledFee;
        // Re-insert whatever was inside before
        for (let i = 0; i < scriptSig.length; i++) {
            this.#transaction.vin[i].scriptSig = scriptSig[i];
        }
        return fee;
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

    #addScript({ script, value, subtractFeeFromAmt = false }) {
        let out = new CTxOut({
            script: bytesToHex(script),
            value,
        });
        // if subtractFeeFromAmt has been set do NOT add dust
        // We would end up with an UTXO with negative value
        if (this.isDust({ out, value }) && subtractFeeFromAmt) {
            return;
        }
        const fee =
            out.serialize().length * TransactionBuilder.MIN_FEE_PER_BYTE;
        // We have subtracted fees from the value, mark this fee as handled (don't pay them again)
        if (subtractFeeFromAmt) {
            out.value -= fee;
            this.#handledFee += fee;
        }
        this.#transaction.vout.push(out);
        this.#valueOut += out.value;
    }

    /**
     * Adds a P2PKH output to the transaction
     * @param {{address: string, value: number, isChange: boolean}}
     * @returns {TransactionBuilder}
     */
    #addP2pkhOutput({ address, value, isChange }) {
        const decoded = this.#decodeAddress(address);
        const script = [
            OP['DUP'],
            OP['HASH160'],
            decoded.length,
            ...decoded,
            OP['EQUALVERIFY'],
            OP['CHECKSIG'],
        ];
        this.#addScript({ script, value, subtractFeeFromAmt: isChange });
    }

    /**
     * Adds an output to the transaction
     * @param {{address: string, value: number, isChange: boolean}}
     * @returns {TransactionBuilder}
     */
    addOutput({ address, value, isChange = false }) {
        if (isShieldAddress(address)) {
            this.#addShieldOutput({ address, value });
        } else if (isExchangeAddress(address)) {
            this.#addExchangeOutput({ address, value });
        } else {
            this.#addP2pkhOutput({ address, value, isChange });
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
    addColdStakeOutput({ address, addressColdStake, value, isChange }) {
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
        this.#addScript({ script, value, subtractFeeFromAmt: isChange });
        return this;
    }

    // Equally subtract a value from every output of the tx
    equallySubtractAmt(value) {
        const tx = this.#transaction;
        let first = true;
        const outputs = tx.vout.length;
        if (!outputs || outputs == 0) {
            throw new Error('tx has no outputs!');
        }
        for (let vout of tx.vout) {
            vout.value -= Math.floor(value / outputs);
            // The first pays the remainder
            if (first) {
                vout.value -= value % outputs;
                first = false;
            }
        }
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
