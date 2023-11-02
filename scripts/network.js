import { cChainParams } from './chain_params.js';
import { createAlert, sleep } from './misc.js';
import { getEventEmitter } from './event_bus.js';
import {
    STATS,
    cStatKeys,
    cAnalyticsLevel,
    setExplorer,
    fAutoSwitch,
    debug,
} from './settings.js';
import { ALERTS, translation } from './i18n.js';
import { mempool, stakingDashboard } from './global.js';

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

    getFee(bytes) {
        // TEMPORARY: Hardcoded fee per-byte
        return bytes * 50; // 50 sat/byte
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
                if (this.fullSynced) {
                    await this.getLatestTxs(this.lastBlockSynced);
                    this.lastBlockSynced = this.blocks;
                    stakingDashboard.update(0);
                    getEventEmitter().emit('new-tx');
                }
            }
        } catch (e) {
            this.error();
            throw e;
        }
        return this.blocks;
    }

    /**
     * Sometimes blockbook might return internal error, in this case this function will sleep for 20 seconds and retry
     * @param {string} strCommand - The specific Blockbook api to call
     * @returns {Promise<Object>} Explorer result in json
     */
    async safeFetchFromExplorer(strCommand) {
        let trials = 0;
        const maxTrials = 5;
        while (trials < maxTrials) {
            trials += 1;
            const res = await fetchBlockbook(strCommand);
            if (!res.ok) {
                if (debug) {
                    console.log(
                        'Blockbook internal error! sleeping for 20 seconds'
                    );
                }
                await sleep(20000);
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
        const txNumber = !this.fullSynced ? probePage.txs : 1;
        // Compute the total pages and iterate through them until we've synced everything
        const totalPages = Math.ceil(txNumber / 1000);
        for (let i = totalPages; i > 0; i--) {
            if (!this.fullSynced) {
                getEventEmitter().emit(
                    'sync-status-update',
                    totalPages - i + 1,
                    totalPages,
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
                    mempool.updateMempool(mempool.parseTransaction(tx));
                }
            }
            await mempool.saveOnDisk();
        }

        mempool.setBalance();
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
        await this.getLatestTxs(0);
        const nBlockHeights = Array.from(mempool.orderedTxmap.keys());
        this.lastBlockSynced =
            nBlockHeights.length == 0
                ? 0
                : nBlockHeights.sort((a, b) => a - b).at(-1);
        this.fullSynced = true;
        createAlert('success', translation.syncStatusFinished, 12500);
        getEventEmitter().emit('sync-status-update', 0, 0, true);
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
