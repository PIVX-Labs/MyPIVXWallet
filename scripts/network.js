import { getDerivationPath } from './wallet.js';
import { cChainParams, COIN } from './chain_params.js';
import { createAlert } from './misc.js';
import { Mempool, UTXO } from './mempool.js';
import { getEventEmitter } from './event_bus.js';
import {
    STATS,
    cStatKeys,
    cAnalyticsLevel,
    setExplorer,
    fAutoSwitch,
} from './settings.js';
import { ALERTS } from './i18n.js';

/**
 * A historical transaction type.
 * @enum {number}
 */
export const HistoricalTxType = {
    UNKNOWN: 0,
    STAKE: 1,
    DELEGATION: 2,
    UNDELEGATION: 3,
    RECEIVED: 4,
    SENT: 5,
};

/**
 * A historical transaction
 */
export class HistoricalTx {
    /**
     * @param {HistoricalTxType} type - The type of transaction.
     * @param {string} id - The transaction ID.
     * @param {Array<string>} senders - The list of 'input addresses'.
     * @param {Array<string>} receivers - The list of 'output addresses'.
     * @param {boolean} shieldedOutputs - If this transaction contains Shield outputs.
     * @param {number} time - The block time of the transaction.
     * @param {number} blockHeight - The block height of the transaction.
     * @param {number} amount - The amount transacted, in coins.
     */
    constructor(
        type,
        id,
        senders,
        receivers,
        shieldedOutputs,
        time,
        blockHeight,
        amount
    ) {
        this.type = type;
        this.id = id;
        this.senders = senders;
        this.receivers = receivers;
        this.shieldedOutputs = shieldedOutputs;
        this.time = time;
        this.blockHeight = blockHeight;
        this.amount = amount;
    }
}

/**
 * Virtual class rapresenting any network backend
 */
