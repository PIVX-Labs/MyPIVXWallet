<script setup>
import Login from './Login.vue';
import WalletBalance from './WalletBalance.vue';
import Activity from './Activity.vue';
import GenKeyWarning from './GenKeyWarning.vue';
import TransferMenu from './TransferMenu.vue';
import ExportPrivKey from './ExportPrivKey.vue';
import {
    cleanAndVerifySeedPhrase,
    hasEncryptedWallet,
    wallet,
} from '../wallet.js';
import { parseWIF, verifyWIF } from '../encoding.js';
import {
    createAlert,
    isBase64,
    isValidBech32,
    parseBIP21Request,
    sanitizeHTML,
} from '../misc.js';
import { ALERTS, translation, tr } from '../i18n.js';
import {
    LegacyMasterKey,
    HardwareWalletMasterKey,
    HdMasterKey,
} from '../masterkey';
import { decrypt } from '../aes-gcm.js';
import { cChainParams, COIN } from '../chain_params';
import { onMounted, ref, watch } from 'vue';
import { mnemonicToSeed } from 'bip39';
import { getEventEmitter } from '../event_bus';
import { Database } from '../database';
import {
    start,
    doms,
    updateEncryptionGUI,
    updateLogOutButton,
} from '../global';
import { cMarket, nDisplayDecimals, strCurrency } from '../settings.js';
import { mempool, refreshChainData } from '../global.js';
import {
    confirmPopup,
    isXPub,
    isColdAddress,
    isStandardAddress,
} from '../misc.js';
import { getNetwork } from '../network.js';
import { validateAmount, createAndSendTransaction } from '../transactions.js';
import { strHardwareName } from '../ledger';
import { guiAddContactPrompt } from '../contacts-book';
import { scanQRCode } from '../scanner';

const isImported = ref(wallet.isLoaded());
const activity = ref(null);
const needsToEncrypt = ref(true);
const showTransferMenu = ref(false);
const advancedMode = ref(false);
const showExportModal = ref(false);
const showEncryptModal = ref(false);
const keyToBackup = ref('');
const jdenticonValue = ref('');
const transferAddress = ref('');
const transferAmount = ref('');
watch(showExportModal, async (showExportModal) => {
    if (showExportModal) {
        keyToBackup.value = await wallet.getKeyToBackup();
    } else {
        // Wipe key to backup, just in case
        keyToBackup.value = '';
    }
});
getEventEmitter().on(
    'advanced-mode',
    (fAdvancedMode) => (advancedMode.value = fAdvancedMode)
);

/**
 * Parses whatever the secret is to a MasterKey
 * @param {string|number[]|Uint8Array} secret
 * @returns {Promise<import('../masterkey.js').MasterKey>}
 */
async function parseSecret(secret, password = '') {
    const rules = [
        {
            test: (s) => Array.isArray(s) || s instanceof Uint8Array,
            f: (s) => new LegacyMasterKey({ pkBytes: s }),
        },
        {
            test: (s) => isBase64(s) && s.length >= 128,
            f: async (s, p) => parseSecret(await decrypt(s, p)),
        },
        {
            test: (s) => s.startsWith('xprv'),
            f: (s) => new HdMasterKey({ xpriv: s }),
        },
        {
            test: (s) => s.startsWith('xpub'),
            f: (s) => new HdMasterKey({ xpub: s }),
        },
        {
            test: (s) =>
                cChainParams.current.PUBKEY_PREFIX.includes(s[0]) &&
                s.length === 34,
            f: (s) => new LegacyMasterKey({ address: s }),
        },
        {
            test: (s) => verifyWIF(s),
            f: (s) => parseSecret(parseWIF(s)),
        },
        {
            test: (s) => s.includes(' '),
            f: async (s) => {
                const { ok, msg, phrase } = await cleanAndVerifySeedPhrase(
                    s,
                    advancedMode.value
                );
                if (!ok) throw new Error(msg);
                return new HdMasterKey({
                    seed: await mnemonicToSeed(phrase),
                });
            },
        },
    ];

    for (const rule of rules) {
        let test;
        try {
            test = rule.test(secret, password);
        } catch (e) {
            test = false;
        }
        if (test) {
            try {
                return await rule.f(secret, password);
            } catch (e) {
                createAlert('warning', e.message, 5000);
                return;
            }
        }
    }
    createAlert('warning', ALERTS.FAILED_TO_IMPORT + '<br>', 6000);
}

