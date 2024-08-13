import { TransactionBuilder } from './transaction_builder.js';
import { ALERTS, start as i18nStart, translation } from './i18n.js';
import { wallet, hasEncryptedWallet, Wallet } from './wallet.js';
import { getNetwork } from './network.js';
import { start as settingsStart, cExplorer, strCurrency } from './settings.js';
import { createAlert, confirmPopup, sanitizeHTML } from './misc.js';
import { registerWorker } from './native.js';
import { getEventEmitter } from './event_bus.js';
import { Database } from './database.js';
import { checkForUpgrades } from './changelog.js';
import { createApp } from 'vue';
import Dashboard from './dashboard/Dashboard.vue';
import { loadDebug, debugLog, DebugTopics } from './debug.js';
import Stake from './stake/Stake.vue';
import MasternodeComponent from './masternode/Masternode.vue';
import Governance from './governance/Governance.vue';
import { createPinia } from 'pinia';
import { cOracle } from './prices.js';

import pIconCopy from '../assets/icons/icon-copy.svg';
import pIconCheck from '../assets/icons/icon-check.svg';

/** A flag showing if base MPW is fully loaded or not */
export let fIsLoaded = false;

/** A getter for the flag showing if base MPW is fully loaded or not */
export function isLoaded() {
    return fIsLoaded;
}

// Block count
export let blockCount = 0;

export let doms = {};

const pinia = createPinia();

export const dashboard = createApp(Dashboard).use(pinia).mount('#DashboardTab');
createApp(Stake).use(pinia).mount('#StakingTab');
createApp(MasternodeComponent).use(pinia).mount('#Masternode');
createApp(Governance).use(pinia).mount('#Governance');

