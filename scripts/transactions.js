import bitjs from './bitTrx.js';
import { debug, strColdStakingAddress } from './settings.js';
import { ALERTS, translation } from './i18n.js';
import {
    doms,
    getBalance,
    mempool,
    isMasternodeUTXO,
    restoreWallet,
    toggleBottomMenu,
    guiSetColdStakingAddress,
} from './global.js';
import {
    hasWalletUnlocked,
    masterKey,
    getNewAddress,
    cHardwareWallet,
    strHardwareName,
} from './wallet.js';
import { Mempool, UTXO } from './mempool.js';
import { getNetwork } from './network.js';
import { cChainParams, COIN, COIN_DECIMALS } from './chain_params.js';
import {
    createAlert,
    generateMasternodePrivkey,
    confirmPopup,
} from './misc.js';
import { bytesToHex, hexToBytes, dSHA256 } from './utils.js';
import { Database } from './database.js';

function validateAmount(nAmountSats, nMinSats = 10000) {
    // Validate the amount is a valid number, and meets the minimum (if any)
    if (nAmountSats < nMinSats || isNaN(nAmountSats)) {
        createAlert(
            'warning',
            ALERTS.INVALID_AMOUNT + ALERTS.VALIDATE_AMOUNT_LOW,
            [
                { minimumAmount: nMinSats / COIN },
                { coinTicker: cChainParams.current.TICKER },
            ],
            2500
        );
        return false;
    }

    // Validate the amount in Satoshi terms meets the coin's native decimal depth
    if (!Number.isSafeInteger(nAmountSats)) {
        createAlert(
            'warning',
            ALERTS.INVALID_AMOUNT + '<br>' + ALERTS.VALIDATE_AMOUNT_DECIMAL,
            [{ coinDecimal: COIN_DECIMALS }],
            2500
        );
        return false;
    }

    // Amount looks valid!
    return true;
}

/**
 * Create a transaction using input from the user interface
 */
export async function createTxGUI() {
    // Ensure a wallet is loaded
    if (!(await hasWalletUnlocked(true))) return;

    // Ensure the wallet is unlocked
    if (
        masterKey.isViewOnly &&
        !(await restoreWallet(translation.walletUnlockTx))
    )
        return;

    // Sanity check the address
    const address = doms.domAddress1s.value.trim();

    // If Staking address: redirect to staking page
    if (address.startsWith(cChainParams.current.STAKING_PREFIX)) {
        createAlert('warning', ALERTS.STAKE_NOT_SEND, [], 7500);
        return doms.domStakeTab.click();
    }

    if (address.length !== 34)
        return createAlert(
            'warning',
            ALERTS.BAD_ADDR_LENGTH,
            [{ addressLength: address.length }],
            2500
        );

    // Sanity check the amount
    let nValue = Math.round(
        Number(doms.domSendAmountCoins.value.trim()) * COIN
    );
    if (nValue <= 0 || isNaN(nValue))
        return createAlert(
            'warning',
            ALERTS.INVALID_AMOUNT + ALERTS.SENT_NOTHING,
            [],
            2500
        );
    if (!Number.isSafeInteger(nValue))
        return createAlert(
            'warning',
            ALERTS.INVALID_AMOUNT + ALERTS.MORE_THEN_8_DECIMALS,
            [],
            2500
        );

    // Create and send the TX
    const cRes = await createAndSendTransaction({
        address,
        amount: nValue,
        isDelegation: false,
    });

    // Wipe any payment request info
    if (cRes.ok && doms.domReqDesc.value) {
        // Description
        doms.domReqDesc.value = '';
        doms.domReqDisplay.style.display = 'none';
        // Address
        doms.domAddress1s.value = '';
        // Amount
        doms.domSendAmountCoins.value = '';
        // Price
        doms.domSendAmountValue.value = '';
    }
}

/**
 * Create a Cold Staking delegation transaction
 */
export async function delegateGUI() {
    // Ensure the wallet is unlocked
    if (
        masterKey.isViewOnly &&
        !(await restoreWallet(
            `${translation.walletUnlockStake} ${cChainParams.current.TICKER}!`
        ))
    )
        return;

    // Verify the amount; Delegations must be a minimum of 1 PIV, enforced by the network
    const nAmount = Number(doms.domStakeAmount.value.trim()) * COIN;
    if (!validateAmount(nAmount, COIN)) return;

    // Ensure the user has an address set - if not, request one!
    if (
        (!strColdStakingAddress ||
            strColdStakingAddress[0] !== cChainParams.current.STAKING_PREFIX) &&
        (await guiSetColdStakingAddress()) === false
    )
        return;

    // Perform the TX
    const cTxRes = await createAndSendTransaction({
        amount: nAmount,
        address: strColdStakingAddress,
        isDelegation: true,
        useDelegatedInputs: false,
    });

    // If successful, reset the inputs
    if (cTxRes.ok) {
        doms.domStakeAmount.value = '';
        doms.domStakeAmountValue.value = '';

        // And close the modal
        toggleBottomMenu('stakingDelegate', 'transferAnimation');
    }
}

