import { Mempool } from './mempool.js';
import Masternode from './masternode.js';
import { ALERTS, tr, start as i18nStart, translation } from './i18n.js';
import * as jdenticon from 'jdenticon';
import {
    wallet,
    hasEncryptedWallet,
    importWallet,
    decryptWallet,
    getNewAddress,
} from './wallet.js';
import { LegacyMasterKey } from './masterkey.js';
import { getNetwork, HistoricalTxType } from './network.js';
import {
    start as settingsStart,
    cExplorer,
    debug,
    cMarket,
    strCurrency,
    setColdStakingAddress,
    strColdStakingAddress,
    nDisplayDecimals,
    fAdvancedMode,
} from './settings.js';
import { createAndSendTransaction, signTransaction } from './transactions.js';
import {
    createAlert,
    confirmPopup,
    sanitizeHTML,
    MAP_B58,
    parseBIP21Request,
    isValidBech32,
    isBase64,
    sleep,
    beautifyNumber,
    isStandardAddress,
} from './misc.js';
import { cChainParams, COIN, MIN_PASS_LENGTH } from './chain_params.js';
import { decrypt } from './aes-gcm.js';

import { registerWorker } from './native.js';
import { refreshPriceDisplay } from './prices.js';
import { Address6 } from 'ip-address';
import { getEventEmitter } from './event_bus.js';
import { scanQRCode } from './scanner.js';
import { Database } from './database.js';
import bitjs from './bitTrx.js';
import { checkForUpgrades } from './changelog.js';
import { FlipDown } from './flipdown.js';
import { createApp } from 'vue';
import Activity from './Activity.vue';
import WalletBalance from './WalletBalance.vue';
import {
    cReceiveType,
    guiAddContactPrompt,
    guiCheckRecipientInput,
    guiToggleReceiveType,
} from './contacts-book.js';
import { Buffer } from 'buffer';
import { Account } from './accounts.js';

/** A flag showing if base MPW is fully loaded or not */
export let fIsLoaded = false;

/** A getter for the flag showing if base MPW is fully loaded or not */
export function isLoaded() {
    return fIsLoaded;
}

export let doms = {};
export const mempool = new Mempool();

// For now we'll import the component as a vue app by itself. Later, when the
// dashboard is rewritten in vue, we can simply add <Activity /> to the dashboard component template.
export const activityDashboard = createApp(Activity, {
    title: 'Activity',
    rewards: false,
}).mount('#activityDashboard');

export const stakingDashboard = createApp(Activity, {
    title: 'Reward History',
    rewards: true,
}).mount('#stakeActivity');

export const walletBalance = createApp(WalletBalance).mount('#walletBalance');

export async function start() {
    doms = {
        domNavbarToggler: document.getElementById('navbarToggler'),
        domDashboard: document.getElementById('dashboard'),
        domGuiWallet: document.getElementById('guiWallet'),
        domGettingStartedBtn: document.getElementById('gettingStartedBtn'),
        domGuiStakingValue: document.getElementById('guiStakingValue'),
        domGuiStakingValueCurrency: document.getElementById(
            'guiStakingValueCurrency'
        ),
        domBalanceReloadStaking: document.getElementById(
            'balanceReloadStaking'
        ),
        domGuiBalanceStaking: document.getElementById('guiBalanceStaking'),
        domGuiBalanceStakingTicker: document.getElementById(
            'guiBalanceStakingTicker'
        ),
        domStakeAmount: document.getElementById('delegateAmount'),
        domUnstakeAmount: document.getElementById('undelegateAmount'),
        domStakeTab: document.getElementById('stakeTab'),
        domAddress1s: document.getElementById('address1s'),
        domSendAmountCoins: document.getElementById('sendAmountCoins'),
        domSendAmountCoinsTicker: document.getElementById(
            'sendAmountCoinsTicker'
        ),
        domSendAmountValue: document.getElementById('sendAmountValue'),
        domSendAmountValueCurrency: document.getElementById(
            'sendAmountValueCurrency'
        ),
        domStakeAmountCoinsTicker: document.getElementById(
            'stakeAmountCoinsTicker'
        ),
        domStakeAmountValueCurrency: document.getElementById(
            'stakeAmountValueCurrency'
        ),
        domStakeAmountValue: document.getElementById('stakeAmountValue'),
        domUnstakeAmountCoinsTicker: document.getElementById(
            'unstakeAmountCoinsTicker'
        ),
        domUnstakeAmountValueCurrency: document.getElementById(
            'unstakeAmountValueCurrency'
        ),

        domUnstakeAmountValue: document.getElementById('unstakeAmountValue'),
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
        domPrefix: document.getElementById('prefix'),
        domPrefixNetwork: document.getElementById('prefixNetwork'),
        domWalletToggle: document.getElementById('wToggle'),
        domGenerateWallet: document.getElementById('generateWallet'),
        domGenVanityWallet: document.getElementById('generateVanityWallet'),
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

        domAccessWallet: document.getElementById('accessWallet'),
        domImportWallet: document.getElementById('importWallet'),
        domImportWalletText: document.getElementById('importWalletText'),
        domAccessWalletBtn: document.getElementById('accessWalletBtn'),
        domVanityUiButtonTxt: document.getElementById('vanButtonText'),
        domGenKeyWarning: document.getElementById('genKeyWarning'),
        domEncryptWalletLabel: document.getElementById('encryptWalletLabel'),
        domEncryptPasswordCurrent: document.getElementById(
            'changePassword-current'
        ),
        domEncryptPasswordFirst: document.getElementById('newPassword'),
        domEncryptPasswordSecond: document.getElementById('newPasswordRetype'),
        domGenIt: document.getElementById('genIt'),
        domReqDesc: document.getElementById('reqDesc'),
        domReqDisplay: document.getElementById('reqDescDisplay'),
        domIdenticon: document.getElementById('identicon'),
        domPrivKey: document.getElementById('privateKey'),
        domPrivKeyPassword: document.getElementById('privateKeyPassword'),
        domAvailToDelegate: document.getElementById('availToDelegate'),
        domAvailToUndelegate: document.getElementById('availToUndelegate'),
        domAnalyticsDescriptor: document.getElementById('analyticsDescriptor'),
        domMnemonicModalContent: document.getElementById(
            'ModalMnemonicContent'
        ),
        domMnemonicModalButton: document.getElementById(
            'modalMnemonicConfirmButton'
        ),
        domMnemonicModalPassphrase: document.getElementById(
            'ModalMnemonicPassphrase'
        ),
        domExportPrivateKey: document.getElementById('exportPrivateKeyText'),
        domWipeWallet: document.getElementById('guiWipeWallet'),
        domRestoreWallet: document.getElementById('guiRestoreWallet'),
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
            'Access the masternode linked to this address<br> Note: the masternode MUST have been already created (however it can be online or offline)<br>  If you want to create a new masternode access with a HD wallet',
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
    };

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

    // Register Input Pair events
    doms.domSendAmountCoins.oninput = () => {
        updateAmountInputPair(
            doms.domSendAmountCoins,
            doms.domSendAmountValue,
            true
        );
    };
    doms.domSendAmountValue.oninput = () => {
        updateAmountInputPair(
            doms.domSendAmountCoins,
            doms.domSendAmountValue,
            false
        );
    };

    /** Staking (Stake) */
    doms.domStakeAmount.oninput = () => {
        updateAmountInputPair(
            doms.domStakeAmount,
            doms.domStakeAmountValue,
            true
        );
    };
    doms.domStakeAmountValue.oninput = () => {
        updateAmountInputPair(
            doms.domStakeAmount,
            doms.domStakeAmountValue,
            false
        );
    };

    /** Staking (Unstake) */
    doms.domUnstakeAmount.oninput = () => {
        updateAmountInputPair(
            doms.domUnstakeAmount,
            doms.domUnstakeAmountValue,
            true
        );
    };
    doms.domUnstakeAmountValue.oninput = () => {
        updateAmountInputPair(
            doms.domUnstakeAmount,
            doms.domUnstakeAmountValue,
            false
        );
    };

    // Register native app service
    registerWorker();

    // Configure Identicon
    jdenticon.configure();

    // URL-Query request processing
    const urlParams = new URLSearchParams(window.location.search);

    // Check for a payment request address
    const reqTo = urlParams.has('pay') ? urlParams.get('pay') : '';

    // Check for a payment request amount
    const reqAmount = urlParams.has('amount')
        ? parseFloat(urlParams.get('amount'))
        : 0;
    await settingsStart();

    // Customise the UI if a saved wallet exists
    if (await hasEncryptedWallet()) {
        // Hide the 'Generate wallet' buttons
        doms.domGenerateWallet.style.display = 'none';
        doms.domGenVanityWallet.style.display = 'none';
        const database = await Database.getInstance();
        const { publicKey } = await database.getAccount();

        // Import the wallet, and toggle the startup flag, which delegates the chain data refresh to settingsStart();
        if (publicKey) {
            await importWallet({ newWif: publicKey, fStartup: true });

            // Update the "Receive" UI to apply Translation and Contacts updates
            await guiToggleReceiveType(cReceiveType);

            // Check for Add Contact calls
            if (urlParams.has('addcontact')) {
                // Quick sanity check
                const strURI = urlParams.get('addcontact');
                if (strURI.includes(':')) {
                    // Split to 'name' and 'pubkey'
                    const arrParts = strURI.split(':');

                    // Convert Name from HEX to UTF-8
                    const strName = Buffer.from(arrParts[0], 'hex').toString(
                        'utf8'
                    );
                    const strPubkey = arrParts[1];

                    // Prompt the user to add the Contact
                    guiAddContactPrompt(sanitizeHTML(strName), strPubkey);
                }
            } else if (reqTo.length || reqAmount > 0) {
                // Payment processor popup
                guiPreparePayment(
                    reqTo,
                    reqAmount,
                    urlParams.has('desc') ? urlParams.get('desc') : ''
                );
            }
        } else {
            // Display the password unlock upfront
            await accessOrImportWallet();
        }
    } else {
        // Just load the block count, for use in non-wallet areas
        getNetwork().getBlockCount();
    }

    subscribeToNetworkEvents();

    doms.domPrefix.value = '';
    doms.domPrefixNetwork.innerText =
        cChainParams.current.PUBKEY_PREFIX.join(' or ');
    // If allowed by settings: submit a simple 'hit' (app load) to Labs Analytics
    getNetwork().submitAnalytics('hit');
    setInterval(() => {
        // Refresh blockchain data
        refreshChainData();

        // Fetch the PIVX prices
        refreshPriceDisplay();
    }, 15000);

    // After reaching here; we know MPW's base is fully loaded!
    fIsLoaded = true;

    // Check for recent upgrades, display the changelog
    checkForUpgrades();

    // If we haven't already (due to having no wallet, etc), display the Dashboard
    doms.domDashboard.click();

    // Update the Encryption UI (If the user has a wallet, then it changes to "Change Password" rather than "Encrypt Wallet")
    await updateEncryptionGUI();
}