export async function start() {
    doms = {
        domNavbarToggler: document.getElementById('navbarToggler'),
        domDashboard: document.getElementById('dashboard'),
        domStakeTab: document.getElementById('stakeTab'),
        domModalQR: document.getElementById('ModalQR'),
        domModalQrLabel: document.getElementById('ModalQRLabel'),
        domModalQrReceiveTypeBtn: document.getElementById(
            'ModalQRReceiveTypeBtn'
        ),
        domModalQRReader: document.getElementById('qrReaderModal'),
        domQrReaderStream: document.getElementById('qrReaderStream'),
        domCloseQrReaderBtn: document.getElementById('closeQrReader'),
        domModalWalletBreakdown: document.getElementById(
            'walletBreakdownModal'
        ),
        domWalletBreakdownCanvas: document.getElementById(
            'walletBreakdownCanvas'
        ),
        domWalletBreakdownLegend: document.getElementById(
            'walletBreakdownLegend'
        ),
        domGenHardwareWallet: document.getElementById('generateHardwareWallet'),
        //GOVERNANCE ELEMENTS
        domGovTab: document.getElementById('governanceTab'),
        domGovProposalsTable: document.getElementById('proposalsTable'),
        domGovProposalsTableBody: document.getElementById('proposalsTableBody'),
        domTotalGovernanceBudget: document.getElementById(
            'totalGovernanceBudget'
        ),
        domTotalGovernanceBudgetValue: document.getElementById(
            'totalGovernanceBudgetValue'
        ),
        domAllocatedGovernanceBudget: document.getElementById(
            'allocatedGovernanceBudget'
        ),
        domAllocatedGovernanceBudgetValue: document.getElementById(
            'allocatedGovernanceBudgetValue'
        ),
        domAllocatedGovernanceBudget2: document.getElementById(
            'allocatedGovernanceBudget2'
        ),
        domAllocatedGovernanceBudgetValue2: document.getElementById(
            'allocatedGovernanceBudgetValue2'
        ),
        domGovProposalsContestedTable: document.getElementById(
            'proposalsContestedTable'
        ),
        domGovProposalsContestedTableBody: document.getElementById(
            'proposalsContestedTableBody'
        ),
        //MASTERNODE ELEMENTS
        domCreateMasternode: document.getElementById('createMasternode'),
        domControlMasternode: document.getElementById('controlMasternode'),
        domAccessMasternode: document.getElementById('accessMasternode'),
        domMnAccessMasternodeText: document.getElementById(
            'accessMasternodeText'
        ),
        domMnCreateType: document.getElementById('mnCreateType'),
        domMnTextErrors: document.getElementById('mnTextErrors'),
        domMnIP: document.getElementById('mnIP'),
        domMnTxId: document.getElementById('mnTxId'),
        domMnPrivateKey: document.getElementById('mnPrivateKey'),
        domMnDashboard: document.getElementById('mnDashboard'),
        domMnProtocol: document.getElementById('mnProtocol'),
        domMnStatus: document.getElementById('mnStatus'),
        domMnNetType: document.getElementById('mnNetType'),
        domMnNetIP: document.getElementById('mnNetIP'),
        domMnLastSeen: document.getElementById('mnLastSeen'),

        domEncryptWalletLabel: document.getElementById('encryptWalletLabel'),
        domEncryptPasswordCurrent: document.getElementById(
            'changePassword-current'
        ),
        domEncryptPasswordFirst: document.getElementById('newPassword'),
        domEncryptPasswordSecond: document.getElementById('newPasswordRetype'),
        domAnalyticsDescriptor: document.getElementById('analyticsDescriptor'),
        domRedeemTitle: document.getElementById('redeemCodeModalTitle'),
        domRedeemCodeUse: document.getElementById('redeemCodeUse'),
        domRedeemCodeCreate: document.getElementById('redeemCodeCreate'),
        domRedeemCodeGiftIconBox: document.getElementById(
            'redeemCodeGiftIconBox'
        ),
        domRedeemCodeGiftIcon: document.getElementById('redeemCodeGiftIcon'),
        domRedeemCodeETA: document.getElementById('redeemCodeETA'),
        domRedeemCodeProgress: document.getElementById('redeemCodeProgress'),
        domRedeemCodeInputBox: document.getElementById('redeemCodeInputBox'),
        domRedeemCodeInput: document.getElementById('redeemCodeInput'),
        domRedeemCodeConfirmBtn: document.getElementById(
            'redeemCodeModalConfirmButton'
        ),
        domRedeemCodeModeRedeemBtn: document.getElementById(
            'redeemCodeModeRedeem'
        ),
        domRedeemCodeModeCreateBtn: document.getElementById(
            'redeemCodeModeCreate'
        ),
        domRedeemCodeCreateInput: document.getElementById(
            'redeemCodeCreateInput'
        ),
        domRedeemCodeCreateAmountInput: document.getElementById(
            'redeemCodeCreateAmountInput'
        ),
        domRedeemCodeCreatePendingList: document.getElementById(
            'redeemCodeCreatePendingList'
        ),
        domPromoTable: document.getElementById('promo-table'),
        domContactsTable: document.getElementById('contactsList'),
        domConfirmModalDialog: document.getElementById('confirmModalDialog'),
        domConfirmModalMain: document.getElementById('confirmModalMain'),
        domConfirmModalHeader: document.getElementById('confirmModalHeader'),
        domConfirmModalTitle: document.getElementById('confirmModalTitle'),
        domConfirmModalContent: document.getElementById('confirmModalContent'),
        domConfirmModalButtons: document.getElementById('confirmModalButtons'),
        domConfirmModalConfirmButton: document.getElementById(
            'confirmModalConfirmButton'
        ),
        domConfirmModalCancelButton: document.getElementById(
            'confirmModalCancelButton'
        ),

        masternodeLegacyAccessText:
            'Access the masternode linked to this addresss<br> Note: the masternode MUST have been already created (however it can be online or offline)<br>  If you want to create a new masternode access with a HD wallet',
        masternodeHDAccessText:
            "Access your masternodes if you have any! If you don't you can create one",
        // Aggregate menu screens and links for faster switching
        arrDomScreens: document.getElementsByClassName('tabcontent'),
        arrDomScreenLinks: document.getElementsByClassName('tablinks'),
        // Alert DOM element
        domAlertPos: document.getElementsByClassName('alertPositioning')[0],
        domNetwork: document.getElementById('Network'),
        domChangePasswordContainer: document.getElementById(
            'changePassword-container'
        ),
        domLogOutContainer: document.getElementById('logOut-container'),
        domDebug: document.getElementById('Debug'),
        domTestnet: document.getElementById('Testnet'),
        domCurrencySelect: document.getElementById('currency'),
        domExplorerSelect: document.getElementById('explorer'),
        domNodeSelect: document.getElementById('node'),
        domAutoSwitchToggle: document.getElementById('autoSwitchToggler'),
        domTranslationSelect: document.getElementById('translation'),
        domDisplayDecimalsSlider: document.getElementById('displayDecimals'),
        domDisplayDecimalsSliderDisplay:
            document.getElementById('sliderDisplay'),
        domBlackBack: document.getElementById('blackBack'),
        domWalletSettings: document.getElementById('settingsWallet'),
        domDisplaySettings: document.getElementById('settingsDisplay'),
        domWalletSettingsBtn: document.getElementById('settingsWalletBtn'),
        domDisplaySettingsBtn: document.getElementById('settingsDisplayBtn'),
        domVersion: document.getElementById('version'),
        domFlipdown: document.getElementById('flipdown'),
        domTestnetToggler: document.getElementById('testnetToggler'),
        domAdvancedModeToggler: document.getElementById('advancedModeToggler'),
        domAutoLockModeToggler: document.getElementById('autoLockModeToggler'),
        domRedeemCameraBtn: document.getElementById('redeemCameraBtn'),
    };

    // Set Copyright year on footer
    document.getElementById('copyrightYear').innerHTML =
        new Date().getFullYear();

    await i18nStart();
    await loadImages();

    // Enable all Bootstrap Tooltips
    $(function () {
        $('#displayDecimals').tooltip({
            template:
                '<div class="tooltip sliderStyle" role="tooltip"><div class="arrow"></div><div class="tooltip-inner"></div></div>',
        });
        $('[data-toggle="tooltip"]').tooltip();
    });

    // Set decimal slider event
    const sliderElement = document.getElementById('displayDecimals');
    function handleDecimalSlider() {
        setTimeout(() => {
            try {
                if (window.innerWidth > 991) {
                    const sliderHalf = Math.round(
                        document
                            .getElementById('displayDecimals')
                            .getBoundingClientRect().width / 2
                    );
                    const sliderBegin = -sliderHalf + 28;
                    const stepVal = (sliderHalf * 2) / 8 - 6.45;
                    const sliderValue = parseInt(sliderElement.value) + 1;

                    document.querySelector('.sliderStyle').style.left = `${
                        sliderBegin - stepVal + stepVal * sliderValue
                    }px`;
                    document.querySelector('.tooltip-inner').innerHTML =
                        sliderValue - 1;
                }
            } catch (e) {}
        }, 10);
    }
    sliderElement.addEventListener('input', handleDecimalSlider);
    sliderElement.addEventListener('mouseover', handleDecimalSlider);

    // Load debug
    await loadDebug();

    // Register native app service
    registerWorker();
    await settingsStart();

    subscribeToNetworkEvents();
    // Make sure we know the correct number of blocks
    await refreshChainData();
    // Load the price manager
    cOracle.load();

    // If allowed by settings: submit a simple 'hit' (app load) to Labs Analytics
    getNetwork().submitAnalytics('hit');
    setInterval(() => {
        // Refresh blockchain data
        refreshChainData();

        // Fetch the PIVX prices
        refreshPriceDisplay();
    }, 15000);

    // Check for recent upgrades, display the changelog
    checkForUpgrades();

    // Update the Encryption UI (If the user has a wallet, then it changes to "Change Password" rather than "Encrypt Wallet")
    getEventEmitter().on('wallet-import', async () => {
        updateLogOutButton();
    });
    fIsLoaded = true;

    // If we haven't already (due to having no wallet, etc), display the Dashboard
    doms.domDashboard.click();
}

