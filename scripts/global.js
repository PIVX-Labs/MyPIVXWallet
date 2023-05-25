import { Mempool } from './mempool.js';
import Masternode from './masternode.js';
import { ALERTS, start as i18nStart, translation } from './i18n.js';
import * as jdenticon from 'jdenticon';
import {
    masterKey,
    hasEncryptedWallet,
    importWallet,
    encryptWallet,
    decryptWallet,
    getNewAddress,
    getDerivationPath,
    deriveAddress,
    LegacyMasterKey,
} from './wallet.js';
import { getNetwork } from './network.js';
import {
    start as settingsStart,
    cExplorer,
    debug,
    cMarket,
    strCurrency,
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

/** A flag showing if base MPW is fully loaded or not */
export let fIsLoaded = false;

/** A getter for the flag showing if base MPW is fully loaded or not */
export function isLoaded() {
    return fIsLoaded;
}

export let doms = {};

export async function start() {
    doms = {
        domNavbarToggler: document.getElementById('navbarToggler'),
        domDashboard: document.getElementById('dashboard'),
        domGuiStaking: document.getElementById('guiStaking'),
        domGuiWallet: document.getElementById('guiWallet'),
        domGuiBalance: document.getElementById('guiBalance'),
        domGuiBalanceTicker: document.getElementById('guiBalanceTicker'),
        domGuiBalanceValue: document.getElementById('guiBalanceValue'),
        domGuiBalanceValueCurrency: document.getElementById(
            'guiBalanceValueCurrency'
        ),
        domGuiStakingValue: document.getElementById('guiStakingValue'),
        domGuiStakingValueCurrency: document.getElementById(
            'guiStakingValueCurrency'
        ),
        domGuiBalanceBox: document.getElementById('guiBalanceBox'),
        domBalanceReload: document.getElementById('balanceReload'),
        domBalanceReloadStaking: document.getElementById(
            'balanceReloadStaking'
        ),
        domGuiBalanceStaking: document.getElementById('guiBalanceStaking'),
        domGuiBalanceStakingTicker: document.getElementById(
            'guiBalanceStakingTicker'
        ),
        domGuiStakingLoadMore: document.getElementById('stakingLoadMore'),
        domGuiStakingLoadMoreIcon: document.getElementById(
            'stakingLoadMoreIcon'
        ),
        domGuiBalanceBoxStaking: document.getElementById(
            'guiBalanceBoxStaking'
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
        domGuiViewKey: document.getElementById('guiViewKey'),
        domModalQR: document.getElementById('ModalQR'),
        domModalQrLabel: document.getElementById('ModalQRLabel'),
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
        domGovProposalsTable: document.getElementById('proposalsTable'),
        domGovProposalsTableBody: document.getElementById('proposalsTableBody'),
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
        domEncryptWarningTxt: document.getElementById('encryptWarningText'),
        domEncryptBtnTxt: document.getElementById('encryptButton'),
        domEncryptPasswordBox: document.getElementById('encryptPassword'),
        domEncryptPasswordFirst: document.getElementById('newPassword'),
        domEncryptPasswordSecond: document.getElementById('newPasswordRetype'),
        domGuiAddress: document.getElementById('guiAddress'),
        domGenIt: document.getElementById('genIt'),
        domHumanReadable: document.getElementById('HumanReadable'),
        domReqDesc: document.getElementById('reqDesc'),
        domReqDisplay: document.getElementById('reqDescDisplay'),
        domIdenticon: document.getElementById('identicon'),
        domPrivKey: document.getElementById('privateKey'),
        domPrivKeyPassword: document.getElementById('privateKeyPassword'),
        domAvailToDelegate: document.getElementById('availToDelegate'),
        domAvailToUndelegate: document.getElementById('availToUndelegate'),
        domAnalyticsDescriptor: document.getElementById('analyticsDescriptor'),
        domStakingRewardsList: document.getElementById(
            'staking-rewards-content'
        ),
        domStakingRewardsTitle: document.getElementById(
            'staking-rewards-title'
        ),
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
        domExportWallet: document.getElementById('guiExportWalletItem'),
        domWipeWallet: document.getElementById('guiWipeWallet'),
        domRestoreWallet: document.getElementById('guiRestoreWallet'),
        domNewAddress: document.getElementById('guiNewAddress'),
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
        domDebug: document.getElementById('Debug'),
        domTestnet: document.getElementById('Testnet'),
        domCurrencySelect: document.getElementById('currency'),
        domExplorerSelect: document.getElementById('explorer'),
        domNodeSelect: document.getElementById('node'),
        domTranslationSelect: document.getElementById('translation'),
        domBlackBack: document.getElementById('blackBack'),
    };
    await i18nStart();
    await loadImages();

    // Enable all Bootstrap Tooltips
    $(function () {
        $('[data-toggle="tooltip"]').tooltip();
    });

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
            importWallet({ newWif: publicKey, fStartup: true });
        } else {
            // Display the password unlock upfront
            await accessOrImportWallet();
        }
    }

    // Payment processor redirect
    if (reqTo.length || reqAmount > 0) {
        guiPreparePayment(
            reqTo,
            reqAmount,
            urlParams.has('desc') ? urlParams.get('desc') : ''
        );
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
}

function subscribeToNetworkEvents() {
    getEventEmitter().on('network-toggle', (value) => {
        doms.domNetwork.innerHTML =
            '<i class="fa-solid fa-' + (value ? 'wifi' : 'ban') + '"></i>';
    });

    getEventEmitter().on('sync-status', (value) => {
        switch (value) {
            case 'start':
                // Play reload anim
                doms.domBalanceReload.classList.add('playAnim');
                doms.domBalanceReloadStaking.classList.add('playAnim');
                break;
            case 'stop':
                doms.domBalanceReload.classList.remove('playAnim');
                doms.domBalanceReloadStaking.classList.remove('playAnim');
                break;
        }
    });

    getEventEmitter().on('transaction-sent', (success, result) => {
        if (success) {
            doms.domAddress1s.value = '';
            doms.domSendAmountCoins.innerHTML = '';
            createAlert(
                'success',
                `Transaction sent!<br>${sanitizeHTML(result)}`,
                result ? 1250 + result.length * 50 : 3000
            );
            // If allowed by settings: submit a simple 'tx' ping to Labs Analytics
            getNetwork().submitAnalytics('transaction');
        } else {
            createAlert('warning', 'Transaction Failed!', 1250);
        }
    });
}

// WALLET STATE DATA
export const mempool = new Mempool();
let exportHidden = false;

/** The global 'prompt lock', useful for creating custom logic flows using
 *  prompts, or just checking if one is already active */
export let fPromptActive = false;

/**
 * Set the fPromptActive state
 * @param {boolean} fBool
 */
export function setPromptLock(fBool) {
    fPromptActive = fBool;
}

//                        PIVX Labs' Cold Pool
export let cachedColdStakeAddr = 'SdgQDpS8jDRJDX8yK8m9KnTMarsE84zdsy';

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
        getNetwork().arrRewards.length === 0
    ) {
        updateStakingRewardsGUI();
    }
}

