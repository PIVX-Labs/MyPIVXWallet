import { cChainParams, COIN } from './chain_params';
import { Database } from './database';
import { doms, getBalance, restoreWallet, sweepAddress } from './global';
import {
    arrayToCSV,
    createAlert,
    downloadBlob,
    getAlphaNumericRand,
} from './misc';
import { ALERTS, translation } from './i18n';
import { getNetwork } from './network';
import { scanQRCode } from './scanner';
import { createAndSendTransaction } from './transactions';
import { deriveAddress, LegacyMasterKey, masterKey } from './wallet';

/** The fee in Sats to use for Creating or Redeeming PIVX Promos */
export const PROMO_FEE = 10000;

/**
 * The global storage for temporary Promo Code wallets, this is used for sweeping funds
 * @type {PromoWallet}
 */
export let cPromoWallet = null;

export class PromoWallet {
    /**
     * @param {object} data - An object containing the PromoWallet data
     * @param {string} data.code - The human-readable Promo Code
     * @param {string} data.address - The public key associated with the Promo Code
     * @param {Uint8Array} data.pkBytes - The private key bytes derived from the Promo Code
     * @param {Date|number} data.time - The Date or timestamp the code was created
     * @param {Array<object>} data.utxos - UTXOs associated with the Promo Code
     */
    constructor({ code, address, pkBytes, utxos, time }) {
        /** @type {string} The human-readable Promo Code */
        this.code = code;
        /** @type {string} The public key associated with the Promo Code */
        this.address = address;
        /** @type {Uint8Array} The private key bytes derived from the Promo Code */
        this.pkBytes = pkBytes;
        /** @type {Array<object>} UTXOs associated with the Promo Code */
        this.utxos = utxos;
        /** @type {Date|number} The Date or timestamp the code was created */
        this.time = time instanceof Date ? time : new Date(time);
    }

    /** A flag to show if this UTXO has successfully synced UTXOs previously */
    fSynced = false;

    /** A lock to prevent this Promo from synchronisation races */
    fLock = false;

    /**
     * Synchronise UTXOs and return the balance of the Promo Code
     * @param {boolean} - Whether to use UTXO Cache, or sync from network
     * @returns {Promise<number>} - The Promo Wallet balance in sats
     */
    async getBalance(fCacheOnly = false) {
        // Refresh our UTXO set
        if (!fCacheOnly) {
            await this.getUTXOs();
        }

        // Return the sum of the set
        return this.utxos.reduce((a, b) => a + b.sats, 0);
    }

    /**
     * Synchronise UTXOs and return them
     * @param {boolean} - Whether to sync simple UTXOs or full UTXOs
     * @returns {Promise<Array<object>>}
     */
    async getUTXOs(fFull = false) {
        // For shallow syncs, don't allow racing: but Full syncs are allowed to bypass for Tx creation
        if (!fFull && this.fLock) return this.utxos;
        this.fLock = true;

        // If we don't have it, derive the public key from the promo code's WIF
        if (!this.address) {
            this.address = deriveAddress({ pkBytes: this.pkBytes });
        }

        // Check for UTXOs on the explorer
        const arrSimpleUTXOs = await getNetwork().getUTXOs(this.address);

        // Either format the simple UTXOs, or additionally sync the full UTXOs with scripts
        this.utxos = [];
        for (const cUTXO of arrSimpleUTXOs) {
            if (fFull) {
                this.utxos.push(await getNetwork().getUTXOFullInfo(cUTXO));
            } else {
                this.utxos.push({
                    id: cUTXO.txid,
                    sats: parseInt(cUTXO.value),
                    vout: cUTXO.vout,
                });
            }
        }

        // Unlock, mark as synced and return the UTXO set
        this.fLock = false;
        this.fSynced = true;
        return this.utxos;
    }
}

/**
 *  The mode of the Promo system: Redeem when true - Create when false.
 */
let fPromoRedeem = true;

/**
 * Sets the mode of the PIVX Promos UI
 * @param {boolean} fMode - `true` to redeem, `false` to create
 */