/**
 * @param {Object} o - Options
 * @param {'legacy'|'hd'|'hardware'} o.type - type of import
 * @param {string} o.secret
 * @param {string} [o.password]
 */
async function importWallet({ type, secret, password = '' }) {
    /**
     * @type{import('../masterkey.js').MasterKey}
     */
    let key;
    if (type === 'hardware') {
        if (navigator.userAgent.includes('Firefox')) {
            createAlert('warning', ALERTS.WALLET_FIREFOX_UNSUPPORTED, 7500);
            return false;
        }
        key = await HardwareWalletMasterKey.create();

        createAlert(
            'info',
            tr(ALERTS.WALLET_HARDWARE_WALLET, [
                { hardwareWallet: strHardwareName },
            ]),
            12500
        );
    } else {
        key = await parseSecret(secret, password);
    }
    if (key) {
        wallet.setMasterKey(key);
        isImported.value = true;
        jdenticonValue.value = wallet.getAddress();
        if (!wallet.isHardwareWallet()) {
            needsToEncrypt.value =
                !wallet.isViewOnly() && !(await hasEncryptedWallet());
        } else {
            needsToEncrypt.value = false;
        }
        if (!(await mempool.loadFromDisk()))
            await getNetwork().walletFullSync();
        getEventEmitter().emit('wallet-import');
        if (needsToEncrypt.value) showEncryptModal.value = true;
        return true;
    }

    return false;
}

async function decryptWallet(strPassword = '') {
    // Check if there's any encrypted WIF available
    const database = await Database.getInstance();
    const { encWif: strEncWIF } = await database.getAccount();
    if (!strEncWIF || strEncWIF.length < 1) return false;

    // Prompt to decrypt it via password
    const strDecWIF = await decrypt(strEncWIF, strPassword);
    if (!strDecWIF || strDecWIF === 'decryption failed!') {
        if (strDecWIF)
            return createAlert('warning', ALERTS.INCORRECT_PASSWORD, 6000);
    } else {
        await importWallet({
            secret: strDecWIF,
        });
        return true;
    }
}

/**
 * Encrypt wallet
 * @param {string} password - Password to encrypt wallet with
 * @param {string} [currentPassword] - Current password with which the wallet is encrypted with, if any
 */
async function encryptWallet(password, currentPassword = '') {
    if (await hasEncryptedWallet()) {
        if (!(await decryptWallet(currentPassword))) return;
    }
    const res = await wallet.encryptWallet(password);
    if (res) {
        createAlert('success', ALERTS.NEW_PASSWORD_SUCCESS, 5500);
    }
    needsToEncrypt.value = false;
    // TODO: refactor once settings is written
    await updateEncryptionGUI();
}

// TODO: This needs to be vueeifed a bit
async function restoreWallet(strReason) {
    if (wallet.isHardwareWallet()) return true;
    // Build up the UI elements based upon conditions for the unlock prompt
    let strHTML = '';

    // If there's a reason given; display it as a sub-text
    strHTML += `<p style="opacity: 0.75">${strReason}</p>`;

    // Prompt the user
    if (
        await confirmPopup({
            title: translation.walletUnlock,
            html: `${strHTML}<input type="password" id="restoreWalletPassword" placeholder="${translation.walletPassword}" style="text-align: center;">`,
        })
    ) {
        // Fetch the password from the prompt, and immediately destroy the prompt input
        const domPassword = document.getElementById('restoreWalletPassword');
        const strPassword = domPassword.value;
        domPassword.value = '';
        const database = await Database.getInstance();
        const { encWif } = await database.getAccount();

        // Attempt to unlock the wallet with the provided password
        if (
            await importWallet({
                type: 'hd',
                secret: encWif,
                password: strPassword,
            })
        ) {
            // Wallet is unlocked!
            return true;
        } else {
            // Password is invalid
            return false;
        }
    } else {
        // User rejected the unlock
        return false;
    }
}

