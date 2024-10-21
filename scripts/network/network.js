import { isStandardAddress, isXPub } from '../misc.js';
import { cNode } from '../settings.js';
import { Transaction } from '../transaction.js';

/**
 * @typedef {Object} XPUBAddress
 * @property {string} type - Type of address (always 'XPUBAddress' for XPUBInfo classes)
 * @property {string} name - PIVX address string
 * @property {string} path - BIP44 path of the address derivation
 * @property {number} transfers - Number of transfers involving the address
 * @property {number} decimals - Decimal places in the amounts (PIVX has 8 decimals)
 * @property {string} balance - Current balance of the address (satoshi)
 * @property {string} totalReceived - Total ever received by the address (satoshi)
 * @property {string} totalSent - Total ever sent from the address (satoshi)
 */

/**
 * @typedef {Object} XPUBInfo
 * @property {number} page - Current response page in a paginated data
 * @property {number} totalPages - Total pages in the paginated data
 * @property {number} itemsOnPage - Number of items on the current page
 * @property {string} address - XPUB string of the address
 * @property {string} balance - Current balance of the xpub (satoshi)
 * @property {string} totalReceived - Total ever received by the xpub (satoshi)
 * @property {string} totalSent - Total ever sent from the xpub (satoshi)
 * @property {string} unconfirmedBalance - Unconfirmed balance of the xpub (satoshi)
 * @property {number} unconfirmedTxs - Number of unconfirmed transactions of the xpub
 * @property {number} txs - Total number of transactions of the xpub
 * @property {string[]?} txids - Transaction ids involving the xpub
 * @property {number?} usedTokens - Number of used token addresses from the xpub
 * @property {XPUBAddress[]?} tokens - Array of used token addresses
 */

/**
 * Virtual class representing any network backend
 *
 */
export class Network {
    constructor() {
        if (this.constructor === Network) {
            throw new Error('Initializing virtual class');
        }
    }

    async getBlock(blockHeight, skipCoinstake) {
        throw new Error('getBlockCount must be implemented');
    }

    async getTxPage(nStartHeight, addr, n) {
        throw new Error('getTxPage must be implemented');
    }

    async getNumPages(nStartHeight, addr) {
        throw new Error('getNumPages must be implemented');
    }

    async getUTXOs(strAddress) {
        throw new Error('getUTXOs must be implemented');
    }

    async getXPubInfo(strXPUB) {
        throw new Error('getXPubInfo must be implemented');
    }

    async getShieldBlockList() {
        throw new Error('getShieldBlockList must be implemented');
    }

    async getBlockCount() {
        throw new Error('getBlockCount must be implemented');
    }

    async getBestBlockHash() {
        throw new Error('getBestBlockHash must be implemented');
    }

    async sendTransaction(hex) {
        throw new Error('sendTransaction must be implemented');
    }

    async getTxInfo(_txHash) {
        throw new Error('getTxInfo must be implemented');
    }
}

/**
 * Network realization with a blockbook Explorer
 */
export class ExplorerNetwork extends Network {
    /**
     * @param {string} strUrl - Url pointing to the blockbook explorer
     */
    constructor(strUrl) {
        super();
        /**
         * @type{string}
         * @public
         */
        this.strUrl = strUrl;
    }

    /**
     * Fetch a block from the explorer given the height
     * @param {number} blockHeight
     * @param {boolean} skipCoinstake - if true coinstake tx will be skipped
     * @returns {Promise<Object>} the block fetched from explorer
     */
    async getBlock(blockHeight, skipCoinstake = false) {
        const req = await this.fetchBlockbook(`/api/v2/block/${blockHeight}`);
        const block = await req.json();
        const newTxs = [];
        // This is bad. We're making so many requests
        // This is a quick fix to try to be compliant with the blockbook
        // API, and not the PIVX extension.
        // In the Blockbook API /block doesn't have any chain specific information
        // Like hex, shield info or what not.
        // We could change /getshieldblocks to /getshieldtxs?
        // In addition, always skip the coinbase transaction and in case the coinstake one
        // TODO: once v6.0 and shield stake is activated we might need to change this optimization
        for (const tx of block.txs.slice(skipCoinstake ? 2 : 1)) {
            const r = await fetch(
                `${this.strUrl}/api/v2/tx-specific/${tx.txid}`
            );
            if (!r.ok) throw new Error('failed');
            const newTx = await r.json();
            newTxs.push(newTx);
        }
        block.txs = newTxs;
        return block;
    }

    /**
     * Fetch the block height of the current explorer
     * @returns {Promise<number>} - Block height
     */
    async getBlockCount() {
        const req = await this.fetchBlockbook(`/api/v2/api`);
        const { backend } = await req.json();
        return backend.blocks;
    }

    /**
     * Fetch the latest block hash of the current explorer
     * @returns {Promise<string>} - Block hash
     */
    async getBestBlockHash() {
        const req = await this.fetchBlockbook(`/api/v2/api`);
        const { backend } = await req.json();
        return backend.bestBlockHash;
    }

