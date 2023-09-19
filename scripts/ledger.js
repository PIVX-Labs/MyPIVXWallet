import createXpub from 'create-xpub';
import { ALERTS, tr } from './i18n.js';
import AppBtc from '@ledgerhq/hw-app-btc';
import TransportWebUSB from '@ledgerhq/hw-transport-webusb';
import { createAlert, sleep } from './misc.js';

let transport;
export let cHardwareWallet = null;
export let strHardwareName = '';
export async function getHardwareWalletKeys(
    path,
    xpub = false,
    verify = false,
    _attempts = 0
) {
    try {
        // Check if we haven't setup a connection yet OR the previous connection disconnected
        if (!cHardwareWallet || transport._disconnectEmitted) {
            transport = await TransportWebUSB.create();
            cHardwareWallet = new AppBtc({ transport, currency: 'PIVX' });
        }

        // Update device info and fetch the pubkey
        strHardwareName =
            transport.device.manufacturerName +
            ' ' +
            transport.device.productName;

        // Prompt the user in both UIs
        if (verify) createAlert('info', ALERTS.WALLET_CONFIRM_L, 3500);
        const cPubKey = await cHardwareWallet.getWalletPublicKey(path, {
            verify,
            format: 'legacy',
        });

        if (xpub) {
            return createXpub({
                depth: 3,
                childNumber: 2147483648,
                chainCode: cPubKey.chainCode,
                publicKey: cPubKey.publicKey,
            });
        } else {
            return cPubKey.publicKey;
        }
    } catch (e) {
        if (e.message.includes('denied by the user')) {
            // User denied an operation
            return false;
        }

        // If there's no device, nudge the user to plug it in.
        if (e.message.toLowerCase().includes('no device selected')) {
            createAlert('info', ALERTS.WALLET_NO_HARDWARE, 10000);
            return false;
        }

        // If the device is unplugged, or connection lost through other means (such as spontanious device explosion)
        if (e.message.includes("Failed to execute 'transferIn'")) {
            createAlert(
                'info',
                tr(ALERTS.WALLET_HARDWARE_CONNECTION_LOST, [
                    {
                        hardwareWallet: strHardwareName,
                    },
                ]),
                10000
            );
            return false;
        }
        if (_attempts < 10) {
            // This is an ugly hack :(
            // in the event where multiple parts of the code decide to ask for an address, just
            // Retry at most 10 times waiting 200ms each time
            await sleep(200);
            return await getHardwareWalletKeys(
                path,
                xpub,
                verify,
                _attempts + 1
            );
        }

        // If the ledger is busy, just nudge the user.
        if (e.message.includes('is busy')) {
            createAlert(
                'info',
                tr(ALERTS.WALLET_HARDWARE_BUSY, [
                    {
                        hardwareWallet: strHardwareName,
                    },
                ]),
                7500
            );
            return false;
        }

        // Check if this is an expected error
        if (!e.statusCode || !LEDGER_ERRS.has(e.statusCode)) {
            console.error(
                'MISSING LEDGER ERROR-CODE TRANSLATION! - Please report this below error on our GitHub so we can handle it more nicely!'
            );
            console.error(e);
        }

        // Translate the error to a user-friendly string (if possible)
        createAlert(
            'warning',
            tr(ALERTS.WALLET_HARDWARE_ERROR, [
                {
                    hardwareWallet: strHardwareName,
                },
                {
                    error: LEDGER_ERRS.get(e.statusCode),
                },
            ]),
            5500
        );

        return false;
    }
}

// Ledger Hardware wallet constants
export const LEDGER_ERRS = new Map([
    // Ledger error code <--> User-friendly string
    [25870, 'Open the PIVX app on your device'],
    [25873, 'Open the PIVX app on your device'],
    [57408, 'Navigate to the PIVX app on your device'],
    [27157, 'Wrong app! Open the PIVX app on your device'],
    [27266, 'Wrong app! Open the PIVX app on your device'],
    [27904, 'Wrong app! Open the PIVX app on your device'],
    [27010, 'Unlock your Ledger, then try again!'],
    [27404, 'Unlock your Ledger, then try again!'],
]);
