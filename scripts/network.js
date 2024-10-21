import { cChainParams } from './chain_params.js';
import { debugError, debugLog, DebugTopics } from './debug.js';
import { isStandardAddress, isXPub } from './misc.js';
import { sleep } from './utils.js';
import { getEventEmitter } from './event_bus.js';
import { setExplorer, fAutoSwitch, setNode } from './settings.js';
import { cNode } from './settings.js';
import { Transaction } from './transaction.js';

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

    getBlockCount() {
        throw new Error('getBlockCount must be implemented');
    }

    getBestBlockHash() {
        throw new Error('getBestBlockHash must be implemented');
    }

    sendTransaction() {
        throw new Error('sendTransaction must be implemented');
    }

    async getTxInfo(_txHash) {
        throw new Error('getTxInfo must be implemented');
    }

    /**
     * A safety-wrapped RPC interface for calling Node RPCs with automatic correction handling
     * @param {string} api - The API endpoint to call
     * @param {boolean} isText - Optionally parse the result as Text rather than JSON
     * @returns {Promise<object|string>} - The RPC response; JSON by default, text if `isText` is true.
     */
    async callRPC(api, isText = false) {
        const cRes = await retryWrapper(fetchNode, false, api);
        return isText ? await cRes.text() : await cRes.json();
    }
}

