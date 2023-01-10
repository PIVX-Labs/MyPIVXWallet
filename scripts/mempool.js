import { cachedBlockCount } from './network.js';
import { getBalance, isMasternodeUTXO, getStakingBalance } from './global.js';
import { sleep } from './misc.js';
import { debug } from './settings.js';

/** An Unspent Transaction Output, used as Inputs of future transactions */
export class UTXO {
    /**
     * @param {Object} UTXO
     * @param {String} UTXO.id - Transaction ID
     * @param {String} UTXO.path - If applicable, the HD Path of the owning address
     * @param {Number} UTXO.sats - Satoshi value in this UTXO
     * @param {String} UTXO.script - HEX encoded spending script
     * @param {Number} UTXO.vout - Output position of this transaction
     * @param {Number} UTXO.height - Block height of the UTXO
     * @param {Number} UTXO.status - UTXO status enum state
     * @param {bool} UTXO.isDelegate - Whether the UTXO is a cold stake delegation
     */
    constructor({
        id,
        path,
        sats,
        script,
        vout,
        height,
        status,
        isDelegate = false,
        isReward = false,
    } = {}) {
        /** Transaction ID
         * @type {String} */
        this.id = id;

        /** HD Path of the owning address
         *  @type {String} */
        this.path = path;

        /** Satoshi value in this UTXO
         *  @type {Number} */
        this.sats = sats;

        /** HEX encoded spending script
         *  @type {String} */
        this.script = script;

        /** Output position of this transaction
         *  @type {Number} */
        this.vout = vout;

        /** Block height of the UTXO
         *  @type {Number} */
        this.height = height;

        /** UTXO status enum state
         *  @type {Number} */
        this.status = status;

        /** If it's a delegation UTXO
         * @type {bool} */
        this.isDelegate = isDelegate;

        this.isReward = isReward;
    }

    /**
     * Check for equality between this UTXO and another UTXO
     * @param {UTXO} cUTXO - UTXO to compare against
     * @returns {Boolean} `true` if equal, `false` if unequal
     */
    equalsUTXO(cUTXO) {
        return (
            this.id === cUTXO.id &&
            this.vout === cUTXO.vout &&
            this.status === cUTXO.status
        );
    }
}

/** A Mempool instance, stores and handles UTXO data for the wallet */
export class Mempool {
    constructor() {
        /**
         * An array of all known UTXOs
         * @type {Array<UTXO>}
         */
        this.UTXOs = [];
    }

    /** The CONFIRMED state (UTXO is spendable) */
    static CONFIRMED = 0;

    /** The REMOVED state (UTXO was spent and will be removed soon) */
    static REMOVED = 1;

    /** The PENDING state (standard UTXO is in mempool, pending confirmation) */
    static PENDING = 2;

    /**
     * Remove a UTXO after a set amount of time
     * @param {Number} nBlocks - Estimated blocks to wait
     * @param {UTXO} cUTXO - UTXO to remove
     */
    async removeWithDelay(nBlocks, cUTXO) {
        await sleep(nBlocks * 60 * 1000);
        this.removeUTXO(cUTXO);
    }

    /**
     * Check if an exact UTXO match can be found in our wallet
     * @param {Object} UTXO
     * @param {String} UTXO.id - Transaction ID
     * @param {Number} UTXO.vout - Output position of this transaction
     * @param {Number} [UTXO.status] - UTXO status enum state. If it's undefined, it will ignore it.
     * @returns {Boolean} `true` or `false`
     */
    isAlreadyStored({ id, vout, status }) {
        return this.UTXOs.some(
            (cUTXO) =>
                cUTXO.id === id &&
                cUTXO.vout === vout &&
                (!status || cUTXO.status === status)
        );
    }

    /**
     * Fetches an array of UTXOs filtered by their state
     * @param {Number} nState - Specific UTXO state
     * @returns {Array<UTXO>} `array` - An array of UTXOs
     */
    getUTXOsByState(nState) {
        return this.UTXOs.filter((cUTXO) => cUTXO.status === nState);
    }

    /**
     * Removes a UTXO from a specific state
     * @param {UTXO} cNewUTXO - Pending UTXO to remove
     * @param {Number} nState - Specific state of this UTXO to search for
     */
    removeFromState(cNewUTXO, nState) {
        const arrPendingUTXOs = this.getUTXOsByState(nState);
        // Loop each pending UTXO
        for (const cUTXO of arrPendingUTXOs) {
            // Search for matching ID + output number
            if (cUTXO.id === cNewUTXO.id && cUTXO.vout === cNewUTXO.vout) {
                // Nuke it from orbit
                this.removeUTXO(cUTXO);
                break;
            }
        }
    }