/**
 * Sends a transaction
 * @param {string} address - Address or contact to send to
 * @param {number} amount - Amount of PIVs to send
 */
async function send(address, amount) {
    // Ensure a wallet is loaded
    if (!(await wallet.hasWalletUnlocked(true))) return;

    // Ensure the wallet is unlocked
    if (
        wallet.isViewOnly() &&
        !(await restoreWallet(translation.walletUnlockTx))
    )
        return;

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
    if (!isStandardAddress(address))
        return createAlert(
            'warning',
            tr(ALERTS.INVALID_ADDRESS, [{ address }]),
            2500
        );

    // Sanity check the amount
    const nValue = Math.round(amount * COIN);
    if (!validateAmount(nValue)) return;

    // Create and send the TX
    await createAndSendTransaction({
        address,
        amount: nValue,
        isDelegation: false,
    });
}

getEventEmitter().on('toggle-network', async () => {
    const database = await Database.getInstance();
    const account = await database.getAccount();
    wallet.reset();
    wallet.setMasterKey(null);
    activity.value?.reset();

    if (account) {
        await importWallet({ type: 'hd', secret: account.publicKey });
    } else {
        isImported.value = false;
    }
    await updateEncryptionGUI(wallet.isLoaded());
    updateLogOutButton();
    // TODO: When tab component is written, simply emit an event
    doms.domDashboard.click();
});

onMounted(async () => {
    await start();

    if (await hasEncryptedWallet()) {
        const database = await Database.getInstance();
        const { publicKey } = await database.getAccount();
        await importWallet({ type: 'hd', secret: publicKey });

        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('addcontact')) {
            await handleContactRequest(urlParams);
        } else if (urlParams.has('pay')) {
            const reqAmount = parseFloat(urlParams.get('amount')) ?? 0;
            const reqTo = urlParams.get('pay') ?? '';
            transferAddress.value = reqTo;
            transferAmount.value = reqAmount;
            showTransferMenu.value = true;
        }
    } else {
        await (await Database.getInstance()).removeAllTxs();
    }
    updateLogOutButton();
});

const balance = ref(0);
const currency = ref('USD');
const price = ref(0.0);
const displayDecimals = ref(0);

getEventEmitter().on('sync-status', (status) => {
    if (status === 'stop') activity?.value?.update();
});

getEventEmitter().on('new-tx', (status) => {
    activity?.value?.update();
});

getEventEmitter().on('balance-update', async () => {
    balance.value = mempool.balance;
    currency.value = strCurrency.toUpperCase();
    price.value = await cMarket.getPrice(strCurrency);
    displayDecimals.value = nDisplayDecimals;
});

function changePassword() {
    showEncryptModal.value = true;
}

