import bitjs from './bitTrx.js';
import { debug } from './settings.js';
import {
    doms,
    getBalance,
    getStakingBalance,
    mempool,
    isMasternodeUTXO,
    askForCSAddr,
    cachedColdStakeAddr,
} from './global.js';
import { getFee, sendTransaction, getTxInfo } from './network.js';
import { Mempool } from './mempool.js';
import { ALERTS } from './i18n.js';
import {
    hasWalletUnlocked,
    hasHardwareWallet,
    masterKey,
    getNewAddress,
    isYourAddress,
    cHardwareWallet,
    strHardwareName,
} from './wallet.js';
import { cChainParams, COIN, COIN_DECIMALS } from './chain_params.js';
import { createAlert, generateMnPrivkey, confirmPopup } from './misc.js';
import { bytesToHex, hexToBytes, dSHA256 } from './utils.js';

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

export function undelegateGUI() {
    if (masterKey.isViewOnly) {
        return createAlert(
            'warning',
            'Attempting to undelegate in view only mode.',
            6000
        );
    }
    // Verify the amount
    const nAmount = Math.round(
        Number(doms.domGuiUndelegateAmount.value.trim()) * COIN
    );
    if (!validateAmount(nAmount)) return;

    undelegate(nAmount);
}

async function undelegate(nValue) {
    if (!hasWalletUnlocked(true)) return;

    // Construct a TX and fetch Cold inputs
    const nBalance = getStakingBalance();
    const cTx = new bitjs.transaction();
    const cCoinControl = chooseUTXOs(cTx, nValue, 0, true);
    if (!cCoinControl.success) return alert(cCoinControl.msg);

    // Compute fee and change (or lack thereof)
    const nFee = getFee(cTx.serialize().length);
    const nChange = cCoinControl.nValue - (nFee + nValue);
    const fReDelegateChange = nChange > 1.01 * COIN;
    let reDelegateAddress;
    let reDelegateAddressPath;
    if (fReDelegateChange) {
        // Enough change to resume cold staking, so we'll re-delegate change to the cold staking address
        // Ensure the user has an address set - if not, request one!, Sanity
        if (
            !cachedColdStakeAddr ||
            cachedColdStakeAddr.length !== 34 ||
            !cachedColdStakeAddr.startsWith(cChainParams.current.STAKING_PREFIX)
        ) {
            askForCSAddr(true);
            return createAlert('success', ALERTS.SUCCESS_STAKING_ADDR, []);
        }
        // The re-delegated change output
        [reDelegateAddress, reDelegateAddressPath] = await getNewAddress();
        cTx.addcoldstakingoutput(
            reDelegateAddress,
            cachedColdStakeAddr,
            nChange / COIN
        );
        console.log('Re-delegated delegation spend change!');
    } else {
        // Not enough change to cold stake, so we'll just unstake everything (and deduct the fee from the value)
        nValue -= nFee;
        console.log('Spent all CS dust into redeem address!');
    }

    const [outputKey, outputKeyPath] = await getNewAddress();
    // The primary Cold-to-Public output
    cTx.addoutput(outputKey, nValue / COIN);

    // Debug-only verbose response
    if (debug)
        doms.domHumanReadable.innerHTML =
            'Balance: ' +
            nBalance / COIN +
            '<br>Fee: ' +
            nFee / COIN +
            '<br>To: ' +
            outputKey +
            '<br>Sent: ' +
            nValue / COIN +
            (nChange > 0
                ? '<br>Change Address: ' +
                  (fReDelegateChange ? cachedColdStakeAddr : outputKey) +
                  '<br>Change: ' +
                  nChange / COIN
                : '');

    if (hasHardwareWallet()) {
        // Format the inputs how the Ledger SDK prefers
        const arrInputs = [];
        const arrAssociatedKeysets = [];
        for (const cInput of cTx.inputs) {
            const cInputFull = await getTxInfo(cInput.outpoint.hash);
            arrInputs.push([
                await cHardwareWallet.splitTransaction(cInputFull.hex),
                cInput.outpoint.index,
            ]);
            arrAssociatedKeysets.push(cInput.path);
        }

        // Construct the Ledger transaction
        const cLedgerTx = await cHardwareWallet.splitTransaction(
            cTx.serialize()
        );
        const strOutputScriptHex = await cHardwareWallet
            .serializeTransactionOutputs(cLedgerTx)
            .toString('hex');

        // Sign the transaction via Ledger
        createAlert(
            'info',
            ALERTS.CONFIRM_UNSTAKE_H_WALLET,
            [{ strHardwareName: strHardwareName }],
            7500
        );
        const cLedgerSignedTx = await cHardwareWallet.createPaymentTransaction({
            inputs: arrInputs,
            associatedKeysets: arrAssociatedKeysets,
            outputScriptHex: strOutputScriptHex,
        });
        const nInputLen = cTx.inputs.length;

        // Put public key bytes instead of [3,195,174...]
        const arrSignedTxBytes = hexToBytes(cLedgerSignedTx);
        const arrPubkey = findCompressedPubKey(arrSignedTxBytes);
        const arrPubkeyWithScriptLen = addScriptLength(
            arrSignedTxBytes,
            arrPubkey,
            nInputLen
        );
        const arrPubkeyWithScript = addExtraBytes(
            arrPubkeyWithScriptLen,
            arrPubkey,
            nInputLen
        );

        const strSerialisedTx = bytesToHex(arrPubkeyWithScript);

        // Broadcast the Hardware (Ledger) TX
        const result = await sendTransaction(
            strSerialisedTx,
            '<b>Delegation successfully spent!</b>'
        );
        if (result) {
            for (const tx of cTx.inputs) {
                mempool.autoRemoveUTXO({
                    id: tx.outpoint.hash,
                    path: tx.path,
                    vout: tx.outpoint.index,
                });
            }
            // Add our undelegation + change re-delegation (if any) to the local mempool
            const futureTxid = bytesToHex(
                dSHA256(hexToBytes(strSerialisedTx)).reverse()
            );
            if (fReDelegateChange) {
                mempool.addUTXO({
                    id: futureTxid,
                    path: reDelegateAddressPath,
                    script: bytesToHex(cTx.outputs[0].script),
                    sats: nChange,
                    vout: 0,
                    status: Mempool.PENDING,
                    isDelegate: true,
                });
                mempool.addUTXO({
                    id: futureTxid,
                    path: outputKeyPath,
                    script: bytesToHex(cTx.outputs[1].script),
                    sats: nValue,
                    vout: 1,
                    status: Mempool.PENDING,
                });
            } else {
                mempool.addUTXO({
                    id: futureTxid,
                    path: outputKeyPath,
                    sats: nValue,
                    script: bytesToHex(cTx.outputs[0].script),
                    vout: 0,
                    status: Mempool.PENDING,
                });
            }
        }
    } else {
        let sign = await cTx.sign(masterKey, 1, 'coldstake');
        // Broadcast the software TX

        const result = await sendTransaction(
            sign,
            '<b>Delegation successfully spent!</b>'
        );
        if (result) {
            for (const tx of cTx.inputs) {
                mempool.autoRemoveUTXO({
                    id: tx.outpoint.hash,
                    path: tx.path,
                    vout: tx.outpoint.index,
                });
            }
            // Add our undelegation + change re-delegation (if any) to the local mempool
            const futureTxid = bytesToHex(dSHA256(hexToBytes(sign)).reverse());
            if (fReDelegateChange) {
                mempool.addUTXO({
                    id: futureTxid,
                    path: reDelegateAddressPath,
                    script: bytesToHex(cTx.outputs[0].script),
                    sats: nChange,
                    vout: 0,
                    status: Mempool.PENDING,
                    isDelegate: true,
                });
                mempool.addUTXO({
                    id: futureTxid,
                    path: outputKeyPath,
                    script: bytesToHex(cTx.outputs[1].script),
                    sats: nValue,
                    vout: 1,
                    status: Mempool.PENDING,
                });
            } else {
                mempool.addUTXO({
                    id: futureTxid,
                    path: outputKeyPath,
                    sats: nValue,
                    script: bytesToHex(cTx.outputs[0].script),
                    vout: 0,
                    status: Mempool.PENDING,
                });
            }
        }
    }

    doms.domGenIt.innerHTML = 'Continue';
}

