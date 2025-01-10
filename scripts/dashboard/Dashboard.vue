<script setup>
import Login from './Login.vue';
import WalletBalance from './WalletBalance.vue';
import WalletButtons from './WalletButtons.vue';
import Activity from './Activity.vue';
import GenKeyWarning from './GenKeyWarning.vue';
import TransferMenu from './TransferMenu.vue';
import ExportPrivKey from './ExportPrivKey.vue';
import RestoreWallet from './RestoreWallet.vue';
import {
    isExchangeAddress,
    isShieldAddress,
    isValidPIVXAddress,
    parseBIP21Request,
    sanitizeHTML,
} from '../misc.js';
import { ALERTS, translation, tr } from '../i18n.js';
import { HardwareWalletMasterKey, HdMasterKey } from '../masterkey';
import { COIN, cChainParams } from '../chain_params';
import { onMounted, ref, watch, computed } from 'vue';
import { getEventEmitter } from '../event_bus';
import { Database } from '../database';
import { start, doms, updateLogOutButton } from '../global';
import { validateAmount } from '../legacy';
import { debugError, DebugTopics } from '../debug.js';
import {
    confirmPopup,
    isXPub,
    isColdAddress,
    isStandardAddress,
} from '../misc.js';
import { getNetwork } from '../network/network_manager.js';
import { strHardwareName } from '../ledger';
import { guiAddContactPrompt } from '../contacts-book';
import { scanQRCode } from '../scanner';
import { useWallet } from '../composables/use_wallet.js';
import { useSettings } from '../composables/use_settings.js';
import pLogo from '../../assets/p_logo.svg';
import pShieldLogo from '../../assets/icons/icon_shield_pivx.svg';
import pIconCamera from '../../assets/icons/icon-camera.svg';
import { ParsedSecret } from '../parsed_secret.js';
import { storeToRefs } from 'pinia';
import { Account } from '../accounts';
import { useAlerts } from '../composables/use_alerts.js';
const { createAlert } = useAlerts();
const wallet = useWallet();
const activity = ref(null);

const needsToEncrypt = computed(() => {
    if (wallet.isHardwareWallet) {
        return false;
    } else {
        return !wallet.isViewOnly && !wallet.isEncrypted;
    }
});
const showTransferMenu = ref(false);
const { advancedMode, displayDecimals, autoLockWallet } = storeToRefs(
    useSettings()
);
const showExportModal = ref(false);
const showEncryptModal = ref(false);
const keyToBackup = ref('');
const transferAddress = ref('');
const transferDescription = ref('');
const transferAmount = ref('');
const showRestoreWallet = ref(false);
const restoreWalletReason = ref('');
watch(showExportModal, async (showExportModal) => {
    if (showExportModal) {
        keyToBackup.value = await wallet.getKeyToBackup();
    } else {
        // Wipe key to backup, just in case
        keyToBackup.value = '';
    }
});

/**
 * Import a wallet, this function MUST be called only at start or when switching network
 * @param {Object} o - Options
 * @param {'legacy'|'hd'|'hardware'} o.type - type of import
 * @param {string} o.secret
 * @param {nubmer?} [o.blockCount] Creation block count. Defaults to 4_200_000
 * @param {string} [o.password]
 */