    /**
     * Returns the n-th page of transactions belonging to addr
     * @param {number} nStartHeight - The minimum transaction block height
     * @param {string} addr - a PIVX address or xpub
     * @param {number} n - index of the page
     * @param {number} pageSize - the maximum number of transactions in the page
     * @returns {Promise<Object>}
     */
    async #getPage(nStartHeight, addr, n, pageSize) {
        if (!(isXPub(addr) || isStandardAddress(addr))) {
            throw new Error('must provide either a PIVX address or a xpub');
        }
        const strRoot = `/api/v2/${isXPub(addr) ? 'xpub/' : 'address/'}${addr}`;
        const strCoreParams = `?details=txs&from=${nStartHeight}&pageSize=${pageSize}&page=${n}`;
        const req = await this.fetchBlockbook(strRoot + strCoreParams);
        return await req.json();
    }

    /**
     * Returns the n-th page of transactions belonging to addr
     * @param {number} nStartHeight - The minimum transaction block height
     * @param {string} addr - a PIVX address or xpub
     * @param {number} n - index of the page
     * @returns {Promise<Array<Transaction>>}
     */
    async getTxPage(nStartHeight, addr, n) {
        const page = await this.#getPage(nStartHeight, addr, n, 1000);
        let txRet = [];
        if (page?.transactions?.length > 0) {
            for (const tx of page.transactions) {
                const parsed = Transaction.fromHex(tx.hex);
                parsed.blockHeight = tx.blockHeight;
                parsed.blockTime = tx.blockTime;
                txRet.push(parsed);
            }
        }
        return txRet;
    }

    /**
     * Returns the number of pages of transactions belonging to addr
     * @param {number} nStartHeight - The minimum transaction block height
     * @param {string} addr - a PIVX address or xpub
     * @returns {Promise<number>}
     */
    async getNumPages(nStartHeight, addr) {
        const page = await this.#getPage(nStartHeight, addr, 1, 1);
        return page.txs;
    }

    /**
     * @typedef {object} BlockbookUTXO
     * @property {string} txid - The TX hash of the output
     * @property {number} vout - The Index Position of the output
     * @property {string} value - The string-based satoshi value of the output
     * @property {number} height - The block height the TX was confirmed in
     * @property {number} confirmations - The depth of the TX in the blockchain
     */

    /**
     * Fetch UTXOs from the current primary explorer
     * @param {string} strAddress -  address of which we want UTXOs
     * @returns {Promise<Array<BlockbookUTXO>>} Resolves when it has finished fetching UTXOs
     */
    async getUTXOs(strAddress) {
        let publicKey = strAddress;
        // Fetch UTXOs for the key
        const req = await this.fetchBlockbook(`/api/v2/utxo/${publicKey}`);
        return await req.json();
    }

    /**
     * Fetch an XPub's basic information
     * @param {string} strXPUB - The xpub to fetch info for
     * @returns {Promise<XPUBInfo>} - A JSON class of aggregated XPUB info
     */
    async getXPubInfo(strXPUB) {
        const req = await this.fetchBlockbook(`/api/v2/xpub/${strXPUB}`);
        return await req.json();
    }

    async sendTransaction(hex) {
        const req = await this.fetchBlockbook('/api/v2/sendtx/', {
            method: 'post',
            body: hex,
        });
        return await req.json();
    }

    async getTxInfo(txHash) {
        const req = await this.fetchBlockbook(`/api/v2/tx/${txHash}`);
        return await req.json();
    }

    /**
     * A Fetch wrapper which uses the current Blockbook Network's base URL
     * @param {string} api - The specific Blockbook api to call
     * @param {RequestInit?} options - The Fetch options
     * @returns {Promise<Response>} - The unresolved Fetch promise
     */
    fetchBlockbook(api, options) {
        return fetch(this.strUrl + api, options);
    }

    /////////////////////////////////////////////////////////////////////
    // TODO: REMOVE ALL FUNCTIONS BELOW THIS COMMENT ONCE #427 IS MERGED
    /////////////////////////////////////////////////////////////////////

    /**
     * @return {Promise<Number[]>} The list of blocks which have at least one shield transaction
     */
    async getShieldBlockList() {
        return await this.callRPC('/getshieldblocks');
    }

    /**
     * A Fetch wrapper which uses the current Node's base URL
     * @param {string} api - The specific Node api to call
     * @param {RequestInit?} options - The Fetch options
     * @returns {Promise<Response>} - The unresolved Fetch promise
     */
    fetchNode(api, options) {
        return fetch(cNode.url + api, options);
    }
    /**
     * A safety-wrapped RPC interface for calling Node RPCs with automatic correction handling
     * @param {string} api - The API endpoint to call
     * @param {boolean} isText - Optionally parse the result as Text rather than JSON
     * @returns {Promise<object|string>} - The RPC response; JSON by default, text if `isText` is true.
     */
    async callRPC(api, isText = false) {
        const cRes = await this.fetchNode(api);
        return isText ? await cRes.text() : await cRes.json();
    }
}