export function delegateGUI() {
    if (masterKey.isViewOnly) {
        return createAlert(
            'warning',
            'Attempting to delegate in view only mode.',
            6000
        );
    }
    // Verify the amount; Delegations must be a minimum of 1 PIV, enforced by the network
    const nAmount = Number(doms.domGuiDelegateAmount.value.trim()) * COIN;
    if (!validateAmount(nAmount, COIN)) return;

    // Ensure the user has an address set - if not, request one!
    if (!askForCSAddr()) return;

    // Sanity
    if (
        cachedColdStakeAddr.length !== 34 ||
        !cachedColdStakeAddr.startsWith(cChainParams.current.STAKING_PREFIX)
    ) {
        askForCSAddr(true);
        return createAlert('success', ALERTS.SUCCESS_STAKING_ADDR_SET, []);
    }
    delegate(nAmount, cachedColdStakeAddr);
}

async function delegate(nValue, coldAddr) {
    if (!hasWalletUnlocked(true)) return;

    // Construct a TX and fetch Standard inputs
    const nBalance = getBalance();
    const cTx = new bitjs.transaction();
    const cCoinControl = chooseUTXOs(cTx, nValue, 0, false);
    if (!cCoinControl.success)
        return createAlert('warning', cCoinControl.msg, 5000);

    // Compute fee and change (or lack thereof)
    const nFee = getFee(cTx.serialize().length);
    const nChange = cCoinControl.nValue - (nFee + nValue);
    const [changeAddress, changeAddressPath] = await getNewAddress();
    if (nChange > 0) {
        // Change output
        cTx.addoutput(changeAddress, nChange / COIN);
    } else {
        // We're sending alot! So we deduct the fee from the send amount. There's not enough change to pay it with!
        nValue -= nFee;
    }

    // The primary Standard-to-Cold output
    const [primaryAddress, primaryAddressPath] = await getNewAddress();
    cTx.addcoldstakingoutput(primaryAddress, coldAddr, nValue / COIN);

    // Debug-only verbose response
    if (debug)
        doms.domHumanReadable.innerHTML =
            'Balance: ' +
            nBalance / COIN +
            '<br>Fee: ' +
            nFee / COIN +
            '<br>To: ' +
            coldAddr +
            '<br>Sent: ' +
            nValue / COIN +
            (nChange > 0
                ? '<br>Change Address: ' +
                  changeAddress +
                  '<br>Change: ' +
                  nChange / COIN
                : '');

    // Sign and broadcast!
    if (hasHardwareWallet()) {
        // Format the inputs how the Ledger SDK prefers
        const arrInputs = [];
        const arrAssociatedKeysets = [];
        for (const cInput of cTx.inputs) {
            const cInputFull = await getTxInfo(cInput.outpoint.hash);
            arrInputs.push([
                await cHardwareWallet.splitTransaction(cInputFull.hex),
                cInput.outpoint.index,
            ]);
            arrAssociatedKeysets.push(cInput.path);
        }

        // Construct the Ledger transaction
        const cLedgerTx = await cHardwareWallet.splitTransaction(
            cTx.serialize()
        );
        const strOutputScriptHex = await cHardwareWallet
            .serializeTransactionOutputs(cLedgerTx)
            .toString('hex');

        // Sign the transaction via Ledger
        createAlert(
            'info',
            ALERTS.CONFIRM_UNSTAKE_H_WALLET,
            [{ strHardwareName: strHardwareName }],
            7500
        );
        const strSerialisedTx = await cHardwareWallet.createPaymentTransaction({
            inputs: arrInputs,
            associatedKeysets: arrAssociatedKeysets,
            outputScriptHex: strOutputScriptHex,
        });

        // Broadcast the Hardware (Ledger) tx
        const result = await sendTransaction(
            strSerialisedTx,
            '<b>Delegation successful!</b>'
        );
        if (result) {
            for (const tx of cTx.inputs) {
                mempool.autoRemoveUTXO({
                    id: tx.outpoint.hash,
                    path: tx.path,
                    vout: tx.outpoint.index,
                });
            }
            const futureTxid = bytesToHex(
                dSHA256(hexToBytes(strSerialisedTx)).reverse()
            );

            if (nChange > 0) {
                mempool.addUTXO({
                    id: futureTxid,
                    path: changeAddressPath,
                    sats: nChange,
                    script: bytesToHex(cTx.outputs[0].script),
                    vout: 0,
                    status: Mempool.PENDING,
                });
                mempool.addUTXO({
                    id: futureTxid,
                    path: primaryAddressPath,
                    sats: nValue,
                    vout: 1,
                    script: bytesToHex(cTx.outputs[1].script),
                    status: Mempool.PENDING,
                    isDelegate: true,
                });
            } else {
                mempool.addUTXO({
                    id: futureTxid,
                    path: primaryAddressPath,
                    script: bytesToHex(cTx.outputs[0].script),
                    sats: nValue,
                    vout: 0,
                    status: Mempool.PENDING,
                    isDelegate: true,
                });
            }
        }
    } else {
        const sign = await cTx.sign(masterKey, 1);

        // Broadcast the software TX
        const result = await sendTransaction(
            sign,
            '<b>Delegation successful!</b>'
        );
        if (result) {
            for (const tx of cTx.inputs) {
                mempool.autoRemoveUTXO({
                    id: tx.outpoint.hash,
                    path: tx.path,
                    vout: tx.outpoint.index,
                });
            }
            // Add our delegation + change (if any) to the local mempool
            const futureTxid = bytesToHex(dSHA256(hexToBytes(sign)).reverse());
            if (nChange > 0) {
                mempool.addUTXO({
                    id: futureTxid,
                    path: changeAddressPath,
                    sats: nChange,
                    script: bytesToHex(cTx.outputs[0].script),
                    vout: 0,
                    status: Mempool.PENDING,
                });
                mempool.addUTXO({
                    id: futureTxid,
                    path: primaryAddressPath,
                    sats: nValue,
                    vout: 1,
                    script: bytesToHex(cTx.outputs[1].script),
                    status: Mempool.PENDING,
                    isDelegate: true,
                });
            } else {
                mempool.addUTXO({
                    id: futureTxid,
                    path: primaryAddressPath,
                    script: bytesToHex(cTx.outputs[0].script),
                    sats: nValue,
                    vout: 0,
                    status: Mempool.PENDING,
                    isDelegate: true,
                });
            }
        }
    }
    doms.domGenIt.innerHTML = 'Continue';
}

