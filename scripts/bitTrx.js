(function () {

	var bitjs = (typeof window === "undefined" ? self : window).bitjs = function () { };

	/* public vars */
	Object.defineProperty(bitjs, 'pub', { get() { return cChainParams.current.PUBKEY_ADDRESS.toString(16); } });
	Object.defineProperty(bitjs, 'priv', { get() { return cChainParams.current.SECRET_KEY.toString(16); } });
	bitjs.compressed = true;

	/* convert a wif key back to a private key */
	bitjs.wif2privkey = function(wif) {
		let compressed = false;
		const decode = B58.decode(wif);
		let key = decode.slice(0, decode.length-4);
		key = key.slice(1, key.length);
		if (key.length >=33 && key[key.length-1] == 0x01) {
			key = key.slice(0, key.length-1);
			compressed = true;
		}
		return {'privkey': Crypto.util.bytesToHex(key), 'compressed':compressed};
	}

	/* convert a wif to a pubkey */
	bitjs.wif2pubkey = function(wif) {
		const compressed = bitjs.compressed;
		const r = bitjs.wif2privkey(wif);
		bitjs.compressed = r['compressed'];
		const pubkey = bitjs.newPubkey(r['privkey']);
		bitjs.compressed = compressed;
		return {'pubkey':pubkey,'compressed':r['compressed']};
	}

	/* generate a public key from a private key */
	bitjs.newPubkey = function(hash) {
		const privkeyBigInt = BigInteger.fromByteArrayUnsigned(Crypto.util.hexToBytes(hash));
		const curve = EllipticCurve.getSECCurveByName("secp256k1");

		const curvePt = curve.getG().multiply(privkeyBigInt);
		const x = curvePt.getX().toBigInteger();
		const y = curvePt.getY().toBigInteger();

		let pubkeyBytes = EllipticCurve.integerToBytes(x, 32);
		pubkeyBytes = pubkeyBytes.concat(EllipticCurve.integerToBytes(y,32));
		pubkeyBytes.unshift(0x04);

		if (bitjs.compressed == true) {
			const publicKeyBytesCompressed = EllipticCurve.integerToBytes(x,32)
			if (y.isEven()) {
				publicKeyBytesCompressed.unshift(0x02)
			} else {
				publicKeyBytesCompressed.unshift(0x03)
			}
			return Crypto.util.bytesToHex(publicKeyBytesCompressed);
		} else {
			return Crypto.util.bytesToHex(pubkeyBytes);
		}
	}

	bitjs.transaction = function() {
		var btrx = {};
		btrx.version = 1;
		btrx.inputs = [];
		btrx.outputs = [];
		btrx.locktime = 0;

		btrx.addinput = function(txid, index, script, sequence) {
			const o = {};
			o.outpoint = {'hash': txid, 'index': index};
			o.script = Crypto.util.hexToBytes(script); //push previous output pubkey script
			o.sequence = sequence || ((btrx.locktime==0) ? 4294967295 : 0);
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
			buf.push(OP['CHECKCOLDSTAKEVERIFY']);
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
		btrx.transactionSig = function(index, wif, sigHashType, txhash) {

			function serializeSig(r, s) {
				const rBa = r.toByteArraySigned();
				const sBa = s.toByteArraySigned();

				let sequence = [];
				sequence.push(0x02); // INTEGER
				sequence.push(rBa.length);
				sequence = sequence.concat(rBa);

				sequence.push(0x02); // INTEGER
				sequence.push(sBa.length);
				sequence = sequence.concat(sBa);

				sequence.unshift(sequence.length);
				sequence.unshift(0x30); // SEQUENCE

				return sequence;
			}

			const shType = sigHashType || 1;
			const hash = txhash || Crypto.util.hexToBytes(this.transactionHash(index, shType));

			if (hash) {
				const curve = EllipticCurve.getSECCurveByName("secp256k1");
				const key = bitjs.wif2privkey(wif);
				const priv = BigInteger.fromByteArrayUnsigned(Crypto.util.hexToBytes(key['privkey']));
				const n = curve.getN();
				const e = BigInteger.fromByteArrayUnsigned(hash);
				let badrs = 0
				let r, s;
				do {
					const k = this.deterministicK(wif, hash, badrs);
					const G = curve.getG();
					const Q = G.multiply(k);
					r = Q.getX().toBigInteger().mod(n);
					s = k.modInverse(n).multiply(e.add(priv.multiply(r))).mod(n);
					badrs++
				} while (r.compareTo(BigInteger.ZERO) <= 0 || s.compareTo(BigInteger.ZERO) <= 0);

				// Force lower s values per BIP62
				const halfn = n.shiftRight(1);
				if (s.compareTo(halfn) > 0) {
					s = n.subtract(s);
				};

				const sig = serializeSig(r, s);
				sig.push(parseInt(shType, 10));

				return Crypto.util.bytesToHex(sig);
			} else {
				return false;
			}
		}

		// https://tools.ietf.org/html/rfc6979#section-3.2
		btrx.deterministicK = function(wif, hash, badrs) {
			// if r or s were invalid when this function was used in signing,
			// we do not want to actually compute r, s here for efficiency, so,
			// we can increment badrs. explained at end of RFC 6979 section 3.2

			// wif is b58check encoded wif privkey.
			// hash is byte array of transaction digest.
			// badrs is used only if the k resulted in bad r or s.

			// some necessary things out of the way for clarity.
			badrs = badrs || 0;
			const key = bitjs.wif2privkey(wif);
			const x = Crypto.util.hexToBytes(key['privkey'])
			const curve = EllipticCurve.getSECCurveByName("secp256k1");
			const N = curve.getN();

			// Step: a
			// hash is a byteArray of the message digest. so h1 == hash in our case

			// Step: b
			let v = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];

			// Step: c
			let k = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

			// Step: d
			k = Crypto.HMAC(Crypto.SHA256, v.concat([0]).concat(x).concat(hash), k, { asBytes: true });

			// Step: e
			v = Crypto.HMAC(Crypto.SHA256, v, k, { asBytes: true });

			// Step: f
			k = Crypto.HMAC(Crypto.SHA256, v.concat([1]).concat(x).concat(hash), k, { asBytes: true });

			// Step: g
			v = Crypto.HMAC(Crypto.SHA256, v, k, { asBytes: true });

			// Step: h1
			let T = [];

			// Step: h2 (since we know tlen = qlen, just copy v to T.)
			v = Crypto.HMAC(Crypto.SHA256, v, k, { asBytes: true });
			T = v;

			// Step: h3
			let KBigInt = BigInteger.fromByteArrayUnsigned(T);

			// loop if KBigInt is not in the range of [1, N-1] or if badrs needs incrementing.
			let i = 0;
			while (KBigInt.compareTo(N) >= 0 || KBigInt.compareTo(BigInteger.ZERO) <= 0 || i < badrs) {
				k = Crypto.HMAC(Crypto.SHA256, v.concat([0]), k, { asBytes: true });
				v = Crypto.HMAC(Crypto.SHA256, v, k, { asBytes: true });
				v = Crypto.HMAC(Crypto.SHA256, v, k, { asBytes: true });
				T = v;
				KBigInt = BigInteger.fromByteArrayUnsigned(T);
				i++
			};

			return KBigInt;
		};

    	/* sign a "standard" input */
		btrx.signinput = function(index, wif, sigHashType, txType = 'pubkey') {
			const key = bitjs.wif2pubkey(wif);
			const shType = sigHashType || 1;
			var buf = [];
			const signature = this.transactionSig(index, wif, shType);
			const sigBytes = Crypto.util.hexToBytes(signature);
			buf.push(sigBytes.length);
			buf = buf.concat(sigBytes);
			if (txType === 'coldstake') {
				//OP_FALSE to flag the redeeming of the delegation back to the Owner Address
				buf.push(OP['FALSE']);
			}
			const pubkeyBytes = Crypto.util.hexToBytes(key['pubkey']);
			console.log(pubkeyBytes.toString(),"pubkeyBytes generated from private key")
			buf.push(pubkeyBytes.length);
			buf = buf.concat(pubkeyBytes);
			this.inputs[index].script = buf;
			return true;
		}

		/* sign inputs */
		btrx.sign = function(wif, sigHashType, txType) {
			const shType = sigHashType || 1;
			let i;
			const len = this.inputs.length;
			for (i = 0; i < len; i++) {
				this.signinput(i, wif, shType, txType);
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
					throw "Invalid character";
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