export class Network {
    constructor(masterKey) {
        if (this.constructor === Network) {
            throw new Error('Initializing virtual class');
        }
        this._enabled = true;

        this.masterKey = masterKey;

        this.lastWallet = 0;
        this.isHistorySynced = false;
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

    setMasterKey(masterKey) {
        this.masterKey = masterKey;
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
    constructor(strUrl, masterKey) {
        super(masterKey);
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

        /**
         * @type {Array<HistoricalTx>}
         */
        this.arrTxHistory = [];

        this.historySyncing = false;
    }

    error() {
        if (this.enabled) {
            this.disable();
            createAlert('warning', ALERTS.CONNECTION_FAILED, []);
        }
    }

    get cachedBlockCount() {
        return this.blocks;
    }

    async getBlockCount() {
        try {
            getEventEmitter().emit('sync-status', 'start');
            const { backend } = await (
                await retryWrapper(fetchBlockbook, `/api/v2/api`)
            ).json();
            if (backend.blocks > this.blocks) {
                console.log(
                    'New block detected! ' +
                        this.blocks +
                        ' --> ' +
                        backend.blocks
                );
                this.blocks = backend.blocks;

                await this.getUTXOs();
            }
        } catch (e) {
            this.error();
            throw e;
        } finally {
            getEventEmitter().emit('sync-status', 'stop');
        }
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
        // Don't fetch UTXOs if we're already scanning for them!
        if (!strAddress) {
            if (!this.masterKey) return;
            if (this.isSyncing) return;
            this.isSyncing = true;
        }
        try {
            let publicKey;
            // Derive our XPub, or fetch a single pubkey
            if (this.masterKey.isHD && !strAddress) {
                const derivationPath = getDerivationPath(
                    this.masterKey.isHardwareWallet
                )
                    .split('/')
                    .slice(0, 4)
                    .join('/');
                publicKey = await this.masterKey.getxpub(derivationPath);
            } else {
                // Use the param address if specified, or the Master Key by default
                publicKey = strAddress || (await this.masterKey.getAddress());
            }

            // Fetch UTXOs for the key
            const arrUTXOs = await (
                await retryWrapper(fetchBlockbook, `/api/v2/utxo/${publicKey}`)
            ).json();

            // If using MPW's wallet, then sync the UTXOs in MPW's state
            if (!strAddress) getEventEmitter().emit('utxo', arrUTXOs);

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
     * Fetches UTXOs full info
     * @param {Object} cUTXO - object-formatted UTXO
     * @returns {Promise<UTXO>} Promise that resolves with the full info of the UTXO
     */
    async getUTXOFullInfo(cUTXO) {
        const cTx = await (
            await retryWrapper(
                fetchBlockbook,
                `/api/v2/tx-specific/${cUTXO.txid}`
            )
        ).json();
        const cVout = cTx.vout[cUTXO.vout];

        let path;
        if (cUTXO.path) {
            path = cUTXO.path.split('/');
            path[2] =
                (this.masterKey.isHardwareWallet
                    ? cChainParams.current.BIP44_TYPE_LEDGER
                    : cChainParams.current.BIP44_TYPE) + "'";
            this.lastWallet = Math.max(parseInt(path[5]), this.lastWallet);
            path = path.join('/');
        }

        const isColdStake = cVout.scriptPubKey.type === 'coldstake';
        const isStandard = cVout.scriptPubKey.type === 'pubkeyhash';
        const isReward = cTx.vout[0].scriptPubKey.hex === '';
        // We don't know what this is
        if (!isColdStake && !isStandard) {
            return null;
        }

        return new UTXO({
            id: cUTXO.txid,
            path,
            sats: Math.round(cVout.value * COIN),
            script: cVout.scriptPubKey.hex,
            vout: cVout.n,
            height: this.cachedBlockCount - (cTx.confirmations - 1),
            status: cTx.confirmations < 1 ? Mempool.PENDING : Mempool.CONFIRMED,
            isDelegate: isColdStake,
            isReward,
        });
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

    /**
     * Synchronise a partial chunk of our TX history
     * @param {boolean} [fNewOnly] - Whether to sync ONLY new transactions
     */
    async syncTxHistoryChunk(fNewOnly = false) {
        // Do not allow multiple calls at once
        if (this.historySyncing) {
            return false;
        }
        try {
            if (!this.enabled || !this.masterKey) return this.arrTxHistory;
            this.historySyncing = true;
            const nHeight = this.arrTxHistory.length
                ? this.arrTxHistory[this.arrTxHistory.length - 1].blockHeight
                : 0;
            const mapPaths = new Map();

            // Form the API call using our wallet information
            const fHD = this.masterKey.isHD;
            const strDerivPath = getDerivationPath(
                this.masterKey.isHardwareWallet
            )
                .split('/')
                .slice(0, 4)
                .join('/');
            const strKey = fHD
                ? await this.masterKey.getxpub(strDerivPath)
                : await this.masterKey.getAddress();
            const strRoot = `/api/v2/${fHD ? 'xpub/' : 'address/'}${strKey}`;
            const strCoreParams = `?details=txs&tokens=derived&pageSize=200`;
            const strAPI = strRoot + strCoreParams;

            // If we have a known block height, check for incoming transactions within the last 60 blocks
            const cRecentTXs =
                this.blocks > 0
                    ? await (
                          await retryWrapper(
                              fetchBlockbook,
                              `${strAPI}&from=${this.blocks - 60}`
                          )
                      ).json()
                    : {};

            // If we do not have full history, then load more historical TXs in a slice
            const cData =
                !fNewOnly && !this.isHistorySynced
                    ? await (
                          await retryWrapper(
                              fetchBlockbook,
                              `${strAPI}&to=${nHeight ? nHeight - 1 : 0}`
                          )
                      ).json()
                    : {};
            if (fHD && (cData.tokens || cRecentTXs.tokens)) {
                // Map all address <--> derivation paths
                // - From historical transactions
                if (cData.tokens) {
                    cData.tokens.forEach((cAddrPath) =>
                        mapPaths.set(cAddrPath.name, cAddrPath.path)
                    );
                }
                // - From new transactions
                if (cRecentTXs.tokens) {
                    cRecentTXs.tokens.forEach((cAddrPath) =>
                        mapPaths.set(cAddrPath.name, cAddrPath.path)
                    );
                }
            } else {
                mapPaths.set(strKey, ':)');
            }

            // Process our aggregated history data
            if (
                (cData && cData.transactions) ||
                (cRecentTXs && cRecentTXs.transactions)
            ) {
                // Process Older (historical) TXs
                const arrOlderTXs = this.toHistoricalTXs(
                    cData.transactions || [],
                    mapPaths
                );

                // Process Recent TXs, then add them manually on the basis that they are NOT already known in history
                const arrRecentTXs = this.toHistoricalTXs(
                    cRecentTXs.transactions || [],
                    mapPaths
                );
                for (const cTx of arrRecentTXs) {
                    if (
                        !this.arrTxHistory.find((a) => a.id === cTx.id) &&
                        !arrOlderTXs.find((a) => a.id === cTx.id)
                    ) {
                        // No identical Tx, so prepend it!
                        this.arrTxHistory.unshift(cTx);
                    }
                }
                this.arrTxHistory = this.arrTxHistory.concat(arrOlderTXs);

                // If the results don't match the full 'max/requested results', then we know the history is complete
                if (
                    cData.transactions &&
                    cData.transactions.length !== cData.itemsOnPage
                ) {
                    this.isHistorySynced = true;
                }
            }
            return this.arrTxHistory;
        } catch (e) {
            console.error(e);
        } finally {
            this.historySyncing = false;
        }
    }

    /**
     * Convert a list of Blockbook transactions to HistoricalTxs
     * @param {Array<object>} arrTXs - An array of the Blockbook TXs
     * @param {Map<String, String>} mapPaths - A map of the derivation paths for involved addresses
     * @returns {Array<HistoricalTx>} - A new array of `HistoricalTx`-formatted transactions
     */
    toHistoricalTXs(arrTXs, mapPaths) {
        /**
         * A function to sum a list of inputs (vin) or outputs (vout)
         * @type {(v: Array<{addresses: String[], value: Number}>) => Number}
         */
        const txSum = (v) =>
            v.reduce(
                (t, s) =>
                    t +
                    (s.addresses &&
                    s.addresses.some((strAddr) => mapPaths.has(strAddr))
                        ? parseInt(s.value)
                        : 0),
                0
            );

        return arrTXs
            .map((tx) => {
                // The total 'delta' or change in balance, from the Tx's sums
                let nAmount = (txSum(tx.vout) - txSum(tx.vin)) / COIN;

                // If this Tx creates any Shield outputs
                // Note: shielOuts typo intended, this is a Blockbook error
                const fShieldOuts = Number.isFinite(tx.shielOuts);

                // (Un)Delegated coins in this transaction, if any
                let nDelegated = 0;

                // The address(es) delegated to, if any
                let strDelegatedAddr = '';

                // The sender addresses, if any
                const arrSenders =
                    tx.vin?.flatMap((vin) => vin.addresses) || [];

                // The receiver addresses, if any
                let arrReceivers =
                    tx.vout?.flatMap((vout) => vout.addresses) || [];
                // Pretty-fy script addresses
                arrReceivers = arrReceivers.map((addr) =>
                    addr.startsWith('OP_') ? 'Contract' : addr
                );

                // Figure out the type, based on the Tx's properties
                let type = HistoricalTxType.UNKNOWN;
                if (
                    !fShieldOuts &&
                    tx?.vout[0]?.addresses[0]?.startsWith('CoinStake')
                ) {
                    type = HistoricalTxType.STAKE;
                } else if (nAmount > 0 || (nAmount > 0 && fShieldOuts)) {
                    type = HistoricalTxType.RECEIVED;
                    // If this contains Shield outputs, then we received them
                    if (fShieldOuts)
                        nAmount = parseInt(tx.valueBalanceSat) / COIN;
                } else if (nAmount < 0 || (nAmount < 0 && fShieldOuts)) {
                    // Check vins for undelegations
                    for (const vin of tx.vin) {
                        const fDelegation = vin.addresses?.some((addr) =>
                            addr.startsWith(cChainParams.current.STAKING_PREFIX)
                        );
                        if (fDelegation) {
                            nDelegated -= parseInt(vin.value);
                        }
                    }

                    // Check vouts for delegations
                    for (const out of tx.vout) {
                        strDelegatedAddr =
                            out.addresses?.find((addr) =>
                                addr.startsWith(
                                    cChainParams.current.STAKING_PREFIX
                                )
                            ) || strDelegatedAddr;

                        const fDelegation = !!strDelegatedAddr;
                        if (fDelegation) {
                            nDelegated += parseInt(out.value);
                        }
                    }

                    // If a delegation was made, then display the value delegated
                    if (nDelegated > 0) {
                        type = HistoricalTxType.DELEGATION;
                        nAmount = nDelegated / COIN;
                    } else if (nDelegated < 0) {
                        type = HistoricalTxType.UNDELEGATION;
                        nAmount = nDelegated / COIN;
                    } else {
                        type = HistoricalTxType.SENT;
                        // If this contains Shield outputs, then we sent them
                        if (fShieldOuts)
                            nAmount = parseInt(tx.valueBalanceSat) / COIN;
                    }
                }

                return new HistoricalTx(
                    type,
                    tx.txid,
                    arrSenders,
                    nDelegated !== 0 ? [strDelegatedAddr] : arrReceivers,
                    fShieldOuts,
                    tx.blockTime,
                    tx.blockHeight,
                    Math.abs(nAmount)
                );
            })
            .filter((tx) => tx.amount != 0);
    }

    async setMasterKey(masterKey) {
        // If the public Master Key (xpub, address...) is different, then wipe TX history
        if (
            (await this.masterKey?.keyToExport) !==
            (await masterKey.keyToExport)
        ) {
            this.arrTxHistory = [];
        }

        // Set the key
        this.masterKey = masterKey;
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
 * Sets the network in use by MPW.
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