function subscribeToNetworkEvents() {
    getEventEmitter().on('network-toggle', (value) => {
        doms.domNetwork.innerHTML =
            '<i class="fa-solid fa-' + (value ? 'wifi' : 'ban') + '"></i>';
    });

    getEventEmitter().on('sync-status', (value) => {
        switch (value) {
            case 'start':
                doms.domBalanceReloadStaking.classList.add('playAnim');
                break;
            case 'stop':
                doms.domBalanceReloadStaking.classList.remove('playAnim');
                break;
        }
    });

    getEventEmitter().on('new-block', (block, oldBlock) => {
        console.log(`New block detected! ${oldBlock} --> ${block}`);
        // Fetch latest Activity
        activityDashboard.update(true);
        stakingDashboard.update(true);

        // If it's open: update the Governance Dashboard
        if (doms.domGovTab.classList.contains('active')) {
            updateGovernanceTab();
        }
    });

    getEventEmitter().on('transaction-sent', (success, result) => {
        if (success) {
            doms.domAddress1s.value = '';
            doms.domSendAmountCoins.innerHTML = '';
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

// WALLET STATE DATA

let exportHidden = false;
let isTestnetLastState = cChainParams.current.isTestnet;

/**
 * @type {FlipDown | null}
 */
let governanceFlipdown = null;

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

    if (tabName === 'Governance') {
        updateGovernanceTab();
    } else if (tabName === 'Masternode') {
        updateMasternodeTab();
    } else if (
        tabName === 'StakingTab' &&
        stakingDashboard.getTxCount() === 0
    ) {
        // Refresh the TX list
        stakingDashboard.update(false);
    } else if (
        tabName === 'keypair' &&
        getNetwork().arrTxHistory.length === 0
    ) {
        // Refresh the TX list
        activityDashboard.update(false);
    }
}

/**
 * Updates the GUI ticker among all elements; useful for Network Switching
 */
export function updateTicker() {
    // Update the Stake Dashboard currency
    doms.domGuiStakingValueCurrency.innerText = strCurrency.toUpperCase();

    // Update the Send menu ticker and currency
    doms.domSendAmountValueCurrency.innerText = strCurrency.toUpperCase();
    doms.domSendAmountCoinsTicker.innerText = cChainParams.current.TICKER;

    // Update the Stake/Unstake menu ticker and currency
    // Stake
    doms.domStakeAmountValueCurrency.innerText = strCurrency.toUpperCase();
    doms.domStakeAmountCoinsTicker.innerText = cChainParams.current.TICKER;

    // Unstake
    doms.domUnstakeAmountValueCurrency.innerText = strCurrency.toUpperCase();
    doms.domUnstakeAmountCoinsTicker.innerText = cChainParams.current.TICKER;
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
 * Update a 'price value' DOM display for the given balance type
 * @param {HTMLElement} domValue
 * @param {boolean} fCold
 */
export async function updatePriceDisplay(domValue, fCold = false) {
    // Update currency values
    const nPrice = await cMarket.getPrice(strCurrency);

    if (nPrice) {
        // Calculate the value
        const nCurrencyValue =
            ((fCold ? getStakingBalance() : getBalance()) / COIN) * nPrice;

        const { nValue, cLocale } = optimiseCurrencyLocale(nCurrencyValue);

        // Update the DOM
        domValue.innerText = nValue.toLocaleString('en-gb', cLocale);
    }
}

export function getBalance(updateGUI = false) {
    const nBalance = mempool.getBalance();
    const nCoins = nBalance / COIN;

    // Update the GUI too, if chosen
    if (updateGUI) {
        // Set the balance, and adjust font-size for large balance strings
        const strBal = nCoins.toFixed(nDisplayDecimals);
        doms.domAvailToDelegate.innerHTML =
            beautifyNumber(strBal) + ' ' + cChainParams.current.TICKER;

        // Update tickers
        updateTicker();
    }

    return nBalance;
}

export function getStakingBalance(updateGUI = false) {
    const nBalance = mempool.getDelegatedBalance();
    const nCoins = nBalance / COIN;

    if (updateGUI) {
        // Set the balance, and adjust font-size for large balance strings
        const strBal = nCoins.toFixed(nDisplayDecimals);
        const nLen = strBal.length;
        doms.domGuiBalanceStaking.innerHTML = beautifyNumber(
            strBal,
            nLen >= 10 ? '17px' : '25px'
        );
        doms.domAvailToUndelegate.innerHTML =
            beautifyNumber(strBal) + ' ' + cChainParams.current.TICKER;

        // Update tickers
        updateTicker();

        // Update price displays
        updatePriceDisplay(doms.domGuiStakingValue, true);
    }

    return nBalance;
}

/**
 * Fill a 'Coin Amount' with all of a balance type, and update the 'Coin Value'
 * @param {HTMLInputElement} domCoin - The 'Coin Amount' input element
 * @param {HTMLInputElement} domValue - Th 'Coin Value' input element
 * @param {boolean} fCold - Use the Cold Staking balance, or Available balance
 */
export function selectMaxBalance(domCoin, domValue, fCold = false) {
    domCoin.value = (fCold ? getStakingBalance() : getBalance()) / COIN;
    // Update the Send menu's value (assumption: if it's not a Cold balance, it's probably for Sending!)
    updateAmountInputPair(domCoin, domValue, true);
}

/**
 * Prompt a QR scan for a Payment (Address or BIP21)
 */
export async function openSendQRScanner() {
    const cScan = await scanQRCode();

    if (!cScan || !cScan.data) return;

    /* Check what data the scan contains - for the various QR request types */

    // Plain address (Length and prefix matches)
    if (isStandardAddress(cScan.data)) {
        return guiPreparePayment(cScan.data);
    }

    // Shield address (Valid bech32 string)
    if (isValidBech32(cScan.data).valid) {
        return guiPreparePayment(cScan.data);
    }

    // BIP21 Payment Request (Optional 'amount' and 'label')
    const cBIP21Req = parseBIP21Request(cScan.data);
    if (cBIP21Req) {
        return guiPreparePayment(
            cBIP21Req.address,
            cBIP21Req.options.amount || 0,
            cBIP21Req.options.label || ''
        );
    }

    // MPW Contact Request URI
    if (cScan.data.includes('addcontact=')) {
        // Parse as URL Params
        const cURL = new URL(cScan.data);
        const urlParams = new URLSearchParams(cURL.search);
        const strURI = urlParams.get('addcontact');

        // Sanity check the URI
        if (strURI?.includes(':')) {
            // Split to 'name' and 'pubkey'
            const arrParts = strURI.split(':');

            // If the wallet is encrypted, prompt the user to (optionally) add the Contact, before the Tx
            const fUseName = (await hasEncryptedWallet())
                ? await guiAddContactPrompt(
                      sanitizeHTML(arrParts[0]),
                      arrParts[1],
                      false
                  )
                : false;

            // Prompt for payment
            return guiPreparePayment(fUseName ? arrParts[0] : arrParts[1]);
        }
    }

    // No idea what this is...
    createAlert(
        'warning',
        `"${sanitizeHTML(
            cScan.data.substring(0, Math.min(cScan.data.length, 6))
        )}…" ${ALERTS.QR_SCANNER_BAD_RECEIVER}`,
        7500
    );
}

/**
 * Open the Explorer in a new tab for the current wallet, or a specific address
 * @param {string?} strAddress - Optional address to open, if void, the master key is used
 */
export async function openExplorer(strAddress = '') {
    if (wallet.isLoaded() && wallet.isHD() && !strAddress) {
        const xpub = await wallet.getXPub();
        window.open(cExplorer.url + '/xpub/' + xpub, '_blank');
    } else {
        const address = strAddress || (await wallet.getAddress());
        window.open(cExplorer.url + '/address/' + address, '_blank');
    }
}

async function loadImages() {
    const images = [
        ['mpw-main-logo', import('../assets/logo.png')],
        ['privateKeyImage', import('../assets/key.png')],
    ];

    const promises = images.map(([id, path]) =>
        (async () => {
            document.getElementById(id).src = (await path).default;
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

export function unblurPrivKey() {
    if (
        document
            .getElementById('exportPrivateKeyText')
            .classList.contains('blurred')
    ) {
        document
            .getElementById('exportPrivateKeyText')
            .classList.remove('blurred');
    } else {
        document
            .getElementById('exportPrivateKeyText')
            .classList.add('blurred');
    }
}

export function toggleBottomMenu(dom, ani) {
    let element = document.getElementById(dom);
    if (element.classList.contains(ani)) {
        element.classList.remove(ani);
        doms.domBlackBack.classList.remove('d-none');
        setTimeout(() => {
            doms.domBlackBack.classList.remove('blackBackHide');
        }, 10);
    } else {
        element.classList.add(ani);
        doms.domBlackBack.classList.add('blackBackHide');
        setTimeout(() => {
            doms.domBlackBack.classList.add('d-none');
        }, 150);
    }
}

/**
 * Updates an Amount Input UI pair ('Coin' and 'Value' input boxes) in relation to the input box used
 * @param {HTMLInputElement} domCoin - The DOM input for the Coin amount
 * @param {HTMLInputElement} domValue - The DOM input for the Value amount
 * @param {boolean} fCoinEdited - `true` if Coin, `false` if Value
 */
export async function updateAmountInputPair(domCoin, domValue, fCoinEdited) {
    // Fetch the price in the user's preferred currency
    const nPrice = await cMarket.getPrice(strCurrency);

    // If there is no price loaded, then we just won't do anything
    if (!nPrice) return;

    if (fCoinEdited) {
        // If the 'Coin' input is edited, then update the 'Value' input with it's converted currency
        const nValue = Number(domCoin.value) * nPrice;
        domValue.value = nValue <= 0 ? '' : nValue;
    } else {
        // If the 'Value' input is edited, then update the 'Coin' input with the reversed conversion rate
        const nValue = Number(domValue.value) / nPrice;
        domCoin.value = nValue <= 0 ? '' : nValue;
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
    caller.classList.add('fa-check');
    caller.classList.remove('fa-clipboard');
    caller.style.cursor = 'default';
    setTimeout(() => {
        caller.classList.add('fa-clipboard');
        caller.classList.remove('fa-check');
        caller.style.cursor = 'pointer';
    }, 1000);
}

/**
 * Prompt for a payment in the GUI with pre-filled inputs
 * @param {string} strTo - The address receiving the payment
 * @param {number} nAmount - The payment amount in full coins
 * @param {string} strDesc - The payment message or description
 */
export function guiPreparePayment(strTo = '', nAmount = 0, strDesc = '') {
    // Apply values
    doms.domAddress1s.value = strTo;
    doms.domSendAmountCoins.value = nAmount;
    doms.domReqDesc.value = strDesc;
    doms.domReqDisplay.style.display = strDesc ? 'block' : 'none';

    // Switch to the Dashboard
    doms.domDashboard.click();

    // Open the Send menu, if not already open (with a small timeout post-load to allow for CSS loading)
    if (
        document
            .getElementById('transferMenu')
            .classList.contains('transferAnimation')
    ) {
        setTimeout(() => {
            toggleBottomMenu('transferMenu', 'transferAnimation');
        }, 300);
    }

    // Update the conversion value
    updateAmountInputPair(
        doms.domSendAmountCoins,
        doms.domSendAmountValue,
        true
    );

    // Run the Input Validity checker
    guiCheckRecipientInput({ target: doms.domAddress1s });

    // Focus on the coin input box (if no pre-fill was specified)
    if (nAmount <= 0) {
        doms.domSendAmountCoins.focus();
    }
}

/**
 * Set the "Wallet Options" menu visibility
 * @param {String} strDisplayCSS - The `display` CSS option to set the Wallet Options to
 */
export function setDisplayForAllWalletOptions(strDisplayCSS) {
    // Set the display and Reset the Vanity address input
    doms.domPrefix.value = '';
    doms.domPrefix.style.display = strDisplayCSS;

    // Set all "*Wallet" buttons
    doms.domGenerateWallet.style.display = strDisplayCSS;
    doms.domImportWallet.style.display = strDisplayCSS;
    doms.domGenVanityWallet.style.display = strDisplayCSS;
    doms.domAccessWallet.style.display = strDisplayCSS;
    doms.domGenHardwareWallet.style.display = strDisplayCSS;
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
                await updateGovernanceTab();
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

/**
 * Start a Masternode via a signed network broadcast
 * @param {boolean} fRestart - Whether this is a Restart or a first Start
 */
export async function startMasternode(fRestart = false) {
    const database = await Database.getInstance();
    const cMasternode = await database.getMasternode(wallet.getMasterKey());
    if (cMasternode) {
        if (
            wallet.isViewOnly() &&
            !(await restoreWallet(translation.walletUnlockMNStart))
        )
            return;
        if (await cMasternode.start()) {
            const strMsg = fRestart ? ALERTS.MN_RESTARTED : ALERTS.MN_STARTED;
            createAlert('success', strMsg, 4000);
        } else {
            const strMsg = fRestart
                ? ALERTS.MN_RESTART_FAILED
                : ALERTS.MN_START_FAILED;
            createAlert('warning', strMsg, 4000);
        }
    }
}

export async function destroyMasternode() {
    const database = await Database.getInstance();

    if (await database.getMasternode(wallet.getMasterKey())) {
        database.removeMasternode(wallet.getMasterKey());
        createAlert('success', ALERTS.MN_DESTROYED, 5000);
        updateMasternodeTab();
    }
}

/**
 * Takes an ip address and adds the port.
 * If it's a tor address, ip.onion:port will be used (e.g. expyuzz4wqqyqhjn.onion:12345)
 * If it's an IPv4 address, ip:port will be used, (e.g. 127.0.0.1:12345)
 * If it's an IPv6 address, [ip]:port will be used, (e.g. [::1]:12345)
 * @param {String} ip - Ip address with or without port
 * @returns {String}
 */
function parseIpAddress(ip) {
    // IPv4 or tor without port
    if (ip.match(/\d+\.\d+\.\d+\.\d+/) || ip.match(/\w+\.onion/)) {
        return `${ip}:${cChainParams.current.MASTERNODE_PORT}`;
    }

    // IPv4 or tor with port
    if (ip.match(/\d+\.\d+\.\d+\.\d+:\d+/) || ip.match(/\w+\.onion:\d+/)) {
        return ip;
    }

    // IPv6 without port
    if (Address6.isValid(ip)) {
        return `[${ip}]:${cChainParams.current.MASTERNODE_PORT}`;
    }

    const groups = /\[(.*)\]:\d+/.exec(ip);
    if (groups !== null && groups.length > 1) {
        // IPv6 with port
        if (Address6.isValid(groups[1])) {
            return ip;
        }
    }

    // If we haven't returned yet, the address was invalid.
    return null;
}

export async function importMasternode() {
    const mnPrivKey = doms.domMnPrivateKey.value;
    const address = parseIpAddress(doms.domMnIP.value);
    if (!address) {
        createAlert('warning', ALERTS.MN_BAD_IP, 5000);
        return;
    }

    let collateralTxId;
    let outidx;
    let collateralPrivKeyPath;
    doms.domMnIP.value = '';
    doms.domMnPrivateKey.value = '';

    if (!wallet.isHD()) {
        // Find the first UTXO matching the expected collateral size
        const cCollaUTXO = mempool
            .getConfirmed()
            .find(
                (cUTXO) => cUTXO.sats === cChainParams.current.collateralInSats
            );

        // If there's no valid UTXO, exit with a contextual message
        if (!cCollaUTXO) {
            if (getBalance(false) < cChainParams.current.collateralInSats) {
                // Not enough balance to create an MN UTXO
                const amount =
                    (cChainParams.current.collateralInSats -
                        getBalance(false)) /
                    COIN;
                const ticker = cChainParams.current.TICKER;
                createAlert(
                    'warning',
                    tr(ALERTS.MN_NOT_ENOUGH_COLLAT, [
                        { amount: amount },
                        { ticker: ticker },
                    ]),
                    10000
                );
            } else {
                // Balance is capable of a masternode, just needs to be created
                // TODO: this UX flow is weird, is it even possible? perhaps we can re-design this entire function accordingly
                const amount = cChainParams.current.collateralInSats / COIN;
                const ticker = cChainParams.current.TICKER;
                createAlert(
                    'warning',
                    tr(ALERTS.MN_ENOUGH_BUT_NO_COLLAT, [
                        { amount },
                        { ticker },
                    ]),
                    10000
                );
            }
            return;
        }

        collateralTxId = cCollaUTXO.id;
        outidx = cCollaUTXO.vout;
        collateralPrivKeyPath = 'legacy';
    } else {
        const path = doms.domMnTxId.value;
        const masterUtxo = mempool
            .getConfirmed()
            .findLast((u) => u.path === path); // first UTXO for each address in HD
        // sanity check:
        if (masterUtxo.sats !== cChainParams.current.collateralInSats) {
            return createAlert('warning', ALERTS.MN_COLLAT_NOT_SUITABLE, 10000);
        }
        collateralTxId = masterUtxo.id;
        outidx = masterUtxo.vout;
        collateralPrivKeyPath = path;
    }
    doms.domMnTxId.value = '';

    const cMasternode = new Masternode({
        walletPrivateKeyPath: collateralPrivKeyPath,
        mnPrivateKey: mnPrivKey,
        collateralTxId: collateralTxId,
        outidx: outidx,
        addr: address,
    });
    await refreshMasternodeData(cMasternode, true);
    await updateMasternodeTab();
}

export async function accessOrImportWallet() {
    // Hide and Reset the Vanity address input
    doms.domPrefix.value = '';
    doms.domPrefix.style.display = 'none';

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
/**
 * An event function triggered apon private key UI input changes
 *
 * Useful for adjusting the input types or displaying password prompts depending on the import scheme
 */
export async function guiUpdateImportInput() {
    if (await hasEncryptedWallet()) return;
    // Check whether the string is Base64 (would likely be an MPW-encrypted import)
    // and it doesn't have any spaces (would be a mnemonic seed)
    const fContainsSpaces = doms.domPrivKey.value.trim().includes(' ');

    // If this could require a Seed Passphrase (BIP39 Passphrase) and Advanced Mode is enabled
    // ...or if this is an Encrypted Import (Encrypted Base64 MPW key)
    const fBIP39Passphrase = fContainsSpaces && fAdvancedMode;
    doms.domPrivKeyPassword.hidden =
        (doms.domPrivKey.value.length < 128 ||
            !isBase64(doms.domPrivKey.value)) &&
        !fBIP39Passphrase;

    doms.domPrivKeyPassword.placeholder = fContainsSpaces
        ? translation.optionalPassphrase
        : translation.password;

    // If the "Import Password/Passphrase" is hidden, we'll also wipe it's input, in the
    // ... edge-case that a passphrase was entered, then the import key had changed.
    if (doms.domPrivKeyPassword.hidden) doms.domPrivKeyPassword.value = '';

    // Uncloak the private input IF spaces are detected, to make Seed Phrases easier to input and verify
    doms.domPrivKey.setAttribute('type', fContainsSpaces ? 'text' : 'password');
}

/**
 * Imports a wallet using the GUI input, handling decryption via UI
 */
export async function guiImportWallet() {
    // Important: These fields will be wiped by importWallet();
    const strPrivKey = doms.domPrivKey.value;
    const strPassword = doms.domPrivKeyPassword.value;
    const fEncrypted = strPrivKey.length >= 128 && isBase64(strPrivKey);

    // If we are in testnet: prompt an import
    if (cChainParams.current.isTestnet) return importWallet();

    // If we don't have a DB wallet and the input is plain: prompt an import
    if (!(await hasEncryptedWallet()) && !fEncrypted) return importWallet();

    // If we don't have a DB wallet and the input is ciphered:
    if (!(await hasEncryptedWallet()) && fEncrypted) {
        const strDecWIF = await decrypt(strPrivKey, strPassword);
        if (!strDecWIF || strDecWIF === 'decryption failed!') {
            return createAlert('warning', ALERTS.FAILED_TO_IMPORT, 6000);
        } else {
            await importWallet({
                newWif: strDecWIF,
                // Save the public key to disk for future View Only mode post-decryption
                fSavePublicKey: true,
            });

            if (wallet.isLoaded()) {
                // Prepare a new Account to add
                const cAccount = new Account({
                    publicKey: await wallet.getKeyToExport(),
                    encWif: strPrivKey,
                });

                // Add the new Account to the DB
                const database = await Database.getInstance();
                database.addAccount(cAccount);
            }

            // Destroy residue import data
            doms.domPrivKey.value = '';
            doms.domPrivKeyPassword.value = '';
            return;
        }
    }
    // Prompt for decryption of the existing wallet
    const fHasWallet = await decryptWallet(doms.domPrivKey.value);

    // If the wallet was successfully loaded, hide all options and load the dash!
    if (fHasWallet) setDisplayForAllWalletOptions('none');
}

export async function guiEncryptWallet() {
    // Fetch our inputs, ensure they're of decent entropy + match eachother
    const strPass = doms.domEncryptPasswordFirst.value,
        strPassRetype = doms.domEncryptPasswordSecond.value;
    if (strPass.length < MIN_PASS_LENGTH)
        return createAlert(
            'warning',
            tr(ALERTS.PASSWORD_TOO_SMALL, [
                { MIN_PASS_LENGTH: MIN_PASS_LENGTH },
            ]),
            4000
        );
    if (strPass !== strPassRetype)
        return createAlert('warning', ALERTS.PASSWORD_DOESNT_MATCH, 2250);

    // If this wallet is already encrypted, then we'll check for the current password and ensure it decrypts properly too
    if (await hasEncryptedWallet()) {
        // Grab the pass, and wipe the dialog immediately
        const strCurrentPass = doms.domEncryptPasswordCurrent.value;
        doms.domEncryptPasswordCurrent.value = '';

        // If the decryption fails: we don't allow changing the password
        if (!(await decryptWallet(strCurrentPass))) return;
    }

    // Encrypt the wallet using the new password
    await wallet.encryptWallet(strPass);
    createAlert('success', ALERTS.NEW_PASSWORD_SUCCESS, 5500);

    // Hide and reset the encryption modal
    $('#encryptWalletModal').modal('hide');
    doms.domEncryptPasswordFirst.value = '';
    doms.domEncryptPasswordSecond.value = '';

    // Display the 'Unlock/Lock Wallet' buttons accordingly based on state
    doms.domWipeWallet.hidden = wallet.isViewOnly();
    doms.domRestoreWallet.hidden = !wallet.isViewOnly();

    // Update the encryption UI (changes to "Change Password" now)
    await updateEncryptionGUI(true);
}

/** Update the "Encrypt Wallet" / "Change Password" dialog to match the current wallet state */
export async function updateEncryptionGUI(fEncrypted = null) {
    // If no param is provided, check if a wallet exists in the database
    if (fEncrypted === null) {
        fEncrypted = await hasEncryptedWallet();
    }
    // If the wallet is encrypted, we display a "Current Password" input in the Encryption dialog, otherwise, only accept New Passwords
    doms.domEncryptPasswordCurrent.style.display = fEncrypted ? '' : 'none';
    // And we adjust the displays to accomodate the mode as well
    doms.domEncryptWalletLabel.innerText = fEncrypted
        ? translation.changePassword
        : translation.encryptWallet;
    doms.domChangePasswordContainer.style.display = fEncrypted ? '' : 'none';
}

export async function toggleExportUI() {
    if (!exportHidden) {
        if (await hasEncryptedWallet()) {
            const { encWif } = await (
                await Database.getInstance()
            ).getAccount();
            doms.domExportPrivateKey.innerHTML = encWif;
            exportHidden = true;
        } else {
            if (wallet.isViewOnly()) {
                exportHidden = false;
            } else {
                doms.domExportPrivateKey.innerHTML =
                    wallet.getMasterKey().keyToBackup;
                exportHidden = true;
            }
        }
    } else {
        doms.domExportPrivateKey.innerHTML = '';
        exportHidden = false;
    }
}

export function checkVanity() {
    var e = event || window.event; // get event object
    var key = e.keyCode || e.which; // get key cross-browser
    var char = String.fromCharCode(key).trim(); // convert key to char
    if (char.length == 0) return;

    // Ensure the input is base58 compatible
    if (!MAP_B58.toLowerCase().includes(char.toLowerCase())) {
        if (e.preventDefault) e.preventDefault();
        e.returnValue = false;
        return createAlert(
            'warning',
            tr(ALERTS.UNSUPPORTED_CHARACTER, [{ char: char }]),
            3500
        );
    }
}

let isVanityGenerating = false;
const arrWorkers = [];
let vanUiUpdater;

function stopSearch() {
    isVanityGenerating = false;
    for (let thread of arrWorkers) {
        thread.terminate();
    }
    while (arrWorkers.length) arrWorkers.pop();
    doms.domPrefix.disabled = false;
    doms.domVanityUiButtonTxt.innerText = translation.dCardTwoButton;
    clearInterval(vanUiUpdater);
}

export async function generateVanityWallet() {
    if (isVanityGenerating) return stopSearch();
    if (typeof Worker === 'undefined')
        return createAlert('error', ALERTS.UNSUPPORTED_WEBWORKERS, 7500);
    // Generate a vanity address with the given prefix
    if (
        doms.domPrefix.value.length === 0 ||
        doms.domPrefix.style.display === 'none'
    ) {
        // No prefix, display the intro!
        doms.domPrefix.style.display = 'block';
        setTimeout(() => {
            doms.domPrefix.style.opacity = '1';
        }, 100);
        doms.domPrefix.focus();
    } else {
        // Remove spaces from prefix
        doms.domPrefix.value = doms.domPrefix.value.replace(/ /g, '');

        // Cache a lowercase equivilent for lower-entropy comparisons (a case-insensitive search is ALOT faster!) and strip accidental spaces
        const nInsensitivePrefix = doms.domPrefix.value.toLowerCase();
        const nPrefixLen = nInsensitivePrefix.length;

        // Ensure the input is base58 compatible
        for (const char of doms.domPrefix.value) {
            if (!MAP_B58.toLowerCase().includes(char.toLowerCase()))
                return createAlert(
                    'warning',
                    tr(ALERTS.UNSUPPORTED_CHARACTER, [{ char: char }]),
                    3500
                );
            // We also don't want users to be mining addresses for years... so cap the letters to four until the generator is more optimized
            if (doms.domPrefix.value.length > 5)
                return createAlert(
                    'warning',
                    tr(ALERTS.UNSUPPORTED_CHARACTER, [{ char: char }]),
                    3500
                );
        }
        isVanityGenerating = true;
        doms.domPrefix.disabled = true;
        let attempts = 0;

        // Setup workers
        const nThreads = Math.max(
            Math.floor(window.navigator.hardwareConcurrency * 0.75),
            1
        );
        console.log('Spawning ' + nThreads + ' vanity search threads!');
        while (arrWorkers.length < nThreads) {
            arrWorkers.push(
                new Worker(new URL('./vanitygen_worker.js', import.meta.url))
            );
            const checkResult = (data) => {
                attempts++;
                if (
                    data.pub.substr(1, nPrefixLen).toLowerCase() ==
                    nInsensitivePrefix
                ) {
                    importWallet({
                        newWif: data.priv,
                        fRaw: true,
                    });
                    stopSearch();
                    return console.log(
                        'VANITY: Found an address after ' +
                            attempts +
                            ' attempts!'
                    );
                }
            };

            arrWorkers[arrWorkers.length - 1].onmessage = (event) =>
                checkResult(event.data);
            arrWorkers[arrWorkers.length - 1].postMessage(
                cChainParams.current.PUBKEY_ADDRESS
            );
        }

        // GUI Updater
        doms.domVanityUiButtonTxt.innerText =
            'Stop (Searched ' + attempts.toLocaleString('en-GB') + ' keys)';
        vanUiUpdater = setInterval(() => {
            doms.domVanityUiButtonTxt.innerText =
                'Stop (Searched ' + attempts.toLocaleString('en-GB') + ' keys)';
        }, 200);
    }
}

/**
 * Sweep an address to our own wallet, spending all it's UTXOs without change
 * @param {Array<object>} arrUTXOs - The UTXOs belonging to the address to sweep
 * @param {LegacyMasterKey} sweepingMasterKey - The address to sweep from
 * @param {number} nFixedFee - An optional fixed satoshi fee
 * @returns {Promise<string|false>} - TXID on success, false or error on failure
 */
export async function sweepAddress(arrUTXOs, sweepingMasterKey, nFixedFee = 0) {
    const cTx = new bitjs.transaction();

    // Load all UTXOs as inputs
    let nTotal = 0;
    for (const cUTXO of arrUTXOs) {
        nTotal += cUTXO.sats;
        cTx.addinput({
            txid: cUTXO.id,
            index: cUTXO.vout,
            script: cUTXO.script,
            path: cUTXO.path,
        });
    }

    // Use a given fixed fee, or use the network fee if unspecified
    const nFee = nFixedFee || getNetwork().getFee(cTx.serialize().length);

    // Use a new address from our wallet to sweep the UTXOs in to
    const strAddress = (await getNewAddress(true, false))[0];

    // Sweep the full funds amount, minus the fee, leaving no change from any sweeped UTXOs
    cTx.addoutput(strAddress, (nTotal - nFee) / COIN);

    // Sign using the given Master Key, then broadcast the sweep, returning the TXID (or a failure)
    const sign = await signTransaction(cTx, sweepingMasterKey);
    return await getNetwork().sendTransaction(sign);
}

export function toggleDropDown(id) {
    const domID = document.getElementById(id);
    domID.style.display = domID.style.display === 'block' ? 'none' : 'block';
}

export function isMasternodeUTXO(cUTXO, cMasternode) {
    if (cMasternode?.collateralTxId) {
        const { collateralTxId, outidx } = cMasternode;
        return collateralTxId === cUTXO.id && cUTXO.vout === outidx;
    } else {
        return false;
    }
}

/**
 * Creates a GUI popup for the user to check or customise their Cold Address
 */
export async function guiSetColdStakingAddress() {
    if (
        await confirmPopup({
            title: translation.popupSetColdAddr,
            html: `<p>${
                translation.popupCurrentAddress
            }<br><span class="mono">${strColdStakingAddress}</span><br><br><span style="opacity: 0.65; margin: 10px;">${
                translation.popupColdStakeNote
            }</span></p><br><input type="text" id="newColdAddress" placeholder="${
                translation.popupExample
            } ${strColdStakingAddress.substring(
                0,
                6
            )}..." style="text-align: center;">`,
        })
    ) {
        // Fetch address from the popup input
        const strColdAddress = document.getElementById('newColdAddress').value;

        // If it's empty, just return false
        if (!strColdAddress) return false;

        // Sanity-check, and set!
        if (
            strColdAddress[0] === cChainParams.current.STAKING_PREFIX &&
            strColdAddress.length === 34
        ) {
            await setColdStakingAddress(strColdAddress);
            createAlert('info', ALERTS.STAKE_ADDR_SET, 5000);
            return true;
        } else {
            createAlert('warning', ALERTS.STAKE_ADDR_BAD, 2500);
            return false;
        }
    } else {
        return false;
    }
}

export async function wipePrivateData() {
    const isEncrypted = await hasEncryptedWallet();
    const title = isEncrypted
        ? translation.popupWalletLock
        : translation.popupWalletWipe;
    const html = isEncrypted
        ? translation.popupWalletLockNote
        : translation.popupWalletWipeNote;
    if (
        await confirmPopup({
            title,
            html,
        })
    ) {
        wallet.wipePrivateData();
        doms.domWipeWallet.hidden = true;
        if (isEncrypted) {
            doms.domRestoreWallet.hidden = false;
        }
    }
}

/**
 * Prompt the user in the GUI to unlock their wallet
 * @param {string} strReason - An optional reason for the unlock
 * @returns {Promise<boolean>} - If the unlock was successful or rejected
 */
export async function restoreWallet(strReason = '') {
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

        // Attempt to unlock the wallet with the provided password
        if (await decryptWallet(strPassword)) {
            doms.domRestoreWallet.hidden = true;
            doms.domWipeWallet.hidden = false;
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

/** A lock to prevent rendering the Governance Dashboard multiple times */
let fRenderingGovernance = false;

/**
 * Fetch Governance data and re-render the Governance UI
 */
export async function updateGovernanceTab() {
    if (fRenderingGovernance) return;
    fRenderingGovernance = true;

    // Setup the Superblock countdown (if not already done), no need to block thread with await, either.
    let cNet = getNetwork();

    // When switching to mainnet from testnet or vise versa, you ned to use an await on getBlockCount() or cNet.cachedBlockCount returns 0
    if (!isTestnetLastState == cChainParams.current.isTestnet) {
        // Reset flipdown
        governanceFlipdown = null;
        doms.domFlipdown.innerHTML = '';

        // Get new network blockcount
        await getNetwork().getBlockCount();
        cNet = getNetwork();
    }

    // Update governance counter when testnet/mainnet has been switched
    if (!governanceFlipdown && cNet.cachedBlockCount > 0) {
        Masternode.getNextSuperblock().then((nSuperblock) => {
            // The estimated time to the superblock (using the block target and remaining blocks)
            const nTimestamp =
                Date.now() / 1000 + (nSuperblock - cNet.cachedBlockCount) * 60;
            governanceFlipdown = new FlipDown(nTimestamp).start();
        });
        isTestnetLastState = cChainParams.current.isTestnet;
    }

    // Fetch all proposals from the network
    const arrProposals = await Masternode.getProposals({
        fAllowFinished: false,
    });

    /* Sort proposals into two categories
        - Standard (Proposal is either new with <100 votes, or has a healthy vote count)
        - Contested (When a proposal may be considered spam, malicious, or simply highly contestable)
    */
    const arrStandard = arrProposals.filter(
        (a) => a.Yeas + a.Nays < 100 || a.Ratio > 0.25
    );
    const arrContested = arrProposals.filter(
        (a) => a.Yeas + a.Nays >= 100 && a.Ratio <= 0.25
    );

    // Render Proposals
    await Promise.all([
        renderProposals(arrStandard, false),
        renderProposals(arrContested, true),
    ]);

    // Remove lock
    fRenderingGovernance = false;
}

/**
 * @typedef {Object} ProposalCache
 * @property {number} nSubmissionHeight - The submission height of the proposal.
 * @property {string} txid - The transaction ID of the proposal (string).
 * @property {boolean} fFetching - Indicates whether the proposal is currently being fetched or not.
 */

/**
 * An array of Proposal Finalisation caches
 * @type {Array<ProposalCache>}
 */
const arrProposalFinalisationCache = [];

/**
 * Asynchronously wait for a Proposal Tx to confirm, then cache the height.
 *
 * Do NOT await unless you want to lock the thread for a long time.
 * @param {ProposalCache} cProposalCache - The proposal cache to wait for
 * @returns {Promise<boolean>} Returns `true` once the block height is cached
 */
async function waitForSubmissionBlockHeight(cProposalCache) {
    let nHeight = null;

    // Wait in a permanent throttled loop until we successfully fetch the block
    const cNet = getNetwork();
    while (true) {
        // If a proposal is already fetching, then consequtive calls will be rejected
        cProposalCache.fFetching = true;

        // Attempt to fetch the submission Tx (may not exist yet!)
        let cTx = null;
        try {
            cTx = await cNet.getTxInfo(cProposalCache.txid);
        } catch (_) {}

        if (!cTx || !cTx.blockHeight) {
            // Didn't get the TX, throttle the thread by sleeping for a bit, then try again.
            await sleep(30000);
        } else {
            nHeight = cTx.blockHeight;
            break;
        }
    }

    // Update the proposal finalisation cache
    cProposalCache.nSubmissionHeight = nHeight;

    return true;
}

/**
 * Create a Status String for a proposal's finalisation status
 * @param {ProposalCache} cPropCache - The proposal cache to check
 * @returns {string} The string status, for display purposes
 */
function getProposalFinalisationStatus(cPropCache) {
    const cNet = getNetwork();
    // Confirmations left until finalisation, by network consensus
    const nConfsLeft =
        cPropCache.nSubmissionHeight +
        cChainParams.current.proposalFeeConfirmRequirement -
        cNet.cachedBlockCount;

    if (cPropCache.nSubmissionHeight === 0 || cNet.cachedBlockCount === 0) {
        return translation.proposalFinalisationConfirming;
    } else if (nConfsLeft > 0) {
        return (
            nConfsLeft +
            ' block' +
            (nConfsLeft === 1 ? '' : 's') +
            ' ' +
            translation.proposalFinalisationRemaining
        );
    } else if (Math.abs(nConfsLeft) >= cChainParams.current.budgetCycleBlocks) {
        return translation.proposalFinalisationExpired;
    } else {
        return translation.proposalFinalisationReady;
    }
}

/**
 *
 * @param {Object} cProposal - A local proposal to add to the cache tracker
 * @returns {ProposalCache} - The finalisation cache object pointer of the local proposal
 */
function addProposalToFinalisationCache(cProposal) {
    // If it exists, return the existing cache
    /** @type ProposalCache */
    let cPropCache = arrProposalFinalisationCache.find(
        (a) => a.txid === cProposal.mpw.txid
    );
    if (cPropCache) return cPropCache;

    // Create a new cache
    cPropCache = {
        nSubmissionHeight: 0,
        txid: cProposal.mpw.txid,
        fFetching: false,
    };
    arrProposalFinalisationCache.push(cPropCache);

    // Return the object 'pointer' in the array for further updating
    return cPropCache;
}

/**
 * Render Governance proposal objects to a given Proposal category
 * @param {Array<object>} arrProposals - The proposals to render
 * @param {boolean} fContested - The proposal category
 */
async function renderProposals(arrProposals, fContested) {
    // Set the total budget
    doms.domTotalGovernanceBudget.innerText = (
        cChainParams.current.maxPayment / COIN
    ).toLocaleString('en-gb');

    // Update total budget in user's currency
    const nPrice = await cMarket.getPrice(strCurrency);
    const nCurrencyValue = (cChainParams.current.maxPayment / COIN) * nPrice;
    const { nValue, cLocale } = optimiseCurrencyLocale(nCurrencyValue);
    doms.domTotalGovernanceBudgetValue.innerHTML =
        nValue.toLocaleString('en-gb', cLocale) +
        ' <span style="color:#8b38ff;">' +
        strCurrency.toUpperCase() +
        '</span>';

    // Select the table based on the proposal category
    const domTable = fContested
        ? doms.domGovProposalsContestedTableBody
        : doms.domGovProposalsTableBody;

    // Render the proposals in the relevent table
    const database = await Database.getInstance();
    const cMasternode = await database.getMasternode();

    if (!fContested) {
        const localProposals =
            (await database.getAccount())?.localProposals?.map((p) => {
                return {
                    Name: p.name,
                    URL: p.url,
                    PaymentAddress: p.address,
                    MonthlyPayment: p.monthlyPayment / COIN,
                    RemainingPaymentCount: p.nPayments,
                    TotalPayment: p.nPayments * (p.monthlyPayment / COIN),
                    Yeas: 0,
                    Nays: 0,
                    local: true,
                    Ratio: 0,
                    IsEstablished: false,
                    mpw: p,
                };
            }) || [];
        arrProposals = localProposals.concat(arrProposals);
    }
    arrProposals = await Promise.all(
        arrProposals.map(async (p) => {
            return {
                YourVote:
                    cMasternode && p.Hash
                        ? await cMasternode.getVote(p.Name, p.Hash)
                        : null,
                ...p,
            };
        })
    );

    // Fetch the Masternode count for proposal status calculations
    const cMasternodes = await Masternode.getMasternodeCount();

    let totalAllocatedAmount = 0;

    // Wipe the current table and start rendering proposals
    let i = 0;
    domTable.innerHTML = '';
    for (const cProposal of arrProposals) {
        const domRow = domTable.insertRow();

        const domStatus = domRow.insertCell();
        domStatus.classList.add('governStatusCol');
        if (domTable.id == 'proposalsTableBody') {
            domStatus.setAttribute(
                'onclick',
                `if(document.getElementById('governMob${i}').classList.contains('d-none')) { document.getElementById('governMob${i}').classList.remove('d-none'); } else { document.getElementById('governMob${i}').classList.add('d-none'); }`
            );
        } else if (domTable.id == 'proposalsContestedTableBody') {
            domStatus.setAttribute(
                'onclick',
                `if(document.getElementById('governMobCon${i}').classList.contains('d-none')) { document.getElementById('governMobCon${i}').classList.remove('d-none'); } else { document.getElementById('governMobCon${i}').classList.add('d-none'); }`
            );
        }

        // Add border radius to last row
        if (arrProposals.length - 1 == i) {
            domStatus.classList.add('bblr-7p');
        }

        // Net Yes calculation
        const { Yeas, Nays } = cProposal;
        const nNetYes = Yeas - Nays;
        const nNetYesPercent = (nNetYes / cMasternodes.enabled) * 100;

        // Proposal Status calculation
        const nRequiredVotes = cMasternodes.enabled / 10;
        let strStatus = '';
        let strFundingStatus = '';

        // Proposal Status calculations
        if (nNetYes < nRequiredVotes) {
            // Scenario 1: Not enough votes
            strStatus = translation.proposalFailing;
            strFundingStatus = translation.proposalNotFunded;
        } else if (!cProposal.IsEstablished) {
            // Scenario 2: Enough votes, but not established
            strStatus = translation.proposalFailing;
            strFundingStatus = translation.proposalTooYoung;
        } else {
            // Scenario 3: Enough votes, and established
            strStatus = translation.proposalPassing;
            strFundingStatus = translation.proposalFunded;
        }

        // Funding Status and allocation calculations
        if (cProposal.local) {
            // Check the finalisation cache
            const cPropCache = addProposalToFinalisationCache(cProposal);
            if (!cPropCache.fFetching) {
                waitForSubmissionBlockHeight(cPropCache).then(
                    updateGovernanceTab
                );
            }
            const strLocalStatus = getProposalFinalisationStatus(cPropCache);
            const finalizeButton = document.createElement('button');
            finalizeButton.className = 'pivx-button-small';
            finalizeButton.innerHTML = '<i class="fas fa-check"></i>';

            if (
                strLocalStatus === translation.proposalFinalisationReady ||
                strLocalStatus === translation.proposalFinalisationExpired
            ) {
                finalizeButton.addEventListener('click', async () => {
                    const result = await Masternode.finalizeProposal(
                        cProposal.mpw
                    );

                    const deleteProposal = async () => {
                        // Fetch Account
                        const account = await database.getAccount();

                        // Find index of Account local proposal to remove
                        const nProposalIndex = account.localProposals.findIndex(
                            (p) => p.txid === cProposal.mpw.txid
                        );

                        // If found, remove the proposal and update the account with the modified localProposals array
                        if (nProposalIndex > -1) {
                            // Remove our proposal from it
                            account.localProposals.splice(nProposalIndex, 1);

                            // Update the DB
                            await database.updateAccount(account, true);
                        }
                    };

                    if (result.ok) {
                        deleteProposal();
                        // Create a prompt showing the finalisation success, vote hash, and further details
                        confirmPopup({
                            title: translation.PROPOSAL_FINALISED + ' 🚀',
                            html: `<p><span style="opacity: 0.65; margin: 10px;">${
                                translation.popupProposalFinalisedNote
                            }</span><br><br>${
                                translation.popupProposalVoteHash
                            }<br><span class="mono" style="font-size: small;">${sanitizeHTML(
                                result.hash
                            )}</span><br><br>${
                                translation.popupProposalFinalisedSignoff
                            } 👋</p>`,
                            hideConfirm: true,
                        });
                        updateGovernanceTab();
                    } else {
                        if (result.err === 'unconfirmed') {
                            createAlert(
                                'warning',
                                ALERTS.PROPOSAL_UNCONFIRMED,
                                5000
                            );
                        } else if (result.err === 'invalid') {
                            createAlert(
                                'warning',
                                ALERTS.PROPOSAL_EXPIRED,
                                5000
                            );
                            deleteProposal();
                            updateGovernanceTab();
                        } else {
                            createAlert(
                                'warning',
                                ALERTS.PROPOSAL_FINALISE_FAIL
                            );
                        }
                    }
                });
            } else {
                finalizeButton.style.opacity = 0.5;
                finalizeButton.style.cursor = 'default';
            }

            domStatus.innerHTML = `
            <span style="font-size:12px; line-height: 15px; display: block; margin-bottom:15px;">
                <span style="color:#fff; font-weight:700;">${strLocalStatus}</span><br>
            </span>
            <span class="governArrow for-mobile ptr">
                <i class="fa-solid fa-angle-down"></i>
            </span>`;
            domStatus.appendChild(finalizeButton);
        } else {
            if (domTable.id == 'proposalsTableBody') {
                if (
                    cProposal.IsEstablished &&
                    nNetYes >= nRequiredVotes &&
                    totalAllocatedAmount + cProposal.MonthlyPayment <=
                        cChainParams.current.maxPayment / COIN
                ) {
                    strFundingStatus = translation.proposalFunded;
                    totalAllocatedAmount += cProposal.MonthlyPayment;
                }
            }

            // Figure out the colour of the Status, if any (using CSS class `votes[Yes/No]`)
            const strColourClass =
                strStatus === translation.proposalPassing ? 'Yes' : 'No';

            domStatus.innerHTML = `
            <span style="font-size:12px; line-height: 15px; display: block; margin-bottom:15px;">
                <span style="font-weight:700;" class="votes${strColourClass}">${strStatus}</span><br>
                <span style="color:hsl(265 100% 67% / 1);">(${strFundingStatus})</span><br>
            </span>
            <span style="font-size:12px; line-height: 15px; display: block; color:#d1d1d1;">
                <b>${nNetYesPercent.toFixed(1)}%</b><br>
                ${translation.proposalNetYes}
            </span>
            <span class="governArrow for-mobile ptr">
                <i class="fa-solid fa-angle-down"></i>
            </span>`;
        }

        // Name, Payment Address and URL hyperlink
        const domNameAndURL = domRow.insertCell();
        domNameAndURL.style = 'vertical-align: middle;';

        // IMPORTANT: Sanitise all of our HTML or a rogue server or malicious proposal could perform a cross-site scripting attack
        domNameAndURL.innerHTML = `<a class="governLink" style="color: white" href="${sanitizeHTML(
            cProposal.URL
        )}" target="_blank" rel="noopener noreferrer"><b>${sanitizeHTML(
            cProposal.Name
        )} <span class="governLinkIco"><i class="fa-solid fa-arrow-up-right-from-square"></i></b></a></span><br><a class="governLink" style="font-size: small; color:#8b38ff;" onclick="MPW.openExplorer('${
            cProposal.PaymentAddress
        }')"><i class="fa-solid fa-user-large" style="margin-right: 5px"></i><b>${sanitizeHTML(
            cProposal.PaymentAddress.slice(0, 6) + '...'
        )}`;

        // Convert proposal amount to user's currency
        const nProposalValue = parseInt(cProposal.MonthlyPayment) * nPrice;
        const { nValue } = optimiseCurrencyLocale(nProposalValue);
        const strProposalCurrency = nValue.toLocaleString('en-gb', cLocale);

        // Payment Schedule and Amounts
        const domPayments = domRow.insertCell();
        domPayments.classList.add('for-desktop');
        domPayments.style = 'vertical-align: middle;';
        domPayments.innerHTML = `<span class="governValues"><b>${sanitizeHTML(
            parseInt(cProposal.MonthlyPayment).toLocaleString('en-gb', ',', '.')
        )}</b> <span class="governMarked">${
            cChainParams.current.TICKER
        }</span> <br>
        <b class="governFiatSize">(${strProposalCurrency} <span style="color:#8b38ff;">${strCurrency.toUpperCase()}</span>)</b></span>

        <span class="governInstallments"> ${sanitizeHTML(
            cProposal['RemainingPaymentCount']
        )} ${translation.proposalPaymentsRemaining} <b>${sanitizeHTML(
            parseInt(cProposal.TotalPayment).toLocaleString('en-gb', ',', '.')
        )} ${cChainParams.current.TICKER}</b> ${
            translation.proposalPaymentTotal
        }</span>`;

        // Vote Counts and Consensus Percentages
        const domVoteCounters = domRow.insertCell();
        domVoteCounters.classList.add('for-desktop');
        domVoteCounters.style = 'vertical-align: middle;';

        const nLocalPercent = cProposal.Ratio * 100;
        domVoteCounters.innerHTML = `<b>${parseFloat(
            nLocalPercent
        ).toLocaleString(
            'en-gb',
            { minimumFractionDigits: 0, maximumFractionDigits: 1 },
            ',',
            '.'
        )}%</b> <br>
        <small class="votesBg"> <b><div class="votesYes" style="display:inline;"> ${sanitizeHTML(
            Yeas
        )} </div></b> /
        <b><div class="votesNo" style="display:inline;"> ${sanitizeHTML(
            Nays
        )} </div></b></small>
        `;

        // Voting Buttons for Masternode owners (MNOs)
        let voteBtn;
        if (cProposal.local) {
            const domVoteBtns = domRow.insertCell();
            domVoteBtns.classList.add('for-desktop');
            domVoteBtns.style = 'vertical-align: middle;';
            voteBtn = '';
        } else {
            let btnYesClass = 'pivx-button-small';
            let btnNoClass = 'pivx-button-small';
            if (cProposal.YourVote) {
                if (cProposal.YourVote === 1) {
                    btnYesClass += ' pivx-button-big-yes-gov';
                } else {
                    btnNoClass += ' pivx-button-big-no-gov';
                }
            }
            const domVoteBtns = domRow.insertCell();
            domVoteBtns.style = 'vertical-align: middle;';
            const domNoBtn = document.createElement('button');
            domNoBtn.className = btnNoClass;
            domNoBtn.innerText = translation.no;
            domNoBtn.onclick = () => govVote(cProposal.Hash, 2);

            const domYesBtn = document.createElement('button');
            domYesBtn.className = btnYesClass;
            domYesBtn.innerText = translation.yes;
            domYesBtn.onclick = () => govVote(cProposal.Hash, 1);

            // Add border radius to last row
            if (arrProposals.length - 1 == i) {
                domVoteBtns.classList.add('bbrr-7p');
            }

            domVoteBtns.classList.add('for-desktop');
            domVoteBtns.appendChild(domNoBtn);
            domVoteBtns.appendChild(domYesBtn);

            domNoBtn.setAttribute(
                'onclick',
                `MPW.govVote('${cProposal.Hash}', 2)`
            );
            domYesBtn.setAttribute(
                'onclick',
                `MPW.govVote('${cProposal.Hash}', 1);`
            );
            voteBtn = domNoBtn.outerHTML + domYesBtn.outerHTML;
        }

        // Create extended row for mobile
        const mobileDomRow = domTable.insertRow();
        const mobileExtended = mobileDomRow.insertCell();
        mobileExtended.style = 'vertical-align: middle;';
        if (domTable.id == 'proposalsTableBody') {
            mobileExtended.id = `governMob${i}`;
        } else if (domTable.id == 'proposalsContestedTableBody') {
            mobileExtended.id = `governMobCon${i}`;
        }
        mobileExtended.colSpan = '2';
        mobileExtended.classList.add('text-left');
        mobileExtended.classList.add('d-none');
        mobileExtended.classList.add('for-mobile');
        mobileExtended.innerHTML = `
        <div class="row pt-2">
            <div class="col-5 fs-13 fw-600">
                <div class="governMobDot"></div> ${translation.govTablePayment}
            </div>
            <div class="col-7">
                <span class="governValues"><b>${sanitizeHTML(
                    parseInt(cProposal.MonthlyPayment).toLocaleString(
                        'en-gb',
                        ',',
                        '.'
                    )
                )}</b> <span class="governMarked">${
            cChainParams.current.TICKER
        }</span> <span style="margin-left:10px; margin-right: 2px;" class="governMarked governFiatSize">${strProposalCurrency}</span></b></span>
        
                <span class="governInstallments"> ${sanitizeHTML(
                    cProposal['RemainingPaymentCount']
                )} ${translation.proposalPaymentsRemaining} <b>${sanitizeHTML(
            parseInt(cProposal.TotalPayment).toLocaleString('en-gb', ',', '.')
        )} ${cChainParams.current.TICKER}</b> ${
            translation.proposalPaymentTotal
        }</span>
            </div>
        </div>
        <hr class="governHr">
        <div class="row">
            <div class="col-5 fs-13 fw-600">
                <div class="governMobDot"></div> ${translation.govTableVotes}
            </div>
            <div class="col-7">
                <b>${parseFloat(nLocalPercent).toLocaleString(
                    'en-gb',
                    { minimumFractionDigits: 0, maximumFractionDigits: 1 },
                    ',',
                    '.'
                )}%</b>
                <small class="votesBg"> <b><div class="votesYes" style="display:inline;"> ${sanitizeHTML(
                    Yeas
                )} </div></b> /
                <b><div class="votesNo" style="display:inline;"> ${sanitizeHTML(
                    Nays
                )} </div></b></small>
            </div>
        </div>
        <hr class="governHr">
        <div class="row pb-2">
            <div class="col-5 fs-13 fw-600">
                <div class="governMobDot"></div> ${translation.govTableVote}
            </div>
            <div class="col-7">
                ${voteBtn}
            </div>
        </div>`;

        i++;
    }

    // Show allocated budget
    if (domTable.id == 'proposalsTableBody') {
        const strAlloc = sanitizeHTML(
            totalAllocatedAmount.toLocaleString('en-gb')
        );
        doms.domAllocatedGovernanceBudget.innerHTML = strAlloc;
        doms.domAllocatedGovernanceBudget2.innerHTML = strAlloc;

        // Update allocated budget in user's currency
        const nCurrencyValue = totalAllocatedAmount * nPrice;
        const { nValue } = optimiseCurrencyLocale(nCurrencyValue);
        const strAllocCurrency =
            nValue.toLocaleString('en-gb', cLocale) +
            ' <span style="color:#8b38ff;">' +
            strCurrency.toUpperCase() +
            '</span>';
        doms.domAllocatedGovernanceBudgetValue.innerHTML = strAllocCurrency;
        doms.domAllocatedGovernanceBudgetValue2.innerHTML = strAllocCurrency;
    }
}

export async function updateMasternodeTab() {
    //TODO: IN A FUTURE ADD MULTI-MASTERNODE SUPPORT BY SAVING MNs with which you logged in the past.
    // Ensure a wallet is loaded
    doms.domMnTextErrors.innerHTML = '';
    doms.domAccessMasternode.style.display = 'none';
    doms.domCreateMasternode.style.display = 'none';
    doms.domMnDashboard.style.display = 'none';

    if (!wallet.isLoaded()) {
        doms.domMnTextErrors.innerHTML =
            'Please ' +
            ((await hasEncryptedWallet()) ? 'unlock' : 'import') +
            ' your <b>COLLATERAL WALLET</b> first.';
        return;
    }

    if (!mempool.getConfirmed().length) {
        doms.domMnTextErrors.innerHTML =
            'Your wallet is empty or still loading, re-open the tab in a few seconds!';
        return;
    }

    const database = await Database.getInstance();

    let cMasternode = await database.getMasternode();
    // If the collateral is missing (spent, or switched wallet) then remove the current MN
    if (cMasternode) {
        if (
            !mempool
                .getConfirmed()
                .find((utxo) => isMasternodeUTXO(utxo, cMasternode))
        ) {
            database.removeMasternode();
            cMasternode = null;
        }
    }

    doms.domControlMasternode.style.display = cMasternode ? 'block' : 'none';

    // first case: the wallet is not HD and it is not hardware, so in case the wallet has collateral the user can check its status and do simple stuff like voting
    if (!wallet.isHD()) {
        doms.domMnAccessMasternodeText.innerHTML =
            doms.masternodeLegacyAccessText;
        doms.domMnTxId.style.display = 'none';
        // Find the first UTXO matching the expected collateral size
        const cCollaUTXO = mempool
            .getConfirmed()
            .find(
                (cUTXO) => cUTXO.sats === cChainParams.current.collateralInSats
            );
        const balance = getBalance(false);
        if (cCollaUTXO) {
            if (cMasternode) {
                await refreshMasternodeData(cMasternode);
                doms.domMnDashboard.style.display = '';
            } else {
                doms.domMnTxId.style.display = 'none';
                doms.domAccessMasternode.style.display = 'block';
            }
        } else if (balance < cChainParams.current.collateralInSats) {
            // The user needs more funds
            doms.domMnTextErrors.innerHTML =
                'You need <b>' +
                (cChainParams.current.collateralInSats - balance) / COIN +
                ' more ' +
                cChainParams.current.TICKER +
                '</b> to create a Masternode!';
        } else {
            // The user has the funds, but not an exact collateral, prompt for them to create one
            doms.domCreateMasternode.style.display = 'block';
            doms.domMnTxId.style.display = 'none';
            doms.domMnTxId.innerHTML = '';
        }
    } else {
        doms.domMnTxId.style.display = 'none';
        doms.domMnTxId.innerHTML = '';
        doms.domMnAccessMasternodeText.innerHTML = doms.masternodeHDAccessText;

        // First UTXO for each address in HD
        const mapCollateralAddresses = new Map();

        // Aggregate all valid Masternode collaterals into a map of Address <--> Collateral
        for (const cUTXO of mempool.getConfirmed()) {
            if (cUTXO.sats !== cChainParams.current.collateralInSats) continue;
            mapCollateralAddresses.set(cUTXO.path, cUTXO);
        }
        const fHasCollateral = mapCollateralAddresses.size > 0;

        // If there's no loaded MN, but valid collaterals, display the configuration screen
        if (!cMasternode && fHasCollateral) {
            doms.domMnTxId.style.display = 'block';
            doms.domAccessMasternode.style.display = 'block';

            for (const [key] of mapCollateralAddresses) {
                const option = document.createElement('option');
                option.value = key;
                option.innerText = await wallet.getAddress(key);
                doms.domMnTxId.appendChild(option);
            }
        }

        // If there's no collateral found, display the creation UI
        if (!fHasCollateral) doms.domCreateMasternode.style.display = 'block';

        // If we have a collateral and a loaded Masternode, display the Dashboard
        if (fHasCollateral && cMasternode) {
            // Refresh the display
            refreshMasternodeData(cMasternode);
            doms.domMnDashboard.style.display = '';
        }
    }
}

async function refreshMasternodeData(cMasternode, fAlert = false) {
    const cMasternodeData = await cMasternode.getFullData();
    if (debug) {
        console.log('---- NEW MASTERNODE DATA (Debug Mode) ----');
        console.log(cMasternodeData);
        console.log('---- END MASTERNODE DATA (Debug Mode) ----');
    }

    // If we have MN data available, update the dashboard
    if (cMasternodeData && cMasternodeData.status !== 'MISSING') {
        doms.domMnTextErrors.innerHTML = '';
        doms.domMnProtocol.innerText = `(${sanitizeHTML(
            cMasternodeData.version
        )})`;
        doms.domMnStatus.innerText = sanitizeHTML(cMasternodeData.status);
        doms.domMnNetType.innerText = sanitizeHTML(
            cMasternodeData.network.toUpperCase()
        );
        doms.domMnNetIP.innerText = cMasternode.addr;
        doms.domMnLastSeen.innerText = new Date(
            cMasternodeData.lastseen * 1000
        ).toLocaleTimeString();
    }

    if (cMasternodeData.status === 'MISSING') {
        doms.domMnTextErrors.innerHTML =
            'Masternode is currently <b>OFFLINE</b>';
        if (!wallet.isViewOnly()) {
            createAlert('warning', ALERTS.MN_OFFLINE_STARTING, 6000);
            // try to start the masternode
            const started = await cMasternode.start();
            if (started) {
                doms.domMnTextErrors.innerHTML = ALERTS.MN_STARTED;
                createAlert('success', ALERTS.MN_STARTED_ONLINE_SOON, 6000);
                const database = await Database.getInstance();
                await database.addMasternode(cMasternode);
            } else {
                doms.domMnTextErrors.innerHTML = ALERTS.MN_START_FAILED;
                createAlert('warning', ALERTS.MN_START_FAILED, 6000);
            }
        }
    } else if (
        cMasternodeData.status === 'ENABLED' ||
        cMasternodeData.status === 'PRE_ENABLED'
    ) {
        if (fAlert)
            createAlert(
                'success',
                `${ALERTS.MN_STATUS_IS} <b> ${sanitizeHTML(
                    cMasternodeData.status
                )} </b>`,
                6000
            );
        const database = await Database.getInstance();
        await database.addMasternode(cMasternode);
    } else if (cMasternodeData.status === 'REMOVED') {
        const state = cMasternodeData.status;
        doms.domMnTextErrors.innerHTML = tr(ALERTS.MN_STATE, [
            { state: state },
        ]);
        if (fAlert)
            createAlert(
                'warning',
                tr(ALERTS.MN_STATE, [{ state: state }]),
                6000
            );
    } else {
        // connection problem
        doms.domMnTextErrors.innerHTML = ALERTS.MN_CANT_CONNECT;
        if (fAlert) createAlert('warning', ALERTS.MN_CANT_CONNECT, 6000);
    }

    // Return the data in case the caller needs additional context
    return cMasternodeData;
}

export async function createProposal() {
    // Must have a wallet
    if (!wallet.isLoaded()) {
        return createAlert('warning', ALERTS.PROPOSAL_IMPORT_FIRST, 4500);
    }
    // Wallet must be encrypted
    if (!(await hasEncryptedWallet())) {
        return createAlert(
            'warning',
            tr(translation.popupProposalEncryptFirst, [
                { button: translation.secureYourWallet },
            ]),
            4500
        );
    }
    // Wallet must be unlocked
    if (
        wallet.isViewOnly() &&
        !(await restoreWallet(translation.walletUnlockProposal))
    ) {
        return;
    }
    // Must have enough funds
    if (getBalance() * COIN < cChainParams.current.proposalFee) {
        return createAlert('warning', ALERTS.PROPOSAL_NOT_ENOUGH_FUNDS, 4500);
    }

    // Create the popup, wait for the user to confirm or cancel
    const fConfirmed = await confirmPopup({
        title: `${translation.popupCreateProposal} (${
            translation.popupCreateProposalCost
        } ${cChainParams.current.proposalFee / COIN} ${
            cChainParams.current.TICKER
        })`,
        html: `<input id="proposalTitle" maxlength="20" placeholder="${
            translation.popupProposalName
        }" style="text-align: center;"><br>
               <input id="proposalUrl" maxlength="64" placeholder="${
                   translation.popupExample
               } https://forum.pivx.org/..." style="text-align: center;"><br>
               <input type="number" id="proposalCycles" min="1" max="${
                   cChainParams.current.maxPaymentCycles
               }" placeholder="${
            translation.popupProposalDuration
        }" style="text-align: center;"><br>
               <input type="number" id="proposalPayment" min="10" max="${
                   cChainParams.current.maxPayment / COIN
               }" placeholder="${cChainParams.current.TICKER} ${
            translation.popupProposalPerCycle
        }" style="text-align: center;"><br>
               <input id="proposalAddress" maxlength="34" placeholder="${
                   translation.popupProposalAddress
               }" style="text-align: center; ${
            !fAdvancedMode ? 'display: none' : ''
        }"><br>`,
    });

    // If the user cancelled, then we return
    if (!fConfirmed) return;

    const strTitle = document.getElementById('proposalTitle').value.trim();
    const strUrl = document.getElementById('proposalUrl').value.trim();
    const numCycles = parseInt(
        document.getElementById('proposalCycles').value.trim()
    );
    const numPayment = parseInt(
        document.getElementById('proposalPayment').value.trim()
    );

    // If Advanced Mode is enabled and an address is given, use the provided address, otherwise, generate a new one
    const strAddress =
        document.getElementById('proposalAddress').value.trim() ||
        (await wallet.getNewAddress())[0];
    const nextSuperblock = await Masternode.getNextSuperblock();
    const proposal = {
        name: strTitle,
        url: strUrl,
        nPayments: numCycles,
        start: nextSuperblock,
        address: strAddress,
        monthlyPayment: numPayment * COIN,
    };

    const isValid = Masternode.isValidProposal(proposal);
    if (!isValid.ok) {
        createAlert(
            'warning',
            `${ALERTS.PROPOSAL_INVALID_ERROR} ${isValid.err}`,
            7500
        );
        return;
    }

    const hash = Masternode.createProposalHash(proposal);
    const { ok, txid } = await createAndSendTransaction({
        address: hash,
        amount: cChainParams.current.proposalFee,
        isProposal: true,
    });
    if (ok) {
        proposal.txid = txid;
        const database = await Database.getInstance();

        // Fetch our Account, add the proposal to it
        const account = await database.getAccount();
        account.localProposals.push(proposal);

        // Update the DB
        await database.updateAccount(account);
        createAlert('success', translation.PROPOSAL_CREATED, 10000);
        updateGovernanceTab();
    }
}

export async function refreshChainData() {
    const cNet = getNetwork();
    // If in offline mode: don't sync ANY data or connect to the internet
    if (!cNet.enabled)
        return console.warn(
            'Offline mode active: For your security, the wallet will avoid ALL internet requests.'
        );
    if (!wallet.isLoaded()) return;

    // Fetch block count
    await cNet.getBlockCount();
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