export async function setPromoMode(fMode) {
    fPromoRedeem = fMode;

    // Modify the UI to match the mode
    if (fPromoRedeem) {
        // Swap the buttons
        doms.domRedeemCodeModeRedeemBtn.style.opacity = '0.5';
        doms.domRedeemCodeModeRedeemBtn.style.cursor = 'default';
        doms.domRedeemCodeModeCreateBtn.style.opacity = '0.8';
        doms.domRedeemCodeModeCreateBtn.style.cursor = 'pointer';

        // Show the redeem box, hide create box
        doms.domRedeemCodeUse.style.display = '';
        doms.domRedeemCodeCreate.style.display = 'none';

        // Set the title and confirm button
        doms.domRedeemTitle.innerText = 'Redeem Code';
        doms.domRedeemCodeConfirmBtn.innerText = 'Redeem';

        // Hide table
        doms.domPromoTable.classList.add('d-none');

        // Show smooth table animation
        setTimeout(() => {
            doms.domPromoTable.style.maxHeight = '0px';
        }, 100);
    } else {
        // Swap the buttons
        doms.domRedeemCodeModeRedeemBtn.style.opacity = '0.8';
        doms.domRedeemCodeModeRedeemBtn.style.cursor = 'pointer';
        doms.domRedeemCodeModeCreateBtn.style.opacity = '0.5';
        doms.domRedeemCodeModeCreateBtn.style.cursor = 'default';

        // Show the redeem box, hide create box
        doms.domRedeemCodeUse.style.display = 'none';
        doms.domRedeemCodeCreate.style.display = '';

        // Set the title and confirm button
        doms.domRedeemTitle.innerText = 'Create Code';
        doms.domRedeemCodeConfirmBtn.innerText = 'Create';

        // Render saved codes
        const cCodes = await renderSavedPromos();

        // Show animation when promo creation thread has 1 or more items
        if (arrPromoCreationThreads.length || cCodes.codes) {
            // Refresh the Promo UI
            await updatePromoCreationTick();

            // Show table
            doms.domRedeemCodeCreatePendingList.innerHTML = cCodes.html;
            doms.domPromoTable.classList.remove('d-none');

            // Show smooth table animation
            setTimeout(() => {
                doms.domPromoTable.style.maxHeight = 'min-content';
            }, 100);
        }
    }
}

/**
 * The GUI handler function for hitting the promo modal 'Confirm' button
 */
export function promoConfirm() {
    if (fPromoRedeem) {
        redeemPromoCode(doms.domRedeemCodeInput.value);
    } else {
        // Show table
        doms.domPromoTable.classList.remove('d-none');

        // Show smooth table animation
        setTimeout(() => {
            doms.domPromoTable.style.maxHeight = 'min-content';
        }, 100);

        createPromoCode(
            doms.domRedeemCodeCreateInput.value,
            Number(doms.domRedeemCodeCreateAmountInput.value)
        );
    }
}

/**
 * A list of promo creation threads, each thread works on a unique code
 * @type {Array<Worker>}
 */
const arrPromoCreationThreads = [];

/**
 * A lock for updating promo-creation related UI and threads
 */
let fPromoIntervalStarted = false;

/**
 * Create a new 'PIVX Promos' code with a webworker
 * @param {string} strCode - The Promo Code to create
 * @param {number} nAmount - The Promo Code amount in coins
 * @param {boolean} fAddRandomness - Whether to append Randomness to the code
 */
