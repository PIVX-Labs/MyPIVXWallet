import { createAlert } from './misc.js';
import {
    debugError,
    debugLog,
    debugTimerEnd,
    debugTimerStart,
    DebugTopics,
    debugWarn,
} from './debug.js';
import { sleep } from './utils.js';
import { getEventEmitter } from './event_bus.js';
import {
    STATS,
    cStatKeys,
    cAnalyticsLevel,
    setNextExplorer,
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
    constructor() {
        if (this.constructor === Network) {
            throw new Error('Initializing virtual class');
        }
        this._enabled = true;
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

    error() {
        throw new Error('Error must be implemented');
    }

    getBlockCount() {
        throw new Error('getBlockCount must be implemented');
    }

    sendTransaction() {
        throw new Error('sendTransaction must be implemented');
    }

    submitAnalytics(_strType, _cData = {}) {
        throw new Error('submitAnalytics must be implemented');
    }

    async getTxInfo(_txHash) {
        throw new Error('getTxInfo must be implemented');
    }
}

export class ExplorerNetwork extends Network {
    /**
     * @param {string} wsUrl - Url pointing to the blockbook explorer
     */
    constructor() {
        super();
        this.cachedResults = [];
        this.subscriptions = [];
        this.ID = 0;
    }
    async createWebSocketConnection(wsUrl) {
        // Make sure the old connection is closed before opening a new one
        if (this.ws) {
            await this.reset();
        }
        // ensure backward compatibility
        if (wsUrl.startsWith('http')) {
            wsUrl = wsUrl.replace('http', 'ws');
        }
        if (!wsUrl.endsWith('/websocket')) {
            wsUrl += '/websocket';
        }
        this.wsUrl = wsUrl;
        this.openWebSocketConnection(wsUrl);
        await this.initWebSocketConnection();
    }
    openWebSocketConnection(wsUrl) {
        this.ws = new WebSocket(wsUrl);
        this.ws.onopen = function (e) {
            debugLog(DebugTopics.NET, 'websocket connected', e);
        };
        this.ws.onclose = function (e) {
            debugLog(DebugTopics.NET, 'websocket disconnected', e);
            if (!e.wasClean) {
                debugError(
                    DebugTopics.NET,
                    'websocket unexpected close, trying to reconnect'
                );
                // Connection closed somehow, try to reconnect
                setNextExplorer();
            }
        };
        this.ws.onmessage = function (e) {
            // Return early if the websocket is not open
            // In this way we avoid the case in which a closing websocket connection put values in the cache
            if (this.readyState !== WebSocket.OPEN) {
                return;
            }
            const resp = JSON.parse(e.data);
            // Is this a subscription?
            const f = _network.subscriptions[resp.id];
            if (f !== undefined) {
                f(resp.data);
            }
            // If it isn't cache the result
            _network.cachedResults[resp.id] = resp.data;
        };
    }
    async initWebSocketConnection() {
        await this.awaitWebSocketStatus(
            WebSocket.OPEN,
            'Cannot connect to websocket!'
        );
        await this.subscribeNewBlock();
    }
    get strUrl() {
        return this.wsUrl.replace('ws', 'http').replace('/websocket', '');
    }

    async reset() {
        if (this.ws.readyState == WebSocket.OPEN) {
            this.ws.close();
        }
        // Make sure websocket got closed before emptying arrays
        await this.awaitWebSocketStatus(
            WebSocket.CLOSED,
            'Websocket is not getting closed'
        );
        // At this point messages of old websocket will not be received anymore
        // and, it is safe to reset cachedResults and subscriptions
        this.cachedResults = [];
        this.subscriptions = [];
    }

    async awaitWebSocketStatus(status, errMessage) {
        for (let i = 0; i < 100; i++) {
            if (this.ws.readyState === status) {
                break;
            }
            await sleep(100);
        }
        if (this.ws.readyState !== status) {
            throw new Error(errMessage);
        }
    }

    async subscribe(method, params, callback) {
        await this.awaitWebSocketStatus(
            WebSocket.OPEN,
            'Cannot connect to websocket!'
        );
        const id = this.ID.toString();
        this.subscriptions[id] = callback;
        const req = {
            id,
            method,
            params,
        };
        this.ws.send(JSON.stringify(req));
        this.ID++;
        return id;
    }
    async subscribeNewBlock() {
        await this.subscribe('subscribeNewBlock', {}, function (result) {
            if (result['height'] !== undefined) {
                getEventEmitter().emit('new-block', result['height']);
            }
        });
    }

    async send(method, params) {
        // It might happen that connection just got closed, and we are still connecting to the new one.
        // So make sure that before sending anything we have an open connection
        await this.awaitWebSocketStatus(
            WebSocket.OPEN,
            'Cannot connect to websocket!'
        );
        const id = this.ID.toString();
        const req = {
            id,
            method,
            params,
        };
        this.ID++;
        this.ws.send(JSON.stringify(req));
        return [id, this.ws];
    }
    async sendAndWaitForAnswer(method, params) {
        let attempt = 1;
        const maxAttempts = 10;
        // milliseconds
        const maxAwaitTime = 600 * 1000;
        const frequency = 100;
        while (attempt <= maxAttempts) {
            let receivedInvalidAnswer = false;
            const [id, ws_that_sent] = await this.send(method, params);
            for (let i = 0; i < Math.floor(maxAwaitTime / frequency); i++) {
                const res = this.cachedResults[id];
                if (res !== undefined) {
                    delete this.cachedResults[id];
                    if (res.error) {
                        await sleep(1000);
                        receivedInvalidAnswer = true;
                        break;
                    }
                    return res;
                }
                await sleep(frequency);
                // If connection got closed while sending do not wait until timeout
                if (ws_that_sent !== this.ws) {
                    break;
                }
            }
            debugWarn(
                DebugTopics.NET,
                'Failed send attempt for ' + method,
                'attempt ' +
                    attempt +
                    '/' +
                    maxAttempts +
                    ' received an invalid answer: ' +
                    receivedInvalidAnswer
            );
            attempt += 1;
        }
        throw new Error('Failed to communicate with the explorer');
    }
    async getAccountInfo(descriptor, page, pageSize, from, details = 'txs') {
        const params = {
            descriptor,
            details,
            page,
            pageSize,
            from,
        };
        return await this.sendAndWaitForAnswer('getAccountInfo', params);
    }

    error() {
        if (this.enabled) {
            this.disable();
            createAlert('warning', ALERTS.CONNECTION_FAILED);
        }
    }

    /**
     * Fetch a block from the explorer given the height
     * @param {number} blockHeight
     * @param {boolean} skipCoinstake - if true coinstake tx will be skipped
     * @returns {Promise<Object>} the block fetched from explorer
     */
    async getBlock(blockNumber) {
        try {
            return await this.sendAndWaitForAnswer('getBlock', {
                id: blockNumber.toString(),
            });
        } catch (e) {
            this.error();
            throw e;
        }
    }

    /**
     * //TODO: do not take the wallet as parameter but instead something weaker like a public key or address?
     * Must be called only for initial wallet sync
     * @param {import('./wallet.js').Wallet} wallet - Wallet that we are getting the txs of
     * @returns {Promise<void>}
     */
    async getLatestTxs(wallet) {
        if (wallet.isSynced) {
            throw new Error('getLatestTxs must only be for initial sync');
        }
        let nStartHeight = Math.max(
            ...wallet.getTransactions().map((tx) => tx.blockHeight)
        );
        debugTimerStart(DebugTopics.NET, 'getLatestTxsTimer');
        const probePage = await this.getAccountInfo(
            wallet.getKeyToExport(),
            1,
            1,
            nStartHeight
        );
        const txNumber = probePage.txs - wallet.getTransactions().length;
        // Compute the total pages and iterate through them until we've synced everything
        const totalPages = Math.ceil(txNumber / 1000);
        for (let i = totalPages; i > 0; i--) {
            getEventEmitter().emit(
                'transparent-sync-status-update',
                tr(translation.syncStatusHistoryProgress, [
                    { current: totalPages - i + 1 },
                    { total: totalPages },
                ]),
                false
            );

            // Fetch this page of transactions
            const iPage = await this.getAccountInfo(
                wallet.getKeyToExport(),
                i,
                1000,
                nStartHeight
            );

            // Update the internal mempool if there's new transactions
            // Note: Extra check since Blockbook sucks and removes `.transactions` instead of an empty array if there's no transactions
            if (iPage?.transactions?.length > 0) {
                for (const tx of iPage.transactions.reverse()) {
                    const parsed = Transaction.fromHex(tx.hex);
                    parsed.blockHeight = tx.blockHeight;
                    parsed.blockTime = tx.blockTime;
                    await wallet.addTransaction(parsed);
                }
            }
        }

        debugLog(
            DebugTopics.NET,
            'Fetched latest txs: total number of pages was ',
            totalPages
        );
        debugTimerEnd(DebugTopics.NET, 'getLatestTxsTimer');
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
        return await this.sendAndWaitForAnswer('getAccountUtxo', {
            descriptor: strAddress,
        });
    }

    /**
     * Fetch an XPub's basic information
     * @param {string} strXPUB - The xpub to fetch info for
     * @returns {Promise<XPUBInfo>} - A JSON class of aggregated XPUB info
     */
    async getXPubInfo(strXPUB) {
        return await this.getAccountInfo(strXPUB, 1, 1, 0, 'tokens');
    }

    async sendTransaction(hex) {
        try {
            const data = await this.sendAndWaitForAnswer('sendTransaction', {
                hex,
            });

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
        return await this.sendAndWaitForAnswer('getTransaction', {
            txid: txHash,
        });
    }

    /**
     * Get the blockchain info.
     * Internal function used to get the blockchain info.
     */
    async #getChainInfo() {
        return await this.sendAndWaitForAnswer('getInfo', {});
    }

    /**
     * Returns the best known block height.
     * Must be called only on start and when toggling mainnet/testnet
     * @returns {Promise<Number>}
     */
    async getBlockCount() {
        return (await this.#getChainInfo())['bestHeight'];
    }

    /**
     * @return {Promise<Number[]>} The list of blocks which have at least one shield transaction
     */
    async getShieldBlockList() {
        return await (await fetch(`${cNode.url}/getshieldblocks`)).json();
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

let _network = new ExplorerNetwork();

/**
 * Sets the network in use by MPW.
 * @param {String} wsUrl - websocket url
 */
export async function setNetwork(wsUrl) {
    debugLog(DebugTopics.NET, 'Connecting to new explorer', wsUrl);
    await _network.createWebSocketConnection(wsUrl);
}

/**
 * Gets the network in use by MPW.
 * @returns {ExplorerNetwork?} Returns the network in use, may be null if MPW hasn't properly loaded yet.
 */
export function getNetwork() {
    // Return null if websocket hasn't been loaded yet
    return _network.ws ? _network : null;
}