    /**
     * Add a new UTXO to the wallet
     * @param {Object} UTXO
     * @param {String} UTXO.id - Transaction ID
     * @param {String} UTXO.path - If applicable, the HD Path of the owning address
     * @param {Number} UTXO.sats - Satoshi value in this UTXO
     * @param {String} UTXO.script - HEX encoded spending script
     * @param {Number} UTXO.vout - Output position of this transaction
     * @param {Number} UTXO.height - Block height of the UTXO
     * @param {Number} UTXO.status - UTXO status enum state
     * @param {Boolean} UTXO.isDelegate - If this is a Cold Delegation
     */
    addUTXO({
        id,
        path,
        sats,
        script,
        vout,
        height,
        status,
        isDelegate,
        isReward,
    }) {
        const newUTXO = new UTXO({
            id,
            path,
            sats,
            script,
            vout,
            height,
            status,
            isDelegate,
            isReward,
        });

        if (this.isAlreadyStored({ id, vout })) {
            this.updateUTXO({ id, vout });
        } else {
            this.UTXOs.push(newUTXO);
        }
        getBalance(true);
        getStakingBalance(true);
    }

    /**
     * Update an existing UTXO, by confirming its pending status
     * The UTXO must be in
     * @param {Object} UTXO - Object to be deconstructed
     * @param {String} UTXO.id - Transaction id
     * @param {Number} UTXO.vout - vout
     */
    updateUTXO({ id, vout }) {
        if (debug) {
            console.assert(
                this.isAlreadyStored({ id, vout }),
                'updateUTXO must be called with an existing UTXO'
            );
        }
        const cUTXO = this.UTXOs.find(
            (utxo) => utxo.id === id && utxo.vout == vout
        );
        switch (cUTXO.status) {
            case Mempool.PENDING:
                cUTXO.status = Mempool.CONFIRMED;
                break;
        }
        getBalance(true);
        getStakingBalance(true);
    }

    /**
     * Remove a UTXO completely from our wallet
     * @param {UTXO} cUTXO - UTXO to remove
     */
    removeUTXO(cUTXO) {
        this.UTXOs = this.UTXOs.filter((utxo) => !utxo.equalsUTXO(cUTXO));
    }

    /**
     * Remove a UTXO completely from our wallet, with a 12 minute delay given his id, path and vout
     * @param {Object} UTXO
     * @param {String} UTXO.id - Transaction ID
     * @param {Number} UTXO.vout - Output position of this transaction
     */
    autoRemoveUTXO({ id, vout }) {
        for (const cUTXO of this.UTXOs) {
            // Loop given + internal UTXOs to find a match, then start the delayed removal
            if (cUTXO.id === id && cUTXO.vout === vout) {
                cUTXO.status = Mempool.REMOVED;
                this.removeWithDelay(12, cUTXO);
                return;
            }
        }
        console.error(
            'Mempool: Failed to find UTXO ' +
                id +
                ' (' +
                vout +
                ') for auto-removal!'
        );
    }

    /**
     * Remove many UTXOs completely from our wallet, with a 12 minute delay
     * @param {Array<UTXO>} arrUTXOs - UTXOs to remove
     */
    autoRemoveUTXOs(arrUTXOs) {
        for (const cNewUTXO of arrUTXOs) {
            for (const cUTXO of this.UTXOs) {
                // Loop given + internal UTXOs to find a match, then start the delayed removal
                if (cUTXO.equalsUTXO(cNewUTXO)) {
                    cUTXO.status = Mempool.REMOVED;
                    this.removeWithDelay(12, cUTXO);
                    break;
                }
            }
        }
    }

    /**
     * Fetches an array of confirmed UTXOs, an easier alias to {@link getUTXOsByState}
     * @returns {Array<UTXO>} `array` - An array of UTXOs
     */
    getConfirmed() {
        return this.getUTXOsByState(Mempool.CONFIRMED);
    }

    /**
     * Get standard, non delegated, UTXOs
     * @returns {Array<UTXO>} Non delegated utxos
     */
    getStandardUTXOs() {
        return this.UTXOs.filter(
            (cUTXO) => cUTXO.status !== Mempool.REMOVED && !cUTXO.isDelegate
        );
    }

    /**
     * Get delegated UTXOs
     * @returns {Array<UTXO>} Delegated UTXOs
     */
    getDelegatedUTXOs() {
        return this.UTXOs.filter(
            (cUTXO) => cUTXO.status !== Mempool.REMOVED && cUTXO.isDelegate
        );
    }

    /**
     * Returns the real-time balance of the wallet (all addresses)
     * @returns {Number} Balance in satoshis
     */
    getBalance() {
        // Fetch 'standard' balances: the sum of all Confirmed or Unconfirmed transactions (excluding Masternode collaterals)
        return this.getStandardUTXOs()
            .filter((cUTXO) => !isMasternodeUTXO(cUTXO))
            .reduce((a, b) => a + b.sats, 0);
    }

    /**
     * Returns if a UTXO is valid
     * @param {UTXO} cUTXO - UTXO
     * @returns {Boolean} `true` if the reward UTXO is spendable, `false` if not
     */
    static isValidUTXO(cUTXO) {
        if (cUTXO.isReward) {
            return cachedBlockCount - cUTXO.height > 100;
        } else {
            return true;
        }
    }

    /**
     * Returns the real-time delegated balance of the wallet (all addresses)
     * @returns {Number} Delegated balance in satoshis
     */
    getDelegatedBalance() {
        return this.getDelegatedUTXOs().reduce((a, b) => a + b.sats, 0);
    }
}