export async function createPromoCode(strCode, nAmount, fAddRandomness = true) {
    // Determine if we're adding randomness - and if so, if it's appended entropy or full randomness
    const strFinalCode = fAddRandomness
        ? strCode
            ? strCode + '-' + getAlphaNumericRand(5).toUpperCase()
            : getAlphaNumericRand(10).toUpperCase()
        : strCode;

    // Ensure the amount is sane
    const min = 0.01;
    if (nAmount < min) {
        return createAlert('warning', ALERTS.PROMO_MIN, [
            { min },
            { ticker: cChainParams.current.TICKER },
        ]);
    }

    // Ensure there's no more than half the device's cores used
    if (arrPromoCreationThreads.length >= navigator.hardwareConcurrency)
        return createAlert(
            'warning',
            ALERTS.PROMO_MAX_QUANTITY,
            [{ quantity: navigator.hardwareConcurrency }],
            4000
        );

    // Ensure the user has enough balance (Code amount + Redeem fee + Blockchain fee buffer)
    const nReservedBalance = arrPromoCreationThreads.reduce(
        (a, b) => a + b.amount * COIN,
        0
    );
    if (getBalance() - nReservedBalance < nAmount * COIN + PROMO_FEE * 2) {
        return createAlert(
            'warning',
            ALERTS.PROMO_NOT_ENOUGH,
            [{ ticker: cChainParams.current.TICKER }],
            4000
        );
    }

    // Ensure the user doesn't create the same code twice
    const db = await Database.getInstance();
    const arrCodes = (await db.getAllPromos()).concat(arrPromoCreationThreads);
    if (arrCodes.some((a) => a.code === strFinalCode)) {
        return createAlert('warning', ALERTS.PROMO_ALREADY_CREATED, 3000);
    }

    // Create a new thread
    const cThread = {
        code: strFinalCode,
        amount: nAmount,
        thread: new Worker(new URL('./promos_worker.js', import.meta.url)),
        txid: '',
        update: function (evt) {
            if (evt.data.type === 'progress') {
                this.progress = evt.data.res.progress;
                // If the State HTML is available, render it!
                const cElement = document.getElementById('c' + this.code);
                if (cElement) {
                    cElement.innerText = this.progress;
                }
            } else {
                this.key = evt.data.res.bytes;
            }
        },
        end_state: '',
    };

    // Inject the promo code in to the thread context
    cThread.thread.code = strFinalCode;

    // Setup it's internal update function
    cThread.thread.onmessage = cThread.update;

    // Start the thread
    cThread.thread.postMessage(strFinalCode);

    // Push to the global threads list
    arrPromoCreationThreads.push(cThread);

    // Refresh the promo UI
    await updatePromoCreationTick();
}

export async function deletePromoCode(strCode) {
    // Delete any ongoing threads
    const nThread = arrPromoCreationThreads.findIndex(
        (a) => a.code === strCode
    );
    if (nThread >= 0) {
        // Terminate the Web Worker
        arrPromoCreationThreads[nThread].thread.terminate();
        // Remove the thread from memory
        arrPromoCreationThreads.splice(nThread, 1);
    }

    // Delete the database entry, if it exists
    const db = await Database.getInstance();
    await db.removePromo(strCode);

    // And splice from post-creation memory too, if it exists
    const nMemIndex = arrPromoCodes.findIndex(
        (cCode) => cCode.code === strCode
    );
    if (nMemIndex >= 0) {
        arrPromoCodes.splice(nMemIndex, 1);
    }

    // Re-render promos
    await updatePromoCreationTick();
}

/**
 * A pair of code quantity and HTML
 * @typedef {Object} RenderedPromoPair
 * @property {number} codes - The number of codes returned in the response.
 * @property {string} html - The HTML string returned in the response.
 */

/** An in-memory representation of all created Promo Wallets
 * @type {Array<PromoWallet>}
 */
let arrPromoCodes = [];

/**
 * Render locally-saved Promo Codes in the created list
 * @type {Promise<RenderedPromoPair>} - The code count and HTML pair
 */