async function refreshPriceDisplay() {
    await cOracle.getPrice(strCurrency);
    getEventEmitter().emit('balance-update');
}

function subscribeToNetworkEvents() {
    getEventEmitter().on('network-toggle', (value) => {
        doms.domNetwork.innerHTML =
            '<i class="fa-solid fa-' + (value ? 'wifi' : 'ban') + '"></i>';
    });

    getEventEmitter().on('new-block', (block) => {
        debugLog(DebugTopics.GLOBAL, `New block detected! ${block}`);
    });

    getEventEmitter().on('transaction-sent', (success, result) => {
        if (success) {
            createAlert(
                'success',
                `${ALERTS.TX_SENT}<br>${sanitizeHTML(result)}`,
                result ? 1250 + result.length * 50 : 3000
            );
            // If allowed by settings: submit a simple 'tx' ping to Labs Analytics
            getNetwork().submitAnalytics('transaction');
        } else {
            console.error('Error sending transaction:');
            console.error(result);
            createAlert('warning', ALERTS.TX_FAILED, 2500);
        }
    });
}

/**
 * Open a UI 'tab' menu, and close all other tabs, intended for frontend use
 * @param {Event} evt - The click event target
 * @param {string} tabName - The name of the tab to load
 */
export function openTab(evt, tabName) {
    // Only allow switching tabs if MPw is loaded
    if (!isLoaded()) return;

    // Hide all screens and deactivate link highlights
    for (const domScreen of doms.arrDomScreens)
        domScreen.style.display = 'none';
    for (const domLink of doms.arrDomScreenLinks)
        domLink.classList.remove('active');

    // Show and activate the given screen
    document.getElementById(tabName).style.display = 'block';
    evt.currentTarget.classList.add('active');

    // Close the navbar if it's not already closed
    if (!doms.domNavbarToggler.className.includes('collapsed'))
        doms.domNavbarToggler.click();
}