async function importWallet({
    type,
    secret,
    password = '',
    blockCount = 4_200_000,
}) {
    /**
     * @type{ParsedSecret?}
     */
    let parsedSecret;
    if (type === 'hardware') {
        if (!navigator.usb) {
            createAlert(
                'warning',
                ALERTS.WALLET_HARDWARE_USB_UNSUPPORTED,
                7500
            );
            return false;
        }
        try {
            parsedSecret = new ParsedSecret(
                secret
                    ? HardwareWalletMasterKey.fromXPub(secret)
                    : await HardwareWalletMasterKey.create()
            );
        } catch (e) {
            // The user has already been notified in `ledger.js`
            debugError(DebugTopics.LEDGER, e);
            return;
        }

        createAlert(
            'info',
            tr(ALERTS.WALLET_HARDWARE_WALLET, [
                { hardwareWallet: strHardwareName },
            ]),
            12500
        );
    } else {
        parsedSecret = await ParsedSecret.parse(
            secret,
            password,
            advancedMode.value
        );
    }
    if (parsedSecret) {
        await wallet.setMasterKey({ mk: parsedSecret.masterKey });
        if (parsedSecret.shield) {
            await parsedSecret.shield.reloadFromCheckpoint(blockCount);
        }
        wallet.setShield(parsedSecret.shield);

        if (needsToEncrypt.value) showEncryptModal.value = true;
        if (wallet.isHardwareWallet) {
            // Save the xpub without needing encryption if it's ledger
            const database = await Database.getInstance();
            const account = new Account({
                publicKey: wallet.getKeyToExport(),
                isHardware: true,
            });
            if (await database.getAccount()) {
                await database.updateAccount(account);
            } else {
                await database.addAccount(account);
            }
        }

        // Start syncing in the background
        wallet.sync().then(() => {
            createAlert('success', translation.syncStatusFinished, 12500);
        });
        getEventEmitter().emit('wallet-import');
        return true;
    }

    return false;
}

/**
 * Encrypt wallet
 * @param {string} password - Password to encrypt wallet with
 * @param {string} [currentPassword] - Current password with which the wallet is encrypted with, if any
 */
async function encryptWallet(password, currentPassword = '') {
    if (wallet.isEncrypted) {
        if (!(await wallet.checkDecryptPassword(currentPassword))) {
            createAlert('warning', ALERTS.INCORRECT_PASSWORD, 6000);
            return false;
        }
    }
    const res = await wallet.encrypt(password);
    if (res) {
        createAlert('success', ALERTS.NEW_PASSWORD_SUCCESS, 5500);
        doms.domChangePasswordContainer.classList.remove('d-none');
    }
}

async function restoreWallet(strReason) {
    if (!wallet.isEncrypted) return false;
    if (wallet.isHardwareWallet) return true;
    showRestoreWallet.value = true;
    return await new Promise((res) => {
        watch(
            [showRestoreWallet, isViewOnly],
            () => {
                showRestoreWallet.value = false;
                res(!isViewOnly.value);
            },
            { once: true }
        );
    });
}

/**
 * Lock the wallet by deleting masterkey private data, after user confirmation
 */
async function displayLockWalletModal() {
    const isEncrypted = wallet.isEncrypted;
    const title = isEncrypted
        ? translation.popupWalletLock
        : translation.popupWalletWipe;
    const html =
        '<div class="modalContents"><span class="topText">' +
        (isEncrypted
            ? translation.popupWalletLockNote
            : translation.popupWalletWipeNote) +
        '</span></div>';
    if (
        await confirmPopup({
            title,
            html,
        })
    ) {
        lockWallet();
    }
}

/**
 * Lock the wallet by deleting masterkey private data
 */
function lockWallet() {
    wallet.wipePrivateData();
    createAlert('success', ALERTS.WALLET_LOCKED, 1500);
}

/**
 * Sends a transaction
 * @param {string} address - Address or contact to send to
 * @param {number} amount - Amount of PIVs to send
 */