/**
 *
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
     * Fetch a block from the current node given the height
     * @param {number} blockHeight
     * @returns {Promise<Object>} the block
     */
    async getBlock(blockHeight) {
        // First we fetch the blockhash (and strip RPC's quotes)
        const strHash = (
            await this.callRPC(`/getblockhash?params=${blockHeight}`, true)
        ).replace(/"/g, '');
        // Craft a filter to retrieve only raw Tx hex and txid, also change "tx" to "txs"
        const strFilter =
            '&filter=' +
            encodeURI(`. | .txs = [.tx[] | { hex: .hex, txid: .txid}]`);
        // Fetch the full block (verbose)
        return await this.callRPC(`/getblock?params=${strHash},2${strFilter}`);
    }

    /**
     * Fetch the block height of the current node
     * @returns {Promise<number>} - Block height
     */
    async getBlockCount() {
        return parseInt(await this.callRPC('/getblockcount', true));
    }

    /**
     * FIXME this is going to be merged in getBlockCount once explorer and RPC are separated
     * @returns {Promise<number>} last indexed block of blockbook
     */
    async getBlockHeight() {
        const { blockbook } = await (
            await retryWrapper(fetchBlockbook, true, `/api/v2/api`)
        ).json();
        return blockbook.bestHeight;
    }

    /**
     * Fetch the latest block hash of the current explorer or fallback node
     * @returns {Promise<string>} - Block hash
     */
    async getBestBlockHash() {
        try {
            // Attempt via Explorer first
            const { backend } = await (
                await retryWrapper(fetchBlockbook, true, `/api/v2/api`)
            ).json();

            return backend.bestBlockHash;
        } catch {
            // Use Nodes as a fallback
            return await this.callRPC('/getbestblockhash', true);
        }
    }

    /**
     * Sometimes blockbook might return internal error, in this case this function will sleep for some times and retry
     * @param {string} strCommand - The specific Blockbook api to call
     * @param {number} sleepTime - How many milliseconds sleep between two calls. Default value is 20000ms
     * @returns {Promise<Object>} Explorer result in json
     */
    async safeFetchFromExplorer(strCommand, sleepTime = 20000) {
        let trials = 0;
        const maxTrials = 6;
        let error;
        while (trials < maxTrials) {
            trials += 1;
            const res = await retryWrapper(fetchBlockbook, true, strCommand);
            if (!res.ok) {
                try {
                    error = (await res.json()).error;
                } catch (e) {
                    error = 'Cannot safe fetch from explorer!';
                }
                debugLog(
                    DebugTopics.NET,
                    'Blockbook internal error! sleeping for ' +
                        sleepTime +
                        ' seconds'
                );
                await sleep(sleepTime);
                continue;
            }
            return await res.json();
        }
        throw new Error(error);
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
        return await this.safeFetchFromExplorer(strRoot + strCoreParams);
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
        try {
            let publicKey = strAddress;
            // Fetch UTXOs for the key
            const arrUTXOs = await (
                await retryWrapper(
                    fetchBlockbook,
                    true,
                    `/api/v2/utxo/${publicKey}`
                )
            ).json();
            return arrUTXOs;
        } catch (e) {
            debugError(DebugTopics.NET, e);
        }
    }

    /**
     * Fetch an XPub's basic information
     * @param {string} strXPUB - The xpub to fetch info for
     * @returns {Promise<XPUBInfo>} - A JSON class of aggregated XPUB info
     */
    async getXPubInfo(strXPUB) {
        return await (
            await retryWrapper(fetchBlockbook, true, `/api/v2/xpub/${strXPUB}`)
        ).json();
    }

    async sendTransaction(hex) {
        try {
            // Attempt via Explorer first
            let strTXID = '';
            try {
                const cData = await (
                    await retryWrapper(
                        fetchBlockbook,
                        true,
                        '/api/v2/sendtx/',
                        {
                            method: 'post',
                            body: hex,
                        }
                    )
                ).json();
                // If there's no TXID, we throw any potential Blockbook errors
                if (!cData.result || cData.result.length !== 64) throw cData;
                strTXID = cData.result;
            } catch {
                // Use Nodes as a fallback
                strTXID = await this.callRPC(
                    '/sendrawtransaction?params=' + hex,
                    true
                );
                strTXID = strTXID.replace(/"/g, '');
            }

            // Throw and catch if there's no TXID
            if (!strTXID || strTXID.length !== 64) throw strTXID;

            debugLog(DebugTopics.NET, 'Transaction sent! ' + strTXID);
            getEventEmitter().emit('transaction-sent', true, strTXID);
            return strTXID;
        } catch (e) {
            getEventEmitter().emit('transaction-sent', false, e);
            return false;
        }
    }

    async getTxInfo(txHash) {
        const req = await retryWrapper(
            fetchBlockbook,
            true,
            `/api/v2/tx/${txHash}`
        );
        return await req.json();
    }

    /**
     * @return {Promise<Number[]>} The list of blocks which have at least one shield transaction
     */
    async getShieldBlockList() {
        return await this.callRPC('/getshieldblocks');
    }
}

let _network = null;

/**
 * Sets the network in use by MPW.
 * @param {ExplorerNetwork} network - network to use
 */
export function setNetwork(network) {
    _network = network;
}

/**
 * Gets the network in use by MPW.
 * @returns {ExplorerNetwork?} Returns the network in use, may be null if MPW hasn't properly loaded yet.
 */
export function getNetwork() {
    return _network;
}

/**
 * A Fetch wrapper which uses the current Blockbook Network's base URL
 * @param {string} api - The specific Blockbook api to call
 * @param {RequestInit} options - The Fetch options
 * @returns {Promise<Response>} - The unresolved Fetch promise
 */
export function fetchBlockbook(api, options) {
    return fetch(_network.strUrl + api, options);
}

/**
 * A Fetch wrapper which uses the current Node's base URL
 * @param {string} api - The specific Node api to call
 * @param {RequestInit} options - The Fetch options
 * @returns {Promise<Response>} - The unresolved Fetch promise
 */
export function fetchNode(api, options) {
    return fetch(cNode.url + api, options);
}

/**
 * A wrapper for Blockbook and Node calls which can, in the event of an unresponsive instance,
 * seamlessly attempt the same call on multiple other instances until success.
 * @param {Function} func - The function to re-attempt with
 * @param {boolean} isExplorer - Whether this is an Explorer or Node call
 * @param  {...any} args - The arguments to pass to the function
 */
export async function retryWrapper(func, isExplorer, ...args) {
    // Track internal errors from the wrapper
    let err;

    // Select the instances list to use - Explorers or Nodes
    const arrInstances = isExplorer
        ? cChainParams.current.Explorers
        : cChainParams.current.Nodes;

    // If allowed by the user, Max Tries is ALL MPW-supported instances, otherwise, restrict to only the current one.
    let nMaxTries = arrInstances.length + 1;
    let retries = 0;

    // The instance index we started at
    let nIndex = arrInstances.findIndex((a) =>
        a.url === isExplorer ? getNetwork().strUrl : cNode.url
    );

    // Run the call until successful, or all attempts exhausted
    while (retries < nMaxTries) {
        try {
            // Call the passed function with the arguments
            const res = await func(...args);

            // If the endpoint is non-OK, assume it's an error
            if (!res.ok) throw new Error(res.statusText);

            // Return the result if successful
            return res;
        } catch (error) {
            err = error;

            // If allowed, switch instances
            if (!fAutoSwitch) throw err;
            nIndex = (nIndex + 1) % arrInstances.length;
            const cNewInstance = arrInstances[nIndex];

            if (isExplorer) {
                // Set the explorer at Network-class level, then as a hacky workaround for the current callback; we
                // ... adjust the internal URL to the new explorer.
                await setExplorer(cNewInstance, true);
            } else {
                // For the Node, we change the setting directly
                setNode(cNewInstance, true);
            }

            // Bump the attempts, and re-try next loop
            retries++;
        }
    }

    // Throw an error so the calling code knows the operation failed
    throw err;
}
