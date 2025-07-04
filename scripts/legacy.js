// Legacy functions
// To be removed when vue port is done

import { ALERTS, translation, tr } from './i18n.js';
import { doms, restoreWallet } from './global.js';
import { activeWallet, getNewAddress } from './wallet.js';
import { cChainParams, COIN, COIN_DECIMALS } from './chain_params.js';
import { generateMasternodePrivkey, confirmPopup } from './misc.js';
import { Database } from './database.js';
import { getNetwork } from './network/network_manager.js';
import { LedgerController } from './ledger.js';
import { createAlert } from './alerts/alert.js';

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
    changeAddress = '',
    delegationOwnerAddress,
}) {
    const tx = activeWallet.createTransaction(address, amount, {
        isDelegation,
        useDelegatedInputs,
        delegateChange,
        changeDelegationAddress,
        isProposal,
        changeAddress,
        returnAddress: delegationOwnerAddress,
    });
    if (!activeWallet.isHardwareWallet()) await activeWallet.sign(tx);
    else {
        const res = await LedgerController.getInstance().signTransaction(
            activeWallet,
            tx
        );
        if (!res) return;
    }
    const res = await getNetwork().sendTransaction(tx.serialize());
    if (res) {
        await activeWallet.addTransaction(tx);
        return { ok: true, txid: tx.txid };
    }
    activeWallet.discardTransaction(tx);
    return { ok: false };
}

/**
 * @deprecated use the new wallet method instead
 */
export async function createMasternode() {
    // Ensure the wallet is unlocked
    if (
        activeWallet.isViewOnly() &&
        !(await restoreWallet(translation.walletUnlockCreateMN))
    )
        return;

    // Generate the Masternode collateral
    const [address] = await getNewAddress({
        verify: activeWallet.isHardwareWallet(),
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
