<script setup>
import Login from './Login.vue';
import WalletBalance from './WalletBalance.vue';
import Activity from './Activity.vue';
import GenKeyWarning from './GenKeyWarning.vue';
import TransferMenu from './TransferMenu.vue';
import {
    cleanAndVerifySeedPhrase,
    decryptWallet,
    hasEncryptedWallet,
    wallet,
} from '../wallet.js';
import { parseWIF, verifyWIF } from '../encoding.js';
import { createAlert, isBase64 } from '../misc.js';
import { ALERTS, translation, tr } from '../i18n.js';
import {
    LegacyMasterKey,
    HardwareWalletMasterKey,
    HdMasterKey,
} from '../masterkey';
import { decrypt } from '../aes-gcm.js';
import { cChainParams, COIN } from '../chain_params';
import { onMounted, ref } from 'vue';
import { mnemonicToSeed } from 'bip39';
import { getEventEmitter } from '../event_bus';
import { Database } from '../database';
import { start, doms } from '../global';
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

const isImported = ref(wallet.isLoaded());
const activity = ref(null);
const needsToEncrypt = ref(true);
const showTransferMenu = ref(false);
const advancedMode = ref(false);
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
                const { ok, msg, phrase } = await cleanAndVerifySeedPhrase(s);
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
    if (type === 'hardware') {
        if (navigator.userAgent.includes('Firefox')) {
            createAlert('warning', ALERTS.WALLET_FIREFOX_UNSUPPORTED, 7500);
            return false;
        }
        await wallet.setMasterKey(new HardwareWalletMasterKey());
        const publicKey = await getHardwareWalletKeys(
            wallet.getDerivationPath()
        );
        // Errors are handled within the above function, so there's no need for an 'else' here, just silent ignore.
        if (!publicKey) {
            await wallet.setMasterKey(null);
            return false;
        }

        isImported.value = true;
        getEventEmitter().emit('wallet-import');

        createAlert(
            'info',
            tr(ALERTS.WALLET_HARDWARE_WALLET, [
                { hardwareWallet: strHardwareName },
            ]),
            12500
        );
    } else {
        const key = await parseSecret(secret, password);
        if (key) {
            await wallet.setMasterKey(key);
            isImported.value = true;
            needsToEncrypt.value =
                !key.isViewOnly && !(await hasEncryptedWallet());
            getEventEmitter().emit('wallet-import');
            return true;
        }
    }
    return false;
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
    if (account) {
        await importWallet({ type: 'hd', secret: account.publicKey });
    } else {
        isImported.value = false;
    }
    // TODO: When tab component is written, simply emit an event
    doms.domDashboard.click();
});

onMounted(async () => {
    await start();
    if (await hasEncryptedWallet()) {
        const database = await Database.getInstance();
        const account = await database.getAccount();
        await importWallet({ type: 'hd', secret: account.publicKey });
    }
});

const balance = ref(0);
const currency = ref('USD');
const price = ref(0.0);
const displayDecimals = ref(0);

getEventEmitter().on('balance-update', async () => {
    balance.value = mempool.getBalance();
    currency.value = strCurrency.toUpperCase();
    price.value = await cMarket.getPrice(strCurrency);
    displayDecimals.value = nDisplayDecimals;

    // TODO: move this
    // activity.value.update();
});

defineExpose({
    restoreWallet,
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

            <!-- WALLET FEATURES -->
            <div v-if="isImported">
                <GenKeyWarning
                    v-if="needsToEncrypt"
                    @onEncrypt="encryptWallet"
                />
                <div class="row p-0">
                    <!-- Balance in PIVX & USD-->
                    <WalletBalance
                        :balance="balance"
                        jdenticonValue="hi"
                        :isHdWallet="false"
                        :isHardwareWallet="false"
                        :currency="currency"
                        :price="price"
                        :displayDecimals="displayDecimals"
                        @reload="refreshChainData()"
                        @send="showTransferMenu = true"
                        class="col-12 p-0 mb-5"
                    />
                    <Activity
                        ref="activity"
                        class="col-12 mb-5"
                        title="Activity"
                        :rewards="false"
                    />
                </div>

                <!-- Export Private Key Modal -->
                <div
                    class="modal fade"
                    id="exportPrivateKeysModal"
                    tabindex="-1"
                    role="dialog"
                    aria-labelledby="exportPrivateKeysLabel"
                    aria-hidden="true"
                >
                    <div
                        class="modal-dialog modal-dialog-centered modal-full"
                        role="document"
                    >
                        <div class="modal-content exportKeysModalColor">
                            <div class="modal-header">
                                <h5
                                    data-i18n="privateKey"
                                    class="modal-title"
                                    id="exportPrivateKeysLabel"
                                >
                                    Private Key
                                </h5>
                                <button
                                    type="button"
                                    class="close"
                                    onclick="MPW.toggleExportUI()"
                                    data-dismiss="modal"
                                    aria-label="Close"
                                >
                                    <i class="fa-solid fa-xmark closeCross"></i>
                                </button>
                            </div>
                            <div class="modal-body">
                                <div class="dcWallet-privateKeyDiv text-center">
                                    <img id="privateKeyImage" /><br />
                                    <h3 data-i18n="viewPrivateKey">
                                        View Private Key?
                                    </h3>
                                    <span
                                        data-i18n="privateWarning1"
                                        class="span1"
                                        >Make sure no one can see your
                                        screen.</span
                                    >
                                    <span
                                        data-i18n="privateWarning2"
                                        class="span2"
                                        >Anyone with this key can steal your
                                        funds.</span
                                    >
                                    <code
                                        class="blurred"
                                        id="exportPrivateKeyText"
                                    ></code>
                                </div>
                            </div>
                            <div class="modal-footer text-center">
                                <button
                                    class="pivx-button-big"
                                    onclick="MPW.unblurPrivKey()"
                                >
                                    <span
                                        data-i18n="viewKey"
                                        class="buttoni-text"
                                        >View key</span
                                    >
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <!-- // Export Private Keys Modal -->
            </div>
        </div>
        <TransferMenu
            :show="showTransferMenu"
            :price="price"
            :currency="currency"
            @close="showTransferMenu = false"
            @send="send"
        />
    </div>
</template>