/**
 * Create a Cold Staking undelegation transaction
 */
export async function undelegateGUI() {
    if (masterKey.isHardwareWallet) {
        return createAlert('warning', ALERTS.STAKING_LEDGER_NO_SUPPORT, 6000);
    }

    // Ensure the wallet is unlocked
    if (
        masterKey.isViewOnly &&
        !(await restoreWallet(
            `${translation.walletUnlockUnstake} ${cChainParams.current.TICKER}!`
        ))
    )
        return;

    // Verify the amount
    const nAmount = Math.round(
        Number(doms.domUnstakeAmount.value.trim()) * COIN
    );
    if (!validateAmount(nAmount)) return;

    // Generate a new address to undelegate towards
    const [address] = await getNewAddress();

    // Perform the TX
    const cTxRes = await createAndSendTransaction({
        address,
        amount: nAmount,
        isDelegation: false,
        useDelegatedInputs: true,
        delegateChange: true,
        changeDelegationAddress: strColdStakingAddress,
    });

    if (!cTxRes.ok && cTxRes.err === 'No change addr') {
        await guiSetColdStakingAddress();
        await undelegateGUI();
    } else {
        // If successful, reset the inputs
        doms.domUnstakeAmount.value = '';
        doms.domUnstakeAmountValue.value = '';

        // And close the modal
        toggleBottomMenu('stakingUndelegate', 'transferAnimation');
    }
}

/**
 * Creates and sends a transaction to the network.
 * @param {Object} options
 * @param {string} options.address - base58 encoded address to send funds to
 * @param {Number} options.amount - Number of satoshi to send
 * @param {boolean} options.isDelegation - Whether to delegate the amount. Address will be the cold staking address
 * @param {boolean} options.useDelegatedInputs - If true, only delegated coins will be used in the transaction
 * @param {delegateChange} options.delegateChange - If there is at least 1.01 PIV of change, the change will be delegated to options.changeDelegationAddress
 * @param {string|null} options.changeDelegationAddress - See options.delegateChange
 * @returns {Promise<{ok: boolean, err: string?}>}
 */
