import bitjs from './bitTrx.js';
import { debug } from './settings.js';
import { ALERTS, translation, tr } from './i18n.js';
import {
    doms,
    getBalance,
    mempool,
    isMasternodeUTXO,
    restoreWallet,
    toggleBottomMenu,
    guiSetColdStakingAddress,
} from './global.js';
import { cHardwareWallet, strHardwareName } from './ledger.js';
import { wallet, getNewAddress } from './wallet.js';
import { HdMasterKey } from './masterkey.js';
import {
    COutpoint,
    CTxIn,
    CTxOut,
    Transaction,
    UTXO_WALLET_STATE,
} from './mempool.js';
import { getNetwork } from './network.js';
import { cChainParams, COIN, COIN_DECIMALS } from './chain_params.js';
import {
    createAlert,
    generateMasternodePrivkey,
    confirmPopup,
    isXPub,
    isStandardAddress,
    isColdAddress,
} from './misc.js';
import { bytesToHex, hexToBytes, dSHA256 } from './utils.js';
import { Database } from './database.js';

function validateAmount(nAmountSats, nMinSats = 10000) {
    // Validate the amount is a valid number, and meets the minimum (if any)
    if (nAmountSats < nMinSats || isNaN(nAmountSats)) {
        createAlert(
            'warning',
            tr(ALERTS.INVALID_AMOUNT + ALERTS.VALIDATE_AMOUNT_LOW, [
                { minimumAmount: nMinSats / COIN },
                { coinTicker: cChainParams.current.TICKER },
            ]),
            2500
        );
        return false;
    }

    // Validate the amount in Satoshi terms meets the coin's native decimal depth
    if (!Number.isSafeInteger(nAmountSats)) {
        createAlert(
            'warning',
            tr(
                ALERTS.INVALID_AMOUNT + '<br>' + ALERTS.VALIDATE_AMOUNT_DECIMAL,
                [{ coinDecimal: COIN_DECIMALS }]
            ),
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
    if (!(await wallet.hasWalletUnlocked(true))) return;

    // Ensure the wallet is unlocked
    if (
        wallet.isViewOnly() &&
        !(await restoreWallet(translation.walletUnlockTx))
    )
        return;

    // Sanity check the receiver
    const strRawReceiver = doms.domAddress1s.value.trim();

    // Cache the "end" receiver, which will be an Address
    let strReceiverAddress = strRawReceiver;

    // Check for any contacts that match the input
    const cDB = await Database.getInstance();
    const cAccount = await cDB.getAccount();

    // If we have an Account, then check our Contacts for anything matching too
    const cContact = cAccount?.getContactBy({
        name: strRawReceiver,
        pubkey: strRawReceiver,
    });
    // If a Contact were found, we use it's Pubkey
    if (cContact) strReceiverAddress = cContact.pubkey;

    // If this is an XPub, we'll fetch their last used 'index', and derive a new public key for enhanced privacy
    if (isXPub(strReceiverAddress)) {
        const cNet = getNetwork();
        if (!cNet.enabled)
            return createAlert(
                'warning',
                ALERTS.WALLET_OFFLINE_AUTOMATIC,
                3500
            );

        // Fetch the XPub info
        const cXPub = await cNet.getXPubInfo(strReceiverAddress);

        // Use the latest index plus one (or if the XPub is unused, then the second address)
        const nIndex = (cXPub.usedTokens || 0) + 1;

        // Create a receiver master-key
        const cReceiverWallet = new HdMasterKey({ xpub: strReceiverAddress });
        const strPath = cReceiverWallet.getDerivationPath(0, 0, nIndex);

        // Set the 'receiver address' as the unused XPub-derived address
        strReceiverAddress = cReceiverWallet.getAddress(strPath);
    }

    // If Staking address: redirect to staking page
    if (isColdAddress(strReceiverAddress)) {
        createAlert('warning', ALERTS.STAKE_NOT_SEND, 7500);
        // Close the current Send Popup
        toggleBottomMenu('transferMenu', 'transferAnimation');
        // Open the Staking Dashboard
        return doms.domStakeTab.click();
    }

    // Check if the Receiver Address is a valid P2PKH address
    if (!isStandardAddress(strReceiverAddress))
        return createAlert(
            'warning',
            tr(ALERTS.INVALID_ADDRESS, [{ address: strReceiverAddress }]),
            2500
        );

    // Sanity check the amount
    const nValue = Math.round(
        Number(doms.domSendAmountCoins.value.trim()) * COIN
    );
    if (!validateAmount(nValue)) return;

    // Create and send the TX
    const cRes = await createAndSendTransaction({
        address: strReceiverAddress,
        amount: nValue,
        isDelegation: false,
    });

    // If successful, wipe Tx input
    if (cRes.ok) {
        // Address
        doms.domAddress1s.value = '';
        // Amount
        doms.domSendAmountCoins.value = '';
        // Price
        doms.domSendAmountValue.value = '';

        // Wipe any Payment Request info
        if (doms.domReqDesc.value) {
            // Description
            doms.domReqDesc.value = '';
            doms.domReqDisplay.style.display = 'none';
        }
    }
}

/**
 * Create a Cold Staking delegation transaction
 */
export async function delegateGUI() {
    // Ensure the wallet is unlocked
    if (
        wallet.isViewOnly() &&
        !(await restoreWallet(
            `${translation.walletUnlockStake} ${cChainParams.current.TICKER}!`
        ))
    )
        return;

    // Verify the amount; Delegations must be a minimum of 1 PIV, enforced by the network
    const nAmount = Math.round(Number(doms.domStakeAmount.value.trim()) * COIN);
    if (!validateAmount(nAmount, COIN)) return;

    // (Advanced Mode) Verify the Owner Address, if any was provided
    const strOwnerAddress = doms.domStakeOwnerAddress.value.trim();

    // Perform the TX
    const cTxRes = await createAndSendTransaction({
        amount: nAmount,
        address: await wallet.getColdStakingAddress(),
        isDelegation: true,
        useDelegatedInputs: false,
        delegationOwnerAddress: strOwnerAddress,
    });

    // If successful, reset the inputs
    if (cTxRes.ok) {
        doms.domStakeAmount.value = '';
        doms.domStakeAmountValue.value = '';
        doms.domStakeOwnerAddress.value = '';

        // And close the modal
        toggleBottomMenu('stakingDelegate', 'transferAnimation');
    }
}

/**
 * Create a Cold Staking undelegation transaction
 */
export async function undelegateGUI() {
    if (wallet.isHardwareWallet()) {
        return createAlert('warning', ALERTS.STAKING_LEDGER_NO_SUPPORT, 6000);
    }

    // Ensure the wallet is unlocked
    if (
        wallet.isViewOnly() &&
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
    const [address] = wallet.getNewAddress();

    // Perform the TX
    const cTxRes = await createAndSendTransaction({
        address,
        amount: nAmount,
        isDelegation: false,
        useDelegatedInputs: true,
        delegateChange: true,
        changeDelegationAddress: await wallet.getColdStakingAddress(),
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
 * @param {boolean} options.delegateChange - If there is at least 1.01 PIV of change, the change will be delegated to options.changeDelegationAddress
 * @param {string|null} options.changeDelegationAddress - See options.delegateChange
 * @param {string|null} options.delegationOwnerAddress - An optional Owner Address to use for the delegation
 * @returns {Promise<{ok: boolean, err: string?}>}
 */
export async function createAndSendTransaction({
    address,
    amount,
    isDelegation = false,
    useDelegatedInputs = false,
    delegateChange = false,
    changeDelegationAddress = null,
    delegationOwnerAddress = '',
    isProposal = false,
}) {
    if (!(await wallet.hasWalletUnlocked(true))) return;
    if ((isDelegation || useDelegatedInputs) && wallet.isHardwareWallet()) {
        return createAlert('warning', ALERTS.STAKING_LEDGER_NO_SUPPORT, 6000);
    }

    // Ensure the wallet is unlocked
    if (
        wallet.isViewOnly() &&
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
    const [changeAddress, _] = await getNewAddress({
        verify: wallet.isHardwareWallet(),
    });

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
    } else {
        // We're sending alot! So we deduct the fee from the send amount. There's not enough change to pay it with!
        amount -= nFee;
    }

    // Primary output (receiver)
    if (isDelegation) {
        // Check if we're using a custom Cold Stake Owner Address
        const fCustomColdOwner = !!delegationOwnerAddress;

        // For custom Cold Owner Addresses, it could be an external address, so we need the mempool to class it as an 'external send'
        const strOwnerAddress = fCustomColdOwner
            ? delegationOwnerAddress
            : (await wallet.getNewAddress())[0];
        const strOwnerPath = await wallet.isOwnAddress(strOwnerAddress);

        // Create the Delegation output
        cTx.addcoldstakingoutput(strOwnerAddress, address, amount / COIN);
        outputs.push([strOwnerAddress, address, amount / COIN]);
    } else if (isProposal) {
        cTx.addproposaloutput(address, amount / COIN);
    } else {
        cTx.addoutput(address, amount / COIN);
        outputs.push([address, amount / COIN]);
    }

    // Debug-only verbose response
    if (debug) {
        console.log(`
            ---- NEW TRANSACTION (Debug Mode) ----
             Old Balance : ${nBalance / COIN}
             Fee         : ${nFee / COIN}
             To          : ${address}
             Sent        : ${amount / COIN}
             Inputs Qty  : ${cTx.inputs.length}
             Outputs Qty : ${outputs.length}
             Change addr : ${nChange > 0 ? changeAddress : 'N/A (no change)'}
             Change      : ${nChange > 0 ? nChange / COIN : 'N/A (no change)'}
             Tx Size (b) : ${cTx.serialize().length}
            ---- END TRANSACTION (Debug Mode) ----
        `);
    }

    const sign = await signTransaction(cTx, wallet, outputs, delegateChange);
    const result = await getNetwork().sendTransaction(sign);
    // Update the mempool
    if (result) {
        const futureTxid = bytesToHex(dSHA256(hexToBytes(sign)).reverse());
        // Build Transaction object
        const vin = cTx.inputs.map(
            (inp) =>
                new CTxIn({
                    outpoint: new COutpoint({
                        txid: inp.outpoint.hash,
                        n: inp.outpoint.index,
                    }),
                    scriptSig: bytesToHex(inp.script),
                })
        );
        const vout = cTx.outputs.map(
            (out, i) =>
                new CTxOut({
                    outpoint: new COutpoint({
                        txid: futureTxid,
                        n: i,
                    }),
                    script: bytesToHex(out.script),
                    value: Number(out.value),
                })
        );
        const parsedTx = new Transaction({
            txid: futureTxid,
            blockHeight: -1,
            vin: vin,
            vout: vout,
        });
        mempool.updateMempool(parsedTx);
    }
    return { ok: !!result, txid: result };
}

/**
 * Create a Masternode collateral transaction for the user
 */
export async function createMasternode() {
    // Ensure the wallet is unlocked
    if (
        wallet.isViewOnly() &&
        !(await restoreWallet(translation.walletUnlockCreateMN))
    )
        return;

    // Generate the Masternode collateral
    const [address] = getNewAddress({ verify: wallet.isHardwareWallet() });
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

export async function signTransaction(cTx, wallet, outputs, undelegate) {
    if (!wallet.isHardwareWallet()) {
        return await cTx.sign(wallet, 1, undelegate ? 'coldstake' : undefined);
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
        const path = wallet.getPath(cInput.script);
        if (path === null) {
            console.error('ERROR: PATH IS NULL');
        }
        arrAssociatedKeysets.push(path);
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
    const filter = fColdOnly
        ? UTXO_WALLET_STATE.SPENDABLE_COLD
        : UTXO_WALLET_STATE.SPENDABLE;
    const arrUTXOs = mempool.getUTXOs({
        filter: filter,
        target: nTotalSatsRequired,
    });

    // Select and return UTXO pointers (filters applied)
    const cCoinControl = { nValue: 0, nChange: 0, arrSelectedUTXOs: [] };
    const masternode = await (await Database.getInstance()).getMasternode();

    for (let i = 0; i < arrUTXOs.length; i++) {
        const cUTXO = arrUTXOs[i];
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
        if (cUTXO.value < nMinInputSize) continue;

        // Push UTXO and cache new total value
        cCoinControl.arrSelectedUTXOs.push(cUTXO);
        cCoinControl.nValue += cUTXO.value;
        console.log(
            'Coin Control: Selected input ' +
                cUTXO.outpoint.txid.substr(0, 6) +
                '(' +
                cUTXO.outpoint.n +
                ')... (Added ' +
                cUTXO.value / COIN +
                ' ' +
                cChainParams.current.TICKER +
                ' - Total: ' +
                cCoinControl.nValue / COIN +
                ')'
        );

        // Stuff UTXO into the TX
        cTx.addinput({
            txid: cUTXO.outpoint.txid,
            index: cUTXO.outpoint.n,
            script: cUTXO.script,
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