/**
 * Return locale settings best for displaying the user-selected currency
 * @param {Number} nAmount - The amount in Currency
 */
export function optimiseCurrencyLocale(nAmount) {
    // Allow manipulating the value, if necessary
    let nValue = nAmount;

    // Find the best fitting native-locale
    const cLocale = Intl.supportedValuesOf('currency').includes(
        strCurrency.toUpperCase()
    )
        ? {
              style: 'currency',
              currency: strCurrency,
              currencyDisplay: 'narrowSymbol',
          }
        : { maximumFractionDigits: 8, minimumFractionDigits: 8 };

    // Catch display edge-cases; like Satoshis having decimals.
    switch (strCurrency) {
        case 'sats':
            nValue = Math.round(nValue);
            cLocale.maximumFractionDigits = 0;
            cLocale.minimumFractionDigits = 0;
    }

    // Return display-optimised Value and Locale pair.
    return { nValue, cLocale };
}

/**
 * Open the Explorer in a new tab for the current wallet, or a specific address
 * @param {string?} strAddress - Optional address to open, if void, the master key is used
 */
export async function openExplorer(strAddress = '') {
    if (wallet.isLoaded() && wallet.isHD() && !strAddress) {
        const xpub = wallet.getXPub();
        window.open(cExplorer.url + '/xpub/' + xpub, '_blank');
    } else {
        const address = strAddress || wallet.getAddress();
        window.open(cExplorer.url + '/address/' + address, '_blank');
    }
}

async function loadImages() {
    const images = [
        ['mpw-main-logo', import('../assets/new_logo.png')],
        ['plus-icon2', import('../assets/icons/icon-plus.svg')],
        ['plus-icon3', import('../assets/icons/icon-plus.svg')],
        ['del-wallet-icon', import('../assets/icons/icon-bin.svg')],
        ['change-pwd-icon', import('../assets/icons/icon-key.svg')],
    ];

    const promises = images.map(([id, path]) =>
        (async () => {
            try {
                if ((await path).default.includes('<svg')) {
                    document.getElementById(id).innerHTML = (
                        await path
                    ).default;
                } else {
                    document.getElementById(id).src = (await path).default;
                }
            } catch (e) {}
        })()
    );
    await Promise.all(promises);
}

let audio = null;
export async function playMusic() {
    // On first play: load the audio into memory from the host
    if (audio === null) {
        // Dynamically load the file
        audio = new Audio((await import('../assets/music.mp3')).default);
    }

    // Play or Pause
    if (audio.paused || audio.ended) {
        audio.play();
        for (const domImg of document.getElementsByTagName('img'))
            domImg.classList.add('discoFilter');
    } else {
        audio.pause();
        for (const domImg of document.getElementsByTagName('img'))
            domImg.classList.remove('discoFilter');
    }
}