export async function createAndSendTransaction({
    address,
    amount,
    isDelegation = false,
    useDelegatedInputs = false,
    delegateChange = false,
    changeDelegationAddress = null,
    isProposal = false,
}) {
    if (!(await hasWalletUnlocked(true))) return;
    if ((isDelegation || useDelegatedInputs) && masterKey.isHardwareWallet) {
        return createAlert('warning', ALERTS.STAKING_LEDGER_NO_SUPPORT, 6000);
    }

    // Ensure the wallet is unlocked
    if (
        masterKey.isViewOnly &&
        !(await restoreWallet(translation.walletUnlockTx))
    )
        return;

    // Construct a TX and fetch Standard inputs
    const nBalance = getBalance();
    const cTx = new bitjs.transaction();
    const cCoinControl = await chooseUTXOs(cTx, amount, 0, useDelegatedInputs);
    if (!cCoinControl.success)
        return createAlert('warning', cCoinControl.msg, 5000);
    // Compute fee
    const nFee = getNetwork().getFee(cTx.serialize().length);

    // Compute change (or lack thereof)
    const nChange = cCoinControl.nValue - (nFee + amount);
    const [changeAddress, changeAddressPath] = await getNewAddress({
        verify: masterKey.isHardwareWallet,
    });

    /**
     * Array containing known UTXOs we can spend after the transaction is complete
     * @type{Array<UTXO>}
     */
    const knownUTXOs = [];
    /**
     * Array containing the transaction outputs, useful for showing confirmation screen
     */
    const outputs = [];
    if (nChange > 0) {
        if (delegateChange && nChange > 1.01 * COIN) {
            if (!changeDelegationAddress)
                return { ok: false, err: 'No change addr' };
            cTx.addcoldstakingoutput(
                changeAddress,
                changeDelegationAddress,
                nChange / COIN
            );
            outputs.push([
                changeAddress,
                changeDelegationAddress,
                nChange / COIN,
            ]);
        } else {
            // Change output
            cTx.addoutput(changeAddress, nChange / COIN);
            outputs.push([changeAddress, nChange / COIN]);
        }
        knownUTXOs.push(
            new UTXO({
                id: null, // We still don't know the txid
                path: changeAddressPath,
                script: cTx.outputs[0].script,
                sats: nChange,
                vout: 0,
                status: Mempool.PENDING,
                isDelegate: delegateChange && nChange > 1.01 * COIN,
            })
        );
    } else {
        // We're sending alot! So we deduct the fee from the send amount. There's not enough change to pay it with!
        amount -= nFee;
    }

    // Primary output (receiver)
    if (isDelegation) {
        const [primaryAddress, primaryAddressPath] = await getNewAddress();
        cTx.addcoldstakingoutput(primaryAddress, address, amount / COIN);
        outputs.push([primaryAddress, address, amount / COIN]);

        knownUTXOs.push(
            new UTXO({
                id: null,
                path: primaryAddressPath,
                script: cTx.outputs[cTx.outputs.length - 1].script,
                sats: amount,
                vout: cTx.outputs.length - 1,
                status: Mempool.PENDING,
                isDelegate: true,
            })
        );
    } else if (isProposal) {
        cTx.addproposaloutput(address, amount / COIN);
    } else {
        cTx.addoutput(address, amount / COIN);
        outputs.push([address, amount / COIN]);
    }

    // Debug-only verbose response
    if (debug)
        doms.domHumanReadable.innerHTML =
            'Balance: ' +
            nBalance / COIN +
            '<br>Fee: ' +
            nFee / COIN +
            '<br>To: ' +
            address +
            '<br>Sent: ' +
            amount / COIN +
            (nChange > 0
                ? '<br>Change Address: ' +
                  changeAddress +
                  '<br>Change: ' +
                  nChange / COIN
                : '');
    const sign = await signTransaction(cTx, masterKey, outputs, delegateChange);
    const result = await getNetwork().sendTransaction(sign);
    // Update the mempool
    if (result) {
        // Remove spent inputs
        for (const tx of cTx.inputs) {
            mempool.autoRemoveUTXO({
                id: tx.outpoint.hash,
                path: tx.path,
                vout: tx.outpoint.index,
            });
        }

        const futureTxid = bytesToHex(dSHA256(hexToBytes(sign)).reverse());

        for (const utxo of knownUTXOs) {
            utxo.id = futureTxid;
            mempool.addUTXO(utxo);
        }

        if (!isDelegation && !isProposal) {
            const path = await masterKey.isOwnAddress(address);

            // If the tx was sent to yourself, add it to the mempool
            if (path) {
                const vout = nChange > 0 ? 1 : 0;
                mempool.addUTXO(
                    new UTXO({
                        id: futureTxid,
                        path,
                        sats: amount,
                        vout,
                        script: bytesToHex(cTx.outputs[vout].script),
                        status: Mempool.PENDING,
                    })
                );
            }
        }
    }
    return { ok: !!result, txid: result };
}

/**
 * Create a Masternode collateral transaction for the user
 */
export async function createMasternode() {
    // Ensure the wallet is unlocked
    if (
        masterKey.isViewOnly &&
        !(await restoreWallet(translation.walletUnlockCreateMN))
    )
        return;

    // Generate the Masternode collateral
    const [address] = await getNewAddress();
    const result = await createAndSendTransaction({
        amount: cChainParams.current.collateralInSats,
        address,
    });
    if (!result.ok) {
        return;
    }

    // Generate a Masternode private key if the user wants a self-hosted masternode
    const fGeneratePrivkey = doms.domMnCreateType.value === 'VPS';
    if (fGeneratePrivkey) {
        await confirmPopup({
            title: ALERTS.CONFIRM_POPUP_MN_P_KEY,
            html:
                generateMasternodePrivkey() +
                ALERTS.CONFIRM_POPUP_MN_P_KEY_HTML,
        });
    }
    createAlert('success', ALERTS.MN_CREATED_WAIT_CONFS);
    // Remove any previous Masternode data, if there were any
    const database = await Database.getInstance();
    database.removeMasternode();
}

