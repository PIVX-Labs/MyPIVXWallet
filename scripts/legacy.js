// Legacy functions
// To be removed when vue port is done

import { ALERTS, translation, tr } from './i18n.js';
import {
    doms,
    restoreWallet,
    toggleBottomMenu,
    guiSetColdStakingAddress,
} from './global.js';
import { wallet, getNewAddress } from './wallet.js';
import { cChainParams, COIN, COIN_DECIMALS } from './chain_params.js';
import {
    createAlert,
    generateMasternodePrivkey,
    confirmPopup,
} from './misc.js';
import { Database } from './database.js';
import { getNetwork } from './network.js';
import { ledgerSignTransaction } from './ledger.js';

/**
 * @deprecated use the new wallet method instead
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
    const tx = wallet.createTransaction(address, amount, {
        isDelegation,
        useDelegatedInputs,
        delegateChange,
        changeDelegationAddress,
        isProposal,
    });
    if (!wallet.isHardwareWallet()) await wallet.sign(tx);
    else {
        await ledgerSignTransaction(wallet, tx);
    }
    const res = await getNetwork().sendTransaction(tx.serialize());
    if (res) {
        wallet.addTransaction(tx);
        return { ok: true, txid: tx.txid };
    }
    return { ok: false };
}

/**
 * @deprecated use the new wallet method instead
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
    const [address] = wallet.getNewAddress(1);

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
 * @deprecated use the new wallet method instead
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
 * @deprecated use the new wallet method instead
 */
export async function createMasternode() {
    // Ensure the wallet is unlocked
    if (
        wallet.isViewOnly() &&
        !(await restoreWallet(translation.walletUnlockCreateMN))
    )
        return;

    // Generate the Masternode collateral
    const [address] = await getNewAddress({
        verify: wallet.isHardwareWallet(),
        nReceiving: 1,
    });
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

/**
 * @deprecated reimplement when the vue port is done
 */
export function validateAmount(nAmountSats, nMinSats = 10000) {
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
