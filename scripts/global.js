import { Mempool } from "./mempool.js";
import { en_translation } from "../locale/en/translation.js";
import { uwu_translation } from "../locale/uwu/translation.js";
import { translate } from "./i18n.js";

// TRANSLATION
//Create an object of objects filled with all the translations
const translatableLanguages = {
    "en": en_translation,
    "uwu": uwu_translation
}
export async function openTab(evt, tabName) {
    // Hide all screens and deactivate link highlights
    for (const domScreen of arrDomScreens) domScreen.style.display = "none";
    for (const domLink of arrDomScreenLinks) domLink.classList.remove("active");

    // Show and activate the given screen
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.classList.add("active");
    
    // Close the navbar if it's not already closed
    if (!domNavbarToggler.className.includes("collapsed"))
        domNavbarToggler.click();
    
    if (tabName === "Governance") {
	updateGovernanceTab();
    }
    if (tabName==="Masternode") {
	updateMasternodeTab();
    }  
    
}

export let translation = {};
export function start() {
let localTranslation = localStorage.getItem('translation')
// Check if set in local storage
if(localTranslation != null){
    translation = translatableLanguages[localTranslation];
}else{
    // Check if we support the user's browser locale
    if (arrActiveLangs.includes(strLang)) {
        translation = translatableLanguages[strLang]
    }else{
        // Default to EN if the locale isn't supported yet
        console.log("i18n: Your language (" + strLang + ") is not supported yet, if you'd like to contribute translations (for rewards!) contact us on GitHub or Discord!")
        translation = en_translation
    }
}
translate(translation);

// WALLET STATE DATA
const mempool = new Mempool();
let arrRewards = [];
let cachedBlockCount = 0;
//                        PIVX Labs' Cold Pool
let cachedColdStakeAddr = "SdgQDpS8jDRJDX8yK8m9KnTMarsE84zdsy";

const domStart = document.getElementById("start");
const domNavbarToggler = document.getElementById("navbarToggler");
const domGuiStaking = document.getElementById('guiStaking');
    const domGuiWallet = document.getElementById('guiWallet');
    const domGuiBalance = document.getElementById("guiBalance");
    const domGuiBalanceTicker = document.getElementById("guiBalanceTicker");
    const domGuiBalanceBox = document.getElementById("guiBalanceBox");
    const domBalanceReload = document.getElementById("balanceReload");
    const domBalanceReloadStaking = document.getElementById("balanceReloadStaking");
    const domGuiBalanceStaking = document.getElementById("guiBalanceStaking");
    const domGuiBalanceStakingTicker = document.getElementById("guiBalanceStakingTicker");
    const domGuiStakingLoadMore = document.getElementById("stakingLoadMore");
    const domGuiStakingLoadMoreIcon = document.getElementById("stakingLoadMoreIcon");
    const domGuiBalanceBoxStaking = document.getElementById("guiBalanceBoxStaking");
    const domGuiDelegateAmount = document.getElementById('delegateAmount');
    const domGuiUndelegateAmount = document.getElementById('undelegateAmount');
    const domTxTab = document.getElementById("txTab");
    const domStakeTab = document.getElementById("stakeTab");
    const domsendNotice = document.getElementById("sendNotice");
    const domSimpleTXs = document.getElementById("simpleTransactions");
    const domSimpleTXsDropdown = document.getElementById("simpleTransactionsDropdown");
    const domAddress1s = document.getElementById("address1s");
    const domValue1s = document.getElementById("value1s");
    const domGuiViewKey = document.getElementById('guiViewKey');
    const domModalQR = document.getElementById('ModalQR');
    const domModalQrLabel = document.getElementById('ModalQRLabel');
    const domPrefix = document.getElementById('prefix');
    const domPrefixNetwork = document.getElementById('prefixNetwork');
    const domWalletToggle = document.getElementById("wToggle");
    const domGenerateWallet = document.getElementById('generateWallet');
    const domGenVanityWallet = document.getElementById('generateVanityWallet');
    const domGenHardwareWallet = document.getElementById('generateHardwareWallet');
    //GOVERNANCE ELEMENTS
    const domGovProposalsTable = document.getElementById('proposalsTable');
    const domGovProposalsTableBody = document.getElementById('proposalsTableBody');
    //MASTERNODE ELEMENTS
    const domCreateMasternode = document.getElementById('createMasternode');
    const domControlMasternode = document.getElementById('controlMasternode')
    const domAccessMasternode = document.getElementById('accessMasternode');
    const domMnAccessMasternodeText = document.getElementById('accessMasternodeText');
    const domMnCreateType = document.getElementById('mnCreateType');
    const domMnTextErrors = document.getElementById('mnTextErrors');
    const domMnIP = document.getElementById('mnIP');
    const domMnTxId = document.getElementById('mnTxId');
    const domMnPrivateKey = document.getElementById('mnPrivateKey');
    const domMnDashboard = document.getElementById('mnDashboard');
    const domMnProtocol = document.getElementById('mnProtocol');
    const domMnStatus = document.getElementById('mnStatus');
    const domMnNetType = document.getElementById('mnNetType');
    const domMnNetIP = document.getElementById('mnNetIP');
    const domMnLastSeen = document.getElementById('mnLastSeen');

    const domAccessWallet = document.getElementById('accessWallet');
    const domImportWallet = document.getElementById('importWallet');
    const domImportWalletText = document.getElementById('importWalletText');
    const domAccessWalletBtn = document.getElementById('accessWalletBtn');
    const domVanityUiButtonTxt = document.getElementById("vanButtonText");
    const domGenKeyWarning = document.getElementById('genKeyWarning');
    const domEncryptWarningTxt = document.getElementById('encryptWarningText');
    const domEncryptBtnTxt = document.getElementById('encryptButton');
    const domEncryptPasswordBox = document.getElementById('encryptPassword');
    const domEncryptPasswordFirst = document.getElementById('newPassword');
    const domEncryptPasswordSecond = document.getElementById('newPasswordRetype');
    const domGuiAddress = document.getElementById('guiAddress');
    const domGenIt = document.getElementById("genIt");
    const domHumanReadable = document.getElementById("HumanReadable");
    const domTxOutput = document.getElementById("transactionFinal");
    const domReqDesc = document.getElementById('reqDesc');
    const domReqDisplay = document.getElementById('reqDescDisplay');
    const domIdenticon = document.getElementById("identicon");
    const domPrivKey = document.getElementById("privateKey");
    const domPrivKeyPassword = document.getElementById("privateKeyPassword");
    const domAvailToDelegate = document.getElementById('availToDelegate');
    const domAvailToUndelegate = document.getElementById('availToUndelegate');
    const domAnalyticsDescriptor = document.getElementById('analyticsDescriptor');
    const domStakingRewardsList = document.getElementById('staking-rewards-content');
    const domStakingRewardsTitle = document.getElementById('staking-rewards-title');
    const domMnemonicModalContent = document.getElementById("ModalMnemonicContent");
    const domMnemonicModalButton = document.getElementById("modalMnemonicConfirmButton");
    const domExportDiv = document.getElementById("exportKeyDiv");
    const domExportPublicKey = document.getElementById("exportPublicKeyText");
    const domExportPrivateKeyHold = document.getElementById("exportPrivateKey");
    const domExportPrivateKey = document.getElementById("exportPrivateKeyText");
    const domExportWallet = document.getElementById("guiExportWallet");
    const domWipeWallet = document.getElementById("guiWipeWallet");
    const domRestoreWallet = document.getElementById("guiRestoreWallet");
    const domNewAddress = document.getElementById("guiNewAddress");
    const domConfirmModalHeader = document.getElementById("confirmModalHeader");
    const domConfirmModalTitle = document.getElementById("confirmModalTitle");
    const domConfirmModalContent = document.getElementById("confirmModalContent");
    const domConfirmModalButtons = document.getElementById("confirmModalButtons");
    const domConfirmModalConfirmButton = document.getElementById("confirmModalConfirmButton");
    const domConfirmModalCancelButton = document.getElementById("confirmModalCancelButton");
	  
    const masternodeLegacyAccessText='Access the masternode linked to this address<br> Note: the masternode MUST have been already created (however it can be online or offline)<br>  If you want to create a new masternode access with a HD wallet'
    const masternodeHDAccessText="Access your masternodes if you have any! If you don't you can create one"
    // Aggregate menu screens and links for faster switching
    const arrDomScreens = document.getElementsByClassName("tabcontent");
    const arrDomScreenLinks = document.getElementsByClassName("tablinks");
// Alert DOM element
const domAlertPos = document.getElementsByClassName("alertPositioning")[0];

function getBalance(updateGUI = false) {
    const nBalance = mempool.getBalance();
    
    // Update the GUI too, if chosen
    if (updateGUI) {
        // Set the balance, and adjust font-size for large balance strings
        const nLen = (nBalance / COIN).toFixed(2).length;
        domGuiBalance.innerText = (nBalance / COIN).toFixed(nLen >= 6 ? 0 : 2);
        domAvailToDelegate.innerText = "Available: ~" + (nBalance / COIN).toFixed(2) + " " + cChainParams.current.TICKER;
        
        // Add a notice to the Send page if balance is lacking
        domsendNotice.innerHTML = nBalance ? '' : '<div class="alert alert-danger" role="alert"><h4>Note:</h4><h5>You don\'t have any funds, get some coins first!</h5></div>';
    }

    return nBalance;
}

function getStakingBalance(updateGUI = false) {
    const nBalance = mempool.getDelegatedBalance();
    
    if (updateGUI) {
        // Set the balance, and adjust font-size for large balance strings
        domGuiBalanceStaking.innerText = Math.floor(nBalance / COIN);
        domGuiBalanceBoxStaking.style.fontSize = Math.floor(nBalance / COIN).toString().length >= 4 ? "large" : "x-large";
        domAvailToUndelegate.innerText = "Staking: ~" + (nBalance / COIN).toFixed(2) + " " + cChainParams.current.TICKER;
    }

    return nBalance;
}

function selectMaxBalance(domValueInput, fCold = false) {
    domValueInput.value = (fCold ? getStakingBalance() : getBalance()) / COIN;
}

function updateStakingRewardsGUI(fCallback = false) {
    if (!arrRewards.length) {
        // This ensures we don't spam network requests, since if a network callback says we have no stakes; no point checking again!
        if (!fCallback) getStakingRewards();
        return;
    }
    // DOM-optimised list generation
    const strList = arrRewards.map(cReward => `<i style="opacity: 0.75; cursor: pointer" onclick="window.open('${cExplorer.url + '/tx/' + cReward.id}', '_blank')">${new Date(cReward.time * 1000).toLocaleDateString()}</i> <b>+${cReward.amount} ${cChainParams.current.TICKER}</b>`).join("<br>");
    // Calculate total
    const nRewards = arrRewards.reduce((total, reward) => total + reward.amount, 0);
    // Update DOM
    domStakingRewardsTitle.innerHTML = `Staking Rewards: ≥${nRewards} ${cChainParams.current.TICKER}`;
    domStakingRewardsList.innerHTML = strList;
}

// URL-Query request processing
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
let requestTo;
let requestAmount;
// Check for a payment request
if (urlParams.has('pay') && urlParams.has('amount')) {
    requestTo     = urlParams.get('pay');
    requestAmount = parseFloat(urlParams.get('amount'));
    console.log(requestTo + " " + requestAmount);
    // We have our payment request info, wait until the page is fully loaded then display the payment request via .onload
}

let audio = null;
function playMusic() {
    // On first play: load the audio into memory from the host
    if (audio === null) audio = new Audio('assets/music.mp3');

    // Play or Pause
    if (audio.paused || audio.ended) {
        audio.play();
        for (const domImg of document.getElementsByTagName('img')) domImg.classList.add("discoFilter");
    } else {
        audio.pause();
        for (const domImg of document.getElementsByTagName('img')) domImg.classList.remove("discoFilter");
    }
}

function toClipboard(source, caller) {
    // Fetch the text/value source
    const domCopy = document.getElementById(source);

    // Use an invisible textbox as the clipboard source
    const domClipboard = document.getElementById('clipboard');
    domClipboard.value = domCopy.value || domCopy.innerHTML;
    domClipboard.select();
    domClipboard.setSelectionRange(0, 99999);

    // Browser-dependent clipboard execution
    if (!navigator.clipboard) {
        document.execCommand("copy");
    } else {
        navigator.clipboard.writeText(domCopy.innerHTML);
    }

    // Display a temporary checkmark response
    caller.classList.add("fa-check");
    caller.classList.remove("fa-clipboard");
    caller.style.cursor = "default";
    setTimeout(() => {
        caller.classList.add("fa-clipboard");
        caller.classList.remove("fa-check");
        caller.style.cursor = "pointer";
    }, 1000);
}

function guiPreparePayment(strTo = "", strAmount = 0, strDesc = "") {
    domTxTab.click();
    if (domSimpleTXs.style.display === 'none')
        domSimpleTXsDropdown.click();
    // Apply values
    domAddress1s.value = strTo;
    domValue1s.value = strAmount;
    domReqDesc.value = strDesc;
    domReqDisplay.style.display = strDesc ? 'block' : 'none';
    domValue1s.focus();
}

function hideAllWalletOptions() {
    // Hide and Reset the Vanity address input
    domPrefix.value = "";
    domPrefix.style.display = 'none';

    // Hide all "*Wallet" buttons
    domGenerateWallet.style.display = 'none';
    domImportWallet.style.display = 'none';
    domGenVanityWallet.style.display = 'none';
    domAccessWallet.style.display = 'none';
    domGenHardwareWallet.style.display = 'none';
}

async function govVote(hash, voteCode){
    if (await confirmPopup({
        title: ALERTS.CONFIRM_POPUP_VOTE,
        html: ALERTS.CONFIRM_POPUP_VOTE_HTML,
    }) == true) {
        if(localStorage.getItem("masternode")){
            const cMasternode = new Masternode(JSON.parse(localStorage.getItem("masternode")));
            if (await cMasternode.getStatus() !== "ENABLED") {
		createAlert("warning","Your masternode is not enabled yet!", 6000);
		return;
            }
            const result = await cMasternode.vote(hash.toString(), voteCode); //1 yes 2 no
            if (result.includes("Voted successfully")) { //good vote
		createAlert('success', 'Vote submitted!', 6000);
            } else if(result.includes("Error voting :")) { //If you already voted return an alert
		createAlert('warning', 'You already voted for this proposal! Please wait 1 hour', 6000);
            } else if(result.includes("Failure to verify signature.")) { //wrong masternode private key
		createAlert('warning', 'Failed to verify signature, please check your masternode\'s private key', 6000);
            } else { //this could be everything
	        console.error(result);
		createAlert('warning', 'Internal error, please try again later', 6000);
            }
        } else {
            createAlert('warning', 'Access a masternode before voting!', 6000);
        }
    }
}

async function startMasternode(fRestart = false) {
    if (localStorage.getItem("masternode")) {
	if (masterKey.isViewOnly) {
	    return createAlert("warning", "Can't start masternode in view only mode", 6000);
	}
        const cMasternode = new Masternode(JSON.parse(localStorage.getItem("masternode")));
        if (await cMasternode.start()) {
            createAlert('success', '<b>Masternode ' + (fRestart ? 're' : '') + 'started!</b>', 4000);
        } else {
            createAlert('warning', '<b>Failed to ' + (fRestart ? 're' : '') + 'start masternode!</b>', 4000);
        }
    }
}

function destroyMasternode() {
    if (localStorage.getItem("masternode")) {
        localStorage.removeItem("masternode");
        createAlert('success', '<b>Masternode destroyed!</b><br>Your coins are now spendable.', 5000);
        updateMasternodeTab();
    }
}

async function createMasternode() {
    if (masterKey.isViewOnly) {
        return createAlert("warning", "Can't create a masternode in view only mode", 6000);
    }
    const fGeneratePrivkey = domMnCreateType.value === "VPS";
    const [strAddress,strAddressPath] = await getNewAddress();
    const nValue = cChainParams.current.collateralInSats;
    
    const nBalance = getBalance();
    const cTx = bitjs.transaction();
    const cCoinControl = chooseUTXOs(cTx, nValue, 0, false);
    
    if (!cCoinControl.success) return alert(cCoinControl.msg);
    // Compute fee
    const nFee = getFee(cTx.serialize().length);
    
    // Compute change (or lack thereof)
    const nChange = cCoinControl.nValue - (nFee + nValue);
    const [changeAddress,changeAddressPath] = await getNewAddress({verify: masterKey.isHardwareWallet});
    const outputs = [];
    if (nChange > 0) {
        // Change output
        outputs.push([changeAddress, nChange / COIN]);
    } else {
	return createAlert("warning", "You don't have enough " + cChainParams.current.TICKER + " to create a masternode", 5000);
    }
    
    // Primary output (receiver)
    outputs.push([strAddress, nValue / COIN]);
    
    // Debug-only verbose response
    if (debug) domHumanReadable.innerHTML = "Balance: " + (nBalance / COIN) + "<br>Fee: " + (nFee / COIN) + "<br>To: " + strAddress + "<br>Sent: " + (nValue / COIN) + (nChange > 0 ? "<br>Change Address: " + changeAddress + "<br>Change: " + (nChange / COIN) : "");

    // Add outputs to the Tx
    for (const output of outputs) {
        cTx.addoutput(output[0], output[1]);
    }

    // Sign and broadcast!
    if (!masterKey.isHardwareWallet) {
        const sign = await cTx.sign(masterKey, 1);
        const result = await sendTransaction(sign);
        if(result){
            for(const tx of cTx.inputs){
		mempool.autoRemoveUTXO({id: tx.outpoint.hash,path: tx.path,vout: tx.outpoint.index})
            }
            const futureTxid=swapHEXEndian(await hash(Crypto.util.hexToBytes((await hash((Crypto.util.hexToBytes(sign)))))));
            mempool.addUTXO({id: futureTxid,path: changeAddressPath,sats: nChange,vout: 0,script:Crypto.util.bytesToHex(cTx.outputs[0].script),status: Mempool.PENDING})
            mempool.addUTXO({id: futureTxid,path: strAddressPath,script:Crypto.util.bytesToHex(cTx.outputs[1].script),sats: nValue,vout: 1,status: Mempool.PENDING})
        }
    } else {
        // Format the inputs how the Ledger SDK prefers
        const arrInputs = [];
        const arrAssociatedKeysets = [];
        for (const cInput of cTx.inputs) {
            const cInputFull = await getTxInfo(cInput.outpoint.hash);
            arrInputs.push([await cHardwareWallet.splitTransaction(cInputFull.hex), cInput.outpoint.index]);
            arrAssociatedKeysets.push(cInput.path);
        }
        const cLedgerTx = await cHardwareWallet.splitTransaction(cTx.serialize());
        const strOutputScriptHex = await cHardwareWallet
              .serializeTransactionOutputs(cLedgerTx)
              .toString("hex");

        // Sign the transaction via Ledger
        const strSerialisedTx = await confirmPopup(
            {
		title: ALERTS.CONFIRM_POPUP_TRANSACTION,
		html: createTxConfirmation(outputs),
		resolvePromise: cHardwareWallet.createPaymentTransactionNew({
		    inputs: arrInputs,
		    associatedKeysets: arrAssociatedKeysets,
		    outputScriptHex: strOutputScriptHex,
		}),
            }
        );

        // Broadcast the Hardware (Ledger) TX
        const result = await sendTransaction(strSerialisedTx);
        if(result){
            for(const tx of cTx.inputs){
		mempool.autoRemoveUTXO({id: tx.outpoint.hash,path: tx.path,vout: tx.outpoint.index})
            }
            const futureTxid=swapHEXEndian(await hash(Crypto.util.hexToBytes((await hash((Crypto.util.hexToBytes(strSerialisedTx)))))));
            mempool.addUTXO({id: futureTxid,path: changeAddressPath,sats: nChange,vout: 0,script:Crypto.util.bytesToHex(cTx.outputs[0].script),status: Mempool.PENDING});
            mempool.addUTXO({id: futureTxid,path: strAddressPath,script:Crypto.util.bytesToHex(cTx.outputs[1].script),sats: nValue,vout: 1,status: Mempool.PENDING});
        }
        
    }
    if(fGeneratePrivkey){
        let masternodePrivateKey= await generateMnPrivkey();
        await confirmPopup({
            title: ALERTS.CONFIRM_POPUP_MN_P_KEY,
            html: masternodePrivateKey + ALERTS.CONFIRM_POPUP_MN_P_KEY_HTML, 
        });
    }
    createAlert("success", "<b>Masternode Created!<b><br>Wait 15 confirmations to proceed further");
    // Remove any previous Masternode data, if there were any
    localStorage.removeItem("masternode");
}
async function importMasternode(){
    const mnPrivKey = domMnPrivateKey.value;
    
    const ip = domMnIP.value;
    let address;
    let collateralTxId;
    let outidx;
    let collateralPrivKeyPath;
    domMnIP.value = "";
    domMnPrivateKey.value = "";

    if (!ip.includes(":")) {
	address = `${ip}:${cChainParams.current.MASTERNODE_PORT}`;
    } else {
	address = ip;
    }
    
    if (!masterKey.isHD) {
        // Find the first UTXO matching the expected collateral size
        const cCollaUTXO = mempool.getConfirmed().find(cUTXO => cUTXO.sats === cChainParams.current.collateralInSats);

        // If there's no valid UTXO, exit with a contextual message
        if (!cCollaUTXO) {
            if (getBalance(false) < cChainParams.current.collateralInSats) {
		// Not enough balance to create an MN UTXO
		createAlert("warning", "You need <b>" + ((cChainParams.current.collateralInSats - getBalance(false)) / COIN) + " more " + cChainParams.current.TICKER + "</b> to create a Masternode!", 10000);
            } else {
		// Balance is capable of a masternode, just needs to be created
		// TODO: this UX flow is weird, is it even possible? perhaps we can re-design this entire function accordingly
		createAlert("warning", "You have enough balance for a Masternode, but no valid collateral UTXO of " + (cChainParams.current.collateralInSats / COIN) + " " + cChainParams.current.TICKER, 10000);
            }
            return;
        }

        collateralTxId = cCollaUTXO.id;
        outidx = cCollaUTXO.vout;
        collateralPrivKeyPath = "legacy";
    } else {
        const path = domMnTxId.value;
        const masterUtxo = mempool.getConfirmed().findLast(u=>u.path === path); // first UTXO for each address in HD
        // sanity check:
        if (masterUtxo.sats !== cChainParams.current.collateralInSats) {
            return createAlert("warning", "This is not a suitable UTXO for a Masternode", 10000);
        }
        collateralTxId = masterUtxo.id;
        outidx = masterUtxo.vout;
        collateralPrivKeyPath = path;     
    }
    domMnTxId.value = "";

    
    const cMasternode = new Masternode({
        walletPrivateKeyPath: collateralPrivKeyPath,
        mnPrivateKey: mnPrivKey,
        collateralTxId: collateralTxId,
        outidx: outidx,
        addr: address
    });
    await refreshMasternodeData(cMasternode, true);
    await updateMasternodeTab();
}

function accessOrImportWallet() {
    // Hide and Reset the Vanity address input
    domPrefix.value = "";
    domPrefix.style.display = 'none';

    // Show Import button, hide access button
    domImportWallet.style.display = 'block';
    domAccessWalletBtn.style.display = 'none';

    // If we have a local wallet, display the decryption prompt
    // This is no longer being used, as the user will be put in view-only
    // mode when logging in, however if the user locked the wallet before
    // #52 there would be no way to recover the public key without getting
    // The password from the user
    if (hasEncryptedWallet()) {
        domPrivKey.placeholder = 'Enter your wallet password';
        domImportWalletText.innerText = 'Unlock Wallet';
        domPrivKey.focus();
    }
}

function onPrivateKeyChanged() {
    if (hasEncryptedWallet()) return;
    // Check whether the length of the string is 128 bytes (that's the length of ciphered plain texts)
    // and it doesn't have any spaces (would be a mnemonic seed)
    const fContainsSpaces = domPrivKey.value.includes(" ");
    domPrivKeyPassword.hidden = domPrivKey.value.length !== 128 || fContainsSpaces;

    // Uncloak the private input IF spaces are detected, to make Seed Phrases easier to input and verify
    domPrivKey.setAttribute('type', fContainsSpaces ? 'text' : 'password');
}

async function guiImportWallet() {
    const fEncrypted = domPrivKey.value.length === 128;

    // If we are in testnet: prompt an import
    if (cChainParams.current.isTestnet) return importWallet();

    // If we don't have a DB wallet and the input is plain: prompt an import
    if (!hasEncryptedWallet() && !fEncrypted) return importWallet();

    // If we don't have a DB wallet and the input is ciphered: 
    const strPrivKey = domPrivKey.value
    const strPassword = domPrivKeyPassword.value;
    if (!hasEncryptedWallet() && fEncrypted) {
        const strDecWIF = await decrypt(strPrivKey, strPassword);
        if (!strDecWIF || strDecWIF === "decryption failed!") {
            return createAlert('warning', ALERTS.FAILED_TO_IMPORT, [], 6000);
        } else {
            localStorage.setItem("encwif", strPrivKey);
            return importWallet({
		newWif: strDecWIF
            });
        }
    }
    // Prompt for decryption of the existing wallet
    const fHasWallet = await decryptWallet(domPrivKey.value);

    // If the wallet was successfully loaded, hide all options and load the dash!
    if (fHasWallet) hideAllWalletOptions();
}

function guiEncryptWallet() {
    // Disable wallet encryption in testnet mode
    if (cChainParams.current.isTestnet) return createAlert('warning', ALERTS.TESTNET_ENCRYPTION_DISABLED, [], 2500);

    // Show our inputs if we haven't already
    if (domEncryptPasswordBox.style.display === 'none') {
        // Return the display to it's class form
        domEncryptPasswordBox.style.display = '';
        domEncryptBtnTxt.innerText = 'Finish Encryption';
    } else {
        // Fetch our inputs, ensure they're of decent entropy + match eachother
        const strPass = domEncryptPasswordFirst.value,
              strPassRetype = domEncryptPasswordSecond.value;
        if (strPass.length < MIN_PASS_LENGTH) return createAlert('warning', ALERTS.PASSWORD_TOO_SMALL, [{"MIN_PASS_LENGTH" : MIN_PASS_LENGTH}], 4000);
        if (strPass !== strPassRetype) return createAlert('warning', ALERTS.PASSWORD_DOESNT_MATCH, [], 2250);
        encryptWallet(strPass);
        createAlert('success', ALERTS.NEW_PASSWORD_SUCCESS, [], 5500);
    }
}

function createAddressConfirmation(address) {
    return `Please confirm this is the address you see on your ${strHardwareName}.
              <div class="seed-phrase">${address}</div>`;
}

function createTxConfirmation(outputs) {
    let strHtml = "Confirm this transaction matches the one on your " + strHardwareName +  ".";
    for (const output of outputs) {
        strHtml += `<br> <br> You will send <b>${output[1].toFixed(2)} ${cChainParams.current.TICKER}</b> to <div class="inline-address">${output[0]}</div>`
    }
    return strHtml;
}

async function toggleExportUI() {
    domExportDiv.hidden = !domExportDiv.hidden;
    if (!domExportDiv.hidden) {
	if (hasEncryptedWallet()) {
	    domExportPrivateKey.innerText = localStorage.getItem("encwif");
	    domExportPrivateKeyHold.hidden = false;
	} else {
	    if(masterKey.isViewOnly) {
		domExportPrivateKeyHold.hidden = true;
	    } else {
		domExportPrivateKey.innerText = masterKey.keyToBackup;
		domExportPrivateKeyHold.hidden = false;
	    }
	}

	domExportPublicKey.innerText = await masterKey.keyToExport;
    } else {
        domExportPrivateKey.innerText = "";
    }
}

let addressIndex = 0;
async function isYourAddress(address){
    let i=0;
    while(i<addressIndex){
        const path = getDerivationPath(masterKey.isHardwareWallet, 0, 0, i);
        const testAddress = await masterKey.getAddress(path);
        if(address===testAddress){
            return [true,path];
        }
        i++;
    }
    return [false,0];
}
async function getNewAddress({updateGUI = false, verify = false} = {}) {
    const last = lastWallet || 0;
    addressIndex = addressIndex > last ? addressIndex : last + 1;
    if (addressIndex - last > MAX_ACCOUNT_GAP) {
        // If the user creates more than ${MAX_ACCOUNT_GAP} empty wallets we will not be able to sync them!
        addressIndex = last;
    }
    const path = getDerivationPath(masterKey.isHardwareWallet, 0, 0, addressIndex);
    // Use Xpub?
    const address = await masterKey.getAddress(path);
    if (verify && masterKey.isHardwareWallet) {
        // Generate address to present to the user without asking to verify
        const confAddress = await confirmPopup({
            title: ALERTS.CONFIRM_POPUP_VERIFY_ADDR,
            html: createAddressConfirmation(address),
            resolvePromise: masterKey.getAddress(path, { verify })
        });
        if (address !== confAddress) {
            throw new Error("User did not verify address");
        }
    }

    if (updateGUI) {
        domGuiAddress.innerText = address;
        createQR('pivx:' + address, domModalQR);
        domModalQrLabel.innerHTML = 'pivx:' + address;
        domModalQR.firstChild.style.width = "100%";
        domModalQR.firstChild.style.height = "auto";
        domModalQR.firstChild.style.imageRendering = "crisp-edges";
        document.getElementById('clipboard').value = address;
    }
    addressIndex++;
    return [address,path];
}

function checkVanity() {
    var e = event || window.event;  // get event object
    var key = e.keyCode || e.which; // get key cross-browser
    var char = String.fromCharCode(key).trim(); // convert key to char
    if(char.length == 0) return;

    // Ensure the input is base58 compatible
    if (!MAP_B58.toLowerCase().includes(char.toLowerCase())) {
        if (e.preventDefault) e.preventDefault();
        e.returnValue = false;
        return createAlert('warning',ALERTS.UNSUPPORTED_CHARACTER, [{"char" : char}], 3500);
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
    domPrefix.disabled = false;
    domVanityUiButtonTxt.innerText = 'Create A Vanity Wallet';
    clearInterval(vanUiUpdater);
}

async function generateVanityWallet() {
    if (isVanityGenerating) return stopSearch();
    if (typeof(Worker) === "undefined") return createAlert('error', ALERTS.UNSUPPORTED_WEBWORKERS, [], 7500);
    // Generate a vanity address with the given prefix
    if (domPrefix.value.length === 0 || domPrefix.style.display === 'none') {
        // No prefix, display the intro!
        domPrefix.style.display = 'block';
        domGenKeyWarning.style.display = 'none';
        domGuiAddress.innerHTML = "~";
        domPrefix.focus();
    } else {
        // Remove spaces from prefix
        domPrefix.value = domPrefix.value.replace(/ /g, "");

        // Cache a lowercase equivilent for lower-entropy comparisons (a case-insensitive search is ALOT faster!) and strip accidental spaces
        const nInsensitivePrefix = domPrefix.value.toLowerCase();
        const nPrefixLen = nInsensitivePrefix.length;

        // Ensure the input is base58 compatible
        for (const char of domPrefix.value) {
            if (!MAP_B58.toLowerCase().includes(char.toLowerCase())) return createAlert('warning',ALERTS.UNSUPPORTED_CHARACTER, [{"char" : char}], 3500);
        }
        // We also don't want users to be mining addresses for years... so cap the letters to four until the generator is more optimized
        if (domPrefix.value.length > 5) return createAlert('warning', ALERTS.UNSUPPORTED_CHARACTER, [{"char" : char}], 3500);
        isVanityGenerating = true;
        domPrefix.disabled = true;
        let attempts = 0;

        // Setup workers
        const nThreads = Math.max(Math.floor(window.navigator.hardwareConcurrency * 0.75), 1);
        console.log('Spawning ' + nThreads + ' vanity search threads!');
        while (arrWorkers.length < nThreads) {
            arrWorkers.push(new Worker("scripts/vanitygen_worker.js"));
            arrWorkers[arrWorkers.length - 1].onmessage = (event) => checkResult(event.data);
            arrWorkers[arrWorkers.length - 1].postMessage(cChainParams.current.PUBKEY_ADDRESS);
        }

        // GUI Updater
        domVanityUiButtonTxt.innerText = 'Stop (Searched ' + attempts.toLocaleString('en-GB') + ' keys)';
        vanUiUpdater = setInterval(() => {
            domVanityUiButtonTxt.innerText = 'Stop (Searched ' + attempts.toLocaleString('en-GB') + ' keys)';
        }, 200);

        function checkResult(data) {
            attempts++;
            if (data.pub.substr(1, nPrefixLen).toLowerCase() == nInsensitivePrefix) {
		importWallet({
		    newWif: data.priv,
		    fRaw: true
		});
		stopSearch();
		domGuiBalance.innerHTML = "0";
		domGuiBalanceBox.style.fontSize = "x-large";
		return console.log("VANITY: Found an address after " + attempts + " attempts!");
            }
        }
    }
}

function toggleDropDown(id) {
    const domID = document.getElementById(id);
    domID.style.display = domID.style.display === 'block' ? 'none' : 'block';
}

function createAlertWithFalse() {
    createAlert(...arguments);
    return false;
}

function validateAmount(nAmountSats, nMinSats = 10000) {
    // Validate the amount is a valid number, and meets the minimum (if any)
    if (nAmountSats < nMinSats || isNaN(nAmountSats))
        return createAlertWithFalse('warning', ALERTS.INVALID_AMOUNT + ALERTS.VALIDATE_AMOUNT_LOW, [{"minimumAmount" : (nMinSats / COIN)}, {"coinTicker" : cChainParams.current.TICKER}], 2500);

    // Validate the amount in Satoshi terms meets the coin's native decimal depth
    if (!Number.isSafeInteger(nAmountSats))
        return createAlertWithFalse('warning', ALERTS.INVALID_AMOUNT + '<br>' + ALERTS.VALIDATE_AMOUNT_DECIMAL,[{"coinDecimal" : COIN_DECIMALS}], 2500);

    // Amount looks valid!
    return true;
}

function undelegateGUI() {
    if (masterKey.isViewOnly) {
	return createAlert("warning", "Attempting to undelegate in view only mode.", 6000);
    }
    // Verify the amount
    const nAmount = Math.round(Number(domGuiUndelegateAmount.value.trim()) * COIN);
    if(!validateAmount(nAmount)) return;

    undelegate(nAmount);
}

async function undelegate(nValue) {
    if (!hasWalletUnlocked(true)) return;
    
    // Construct a TX and fetch Cold inputs
    const nBalance = getStakingBalance();
    const cTx = bitjs.transaction();
    const cCoinControl = chooseUTXOs(cTx, nValue, 0, true);
    if (!cCoinControl.success) return alert(cCoinControl.msg);

    // Compute fee and change (or lack thereof)
    const nFee = getFee(cTx.serialize().length);
    const nChange = cCoinControl.nValue - (nFee + nValue);
    const fReDelegateChange = nChange > 1.01 * COIN;
    let reDelegateAddress;
    let reDelegateAddressPath;
    if (fReDelegateChange) {
        // Enough change to resume cold staking, so we'll re-delegate change to the cold staking address
        // Ensure the user has an address set - if not, request one!, Sanity
        if (!cachedColdStakeAddr || cachedColdStakeAddr.length !== 34 || !cachedColdStakeAddr.startsWith(cChainParams.current.STAKING_PREFIX)) {
            askForCSAddr(true);
            return createAlert('success', ALERTS.SUCCESS_STAKING_ADDR ,[]);
        }
        // The re-delegated change output
        [reDelegateAddress,reDelegateAddressPath] = await getNewAddress();
        cTx.addcoldstakingoutput(reDelegateAddress, cachedColdStakeAddr, nChange / COIN);
        console.log('Re-delegated delegation spend change!');
    } else {
        // Not enough change to cold stake, so we'll just unstake everything (and deduct the fee from the value)
        nValue -= nFee;
        console.log('Spent all CS dust into redeem address!');
    }

    const [outputKey,outputKeyPath] = await getNewAddress();
    // The primary Cold-to-Public output
    cTx.addoutput(outputKey, nValue / COIN);

    // Debug-only verbose response
    if (debug) domHumanReadable.innerHTML = "Balance: " + (nBalance / COIN) + "<br>Fee: " + (nFee / COIN) + "<br>To: " + outputKey + "<br>Sent: " + (nValue / COIN) + (nChange > 0 ? "<br>Change Address: " + (fReDelegateChange ? cachedColdStakeAddr : outputKey) + "<br>Change: " + (nChange / COIN) : "");

    if (hasHardwareWallet()) {
        // Format the inputs how the Ledger SDK prefers
        const arrInputs = [];
        const arrAssociatedKeysets = [];
        for (const cInput of cTx.inputs) {
            const cInputFull = await getTxInfo(cInput.outpoint.hash);
            arrInputs.push([await cHardwareWallet.splitTransaction(cInputFull.hex), cInput.outpoint.index]);
            arrAssociatedKeysets.push(cInput.path);
        }

        // Construct the Ledger transaction
        const cLedgerTx = await cHardwareWallet.splitTransaction(cTx.serialize());
        const strOutputScriptHex = await cHardwareWallet
              .serializeTransactionOutputs(cLedgerTx)
              .toString("hex");

        // Sign the transaction via Ledger
        createAlert("info", ALERTS.CONFIRM_UNSTAKE_H_WALLET, [{"strHardwareName" : strHardwareName}], 7500);
        const cLedgerSignedTx = await cHardwareWallet.createPaymentTransactionNew({
            inputs: arrInputs,
            associatedKeysets: arrAssociatedKeysets,
            outputScriptHex: strOutputScriptHex,
        });
        const nInputLen = cTx.inputs.length;

        // Put public key bytes instead of [3,195,174...]
        const arrSignedTxBytes = Crypto.util.hexToBytes(cLedgerSignedTx);
        const arrPubkey = findCompressedPubKey(arrSignedTxBytes);
        const arrPubkeyWithScriptLen = addScriptLength(arrSignedTxBytes, arrPubkey, nInputLen);
        const arrPubkeyWithScript = addExtraBytes(arrPubkeyWithScriptLen, arrPubkey, nInputLen);

        const strSerialisedTx = Crypto.util.bytesToHex(arrPubkeyWithScript);

        // Broadcast the Hardware (Ledger) TX
        const result = await sendTransaction(strSerialisedTx, "<b>Delegation successfully spent!</b>");
        if(result){
            for(const tx of cTx.inputs){
		mempool.autoRemoveUTXO({id: tx.outpoint.hash,path: tx.path,vout: tx.outpoint.index})
            }
            // Add our undelegation + change re-delegation (if any) to the local mempool
            const futureTxid=swapHEXEndian(await hash(Crypto.util.hexToBytes((await hash((Crypto.util.hexToBytes(strSerialisedTx)))))));
            if(fReDelegateChange){
		mempool.addUTXO({id: futureTxid,path: reDelegateAddressPath,script:Crypto.util.bytesToHex(cTx.outputs[0].script) ,sats: nChange,vout: 0,status: Mempool.PENDING_COLD});
		mempool.addUTXO({id: futureTxid,path: outputKeyPath,script:Crypto.util.bytesToHex(cTx.outputs[1].script) ,sats: nValue,vout: 1,status: Mempool.PENDING});
            }else{
		mempool.addUTXO({id: futureTxid,path: outputKeyPath,sats: nValue,script:Crypto.util.bytesToHex(cTx.outputs[0].script),vout: 0,status: Mempool.PENDING});
            }
        }
    } else {
        let sign= await cTx.sign(masterKey, 1, 'coldstake');
        // Broadcast the software TX
	
        const result = await sendTransaction(sign, "<b>Delegation successfully spent!</b>");
        if(result){
            for(const tx of cTx.inputs){
		mempool.autoRemoveUTXO({id: tx.outpoint.hash,path: tx.path,vout: tx.outpoint.index})
            }
            // Add our undelegation + change re-delegation (if any) to the local mempool
            const futureTxid=swapHEXEndian(await hash(Crypto.util.hexToBytes((await hash((Crypto.util.hexToBytes(sign)))))));
            if(fReDelegateChange){
		mempool.addUTXO({id: futureTxid,path:reDelegateAddressPath,script:Crypto.util.bytesToHex(cTx.outputs[0].script) ,sats: nChange,vout: 0,status: Mempool.PENDING_COLD});
		mempool.addUTXO({id: futureTxid,path: outputKeyPath,script:Crypto.util.bytesToHex(cTx.outputs[1].script) ,sats: nValue,vout: 1,status: Mempool.PENDING});
            }else{
		mempool.addUTXO({id: futureTxid,path: outputKeyPath,sats: nValue,script:Crypto.util.bytesToHex(cTx.outputs[0].script),vout: 0,status: Mempool.PENDING});
            }
        }
    }

    domGenIt.innerHTML = "Continue";
}

function askForCSAddr(force = false) {
    if (force) cachedColdStakeAddr = null;
    if (cachedColdStakeAddr === "" || cachedColdStakeAddr === null) {
        cachedColdStakeAddr = prompt('Please provide a Cold Staking address (either from your own node, or a 3rd-party!)').trim();
        if (cachedColdStakeAddr) return true;
    } else {
        return true;
    }
    return false;
}

function delegateGUI() {
    if(masterKey.isViewOnly) {
	return createAlert("warning", "Attempting to delegate in view only mode.", 6000);
    }
    // Verify the amount; Delegations must be a minimum of 1 PIV, enforced by the network
    const nAmount = Number(domGuiDelegateAmount.value.trim()) * COIN;
    if (!validateAmount(nAmount, COIN)) return;

    // Ensure the user has an address set - if not, request one!
    if (!askForCSAddr()) return;      

    // Sanity
    if (cachedColdStakeAddr.length !== 34 || !cachedColdStakeAddr.startsWith(cChainParams.current.STAKING_PREFIX)) {
        askForCSAddr(true);
        return createAlert('success', ALERTS.SUCCESS_STAKING_ADDR_SET, []);
    }
    delegate(nAmount, cachedColdStakeAddr);
}

async function delegate(nValue, coldAddr) {
    if (!hasWalletUnlocked(true)) return;

    // Construct a TX and fetch Standard inputs
    const nBalance = getBalance();
    const cTx = bitjs.transaction();
    const cCoinControl = chooseUTXOs(cTx, nValue, 0, false);
    if (!cCoinControl.success) return alert(cCoinControl.msg);

    // Compute fee and change (or lack thereof)
    const nFee = getFee(cTx.serialize().length);
    const nChange = cCoinControl.nValue - (nFee + nValue);
    const [changeAddress,changeAddressPath]= await getNewAddress();
    if (nChange > 0) {
        // Change output
        cTx.addoutput(changeAddress, nChange / COIN);
    } else {
        // We're sending alot! So we deduct the fee from the send amount. There's not enough change to pay it with!
        nValue -= nFee;
    }

    // The primary Standard-to-Cold output
    const [primaryAddress, primaryAddressPath]= await getNewAddress();
    cTx.addcoldstakingoutput(primaryAddress, coldAddr, nValue / COIN);

    // Debug-only verbose response
    if (debug) domHumanReadable.innerHTML = "Balance: " + (nBalance / COIN) + "<br>Fee: " + (nFee / COIN) + "<br>To: " + coldAddr + "<br>Sent: " + (nValue / COIN) + (nChange > 0 ? "<br>Change Address: " + changeAddress + "<br>Change: " + (nChange / COIN) : "");

    // Sign and broadcast!
    if (hasHardwareWallet()) {
        // Format the inputs how the Ledger SDK prefers
        const arrInputs = [];
        const arrAssociatedKeysets = [];
        for (const cInput of cTx.inputs) {
            const cInputFull = await getTxInfo(cInput.outpoint.hash);
            arrInputs.push([await cHardwareWallet.splitTransaction(cInputFull.hex), cInput.outpoint.index]);
            arrAssociatedKeysets.push(cInput.path);
        }

        // Construct the Ledger transaction
        const cLedgerTx = await cHardwareWallet.splitTransaction(cTx.serialize());
        const strOutputScriptHex = await cHardwareWallet
              .serializeTransactionOutputs(cLedgerTx)
              .toString("hex");

        // Sign the transaction via Ledger
        createAlert("info", ALERTS.CONFIRM_UNSTAKE_H_WALLET, [{"strHardwareName" : strHardwareName}], 7500);
        const strSerialisedTx = await cHardwareWallet.createPaymentTransactionNew({
            inputs: arrInputs,
            associatedKeysets: arrAssociatedKeysets,
            outputScriptHex: strOutputScriptHex,
        });
        
	
        // Broadcast the Hardware (Ledger) tx
        const result = await sendTransaction(strSerialisedTx, "<b>Delegation successful!</b>");
        if(result){
            for(const tx of cTx.inputs){
		mempool.autoRemoveUTXO({id: tx.outpoint.hash,path: tx.path,vout: tx.outpoint.index})
            }
            const futureTxid=swapHEXEndian(await hash(Crypto.util.hexToBytes((await hash((Crypto.util.hexToBytes(strSerialisedTx)))))));
	    
            if(nChange>0){
		mempool.addUTXO({id: futureTxid,path: changeAddressPath,sats: nChange,script:Crypto.util.bytesToHex(cTx.outputs[0].script),vout: 0,status: Mempool.PENDING});
		mempool.addUTXO({id: futureTxid,path: primaryAddressPath,sats: nValue,vout: 1,script:Crypto.util.bytesToHex(cTx.outputs[1].script),status: Mempool.PENDING_COLD});
            }else{
		mempool.addUTXO({id: futureTxid,path: primaryAddressPath,script: Crypto.util.bytesToHex(cTx.outputs[0].script),sats: nValue,vout: 0,status: Mempool.PENDING_COLD});
            }
        }
	
    } else {
        
        const sign= await cTx.sign(masterKey, 1);
	
        // Broadcast the software TX
        const result = await sendTransaction(sign, "<b>Delegation successful!</b>");
        if(result){
            for(const tx of cTx.inputs){
		mempool.autoRemoveUTXO({id: tx.outpoint.hash,path: tx.path,vout: tx.outpoint.index})
            }
            // Add our delegation + change (if any) to the local mempool
            const futureTxid=swapHEXEndian(await hash(Crypto.util.hexToBytes((await hash((Crypto.util.hexToBytes(sign)))))));
            if(nChange>0){
		mempool.addUTXO({id: futureTxid,path: changeAddressPath,sats: nChange,script:Crypto.util.bytesToHex(cTx.outputs[0].script),vout: 0,status: Mempool.PENDING});
		mempool.addUTXO({id: futureTxid,path: primaryAddressPath,sats: nValue,vout: 1,script:Crypto.util.bytesToHex(cTx.outputs[1].script),status: Mempool.PENDING_COLD});
            }else{
		mempool.addUTXO({id: futureTxid,path: primaryAddressPath,script: Crypto.util.bytesToHex(cTx.outputs[0].script),sats: nValue,vout: 0,status: Mempool.PENDING_COLD});
            }
        }
        
    }
    domGenIt.innerHTML = "Continue";
}

// Coin Control response formats
function ccError    (msg = '') { return { success: false, msg } };
function ccSuccess  (data)     { return { success: true, ...data } };

function chooseUTXOs(cTx, nTotalSatsRequired = 0, nMinInputSize = 0, fColdOnly = false) {
    console.log("Constructing TX of value: " + (nTotalSatsRequired / COIN) + " " + cChainParams.current.TICKER);

    // Select the UTXO type bucket

    //const arrUTXOs
    const arrUTXOs = mempool.UTXOs;

    // Select and return UTXO pointers (filters applied)
    const cCoinControl = { nValue: 0, nChange: 0, arrSelectedUTXOs: [] }
    
    let spent=[]
    for(let i=0; i< arrUTXOs.length;i++){
        const cUTXO= arrUTXOs[i]
        if(!fColdOnly){
            if(cUTXO.status!==Mempool.CONFIRMED && cUTXO.status!==Mempool.REWARD && cUTXO.status!==Mempool.PENDING){
		continue;
            }
            if(cUTXO.status===Mempool.REWARD && !Mempool.isValidReward(cUTXO)){
		continue
            }
        }
        if(fColdOnly && cUTXO.status!==Mempool.DELEGATE && cUTXO.status!==Mempool.PENDING_COLD) continue;
        // Don't spend locked Masternode collaterals
        if (isMasternodeUTXO(cUTXO)) continue; //CHANGE THIS

        // Have we met the required sats threshold?
        if (cCoinControl.nValue >= nTotalSatsRequired + getFee(cTx.serialize().length)) {
            // Required Coin Control value met, yahoo!
            console.log("Coin Control: TX Constructed! Selected " + cCoinControl.arrSelectedUTXOs.length + " input(s) (" + (cCoinControl.nValue / COIN) + " " + cChainParams.current.TICKER + ")");
            break;
        }

        // Does the UTXO meet size requirements?
        if (cUTXO.sats < nMinInputSize) continue;
        
        // Push UTXO and cache new total value
        cCoinControl.arrSelectedUTXOs.push(cUTXO);
        cCoinControl.nValue += cUTXO.sats;
        console.log("Coin Control: Selected input " + cUTXO.id.substr(0, 6) + "(" + cUTXO.vout + ")... (Added " + (cUTXO.sats / COIN) + " " + cChainParams.current.TICKER + " - Total: " + (cCoinControl.nValue / COIN) + ")");

        // Stuff UTXO into the TX
        cTx.addinput({
            txid: cUTXO.id,
            index: cUTXO.vout,
            script: cUTXO.script,
            path: cUTXO.path
        });
        spent.push(cUTXO);
    }

    // if we don't have enough value: return false
    if (cCoinControl.nValue < nTotalSatsRequired) return ccError("Balance is too small! (Missing " + (cCoinControl.nValue - nTotalSatsRequired).toLocaleString('en-gb') + " sats)");

    // Reaching here: we have sufficient UTXOs, calc final misc data and return!
    cCoinControl.nChange = nTotalSatsRequired - cCoinControl.nValue;
    return ccSuccess(cCoinControl);
}

function isMasternodeUTXO(cUTXO, masternode = null) {
    const cMasternode = masternode || JSON.parse(localStorage.getItem("masternode"));
    if (cMasternode) {
	const { collateralTxId, outidx } = cMasternode;
	return collateralTxId === cUTXO.id && cUTXO.vout === outidx;
    } else {
	return false;
    }
}


async function createTxGUI() {
    if (!hasWalletUnlocked(true)) return;
    
    if(masterKey.isViewOnly) {
	return createAlert("warning", "Attempting to send funds in view only mode.", 6000);
    }
    
    // Clear the inputs on 'Continue'
    if (domGenIt.innerHTML === 'Continue') {
	domGenIt.innerHTML = 'Send Transaction';
	domTxOutput.innerHTML = '';
	domHumanReadable.innerHTML = "";
	domValue1s.value = "";
	domAddress1s.value = "";
	domReqDesc.value = '';
	domReqDisplay.style.display = 'none';
	return;
    }
    // Sanity check the address
    const address = domAddress1s.value.trim();
    // If Staking address: redirect to staking page
    if (address.startsWith(cChainParams.current.STAKING_PREFIX)) {
	createAlert('warning', ALERTS.STAKE_NOT_SEND, [], 7500);
	return domStakeTab.click();
    }
    if (address.length !== 34) return createAlert('warning', ALERTS.BAD_ADDR_LENGTH,[{"addressLength" : address.length}], 2500);
    if (!cChainParams.current.PUBKEY_PREFIX.includes(address[0])) return createAlert('warning', ALERTS.BAD_ADDR_PREFIX, [{"address" : address[0]},{"addressPrefix" : cChainParams.current.PUBKEY_PREFIX.join(' or ')}], 3500);
    if (!bitjs.isValidDestination(address,cChainParams.current.PUBKEY_ADDRESS)) return createAlert('warning', ALERTS.INVALID_ADDRESS, [{"address" :address}], 3500);
    
    // Sanity check the amount
    let nValue = Math.round(Number(domValue1s.value.trim()) * COIN);
    if (nValue <= 0 || isNaN(nValue))  return createAlert('warning', ALERTS.INVALID_AMOUNT +ALERTS.SENT_NOTHING, [], 2500);
    if (!Number.isSafeInteger(nValue)) return createAlert('warning', ALERTS.INVALID_AMOUNT +ALERTS.MORE_THEN_8_DECIMALS, [], 2500);
    
    // Construct a TX and fetch Standard inputs
    const nBalance = getBalance();
    const cTx = bitjs.transaction();
    const cCoinControl = chooseUTXOs(cTx, nValue, 0, false);
    if (!cCoinControl.success) return alert(cCoinControl.msg);
    // Compute fee
    const nFee = getFee(cTx.serialize().length);
    
    // Compute change (or lack thereof)
    const nChange = cCoinControl.nValue - (nFee + nValue);
    const [changeAddress,changeAddressPath] = await getNewAddress({verify: masterKey.isHardwareWallet});

    const outputs = [];
    if (nChange > 0) {
        // Change output
        outputs.push([changeAddress, nChange / COIN]);
    } else {
        // We're sending alot! So we deduct the fee from the send amount. There's not enough change to pay it with!
        nValue -= nFee;
    }
    
    // Primary output (receiver)
    outputs.push([address, nValue / COIN]);
    
    // Debug-only verbose response
    if (debug) domHumanReadable.innerHTML = "Balance: " + (nBalance / COIN) + "<br>Fee: " + (nFee / COIN) + "<br>To: " + address + "<br>Sent: " + (nValue / COIN) + (nChange > 0 ? "<br>Change Address: " + changeAddress + "<br>Change: " + (nChange / COIN) : "");

    // Add outputs to the Tx
    for (const output of outputs) {
        cTx.addoutput(output[0], output[1]);
    }
    

    // Sign and broadcast!
    if (!masterKey.isHardwareWallet) {
        const sign = await cTx.sign(masterKey, 1);

        const result = await sendTransaction(sign);
        // Add our change (if any) to the local mempool
        if(result){
            
            for(const tx of cTx.inputs){
		mempool.autoRemoveUTXO({id: tx.outpoint.hash,path: tx.path,vout: tx.outpoint.index})
            }
            const futureTxid=swapHEXEndian(await hash(Crypto.util.hexToBytes((await hash((Crypto.util.hexToBytes(sign)))))));
            
            const [isYours,yourPath]= await isYourAddress(address);
            if(nChange>0){
		mempool.addUTXO({id: futureTxid,path: changeAddressPath,sats: nChange,script:Crypto.util.bytesToHex(cTx.outputs[0].script) ,vout: 0,status: Mempool.PENDING});
		if(isYours){
		    mempool.addUTXO({id: futureTxid,path: yourPath,sats: nValue,vout: 1,script:Crypto.util.bytesToHex(cTx.outputs[1].script),status: Mempool.PENDING});
		}
            }else{
		if(isYours){
		    mempool.addUTXO({id: futureTxid,path: yourPath,sats: nValue,vout: 0,script:Crypto.util.bytesToHex(cTx.outputs[0].script),status: Mempool.PENDING});
		}
            }
        }  
    } else {
        // Format the inputs how the Ledger SDK prefers
        const arrInputs = [];
        const arrAssociatedKeysets = [];
        for (const cInput of cTx.inputs) {
            const cInputFull = await getTxInfo(cInput.outpoint.hash);
            arrInputs.push([await cHardwareWallet.splitTransaction(cInputFull.hex), cInput.outpoint.index]);
            arrAssociatedKeysets.push(cInput.path);
        }
        const cLedgerTx = await cHardwareWallet.splitTransaction(cTx.serialize());
        const strOutputScriptHex = await cHardwareWallet
              .serializeTransactionOutputs(cLedgerTx)
              .toString("hex");

        // Sign the transaction via Ledger
        const strSerialisedTx = await confirmPopup(
            {
		title: ALERTS.CONFIRM_POPUP_TRANSACTION,
		html: createTxConfirmation(outputs),
		resolvePromise: cHardwareWallet.createPaymentTransactionNew({
		    inputs: arrInputs,
		    associatedKeysets: arrAssociatedKeysets,
		    outputScriptHex: strOutputScriptHex,
		}),
            }
        );

	
        // Broadcast the Hardware (Ledger) TX
        const result= await sendTransaction(strSerialisedTx);
        if(result){
            for(const tx of cTx.inputs){
		mempool.autoRemoveUTXO({id: tx.outpoint.hash,path: tx.path,vout: tx.outpoint.index})
            }
            // Add our change (if any) to the local mempool
            const [isYours,yourPath]= await isYourAddress(address);
            const futureTxid=swapHEXEndian(await hash(Crypto.util.hexToBytes((await hash((Crypto.util.hexToBytes(strSerialisedTx)))))));
            
            if(nChange>0){
		mempool.addUTXO({id: futureTxid,path: changeAddressPath,sats: nChange,script:Crypto.util.bytesToHex(cTx.outputs[0].script) ,vout: 0,status: Mempool.PENDING});        
		if(isYours){
		    mempool.addUTXO({id: futureTxid,path: yourPath,sats: nValue,vout: 1,script:Crypto.util.bytesToHex(cTx.outputs[1].script),status: Mempool.PENDING});
		}
            }else{
		if(isYours){
		    mempool.addUTXO({id: futureTxid,path: yourPath,sats: nValue,vout: 0,script:Crypto.util.bytesToHex(cTx.outputs[0].script),status: Mempool.PENDING});
		}
            }
        }
    }
    domGenIt.innerHTML = "Continue";
}

async function wipePrivateData() {
    const title = hasEncryptedWallet() ?
	  "Do you want to lock your wallet?" :
	  "Do you want to wipe your wallet private data?";
    const html = hasEncryptedWallet() ?
	  "You will need to enter your password to access your funds" :
	  "You will lose access to your funds if you haven't backed up your private key or seed phrase";
    if (await confirmPopup({
	title,
	html,
    })) {
	masterKey.wipePrivateData();
	domWipeWallet.hidden = true;
	if (hasEncryptedWallet()) {
	    domRestoreWallet.hidden = false;
	}
    }
}

async function restoreWallet() {
    if(await confirmPopup({
	title: "Unlock your wallet",
	html: '<input type="password" id="restoreWalletPassword" placeholder="Wallet password">',
    })) {
	const password = document.getElementById("restoreWalletPassword").value;
	if(await decryptWallet(password)) {
	    domRestoreWallet.hidden = true;
	    domWipeWallet.hidden = false;
	}
    }
}


function insert(arr, index, newItem) {
    // part of the array before the specified index
    return [...arr.slice(0, index),
            // inserted item
            newItem,
            // part of the array after the specified index
            ...arr.slice(index)
           ]
}

function addScriptLength(arrTxBytes, arrTxBytes2, nInputLen) { // ???
    let n_found = 0;
    const new_transaction_bytes = arrTxBytes;
    for (let i = 0; i < arrTxBytes.length; i++) {
        if (arrTxBytes[i + 1] === 71 || arrTxBytes[i + 1] === 72 || arrTxBytes[i + 1] === 73) {
            if (arrTxBytes[i + arrTxBytes[i]] === arrTxBytes[arrTxBytes.length - 1]){
		new_transaction_bytes[i]++;
		n_found++;
		if (n_found === nInputLen) {
		    return new_transaction_bytes;
		}
            }
        }
    }
}

function findCompressedPubKey(arrTxBytes) {
    const arrToFind = [1, 33];
    for (let i = 0; i < arrTxBytes.length; i++) {
        if (arrTxBytes[i] === arrToFind[0]) {
            if (arrTxBytes[i + 1] === arrToFind[1]) {
		const compressedPubKey = [];
		for (let j = 0; j < 33; j++) {
		    compressedPubKey.push(arrTxBytes[i + 2 + j]);
		}
		return compressedPubKey;
            }
        }
    }
}

function addExtraBytes(arrTxBytes, arrPubkeyBytes, nLen) {
    let arrNewTxBytes = [];
    let nFound = 0;
    for (let i = 0; i < arrTxBytes.length; i++) {
        arrNewTxBytes.push(arrTxBytes[i]);
        let fFound = true;

        if (nFound !== nLen) {
            for (let j = 0; j < arrPubkeyBytes.length; j++) {
		if (arrTxBytes[i + j] !== arrPubkeyBytes[j]) {
		    fFound = false;
		    break;
		}
            }

            if (fFound) {
		arrNewTxBytes = insert(arrNewTxBytes, arrNewTxBytes.length - 2, 0);
		nFound++;
            }
        }
    }
    return arrNewTxBytes;
}

async function createRawTransaction() {
    // Prepare a TX
    const cTx = bitjs.transaction();
    const txid = document.getElementById("prevTrxHash").value;
    const index = document.getElementById("index").value;
    const script = document.getElementById("script").value;

    // Primary input
    cTx.addinput({txid, index, script});

    // Primary output
    const strAddress = document.getElementById("address1").value;
    const nValue = document.getElementById("value1").value;
    cTx.addoutput(strAddress, nValue);

    // Change output
    const strChange = document.getElementById("address2").value;
    const nChangeValue = document.getElementById("value2").value;
    cTx.addoutput(strChange, nChangeValue);

    // Sign via WIF key
    const wif = document.getElementById("wif").value;
    document.getElementById("rawTrx").value = await cTx.sign(wif, 1); //SIGHASH_ALL DEFAULT 1
}
function addCellToTable(row,data){
    let td=row.insertCell();
    td.appendChild(document.createTextNode(data));
    td.style.border = '1px solid black';
}
domStart.click();

async function updateGovernanceTab() {
    const proposals= await Masternode.getProposals();
    domGovProposalsTableBody.innerHTML="";
    for (const proposal of proposals){
	if(proposal.RemainingPaymentCount === 0){
            continue;
	}
	const tr = domGovProposalsTableBody.insertRow();
	const td1 = tr.insertCell();
	// IMPORTANT: We must sanite all of our HTML or a rogue server or malicious proposal could perform a cross side scripting attack
	td1.innerHTML=`<a class="active" href="${sanitizeHTML(proposal.URL)}"><b>${sanitizeHTML(proposal.Name)}</b></a>`
	const td2 = tr.insertCell();
	td2.innerHTML=`<b>${sanitizeHTML(proposal.MonthlyPayment)}</b> ${cChainParams.current.TICKER} <br>
      <small> ${sanitizeHTML(proposal['RemainingPaymentCount'])} payments remaining of <b>${sanitizeHTML(proposal.TotalPayment)}</b> ${cChainParams.current.TICKER} total</small>`
	const td3 = tr.insertCell();
	let {Yeas, Nays} = proposal;
	Yeas = parseInt(Yeas);
	Nays = parseInt(Nays);
	const percentage = Yeas + Nays !== 0 ? (Yeas / (Yeas + Nays)) * 100 : 0;
	
	td3.innerHTML=`<b>${percentage.toFixed(2)}%</b> <br>
      <small> <b><div class="text-success" style="display:inline;"> ${Yeas} </div></b> /
	  <b><div class="text-danger" style="display:inline;"> ${Nays} </div></b>
      `;
	const td4 = tr.insertCell();
	//append vote buttons	  
	const buttonNo = document.createElement('button');
	buttonNo.className = "pivx-button-big";
	buttonNo.innerText="No";
	buttonNo.onclick = () => govVote(proposal.Hash, 2);
	
	const buttonYes = document.createElement('button');
	buttonYes.className = "pivx-button-big";
	buttonYes.innerText="Yes";
	buttonYes.onclick = () => govVote(proposal.Hash, 1);
	
	td4.appendChild(buttonNo)
	td4.appendChild(buttonYes)
    }
}

async function updateMasternodeTab() {
    //TODO: IN A FUTURE ADD MULTI-MASTERNODE SUPPORT BY SAVING MNs with which you logged in the past.
    // Ensure a wallet is loaded
    domMnTextErrors.innerHTML = "";
    domAccessMasternode.style.display = "none";
    domCreateMasternode.style.display = "none";
    domMnDashboard.style.display = "none";
    
    if (!masterKey) {
	domMnTextErrors.innerHTML = "Please " + (hasEncryptedWallet() ? "unlock" : "import") + " your <b>COLLATERAL WALLET</b> first.";
	return;
    }
    
    if (masterKey.isHardwareWallet) {
	domMnTxId.style.display = "none";
	domMnTextErrors.innerHTML = "Ledger is not yet supported";
	return;
    }

    if(!mempool.getConfirmed().length) {
	domMnTextErrors.innerHTML = "Your wallet is empty or still loading, re-open the tab in a few seconds!";
	return;
    }
    
    let strMasternodeJSON = localStorage.getItem("masternode");
    // If the collateral is missing (spent, or switched wallet) then remove the current MN
    if (strMasternodeJSON) {
	const cMasternode = JSON.parse(strMasternodeJSON);
	if (!mempool.getConfirmed().find(utxo => isMasternodeUTXO(utxo, cMasternode))) {
            localStorage.removeItem("masternode");
	    strMasternodeJSON = null;
	}
    }
    
    domControlMasternode.style.display = strMasternodeJSON ? "block" : "none";
    
    // first case: the wallet is not HD and it is not hardware, so in case the wallet has collateral the user can check its status and do simple stuff like voting
    if (!masterKey.isHD) {
	domMnAccessMasternodeText.innerHTML = masternodeLegacyAccessText;
	domMnTxId.style.display = "none";
	// Find the first UTXO matching the expected collateral size
	const cCollaUTXO = mempool.getConfirmed().find(cUTXO => cUTXO.sats === cChainParams.current.collateralInSats);
	const balance = getBalance(false);
	if (cCollaUTXO) {
	    if (strMasternodeJSON) {
		const cMasternode = new Masternode(JSON.parse(localStorage.getItem("masternode")));
		const cMasternodeData = await refreshMasternodeData(cMasternode);
		domMnDashboard.style.display = "";
	    } else {
		domMnTxId.style.display = "none";
		domAccessMasternode.style.display = "block";
	    }
	} else if (balance < cChainParams.current.collateralInSats) {
            // The user needs more funds
            domMnTextErrors.innerHTML = "You need <b>" + ((cChainParams.current.collateralInSats - balance) / COIN) + " more " + cChainParams.current.TICKER + "</b> to create a Masternode!";
	} else {
            // The user has the funds, but not an exact collateral, prompt for them to create one
            domCreateMasternode.style.display = "block";
            domMnTxId.style.display = "none";
            domMnTxId.innerHTML = "";
	}
    } else {
	domMnTxId.style.display = "none";
	domMnTxId.innerHTML = "";
	domMnAccessMasternodeText.innerHTML = masternodeHDAccessText;
	
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
            domMnTxId.style.display = "block";
            domAccessMasternode.style.display = "block";
	    
            for (const [key, value] of mapCollateralAddresses) {
		const option = document.createElement('option');
		option.value = key;
		option.innerText = await masterKey.getAddress(key);
		domMnTxId.appendChild(option);
            }
	}
	
	// If there's no collateral found, display the creation UI
	if (!fHasCollateral) domCreateMasternode.style.display = "block";
	
	// If we have a collateral and a loaded Masternode, display the Dashboard
	if (fHasCollateral && strMasternodeJSON) {
            const cMasternode = new Masternode(JSON.parse(strMasternodeJSON));
            // Refresh the display
            refreshMasternodeData(cMasternode);
            domMnDashboard.style.display = "";
	}
    }
}

async function refreshMasternodeData(cMasternode, fAlert = false) {
    const cMasternodeData = await cMasternode.getFullData();
    if (debug) console.log(cMasternodeData);

    // If we have MN data available, update the dashboard
    if (cMasternodeData && cMasternodeData.status !== "MISSING") {
	domMnTextErrors.innerHTML = "";
	domMnProtocol.innerText = `(${sanitizeHTML(cMasternodeData.version)})`;
	domMnStatus.innerText = sanitizeHTML(cMasternodeData.status);
	domMnNetType.innerText = sanitizeHTML(cMasternodeData.network.toUpperCase());
	domMnNetIP.innerText = cMasternode.addr;
	domMnLastSeen.innerText = new Date(cMasternodeData.lastseen * 1000).toLocaleTimeString();
    }

    if (cMasternodeData.status === "MISSING") {
	domMnTextErrors.innerHTML = "Masternode is currently <b>OFFLINE</b>";
	if (!masterKey.isViewOnly) {
	    createAlert('warning', 'Your masternode is offline, we will try to start it', 6000);
	    // try to start the masternode
	    const started = await cMasternode.start();
	    if (started) {
		domMnTextErrors.innerHTML = "Masternode successfully started!";
		createAlert('success', 'Masternode successfully started!, it will be soon online', 6000);
		localStorage.setItem("masternode", JSON.stringify(cMasternode));
	    } else {
		domMnTextErrors.innerHTML = "We couldn't start your masternode";
		createAlert('warning', 'We could not start your masternode', 6000);
	    }
	}
    } else if (cMasternodeData.status === "ENABLED" || cMasternodeData.status === "PRE_ENABLED") {
	if (fAlert) createAlert('success', `Your masternode status is <b> ${sanitizeHTML(cMasternodeData.status)} </b>`, 6000);
	localStorage.setItem("masternode", JSON.stringify(cMasternode));
    } else if (cMasternodeData.status === "REMOVED") {
	domMnTextErrors.innerHTML = "Masternode is currently <b>REMOVED</b>";
	if (fAlert) createAlert('warning', 'Your masternode is in <b>REMOVED</b> state', 6000);
    } else { // connection problem
	domMnTextErrors.innerHTML = "Unable to connect!";
	if (fAlert) createAlert('warning', 'Unable to connect!', 6000);
    }

    // Return the data in case the caller needs additional context
    return cMasternodeData;
}

function refreshChainData() {
    // If in offline mode: don't sync ANY data or connect to the internet
    if (!networkEnabled) return console.warn("Offline mode active: For your security, the wallet will avoid ALL internet requests.");
    if (!masterKey) return;

    // Play reload anim
    domBalanceReload.classList.add("playAnim");
    domBalanceReloadStaking.classList.add("playAnim");

    // Fetch block count + UTXOs
    getBlockCount();
}

// A safety mechanism enabled if the user attempts to leave without encrypting/saving their keys
const beforeUnloadListener = (evt) => {
    evt.preventDefault();
    // Disable Save your wallet warning on unload
    if( !cChainParams.current.isTestnet ) createAlert("warning", ALERTS.SAVE_WALLET_PLEASE, [], 10000);
    // Most browsers ignore this nowadays, but still, keep it 'just incase'
    return evt.returnValue = BACKUP_OR_ENCRYPT_WALLET;
};

window.onload = (() => {
    // Configure Identicon
    jdenticon.configure();

    // Customise the UI if a saved wallet exists
    if (hasEncryptedWallet()) {
        // Hide the 'Generate wallet' buttons
        domGenerateWallet.style.display = "none";
        domGenVanityWallet.style.display = "none";

	const publicKey = localStorage.getItem("publicKey");

	if (publicKey) {
	    importWallet({newWif: publicKey});
	} else {
            // Display the password unlock upfront
            accessOrImportWallet();
	}
    }

    // Payment processor redirect
    if (requestTo && requestAmount) {
        guiPreparePayment(requestTo, requestAmount, urlParams.has('desc') ? urlParams.get('desc') : "");
    }

    // If allowed by settings: submit a simple 'hit' (app load) to Labs Analytics
    submitAnalytics('hit');
});

setInterval(refreshChainData, 15000);
domPrefix.value = ""
domPrefixNetwork.innerText = cChainParams.current.PUBKEY_PREFIX.join(' or ');
}
