class Masternode {
    constructor({walletPrivateKey, mnPrivateKey, collateralTxId, outidx, ip, port} = {}) {
	this.walletPrivateKey = walletPrivateKey;
	this.mnPrivateKey = mnPrivateKey;
	this.collateralTxId = collateralTxId;
	this.outidx = outidx;
	this.ip = ip;
	this.port = port;
    }

    async getMasternodeStatus() {
	const url = `http://contabo-vps:8080/listmasternodes?params=${this.collateralTxId}`;
	const masternodes = (await (await fetch(url)).json()).filter(m=>m.outidx === this.outidx);
	if(masternodes.length > 0) {
	    return masternodes[0].status;
	} else {
	    return "NOT_FOUND";
	}
    }

    static decodeIpAddress(ip, port) {
	// Only ipv4 for now
	let start = '00000000000000000000ffff';
	for (const digit of ip.split('.').map(n=>parseInt(n))) {
	    start += ('0' + (digit).toString(16)).slice(-2);
	}
	start += Crypto.util.bytesToHex(Masternode.numToBytes(port, 2, false));
	return start;
    }


    // TODO: it doesn't really work that well...
    static numToBytes(number, numBytes=8, littleEndian = true) {
	const bytes = [];
	for(let i=0; i<numBytes; i++) {
	    const n = (number & (0xff << (8*i))) >> (8*i);
	    bytes.push(n < 0 ? n + 256 : n);
	}
	return littleEndian ? bytes : bytes.reverse();
    }

    // Get message to be signed with mn private key.
    static async getPingSignature(msg) {
	const ping = [
	    ...Crypto.util.hexToBytes(msg.vin.txid).reverse(),
	    ...Masternode.numToBytes(msg.vin.idx, 4, true),
	    ...[0, 255, 255, 255, 255],
	    ...Crypto.util.hexToBytes(msg.blockhash).reverse(),
	    ...Masternode.numToBytes(msg.sigtime, 4, true),
	    ...[0,0,0,0]
	];
	const hash = new jsSHA(0, 0, {numRounds: 2});
	hash.update(ping);
	return hash.getHash(0);
    }

    // Get message to be signed with collateral private key.
    // Needs to be padded with "\x18DarkNet Signed Message:\n" + Message length + Message
    // Then hashed two times with SHA256
    static getToSign(msg) {
	const [ ip, port ] = msg.addr.split(":");
	const pk = "cQcvZYKoosUYNJMAcv8Gst2jghW2byQcMMV5opr7xNKoD5p1Tz8N";
	const publicKey = Crypto.util.hexToBytes(bitjs.wif2pubkey(pk).pubkey);
	const mnPk = "939nxGhAaqFx2eWqdufZwSWLuAt34mS4CpGV2ZriPw85cQPkkyW";
	const mnPublicKey = Crypto.util.hexToBytes(bitjs.wif2pubkey(mnPk).pubkey);

	const pkt = [
	    ...Masternode.numToBytes(1, 4, true), // Message version
	    ...Crypto.util.hexToBytes(Masternode.decodeIpAddress(ip, port)), // Encoded ip + port
	    ...Masternode.numToBytes(msg.sigTime, 4, true), // Sig time (Should be 8 bytes, but numToBytes is bugged at the moment)
	    ...[0,0,0,0], // Still Sig time
	    ...Masternode.numToBytes(publicKey.length, 1, true), // Collateral public key length
	    ...publicKey,
	    ...Masternode.numToBytes(mnPublicKey.length, 1, true), // Masternode public key length
	    ...mnPublicKey,
	    ...Masternode.numToBytes(70926, 4, true), // Protocol version
	];
	const hash = new jsSHA(0, 0, {numRounds: 2});
	hash.update(pkt);
	// It's important to note that the thing to be signed is the hex representation of the hash, not the bytes
	return Crypto.util.bytesToHex(hash.getHash(0).reverse());
    }


