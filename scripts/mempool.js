"use strict";

/** An Unspent Transaction Output, used as Inputs of future transactions */
class UTXO {
    /**
     * @param {Object} UTXO
     * @param {String} UTXO.id - Transaction ID
     * @param {String} UTXO.path - If applicable, the HD Path of the owning address
     * @param {Number} UTXO.sats - Satoshi value in this UTXO
     * @param {String} UTXO.script - HEX encoded spending script
     * @param {Number} UTXO.vout - Output position of this transaction
     * @param {Number} UTXO.height - Block height of the UTXO
     * @param {Number} UTXO.status - UTXO status enum state
     */
    constructor({id, path, sats, script, vout, height, status} = {}) {
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
    }
};

/** A Mempool instance, stores and handles UTXO data for the wallet */
class Mempool {
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

    /** The DELEGATED PENDING state (cold UTXO is in mempool, pending confirmation) */
    static PENDING_COLD = 3;

    /** The CONFIRMED DELEGATED state (cold UTXO is spendable) */
    static DELEGATE = 4;

    /** The REWARD state (UTXO is a reward from a stake or masternode) */
    static REWARD = 5;


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
     * @param {UTXO} cNewUTXO - UTXO to search for
     * @returns {Boolean} `true` or `false`
     */
    isAlreadyStored(cNewUTXO) {
        for (const cUTXO of this.UTXOs) {
            if (JSON.stringify(cUTXO) === JSON.stringify(cNewUTXO)) {
                return true;
            }
        }
        return false;
    }

        /**
     * Check if an exact UTXO match can be found in our wallet
     * @param {id,path,vout} - txid path and vout of the UTXO
     * @returns {Boolean} `true` or `false`
     */
         isAlreadyStored({id,path,vout,status}) {
            for (const cUTXO of this.UTXOs) {
                if (cUTXO.id === id && cUTXO.path===path && cUTXO.vout===vout && cUTXO.status===status) {
                    return true;
                }
            }
            return false;
        }

    /**
     * Fetches an array of UTXOs filtered by their state
     * @param {Number} nState - Specific UTXO state
     * @returns {Array<UTXO>} `array` - An array of UTXOs
     */
    getUTXOsByState(nState) {
        return this.UTXOs.filter(cUTXO => cUTXO.status === nState);
    }