export async function renderSavedPromos() {
    // Begin rendering our list of codes
    let strHTML = '';

    // Finished or 'Saved' codes are hoisted to the top, static
    const db = await Database.getInstance();
    const arrCodes = await db.getAllPromos();

    // Render each code; sorted by Newest First, Oldest Last.
    for (const cDiskCode of arrCodes.sort((a, b) => b.time - a.time)) {
        // Move on-disk promos to a memory representation for quick state computation
        let cCode = arrPromoCodes.find((code) => code.code === cDiskCode.code);
        if (!cCode) {
            // Push this disk promo to memory
            cCode = cDiskCode;
            arrPromoCodes.push(cCode);
        }

        // Sync only the balance of the code (not full data)
        cCode.getUTXOs(false);
        const nBal = (await cCode.getBalance(true)) / COIN;

        // A code younger than ~3 minutes without a balance will just say 'confirming', since Blockbook does not return a balance for NEW codes
        const fNew = cCode.time.getTime() > Date.now() - 60000 * 3;

        // If this code is allowed to be deleted or not
        const fCannotDelete = !cCode.fSynced || fNew || nBal > 0;

        // Status calculation (defaults to 'fNew' condition)
        let strStatus = 'Confirming...';
        if (!fNew) {
            if (cCode.fSynced) {
                strStatus = nBal > 0 ? 'Unclaimed' : 'Claimed';
            } else {
                strStatus = 'Syncing';
            }
        }
        strHTML += `
             <tr>
                 <td>${
                     fCannotDelete
                         ? '<i class="fa-solid fa-ban" style="opacity: 0.4; cursor: default;">'
                         : '<i class="fa-solid fa-ban ptr" onclick="MPW.deletePromoCode(\'' +
                           cCode.code +
                           '\')"></i>'
                 }
                 </td>
                 <td><i onclick="MPW.toClipboard('copy${
                     cCode.address
                 }', this)" class="fas fa-clipboard" style="cursor: pointer; margin-right: 10px;"></i><code id="copy${
            cCode.address
        }" class="wallet-code" style="display: inline !important; color: purple;">${
            cCode.code
        }</code></td>
                 <td>${
                     fNew || !cCode.fSynced
                         ? '...'
                         : nBal + ' ' + cChainParams.current.TICKER
                 }</td>
                 <td><a class="ptr active" style="margin-right: 10px;" href="${
                     getNetwork().strUrl + '/address/' + cCode.address
                 }" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-up-right-from-square"></i></a>${strStatus}</td>
             </tr>
         `;
    }

    // Return how many codes were rendered
    return { codes: arrCodes.length, html: strHTML };
}

/** Export and download all PIVX Promos data in to a CSV format */
export async function promosToCSV() {
    const arrCSV = [
        // Titles
        ['Promo Code', 'PIV (Remaining)', 'Funding Address'],
        // Content
    ];

    // Push each code in to the CSV
    for (const cCode of arrPromoCodes) {
        arrCSV.push([
            cCode.code,
            (await cCode.getBalance(true)) / COIN,
            cCode.address,
        ]);
    }

    // Encode it
    const cCSV = arrayToCSV(arrCSV);

    // Download it
    downloadBlob(cCSV, 'promos.csv', 'text/csv;charset=utf-8;');
}

/**
 * Handle the Promo Workers, Code Rendering, and update or prompt the UI appropriately
 * @param {boolean} fRecursive - Whether this call is self-initiated or not
 */