async function send(address, amount, useShieldInputs) {
    // Ensure a wallet is unlocked
    if (wallet.isViewOnly && !wallet.isHardwareWallet) {
        if (
            !(await restoreWallet(
                tr(ALERTS.WALLET_UNLOCK_IMPORT, [
                    {
                        unlock: wallet.isEncrypted
                            ? 'unlock '
                            : 'import/create',
                    },
                ])
            ))
        )
            return;
    }

    // Ensure wallet is synced
    if (!wallet.isSynced) {
        return createAlert('warning', `${ALERTS.WALLET_NOT_SYNCED}`, 3000);
    }

    // Make sure we are not already creating a (shield) tx
    if (wallet.isCreatingTransaction()) {
        return createAlert(
            'warning',
            'Already creating a transaction! please wait for it to finish'
        );
    }

    // Sanity check the receiver
    address = address.trim();

    // Check for any contacts that match the input
    const cDB = await Database.getInstance();
    const cAccount = await cDB.getAccount();

    // If we have an Account, then check our Contacts for anything matching too
    const cContact = cAccount?.getContactBy({
        name: address,
        pubkey: address,
    });
    // If a Contact were found, we use it's Pubkey
    if (cContact) address = cContact.pubkey;

    // Make sure wallet has shield enabled
    if (!wallet.hasShield) {
        if (useShieldInputs || isShieldAddress(address)) {
            return createAlert('warning', ALERTS.MISSING_SHIELD);
        }
    }

    // If this is an XPub, we'll fetch their last used 'index', and derive a new public key for enhanced privacy
    if (isXPub(address)) {
        const cNet = getNetwork();
        if (!cNet.enabled)
            return createAlert(
                'warning',
                ALERTS.WALLET_OFFLINE_AUTOMATIC,
                3500
            );

        // Fetch the XPub info
        const cXPub = await cNet.getXPubInfo(address);

        // Use the latest index plus one (or if the XPub is unused, then the second address)
        const nIndex = (cXPub.usedTokens || 0) + 1;

        // Create a receiver master-key
        const cReceiverWallet = new HdMasterKey({ xpub: address });
        const strPath = cReceiverWallet.getDerivationPath(0, 0, nIndex);

        // Set the 'receiver address' as the unused XPub-derived address
        address = cReceiverWallet.getAddress(strPath);
    }

    // If Staking address: redirect to staking page
    if (isColdAddress(address)) {
        createAlert('warning', ALERTS.STAKE_NOT_SEND, 7500);
        // Close the current Send Popup
        showTransferMenu.value = false;
        // Open the Staking Dashboard
        // TODO: when write stake page rewrite this as an event
        return doms.domStakeTab.click();
    }

    // Check if the Receiver Address is a valid P2PKH address
    // or shield address
    if (!isValidPIVXAddress(address))
        return createAlert(
            'warning',
            tr(ALERTS.INVALID_ADDRESS, [{ address }]),
            2500
        );
    if (isColdAddress(address)) {
        return createAlert(
            'warning',
            tr(ALERTS.INVALID_ADDRESS, [{ address }]),
            2500
        );
    }
    if (isExchangeAddress(address) && useShieldInputs) {
        return createAlert('warning', translation.cantShieldToExc, 2500);
    }

    // Sanity check the amount
    const nValue = Math.round(amount * COIN);
    if (!validateAmount(nValue)) return;
    const availableBalance = useShieldInputs
        ? wallet.shieldBalance
        : wallet.balance;
    if (nValue > availableBalance) {
        createAlert(
            'warning',
            tr(ALERTS.MISSING_FUNDS, [{ sats: nValue - availableBalance }])
        );
        return;
    }
    // Close the send screen and clear inputs
    showTransferMenu.value = false;
    transferAddress.value = '';
    transferDescription.value = '';
    transferAmount.value = '';

    // Create and send the TX
    try {
        await wallet.createAndSendTransaction(getNetwork(), address, nValue, {
            useShieldInputs,
        });
    } catch (e) {
        console.error(e);
        createAlert('warning', e);
    } finally {
        if (autoLockWallet.value) {
            if (wallet.isEncrypted) {
                lockWallet();
            } else {
                await displayLockWalletModal();
            }
        }
    }
}

/**
 * @param {boolean} useShieldInputs - whether max balance is from shield or transparent pivs
 */
function getMaxBalance(useShieldInputs) {
    const coinSatoshi = useShieldInputs ? wallet.shieldBalance : wallet.balance;
    transferAmount.value = coinSatoshi / COIN;
}

async function importFromDatabase() {
    const database = await Database.getInstance();
    const account = await database.getAccount();
    await wallet.setMasterKey({ mk: null });
    activity.value?.reset();
    getEventEmitter().emit('reset-activity');
    if (account?.isHardware) {
        await importWallet({ type: 'hardware', secret: account.publicKey });
    } else if (wallet.isEncrypted) {
        await importWallet({ type: 'hd', secret: account.publicKey });
    }

    updateLogOutButton();
}