async function openSendQRScanner() {
    const cScan = await scanQRCode();
    if (cScan) {
        const { data } = cScan;
        if (!data) return;
        if (isStandardAddress(data) || isValidBech32(data).valid) {
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
            const urlParams = new URLSearchParams(data);
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
            <Login v-show="!isImported" @import-wallet="importWallet" />

            <br />

            <!-- Unlock wallet -->
            <div class="col-12 p-0" id="guiRestoreWallet" hidden>
                <center>
                    <div
                        class="dcWallet-warningMessage"
                        onclick="MPW.restoreWallet()"
                    >
                        <div class="shieldLogo">
                            <div class="shieldBackground">
                                <span
                                    class="dcWallet-svgIconPurple"
                                    style="top: 14px; left: 7px"
                                >
                                    <i
                                        class="fas fa-lock"
                                        style="
                                            position: relative;
                                            left: 3px;
                                            top: -5px;
                                        "
                                    ></i>
                                </span>
                            </div>
                        </div>
                        <div class="lockUnlock">
                            {{ translation.unlockWallet }}
                        </div>
                    </div>
                </center>
            </div>
            <!-- // Unlock Wallet -->

            <!-- Lock wallet -->
            <div class="col-12" id="guiWipeWallet" hidden>
                <center>
                    <div
                        class="dcWallet-warningMessage"
                        onclick="MPW.wipePrivateData()"
                    >
                        <div class="shieldLogo">
                            <div class="shieldBackground">
                                <span
                                    class="dcWallet-svgIconPurple"
                                    style="top: 14px; left: 7px"
                                >
                                    <i
                                        class="fas fa-unlock"
                                        style="
                                            position: relative;
                                            left: 3px;
                                            top: -5px;
                                        "
                                    ></i>
                                </span>
                            </div>
                        </div>
                        <div class="lockUnlock">
                            {{ translation.lockWallet }}
                        </div>
                    </div>
                </center>
            </div>
            <!-- // Lock Wallet -->

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
                    <div class="modal-content">
                        <div class="modal-header" id="redeemCodeModalHeader">
                            <h3
                                class="modal-title"
                                id="redeemCodeModalTitle"
                                style="
                                    text-align: center;
                                    width: 100%;
                                    color: #8e21ff;
                                "
                            >
                                Redeem Code
                            </h3>
                        </div>
                        <div class="modal-body center-text">
                            <center>
                                <p class="mono" style="font-size: small">
                                    <b>PIVX Promos</b>
                                    <span
                                        style="font-family: inherit !important"
                                    >
                                        {{ translation.pivxPromos }}
                                    </span>
                                </p>
                                <div id="redeemCodeModeBox">
                                    <button
                                        type="button"
                                        onclick="MPW.setPromoMode(true)"
                                        id="redeemCodeModeRedeem"
                                        class="pivx-button-big"
                                        style="
                                            margin: 0;
                                            border-top-right-radius: 0;
                                            border-bottom-right-radius: 0;
                                            opacity: 0.5;
                                        "
                                    >
                                        Redeem
                                    </button>
                                    <button
                                        type="button"
                                        onclick="MPW.setPromoMode(false)"
                                        id="redeemCodeModeCreate"
                                        class="pivx-button-big"
                                        style="
                                            margin: 0;
                                            border-top-left-radius: 0;
                                            border-bottom-left-radius: 0;
                                            opacity: 0.8;
                                        "
                                    >
                                        Create
                                    </button>
                                </div>
                                <br />
                                <br />
                                <div id="redeemCodeUse">
                                    <div class="col-8" id="redeemCodeInputBox">
                                        <div
                                            class="input-group"
                                            style="
                                                border-color: #9121ff;
                                                border-style: solid;
                                                border-radius: 10px;
                                            "
                                        >
                                            <input
                                                class="btn-group-input mono center-text"
                                                type="text"
                                                id="redeemCodeInput"
                                                :placeholder="
                                                    translation.redeemInput
                                                "
                                                autocomplete="nope"
                                            />
                                            <div class="input-group-append">
                                                <span
                                                    class="input-group-text ptr"
                                                    onclick="MPW.openPromoQRScanner()"
                                                    ><i
                                                        class="fa-solid fa-qrcode fa-2xl"
                                                    ></i
                                                ></span>
                                            </div>
                                        </div>
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

                                        <p
                                            id="redeemCodeETA"
                                            style="
                                                margin-bottom: 0;
                                                display: none;
                                            "
                                        >
                                            <br /><br />
                                        </p>
                                        <progress
                                            id="redeemCodeProgress"
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
                                    <div class="col-11">
                                        <div class="row">
                                            <div
                                                class="col-6"
                                                style="padding-right: 3px"
                                            >
                                                <div
                                                    class="input-group"
                                                    style="
                                                        border-color: #9121ff;
                                                        border-style: solid;
                                                        border-radius: 10px;
                                                    "
                                                >
                                                    <input
                                                        class="btn-group-input mono center-text"
                                                        style="
                                                            border-top-right-radius: 9px;
                                                            border-bottom-right-radius: 9px;
                                                        "
                                                        type="text"
                                                        id="redeemCodeCreateInput"
                                                        :placeholder="
                                                            translation.createName
                                                        "
                                                        autocomplete="nope"
                                                    />
                                                </div>
                                            </div>
                                            <div
                                                class="col-6"
                                                style="padding-left: 3px"
                                            >
                                                <div
                                                    class="input-group"
                                                    style="
                                                        border-color: #9121ff;
                                                        border-style: solid;
                                                        border-radius: 10px;
                                                    "
                                                >
                                                    <input
                                                        class="btn-group-input mono center-text"
                                                        id="redeemCodeCreateAmountInput"
                                                        style="
                                                            border-top-right-radius: 9px;
                                                            border-bottom-right-radius: 9px;
                                                        "
                                                        type="text"
                                                        :placeholder="
                                                            translation.createAmount
                                                        "
                                                        autocomplete="nope"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div
                                        class="table-promo d-none"
                                        id="promo-table"
                                    >
                                        <br />
                                        <table class="table table-hover">
                                            <thead>
                                                <tr>
                                                    <td class="text-center">
                                                        <b> Manage </b>
                                                    </td>
                                                    <td class="text-center">
                                                        <b> Promo Code </b>
                                                    </td>
                                                    <td class="text-center">
                                                        <b> Amount </b>
                                                    </td>
                                                    <td class="text-center">
                                                        <b> State </b
                                                        ><i
                                                            onclick="MPW.promosToCSV()"
                                                            style="
                                                                margin-left: 5px;
                                                            "
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
                                <br />
                            </center>
                        </div>
                        <div
                            class="modal-footer"
                            hidden="true"
                            id="redeemCodeModalButtons"
                        >
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
                                data-dismiss="modal"
                                aria-label="Close"
                                class="pivx-button-big"
                                style="float: right; opacity: 0.7"
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
                        <div class="modal-footer" hidden="true">
                            <button
                                type="button"
                                data-dismiss="modal"
                                aria-label="Close"
                                class="pivx-button-big"
                                data-i18n="popupClose"
                                style="color: #fff; float: right; opacity: 0.8"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <!-- // Contacts Modal -->
            <ExportPrivKey
                :show="showExportModal"
                :privateKey="keyToBackup"
                @close="showExportModal = false"
            />
            <!-- WALLET FEATURES -->
            <div v-if="isImported">
                <GenKeyWarning
                    @onEncrypt="encryptWallet"
                    @close="showEncryptModal = false"
                    :showModal="showEncryptModal"
                    :showBox="needsToEncrypt"
                />
                <div class="row p-0">
                    <!-- Balance in PIVX & USD-->
                    <WalletBalance
                        :balance="balance"
                        :jdenticonValue="jdenticonValue"
                        :isHdWallet="false"
                        :isHardwareWallet="false"
                        :currency="currency"
                        :price="price"
                        :displayDecimals="displayDecimals"
                        @reload="refreshChainData()"
                        @send="showTransferMenu = true"
                        @exportPrivKeyOpen="showExportModal = true"
                        class="col-12 p-0 mb-5"
                    />
                    <Activity
                        ref="activity"
                        class="col-12 mb-5"
                        title="Activity"
                        :rewards="false"
                    />
                </div>
            </div>
        </div>
        <TransferMenu
            :show="showTransferMenu"
            :price="price"
            :currency="currency"
            v-model:amount="transferAmount"
            v-model:address="transferAddress"
            @openQrScan="openSendQRScanner()"
            @close="showTransferMenu = false"
            @send="send"
            @max-balance="transferAmount = mempool.balance.toString()"
        />
    </div>
</template>