export async function updatePromoCreationTick(fRecursive = false) {
    // Begin rendering our list of codes
    const cSavedCodes = await renderSavedPromos();
    let strHTML = cSavedCodes.html;

    // Loop all threads, displaying their progress
    for (const cThread of arrPromoCreationThreads) {
        // Check if the code is derived, if so, fill it with it's balance
        if (cThread.thread.key && !cThread.end_state) {
            const strAddress = deriveAddress({ pkBytes: cThread.thread.key });

            // Ensure the wallet is unlocked
            if (masterKey.isViewOnly) {
                $('#redeemCodeModal').modal('hide');
                if (await restoreWallet(translation.walletUnlockPromo)) {
                    // Unlocked! Re-show the promo UI and continue
                    $('#redeemCodeModal').modal('show');
                } else {
                    // Failed to unlock, so just mark as cancelled
                    cThread.end_state = 'Cancelled';
                    $('#redeemCodeModal').modal('show');
                }
            }

            // Send the fill transaction if unlocked
            if (!masterKey.isViewOnly) {
                const res = await createAndSendTransaction({
                    address: strAddress,
                    amount: cThread.amount * COIN + 10000,
                }).catch((_) => {
                    // Failed to create this code - mark it as errored
                    cThread.end_state = 'Errored';
                });
                if (res && res.ok) {
                    cThread.txid = res.txid;
                    cThread.end_state = 'Done';
                } else {
                    // If it looks like it was purposefully cancelled, then mark it as such
                    cThread.end_state = 'Cancelled';
                }
            }
        }

        // The 'state' is either a percentage to completion, the TXID, or an arbitrary state (error, etc)
        let strState = '';
        if (cThread.txid) {
            // Complete state
            strState = 'Confirming...';
        } else if (cThread.end_state) {
            // Errored state (failed to broadcast, etc)
            strState = cThread.end_state;
        } else {
            // Display progress
            strState =
                '<span id="c' +
                cThread.code +
                '">' +
                (cThread.thread.progress || 0) +
                '</span>%';
        }

        // Render the table row
        strHTML =
            `
             <tr>
                 <td><i class="fa-solid fa-ban ptr" onclick="MPW.deletePromoCode('${cThread.code}')"></i></td>
                 <td><code class="wallet-code active" style="display: inline !important;">${cThread.code}</code></td>
                 <td>${cThread.amount} ${cChainParams.current.TICKER}</td>
                 <td>${strState}</td>
             </tr>
         ` + strHTML;
    }

    // Render the compiled HTML
    doms.domRedeemCodeCreatePendingList.innerHTML = strHTML;

    const db = await Database.getInstance();
    for (const cThread of arrPromoCreationThreads) {
        if (cThread.end_state === 'Done') {
            // Convert to PromoWallet
            const cPromo = new PromoWallet({
                code: cThread.code,
                address: deriveAddress({ pkBytes: cThread.thread.key }),
                pkBytes: cThread.thread.key,
                // For storage, UTXOs are not necessary, so are left empty
                utxos: [],
                time: Date.now(),
            });

            // Save to DB
            await db.addPromo(cPromo);

            // Terminate and destroy the thread
            cThread.thread.terminate();
            arrPromoCreationThreads.splice(
                arrPromoCreationThreads.findIndex(
                    (a) => a.code === cThread.code
                ),
                1
            );
        }
    }

    // After the update completes, await another update in one second
    if (!fPromoIntervalStarted || fRecursive) {
        fPromoIntervalStarted = true;
        setTimeout(() => updatePromoCreationTick(true), 1000);
    }
}

/**
 * A sweep wrapper that handles the Promo UI after the sweep completes
 */
export async function sweepPromoCode() {
    // Only allow clicking if there's a promo code loaded in memory
    if (!cPromoWallet) return false;

    // Convert the Promo Wallet in to a LegacyMasterkey
    const cSweepMasterkey = new LegacyMasterKey({
        pkBytes: cPromoWallet.pkBytes,
    });

    // Perform sweep
    const strTXID = await sweepAddress(
        await cPromoWallet.getUTXOs(true),
        cSweepMasterkey,
        PROMO_FEE
    );

    // Display the promo redeem results, then schedule a reset of the UI
    if (strTXID) {
        // Coins were redeemed!
        const nAmt = ((await cPromoWallet.getBalance(true)) - PROMO_FEE) / COIN;
        doms.domRedeemCodeETA.innerHTML =
            '<br><br>You redeemed <b>' +
            nAmt.toLocaleString('en-GB') +
            ' ' +
            cChainParams.current.TICKER +
            '!</b>';
        resetRedeemPromo(15);
    } else {
        // Most likely; this TX was claimed very recently and a mempool conflict occurred
        doms.domRedeemCodeETA.innerHTML =
            '<br><br>Oops, this code was valid, but someone may have claimed it seconds earlier!';
        doms.domRedeemCodeGiftIcon.classList.remove('fa-gift');
        doms.domRedeemCodeGiftIcon.classList.remove('fa-solid');
        doms.domRedeemCodeGiftIcon.classList.add('fa-face-frown');
        doms.domRedeemCodeGiftIcon.classList.add('fa-regular');
        resetRedeemPromo(7.5);
    }
}

/**
 * Resets the 'Redeem' promo code system back to it's default state
 * @param {number} nSeconds - The seconds to wait until the full reset
 */
