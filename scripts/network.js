import { getDerivationPath } from './wallet.js';
import { cChainParams, COIN } from './chain_params.js';
import { createAlert } from './misc.js';
import { Mempool, UTXO } from './mempool.js';
import { getEventEmitter } from './event_bus.js';
import { STATS, cStatKeys, cAnalyticsLevel } from './settings.js';

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
        this.areRewardsComplete = false;
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

        this.arrRewards = [];
        this.rewardsSyncing = false;
    }

    error() {
        if (this.enabled) {
            this.disable();
            createAlert(
                'warning',
                '<b>Failed to synchronize!</b> Please try again later.' +
                    '<br>You can attempt re-connect via the Settings.',
                []
            );
        }
    }

    get cachedBlockCount() {
        return this.blocks;
    }

    async getBlockCount() {
        try {
            getEventEmitter().emit('sync-status', 'start');
            const { backend } = await (
                await fetch(`${this.strUrl}/api/v2/api`)
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
     * Fetch UTXOs from the current primary explorer
     * @returns {Promise<void>} Resolves when it has finished fetching UTXOs
     */
    async getUTXOs() {
        // Don't fetch UTXOs if we're already scanning for them!
        if (!this.masterKey) return;
        if (this.isSyncing) return;
        this.isSyncing = true;
        try {
            let publicKey;
            if (this.masterKey.isHD) {
                const derivationPath = getDerivationPath(
                    this.masterKey.isHardwareWallet
                )
                    .split('/')
                    .slice(0, 4)
                    .join('/');
                publicKey = await this.masterKey.getxpub(derivationPath);
            } else {
                publicKey = await this.masterKey.getAddress();
            }

            getEventEmitter().emit(
                'utxo',
                await (
                    await fetch(`${this.strUrl}/api/v2/utxo/${publicKey}`)
                ).json()
            );
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
            await fetch(`${this.strUrl}/api/v2/tx-specific/${cUTXO.txid}`)
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
                await fetch(this.strUrl + '/api/v2/sendtx/', {
                    method: 'post',
                    body: hex,
                })
            ).json();
            if (data.result && data.result.length === 64) {
                console.log('Transaction sent! ' + data.result);
                getEventEmitter().emit('transaction-sent', true, data.result);
                return data.result;
            } else {
                console.log('Error sending transaction: ' + data.result);
                getEventEmitter().emit('transaction-sent', false, data.error);
                return false;
            }
        } catch (e) {
            console.error(e);
            this.error();
        }
    }

    async getStakingRewards() {
        if (this.rewardsSyncing) {
            return this.arrRewards;
        }
        try {
            if (!this.enabled || !this.masterKey || this.areRewardsComplete)
                return this.arrRewards;
            this.rewardsSyncing = true;
            const nHeight = this.arrRewards.length
                ? this.arrRewards[this.arrRewards.length - 1].blockHeight
                : 0;
            const mapPaths = new Map();
            const txSum = (v) =>
                v.reduce(
                    (t, s) =>
                        t +
                        (s.addresses
                            .map((strAddr) => mapPaths.get(strAddr))
                            .filter((v) => v).length && s.addresses.length === 2
                            ? parseInt(s.value)
                            : 0),
                    0
                );
            let cData;
            if (this.masterKey.isHD) {
                const derivationPath = getDerivationPath(
                    this.masterKey.isHardwareWallet
                )
                    .split('/')
                    .slice(0, 4)
                    .join('/');
                const xpub = await this.masterKey.getxpub(derivationPath);
                cData = await (
                    await fetch(
                        `${
                            this.strUrl
                        }/api/v2/xpub/${xpub}?details=txs&pageSize=500&to=${
                            nHeight ? nHeight - 1 : 0
                        }`
                    )
                ).json();
                // Map all address <--> derivation paths
                if (cData.tokens)
                    cData.tokens.forEach((cAddrPath) =>
                        mapPaths.set(cAddrPath.name, cAddrPath.path)
                    );
            } else {
                const address = await this.masterKey.getAddress();
                cData = await (
                    await fetch(
                        `${
                            this.strUrl
                        }/api/v2/address/${address}?details=txs&pageSize=500&to=${
                            nHeight ? nHeight - 1 : 0
                        }`
                    )
                ).json();
                mapPaths.set(address, ':)');
            }
            if (cData && cData.transactions) {
                // Update rewards
                this.arrRewards = this.arrRewards.concat(
                    cData.transactions
                        .filter(
                            (tx) => tx.vout[0].addresses[0] === 'CoinStake TX'
                        )
                        .map((tx) => {
                            return {
                                id: tx.txid,
                                time: tx.blockTime,
                                blockHeight: tx.blockHeight,
                                amount: (txSum(tx.vout) - txSum(tx.vin)) / COIN,
                            };
                        })
                        .filter((tx) => tx.amount != 0)
                );

                // If the results don't match the full 'max/requested results', then we know the rewards are complete
                if (cData.transactions.length !== cData.itemsOnPage) {
                    this.areRewardsComplete = true;
                }
            }
            return this.arrRewards;
        } catch (e) {
            console.error(e);
        } finally {
            this.rewardsSyncing = false;
        }
    }

    setMasterKey(masterKey) {
        this.masterKey = masterKey;
        this.arrRewards = [];
    }

    async getTxInfo(txHash) {
        const req = await fetch(`${this.strUrl}/api/v2/tx/${txHash}`);
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
 * @param {Network} network - network to use
 */
export function setNetwork(network) {
    _network = network;
}

/**
 * Sets the network in use by MPW.
 * @returns {Network?} Returns the network in use, may be null if MPW hasn't properly loaded yet.
 */
export function getNetwork() {
    return _network;
}