export function toClipboard(source, caller) {
    // Fetch the text/value source
    const domCopy = document.getElementById(source) || source;

    // Use an invisible textbox as the clipboard source
    const domClipboard = document.getElementById('clipboard');
    domClipboard.value = domCopy.value || domCopy.innerHTML || domCopy;
    domClipboard.select();
    domClipboard.setSelectionRange(0, 99999);

    // Browser-dependent clipboard execution
    if (!navigator.clipboard) {
        document.execCommand('copy');
    } else {
        navigator.clipboard.writeText(domCopy.innerHTML || domCopy);
    }

    // Display a temporary checkmark response
    caller.innerHTML = pIconCheck;
    caller.style.cursor = 'default';
    setTimeout(() => {
        caller.innerHTML = pIconCopy;
        caller.style.cursor = 'pointer';
    }, 1000);
}

export async function govVote(hash, voteCode) {
    if (
        (await confirmPopup({
            title: ALERTS.CONFIRM_POPUP_VOTE,
            html: ALERTS.CONFIRM_POPUP_VOTE_HTML,
        })) == true
    ) {
        const database = await Database.getInstance();
        const cMasternode = await database.getMasternode();
        if (cMasternode) {
            if ((await cMasternode.getStatus()) !== 'ENABLED') {
                createAlert('warning', ALERTS.MN_NOT_ENABLED, 6000);
                return;
            }
            const result = await cMasternode.vote(hash.toString(), voteCode); //1 yes 2 no
            if (result.includes('Voted successfully')) {
                //good vote
                cMasternode.storeVote(hash.toString(), voteCode);
                createAlert('success', ALERTS.VOTE_SUBMITTED, 6000);
            } else if (result.includes('Error voting :')) {
                //If you already voted return an alert
                createAlert('warning', ALERTS.VOTED_ALREADY, 6000);
            } else if (result.includes('Failure to verify signature.')) {
                //wrong masternode private key
                createAlert('warning', ALERTS.VOTE_SIG_BAD, 6000);
            } else {
                //this could be everything
                console.error(result);
                createAlert('warning', ALERTS.INTERNAL_ERROR, 6000);
            }
        } else {
            createAlert('warning', ALERTS.MN_ACCESS_BEFORE_VOTE, 6000);
        }
    }
}

export async function accessOrImportWallet() {
    // Hide and Reset the Vanity address input

    // Show Import button, hide access button
    doms.domImportWallet.style.display = 'block';
    setTimeout(() => {
        doms.domPrivKey.style.opacity = '1';
    }, 100);
    doms.domAccessWalletBtn.style.display = 'none';

    // If we have a local wallet, display the decryption prompt
    // This is no longer being used, as the user will be put in view-only
    // mode when logging in, however if the user locked the wallet before
    // #52 there would be no way to recover the public key without getting
    // The password from the user
    if (await hasEncryptedWallet()) {
        doms.domPrivKey.placeholder = translation.encryptPasswordFirst;
        doms.domImportWalletText.innerText = translation.unlockWallet;
        doms.domPrivKey.focus();
    }
}

/** Update the log out button to match the current wallet state */
export function updateLogOutButton() {
    doms.domLogOutContainer.style.display = wallet.isLoaded()
        ? 'block'
        : 'none';
}

/**
 * Sweep an address to our own wallet, spending all it's UTXOs without change
 * @param {Array<object>} arrUTXOs - The UTXOs belonging to the address to sweep
 * @param {import('./masterkey.js').LegacyMasterKey} sweepingMasterKey - The address to sweep from
 * @param {number} nFixedFee - An optional fixed satoshi fee
 * @returns {Promise<string|false>} - TXID on success, false or error on failure
 */
export async function sweepAddress(arrUTXOs, sweepingMasterKey, nFixedFee) {
    const txBuilder = TransactionBuilder.create().addUTXOs(arrUTXOs);

    const outputValue = txBuilder.valueIn - (nFixedFee || txBuilder.getFee());
    const [address] = wallet.getNewAddress(1);
    const tx = txBuilder
        .addOutput({
            address,
            value: outputValue,
        })
        .build();

    // Sign using the given Master Key, then broadcast the sweep, returning the TXID (or a failure)
    const sweepingWallet = new Wallet({ nAccount: 0 });
    sweepingWallet.setMasterKey({ mk: sweepingMasterKey });

    await sweepingWallet.sign(tx);
    return await getNetwork().sendTransaction(tx.serialize());
}

