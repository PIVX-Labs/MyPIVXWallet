import { cChainParams } from './chain_params.js';
import { createAlert } from './misc.js';
import { sleep } from './utils.js';
import { getEventEmitter } from './event_bus.js';
import {
    STATS,
    cStatKeys,
    cAnalyticsLevel,
    setExplorer,
    fAutoSwitch,
    debug,
} from './settings.js';
import { cNode } from './settings.js';
import { ALERTS, tr, translation } from './i18n.js';
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
 * Virtual class rapresenting any network backend
 *
 */
export class Network {
    wallet;
    /**
     * @param {import('./wallet.js').Wallet} wallet
     */
    constructor(wallet) {
        if (this.constructor === Network) {
            throw new Error('Initializing virtual class');
        }
        this._enabled = true;
        this.wallet = wallet;
    }

    /**
     * @param {boolean} value
     */
    set enabled(value) {
        if (value !== this._enabled) {
            getEventEmitter().emit('network-toggle', value);
            this._enabled = value;
        }
    }

    get enabled() {
        return this._enabled;
    }

    enable() {
        this.enabled = true;
    }

    disable() {
        this.enabled = false;
    }

    toggle() {
        this.enabled = !this.enabled;
    }

    get cachedBlockCount() {
        throw new Error('cachedBlockCount must be implemented');
    }

    error() {
        throw new Error('Error must be implemented');
    }

    getBlockCount() {
        throw new Error('getBlockCount must be implemented');
    }

    sentTransaction() {
        throw new Error('sendTransaction must be implemented');
    }

    submitAnalytics(_strType, _cData = {}) {
        throw new Error('submitAnalytics must be implemented');
    }

    setWallet(wallet) {
        this.wallet = wallet;
    }

    async getTxInfo(_txHash) {
        throw new Error('getTxInfo must be implemented');
    }
}

/**
 *
 */
export class ExplorerNetwork extends Network {
    /**
     * @param {string} strUrl - Url pointing to the blockbook explorer
     */
    constructor(strUrl, wallet) {
        super(wallet);
        /**
         * @type{string}
         * @public
         */
        this.strUrl = strUrl;

        /**
         * @type{Number}
         * @private
         */
        this.blocks = 0;

        this.historySyncing = false;
        this.utxoFetched = false;
        this.fullSynced = false;
        this.lastBlockSynced = 0;
    }

    error() {
        if (this.enabled) {
            this.disable();
            createAlert('warning', ALERTS.CONNECTION_FAILED);
        }
    }

    get cachedBlockCount() {
        return this.blocks;
    }

    /**
     * Fetch a block from the explorer given the height
     * @param {Number} blockHeight
     * @returns {Promise<Object>} the block fetched from explorer
     */
    async getBlock(blockHeight) {
        try {
            const block = await this.safeFetchFromExplorer(
                `/api/v2/block/${blockHeight}`
            );
            const newTxs = [];
            // This is bad. We're making so many requests
            // This is a quick fix to try to be compliant with the blockbook
            // API, and not the PIVX extension.
            // In the Blockbook API /block doesn't have any chain specific information
            // Like hex, shield info or what not.
            // We could change /getshieldblocks to /getshieldtxs?
            for (const tx of block.txs) {
                const r = await fetch(
                    `${this.strUrl}/api/v2/tx-specific/${tx.txid}`
                );
                if (!r.ok) throw new Error('failed');
                const newTx = await r.json();
                newTxs.push(newTx);
            }
            block.txs = newTxs;
            return block;
        } catch (e) {
            this.error();
            throw e;
        }
    }