export function resetRedeemPromo(nSeconds = 5) {
    // Nuke the in-memory Promo Wallet
    cPromoWallet = null;

    // Reset Promo UI
    doms.domRedeemCodeInput.value = '';
    doms.domRedeemCodeGiftIcon.classList.remove('ptr');
    doms.domRedeemCodeGiftIcon.classList.remove('fa-shake');

    // After the specified seconds, reset the UI fully, and wipe the Promo Wallet
    setTimeout(() => {
        doms.domRedeemCodeETA.innerHTML = '';
        doms.domRedeemCodeInputBox.style.display = '';
        doms.domRedeemCodeGiftIconBox.style.display = 'none';
        doms.domRedeemCodeGiftIcon.classList.add('fa-gift');
        doms.domRedeemCodeGiftIcon.classList.add('fa-solid');
        doms.domRedeemCodeGiftIcon.classList.remove('fa-face-frown');
        doms.domRedeemCodeGiftIcon.classList.remove('fa-regular');
        doms.domRedeemCodeConfirmBtn.style.display = '';
    }, nSeconds * 1000);
}

/**
 * @type {Worker?} - The thread used for the PIVX Promos redeem process
 */
export let promoThread = null;

/**
 * Derive a 'PIVX Promos' code with a webworker
 * @param {string} strCode - The Promo Code to derive
 */
export async function redeemPromoCode(strCode) {
    // Ensure a Promo Code is not already being redeemed
    if (promoThread) return;

    // Create a new thread
    promoThread = new Worker(new URL('./promos_worker.js', import.meta.url));

    // Hide unnecessary UI components
    doms.domRedeemCodeInputBox.style.display = 'none';
    doms.domRedeemCodeConfirmBtn.style.display = 'none';

    // Display Progress data and Redeem Animations
    doms.domRedeemCodeETA.style.display = '';
    doms.domRedeemCodeGiftIconBox.style.display = '';
    doms.domRedeemCodeGiftIcon.classList.add('fa-bounce');

    // Listen for and report derivation progress
    promoThread.onmessage = async (evt) => {
        if (evt.data.type === 'progress') {
            doms.domRedeemCodeProgress.style.display = '';
            doms.domRedeemCodeETA.innerHTML =
                '<br><br>' +
                evt.data.res.eta.toFixed(0) +
                's remaining to unwrap...<br><br>' +
                evt.data.res.progress +
                '%';
            doms.domRedeemCodeProgress.value = evt.data.res.progress;
        } else {
            // The finished key!
            promoThread.terminate();
            promoThread = null;

            // Pause animations and finish 'unwrapping' by checking the derived Promo Key for a balance
            doms.domRedeemCodeGiftIcon.classList.remove('fa-bounce');
            doms.domRedeemCodeProgress.style.display = 'none';
            doms.domRedeemCodeETA.innerHTML = '<br><br>Final checks...';

            // Prepare the global Promo Wallet
            cPromoWallet = new PromoWallet({
                code: strCode,
                address: '',
                pkBytes: evt.data.res.bytes,
                utxos: [],
                time: 0,
            });

            // Derive the Public Key and synchronise UTXOs from the network
            const nBalance = await cPromoWallet.getBalance();

            // Display if the code is Valid (has coins) or is empty
            if (nBalance > 0) {
                doms.domRedeemCodeGiftIcon.classList.add('fa-shake');
                doms.domRedeemCodeETA.innerHTML =
                    '<br><br>This code is <b>verified!</b> Tap the gift to open it!';
                doms.domRedeemCodeGiftIcon.classList.add('ptr');
            } else {
                doms.domRedeemCodeETA.innerHTML =
                    '<br><br>This code had no balance!';
                doms.domRedeemCodeGiftIcon.classList.remove('fa-gift');
                doms.domRedeemCodeGiftIcon.classList.remove('fa-solid');
                doms.domRedeemCodeGiftIcon.classList.add('fa-face-frown');
                doms.domRedeemCodeGiftIcon.classList.add('fa-regular');
                resetRedeemPromo();
            }
        }
    };

    // Send our 'Promo Code' to be derived on a separate thread, allowing a faster and non-blocking derivation
    promoThread.postMessage(strCode);
}

/**
 * Prompt a QR scan for a PIVX Promos code
 */
export async function openPromoQRScanner() {
    const cScan = await scanQRCode();

    if (!cScan || !cScan.data) return;

    // Enter the scanned code in to the redeem box
    doms.domRedeemCodeInput.value = cScan.data;
}
