'use strict';

// --- Default Settings
var debug = false;            // A mode that emits verbose console info for internal MPW operations
var networkEnabled = true;    // A lock which blocks ALL network requests in totality
var fAlternativeSync = true;  // A more resource-intensive but deep UTXO set sync mode

var cExplorer = cChainParams.current.Explorers[0];

// A list of statistic keys and their descriptions
const STATS = {
    // Stat key   // Description of the stat, it's data, and it's purpose
    hit:          "A ping indicating an app load, no unique data is sent.",
    time_to_sync: "The time in seconds it took for MPW to last synchronise.",
    transaction:  "A ping indicating a Tx, no unique data is sent, but may be inferred from on-chain time."
}
Object.freeze(STATS);

const cStatKeys = Object.keys(STATS);

// A list of Analytics 'levels' at which the user may set depending on their privacy preferences
const arrAnalytics = [
    // Statistic level  // Allowed statistics
    { name: "Disabled", stats: [] },
    { name: "Minimal",  stats: [STATS.hit, STATS.time_to_sync] },
    { name: "Balanced", stats: [STATS.hit, STATS.time_to_sync, STATS.transaction] }
]

var cAnalyticsLevel = arrAnalytics[2];

// Users need not look below here.
// ------------------------------
// Global Keystore / Wallet Information
var masterKey;
var fWalletLoaded = false;

// --- DOM Cache
const domNetwork = document.getElementById('Network');
const domNetworkE= document.getElementById('NetworkE')
const domNetworkD= document.getElementById('NetworkD')
const domDebug = document.getElementById('Debug');
const domSyncMode = document.getElementById('SyncMode');
const domTestnet = document.getElementById('Testnet');
const domExplorerSelect = document.getElementById('explorer');

//TRANSLATIONS
//to make translations work we need to change it so that we just enable or disable the visiblity of the text
//domSyncMode.innerHTML = fAlternativeSync              ? '<b>Experimental Sync Active</b>' : '';
//domTestnet.innerHTML = cChainParams.current.isTestnet ? '<b>Testnet Mode On</b>'          : '';
//domDebug.innerHTML = debug ? '<b>DEBUG MODE ON</b>' : '';
domNetworkE.style.display = (networkEnabled ? '' : 'none');
domNetworkD.style.display = (networkEnabled ? 'none' : '');
domSyncMode.style.display = fAlternativeSync ? '' : 'none';
domTestnet.style.display = cChainParams.current.isTestnet ? '': 'none';
domDebug.style.display = debug ? '' : 'none';

// --- Settings Functions
function setExplorer(explorer, fSilent = false) {
    cExplorer = explorer;
    localStorage.setItem('explorer' + (cChainParams.current.isTestnet ? '-testnet' : ''), explorer.url);

    // Enable networking + notify if allowed
    enableNetwork();
    if (!fSilent) createAlert('success', '<b>Switched explorer!</b><br>Now using ' + cExplorer.name, 2250);
}
// Hook up the 'explorer' select UI
document.getElementById('explorer').onchange = function(evt) {
    setExplorer(cChainParams.current.Explorers.find(a => a.url === evt.target.value));
}

function setAnalytics(level, fSilent = false) {
    cAnalyticsLevel = level;
    localStorage.setItem('analytics', level.name);
    // For total transparency, we'll 'describe' the various analytic keys of this chosen level
    let strDesc = '<center>--- Transparency Report ---</center><br>', i = 0;
    const nLongestKeyLen = cStatKeys.reduce((prev, e) => prev.length >= e.length ? prev : e).length;
    for (i; i < cAnalyticsLevel.stats.length; i++) {
        const cStat = cAnalyticsLevel.stats[i];
        // This formats Stat keys into { $key $(padding) $description }
        strDesc += cStatKeys.find(a => STATS[a] === cStat).padEnd(nLongestKeyLen, ' ') + ': ' + cStat + '<br>';
    }

    // Set display + notify if allowed
    domAnalyticsDescriptor.innerHTML = cAnalyticsLevel.name === arrAnalytics[0].name ? '' : '<h6 style="color:#dcdf6b;font-family:mono !important;"><pre style="color: inherit;">' + strDesc + '</pre></h6>';
    if (!fSilent) createAlert('success', '<b>Switched analytics level!</b><br>Now ' + cAnalyticsLevel.name, 2250);
}
// Hook up the 'analytics' select UI
document.getElementById('analytics').onchange = function(evt) {
    setAnalytics(arrAnalytics.find(a => a.name === evt.target.value));
}