    async getBlockCount() {
        try {
            const { backend } = await (
                await retryWrapper(fetchBlockbook, `/api/v2/api`)
            ).json();
            if (backend.blocks > this.blocks) {
                getEventEmitter().emit(
                    'new-block',
                    backend.blocks,
                    this.blocks
                );
                this.blocks = backend.blocks;
                //TODO: unify the transparent sync with the shield sync
                // in particular in place of getLatestTxs read directly from the block as we do for shielding
                if (this.fullSynced) {
                    await this.getLatestTxs(this.lastBlockSynced);
                    this.lastBlockSynced = this.blocks;
                    getEventEmitter().emit('new-tx');
                }
                if (this.wallet.isSynced) {
                    await this.wallet.getLatestBlocks();
                }
            }
        } catch (e) {
            this.error();
            throw e;
        }
        return this.blocks;
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
        while (trials < maxTrials) {
            trials += 1;
            const res = await fetchBlockbook(strCommand);
            if (!res.ok) {
                if (debug) {
                    console.log(
                        'Blockbook internal error! sleeping for ' +
                            sleepTime +
                            ' seconds'
                    );
                }
                await sleep(sleepTime);
                continue;
            }
            return await res.json();
        }
        throw new Error('Cannot safe fetch from explorer!');
    }
    async getLatestTxs(nStartHeight) {
        // Ask some blocks in the past or blockbock might not return a transaction that has just been mined
        const blockOffset = 10;
        nStartHeight =
            nStartHeight > blockOffset
                ? nStartHeight - blockOffset
                : nStartHeight;
        if (debug) {
            console.time('getLatestTxsTimer');
        }
        // Form the API call using our wallet information
        const strKey = this.wallet.getKeyToExport();
        const strRoot = `/api/v2/${
            this.wallet.isHD() ? 'xpub/' : 'address/'
        }${strKey}`;
        const strCoreParams = `?details=txs&from=${nStartHeight}`;
        const probePage = !this.fullSynced
            ? await this.safeFetchFromExplorer(
                  `${strRoot + strCoreParams}&pageSize=1`
              )
            : null;
        //.txs returns the total number of wallet's transaction regardless the startHeight and we use this for first sync
        // after first sync (so at each new block) we can safely assume that user got less than 1000 new txs
        //in this way we don't have to fetch the probePage after first sync
        const txNumber = !this.fullSynced
            ? probePage.txs - this.wallet.getTransactions().length
            : 1;
        // Compute the total pages and iterate through them until we've synced everything
        const totalPages = Math.ceil(txNumber / 1000);
        for (let i = totalPages; i > 0; i--) {
            if (!this.fullSynced) {
                getEventEmitter().emit(
                    'transparent-sync-status-update',
                    tr(translation.syncStatusHistoryProgress, [
                        { current: totalPages - i + 1 },
                        { total: totalPages },
                    ]),
                    false
                );
            }

            // Fetch this page of transactions
            const iPage = await this.safeFetchFromExplorer(
                `${strRoot + strCoreParams}&page=${i}`
            );

            // Update the internal mempool if there's new transactions
            // Note: Extra check since Blockbook sucks and removes `.transactions` instead of an empty array if there's no transactions
            if (iPage?.transactions?.length > 0) {
                for (const tx of iPage.transactions.reverse()) {
                    const parsed = Transaction.fromHex(tx.hex);
                    parsed.blockHeight = tx.blockHeight;
                    parsed.blockTime = tx.blockTime;
                    await this.wallet.addTransaction(parsed);
                }
            }
        }

        if (debug) {
            console.log(
                'Fetched latest txs: total number of pages was ',
                totalPages,
                ' fullSynced? ',
                this.fullSynced
            );
            console.timeEnd('getLatestTxsTimer');
        }
    }