getEventEmitter().on('toggle-network', async () => {
    importFromDatabase();
    // TODO: When tab component is written, simply emit an event
    doms.domDashboard.click();
});

onMounted(async () => {
    await start();
    await importFromDatabase();

    if (wallet.isEncrypted) {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('addcontact')) {
            await handleContactRequest(urlParams);
        } else if (urlParams.has('pay')) {
            transferAddress.value = urlParams.get('pay') ?? '';
            transferDescription.value = urlParams.get('desc') ?? '';
            transferAmount.value = parseFloat(urlParams.get('amount')) || '';
            showTransferMenu.value = true;
        }

        // Remove any URL 'commands' after running, so that they don't re-run if a user refreshes
        window.history.replaceState(
            {},
            document.title,
            window.location.pathname
        );
    }
    updateLogOutButton();
});

const {
    balance,
    shieldBalance,
    pendingShieldBalance,
    immatureBalance,
    currency,
    price,
    isViewOnly,
    hasShield,
} = storeToRefs(wallet);

getEventEmitter().on('sync-status', (status) => {
    if (status === 'stop') activity?.value?.update();
});

getEventEmitter().on('new-tx', () => {
    activity?.value?.update();
});

function changePassword() {
    showEncryptModal.value = true;
}

async function openSendQRScanner() {
    const cScan = await scanQRCode();
    if (cScan) {
        const { data } = cScan;
        if (!data) return;
        if (isStandardAddress(data) || isShieldAddress(data)) {
            transferAddress.value = data;
            showTransferMenu.value = true;
            return;
        }
        const cBIP32Req = parseBIP21Request(data);
        if (cBIP32Req) {
            transferAddress.value = cBIP32Req.address;
            transferAmount.value = cBIP32Req.amount ?? 0;
            showTransferMenu.value = true;
            return;
        }
        if (data.includes('addcontact=')) {
            const strParams = data.substring(data.indexOf('addcontact='));
            const urlParams = new URLSearchParams(strParams);
            await handleContactRequest(urlParams);
            return;
        }
        createAlert(
            'warning',
            `"${sanitizeHTML(
                cScan?.data?.substring(
                    0,
                    Math.min(cScan?.data?.length, 6) ?? ''
                )
            )}…" ${ALERTS.QR_SCANNER_BAD_RECEIVER}`,
            7500
        );
    }
}

async function handleContactRequest(urlParams) {
    const strURI = urlParams.get('addcontact');
    if (strURI.includes(':')) {
        // Split 'name' and 'pubkey'
        let [name, pubKey] = strURI.split(':');
        // Convert name from hex to utf-8
        name = Buffer.from(name, 'hex').toString('utf8');
        await guiAddContactPrompt(sanitizeHTML(name), sanitizeHTML(pubKey));
    }
}

defineExpose({
    restoreWallet,
    changePassword,
});
</script>

