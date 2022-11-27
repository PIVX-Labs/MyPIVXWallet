(function () {

	var bitjs = (typeof window === "undefined" ? self : window).bitjs = function () { };

	/* public vars */
	Object.defineProperty(bitjs, 'pub', { get() { return cChainParams.current.PUBKEY_ADDRESS.toString(16); } });
	Object.defineProperty(bitjs, 'priv', { get() { return cChainParams.current.SECRET_KEY.toString(16); } });
	bitjs.compressed = true;

	bitjs.transaction = function() {
		var btrx = {};
		btrx.version = 1;
		btrx.inputs = [];
		btrx.outputs = [];
		btrx.locktime = 0;

	    btrx.addinput = function({txid, index, script, sequence, path = getDerivationPath()}) {
			const o = {};
			o.outpoint = {'hash': txid, 'index': index};
			o.script = Crypto.util.hexToBytes(script); //push previous output pubkey script
		o.sequence = sequence || ((btrx.locktime==0) ? 4294967295 : 0);
		o.path = path;
			return this.inputs.push(o);
		}

		btrx.addoutput = function(address, value) {
			const o = {};
			let buf = [];
			const addrDecoded = btrx.addressDecode(address);
			o.value = new BigInteger('' + Math.round((value * 1) * 1e8), 10);
			buf.push(OP['DUP']);
			buf.push(OP['HASH160']);
			buf.push(addrDecoded.length);
			buf = buf.concat(addrDecoded); // address in bytes
			buf.push(OP['EQUALVERIFY']);
			buf.push(OP['CHECKSIG']);
			o.script = buf;
			return this.outputs.push(o);
		}

		btrx.addcoldstakingoutput = function(addr, addrColdStake, value) {
			const o = {};
			let buf = [];
			const addrDecoded = btrx.addressDecode(addr);
			const addrCSDecoded = btrx.addressDecode(addrColdStake);
			o.value = new BigInteger('' + Math.round((value * 1) * 1e8), 10);
			buf.push(OP['DUP']);
			buf.push(OP['HASH160']);
			buf.push(OP['ROT']);
			buf.push(OP['IF']);
			if(cachedBlockCount >= cChainParams.current.Consensus.UPGRADE_V6_0) {
				buf.push(OP['CHECKCOLDSTAKEVERIFY']);
			} else {
				buf.push(OP['CHECKCOLDSTAKEVERIFY_LOF']);
			}
			buf.push(addrCSDecoded.length);
			buf = buf.concat(addrCSDecoded); // staking key in bytes
			buf.push(OP['ELSE']);
			buf.push(addrDecoded.length);
			buf = buf.concat(addrDecoded); // spending key in bytes
			buf.push(OP['ENDIF']);
			buf.push(OP['EQUALVERIFY']);
			buf.push(OP['CHECKSIG']);
			o.script = buf;
			return this.outputs.push(o);
		}

		// Only standard addresses
		btrx.addressDecode = function(address) {
			const bytes = B58.decode(address);
			const front = bytes.slice(0, bytes.length-4);
			const back  = bytes.slice(bytes.length-4);
			const checksum = Crypto.SHA256(Crypto.SHA256(front, {asBytes: true}), {asBytes: true}).slice(0, 4);
			if (checksum + "" == back + "") {
				return front.slice(1);
			}
		}

		/* generate the transaction hash to sign from a transaction input */
		btrx.transactionHash = function(index, sigHashType) {
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


			if ((clone.inputs) && clone.inputs[index]) {

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

				let buffer = Crypto.util.hexToBytes(clone.serialize());
				buffer = buffer.concat(bitjs.numToBytes(parseInt(shType), 4));
				const hash = Crypto.SHA256(buffer, {asBytes: true});
				const r = Crypto.util.bytesToHex(Crypto.SHA256(hash, {asBytes: true}));
				return r;
			} else {
				return false;
			}
		}

		/* generate a signature from a transaction hash */
		btrx.transactionSig = async function(index, wif, sigHashType, txhash) {
			const nSigHashType = sigHashType || 1;
			const strHash = txhash || this.transactionHash(index, nSigHashType);
			if (!strHash) return false;

			// Parse the private key
			let bPrivkey = parseWIF(wif);

			// Generate low-s deterministic ECDSA signature as per RFC6979
			// [0] = Uint8Array(sig), [1] = Int(recovery_byte)
			let arrSig = await nobleSecp256k1.sign(strHash, bPrivkey, { canonical: true, recovered: true });

			// Concat the Signature with the SigHashType byte, and return
			return [...arrSig[0], nSigHashType];
		}

		/* sign an input */
		btrx.signinput = async function(index, masterKey, sigHashType, txType = 'pubkey') {
			const strWIF = await masterKey.getPrivateKey(this.inputs[index].path);
			const bPubkeyBytes = deriveAddress({pkBytes: parseWIF(strWIF), fNoEncoding: true});
			const nSigHashType = sigHashType || 1;

			// Create signature
			const sigBytes = await this.transactionSig(index, strWIF, nSigHashType);

			// Construct the redeem script
			let bScript = [];

			// Push the signature to the stack
			bScript.push(sigBytes.length);
			bScript = bScript.concat(sigBytes);

			if (txType === 'coldstake') {
				// OP_FALSE to flag the redeeming of the delegation back to the Owner Address
				bScript.push(OP['FALSE']);
			}

			// Push the pubkey to the stack
			bScript.push(bPubkeyBytes.length);
			bScript = bScript.concat(bPubkeyBytes);

			// Append as an input script
			this.inputs[index].script = bScript;
			return true;
		}

		/* sign inputs */
		btrx.sign = async function(masterKey, sigHashType, txType) {
			const shType = sigHashType || 1;
			let i;
			const len = this.inputs.length;
		        for (i = 0; i < len; i++) {
			    await this.signinput(i, masterKey, shType, txType);
			}
			return this.serialize();
		}


		/* serialize a transaction */
		btrx.serialize = function() {
			let buffer = [];
			buffer = buffer.concat(bitjs.numToBytes(parseInt(this.version), 4));
			buffer = buffer.concat(bitjs.numToVarInt(this.inputs.length));
			for (const input of this.inputs) {
				buffer = buffer.concat(Crypto.util.hexToBytes(input.outpoint.hash).reverse());
				buffer = buffer.concat(bitjs.numToBytes(parseInt(input.outpoint.index), 4));
				buffer = buffer.concat(bitjs.numToVarInt(input.script.length));
				buffer = buffer.concat(input.script);
				buffer = buffer.concat(bitjs.numToBytes(parseInt(input.sequence), 4));
			}

			buffer = buffer.concat(bitjs.numToVarInt(this.outputs.length));
			for (const output of this.outputs) {
				buffer = buffer.concat(bitjs.numToBytes(output.value, 8));
				buffer = buffer.concat(bitjs.numToVarInt(output.script.length));
				buffer = buffer.concat(output.script);
			}
			buffer = buffer.concat(bitjs.numToBytes(parseInt(this.locktime), 4));
			return Crypto.util.bytesToHex(buffer);
		}

		return btrx;
	}

	bitjs.numToBytes = function(num, bytes) {
		if (typeof bytes === "undefined") bytes = 8;
		if (bytes == 0) {
			return [];
		} else if (num == -1) {
			return Crypto.util.hexToBytes("ffffffffffffffff");
		} else {
			return [num % 256].concat(bitjs.numToBytes(Math.floor(num / 256), bytes - 1));
		}
	}

	bitjs.numToByteArray = function(num) {
		if (num <= 256) {
			return [num];
		} else {
			return [num % 256].concat(bitjs.numToByteArray(Math.floor(num / 256)));
		}
	}

	bitjs.numToVarInt = function(num) {
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

	bitjs.bytesToNum = function(bytes) {
		if (bytes.length == 0) return 0;
		else return bytes[0] + 256 * bitjs.bytesToNum(bytes.slice(1));
	}

	/* clone an object */
	bitjs.clone = function(obj) {
		if (obj == null || typeof(obj) != 'object') return obj;
		let temp = new obj.constructor();

		for (let key in obj) {
			if (obj.hasOwnProperty(key)) {
				temp[key] = bitjs.clone(obj[key]);
			}
		}
		return temp;
	}

	bitjs.isValidDestination = function (address, base58Prefix) {
		const bytes = B58.decode(address);
		if (bytes[0] != base58Prefix) {
			return false;
		}
		const front = bytes.slice(0, bytes.length-4);
		const back  = bytes.slice(bytes.length-4);
		const checksum = Crypto.SHA256(Crypto.SHA256(front, {asBytes: true}), {asBytes: true}).slice(0, 4);
		if (checksum + "" == back + "") {
			return true;
		}
		return false;
	}

		var B58 = bitjs.Base58 = {
		alphabet: "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz",
		validRegex: /^[1-9A-HJ-NP-Za-km-z]+$/,
		base: BigInteger.valueOf(58),

		/**
		* Convert a byte array to a base58-encoded string.
		*
		* Written by Mike Hearn for BitcoinJ.
		*   Copyright (c) 2011 Google Inc.
		*
		* Ported to JavaScript by Stefan Thomas.
		*/
		encode: function (input) {
			let bi = BigInteger.fromByteArrayUnsigned(input);
			const chars = [];

			while (bi.compareTo(B58.base) >= 0) {
				const mod = bi.mod(B58.base);
				chars.unshift(B58.alphabet[mod.intValue()]);
				bi = bi.subtract(mod).divide(B58.base);
			}
			chars.unshift(B58.alphabet[bi.intValue()]);

			// Convert leading zeros too.
			for (const byteIn of input) {
				if (byteIn == 0x00) {
					chars.unshift(B58.alphabet[0]);
				} else break;
			}

			return chars.join('');
		},

		/**
		* Convert a base58-encoded string to a byte array.
		*
		* Written by Mike Hearn for BitcoinJ.
		*   Copyright (c) 2011 Google Inc.
		*
		* Ported to JavaScript by Stefan Thomas.
		*/
		decode: function (input) {
			let bi = BigInteger.valueOf(0);
			let leadingZerosNum = 0;
			for (let i = input.length - 1; i >= 0; i--) {
				const alphaIndex = B58.alphabet.indexOf(input[i]);
				if (alphaIndex < 0) {
				  throw new Error("Invalid character");
				}
				bi = bi.add(BigInteger.valueOf(alphaIndex)
								.multiply(B58.base.pow(input.length - 1 - i)));

				// This counts leading zero bytes
				if (input[i] == "1") leadingZerosNum++;
				else leadingZerosNum = 0;
			}
			const bytes = bi.toByteArrayUnsigned();

			// Add leading zeros
			while (leadingZerosNum-- > 0) bytes.unshift(0);

			return bytes;
		}
	}
	return bitjs;

})();
