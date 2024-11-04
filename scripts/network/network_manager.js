import { ExplorerNetwork, Network, RPCNodeNetwork } from './network.js';
import { cChainParams } from '../chain_params.js';
import { fAutoSwitch } from '../settings.js';
import { debugLog, DebugTopics, debugWarn } from '../debug.js';
import { sleep } from '../utils.js';
import { getEventEmitter } from '../event_bus.js';

class NetworkManager {
    /**
     * @type {Network} - Current selected Explorer
     */
    #currentExplorer;

    /**
     * @type {Network} - Current selected RPC node
     */
    #currentNode;

    /**
     * @type {Array<Network>} - List of all available Networks
     */
    #networks = [];

    start() {
        this.#networks = [];
        for (let network of cChainParams.current.Explorers) {
            this.#networks.push(new ExplorerNetwork(network.url));
        }
        for (let network of cChainParams.current.Nodes) {
            this.#networks.push(new RPCNodeNetwork(network.url));
        }
    }

    /**
     * Reset the list of available networks
     */
    reset() {
        this.#networks = [];
    }

    /**
     * Sets the network in use by MPW.
     * @param {string} strUrl - network to use
     * @param {boolean} isRPC - whether we are setting the explorer or the RPC node
     */
    setNetwork(strUrl, isRPC) {
        if (this.#networks.length === 0) {
            this.start();
        }
        const found = this.#networks.find(
            (network) => network.strUrl === strUrl
        );
        if (!found) throw new Error('Cannot find provided Network!');
        if (isRPC) {
            this.#currentNode = found;
        } else {
            this.#currentExplorer = found;
        }
    }

    /**
     * Call all networks until one is succesful
     * seamlessly attempt the same call on multiple other instances until success.
     * @param {string} funcName - The function to re-attempt with
     * @param {boolean} isRPC - Whether to begin with the selected explorer or RPC node
     * @param  {...any} args - The arguments to pass to the function
     */
    async #retryWrapper(funcName, isRPC, ...args) {
        let nMaxTries = this.#networks.length;
        let attemptNet = isRPC ? this.#currentNode : this.#currentExplorer;

        let i = this.#networks.findIndex((net) => attemptNet === net);
        if (i === -1) {
            debugWarn(DebugTopics.NET, 'Cannot find index in networks array');
            i = 0;
        }

        // Run the call until successful, or all attempts exhausted
        for (let attempts = 1; attempts <= nMaxTries; attempts++) {
            try {
                debugLog(
                    DebugTopics.NET,
                    'attempting ' + funcName + ' on ' + attemptNet.strUrl
                );
                const res = await attemptNet[funcName](...args);
                return res;
            } catch (error) {
                debugLog(
                    DebugTopics.NET,
                    attemptNet.strUrl + ' failed on ' + funcName
                );
                // If allowed, switch instances
                if (!fAutoSwitch || attempts === nMaxTries) {
                    throw error;
                }
                attemptNet = this.#networks[(i + attempts) % nMaxTries];
            }
        }
    }

    /**
     * Sometimes blockbook might return internal error, in this case this function will sleep for some times and retry
     * @param {string} funcName - The function to call
     * @param {boolean} isRPC - Whether to begin with the selected explorer or RPC node
     * @param  {...any} args - The arguments to pass to the function
     * @returns {Promise<Object>} Explorer result in json
     */
    async #safeFetch(funcName, isRPC, ...args) {
        let trials = 0;
        const sleepTime = 20000;
        const maxTrials = 6;
        while (trials < maxTrials) {
            trials += 1;
            try {
                return await this.#retryWrapper(funcName, isRPC, ...args);
            } catch (e) {
                debugLog(
                    DebugTopics.NET,
                    'Blockbook internal error! sleeping for ' +
                        sleepTime +
                        ' seconds'
                );
                await sleep(sleepTime);
            }
        }
        throw new Error('Cannot safe fetch');
    }

    async getBlock(blockHeight) {
        return await this.#safeFetch('getBlock', true, blockHeight);
    }

    async getTxPage(nStartHeight, addr, n) {
        return await this.#safeFetch('getTxPage', false, nStartHeight, addr, n);
    }

    async getNumPages(nStartHeight, addr) {
        return await this.#safeFetch('getNumPages', false, nStartHeight, addr);
    }

    async getUTXOs(strAddress) {
        return await this.#retryWrapper('getUTXOs', false, strAddress);
    }

    async getXPubInfo(strXPUB) {
        return await this.#retryWrapper('getXPubInfo', false, strXPUB);
    }

    async getShieldBlockList() {
        return await this.#retryWrapper('getShieldBlockList', true);
    }

    async getBlockCount() {
        return await this.#retryWrapper('getBlockCount', true);
    }

    async getBestBlockHash() {
        return await this.#retryWrapper('getBestBlockHash', true);
    }

    async sendTransaction(hex) {
        try {
            const data = await this.#retryWrapper('sendTransaction', true, hex);

            // Throw and catch if the data is not a TXID
            if (!data.result || data.result.length !== 64) throw data;

            debugLog(DebugTopics.NET, 'Transaction sent! ' + data.result);
            getEventEmitter().emit('transaction-sent', true, data.result);
            return data.result;
        } catch (e) {
            getEventEmitter().emit('transaction-sent', false, e);
            return false;
        }
    }

    async getTxInfo(_txHash) {
        return await this.#retryWrapper('getTxInfo', false, _txHash);
    }

    async callRPC(api, isText = false) {
        return await this.#retryWrapper('callRPC', true, api, isText);
    }

    static #instance = new NetworkManager();

    static getInstance() {
        return this.#instance;
    }
}

/**
 * Gets the network in use by MPW.
 * @returns {NetworkManager} Returns the network manager in use.
 */
export function getNetwork() {
    return NetworkManager.getInstance();
}
