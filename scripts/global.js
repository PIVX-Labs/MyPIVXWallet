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
} from './wallet.js';
import {
    submitAnalytics,
    networkEnabled,
    getBlockCount,
    arrRewards,
    getStakingRewards,
} from './network.js';
import { start as settingsStart, cExplorer, debug } from './settings.js';
import { createAlert, confirmPopup, sanitizeHTML, MAP_B58 } from './misc.js';
import { cChainParams, COIN, MIN_PASS_LENGTH } from './chain_params.js';
import { decrypt } from './aes-gcm.js';

import { registerWorker } from './native.js';

export let doms = {};

export function start() {
    doms = {
        domStart: document.getElementById('start'),
        domNavbarToggler: document.getElementById('navbarToggler'),
        domGuiStaking: document.getElementById('guiStaking'),
        domGuiWallet: document.getElementById('guiWallet'),
        domGuiBalance: document.getElementById('guiBalance'),
        domGuiBalanceTicker: document.getElementById('guiBalanceTicker'),
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
        domGuiDelegateAmount: document.getElementById('delegateAmount'),
        domGuiUndelegateAmount: document.getElementById('undelegateAmount'),
        domTxTab: document.getElementById('txTab'),
        domStakeTab: document.getElementById('stakeTab'),
        domsendNotice: document.getElementById('sendNotice'),
        domSimpleTXs: document.getElementById('simpleTransactions'),
        domSimpleTXsDropdown: document.getElementById(
            'simpleTransactionsDropdown'
        ),
        domAddress1s: document.getElementById('address1s'),
        domValue1s: document.getElementById('value1s'),
        domGuiViewKey: document.getElementById('guiViewKey'),
        domModalQR: document.getElementById('ModalQR'),
        domModalQrLabel: document.getElementById('ModalQRLabel'),
        domPrefix: document.getElementById('prefix'),
        domPrefixNetwork: document.getElementById('prefixNetwork'),
        domWalletToggle: document.getElementById('wToggle'),
        domGenerateWallet: document.getElementById('generateWallet'),
        domGenVanityWallet: document.getElementById('generateVanityWallet'),
        domGenHardwareWallet: document.getElementById('generateHardwareWallet'),
        //GOVERNANCE ELEMENTS
        domGovProposalsTable: document.getElementById('proposalsTable'),
        domGovProposalsTableBody: document.getElementById('proposalsTableBody'),
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
        domTxOutput: document.getElementById('transactionFinal'),
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
        domExportDiv: document.getElementById('exportKeyDiv'),
        domExportPublicKey: document.getElementById('exportPublicKeyText'),
        domExportPrivateKeyHold: document.getElementById('exportPrivateKey'),
        domExportPrivateKey: document.getElementById('exportPrivateKeyText'),
        domExportWallet: document.getElementById('guiExportWallet'),
        domWipeWallet: document.getElementById('guiWipeWallet'),
        domRestoreWallet: document.getElementById('guiRestoreWallet'),
        domNewAddress: document.getElementById('guiNewAddress'),
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
        domNetworkE: document.getElementById('NetworkE'),
        domNetworkD: document.getElementById('NetworkD'),
        domDebug: document.getElementById('Debug'),
        domTestnet: document.getElementById('Testnet'),
        domExplorerSelect: document.getElementById('explorer'),
        domNodeSelect: document.getElementById('node'),
        domTranslationSelect: document.getElementById('translation'),
    };
    i18nStart();
    loadImages();
    doms.domStart.click();

    // Register native app service
    registerWorker();

    // Configure Identicon
    jdenticon.configure();
    // URL-Query request processing
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    let requestTo;
    let requestAmount;
    // Check for a payment request
    if (urlParams.has('pay') && urlParams.has('amount')) {
        requestTo = urlParams.get('pay');
        requestAmount = parseFloat(urlParams.get('amount'));
        console.log(requestTo + ' ' + requestAmount);
        // We have our payment request info, wait until the page is fully loaded then display the payment request via .onload
    }

    // Customise the UI if a saved wallet exists
    if (hasEncryptedWallet()) {
        // Hide the 'Generate wallet' buttons
        doms.domGenerateWallet.style.display = 'none';
        doms.domGenVanityWallet.style.display = 'none';

        const publicKey = localStorage.getItem('publicKey');

        if (publicKey) {
            importWallet({ newWif: publicKey });
        } else {
            // Display the password unlock upfront
            accessOrImportWallet();
        }
    }

    // Payment processor redirect
    if (requestTo && requestAmount) {
        guiPreparePayment(
            requestTo,
            requestAmount,
            urlParams.has('desc') ? urlParams.get('desc') : ''
        );
    }

    // If allowed by settings: submit a simple 'hit' (app load) to Labs Analytics
    submitAnalytics('hit');
    setInterval(refreshChainData, 15000);
    doms.domPrefix.value = '';
    doms.domPrefixNetwork.innerText =
        cChainParams.current.PUBKEY_PREFIX.join(' or ');
    settingsStart();
}