    /*
      {
      "vin": "COutPoint(84f9c4c5e5, 1)",
      "addr": "194.195.87.248:51474",
      "pubkeycollateral": "y7SDy2Kz1uNXUNvd7Qv46AUwRDygLXFTUS",
      "pubkeymasternode": "y2yFoc5h3cELCRd9utBdPA76fTTafgHxrE",
      "vchsig": "H1DsyMVNzSFdR4w1ohi4B70+Pz8PhWKSA5gkeIIavyfDTUq5m8u3lSCbGdzvGx4nwvCJvm9tGQLe00Fjdvf4Fz8=",
      "sigtime": 1667745528,
      "sigvalid": "true",
      "protocolversion": 70926,
      "nMessVersion": 1,
      "lastping": {
          "vin": "COutPoint(84f9c4c5e5, 1)",
	  "blockhash": "58a26d334bf6f79a45d79285f869979edd6bc9ae7cd27455f4a52304a81399fe",
	  "sigtime": 1667745528,
	  "sigvalid": "true",
	  "vchsig": "HGU1myelMvqp+CSbJ/6zrGeqNN451McXF+JqrWCg9Hu6QjUSSNzmdGjY4By18VT22rtv1nT/ll4QG/psC84n4hA=",
	  "nMessVersion": 1
	  }
	  }
    */

    // Get the message to start a masternode.
    // It needs to have two signatures: `getPingSignature()` which is signed
    // With the masternode private key, and `getToSign()` which is signed with
    // The collateral private key
    broadcastMessageToHex(msg) {
	const [ ip, port ] = msg.addr.split(":");
	const pk = "cQcvZYKoosUYNJMAcv8Gst2jghW2byQcMMV5opr7xNKoD5p1Tz8N";
	const publicKey = Crypto.util.hexToBytes(bitjs.wif2pubkey(pk).pubkey);
	const mnPk = "939nxGhAaqFx2eWqdufZwSWLuAt34mS4CpGV2ZriPw85cQPkkyW";
	const mnPublicKey = Crypto.util.hexToBytes(bitjs.wif2pubkey(mnPk).pubkey);
	const sig_bytes = base64_to_buf(msg.vchsig);
	const sigping_bytes = base64_to_buf(msg.vchsigPing);
	console.log(port);
	console.log(Masternode.decodeIpAddress(ip, port));
	return[
	    ...Crypto.util.hexToBytes(msg.vin.txid).reverse(),
	    ...Masternode.numToBytes(msg.vin.idx, 4, true),
	    ...Masternode.numToBytes(0, 1, true),
	    ...Masternode.numToBytes(0xffffffff, 4, true),
	    ...Crypto.util.hexToBytes(Masternode.decodeIpAddress(ip, port)),
	    ...Masternode.numToBytes(publicKey.length, 1, true),
	    ...publicKey,
	    ...Masternode.numToBytes(mnPublicKey.length, 1, true),
	    ...mnPublicKey,
	    ...Masternode.numToBytes(sig_bytes.length, 1, true),
	    ...sig_bytes,
	    ...Masternode.numToBytes(msg.sigtime, 4, true),
	    ...Masternode.numToBytes(0, 4, true),
	    ...Masternode.numToBytes(70926, 4, true),
	    ...Crypto.util.hexToBytes(msg.vin.txid).reverse(),
	    ...Masternode.numToBytes(msg.vin.idx, 4, true),
	    ...Masternode.numToBytes(0, 1, true),
	    ...Masternode.numToBytes(0xffffffff, 4, true),
	    ...Crypto.util.hexToBytes(msg.blockhash).reverse(),
	    ...Masternode.numToBytes(msg.sigtime, 4, true),
	    ...Masternode.numToBytes(0, 4, true),
	    ...Masternode.numToBytes(sigping_bytes.length, 1, true),
	    ...sigping_bytes,
	    ...Masternode.numToBytes(1, 4, true),
	    ...Masternode.numToBytes(1, 4, true),
	];
    }
}