export function toggleDropDown(id) {
    const domID = document.getElementById(id);
    domID.style.display = domID.style.display === 'block' ? 'none' : 'block';
}

/**
 * Prompt the user in the GUI to unlock their wallet
 * @param {string} strReason - An optional reason for the unlock
 * @returns {Promise<boolean>} - If the unlock was successful or rejected
 */
export async function restoreWallet(strReason = '') {
    // TODO: This needs to be vueified quite a bit
    // This will be done after #225 since it's already
    // way bigger than I would have liked
    return await dashboard.restoreWallet(strReason);
}

export async function refreshChainData() {
    const cNet = getNetwork();
    // If in offline mode: don't sync ANY data or connect to the internet
    if (!cNet.enabled)
        return console.warn(
            'Offline mode active: For your security, the wallet will avoid ALL internet requests.'
        );

    // Fetch block count
    const newBlockCount = await cNet.getBlockCount();
    if (newBlockCount !== blockCount) {
        blockCount = newBlockCount;
        getEventEmitter().emit('new-block', blockCount);
    }
}

// A safety mechanism enabled if the user attempts to leave without encrypting/saving their keys
export const beforeUnloadListener = (evt) => {
    evt.preventDefault();
    // Disable Save your wallet warning on unload
    createAlert('warning', ALERTS.SAVE_WALLET_PLEASE, 10000);
    // Most browsers ignore this nowadays, but still, keep it 'just incase'
    return (evt.returnValue = translation.BACKUP_OR_ENCRYPT_WALLET);
};

/**
 * @typedef {Object} SettingsDOM - An object that contains the DOM elements for settings pages.
 * @property {HTMLElement} btn - The button to switch to this setting type.
 * @property {HTMLElement} section - The container for this setting type.
 */

/**
 * Returns a list of all pages and their DOM elements.
 *
 * This must be a function, since, the DOM elements are `undefined` until
 * after the startup sequence.
 *
 * Types are inferred.
 */
function getSettingsPages() {
    return {
        /** @type {SettingsDOM} */
        wallet: {
            btn: doms.domWalletSettingsBtn,
            section: doms.domWalletSettings,
        },
        /** @type {SettingsDOM} */
        display: {
            btn: doms.domDisplaySettingsBtn,
            section: doms.domDisplaySettings,
        },
    };
}

/**
 * Switch between screens in the settings menu
 * @param {string} page - The name of the setting page to switch to
 */
export function switchSettings(page) {
    const SETTINGS = getSettingsPages();
    const { btn, section } = SETTINGS[page];

    Object.values(SETTINGS).forEach(({ section, btn }) => {
        // Set the slider to the proper location
        if (page == 'display') {
            doms.domDisplayDecimalsSlider.oninput = function () {
                doms.domDisplayDecimalsSliderDisplay.innerHTML = this.value;
                //let val =  ((((doms.domDisplayDecimalsSlider.offsetWidth - 24) / 9) ) * parseInt(this.value));

                //doms.domDisplayDecimalsSliderDisplay.style.marginLeft = (val) + 'px';
            };

            // Triggers the input event
            setTimeout(
                () =>
                    doms.domDisplayDecimalsSlider.dispatchEvent(
                        new Event('input')
                    ),
                10
            );
        }
        // Hide all settings sections
        section.classList.add('d-none');
        // Make all buttons inactive
        btn.classList.remove('active');
    });

    // Show selected section and make its button active
    section.classList.remove('d-none');
    btn.classList.add('active');
}

function errorHandler(e) {
    const message = `${translation.unhandledException} <br> ${sanitizeHTML(
        e.message || e.reason
    )}`;
    try {
        createAlert('warning', message);
    } catch (_) {
        // Something as gone wrong, so we fall back to the default alert
        // This can happen on early errors for example
        alert(message);
    }
}

// This code is ran in the vanity gen worker as well!
// In which case, window would be not defined.
// `if (window)` wouldn't work either because
// window is not defined as opposed to undefined
try {
    window.addEventListener('error', errorHandler);
    window.addEventListener('unhandledrejection', errorHandler);
} catch (_) {}