    async walletFullSync() {
        if (this.fullSynced) return;
        if (!this.wallet || !this.wallet.isLoaded()) return;
        this.lastBlockSynced = Math.max(
            ...this.wallet.getTransactions().map((tx) => tx.blockHeight)
        );
        await this.getLatestTxs(this.lastBlockSynced);
        this.lastBlockSynced = Math.max(
            ...this.wallet.getTransactions().map((tx) => tx.blockHeight)
        );
        this.fullSynced = true;
        getEventEmitter().emit('transparent-sync-status-update', '', true);
    }
    reset() {
        this.fullSynced = false;
        this.blocks = 0;
        this.lastBlockSynced = 0;
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
     * @param {string} strAddress - Optional address, gets UTXOs without changing MPW's state
     * @returns {Promise<Array<BlockbookUTXO>>} Resolves when it has finished fetching UTXOs
     */
    async getUTXOs(strAddress = '') {
        // If getUTXOs has been already called return
        if (this.utxoFetched && !strAddress) {
            return;
        }
        // Don't fetch UTXOs if we're already scanning for them!
        if (!strAddress) {
            if (!this.wallet || !this.wallet.isLoaded()) return;
            if (this.isSyncing) return;
            this.isSyncing = true;
        }
        try {
            let publicKey = strAddress || this.wallet.getKeyToExport();
            // Fetch UTXOs for the key
            const arrUTXOs = await (
                await retryWrapper(fetchBlockbook, `/api/v2/utxo/${publicKey}`)
            ).json();

            // If using MPW's wallet, then sync the UTXOs in MPW's state
            // This check is a temporary fix to the toggle explorer call
            if (this === getNetwork())
                if (!strAddress) {
                    this.utxoFetched = true;
                    getEventEmitter().emit('utxo', arrUTXOs);
                }

            // Return the UTXOs for additional utility use
            return arrUTXOs;
        } catch (e) {
            console.error(e);
            this.error();
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Fetch an XPub's basic information
     * @param {string} strXPUB - The xpub to fetch info for
     * @returns {Promise<XPUBInfo>} - A JSON class of aggregated XPUB info
     */
    async getXPubInfo(strXPUB) {
        return await (
            await retryWrapper(fetchBlockbook, `/api/v2/xpub/${strXPUB}`)
        ).json();
    }

    async sendTransaction(hex) {
        try {
            const data = await (
                await retryWrapper(fetchBlockbook, '/api/v2/sendtx/', {
                    method: 'post',
                    body: hex,
                })
            ).json();

            // Throw and catch if the data is not a TXID
            if (!data.result || data.result.length !== 64) throw data;

            console.log('Transaction sent! ' + data.result);
            getEventEmitter().emit('transaction-sent', true, data.result);
            return data.result;
        } catch (e) {
            getEventEmitter().emit('transaction-sent', false, e);
            return false;
        }
    }

    async getTxInfo(txHash) {
        const req = await retryWrapper(fetchBlockbook, `/api/v2/tx/${txHash}`);
        return await req.json();
    }

    /**
     * @return {Promise<Number[]>} The list of blocks which have at least one shield transaction
     */
    async getShieldBlockList() {
        /**
         * @type {Number[]}
         */
        const blockCount = await this.getBlockCount(false);
        const blocks = await (
            await fetch(`${cNode.url}/getshieldblocks`)
        ).json();
        const maxBlock = blocks[blocks.length - 1];
        //I think
        if (maxBlock < blockCount - 5) {
            blocks.push(blockCount - 5);
        }
        return blocks;
    }

    /**
     * Waits for next block
     * @returns {Promise<Number>} Resolves when the next block is obtained
     */
    waitForNextBlock() {
        return new Promise((res, _rej) => {
            getEventEmitter().once('new-block', (block) => res(block));
        });
    }
    // PIVX Labs Analytics: if you are a user, you can disable this FULLY via the Settings.
    // ... if you're a developer, we ask you to keep these stats to enhance upstream development,
    // ... but you are free to completely strip MPW of any analytics, if you wish, no hard feelings.
    submitAnalytics(strType, cData = {}) {
        if (!this.enabled) return;

        // TODO: rebuild Labs Analytics, submitAnalytics() will be disabled at code-level until this is live again
        /* eslint-disable */
        return;

        // Limit analytics here to prevent 'leakage' even if stats are implemented incorrectly or forced
        let i = 0,
            arrAllowedKeys = [];
        for (i; i < cAnalyticsLevel.stats.length; i++) {
            const cStat = cAnalyticsLevel.stats[i];
            arrAllowedKeys.push(cStatKeys.find((a) => STATS[a] === cStat));
        }

        // Check if this 'stat type' was granted permissions
        if (!arrAllowedKeys.includes(strType)) return false;

        // Format
        const cStats = { type: strType, ...cData };

        // Send to Labs Analytics
        const request = new XMLHttpRequest();
        request.open('POST', 'https://scpscan.net/mpw/statistic', true);
        request.setRequestHeader('Content-Type', 'application/json');
        request.send(JSON.stringify(cStats));
        return true;
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
 * A wrapper for Blockbook calls which can, in the event of an unresponsive explorer,
 * seamlessly attempt the same call on multiple other explorers until success.
 * @param {Function} func - The function to re-attempt with
 * @param  {...any} args - The arguments to pass to the function
 */
async function retryWrapper(func, ...args) {
    // Track internal errors from the wrapper
    let err;

    // If allowed by the user, Max Tries is ALL MPW-supported explorers, otherwise, restrict to only the current one.
    let nMaxTries = cChainParams.current.Explorers.length;
    let retries = 0;

    // The explorer index we started at
    let nIndex = cChainParams.current.Explorers.findIndex(
        (a) => a.url === getNetwork().strUrl
    );

    // Run the call until successful, or all attempts exhausted
    while (retries < nMaxTries) {
        try {
            // Call the passed function with the arguments
            const res = await func(...args);

            // If the endpoint is non-OK, assume it's an error
            if (!res.ok) throw res;

            // Return the result if successful
            return res;
        } catch (error) {
            err = error;

            // If allowed, switch explorers
            if (!fAutoSwitch) throw err;
            nIndex = (nIndex + 1) % cChainParams.current.Explorers.length;
            const cNewExplorer = cChainParams.current.Explorers[nIndex];

            // Set the explorer at Network-class level, then as a hacky workaround for the current callback; we
            // ... adjust the internal URL to the new explorer.
            getNetwork().strUrl = cNewExplorer.url;
            setExplorer(cNewExplorer, true);

            // Bump the attempts, and re-try next loop
            retries++;
        }
    }

    // Throw an error so the calling code knows the operation failed
    throw err;
}