/**
 * Updates the GUI ticker among all elements; useful for Network Switching
 */
export function updateTicker() {
    // Update the Dashboard currency
    doms.domGuiBalanceValueCurrency.innerText = strCurrency.toUpperCase();

    // Update the Send menu ticker and currency
    doms.domSendAmountValueCurrency.innerText = strCurrency.toUpperCase();
    doms.domSendAmountCoinsTicker.innerText = cChainParams.current.TICKER;

    // Update the Stake/Unstake menu ticker and currency
    // Stake
    doms.domStakeAmountValueCurrency.innerText = strCurrency.toUpperCase();
    doms.domStakeAmountCoinsTicker.innerText = cChainParams.current.TICKER;

    // Unstake
    doms.domStakeAmountValueCurrency.innerText = strCurrency.toUpperCase();
    doms.domUnstakeAmountCoinsTicker.innerText = cChainParams.current.TICKER;
}

/**
 * Update a 'price value' DOM display for the given balance type
 * @param {HTMLElement} domValue
 * @param {boolean} fCold
 */
export function updatePriceDisplay(domValue, fCold = false) {
    // Update currency values
    cMarket.getPrice(strCurrency).then((nPrice) => {
        // Configure locale settings by detecting currency support
        const cLocale = Intl.supportedValuesOf('currency').includes(
            strCurrency.toUpperCase()
        )
            ? {
                  style: 'currency',
                  currency: strCurrency,
                  currencyDisplay: 'narrowSymbol',
              }
            : { maximumFractionDigits: 8, minimumFractionDigits: 8 };

        // Calculate the value
        let nValue =
            ((fCold ? getStakingBalance() : getBalance()) / COIN) * nPrice;

        // Handle certain edge-cases; like satoshis having decimals.
        switch (strCurrency) {
            case 'sats':
                nValue = Math.round(nValue);
                cLocale.maximumFractionDigits = 0;
                cLocale.minimumFractionDigits = 0;
        }

        // Update the DOM
        domValue.innerText = nValue.toLocaleString('en-gb', cLocale);
    });
}

export function getBalance(updateGUI = false) {
    const nBalance = mempool.getBalance();
    const nCoins = nBalance / COIN;

    // Update the GUI too, if chosen
    if (updateGUI) {
        // Set the balance, and adjust font-size for large balance strings
        const nLen = nCoins.toFixed(2).length;
        doms.domGuiBalance.innerText = nCoins.toFixed(nLen >= 6 ? 0 : 2);
        doms.domAvailToDelegate.innerText =
            nCoins.toFixed(2) + ' ' + cChainParams.current.TICKER;

        // Update tickers
        updateTicker();

        // Update price displays
        updatePriceDisplay(doms.domGuiBalanceValue);
    }

    return nBalance;
}

export function getStakingBalance(updateGUI = false) {
    const nBalance = mempool.getDelegatedBalance();

    if (updateGUI) {
        // Set the balance, and adjust font-size for large balance strings
        doms.domGuiBalanceStaking.innerText = Math.floor(nBalance / COIN);
        doms.domAvailToUndelegate.innerText =
            (nBalance / COIN).toFixed(2) + ' ' + cChainParams.current.TICKER;

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
    if (
        cScan.data.length === 34 &&
        cChainParams.current.PUBKEY_PREFIX.includes(cScan.data[0])
    ) {
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

    // No idea what this is...
    createAlert(
        'warning',
        `"${sanitizeHTML(
            cScan.data.substring(0, Math.min(cScan.data.length, 6))
        )}…" is not a valid payment receiver`,
        [],
        7500
    );
}

/**
 * Generate a DOM-optimised activity list
 * @param {Array<object>} arrTXs - The TX array to compute the list from
 * @param {boolean} fRewards - If this list is for Reward transactions
 * @returns {string} HTML - The Activity List in HTML string form
 */
export function createActivityListHTML(arrTXs, fRewards = false) {
    const cNet = getNetwork();

    // Prepare the table HTML
    let strList = `
    <table class="table table-responsive table-sm stakingTx table-mobile-scroll">
        <thead>
            <tr>
                <th scope="col" class="tx1">Time</th>
                <th scope="col" class="tx2">Hash</th>
                <th scope="col" class="tx3">Amount</th>
                <th scope="col" class="tx4 text-right"></th>
            </tr>
        </thead>
        <tbody>`;

    // Prepare time formatting
    const dateOptions = {
        year: '2-digit',
        month: '2-digit',
        day: '2-digit',
    };
    const timeOptions = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    };

    // Generate the TX list
    arrTXs.forEach((cTx) => {
        const dateTime = new Date(cTx.time * 1000);

        // Coinbase Transactions (rewards) require 100 confs
        const fConfirmed =
            cNet.cachedBlockCount - cTx.blockHeight >= fRewards ? 100 : 6;

        // Render the list element from Tx data
        strList += `
            <tr>
                <td class="align-middle pr-10px" style="font-size:12px;">
                    <i style="opacity: 0.75;">
                        ${
                            Date.now() / 1000 - cTx.time > 86400
                                ? dateTime.toLocaleDateString(
                                      undefined,
                                      dateOptions
                                  )
                                : dateTime.toLocaleTimeString(
                                      undefined,
                                      timeOptions
                                  )
                        }
                    </i>
                </td>
                <td class="align-middle pr-10px txcode">
                    <a href="${cExplorer.url}/tx/${sanitizeHTML(
            cTx.id
        )}" target="_blank" rel="noopener noreferrer">
                        <code class="wallet-code text-center active ptr" style="padding: 4px 9px;">${sanitizeHTML(
                            cTx.id
                        )}</code>
                    </a>
                </td>
                <td class="align-middle pr-10px">
                    <b><i class="fa-solid fa-gift"></i> ${sanitizeHTML(
                        cTx.amount
                    )} ${cChainParams.current.TICKER}</b>
                </td>
                <td class="text-right pr-10px align-middle">
                    <span class="badge ${
                        fConfirmed ? 'badge-purple' : 'bg-danger'
                    } mb-0">${
            fConfirmed
                ? '<i class="fas fa-check"></i>'
                : `<i class="fas fa-hourglass-end"></i>`
        }</span>
                </td>
            </tr>`;
    });

    // End the table
    strList += `</tbody></table>`;

    // Return the HTML string
    return strList;
}

/**
 * Refreshes the Staking Rewards table, charts and related information
 */
export async function updateStakingRewardsGUI() {
    const cNet = getNetwork();

    // Prevent the user from spamming refreshes
    if (cNet.rewardsSyncing) return;

    // Load rewards from the network, displaying the sync spin icon until finished
    doms.domGuiStakingLoadMoreIcon.classList.add('fa-spin');
    const arrRewards = await cNet.getStakingRewards();
    doms.domGuiStakingLoadMoreIcon.classList.remove('fa-spin');

    // Check if all rewards are loaded
    if (cNet.areRewardsComplete) {
        // Hide the load more button
        doms.domGuiStakingLoadMore.style.display = 'none';
    }

    // Display total rewards from known history
    const nRewards = arrRewards.reduce((a, b) => a + b.amount, 0);
    doms.domStakingRewardsTitle.innerHTML = `${
        cNet.areRewardsComplete ? '' : '≥'
    }${sanitizeHTML(nRewards)} ${cChainParams.current.TICKER}`;

    // Create and render the Activity List
    doms.domStakingRewardsList.innerHTML = createActivityListHTML(arrRewards);
}

/**
 * Open the Explorer in a new tab for the loaded master public key
 */
export async function openExplorer() {
    if (masterKey.isHD) {
        const derivationPath = getDerivationPath(masterKey.isHardwareWallet)
            .split('/')
            .slice(0, 4)
            .join('/');
        const xpub = await masterKey.getxpub(derivationPath);
        window.open(cExplorer.url + '/xpub/' + xpub, '_blank');
    } else {
        const address = await masterKey.getAddress();
        window.open(cExplorer.url + '/address/' + address, '_blank');
    }
}

async function loadImages() {
    const images = [
        ['mpw-main-logo', import('../assets/logo.png')],
        ['privateKeyImage', import('../assets/key.png')],
        ['img-governance', import('../assets/img_governance.png')],
        ['img-pos', import('../assets/img_pos.png')],
        ['img-privacy', import('../assets/img_privacy.png')],
        ['img-slider-bars', import('../assets/img_slider_bars.png')],
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

    // Focus on the coin input box (if no pre-fill was specified)
    if (nAmount <= 0) {
        doms.domSendAmountCoins.focus();
    }
}

export function hideAllWalletOptions() {
    // Hide and Reset the Vanity address input
    doms.domPrefix.value = '';
    doms.domPrefix.style.display = 'none';

    // Hide all "*Wallet" buttons
    doms.domGenerateWallet.style.display = 'none';
    doms.domImportWallet.style.display = 'none';
    doms.domGenVanityWallet.style.display = 'none';
    doms.domAccessWallet.style.display = 'none';
    doms.domGenHardwareWallet.style.display = 'none';
}

async function govVote(hash, voteCode) {
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
                createAlert(
                    'warning',
                    'Your masternode is not enabled yet!',
                    6000
                );
                return;
            }
            const result = await cMasternode.vote(hash.toString(), voteCode); //1 yes 2 no
            if (result.includes('Voted successfully')) {
                //good vote
                cMasternode.storeVote(hash.toString(), voteCode);
                await updateGovernanceTab();
                createAlert('success', 'Vote submitted!', 6000);
            } else if (result.includes('Error voting :')) {
                //If you already voted return an alert
                createAlert(
                    'warning',
                    'You already voted for this proposal! Please wait 1 hour',
                    6000
                );
            } else if (result.includes('Failure to verify signature.')) {
                //wrong masternode private key
                createAlert(
                    'warning',
                    "Failed to verify signature, please check your masternode's private key",
                    6000
                );
            } else {
                //this could be everything
                console.error(result);
                createAlert(
                    'warning',
                    'Internal error, please try again later',
                    6000
                );
            }
        } else {
            createAlert('warning', 'Access a masternode before voting!', 6000);
        }
    }
}

