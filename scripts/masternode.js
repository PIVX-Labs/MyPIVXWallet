class Masternode {
    constructor({privateKey, collateralTxId, outidx} = {}) {
	this.privateKey = privateKey;
	this.collateralTxId = collateralTxId;
	this.outidx = outidx;
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
}
