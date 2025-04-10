import createXpub from 'create-xpub';
import { ALERTS, tr } from './i18n.js';
import { confirmPopup } from './misc.js';
import { getNetwork } from './network/network_manager.js';
import { Transaction } from './transaction.js';
import { COIN, cChainParams } from './chain_params.js';
import { hexToBytes, bytesToHex } from './utils.js';
import { OP } from './script.js';
import { createAlert } from './alerts/alert.js';
import { debugError, DebugTopics } from './debug.js';

/**
 * Controls ledger
 */
export class LedgerController {
    // Ledger Hardware wallet constants
    static LEDGER_ERRS = new Map([
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
    static #instance = new LedgerController();

    /**
     * @type{import('@ledgerhq/hw-transport-webusb').default?}
     */
    #transport;
    /**
     * @type {import('@ledgerhq/hw-app-btc').default?}
     */
    #hardwareWallet;
    #hardwareName = '';

    static getInstance() {
        return LedgerController.#instance;
    }

    #queue = [];

    /**
     * Add a command to the queue
     * @param {()=>Promise<void>} fn
     */
    async #sendCommand(fn) {
        const command = async () => {
            await this.#setupConnection();
            try {
                return await fn();
            } catch (e) {
                if (e.message.includes('denied by the user')) {
                    // User denied an operation
                    return null;
                }

                // If there's no device, nudge the user to plug it in.
                if (e.message.toLowerCase().includes('no device selected')) {
                    createAlert('info', ALERTS.WALLET_NO_HARDWARE, 10000);
                    return null;
                }

                // If the device is unplugged, or connection lost through other means (such as spontanious device explosion)
                if (e.message.includes("Failed to execute 'transferIn'")) {
                    createAlert(
                        'info',
                        tr(ALERTS.WALLET_HARDWARE_CONNECTION_LOST, [
                            {
                                hardwareWallet: this.#hardwareName,
                            },
                        ]),
                        10000
                    );
                    return null;
                }

                // If the ledger is busy, just nudge the user.
                if (e.message.includes('is busy')) {
                    createAlert(
                        'info',
                        tr(ALERTS.WALLET_HARDWARE_BUSY, [
                            {
                                hardwareWallet: this.#hardwareName,
                            },
                        ]),
                        7500
                    );
                    return null;
                }

                // This is when the OS denies access to the WebUSB
                // It's likely caused by faulty udev rules on linux
                if (
                    e instanceof DOMException &&
                    e.message.match(/access denied/i)
                ) {
                    if (navigator.userAgent.toLowerCase().includes('linux')) {
                        createAlert(
                            'warning',
                            ALERTS.WALLET_HARDWARE_UDEV,
                            5500
                        );
                    } else {
                        createAlert(
                            'warning',
                            ALERTS.WALLET_HARDWARE_NO_ACCESS,
                            5500
                        );
                    }

                    debugError(DebugTopics.LEDGER, e);
                    return;
                }

                // Check if this is an expected error
                if (
                    !e.statusCode ||
                    !LedgerController.LEDGER_ERRS.has(e.statusCode)
                ) {
                    debugError(DebugTopics.LEDGER, e);
                    debugError(
                        DebugTopics.LEDGER,
                        'MISSING LEDGER ERROR-CODE TRANSLATION! - Please report this below error on our GitHub so we can handle it more nicely!'
                    );
                    throw e;
                }

                // Translate the error to a user-friendly string (if possible)
                createAlert(
                    'warning',
                    tr(ALERTS.WALLET_HARDWARE_ERROR, [
                        {
                            hardwareWallet: this.#hardwareName,
                        },
                        {
                            error: LedgerController.LEDGER_ERRS.get(
                                e.statusCode
                            ),
                        },
                    ]),
                    5500
                );

                throw e;
            }
        };

        // Wait for our turn in the queue
        await new Promise((res, _) => {
            this.#queue.push(res);
            if (this.#queue.length === 1) {
                // if no one is waiting on the queue
                // we can proceed
                // We need to push ourselves, even if no one is in line
                // to make it work a bit like a lock
                res();
            }
        });

        // If the promise got resolved, we're at the top of the queue
        let res;
        try {
            res = await command();
        } finally {
            // Remove ourselves from the queue
            this.#queue.shift();
            // Resolve the next in line
            if (this.#queue[0]) this.#queue[0]();
        }
        return res;
    }

    /**
     * Setup ledger connection.
     */
    async #setupConnection() {
        // Check if we haven't setup a connection yet OR the previous connection disconnected
        if (!this.#hardwareWallet || this.#transport._disconnectEmitted) {
            const AppBtc = (await import('@ledgerhq/hw-app-btc')).default;
            const TransportWebUSB = (
                await import('@ledgerhq/hw-transport-webusb')
            ).default;
            this.#transport = await TransportWebUSB.create();
            this.#hardwareWallet = new AppBtc({
                transport: this.#transport,
                currency: 'PIVX',
            });
        }
    }

    /**
     * Get hardware wallet keys.
     * @param {string} path - bip32 path to the key
     * @param {boolean} xpub - If true, it returns an xpub instead of an address
     * @parm {boolean} verify - If true, it asks the user for confirmation
     * @returns {Promise<string?>}
     */

    getHardwareWalletKeys(path, xpub = false, verify = true) {
        try {
            return this.#sendCommand(async () => {
                // Update device info and fetch the pubkey
                this.#hardwareName =
                    this.#transport.device.manufacturerName +
                    ' ' +
                    this.#transport.device.productName;

                // Prompt the user in both UIs
                if (verify) createAlert('info', ALERTS.WALLET_CONFIRM_L, 3500);
                const cPubKey = await this.#hardwareWallet.getWalletPublicKey(
                    path,
                    {
                        verify,
                        format: 'legacy',
                    }
                );

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
            });
        } catch (e) {
            return null;
        }
    }

    getHardwareName() {
        return this.#hardwareName;
    }

    async signMessage(privateKeyPath, toSign) {
        return this.#sendCommand(async () => {
            return this.#hardwareWallet.signMessage(privateKeyPath, toSign);
        });
    }

    /**
     * @param {import('./wallet.js').Wallet} wallet
     * @param {import('./transaction.js').Transaction} transaction - tx to sign
     */
    async signTransaction(wallet, transaction) {
        return await this.#sendCommand(async () => {
            const txHex = transaction.serialize();
            if (txHex.length / 2 > 9000) {
                createAlert('warning', ALERTS.LEDGER_TX_TOO_BIG, 10_000);
                return false;
            }
            const ledgerTx = this.#hardwareWallet.splitTransaction(txHex);
            const outputs = transaction.vout.map((o) => {
                const { addresses, type } = wallet.getAddressesFromScript(
                    o.script
                );
                if (type !== 'p2pkh') {
                    /*throw new Error(
                        'Invalid script. Ledger supports p2pkh scripts only'
                    );*/
                }
                return {
                    value: o.value,
                    address: addresses[0],
                };
            });

            const associatedKeysets = [];
            const inputs = [];
            const isColdStake = [];
            for (const input of transaction.vin) {
                const { hex } = await getNetwork().getTxInfo(
                    input.outpoint.txid
                );
                const { type } = wallet.getAddressesFromScript(input.scriptSig);
                inputs.push([
                    this.#hardwareWallet.splitTransaction(
                        hex,
                        false,
                        false,
                        true
                    ),
                    input.outpoint.n,
                ]);
                // ScriptSig is the script at this point, since it's not signed
                associatedKeysets.push(wallet.getPath(input.scriptSig));
                isColdStake.push(type === 'p2cs');
            }
            const outputScriptHex = this.#hardwareWallet
                .serializeTransactionOutputs(ledgerTx)
                .toString('hex');
            const hex = await confirmPopup({
                title: ALERTS.CONFIRM_POPUP_TRANSACTION,
                html: this.#createTxConfirmation(outputs),
                resolvePromise: this.#hardwareWallet.createPaymentTransaction({
                    inputs,
                    associatedKeysets,
                    outputScriptHex,
                }),
            });

            const signedTx = Transaction.fromHex(hex);
            // Update vin with signatures
            transaction.vin = signedTx.vin;
            for (let i = 0; i < transaction.vin.length; i++) {
                const input = transaction.vin[i];
                // if it's a cold stake tx we need to add OP_FALSE
                if (isColdStake[i]) {
                    const bytes = hexToBytes(input.scriptSig);
                    const sigLength = bytes[0];
                    input.scriptSig = bytesToHex([
                        bytes[0],
                        ...bytes.slice(1, sigLength + 1),
                        OP['FALSE'],
                        ...bytes.slice(sigLength + 1),
                    ]);
                }
            }
            return transaction;
        });
    }

    #createTxConfirmation(outputs) {
        let strHtml = tr(ALERTS.CONFIRM_LEDGER_TX, [
            { hardwareWallet: this.#hardwareName },
        ]);
        for (const { value, address } of outputs) {
            const translated = tr(ALERTS.CONFIRM_LEDGER_TX_OUT, [
                { value: value / COIN },
                { ticker: cChainParams.current.TICKER },
                { address },
            ]);
            strHtml += `<br> <br> ${translated}`;
        }
        return strHtml;
    }
}
