<script setup>
import Login from './Login.vue';
import WalletBalance from './WalletBalance.vue';
import Activity from './Activity.vue';
import { cleanAndVerifySeedPhrase, wallet } from '../wallet.js';
import { parseWIF, verifyWIF } from '../encoding.js';
import { createAlert, isBase64 } from '../misc.js';
import { ALERTS, translation } from '../i18n.js';
import {
    LegacyMasterKey,
    HardwareWalletMasterKey,
    HdMasterKey,
} from '../masterkey';
import { decrypt } from '../aes-gcm.js';
import { cChainParams } from '../chain_params';
import { ref } from 'vue';
import { mnemonicToSeed } from 'bip39';

const isImported = ref(wallet.isLoaded());
const activity = ref(null);
const walletBalance = ref(null);

/**
 * Parses whatever the secret is, to
 * @param {string|number[]} secret
 * @returns {Promise<import('../masterkey.js').MasterKey>}
 */
async function parseSecret(secret, password = '') {
    console.log(secret, password);
    const rules = [
        {
            test: (s) => Array.isArray(s) || s instanceof Uint8Array,
            f: (s) => new LegacyMasterKey({ pkBytes: s }),
        },
        {
            test: (s) => isBase64(s),
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

    createAlert('warning', 'Wrong key');
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
            return createAlert(
                'warning',
                ALERTS.WALLET_FIREFOX_UNSUPPORTED,
                7500
            );
        }
        await wallet.setMasterKey(new HardwareWalletMasterKey());
        const publicKey = await getHardwareWalletKeys(
            wallet.getDerivationPath()
        );
        // Errors are handled within the above function, so there's no need for an 'else' here, just silent ignore.
        if (!publicKey) {
            await wallet.setMasterKey(null);
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
        const key = await parseSecret(secret, password);
        if (key) {
            await wallet.setMasterKey(key);
            isImported.value = true;
        }
    }
}
</script>

<template>
    <div id="keypair" class="tabcontent">
        <div class="row m-0">
            <Login v-show="!isImported" @import-wallet="importWallet" />
            <!-- WARNING -->
            <div class="col-12" id="genKeyWarning" style="display: none">
                <center>
                    <div
                        id="gettingStartedBtn"
                        class="dcWallet-warningMessage"
                        data-toggle="modal"
                        data-target="#encryptWalletModal"
                    >
                        <div class="shieldLogo">
                            <div class="shieldBackground">
                                <span
                                    class="dcWallet-svgIconPurple"
                                    style="top: 14px; left: 7px"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 100 100"
                                    >
                                        <path
                                            d="M85.967 10.65l-32.15-9.481a13.466 13.466 0 00-7.632 0l-32.15 9.48C11.661 11.351 10 13.567 10 16.042v26.623c0 12.321 3.67 24.186 10.609 34.31 6.774 9.885 16.204 17.49 27.264 21.99a5.612 5.612 0 004.251 0c11.061-4.5 20.491-12.104 27.266-21.99C86.329 66.85 90 54.985 90 42.664V16.042a5.656 5.656 0 00-4.033-5.392zM69 68.522C69 70.907 67.03 72 64.584 72H34.092C31.646 72 30 70.907 30 68.522v-23.49C30 42.647 31.646 41 34.092 41H37v-9.828C37 24.524 41.354 18.5 49.406 18.5 57.37 18.5 62 24.066 62 31.172V41h2.584C67.03 41 69 42.647 69 45.032v23.49zM58 41v-9.828c0-4.671-3.708-8.472-8.5-8.472-4.791 0-8.5 3.8-8.5 8.472V41h17z"
                                        ></path>
                                    </svg>
                                </span>
                            </div>
                        </div>
                        <div>
                            <span style="color: #dfdfdf; font-size: 12px">{{
                                translation.gettingStarted
                            }}</span
                            ><br />
                            <span>{{ translation.secureYourWallet }}</span>
                        </div>
                    </div>
                </center>
            </div>

            <!-- // WARNING -->
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
                <div class="row p-0">
                    <!-- Balance in PIVX & USD-->
                    <WalletBalance
                        ref="walletBalance"
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

                <div
                    id="transferMenu"
                    class="exportKeysModalColor transferMenu transferAnimation"
                >
                    <div style="padding-top: 5px">
                        <div
                            class="transferExit ptr"
                            onclick="MPW.toggleBottomMenu('transferMenu', 'transferAnimation')"
                        >
                            <i class="fa-solid fa-xmark"></i>
                        </div>
                    </div>

                    <div class="transferBody">
                        <label>{{ translation.address }}</label
                        ><br />

                        <div class="input-group mb-3">
                            <input
                                class="btn-group-input"
                                oninput="MPW.guiCheckRecipientInput(event)"
                                style="font-family: monospace"
                                type="text"
                                id="address1s"
                                :placeholder="translation.receivingAddress"
                                autocomplete="nope"
                            />
                            <div class="input-group-append">
                                <span
                                    class="input-group-text ptr"
                                    onclick="MPW.openSendQRScanner()"
                                    ><i class="fa-solid fa-qrcode fa-2xl"></i
                                ></span>
                                <span
                                    class="input-group-text ptr"
                                    onclick="MPW.guiSelectContact(MPW.doms.domAddress1s)"
                                    ><i
                                        class="fa-solid fa-address-book fa-2xl"
                                    ></i
                                ></span>
                            </div>
                        </div>

                        <div id="reqDescDisplay" style="display: none">
                            <label
                                ><span>{{
                                    translation.paymentRequestMessage
                                }}</span></label
                            ><br />
                            <div class="input-group">
                                <input
                                    class="btn-input"
                                    style="font-family: monospace"
                                    type="text"
                                    disabled
                                    id="reqDesc"
                                    placeholder="Payment Request Description"
                                    autocomplete="nope"
                                />
                            </div>
                        </div>

                        <label
                            ><span>{{ translation.amount }}</span></label
                        ><br />

                        <div class="row">
                            <div class="col-7 pr-2">
                                <div class="input-group mb-3">
                                    <input
                                        class="btn-group-input"
                                        style="padding-right: 0px"
                                        type="number"
                                        id="sendAmountCoins"
                                        placeholder="0.00"
                                        autocomplete="nope"
                                        onkeydown="javascript: return event.keyCode == 69 ? false : true"
                                    />
                                    <div class="input-group-append">
                                        <span class="input-group-text p-0">
                                            <div
                                                onclick="MPW.selectMaxBalance(MPW.doms.domSendAmountCoins, MPW.doms.domSendAmountValue)"
                                                style="
                                                    cursor: pointer;
                                                    border: 0px;
                                                    border-radius: 7px;
                                                    padding: 3px 6px;
                                                    margin: 0px 1px;
                                                    background: linear-gradient(
                                                        183deg,
                                                        #9621ff9c,
                                                        #7d21ffc7
                                                    );
                                                    color: #fff;
                                                    font-weight: bold;
                                                "
                                            >
                                                {{
                                                    translation.sendAmountCoinsMax
                                                }}
                                            </div>
                                        </span>
                                        <span
                                            id="sendAmountCoinsTicker"
                                            class="input-group-text"
                                            >PIVX</span
                                        >
                                    </div>
                                </div>
                            </div>

                            <div class="col-5 pl-2">
                                <div class="input-group mb-3">
                                    <input
                                        class="btn-group-input"
                                        type="text"
                                        id="sendAmountValue"
                                        placeholder="0.00"
                                        autocomplete="nope"
                                        onkeydown="javascript: return event.keyCode == 69 ? false : true"
                                    />
                                    <div class="input-group-append">
                                        <span
                                            id="sendAmountValueCurrency"
                                            class="input-group-text pl-0"
                                            >USD</span
                                        >
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div id="advMode1" class="d-none">
                            <label
                                ><span>{{ translation.fee }}</span></label
                            ><br />

                            <div class="row text-center">
                                <div class="col-4 pr-1">
                                    <div
                                        id="lowFee"
                                        onclick="switchFee(this)"
                                        class="feeButton"
                                    >
                                        Low<br />
                                        9 sat/B
                                    </div>
                                </div>

                                <div class="col-4 pl-2 pr-2">
                                    <div
                                        id="mediumFee"
                                        onclick="switchFee(this)"
                                        class="feeButton feeButtonSelected"
                                    >
                                        Medium<br />
                                        11 sat/B
                                    </div>
                                </div>

                                <div class="col-4 pl-1">
                                    <div
                                        id="highFee"
                                        onclick="switchFee(this)"
                                        class="feeButton"
                                    >
                                        High<br />
                                        14 sat/B
                                    </div>
                                </div>
                            </div>
                            <br />
                        </div>

                        <div class="text-right pb-2">
                            <button
                                class="pivx-button-medium w-100"
                                style="margin: 0px"
                                onclick="MPW.createTxGUI()"
                            >
                                <span class="buttoni-icon"
                                    ><i
                                        class="fas fa-paper-plane fa-tiny-margin"
                                    ></i
                                ></span>
                                <span class="buttoni-text" id="genIt">{{
                                    translation.send
                                }}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <!-- // KEYPAIR SECTION -->
</template>
