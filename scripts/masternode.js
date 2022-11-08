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

    static numToBytes(number, numBytes=8, littleEndian = true) {
	const bytes = [];
	for(let i=0; i<numBytes; i++) {
	    const n = (number & (0xff << (8*i))) >> (8*i);
	    bytes.push(n < 0 ? n + 256 : n);
	}
	return littleEndian ? bytes : bytes.reverse();
    }

    static async getPingSignature(msg) {
	/*
	ss = bytes.fromhex(self.collateral["txid"])[::-1]
        ss += (self.collateral["txidn"]).to_bytes(4, byteorder='little')
        ss += bytes([0, 255, 255, 255, 255])
        ss += bytes.fromhex(block_hash)[::-1]
        ss += (self.sig_time).to_bytes(8, byteorder='little')
        return bitcoin.bin_dbl_sha256(ss)
	*/
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

    static async getToSign(msg) {
	const [ ip, port ] = msg.addr.split(":");
	const pk = "cQcvZYKoosUYNJMAcv8Gst2jghW2byQcMMV5opr7xNKoD5p1Tz8N";
	const publicKey = Crypto.util.hexToBytes(bitjs.wif2pubkey(pk).pubkey);
	const mnPk = "939nxGhAaqFx2eWqdufZwSWLuAt34mS4CpGV2ZriPw85cQPkkyW";
	const mnPublicKey = Crypto.util.hexToBytes(bitjs.wif2pubkey(mnPk).pubkey);

	const pkt = [
	    ...Masternode.numToBytes(1, 4, true),
	    ...Crypto.util.hexToBytes(Masternode.decodeIpAddress(ip, port)),
	    ...Masternode.numToBytes(msg.sigTime, 4, true),
	    ...[0,0,0,0],
	    ...Masternode.numToBytes(publicKey.length, 1, true),
	    ...publicKey,
	    ...Masternode.numToBytes(mnPublicKey.length, 1, true),
	    ...mnPublicKey,
	    ...Masternode.numToBytes(70926, 4, true),
	];
	const hash = new jsSHA(0, 0, {numRounds: 2});
	hash.update(pkt);
	return Crypto.util.bytesToHex(hash.getHash(0).reverse());
    }

    async getStartMessage() {
	const time = Math.round(Date.now() / 1000);
	/*
	  Message = [{collateral TXID, TXIDn, Scriptsig?, scriptseq? = 0xffffffff?}, ipv6map, collateral_in, delegate_in, len signature + signature, sigtime + version, {1*}, last_ping_block_hash, work_sig_time, len sig2 + sig2, 1, 1]
	*/
	let msg = [
	    ...Crypto.util.hexToBytes(this.collateralTxId),
	    ...Masternode.numToBytes(this.outidx, 4, true),
	    0, // check
	    ...Crypto.util.hexToBytes(Masternode.decodeIpAddress("127.0.0.1", 8080)),
	    0, // Pubkey
	    0, // Mn Pubkey
	    0, // Signature
	    ...Masternode.numToBytes(time, 8, true), // Time
	    ...Masternode.numToBytes(70915, 4, true), // Protocol version

	    ...Crypto.util.hexToBytes(this.collateralTxId),
	    ...Masternode.numToBytes(this.outidx, 4, true),
	    0, // check

	    ...Crypto.util.hexToBytes(this.collateralTxId), // Last ping block hash
	    ...Masternode.numToBytes(time, 8, true), // Time
	    0, // check
	    ...Masternode.numToBytes(1, 4, true), // Time
	    ...Masternode.numToBytes(1, 4, true), // Time
	];
	return msg;
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
    static broadcastMessageToHex(msg) {
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
    
    async startMasternode() {

	
    }
}