/**
 * Start a Masternode via a signed network broadcast
 * @param {boolean} fRestart - Whether this is a Restart or a first Start
 */
export async function startMasternode(fRestart = false) {
    const database = await Database.getInstance();
    const cMasternode = await database.getMasternode(masterKey);
    if (cMasternode) {
        if (
            masterKey.isViewOnly &&
            !(await restoreWallet('Unlock to start your Masternode!'))
        )
            return;
        if (await cMasternode.start()) {
            createAlert(
                'success',
                '<b>Masternode ' + (fRestart ? 're' : '') + 'started!</b>',
                4000
            );
        } else {
            createAlert(
                'warning',
                '<b>Failed to ' +
                    (fRestart ? 're' : '') +
                    'start masternode!</b>',
                4000
            );
        }
    }
}

export async function destroyMasternode() {
    const database = await Database.getInstance();

    if (await database.getMasternode(masterKey)) {
        database.removeMasternode(masterKey);
        createAlert(
            'success',
            '<b>Masternode destroyed!</b><br>Your coins are now spendable.',
            5000
        );
        updateMasternodeTab();
    }
}

/**
 * Takes an ip address and adds the port.
 * If it's an IPv4 address, ip:port will be used, (e.g. 127.0.0.1:12345)
 * If it's an IPv6 address, [ip]:port will be used, (e.g. [::1]:12345)
 * @param {String} ip - Ip address with or without port
 * @returns {String}
 */