<template>
    <div id="keypair" class="tabcontent">
        <div class="row m-0">
            <Login
                v-show="!wallet.isImported"
                :advancedMode="advancedMode"
                @import-wallet="importWallet"
            />

            <br />

            <!-- Switch to Public/Private -->
            <div class="col-12 p-0" v-show="wallet.isImported && hasShield">
                <center>
                    <div
                        :class="{
                            'dcWallet-warningMessage-dark': wallet.publicMode,
                        }"
                        class="dcWallet-warningMessage"
                        id="warningMessage"
                        @click="wallet.publicMode = !wallet.publicMode"
                    >
                        <div class="messLogo">
                            <span
                                class="buttoni-icon publicSwitchIcon"
                                v-html="wallet.publicMode ? pLogo : pShieldLogo"
                            >
                            </span>
                        </div>
                        <div class="messMessage" id="publicPrivateText">
                            <span class="messTop"
                                >Now in
                                <span
                                    v-html="
                                        wallet.publicMode ? 'Public' : 'Private'
                                    "
                                ></span>
                                Mode</span
                            >
                            <span class="messBot"
                                >Switch to
                                <span
                                    v-html="
                                        wallet.publicMode ? 'Private' : 'Public'
                                    "
                                ></span
                            ></span>
                        </div>
                    </div>
                </center>
            </div>

            <!-- Redeem Code (PIVX Promos) -->
            <div
                class="modal"
                id="redeemCodeModal"
                tabindex="-1"
                role="dialog"
                aria-hidden="true"
                data-backdrop="static"
                data-keyboard="false"
            >
                <div
                    class="modal-dialog modal-dialog-centered max-w-600"
                    role="document"
                >
                    <div class="modal-content exportKeysModalColor">
                        <div style="position: relative; top: -54px; left: -1px">
                            <ul class="settingsMenu redeemMenu">
                                <li
                                    data-i18n="redeem"
                                    style="width: 50%; text-align: center"
                                    onclick="MPW.setPromoMode(true)"
                                    id="redeemCodeModeRedeem"
                                    class="active"
                                >
                                    Redeem
                                </li>
                                <li
                                    data-i18n="create"
                                    style="width: 50%; text-align: center"
                                    onclick="MPW.setPromoMode(false)"
                                    id="redeemCodeModeCreate"
                                >
                                    Create
                                </li>
                            </ul>
                        </div>
                        <div
                            class="modal-header"
                            id="redeemCodeModalHeader"
                            style="margin-top: -40px"
                        >
                            <h3
                                class="modal-title"
                                id="redeemCodeModalTitle"
                                style="
                                    text-align: center;
                                    width: 100%;
                                    color: #8e21ff;
                                    margin-top: 0px;
                                "
                            >
                                Redeem Code
                            </h3>
                        </div>
                        <div
                            class="modal-body center-text"
                            style="padding-top: 0px; padding-bottom: 0px"
                        >
                            <center>
                                <p
                                    style="
                                        color: #af9cc6;
                                        font-size: 15px;
                                        width: 250px;
                                        font-family: Montserrat !important;
                                    "
                                >
                                    PIVX Promos
                                    {{ translation.pivxPromos }}
                                </p>
                                <div id="redeemCodeUse">
                                    <div id="redeemCodeInputBox">
                                        <input
                                            class="btn-input mono center-text"
                                            type="text"
                                            id="redeemCodeInput"
                                            :placeholder="
                                                translation.redeemInput
                                            "
                                            style="text-align: left"
                                            autocomplete="nope"
                                        />
                                    </div>
                                    <center>
                                        <div
                                            id="redeemCodeGiftIconBox"
                                            style="display: none"
                                        >
                                            <br />
                                            <br />
                                            <i
                                                id="redeemCodeGiftIcon"
                                                onclick="MPW.sweepPromoCode();"
                                                class="fa-solid fa-gift fa-2xl"
                                                style="
                                                    color: #813d9c;
                                                    font-size: 4em;
                                                "
                                            ></i>
                                        </div>

                                        <div
                                            id="redeemCodeDiv"
                                            style="
                                                margin-top: 50px;
                                                display: none;
                                                font-size: 15px;
                                                background-color: rgb(
                                                    58,
                                                    12,
                                                    96
                                                );
                                                border: 1px solid
                                                    rgb(159, 0, 249);
                                                padding: 8px 15px 10px;
                                                border-radius: 10px;
                                                color: rgb(211, 190, 229);
                                                width: 310px;
                                                text-align: left;
                                                margin-bottom: 20px;
                                            "
                                        >
                                            <div
                                                style="
                                                    width: 48px;
                                                    height: 38px;
                                                    background-color: rgb(
                                                        49,
                                                        11,
                                                        81
                                                    );
                                                    margin-right: 9px;
                                                    border-radius: 9px;
                                                    display: flex;
                                                    justify-content: center;
                                                    align-items: center;
                                                    font-size: 20px;
                                                "
                                            >
                                                <i
                                                    class="fas fa-spinner spinningLoading"
                                                ></i>
                                            </div>
                                            <div style="width: 100%">
                                                <div id="redeemCodeETA">
                                                    Calculating...
                                                </div>
                                                <div
                                                    div=""
                                                    class="progress"
                                                    style="
                                                        max-width: 310px;
                                                        border: 1px solid
                                                            rgb(147, 46, 205);
                                                        border-radius: 4px;
                                                        background-color: rgb(
                                                            43,
                                                            0,
                                                            58
                                                        );
                                                    "
                                                >
                                                    <div
                                                        class="progress-bar progress-bar-striped progress-bar-animated"
                                                        role="progressbar"
                                                        id="redeemCodeProgress"
                                                        aria-valuenow="42"
                                                        aria-valuemin="0"
                                                        aria-valuemax="100"
                                                        style="
                                                            width: 42% !important;
                                                        "
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>

                                        <progress
                                            min="0"
                                            max="100"
                                            value="50"
                                            style="display: none"
                                        ></progress>
                                    </center>
                                </div>
                                <div
                                    id="redeemCodeCreate"
                                    style="display: none"
                                >
                                    <input
                                        class="btn-input mono center-text"
                                        style="
                                            border-top-right-radius: 9px;
                                            border-bottom-right-radius: 9px;
                                        "
                                        type="text"
                                        id="redeemCodeCreateInput"
                                        :placeholder="translation.createName"
                                        autocomplete="nope"
                                    />
                                    <input
                                        class="btn-input mono center-text"
                                        id="redeemCodeCreateAmountInput"
                                        style="
                                            border-top-right-radius: 9px;
                                            border-bottom-right-radius: 9px;
                                        "
                                        type="text"
                                        :placeholder="translation.createAmount"
                                        autocomplete="nope"
                                    />
                                    <div
                                        class="table-promo d-none"
                                        id="promo-table"
                                    >
                                        <br />
                                        <table
                                            class="table table-responsive table-sm stakingTx table-mobile-scroll"
                                        >
                                            <thead style="border: 0px">
                                                <tr>
                                                    <td
                                                        style="
                                                            width: 100px;
                                                            border-top: 0px;
                                                            border-bottom: 1px
                                                                solid #534270;
                                                        "
                                                        class="text-center"
                                                    >
                                                        <b> Promo Code </b>
                                                    </td>
                                                    <td
                                                        style="
                                                            width: 100px;
                                                            border-top: 0px;
                                                            border-bottom: 1px
                                                                solid #534270;
                                                        "
                                                        class="text-center"
                                                    >
                                                        <b>
                                                            {{
                                                                cChainParams
                                                                    .current
                                                                    .TICKER
                                                            }}
                                                        </b>
                                                    </td>
                                                    <td
                                                        style="
                                                            border-top: 0px;
                                                            border-bottom: 1px
                                                                solid #534270;
                                                        "
                                                        class="text-center"
                                                    >
                                                        <i
                                                            onclick="MPW.promosToCSV()"
                                                            class="fa-solid fa-lg fa-file-csv ptr"
                                                        ></i>
                                                    </td>
                                                </tr>
                                            </thead>
                                            <tbody
                                                id="redeemCodeCreatePendingList"
                                                style="
                                                    text-align: center;
                                                    vertical-align: middle;
                                                "
                                            ></tbody>
                                        </table>
                                    </div>
                                </div>
                            </center>
                        </div>
                        <div class="modal-footer" id="redeemCodeModalButtons">
                            <div id="redeemCameraBtn">
                                <button
                                    class="pivx-button-small-cancel"
                                    style="
                                        float: left;
                                        height: 49px;
                                        width: 49px;
                                        padding-left: 12px;
                                    "
                                    onclick="MPW.openPromoQRScanner()"
                                >
                                    <span
                                        class="buttoni-text cameraIcon"
                                        v-html="pIconCamera"
                                    >
                                    </span>
                                </button>
                            </div>

                            <button
                                type="button"
                                onclick="MPW.promoConfirm()"
                                id="redeemCodeModalConfirmButton"
                                class="pivx-button-big"
                                style="float: right"
                            >
                                Redeem
                            </button>

                            <button
                                type="button"
                                class="pivx-button-big-cancel"
                                id="redeemCodeModalConfirmButton"
                                style="float: right"
                                data-dismiss="modal"
                                aria-label="Close"
                            >
                                {{ translation.popupClose }}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <!-- // Redeem Code (PIVX Promos) -->

            <!-- Contacts Modal -->
            <div
                class="modal"
                id="contactsModal"
                tabindex="-1"
                role="dialog"
                aria-hidden="true"
                data-backdrop="static"
                data-keyboard="false"
            >
                <div
                    class="modal-dialog modal-dialog-centered max-w-450"
                    role="document"
                >
                    <div class="modal-content exportKeysModalColor">
                        <div class="modal-header" id="contactsModalHeader">
                            <h3
                                class="modal-title"
                                id="contactsModalTitle"
                                style="
                                    text-align: center;
                                    width: 100%;
                                    color: #d5adff;
                                "
                            >
                                {{ translation.contacts }}
                            </h3>
                        </div>
                        <div class="modal-body px-0">
                            <div id="contactsList" class="contactsList"></div>
                        </div>
                        <div
                            class="modal-footer"
                            style="
                                display: flex;
                                justify-content: center;
                                padding-top: 0px;
                            "
                        >
                            <button
                                type="button"
                                class="pivx-button-big-cancel"
                                aria-label="Close"
                                data-dismiss="modal"
                                data-i18n="popupClose"
                            >
                                {{ translation.popupClose }}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <!-- // Contacts Modal -->
            <ExportPrivKey
                :show="showExportModal"
                :privateKey="keyToBackup"
                :isJSON="hasShield && !wallet.isEncrypted"
                @close="showExportModal = false"
            />
            <!-- WALLET FEATURES -->
            <div v-if="wallet.isImported">
                <GenKeyWarning
                    @onEncrypt="encryptWallet"
                    @close="showEncryptModal = false"
                    @open="showEncryptModal = true"
                    :showModal="showEncryptModal"
                    :showBox="needsToEncrypt"
                    :isEncrypt="wallet.isEncrypted"
                />
                <div class="row p-0">
                    <!-- Balance in PIVX & USD-->
                    <WalletBalance
                        :balance="balance"
                        :shieldBalance="shieldBalance"
                        :pendingShieldBalance="pendingShieldBalance"
                        :immatureBalance="immatureBalance"
                        :isHdWallet="wallet.isHD"
                        :isViewOnly="wallet.isViewOnly"
                        :isEncrypted="wallet.isEncrypted"
                        :isImported="wallet.isImported"
                        :needsToEncrypt="needsToEncrypt"
                        @displayLockWalletModal="displayLockWalletModal()"
                        @restoreWallet="restoreWallet()"
                        :isHardwareWallet="wallet.isHardwareWallet"
                        :currency="currency"
                        :price="price"
                        :displayDecimals="displayDecimals"
                        :shieldEnabled="hasShield"
                        @send="showTransferMenu = true"
                        @exportPrivKeyOpen="showExportModal = true"
                        :publicMode="wallet.publicMode"
                        class="col-12 p-0 mb-2"
                    />
                    <WalletButtons class="col-12 p-0 md-5" />
                    <Activity
                        ref="activity"
                        class="col-12 p-0 mb-5"
                        title="Activity"
                        :rewards="false"
                    />
                </div>
            </div>
        </div>
        <TransferMenu
            :show="showTransferMenu"
            :publicMode="wallet.publicMode"
            :price="price"
            :currency="currency"
            v-model:amount="transferAmount"
            :desc="transferDescription"
            v-model:address="transferAddress"
            @openQrScan="openSendQRScanner()"
            @close="showTransferMenu = false"
            @send="send"
            @max-balance="getMaxBalance"
        />
    </div>
    <RestoreWallet
        :show="showRestoreWallet"
        :reason="restoreWalletReason"
        :wallet="wallet"
        @close="showRestoreWallet = false"
    />
</template>