function toggleTestnet() {
    if (fWalletLoaded) return createAlert('warning', '<b>Unable to switch Testnet Mode!</b><br>A wallet is already loaded', 3250);

    // Update current chain config
    cChainParams.current = cChainParams.current.isTestnet ? cChainParams.main : cChainParams.testnet;

    // Update UI and static tickers
    //TRANSLATIONS CHANGE
    //domTestnet.innerHTML = (cChainParams.current.isTestnet ? '<b>Testnet Mode On</b>' : '');
    domTestnet.style.display = (cChainParams.current.isTestnet ? '' : 'none');
    domGuiBalanceTicker.innerText        = cChainParams.current.TICKER;
    domGuiBalanceStakingTicker.innerText = cChainParams.current.TICKER;
    domPrefix.value = cChainParams.current.PUBKEY_PREFIX + domPrefix.value.substr(1);
    fillExplorerSelect();
    getBalance(true);
    getStakingBalance(true);
    updateStakingRewardsGUI();
}

function toggleSyncMode() {
    fAlternativeSync = !fAlternativeSync;
    //TRANSLATION CHANGE
    //domSyncMode.innerHTML = fAlternativeSync ? '<b>Experimental Sync Active</b>' : '';
    domSyncMode.style.display = (fAlternativeSync ? '' : 'none');
    createAlert('success', '<b>Switched sync mode!</b><br>Now using ' + (fAlternativeSync ? 'experimental' : 'stable') + ' sync', 3000);
}

function toggleDebug() {
    debug = !debug;
    //TRANSLATION CHANGES
    //domDebug.innerHTML = debug ? '<b>DEBUG MODE ON</b>' : '';
    domDebug.style.display = debug ? '' : 'none';

}

function toggleNetwork() {
    networkEnabled = !networkEnabled;
    //TRANSLATION CHANGE
    //domNetwork.innerHTML = '<b>Network:</b> ' + (networkEnabled ? 'Enabled' : 'Disabled');
    domNetworkE.style.display = (networkEnabled ? '' : 'none');
    domNetworkD.style.display = (networkEnabled ? 'none' : '');
    return networkEnabled;
}

// Enable the network, return true if successful.
function enableNetwork() {
    if (!networkEnabled) return toggleNetwork();
    return false;
}

// Disable the network, return true if successful.
function disableNetwork() {
    if (networkEnabled) return !toggleNetwork();
    return false;
}

function fillExplorerSelect() {
    cExplorer = cChainParams.current.Explorers[0];

    while (domExplorerSelect.options.length>0) {
        domExplorerSelect.remove(0);
    }

    // Add each trusted explorer into the UI selector
    for (const explorer of cChainParams.current.Explorers) {
        const opt = document.createElement('option');
        opt.value = explorer.url;
        opt.innerHTML = explorer.name + ' (' + explorer.url.replace('https://', '') + ')';
        domExplorerSelect.appendChild(opt);
    }

    // Fetch settings from LocalStorage
    const strSettingExplorer = localStorage.getItem('explorer' + (cChainParams.current.isTestnet ? '-testnet' : ''));

    // For any that exist: load them, or use the defaults
    setExplorer(cChainParams.current.Explorers.find(a => a.url === strSettingExplorer) || cExplorer, true);

    // And update the UI to reflect them
    domExplorerSelect.value = cExplorer.url;
}

// Once the DOM is ready; plug-in any settings to the UI
addEventListener('DOMContentLoaded', () => {
    const domAnalyticsSelect = document.getElementById('analytics');

    fillExplorerSelect();

    // Add each analytics level into the UI selector
    for (const analLevel of arrAnalytics) {
        const opt = document.createElement('option');
        opt.value = opt.innerHTML = analLevel.name;
        domAnalyticsSelect.appendChild(opt);
    }

    // Fetch settings from LocalStorage
    const strSettingAnalytics = localStorage.getItem('analytics');

    // Honour the "Do Not Track" header by default
    if (!strSettingAnalytics && navigator.doNotTrack === "1") {
        // Disabled
        setAnalytics(arrAnalytics[0], true);
        domAnalyticsDescriptor.innerHTML = '<h6 style="color:#dcdf6b;font-family:mono !important;"><pre style="color: inherit;">Analytics disabled to honour "Do Not Track" browser setting, you may manually enable if desired, though!</pre></h6>';
    } else {
        // Load from storage, or use defaults
        setAnalytics(cAnalyticsLevel = arrAnalytics.find(a => a.name === strSettingAnalytics) || cAnalyticsLevel, true);
    }

    // And update the UI to reflect them
    domAnalyticsSelect.value = cAnalyticsLevel.name;
});