// Coin Control response formats
function ccError(msg = '') {
    return { success: false, msg };
}
function ccSuccess(data) {
    return { success: true, ...data };
}

function chooseUTXOs(
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

    for (let i = 0; i < arrUTXOs.length; i++) {
        const cUTXO = arrUTXOs[i];
        if (!Mempool.isValidUTXO(cUTXO)) {
            continue;
        }
        // Don't spend locked Masternode collaterals
        if (isMasternodeUTXO(cUTXO)) continue; //CHANGE THIS

        // Have we met the required sats threshold?
        if (
            cCoinControl.nValue >=
            nTotalSatsRequired + getFee(cTx.serialize().length)
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

export async function createTxGUI() {
    if (!hasWalletUnlocked(true)) return;

    if (masterKey.isViewOnly) {
        return createAlert(
            'warning',
            'Attempting to send funds in view only mode.',
            6000
        );
    }

    // Clear the inputs on 'Continue'
    if (doms.domGenIt.innerHTML === 'Continue') {
        doms.domGenIt.innerHTML = 'Send Transaction';
        doms.domTxOutput.innerHTML = '';
        doms.domHumanReadable.innerHTML = '';
        doms.domValue1s.value = '';
        doms.domAddress1s.value = '';
        doms.domReqDesc.value = '';
        doms.domReqDisplay.style.display = 'none';
        return;
    }
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
    if (!cChainParams.current.PUBKEY_PREFIX.includes(address[0]))
        return createAlert(
            'warning',
            ALERTS.BAD_ADDR_PREFIX,
            [
                { address: address[0] },
                {
                    addressPrefix:
                        cChainParams.current.PUBKEY_PREFIX.join(' or '),
                },
            ],
            3500
        );
    if (!bitjs.isValidDestination(address, cChainParams.current.PUBKEY_ADDRESS))
        return createAlert(
            'warning',
            ALERTS.INVALID_ADDRESS,
            [{ address: address }],
            3500
        );

    // Sanity check the amount
    let nValue = Math.round(Number(doms.domValue1s.value.trim()) * COIN);
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

    // Construct a TX and fetch Standard inputs
    const nBalance = getBalance();
    const cTx = new bitjs.transaction();
    const cCoinControl = chooseUTXOs(cTx, nValue, 0, false);
    if (!cCoinControl.success)
        return createAlert('warning', cCoinControl.msg, 5000);
    // Compute fee
    const nFee = getFee(cTx.serialize().length);

    // Compute change (or lack thereof)
    const nChange = cCoinControl.nValue - (nFee + nValue);
    const [changeAddress, changeAddressPath] = await getNewAddress({
        verify: masterKey.isHardwareWallet,
    });

    const outputs = [];
    if (nChange > 0) {
        // Change output
        outputs.push([changeAddress, nChange / COIN]);
    } else {
        // We're sending alot! So we deduct the fee from the send amount. There's not enough change to pay it with!
        nValue -= nFee;
    }

    // Primary output (receiver)
    outputs.push([address, nValue / COIN]);

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
            nValue / COIN +
            (nChange > 0
                ? '<br>Change Address: ' +
                  changeAddress +
                  '<br>Change: ' +
                  nChange / COIN
                : '');

    // Add outputs to the Tx
    for (const output of outputs) {
        cTx.addoutput(output[0], output[1]);
    }

    // Sign and broadcast!
    if (!masterKey.isHardwareWallet) {
        const sign = await cTx.sign(masterKey, 1);

        const result = await sendTransaction(sign);
        // Add our change (if any) to the local mempool
        if (result) {
            for (const tx of cTx.inputs) {
                mempool.autoRemoveUTXO({
                    id: tx.outpoint.hash,
                    path: tx.path,
                    vout: tx.outpoint.index,
                });
            }
            const futureTxid = bytesToHex(dSHA256(hexToBytes(sign)).reverse());

            const [isYours, yourPath] = await isYourAddress(address);
            if (nChange > 0) {
                mempool.addUTXO({
                    id: futureTxid,
                    path: changeAddressPath,
                    sats: nChange,
                    script: bytesToHex(cTx.outputs[0].script),
                    vout: 0,
                    status: Mempool.PENDING,
                });
                if (isYours) {
                    mempool.addUTXO({
                        id: futureTxid,
                        path: yourPath,
                        sats: nValue,
                        vout: 1,
                        script: bytesToHex(cTx.outputs[1].script),
                        status: Mempool.PENDING,
                    });
                }
            } else {
                if (isYours) {
                    mempool.addUTXO({
                        id: futureTxid,
                        path: yourPath,
                        sats: nValue,
                        vout: 0,
                        script: bytesToHex(cTx.outputs[0].script),
                        status: Mempool.PENDING,
                    });
                }
            }
        }
    } else {
        // Format the inputs how the Ledger SDK prefers
        const arrInputs = [];
        const arrAssociatedKeysets = [];
        for (const cInput of cTx.inputs) {
            const cInputFull = await getTxInfo(cInput.outpoint.hash);
            arrInputs.push([
                await cHardwareWallet.splitTransaction(cInputFull.hex),
                cInput.outpoint.index,
            ]);
            arrAssociatedKeysets.push(cInput.path);
        }
        const cLedgerTx = await cHardwareWallet.splitTransaction(
            cTx.serialize()
        );
        const strOutputScriptHex = await cHardwareWallet
            .serializeTransactionOutputs(cLedgerTx)
            .toString('hex');

        // Sign the transaction via Ledger
        const strSerialisedTx = await confirmPopup({
            title: ALERTS.CONFIRM_POPUP_TRANSACTION,
            html: createTxConfirmation(outputs),
            resolvePromise: cHardwareWallet.createPaymentTransaction({
                inputs: arrInputs,
                associatedKeysets: arrAssociatedKeysets,
                outputScriptHex: strOutputScriptHex,
            }),
        });

        // Broadcast the Hardware (Ledger) TX
        const result = await sendTransaction(strSerialisedTx);
        if (result) {
            for (const tx of cTx.inputs) {
                mempool.autoRemoveUTXO({
                    id: tx.outpoint.hash,
                    path: tx.path,
                    vout: tx.outpoint.index,
                });
            }
            // Add our change (if any) to the local mempool
            const [isYours, yourPath] = await isYourAddress(address);
            const futureTxid = bytesToHex(
                dSHA256(hexToBytes(strSerialisedTx)).reverse()
            );

            if (nChange > 0) {
                mempool.addUTXO({
                    id: futureTxid,
                    path: changeAddressPath,
                    sats: nChange,
                    script: bytesToHex(cTx.outputs[0].script),
                    vout: 0,
                    status: Mempool.PENDING,
                });
                if (isYours) {
                    mempool.addUTXO({
                        id: futureTxid,
                        path: yourPath,
                        sats: nValue,
                        vout: 1,
                        script: bytesToHex(cTx.outputs[1].script),
                        status: Mempool.PENDING,
                    });
                }
            } else {
                if (isYours) {
                    mempool.addUTXO({
                        id: futureTxid,
                        path: yourPath,
                        sats: nValue,
                        vout: 0,
                        script: bytesToHex(cTx.outputs[0].script),
                        status: Mempool.PENDING,
                    });
                }
            }
        }
    }
    doms.domGenIt.innerHTML = 'Continue';
}

export async function createRawTransaction() {
    // Prepare a TX
    const cTx = new bitjs.transaction();
    const txid = document.getElementById('prevTrxHash').value;
    const index = document.getElementById('index').value;
    const script = document.getElementById('script').value;

    // Primary input
    cTx.addinput({ txid, index, script });

    // Primary output
    const strAddress = document.getElementById('address1').value;
    const nValue = document.getElementById('value1').value;
    cTx.addoutput(strAddress, nValue);

    // Change output
    const strChange = document.getElementById('address2').value;
    const nChangeValue = document.getElementById('value2').value;
    cTx.addoutput(strChange, nChangeValue);

    // Sign via WIF key
    const wif = document.getElementById('wif').value;
    document.getElementById('rawTrx').value = await cTx.sign(wif, 1); //SIGHASH_ALL DEFAULT 1
}

export async function createMasternode() {
    if (masterKey.isViewOnly) {
        return createAlert(
            'warning',
            "Can't create a masternode in view only mode",
            6000
        );
    }
    const fGeneratePrivkey = doms.domMnCreateType.value === 'VPS';
    const [strAddress, strAddressPath] = await getNewAddress();
    const nValue = cChainParams.current.collateralInSats;

    const nBalance = getBalance();
    const cTx = new bitjs.transaction();
    const cCoinControl = chooseUTXOs(cTx, nValue, 0, false);

    if (!cCoinControl.success)
        return createAlert('warning', cCoinControl.msg, 5000);
    // Compute fee
    const nFee = getFee(cTx.serialize().length);

    // Compute change (or lack thereof)
    const nChange = cCoinControl.nValue - (nFee + nValue);
    const [changeAddress, changeAddressPath] = await getNewAddress({
        verify: masterKey.isHardwareWallet,
    });
    const outputs = [];
    if (nChange > 0) {
        // Change output
        outputs.push([changeAddress, nChange / COIN]);
    } else {
        return createAlert(
            'warning',
            "You don't have enough " +
                cChainParams.current.TICKER +
                ' to create a masternode',
            5000
        );
    }

    // Primary output (receiver)
    outputs.push([strAddress, nValue / COIN]);

    // Debug-only verbose response
    if (debug)
        doms.domHumanReadable.innerHTML =
            'Balance: ' +
            nBalance / COIN +
            '<br>Fee: ' +
            nFee / COIN +
            '<br>To: ' +
            strAddress +
            '<br>Sent: ' +
            nValue / COIN +
            (nChange > 0
                ? '<br>Change Address: ' +
                  changeAddress +
                  '<br>Change: ' +
                  nChange / COIN
                : '');

    // Add outputs to the Tx
    for (const output of outputs) {
        cTx.addoutput(output[0], output[1]);
    }

    // Sign and broadcast!
    if (!masterKey.isHardwareWallet) {
        const sign = await cTx.sign(masterKey, 1);
        const result = await sendTransaction(sign);
        if (result) {
            for (const tx of cTx.inputs) {
                mempool.autoRemoveUTXO({
                    id: tx.outpoint.hash,
                    path: tx.path,
                    vout: tx.outpoint.index,
                });
            }
            const futureTxid = bytesToHex(dSHA256(hexToBytes(sign)).reverse());
            mempool.addUTXO({
                id: futureTxid,
                path: changeAddressPath,
                sats: nChange,
                vout: 0,
                script: bytesToHex(cTx.outputs[0].script),
                status: Mempool.PENDING,
            });
            mempool.addUTXO({
                id: futureTxid,
                path: strAddressPath,
                script: bytesToHex(cTx.outputs[1].script),
                sats: nValue,
                vout: 1,
                status: Mempool.PENDING,
            });
        }
    } else {
        // Format the inputs how the Ledger SDK prefers
        const arrInputs = [];
        const arrAssociatedKeysets = [];
        for (const cInput of cTx.inputs) {
            const cInputFull = await getTxInfo(cInput.outpoint.hash);
            arrInputs.push([
                await cHardwareWallet.splitTransaction(cInputFull.hex),
                cInput.outpoint.index,
            ]);
            arrAssociatedKeysets.push(cInput.path);
        }
        const cLedgerTx = await cHardwareWallet.splitTransaction(
            cTx.serialize()
        );
        const strOutputScriptHex = await cHardwareWallet
            .serializeTransactionOutputs(cLedgerTx)
            .toString('hex');

        // Sign the transaction via Ledger
        const strSerialisedTx = await confirmPopup({
            title: ALERTS.CONFIRM_POPUP_TRANSACTION,
            html: createTxConfirmation(outputs),
            resolvePromise: cHardwareWallet.createPaymentTransaction({
                inputs: arrInputs,
                associatedKeysets: arrAssociatedKeysets,
                outputScriptHex: strOutputScriptHex,
            }),
        });

        // Broadcast the Hardware (Ledger) TX
        const result = await sendTransaction(strSerialisedTx);
        if (result) {
            for (const tx of cTx.inputs) {
                mempool.autoRemoveUTXO({
                    id: tx.outpoint.hash,
                    path: tx.path,
                    vout: tx.outpoint.index,
                });
            }
            const futureTxid = bytesToHex(
                dSHA256(hexToBytes(strSerialisedTx)).reverse()
            );

            mempool.addUTXO({
                id: futureTxid,
                path: changeAddressPath,
                sats: nChange,
                vout: 0,
                script: bytesToHex(cTx.outputs[0].script),
                status: Mempool.PENDING,
            });
            mempool.addUTXO({
                id: futureTxid,
                path: strAddressPath,
                script: bytesToHex(cTx.outputs[1].script),
                sats: nValue,
                vout: 1,
                status: Mempool.PENDING,
            });
        }
    }
    if (fGeneratePrivkey) {
        let masternodePrivateKey = await generateMnPrivkey();
        await confirmPopup({
            title: ALERTS.CONFIRM_POPUP_MN_P_KEY,
            html: masternodePrivateKey + ALERTS.CONFIRM_POPUP_MN_P_KEY_HTML,
        });
    }
    createAlert(
        'success',
        '<b>Masternode Created!<b><br>Wait 15 confirmations to proceed further'
    );
    // Remove any previous Masternode data, if there were any
    localStorage.removeItem('masternode');
}

function addScriptLength(arrTxBytes, arrPubKey, nInputLen) {
    // ???
    let n_found = 0;
    const new_transaction_bytes = arrTxBytes;
    for (let i = 0; i < arrTxBytes.length; i++) {
        if (
            arrTxBytes[i + 1] === 71 ||
            arrTxBytes[i + 1] === 72 ||
            arrTxBytes[i + 1] === 73
        ) {
            if (
                arrTxBytes[i + arrTxBytes[i]] ===
                arrTxBytes[arrTxBytes.length - 1]
            ) {
                new_transaction_bytes[i]++;
                n_found++;
                if (n_found === nInputLen) {
                    return new_transaction_bytes;
                }
            }
        }
    }
}

function findCompressedPubKey(arrTxBytes) {
    const arrToFind = [1, 33];
    for (let i = 0; i < arrTxBytes.length; i++) {
        if (arrTxBytes[i] === arrToFind[0]) {
            if (arrTxBytes[i + 1] === arrToFind[1]) {
                const compressedPubKey = [];
                for (let j = 0; j < 33; j++) {
                    compressedPubKey.push(arrTxBytes[i + 2 + j]);
                }
                return compressedPubKey;
            }
        }
    }
}

function addExtraBytes(arrTxBytes, arrPubkeyBytes, nLen) {
    let arrNewTxBytes = [];
    let nFound = 0;
    for (let i = 0; i < arrTxBytes.length; i++) {
        arrNewTxBytes.push(arrTxBytes[i]);
        let fFound = true;

        if (nFound !== nLen) {
            for (let j = 0; j < arrPubkeyBytes.length; j++) {
                if (arrTxBytes[i + j] !== arrPubkeyBytes[j]) {
                    fFound = false;
                    break;
                }
            }

            if (fFound) {
                arrNewTxBytes = insert(
                    arrNewTxBytes,
                    arrNewTxBytes.length - 2,
                    0
                );
                nFound++;
            }
        }
    }
    return arrNewTxBytes;
}

function insert(arr, index, newItem) {
    // part of the array before the specified index
    return [
        ...arr.slice(0, index),
        // inserted item
        newItem,
        // part of the array after the specified index
        ...arr.slice(index),
    ];
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
