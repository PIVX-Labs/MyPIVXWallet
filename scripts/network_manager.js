import { ExplorerNetwork, Network } from './network.js';
import { cChainParams } from './chain_params.js';
import { fAutoSwitch } from './settings.js';
import { debugLog, DebugTopics } from './debug.js';
import { sleep } from './utils.js';
import { getEventEmitter } from './event_bus.js';

class NetWorkManager {
    /**
     * @type {Network} - Current selected network
     */
    currentNetwork;

    /**
     * @type {Array<Network>} - List of all available Networks
     */
    networks = [];

    start() {
        this.networks = [];
        for (let network of cChainParams.current.Explorers) {
            this.networks.push(new ExplorerNetwork(network.url));
        }
    }

    /**
     * Sets the network in use by MPW.
     * @param {ExplorerNetwork} network - network to use
     */
    setNetwork(strUrl) {
        if (this.networks.length === 0) {
            this.start();
        }
        this.currentNetwork = this.networks.find(
            (network) => network.strUrl === strUrl
        );
    }

    /**
     * Call all networks until one is succesful
     * seamlessly attempt the same call on multiple other instances until success.
     * @param {Function} func - The function to re-attempt with
     * @param  {...any} args - The arguments to pass to the function
     */
    async retryWrapper(func, ...args) {
        const startingUrl = this.currentNetwork.strUrl;
        let nMaxTries = this.networks.length;
        let i = this.networks.findIndex((net) => net === this.currentNetwork);

        // Run the call until successful, or all attempts exhausted
        try {
            for (let attempts = 0; attempts < nMaxTries; attempts++) {
                try {
                    const res = await func.call(this.currentNetwork, ...args);
                    return res;
                } catch (error) {
                    // If allowed, switch instances
                    if (!fAutoSwitch || attempts == nMaxTries) {
                        throw error;
                    }
                    this.currentNetwork =
                        this.networks[(i + attempts) % nMaxTries];
                }
            }
        } finally {
            // TODO: Change once there are more types of explorers
            this.currentNetwork = new ExplorerNetwork(startingUrl);
        }
    }

    /**
     * Sometimes blockbook might return internal error, in this case this function will sleep for some times and retry
     * @param {string} strCommand - The specific Blockbook api to call
     * @param {number} sleepTime - How many milliseconds sleep between two calls. Default value is 20000ms
     * @returns {Promise<Object>} Explorer result in json
     */
    async safeFetch(func, ...args) {
        let trials = 0;
        const sleepTime = 20000;
        const maxTrials = 6;
        while (trials < maxTrials) {
            trials += 1;
            try {
                return await func.call(this.currentNetwork, ...args);
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

    async getBlock(blockHeight, skipCoinstake) {
        return await this.safeFetch(
            this.currentNetwork.getBlock,
            blockHeight,
            skipCoinstake
        );
    }

    async getTxPage(nStartHeight, addr, n) {
        return await this.safeFetch(
            this.currentNetwork.getTxPage,
            nStartHeight,
            addr,
            n
        );
    }

    async getNumPages(nStartHeight, addr) {
        return await this.safeFetch(
            this.currentNetwork.getNumPages,
            nStartHeight,
            addr
        );
    }

    async getUTXOs(strAddress) {
        return await this.retryWrapper(
            this.currentNetwork.getUTXOs,
            strAddress
        );
    }

    async getXPubInfo(strXPUB) {
        return await this.retryWrapper(
            this.currentNetwork.getXPubInfo,
            strXPUB
        );
    }

    async getShieldBlockList() {
        return await this.retryWrapper(this.currentNetwork.getShieldBlockList);
    }

    async getBlockCount() {
        return await this.retryWrapper(this.currentNetwork.getBlockCount);
    }

    async getBestBlockHash() {
        return await this.retryWrapper(this.currentNetwork.getBestBlockHash);
    }

    async sendTransaction(hex) {
        try {
            const data = await this.retryWrapper(
                this.currentNetwork.sendTransaction,
                hex
            );

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
        return await this.retryWrapper(this.currentNetwork.getTxInfo, _txHash);
    }
}

export const networkManager = new NetWorkManager();

/**
 * Gets the network in use by MPW.
 * @returns {ExplorerNetwork?} Returns the network in use, may be null if MPW hasn't properly loaded yet.
 */
export function getNetwork() {
    return networkManager;
}