// WALLET STATE DATA
export const mempool = new Mempool();

//                        PIVX Labs' Cold Pool
export let cachedColdStakeAddr = 'SdgQDpS8jDRJDX8yK8m9KnTMarsE84zdsy';

export function openTab(evt, tabName) {
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
    }
    if (tabName === 'Masternode') {
        updateMasternodeTab();
    }
}

export function getBalance(updateGUI = false) {
    const nBalance = mempool.getBalance();

    // Update the GUI too, if chosen
    if (updateGUI) {
        // Set the balance, and adjust font-size for large balance strings
        const nLen = (nBalance / COIN).toFixed(2).length;
        doms.domGuiBalance.innerText = (nBalance / COIN).toFixed(
            nLen >= 6 ? 0 : 2
        );
        doms.domAvailToDelegate.innerText =
            'Available: ~' +
            (nBalance / COIN).toFixed(2) +
            ' ' +
            cChainParams.current.TICKER;

        // Add a notice to the Send page if balance is lacking
        doms.domsendNotice.innerHTML = nBalance
            ? ''
            : '<div class="alert alert-danger" role="alert"><h4>Note:</h4><h5>You don\'t have any funds, get some coins first!</h5></div>';
    }

    return nBalance;
}

export function getStakingBalance(updateGUI = false) {
    const nBalance = mempool.getDelegatedBalance();

    if (updateGUI) {
        // Set the balance, and adjust font-size for large balance strings
        doms.domGuiBalanceStaking.innerText = Math.floor(nBalance / COIN);
        doms.domGuiBalanceBoxStaking.style.fontSize =
            Math.floor(nBalance / COIN).toString().length >= 4
                ? 'large'
                : 'x-large';
        doms.domAvailToUndelegate.innerText =
            'Staking: ~' +
            (nBalance / COIN).toFixed(2) +
            ' ' +
            cChainParams.current.TICKER;
    }

    return nBalance;
}

export function selectMaxBalance(domValueInput, fCold = false) {
    domValueInput.value = (fCold ? getStakingBalance() : getBalance()) / COIN;
}

export function updateStakingRewardsGUI(fCallback = false) {
    if (!arrRewards.length) {
        // This ensures we don't spam network requests, since if a network callback says we have no stakes; no point checking again!
        if (!fCallback) getStakingRewards();
        return;
    }
    //DOMS.DOM-optimised list generation
    const strList = arrRewards
        .map(
            (cReward) =>
                `<i style="opacity: 0.75; cursor: pointer" onclick="window.open('${
                    cExplorer.url + '/tx/' + cReward.id
                }', '_blank')">${new Date(
                    cReward.time * 1000
                ).toLocaleDateString()}</i> <b>+${cReward.amount} ${
                    cChainParams.current.TICKER
                }</b>`
        )
        .join('<br>');
    // Calculate total
    const nRewards = arrRewards.reduce(
        (total, reward) => total + reward.amount,
        0
    );
    // UpdateDOMS.DOM
    doms.domStakingRewardsTitle.innerHTML = `Staking Rewards: ≥${nRewards} ${cChainParams.current.TICKER}`;
    doms.domStakingRewardsList.innerHTML = strList;
}

