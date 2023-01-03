import { hexToBytes, bytesToHex, dSHA256 } from './utils.js';
import * as nobleSecp256k1 from '@noble/secp256k1';
import { BigInteger } from 'biginteger';
import bs58 from 'bs58';
import { OP } from './script.js';
import { deriveAddress, parseWIF, getDerivationPath } from './wallet.js';
import { sha256 } from '@noble/hashes/sha256';
import { cachedBlockCount } from './network.js';
import { cChainParams } from './chain_params.js';
import _ from 'lodash';

export default class bitjs {
    static get pub() {
        return cChainParams.current.PUBKEY_ADDRESS.toString(16);
    }

    static get priv() {
        return cChainParams.current.SECRET_KEY.toString(16);
    }

    static compressed = true;

    static transaction = class {
        version = 1;
        inputs = [];
        outputs = [];
        locktime = 0;
        addinput({
            txid,
            index,
            script,
            sequence,
            path = getDerivationPath(),
        }) {
            const o = {};
            o.outpoint = { hash: txid, index: index };
            o.script = hexToBytes(script); //push previous output pubkey script
            o.sequence = sequence || (this.locktime == 0 ? 4294967295 : 0);
            o.path = path;
            return this.inputs.push(o);
        }

        addoutput(address, value) {
            const o = {};
            let buf = [];
            const addrDecoded = this.addressDecode(address);
            o.value = new BigInteger('' + Math.round(value * 1 * 1e8), 10);
            buf.push(OP['DUP']);
            buf.push(OP['HASH160']);
            buf.push(addrDecoded.length);
            buf = [...buf, ...addrDecoded]; // address in bytes
            buf.push(OP['EQUALVERIFY']);
            buf.push(OP['CHECKSIG']);
            o.script = buf;
            return this.outputs.push(o);
        }

        addcoldstakingoutput(addr, addrColdStake, value) {
            const o = {};
            let buf = [];
            const addrDecoded = this.addressDecode(addr);
            const addrCSDecoded = this.addressDecode(addrColdStake);
            o.value = new BigInteger('' + Math.round(value * 1 * 1e8), 10);
            buf.push(OP['DUP']);
            buf.push(OP['HASH160']);
            buf.push(OP['ROT']);
            buf.push(OP['IF']);
            if (
                cachedBlockCount >= cChainParams.current.Consensus.UPGRADE_V6_0
            ) {
                buf.push(OP['CHECKCOLDSTAKEVERIFY']);
            } else {
                buf.push(OP['CHECKCOLDSTAKEVERIFY_LOF']);
            }
            buf.push(addrCSDecoded.length);
            buf = [...buf, ...addrCSDecoded]; // staking key in bytes
            buf.push(OP['ELSE']);
            buf.push(addrDecoded.length);
            buf = [...buf, ...addrDecoded]; // spending key in bytes
            buf.push(OP['ENDIF']);
            buf.push(OP['EQUALVERIFY']);
            buf.push(OP['CHECKSIG']);
            o.script = buf;
            return this.outputs.push(o);
        }

        // Only standard addresses
        addressDecode(address) {
            const bytes = bs58.decode(address);
            const front = bytes.slice(0, bytes.length - 4);
            const back = bytes.slice(bytes.length - 4);
            const checksum = dSHA256(front).slice(0, 4);
            if (checksum + '' == back + '') {
                return front.slice(1);
            }
        }
        /* generate the transaction hash to sign from a transaction input */
        transactionHash(index, sigHashType) {
            let clone = bitjs.clone(this);
            const shType = sigHashType || 1;

            /* black out all other ins, except this one */
            let i;
            const len = clone.inputs.length;
            for (i = 0; i < len; i++) {
                if (index != i) {
                    clone.inputs[i].script = [];
                }
            }

            if (clone.inputs && clone.inputs[index]) {
                /* SIGHASH : For more info on sig hashs see https://en.bitcoin.it/wiki/OP_CHECKSIG
		   and https://bitcoin.org/en/developer-guide#signature-hash-type */

                if (shType == 1) {
                    //SIGHASH_ALL 0x01
                } else if (shType == 2) {
                    //SIGHASH_NONE 0x02
                    clone.outputs = [];
                    let a;
                    for (a = 0; a < len; a++) {
                        if (index != a) {
                            clone.inputs[a].sequence = 0;
                        }
                    }
                } else if (shType == 3) {
                    //SIGHASH_SINGLE 0x03
                    clone.outputs.length = index + 1;
                    let a;
                    for (a = 0; a < index; a++) {
                        clone.outputs[a].value = -1;
                        clone.outputs[a].script = [];
                    }
                    let b;
                    for (b = 0; b < len; b++) {
                        if (index != b) {
                            clone.inputs[b].sequence = 0;
                        }
                    }
                } else if (shType >= 128) {
                    //SIGHASH_ANYONECANPAY 0x80
                    clone.inputs = [clone.inputs[index]];
                    if (shType == 129) {
                        // SIGHASH_ALL + SIGHASH_ANYONECANPAY
                    } else if (shType == 130) {
                        // SIGHASH_NONE + SIGHASH_ANYONECANPAY
                        clone.outputs = [];
                    } else if (shType == 131) {
                        // SIGHASH_SINGLE + SIGHASH_ANYONECANPAY
                        clone.outputs.length = index + 1;
                        let a;
                        for (a = 0; a < index; a++) {
                            clone.outputs[a].value = -1;
                            clone.outputs[a].script = [];
                        }
                    }
                }

                let buffer = hexToBytes(clone.serialize());
                buffer = new Uint8Array([
                    ...buffer,
                    ...bitjs.numToBytes(parseInt(shType), 4),
                ]);
                const hash = sha256(buffer);
                const r = bytesToHex(sha256(hash));
                return r;
            } else {
                return false;
            }
        }

        /* generate a signature from a transaction hash */
        async transactionSig(index, wif, sigHashType, txhash) {
            const nSigHashType = sigHashType || 1;
            const strHash = txhash || this.transactionHash(index, nSigHashType);
            if (!strHash) return false;

            // Parse the private key
            let bPrivkey = parseWIF(wif);

            // Generate low-s deterministic ECDSA signature as per RFC6979
            // [0] = Uint8Array(sig), [1] = Int(recovery_byte)
            let arrSig = await nobleSecp256k1.sign(strHash, bPrivkey, {
                canonical: true,
                recovered: true,
            });

            // Concat the Signature with the SigHashType byte, and return
            return [...arrSig[0], nSigHashType];
        }

        /* sign an input */
        async signinput(index, masterKey, sigHashType, txType = 'pubkey') {
            const strWIF = await masterKey.getPrivateKey(
                this.inputs[index].path
            );
            const bPubkeyBytes = hexToBytes(
                deriveAddress({
                    pkBytes: parseWIF(strWIF),
                    output: 'COMPRESSED_HEX',
                })
            );
            const nSigHashType = sigHashType || 1;

            // Create signature
            const sigBytes = await this.transactionSig(
                index,
                strWIF,
                nSigHashType
            );

            // Construct the redeem script
            let bScript = [];

            // Push the signature to the stack
            bScript.push(sigBytes.length);
            bScript = [...bScript, ...sigBytes];

            if (txType === 'coldstake') {
                // OP_FALSE to flag the redeeming of the delegation back to the Owner Address
                bScript.push(OP['FALSE']);
            }

            // Push the pubkey to the stack
            bScript.push(bPubkeyBytes.length);
            bScript = [...bScript, ...bPubkeyBytes];

            // Append as an input script
            this.inputs[index].script = bScript;
            return true;
        }

        /* sign inputs */
        async sign(masterKey, sigHashType, txType) {
            const shType = sigHashType || 1;
            let i;
            const len = this.inputs.length;
            for (i = 0; i < len; i++) {
                await this.signinput(i, masterKey, shType, txType);
            }
            return this.serialize();
        }

        /* serialize a transaction */
        serialize() {
            let buffer = [
                ...bitjs.numToBytes(parseInt(this.version), 4),
                ...bitjs.numToVarInt(this.inputs.length),
            ];
            for (const input of this.inputs) {
                buffer = [
                    ...buffer,
                    ...hexToBytes(input.outpoint.hash).reverse(),
                    ...bitjs.numToBytes(parseInt(input.outpoint.index), 4),
                    ...bitjs.numToVarInt(input.script.length),
                    ...input.script,
                    ...bitjs.numToBytes(parseInt(input.sequence), 4),
                ];
            }

            buffer = [...buffer, ...bitjs.numToVarInt(this.outputs.length)];
            for (const output of this.outputs) {
                buffer = [
                    ...buffer,
                    ...bitjs.numToBytes(output.value, 8),
                    ...bitjs.numToVarInt(output.script.length),
                    ...output.script,
                ];
            }
            buffer = [
                ...buffer,
                ...bitjs.numToBytes(parseInt(this.locktime), 4),
            ];
            return bytesToHex(buffer);
        }
    };
    static numToBytes(num, bytes) {
        if (typeof bytes === 'undefined') bytes = 8;
        if (bytes == 0) {
            return [];
        } else if (num == -1) {
            return hexToBytes('ffffffffffffffff');
        } else {
            return [num % 256].concat(
                bitjs.numToBytes(Math.floor(num / 256), bytes - 1)
            );
        }
    }

    static numToByteArray(num) {
        if (num <= 256) {
            return [num];
        } else {
            return [num % 256].concat(
                bitjs.numToByteArray(Math.floor(num / 256))
            );
        }
    }

    static numToVarInt(num) {
        if (num < 253) {
            return [num];
        } else if (num < 65536) {
            return [253].concat(bitjs.numToBytes(num, 2));
        } else if (num < 4294967296) {
            return [254].concat(bitjs.numToBytes(num, 4));
        } else {
            return [255].concat(bitjs.numToBytes(num, 8));
        }
    }

    static bytesToNum(bytes) {
        if (bytes.length == 0) return 0;
        else return bytes[0] + 256 * bitjs.bytesToNum(bytes.slice(1));
    }

    /* clone an object */
    static clone(obj) {
        return _.cloneDeep(obj);
    }

    static isValidDestination(address, base58Prefix) {
        const bytes = bs58.decode(address);
        if (bytes[0] != base58Prefix) {
            return false;
        }
        const front = bytes.slice(0, bytes.length - 4);
        const back = bytes.slice(bytes.length - 4);
        const checksum = dSHA256(front).slice(0, 4);
        if (checksum + '' == back + '') {
            return true;
        }
        return false;
    }
}