    /**
     * Fetches an array of confirmed UTXOs, an easier alias to {@link getUTXOsByState}
     * @returns {Array<UTXO>} `array` - An array of UTXOs
     */
    getConfirmed() {
        return this.getUTXOsByState(Mempool.CONFIRMED);
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
     */
    addUTXO({id, path, sats, script, vout, height, status}) {
        const newUTXO = new UTXO({id, path, sats, script, vout, height, status});
        // Ensure the new UTXO doesn't have the same status
        if (this.isAlreadyStored(newUTXO)) return;

        // Ensure the new UTXO doesn't have a REMOVED status
        if (this.isAlreadyStored({id: id,path: path,vout: vout,status: Mempool.REMOVED})) return;
        
        // Remove any pending versions of this UTXO
        this.removeFromState(newUTXO, Mempool.PENDING);

        // If delegated, remove pending versions of that too
        if (status === Mempool.DELEGATE) this.removeFromState(newUTXO, Mempool.PENDING_COLD);

        // Add to list
        this.UTXOs.push(newUTXO);
        getBalance(true);
        getStakingBalance(true);
    }

    /**
     * Remove a UTXO completely from our wallet
     * @param {UTXO} cUTXO - UTXO to remove
     */
    removeUTXO(cUTXO) {
        this.UTXOs = this.UTXOs.filter(utxo => JSON.stringify(utxo) !== JSON.stringify(cUTXO));
    }
    
    /**
     * Remove a UTXO completely from our wallet, with a 12 minute delay given his id, path and vout
     * @param {Array<UTXO>} arrUTXOs - UTXOs to remove
     */
    autoRemoveUTXO({id,path,vout}){
            for (const cUTXO of this.UTXOs) {
                // Loop given + internal UTXOs to find a match, then start the delayed removal
                if (cUTXO.id === id && cUTXO.path===path && cUTXO.vout===vout) {
                    cUTXO.status = Mempool.REMOVED;
                    this.removeWithDelay(12, cUTXO);
                    return;
                }
            }
            console.error("Mempool: Failed to find UTXO " + id + " (" + vout + ") for auto-removal!");
        }
    
    /**
     * Remove many UTXOs completely from our wallet, with a 12 minute delay
     * @param {Array<UTXO>} arrUTXOs - UTXOs to remove
     */
    autoRemoveUTXOs(arrUTXOs) {
        for (const cNewUTXO of arrUTXOs) {
            for (const cUTXO of this.UTXOs) {
                // Loop given + internal UTXOs to find a match, then start the delayed removal
                if (JSON.stringify(cUTXO) === JSON.stringify(cNewUTXO)) {
                    cUTXO.status = Mempool.REMOVED;
                    this.removeWithDelay(12, cUTXO);
                    break;
                }
            }    
        }
    }

    /**
     * Change the status of a UTXO, matched by it's properties
     * @param {String} id - Transaction ID
     * @param {String} path - If applicable, the HD Path of the owning address
     * @param {Number} sats - Satoshi value in this UTXO
     * @param {String} script - The HEX encoded spending script
     * @param {Number} vout - Output position of this transaction
     * @param {Number} newStatus - New mempool status to apply to the UTXO
     * @returns {Boolean} `true` if successful, `false` if UTXO not found
     */
    changeUTXOstatus(id, path, sats, script, vout, newStatus) {
        for (const cUTXO of this.UTXOs) {
            if (cUTXO.id === id && cUTXO.path === path && cUTXO.sats === sats && cUTXO.script === script && cUTXO.vout === vout) {
                cUTXO.status = newStatus;
                // If the new status is REMOVED, start the delayed removal
                if (newStatus === Mempool.REMOVED) {
                    this.removeWithDelay(12, cUTXO);
                }
                return;
            }
        }
        console.log("Mempool: Failed to find UTXO " + id + " (" + vout + ") for auto-removal!");
    }

    /**
     * Returns the real-time balance of the wallet (all addresses)
     * @returns {Number} Balance in satoshis
     */
    getBalance() {
        // Fetch 'standard' balances: the sum of all Confirmed or Unconfirmed transactions (excluding Masternode collaterals)
        const nStandardBalance = this.UTXOs.filter(cUTXO => (cUTXO.status === Mempool.CONFIRMED || cUTXO.status === Mempool.PENDING) && !isMasternodeUTXO(cUTXO)).reduce((a, b) => a + b.sats, 0);
        
        // Fetch 'staked' balances: the sum of all Confirmed Rewards (excluding rewards not yet 'matured')
        const nStakedBalance = this.UTXOs.filter(cUTXO => cUTXO.status === Mempool.REWARD).filter(cUTXO => Mempool.isValidReward(cUTXO)).reduce((a, b) => a + b.sats, 0);

        // Combine and return total satoshis
        return nStandardBalance + nStakedBalance;
    }

    /**
     * Returns if a reward is fully confirmed, matured and spendable
     * @param {UTXO} cUTXO - Reward UTXO
     * @returns {Boolean} `true` if the reward UTXO is spendable, `false` if not
     */
    static isValidReward(cUTXO) {
        return cachedBlockCount - cUTXO.height > 100;
    }

    /**
     * Returns the real-time delegated balance of the wallet (all addresses)
     * @returns {Number} Delegated balance in satoshis
     */
    getDelegatedBalance() {
        return this.UTXOs.filter(cUTXO => cUTXO.status === Mempool.DELEGATE || cUTXO.status === Mempool.PENDING_COLD).reduce((a, b) => a + b.sats, 0);
    }
};