async function loadImages() {
    // Promise.all is useless since we only need to load one image, but we might need to load more in the future
    Promise.all([
        (async () => {
            document.getElementById('mpw-main-logo').src = (
                await import('../assets/logo.png')
            ).default;
        })(),
    ]);
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
    const domCopy = document.getElementById(source);

    // Use an invisible textbox as the clipboard source
    const domClipboard = document.getElementById('clipboard');
    domClipboard.value = domCopy.value || domCopy.innerHTML;
    domClipboard.select();
    domClipboard.setSelectionRange(0, 99999);

    // Browser-dependent clipboard execution
    if (!navigator.clipboard) {
        document.execCommand('copy');
    } else {
        navigator.clipboard.writeText(domCopy.innerHTML);
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

export function guiPreparePayment(strTo = '', strAmount = 0, strDesc = '') {
    doms.domTxTab.click();
    if (doms.domSimpleTXs.style.display === 'none')
        doms.domSimpleTXsDropdown.click();
    // Apply values
    doms.domAddress1s.value = strTo;
    doms.domValue1s.value = strAmount;
    doms.domReqDesc.value = strDesc;
    doms.domReqDisplay.style.display = strDesc ? 'block' : 'none';
    doms.domValue1s.focus();
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
        if (localStorage.getItem('masternode')) {
            const cMasternode = new Masternode(
                JSON.parse(localStorage.getItem('masternode'))
            );
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

export async function startMasternode(fRestart = false) {
    if (localStorage.getItem('masternode')) {
        if (masterKey.isViewOnly) {
            return createAlert(
                'warning',
                "Can't start masternode in view only mode",
                6000
            );
        }
        const cMasternode = new Masternode(
            JSON.parse(localStorage.getItem('masternode'))
        );
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

export function destroyMasternode() {
    if (localStorage.getItem('masternode')) {
        localStorage.removeItem('masternode');
        createAlert(
            'success',
            '<b>Masternode destroyed!</b><br>Your coins are now spendable.',
            5000
        );
        updateMasternodeTab();
    }
}

export async function importMasternode() {
    const mnPrivKey = doms.domMnPrivateKey.value;

    const ip = doms.domMnIP.value;
    let address;
    let collateralTxId;
    let outidx;
    let collateralPrivKeyPath;
    doms.domMnIP.value = '';
    doms.domMnPrivateKey.value = '';

    if (!ip.includes(':')) {
        address = `${ip}:${cChainParams.current.MASTERNODE_PORT}`;
    } else {
        address = ip;
    }

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

export function accessOrImportWallet() {
    // Hide and Reset the Vanity address input
    doms.domPrefix.value = '';
    doms.domPrefix.style.display = 'none';

    // Show Import button, hide access button
    doms.domImportWallet.style.display = 'block';
    doms.domAccessWalletBtn.style.display = 'none';

    // If we have a local wallet, display the decryption prompt
    // This is no longer being used, as the user will be put in view-only
    // mode when logging in, however if the user locked the wallet before
    // #52 there would be no way to recover the public key without getting
    // The password from the user
    if (hasEncryptedWallet()) {
        doms.domPrivKey.placeholder = 'Enter your wallet password';
        doms.domImportWalletText.innerText = 'Unlock Wallet';
        doms.domPrivKey.focus();
    }
}

export function onPrivateKeyChanged() {
    if (hasEncryptedWallet()) return;
    // Check whether the length of the string is 128 bytes (that's the length of ciphered plain texts)
    // and it doesn't have any spaces (would be a mnemonic seed)
    const fContainsSpaces = doms.domPrivKey.value.includes(' ');
    doms.domPrivKeyPassword.hidden =
        doms.domPrivKey.value.length !== 128 || fContainsSpaces;

    // Uncloak the private input IF spaces are detected, to make Seed Phrases easier to input and verify
    doms.domPrivKey.setAttribute('type', fContainsSpaces ? 'text' : 'password');
}

export async function guiImportWallet() {
    const fEncrypted = doms.domPrivKey.value.length === 128;

    // If we are in testnet: prompt an import
    if (cChainParams.current.isTestnet) return importWallet();

    // If we don't have a DB wallet and the input is plain: prompt an import
    if (!hasEncryptedWallet() && !fEncrypted) return importWallet();

    // If we don't have a DB wallet and the input is ciphered:
    const strPrivKey = doms.domPrivKey.value;
    const strPassword = doms.domPrivKeyPassword.value;
    if (!hasEncryptedWallet() && fEncrypted) {
        const strDecWIF = await decrypt(strPrivKey, strPassword);
        if (!strDecWIF || strDecWIF === 'decryption failed!') {
            return createAlert('warning', ALERTS.FAILED_TO_IMPORT, [], 6000);
        } else {
            localStorage.setItem('encwif', strPrivKey);
            return importWallet({
                newWif: strDecWIF,
            });
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

    // Show our inputs if we haven't already
    if (doms.domEncryptPasswordBox.style.display === 'none') {
        // Return the display to it's class form
        doms.domEncryptPasswordBox.style.display = '';
        doms.domEncryptBtnTxt.innerText = 'Finish Encryption';
    } else {
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
            return createAlert(
                'warning',
                ALERTS.PASSWORD_DOESNT_MATCH,
                [],
                2250
            );
        encryptWallet(strPass);
        createAlert('success', ALERTS.NEW_PASSWORD_SUCCESS, [], 5500);
    }
}

export async function toggleExportUI() {
    doms.domExportDiv.hidden = !doms.domExportDiv.hidden;
    if (!doms.domExportDiv.hidden) {
        if (hasEncryptedWallet()) {
            doms.domExportPrivateKey.innerText = localStorage.getItem('encwif');
            doms.domExportPrivateKeyHold.hidden = false;
        } else {
            if (masterKey.isViewOnly) {
                doms.domExportPrivateKeyHold.hidden = true;
            } else {
                doms.domExportPrivateKey.innerText = masterKey.keyToBackup;
                doms.domExportPrivateKeyHold.hidden = false;
            }
        }

        doms.domExportPublicKey.innerText = await masterKey.keyToExport;
    } else {
        doms.domExportPrivateKey.innerText = '';
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
        doms.domGenKeyWarning.style.display = 'none';
        doms.domGuiAddress.innerHTML = '~';
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
                    doms.domGuiBalanceBox.style.fontSize = 'x-large';
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

export function isMasternodeUTXO(cUTXO, masternode = null) {
    const cMasternode =
        masternode || JSON.parse(localStorage.getItem('masternode'));
    if (cMasternode) {
        const { collateralTxId, outidx } = cMasternode;
        return collateralTxId === cUTXO.id && cUTXO.vout === outidx;
    } else {
        return false;
    }
}

export async function wipePrivateData() {
    const title = hasEncryptedWallet()
        ? 'Do you want to lock your wallet?'
        : 'Do you want to wipe your wallet private data?';
    const html = hasEncryptedWallet()
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
        if (hasEncryptedWallet()) {
            doms.domRestoreWallet.hidden = false;
        }
    }
}

export async function restoreWallet() {
    if (
        await confirmPopup({
            title: 'Unlock your wallet',
            html: '<input type="password" id="restoreWalletPassword" placeholder="Wallet password">',
        })
    ) {
        const password = document.getElementById('restoreWalletPassword').value;
        if (await decryptWallet(password)) {
            doms.domRestoreWallet.hidden = true;
            doms.domWipeWallet.hidden = false;
        }
    }
}

async function updateGovernanceTab() {
    const proposals = await Masternode.getProposals();
    doms.domGovProposalsTableBody.innerHTML = '';
    for (const proposal of proposals) {
        if (proposal.RemainingPaymentCount === 0) {
            continue;
        }
        const tr = doms.domGovProposalsTableBody.insertRow();
        const td1 = tr.insertCell();
        // IMPORTANT: We must sanite all of our HTML or a rogue server or malicious proposal could perform a cross side scripting attack
        td1.innerHTML = `<a class="active" href="${sanitizeHTML(
            proposal.URL
        )}"><b>${sanitizeHTML(proposal.Name)}</b></a>`;
        const td2 = tr.insertCell();
        td2.innerHTML = `<b>${sanitizeHTML(proposal.MonthlyPayment)}</b> ${
            cChainParams.current.TICKER
        } <br>
      <small> ${sanitizeHTML(
          proposal['RemainingPaymentCount']
      )} payments remaining of <b>${sanitizeHTML(proposal.TotalPayment)}</b> ${
            cChainParams.current.TICKER
        } total</small>`;
        const td3 = tr.insertCell();
        let { Yeas, Nays } = proposal;
        Yeas = parseInt(Yeas);
        Nays = parseInt(Nays);
        const percentage = Yeas + Nays !== 0 ? (Yeas / (Yeas + Nays)) * 100 : 0;

        td3.innerHTML = `<b>${percentage.toFixed(2)}%</b> <br>
      <small> <b><div class="text-success" style="display:inline;"> ${Yeas} </div></b> /
	  <b><div class="text-danger" style="display:inline;"> ${Nays} </div></b>
      `;
        const td4 = tr.insertCell();
        //append vote buttons
        const buttonNo = document.createElement('button');
        buttonNo.className = 'pivx-button-big';
        buttonNo.innerText = 'No';
        buttonNo.onclick = () => govVote(proposal.Hash, 2);

        const buttonYes = document.createElement('button');
        buttonYes.className = 'pivx-button-big';
        buttonYes.innerText = 'Yes';
        buttonYes.onclick = () => govVote(proposal.Hash, 1);

        td4.appendChild(buttonNo);
        td4.appendChild(buttonYes);
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
            (hasEncryptedWallet() ? 'unlock' : 'import') +
            ' your <b>COLLATERAL WALLET</b> first.';
        return;
    }

    if (masterKey.isHardwareWallet) {
        doms.domMnTxId.style.display = 'none';
        doms.domMnTextErrors.innerHTML = 'Ledger is not yet supported';
        return;
    }

    if (!mempool.getConfirmed().length) {
        doms.domMnTextErrors.innerHTML =
            'Your wallet is empty or still loading, re-open the tab in a few seconds!';
        return;
    }

    let strMasternodeJSON = localStorage.getItem('masternode');
    // If the collateral is missing (spent, or switched wallet) then remove the current MN
    if (strMasternodeJSON) {
        const cMasternode = JSON.parse(strMasternodeJSON);
        if (
            !mempool
                .getConfirmed()
                .find((utxo) => isMasternodeUTXO(utxo, cMasternode))
        ) {
            localStorage.removeItem('masternode');
            strMasternodeJSON = null;
        }
    }

    doms.domControlMasternode.style.display = strMasternodeJSON
        ? 'block'
        : 'none';

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
            if (strMasternodeJSON) {
                const cMasternode = new Masternode(
                    JSON.parse(localStorage.getItem('masternode'))
                );
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
        if (!strMasternodeJSON && fHasCollateral) {
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
        if (fHasCollateral && strMasternodeJSON) {
            const cMasternode = new Masternode(JSON.parse(strMasternodeJSON));
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
                localStorage.setItem('masternode', JSON.stringify(cMasternode));
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
        localStorage.setItem('masternode', JSON.stringify(cMasternode));
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

export function refreshChainData() {
    // If in offline mode: don't sync ANY data or connect to the internet
    if (!networkEnabled)
        return console.warn(
            'Offline mode active: For your security, the wallet will avoid ALL internet requests.'
        );
    if (!masterKey) return;

    // Play reload anim
    doms.domBalanceReload.classList.add('playAnim');
    doms.domBalanceReloadStaking.classList.add('playAnim');

    // Fetch block count + UTXOs
    getBlockCount();
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