function parseIpAddress(ip) {
    // IPv4 without port
    if (ip.match(/\d+\.\d+\.\d+\.\d+/)) {
        return `${ip}:${cChainParams.current.MASTERNODE_PORT}`;
    }
    // IPv4 with port
    if (ip.match(/\d+\.\d+\.\d+\.\d+:\d+/)) {
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
        createAlert('warning', 'The ip address is invalid!', 5000);
        return;
    }

    let collateralTxId;
    let outidx;
    let collateralPrivKeyPath;
    doms.domMnIP.value = '';
    doms.domMnPrivateKey.value = '';

    if (!masterKey.isHD) {
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
                createAlert(
                    'warning',
                    'You need <b>' +
                        (cChainParams.current.collateralInSats -
                            getBalance(false)) /
                            COIN +
                        ' more ' +
                        cChainParams.current.TICKER +
                        '</b> to create a Masternode!',
                    10000
                );
            } else {
                // Balance is capable of a masternode, just needs to be created
                // TODO: this UX flow is weird, is it even possible? perhaps we can re-design this entire function accordingly
                createAlert(
                    'warning',
                    'You have enough balance for a Masternode, but no valid collateral UTXO of ' +
                        cChainParams.current.collateralInSats / COIN +
                        ' ' +
                        cChainParams.current.TICKER,
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
            return createAlert(
                'warning',
                'This is not a suitable UTXO for a Masternode',
                10000
            );
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
        doms.domPrivKey.placeholder = 'Enter your wallet password';
        doms.domImportWalletText.innerText = 'Unlock Wallet';
        doms.domPrivKey.focus();
    }
}
/**
 * An event function triggered apon private key UI input changes
 *
 * Useful for adjusting the input types or displaying password prompts depending on the import scheme
 */
export async function onPrivateKeyChanged() {
    if (await hasEncryptedWallet()) return;
    // Check whether the string is Base64 (would likely be an MPW-encrypted import)
    // and it doesn't have any spaces (would be a mnemonic seed)
    const fContainsSpaces = doms.domPrivKey.value.includes(' ');
    doms.domPrivKeyPassword.hidden =
        (doms.domPrivKey.value.length < 128 ||
            !isBase64(doms.domPrivKey.value)) &&
        !fContainsSpaces;

    doms.domPrivKeyPassword.placeholder = fContainsSpaces
        ? 'Optional Passphrase'
        : 'Password';
    // Uncloak the private input IF spaces are detected, to make Seed Phrases easier to input and verify
    doms.domPrivKey.setAttribute('type', fContainsSpaces ? 'text' : 'password');
}

/**
 * Imports a wallet using the GUI input, handling decryption via UI
 */
export async function guiImportWallet() {
    const fEncrypted =
        doms.domPrivKey.value.length >= 128 && isBase64(doms.domPrivKey.value);

    // If we are in testnet: prompt an import
    if (cChainParams.current.isTestnet) return importWallet();

    // If we don't have a DB wallet and the input is plain: prompt an import
    if (!(await hasEncryptedWallet()) && !fEncrypted) return importWallet();

    // If we don't have a DB wallet and the input is ciphered:
    const strPrivKey = doms.domPrivKey.value;
    const strPassword = doms.domPrivKeyPassword.value;
    if (!(await hasEncryptedWallet()) && fEncrypted) {
        const strDecWIF = await decrypt(strPrivKey, strPassword);
        if (!strDecWIF || strDecWIF === 'decryption failed!') {
            return createAlert('warning', ALERTS.FAILED_TO_IMPORT, [], 6000);
        } else {
            await importWallet({
                newWif: strDecWIF,
                // Save the public key to disk for future View Only mode post-decryption
                fSavePublicKey: true,
            });
            const database = await Database.getInstance();
            if (masterKey) {
                database.addAccount({
                    publicKey: await masterKey.keyToExport,
                    encWif: strPrivKey,
                });
            }
            return;
        }
    }
    // Prompt for decryption of the existing wallet
    const fHasWallet = await decryptWallet(doms.domPrivKey.value);

    // If the wallet was successfully loaded, hide all options and load the dash!
    if (fHasWallet) hideAllWalletOptions();
}

export function guiEncryptWallet() {
    // Disable wallet encryption in testnet mode
    if (cChainParams.current.isTestnet)
        return createAlert(
            'warning',
            ALERTS.TESTNET_ENCRYPTION_DISABLED,
            [],
            2500
        );

    // Fetch our inputs, ensure they're of decent entropy + match eachother
    const strPass = doms.domEncryptPasswordFirst.value,
        strPassRetype = doms.domEncryptPasswordSecond.value;
    if (strPass.length < MIN_PASS_LENGTH)
        return createAlert(
            'warning',
            ALERTS.PASSWORD_TOO_SMALL,
            [{ MIN_PASS_LENGTH: MIN_PASS_LENGTH }],
            4000
        );
    if (strPass !== strPassRetype)
        return createAlert('warning', ALERTS.PASSWORD_DOESNT_MATCH, [], 2250);
    encryptWallet(strPass);
    createAlert('success', ALERTS.NEW_PASSWORD_SUCCESS, [], 5500);

    $('#encryptWalletModal').modal('hide');

    doms.domWipeWallet.hidden = false;
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
            if (masterKey.isViewOnly) {
                exportHidden = false;
            } else {
                doms.domExportPrivateKey.innerHTML = masterKey.keyToBackup;
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
            ALERTS.UNSUPPORTED_CHARACTER,
            [{ char: char }],
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
    doms.domVanityUiButtonTxt.innerText = 'Create A Vanity Wallet';
    clearInterval(vanUiUpdater);
}

export async function generateVanityWallet() {
    if (isVanityGenerating) return stopSearch();
    if (typeof Worker === 'undefined')
        return createAlert('error', ALERTS.UNSUPPORTED_WEBWORKERS, [], 7500);
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
                    ALERTS.UNSUPPORTED_CHARACTER,
                    [{ char: char }],
                    3500
                );
            // We also don't want users to be mining addresses for years... so cap the letters to four until the generator is more optimized
            if (doms.domPrefix.value.length > 5)
                return createAlert(
                    'warning',
                    ALERTS.UNSUPPORTED_CHARACTER,
                    [{ char: char }],
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
                    doms.domGuiBalance.innerHTML = '0';
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
 *  The mode of the Promo system: Redeem when true - Create when false.
 */
let fPromoRedeem = true;

/**
 * Sets the mode of the PIVX Promos UI
 * @param {boolean} fMode - `true` to redeem, `false` to create
 */
export async function setPromoMode(fMode) {
    fPromoRedeem = fMode;

    // Modify the UI to match the mode
    if (fPromoRedeem) {
        // Swap the buttons
        doms.domRedeemCodeModeRedeemBtn.style.opacity = '0.5';
        doms.domRedeemCodeModeRedeemBtn.style.cursor = 'default';
        doms.domRedeemCodeModeCreateBtn.style.opacity = '0.8';
        doms.domRedeemCodeModeCreateBtn.style.cursor = 'pointer';

        // Show the redeem box, hide create box
        doms.domRedeemCodeUse.style.display = '';
        doms.domRedeemCodeCreate.style.display = 'none';

        // Set the title and confirm button
        doms.domRedeemTitle.innerText = 'Redeem Code';
        doms.domRedeemCodeConfirmBtn.innerText = 'Redeem';

        // Hide table
        doms.domPromoTable.classList.add('d-none');

        // Show smooth table animation
        setTimeout(() => {
            doms.domPromoTable.style.maxHeight = '0px';
        }, 100);
    } else {
        // Swap the buttons
        doms.domRedeemCodeModeRedeemBtn.style.opacity = '0.8';
        doms.domRedeemCodeModeRedeemBtn.style.cursor = 'pointer';
        doms.domRedeemCodeModeCreateBtn.style.opacity = '0.5';
        doms.domRedeemCodeModeCreateBtn.style.cursor = 'default';

        // Show the redeem box, hide create box
        doms.domRedeemCodeUse.style.display = 'none';
        doms.domRedeemCodeCreate.style.display = '';

        // Set the title and confirm button
        doms.domRedeemTitle.innerText = 'Create Code';
        doms.domRedeemCodeConfirmBtn.innerText = 'Create';

        // Render saved codes
        const cCodes = await renderSavedPromos();

        // Show animation when promo creation thread has 1 or more items
        if (arrPromoCreationThreads.length || cCodes.codes) {
            // Show table
            doms.domRedeemCodeCreatePendingList.innerHTML = cCodes.html;
            doms.domPromoTable.classList.remove('d-none');

            // Refresh the Promo UI
            await updatePromoCreationTick();

            // Show smooth table animation
            setTimeout(() => {
                doms.domPromoTable.style.maxHeight = '600px';
            }, 100);
        }
    }
}

/**
 * The GUI handler function for hitting the promo modal 'Confirm' button
 */
export function promoConfirm() {
    if (fPromoRedeem) {
        redeemPromoCode(doms.domRedeemCodeInput.value);
    } else {
        // Show table
        doms.domPromoTable.classList.remove('d-none');

        // Show smooth table animation
        setTimeout(() => {
            doms.domPromoTable.style.maxHeight = '600px';
        }, 100);

        createPromoCode(
            doms.domRedeemCodeCreateInput.value,
            Number(doms.domRedeemCodeCreateAmountInput.value)
        );
    }
}

/**
 * A list of promo creation threads, each thread works on a unique code
 * @type {Array<Worker>}
 */
const arrPromoCreationThreads = [];

/**
 * A lock for updating promo-creation related UI and threads
 */
let fPromoIntervalStarted = false;

/**
 * Create a new 'PIVX Promos' code with a webworker
 * @param {string} strCode - The Promo Code to create
 * @param {number} nAmount - The Promo Code amount in coins
 */
export async function createPromoCode(strCode, nAmount) {
    // Ensure there's no more than half the device's cores used
    if (arrPromoCreationThreads.length >= navigator.hardwareConcurrency) return;

    // Create a new thread
    const cThread = {
        code: strCode,
        amount: nAmount,
        thread: new Worker(new URL('./promos_worker.js', import.meta.url)),
        txid: '',
        update: function (evt) {
            if (evt.data.type === 'progress') {
                this.progress = evt.data.res.progress;
            } else {
                this.key = evt.data.res.bytes;
            }
        },
        end_state: '',
    };

    // Setup it's internal update function
    cThread.thread.onmessage = cThread.update;

    // Start the thread
    cThread.thread.postMessage(strCode);

    // Push to the global threads list
    arrPromoCreationThreads.push(cThread);

    // Refresh the promo UI
    await updatePromoCreationTick();
}

export async function deletePromoCode(strCode) {
    // Delete any ongoing threads
    const nThread = arrPromoCreationThreads.findIndex(
        (a) => a.code === strCode
    );
    if (nThread >= 0) {
        // Terminate the Web Worker
        arrPromoCreationThreads[nThread].thread.terminate();
        // Remove the thread from memory
        arrPromoCreationThreads.splice(nThread, 1);
    }

    // Delete the database entry, if it exists
    const db = await Database.getInstance();
    await db.removePromo(strCode);

    // Re-render promos
    await updatePromoCreationTick();
}

/**
 * A pair of code quantity and HTML
 * @typedef {Object} RenderedPromoPair
 * @property {number} codes - The number of codes returned in the response.
 * @property {string} html - The HTML string returned in the response.
 */

/**
 * Render locally-saved Promo Codes in the created list
 * @type {Promise<RenderedPromoPair>} - The code count and HTML pair
 */
export async function renderSavedPromos() {
    // Begin rendering our list of codes
    let strHTML = '';

    // Finished or 'Saved' codes are hoisted to the top, static
    const db = await Database.getInstance();
    const arrCodes = await db.getAllPromos();
    for (const cCode of arrCodes) {
        // Sync only the balance of the code (not full data)
        await cCode.getUTXOs(false);
        const nBal = (await cCode.getBalance(true)) / COIN;

        // A code younger than ~2 minutes without a balance will just say 'confirming', since Blockbook does not return a balance for NEW codes
        const fNew = cCode.time.getTime() > Date.now() - 120000;

        strHTML += `
            <tr>
                <td><i class="fa-solid fa-ban ptr" onclick="MPW.deletePromoCode('${
                    cCode.code
                }')"></i></td>
                <td>${cCode.code}</td>
                <td>${
                    fNew ? '...' : nBal + ' ' + cChainParams.current.TICKER
                }</td>
                <td>${
                    fNew ? 'Confirming...' : nBal > 0 ? 'Unclaimed' : 'Claimed'
                }</td>
            </tr>
        `;
    }

    // Return how many codes were rendered
    return { codes: arrCodes.length, html: strHTML };
}

/**
 * Handle the Promo Workers, Code Rendering, and update or prompt the UI appropriately
 */
export async function updatePromoCreationTick() {
    /* Animated counter function */
    function progressAnimateTick(i, target, el) {
        if (i <= target) {
            el.innerHTML = i;
            // Cancel once at 100%
            if (target === 100) return;
            // Otherwise, recursively callback
            setTimeout(() => {
                progressAnimateTick(i + 1, target, el);
            }, 100);
        }
    }

    // Begin rendering our list of codes
    const cSavedCodes = await renderSavedPromos();
    let strHTML = cSavedCodes.html;

    // Loop all threads, displaying their progress
    let oldPercentage = 0;
    for (const cThread of arrPromoCreationThreads) {
        // Check if the code is derived, if so, fill it with it's balance
        if (cThread.thread.key && !cThread.end_state) {
            const strAddress = deriveAddress({ pkBytes: cThread.thread.key });

            // Ensure no unlock prompt is already active, if it is, hide the promo modal too
            if (fPromptActive) {
                return $('#redeemCodeModal').modal('hide');
            }

            // Ensure the wallet is unlocked
            if (masterKey.isViewOnly) {
                if (await restoreWallet('Unlock to send your transaction!')) {
                    // Unlocked! Re-show the promo UI and continue
                    $('#redeemCodeModal').modal('show');
                } else {
                    // Failed to unlock, so just mark as cancelled
                    return (cThread.end_state = 'Cancelled');
                }
            }

            // Send the fill transaction
            const res = await createAndSendTransaction({
                address: strAddress,
                amount: cThread.amount * COIN + 10000,
            }).catch((_) => {
                // Failed to create this code - mark it as errored
                cThread.end_state = 'Errored';
            });
            if (res && res.ok) {
                cThread.txid = res.txid;
                cThread.end_state = 'Done';
            } else {
                // If it looks like it was purposefully cancelled, then mark it as such
                cThread.end_state = 'Cancelled';
            }
        }

        // The 'state' is either a percentage to completion, the TXID, or an arbitrary state (error, etc)
        let strState = '';
        if (cThread.txid) {
            // Complete state
            strState = 'Confirming...';
        } else if (cThread.end_state) {
            // Errored state (failed to broadcast, etc)
            strState = cThread.end_state;
        } else {
            // Display progress
            strState =
                '<span id="c' +
                cThread.code +
                '">' +
                (cThread.thread.progress || 0) +
                '</span>%';
        }

        // Render the table row
        strHTML += `
            <tr>
                <td><i class="fa-solid fa-ban ptr" onclick="MPW.deletePromoCode('${cThread.code}')"></i></td>
                <td>${cThread.code}</td>
                <td>${cThread.amount} ${cChainParams.current.TICKER}</td>
                <td>${strState}</td>
            </tr>
        `;

        // Only update after we have a little progress, but not yet complete
        if (cThread.thread.progress >= 5 && !cThread.end_state) {
            oldPercentage = Number(
                document.getElementById(`c${cThread.code}`).innerHTML
            );
        }
    }

    // Render the compiled HTML
    doms.domRedeemCodeCreatePendingList.innerHTML = strHTML;

    const db = await Database.getInstance();
    for (const cThread of arrPromoCreationThreads) {
        if (cThread.end_state === 'Done') {
            // Convert to PromoWallet
            const cPromo = new PromoWallet({
                code: cThread.code,
                address: deriveAddress({ pkBytes: cThread.thread.key }),
                pkBytes: cThread.thread.key,
                // For storage, UTXOs are not necessary, so are left empty
                utxos: [],
                time: Date.now(),
            });

            // Save to DB
            await db.addPromo(cPromo);

            // Terminate and destroy the thread
            cThread.thread.terminate();
            arrPromoCreationThreads.splice(
                arrPromoCreationThreads.findIndex(
                    (a) => a.code === cThread.code
                ),
                1
            );
        } else {
            progressAnimateTick(
                oldPercentage,
                cThread.thread.progress,
                document.getElementById(`c${cThread.code}`)
            );
        }
    }

    // After the update completes, await another update in one second
    if (!fPromoIntervalStarted) {
        fPromoIntervalStarted = true;
        setTimeout(updatePromoCreationTick, 1000);
    }
}

export class PromoWallet {
    /**
     * @param {object} data - An object containing the PromoWallet data
     * @param {string} data.code - The human-readable Promo Code
     * @param {string} data.address - The public key associated with the Promo Code
     * @param {Uint8Array} data.pkBytes - The private key bytes derived from the Promo Code
     * @param {Date|number} data.time - The Date or timestamp the code was created
     * @param {Array<object>} data.utxos - UTXOs associated with the Promo Code
     */
    constructor({ code, address, pkBytes, utxos, time }) {
        /** @type {string} The human-readable Promo Code */
        this.code = code;
        /** @type {string} The public key associated with the Promo Code */
        this.address = address;
        /** @type {Uint8Array} The private key bytes derived from the Promo Code */
        this.pkBytes = pkBytes;
        /** @type {Array<object>} UTXOs associated with the Promo Code */
        this.utxos = utxos;
        /** @type {Date|number} The Date or timestamp the code was created */
        this.time = time instanceof Date ? time : new Date(time);
    }

    /**
     * Synchronise UTXOs and return the balance of the Promo Code
     * @param {boolean} - Whether to use UTXO Cache, or sync from network
     * @returns {Promise<number>} - The Promo Wallet balance in sats
     */
    async getBalance(fCacheOnly = false) {
        // Refresh our UTXO set
        if (!fCacheOnly) {
            await this.getUTXOs();
        }

        // Return the sum of the set
        return this.utxos.reduce((a, b) => a + b.sats, 0);
    }

    /**
     * Synchronise UTXOs and return them
     * @param {boolean} - Whether to sync simple UTXOs or full UTXOs
     * @returns {Promise<Array<object>>}
     */
    async getUTXOs(fFull = false) {
        // If we don't have it, derive the public key from the promo code's WIF
        if (!this.address) {
            this.address = deriveAddress({ pkBytes: this.pkBytes });
        }

        // Check for UTXOs on the explorer
        const arrSimpleUTXOs = await getNetwork().getUTXOs(this.address);

        // Either format the simple UTXOs, or additionally sync the full UTXOs with scripts
        this.utxos = [];
        for (const cUTXO of arrSimpleUTXOs) {
            if (fFull) {
                this.utxos.push(await getNetwork().getUTXOFullInfo(cUTXO));
            } else {
                this.utxos.push({
                    id: cUTXO.txid,
                    sats: parseInt(cUTXO.value),
                    vout: cUTXO.vout,
                });
            }
        }

        // Return the UTXO set
        return this.utxos;
    }
}

/**
 * The global storage for temporary Promo Code wallets, this is used for sweeping funds
 * @type {PromoWallet}
 */
export let cPromoWallet = null;

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

/**
 * A sweep wrapper that handles the Promo UI after the sweep completes
 */
export async function sweepPromoCode() {
    // Only allow clicking if there's a promo code loaded in memory
    if (!cPromoWallet) return false;

    // Convert the Promo Wallet in to a LegacyMasterkey
    const cSweepMasterkey = new LegacyMasterKey({
        pkBytes: cPromoWallet.pkBytes,
    });

    // Perform sweep
    const strTXID = await sweepAddress(
        await cPromoWallet.getUTXOs(true),
        cSweepMasterkey,
        10000
    );

    // Display the promo redeem results, then schedule a reset of the UI
    if (strTXID) {
        // Coins were redeemed!
        const nAmt = ((await cPromoWallet.getBalance(true)) - 10000) / COIN;
        doms.domRedeemCodeETA.innerHTML =
            '<br><br>You redeemed <b>' +
            nAmt.toLocaleString('en-GB') +
            ' ' +
            cChainParams.current.TICKER +
            '!</b>';
        resetRedeemPromo(15);
    } else {
        // Most likely; this TX was claimed very recently and a mempool conflict occurred
        doms.domRedeemCodeETA.innerHTML =
            '<br><br>Oops, this code was valid, but someone may have claimed it seconds earlier!';
        doms.domRedeemCodeGiftIcon.classList.remove('fa-gift');
        doms.domRedeemCodeGiftIcon.classList.remove('fa-solid');
        doms.domRedeemCodeGiftIcon.classList.add('fa-face-frown');
        doms.domRedeemCodeGiftIcon.classList.add('fa-regular');
        resetRedeemPromo(7.5);
    }
}

/**
 * Resets the 'Redeem' promo code system back to it's default state
 * @param {number} nSeconds - The seconds to wait until the full reset
 */
function resetRedeemPromo(nSeconds = 5) {
    // Nuke the in-memory Promo Wallet
    cPromoWallet = null;

    // Reset Promo UI
    doms.domRedeemCodeInput.value = '';
    doms.domRedeemCodeGiftIcon.classList.remove('ptr');
    doms.domRedeemCodeGiftIcon.classList.remove('fa-shake');

    // After the specified seconds, reset the UI fully, and wipe the Promo Wallet
    setTimeout(() => {
        doms.domRedeemCodeETA.innerHTML = '';
        doms.domRedeemCodeInputBox.style.display = '';
        doms.domRedeemCodeGiftIconBox.style.display = 'none';
        doms.domRedeemCodeGiftIcon.classList.add('fa-gift');
        doms.domRedeemCodeGiftIcon.classList.add('fa-solid');
        doms.domRedeemCodeGiftIcon.classList.remove('fa-face-frown');
        doms.domRedeemCodeGiftIcon.classList.remove('fa-regular');
        doms.domRedeemCodeConfirmBtn.style.display = '';
    }, nSeconds * 1000);
}

/**
 * @type {Worker?} - The thread used for the PIVX Promos redeem process
 */
let promoThread = null;

/**
 * Derive a 'PIVX Promos' code with a webworker
 * @param {string} strCode - The Promo Code to derive
 */
export async function redeemPromoCode(strCode) {
    // Ensure a Promo Code is not already being redeemed
    if (promoThread) return;

    // Create a new thread
    promoThread = new Worker(new URL('./promos_worker.js', import.meta.url));

    // Hide unnecessary UI components
    doms.domRedeemCodeInputBox.style.display = 'none';
    doms.domRedeemCodeConfirmBtn.style.display = 'none';

    // Display Progress data and Redeem Animations
    doms.domRedeemCodeETA.style.display = '';
    doms.domRedeemCodeGiftIconBox.style.display = '';
    doms.domRedeemCodeGiftIcon.classList.add('fa-bounce');

    // Listen for and report derivation progress
    promoThread.onmessage = async (evt) => {
        if (evt.data.type === 'progress') {
            doms.domRedeemCodeProgress.style.display = '';
            doms.domRedeemCodeETA.innerHTML =
                '<br><br>' +
                evt.data.res.eta.toFixed(0) +
                's remaining to unwrap...<br><br>' +
                evt.data.res.progress +
                '%';
            doms.domRedeemCodeProgress.value = evt.data.res.progress;
        } else {
            // The finished key!
            promoThread.terminate();
            promoThread = null;

            // Pause animations and finish 'unwrapping' by checking the derived Promo Key for a balance
            doms.domRedeemCodeGiftIcon.classList.remove('fa-bounce');
            doms.domRedeemCodeProgress.style.display = 'none';
            doms.domRedeemCodeETA.innerHTML = '<br><br>Final checks...';

            // Prepare the global Promo Wallet
            cPromoWallet = new PromoWallet({
                code: strCode,
                address: '',
                pkBytes: evt.data.res.bytes,
                utxos: [],
                time: 0,
            });

            // Derive the Public Key and synchronise UTXOs from the network
            const nBalance = await cPromoWallet.getBalance();

            // Display if the code is Valid (has coins) or is empty
            if (nBalance > 0) {
                doms.domRedeemCodeGiftIcon.classList.add('fa-shake');
                doms.domRedeemCodeETA.innerHTML =
                    '<br><br>This code is <b>verified!</b> Tap the gift to open it!';
                doms.domRedeemCodeGiftIcon.classList.add('ptr');
            } else {
                doms.domRedeemCodeETA.innerHTML =
                    '<br><br>This code had no balance!';
                doms.domRedeemCodeGiftIcon.classList.remove('fa-gift');
                doms.domRedeemCodeGiftIcon.classList.remove('fa-solid');
                doms.domRedeemCodeGiftIcon.classList.add('fa-face-frown');
                doms.domRedeemCodeGiftIcon.classList.add('fa-regular');
                resetRedeemPromo();
            }
        }
    };

    // Send our 'Promo Code' to be derived on a separate thread, allowing a faster and non-blocking derivation
    promoThread.postMessage(strCode);
}

/**
 * Prompt a QR scan for a PIVX Promos code
 */
export async function openPromoQRScanner() {
    const cScan = await scanQRCode();

    if (!cScan || !cScan.data) return;

    // Enter the scanned code in to the redeem box
    doms.domRedeemCodeInput.value = cScan.data;
}

export function toggleDropDown(id) {
    const domID = document.getElementById(id);
    domID.style.display = domID.style.display === 'block' ? 'none' : 'block';
}

export function askForCSAddr(force = false) {
    if (force) cachedColdStakeAddr = null;
    if (cachedColdStakeAddr === '' || cachedColdStakeAddr === null) {
        cachedColdStakeAddr = prompt(
            'Please provide a Cold Staking address (either from your own node, or a 3rd-party!)'
        ).trim();
        if (cachedColdStakeAddr) return true;
    } else {
        return true;
    }
    return false;
}

export function isMasternodeUTXO(cUTXO, cMasternode) {
    if (cMasternode?.collateralTxId) {
        const { collateralTxId, outidx } = cMasternode;
        return collateralTxId === cUTXO.id && cUTXO.vout === outidx;
    } else {
        return false;
    }
}

export async function wipePrivateData() {
    const isEncrypted = await hasEncryptedWallet();
    const title = isEncrypted
        ? 'Do you want to lock your wallet?'
        : 'Do you want to wipe your wallet private data?';
    const html = isEncrypted
        ? 'You will need to enter your password to access your funds'
        : "You will lose access to your funds if you haven't backed up your private key or seed phrase";
    if (
        await confirmPopup({
            title,
            html,
        })
    ) {
        masterKey.wipePrivateData();
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
            title: 'Unlock your wallet',
            html: `${strHTML}<input type="password" id="restoreWalletPassword" placeholder="Wallet password" style="text-align: center;">`,
        })
    ) {
        // Attempt to unlock the wallet with the provided password
        const strPassword = document.getElementById(
            'restoreWalletPassword'
        ).value;
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

/**
 * Fetch Governance data and re-render the Governance UI
 */
async function updateGovernanceTab() {
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
}

/**
 * Render Governance proposal objects to a given Proposal category
 * @param {Array<object>} arrProposals - The proposals to render
 * @param {boolean} fContested - The proposal category
 */
async function renderProposals(arrProposals, fContested) {
    // Select the table based on the proposal category
    const domTable = fContested
        ? doms.domGovProposalsContestedTableBody
        : doms.domGovProposalsTableBody;

    // Render the proposals in the relevent table
    domTable.innerHTML = '';
    const database = await Database.getInstance();
    const cMasternode = await database.getMasternode();

    if (!fContested) {
        const database = await Database.getInstance();

        const localProposals =
            (await database.getAccount())?.localProposals?.map((p) => {
                return {
                    Name: p.name,
                    URL: p.url,
                    MonthlyPayment: p.monthlyPayment / COIN,
                    RemainingPaymentCount: p.nPayments,
                    TotalPayment: p.nPayments * (p.monthlyPayment / COIN),
                    Yeas: 0,
                    Nays: 0,
                    local: true,
                    Ratio: 0,
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
    for (const cProposal of arrProposals) {
        const domRow = domTable.insertRow();

        // Name and URL hyperlink
        const domNameAndURL = domRow.insertCell();
        // IMPORTANT: Sanitise all of our HTML or a rogue server or malicious proposal could perform a cross-site scripting attack
        domNameAndURL.innerHTML = `<a class="active" href="${sanitizeHTML(
            cProposal.URL
        )}" target="_blank" rel="noopener noreferrer"><b>${sanitizeHTML(
            cProposal.Name
        )}</b></a>`;

        // Payment Schedule and Amounts
        const domPayments = domRow.insertCell();
        domPayments.innerHTML = `<b>${sanitizeHTML(
            cProposal.MonthlyPayment
        )}</b> ${cChainParams.current.TICKER} <br>
      <small> ${sanitizeHTML(
          cProposal['RemainingPaymentCount']
      )} payments remaining of <b>${sanitizeHTML(cProposal.TotalPayment)}</b> ${
            cChainParams.current.TICKER
        } total</small>`;

        // Vote Counts and Consensus Percentages
        const domVoteCounters = domRow.insertCell();
        const { Yeas, Nays } = cProposal;
        const nPercent = cProposal.Ratio * 100;

        domVoteCounters.innerHTML = `<b>${nPercent.toFixed(2)}%</b> <br>
      <small> <b><div class="text-success" style="display:inline;"> ${sanitizeHTML(
          Yeas
      )} </div></b> /
	  <b><div class="text-danger" style="display:inline;"> ${sanitizeHTML(
          Nays
      )} </div></b>
      `;

        // Voting Buttons for Masternode owners (MNOs)
        if (cProposal.local) {
            domRow.insertCell(); // Yes/no missing button
            const finalizeRow = domRow.insertCell();
            const finalizeButton = document.createElement('button');
            finalizeButton.className = 'pivx-button-small';
            finalizeButton.innerHTML = '<i class="fas fa-check"></i>';
            finalizeButton.onclick = async () => {
                const result = await Masternode.finalizeProposal(cProposal.mpw);
                const deleteProposal = async () => {
                    // Remove local Proposal from local storage
                    const database = await Database.getInstance();
                    const account = await database.getAccount();
                    const localProposals = account?.localProposals || [];
                    await database.addAccount({
                        localProposals: localProposals.filter(
                            (p) => p.txId !== cProposal.mpw.txId
                        ),
                    });
                };
                if (result.ok) {
                    createAlert('success', 'Proposal finalized!');
                    deleteProposal();
                    updateGovernanceTab();
                } else {
                    if (result.err === 'unconfirmed') {
                        createAlert(
                            'warning',
                            "The proposal hasn't been confirmed yet.",
                            5000
                        );
                    } else if (result.err === 'invalid') {
                        createAlert(
                            'warning',
                            'The proposal is no longer valid. Create a new one.',
                            5000
                        );
                        deleteProposal();
                        updateGovernanceTab();
                    } else {
                        createAlert('warning', 'Failed to finalize proposal.');
                    }
                }
            };
            finalizeRow.appendChild(finalizeButton);
        } else {
            let btnYesClass = 'pivx-button-big';
            let btnNoClass = 'pivx-button-big';
            if (cProposal.YourVote) {
                if (cProposal.YourVote === 1) {
                    btnYesClass += ' pivx-button-big-yes-gov';
                } else {
                    btnNoClass += ' pivx-button-big-no-gov';
                }
            }
            const domVoteBtns = domRow.insertCell();
            const domNoBtn = document.createElement('button');
            domNoBtn.className = btnNoClass;
            domNoBtn.innerText = 'No';
            domNoBtn.onclick = () => govVote(cProposal.Hash, 2);

            const domYesBtn = document.createElement('button');
            domYesBtn.className = btnYesClass;
            domYesBtn.innerText = 'Yes';
            domYesBtn.onclick = () => govVote(cProposal.Hash, 1);

            domVoteBtns.appendChild(domNoBtn);
            domVoteBtns.appendChild(domYesBtn);

            domRow.insertCell(); // Finalize proposal missing button
        }
    }
}

export async function updateMasternodeTab() {
    //TODO: IN A FUTURE ADD MULTI-MASTERNODE SUPPORT BY SAVING MNs with which you logged in the past.
    // Ensure a wallet is loaded
    doms.domMnTextErrors.innerHTML = '';
    doms.domAccessMasternode.style.display = 'none';
    doms.domCreateMasternode.style.display = 'none';
    doms.domMnDashboard.style.display = 'none';

    if (!masterKey) {
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
    if (!masterKey.isHD) {
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
                doms.domccessMasternode.style.display = 'block';
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
                option.innerText = await masterKey.getAddress(key);
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
    if (debug) console.log(cMasternodeData);

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
        if (!masterKey.isViewOnly) {
            createAlert(
                'warning',
                'Your masternode is offline, we will try to start it',
                6000
            );
            // try to start the masternode
            const started = await cMasternode.start();
            if (started) {
                doms.domMnTextErrors.innerHTML =
                    'Masternode successfully started!';
                createAlert(
                    'success',
                    'Masternode successfully started!, it will be soon online',
                    6000
                );
                const database = await Database.getInstance();
                await database.addMasternode(cMasternode);
            } else {
                doms.domMnTextErrors.innerHTML =
                    "We couldn't start your masternode";
                createAlert(
                    'warning',
                    'We could not start your masternode',
                    6000
                );
            }
        }
    } else if (
        cMasternodeData.status === 'ENABLED' ||
        cMasternodeData.status === 'PRE_ENABLED'
    ) {
        if (fAlert)
            createAlert(
                'success',
                `Your masternode status is <b> ${sanitizeHTML(
                    cMasternodeData.status
                )} </b>`,
                6000
            );
        const database = await Database.getInstance();
        await database.addMasternode(cMasternode);
    } else if (cMasternodeData.status === 'REMOVED') {
        doms.domMnTextErrors.innerHTML =
            'Masternode is currently <b>REMOVED</b>';
        if (fAlert)
            createAlert(
                'warning',
                'Your masternode is in <b>REMOVED</b> state',
                6000
            );
    } else {
        // connection problem
        doms.domMnTextErrors.innerHTML = 'Unable to connect!';
        if (fAlert) createAlert('warning', 'Unable to connect!', 6000);
    }

    // Return the data in case the caller needs additional context
    return cMasternodeData;
}

export async function createProposal() {
    if (!masterKey) {
        return createAlert(
            'warning',
            'Create or import your wallet to continue'
        );
    }
    if (
        masterKey.isViewOnly &&
        !(await restoreWallet('Unlock to create a proposal!'))
    ) {
        return;
    }
    if (getBalance() * COIN < cChainParams.current.proposalFee) {
        return createAlert('warning', 'Not enough funds to create a proposal.');
    }
    await confirmPopup({
        title: `Create Proposal (cost ${
            cChainParams.current.proposalFee / COIN
        } ${cChainParams.current.TICKER})`,
        html: `<input id="proposalTitle" maxlength="20" placeholder="Title" style="text-align: center;"><br>
               <input id="proposalUrl" maxlength="64" placeholder="URL" style="text-align: center;"><br>
               <input type="number" id="proposalCycles" placeholder="Duration in cycles" style="text-align: center;"><br>
               <input type="number" id="proposalPayment" placeholder="${cChainParams.current.TICKER} per cycle" style="text-align: center;"><br>`,
    });
    const strTitle = document.getElementById('proposalTitle').value;
    const strUrl = document.getElementById('proposalUrl').value;
    const numCycles = parseInt(document.getElementById('proposalCycles').value);
    const numPayment = parseInt(
        document.getElementById('proposalPayment').value
    );
    const nextSuperblock = await Masternode.getNextSuperblock();
    const proposal = {
        name: strTitle,
        url: strUrl,
        nPayments: numCycles,
        start: nextSuperblock,
        address: (await getNewAddress())[0],
        monthlyPayment: numPayment * COIN,
    };

    const isValid = Masternode.isValidProposal(proposal);
    if (!isValid.ok) {
        createAlert(
            'warning',
            `Proposal is invalid. Error: ${isValid.err}`,
            5000
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
        const account = await database.getAccount();
        const localProposals = account?.localProposals || [];
        localProposals.push(proposal);
        await database.addAccount({ localProposals });
        createAlert('success', 'Proposal created! Please finalize it.');
        updateGovernanceTab();
    }
}

export function refreshChainData() {
    // If in offline mode: don't sync ANY data or connect to the internet
    if (!getNetwork().enabled)
        return console.warn(
            'Offline mode active: For your security, the wallet will avoid ALL internet requests.'
        );
    if (!masterKey) return;

    // Fetch block count + UTXOs
    getNetwork().getBlockCount();
    getBalance(true);
}

// A safety mechanism enabled if the user attempts to leave without encrypting/saving their keys
export const beforeUnloadListener = (evt) => {
    evt.preventDefault();
    // Disable Save your wallet warning on unload
    if (!cChainParams.current.isTestnet)
        createAlert('warning', ALERTS.SAVE_WALLET_PLEASE, [], 10000);
    // Most browsers ignore this nowadays, but still, keep it 'just incase'
    return (evt.returnValue = translation.BACKUP_OR_ENCRYPT_WALLET);
};

function errorHandler(e) {
    const message = `Unhandled exception. <br> ${sanitizeHTML(
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