export async function signTransaction(cTx, masterKey, outputs, undelegate) {
    if (!masterKey.isHardwareWallet) {
        return await cTx.sign(
            masterKey,
            1,
            undelegate ? 'coldstake' : undefined
        );
    }
    // Format the inputs how the Ledger SDK prefers
    const arrInputs = [];
    const arrAssociatedKeysets = [];
    for (const cInput of cTx.inputs) {
        const cInputFull = await getNetwork().getTxInfo(cInput.outpoint.hash);
        arrInputs.push([
            await cHardwareWallet.splitTransaction(cInputFull.hex),
            cInput.outpoint.index,
        ]);
        arrAssociatedKeysets.push(cInput.path);
    }
    const cLedgerTx = await cHardwareWallet.splitTransaction(cTx.serialize());
    const strOutputScriptHex = await cHardwareWallet
        .serializeTransactionOutputs(cLedgerTx)
        .toString('hex');

    // Sign the transaction via Ledger
    return await confirmPopup({
        title: ALERTS.CONFIRM_POPUP_TRANSACTION,
        html: createTxConfirmation(outputs),
        resolvePromise: cHardwareWallet.createPaymentTransaction({
            inputs: arrInputs,
            associatedKeysets: arrAssociatedKeysets,
            outputScriptHex: strOutputScriptHex,
        }),
    });
}

// Coin Control response formats
function ccError(msg = '') {
    return { success: false, msg };
}

function ccSuccess(data) {
    return { success: true, ...data };
}

async function chooseUTXOs(
    cTx,
    nTotalSatsRequired = 0,
    nMinInputSize = 0,
    fColdOnly = false
) {
    console.log(
        'Constructing TX of value: ' +
            nTotalSatsRequired / COIN +
            ' ' +
            cChainParams.current.TICKER
    );

    // Select the UTXO type bucket

    //const arrUTXOs
    const arrUTXOs = fColdOnly
        ? mempool.getDelegatedUTXOs()
        : mempool.getStandardUTXOs();

    // Select and return UTXO pointers (filters applied)
    const cCoinControl = { nValue: 0, nChange: 0, arrSelectedUTXOs: [] };
    const masternode = await (await Database.getInstance()).getMasternode();

    for (let i = 0; i < arrUTXOs.length; i++) {
        const cUTXO = arrUTXOs[i];
        if (!Mempool.isValidUTXO(cUTXO)) {
            continue;
        }
        // Don't spend locked Masternode collaterals
        if (isMasternodeUTXO(cUTXO, masternode)) continue; //CHANGE THIS

        // Have we met the required sats threshold?
        if (
            cCoinControl.nValue >=
            nTotalSatsRequired + getNetwork().getFee(cTx.serialize().length)
        ) {
            // Required Coin Control value met, yahoo!
            console.log(
                'Coin Control: TX Constructed! Selected ' +
                    cCoinControl.arrSelectedUTXOs.length +
                    ' input(s) (' +
                    cCoinControl.nValue / COIN +
                    ' ' +
                    cChainParams.current.TICKER +
                    ')'
            );
            break;
        }

        // Does the UTXO meet size requirements?
        if (cUTXO.sats < nMinInputSize) continue;

        // Push UTXO and cache new total value
        cCoinControl.arrSelectedUTXOs.push(cUTXO);
        cCoinControl.nValue += cUTXO.sats;
        console.log(
            'Coin Control: Selected input ' +
                cUTXO.id.substr(0, 6) +
                '(' +
                cUTXO.vout +
                ')... (Added ' +
                cUTXO.sats / COIN +
                ' ' +
                cChainParams.current.TICKER +
                ' - Total: ' +
                cCoinControl.nValue / COIN +
                ')'
        );

        // Stuff UTXO into the TX
        cTx.addinput({
            txid: cUTXO.id,
            index: cUTXO.vout,
            script: cUTXO.script,
            path: cUTXO.path,
        });
    }

    // if we don't have enough value: return false
    if (cCoinControl.nValue < nTotalSatsRequired)
        return ccError(
            'Balance is too small! (Missing ' +
                (cCoinControl.nValue - nTotalSatsRequired).toLocaleString(
                    'en-gb'
                ) +
                ' sats)'
        );

    // Reaching here: we have sufficient UTXOs, calc final misc data and return!
    cCoinControl.nChange = nTotalSatsRequired - cCoinControl.nValue;
    return ccSuccess(cCoinControl);
}

function createTxConfirmation(outputs) {
    let strHtml =
        'Confirm this transaction matches the one on your ' +
        strHardwareName +
        '.';
    for (const output of outputs) {
        strHtml += `<br> <br> You will send <b>${output[1].toFixed(2)} ${
            cChainParams.current.TICKER
        }</b> to <div class="inline-address">${output[0]}</div>`;
    }
    return strHtml;
}
