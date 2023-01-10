import {
    doms,
    getBalance,
    getStakingBalance,
    updateStakingRewardsGUI,
} from './global.js';
import { fWalletLoaded } from './wallet.js';
import { cChainParams } from './chain_params.js';
import { enableNetwork } from './network.js';
import { createAlert } from './misc.js';
import {
    switchTranslation,
    ALERTS,
    translation,
    arrActiveLangs,
} from './i18n.js';

// --- Default Settings
export let debug = false; // A mode that emits verbose console info for internal MPW operations
let networkEnabled = true; // A lock which blocks ALL network requests in totality
export let cExplorer = cChainParams.current.Explorers[0];
export let cNode = cChainParams.current.Nodes[0];

let transparencyReport;
// A list of statistic keys and their descriptions
export let STATS = {
    // Stat key   // Description of the stat, it's data, and it's purpose
    hit: 'A ping indicating an app load, no unique data is sent.',
    time_to_sync: 'The time in seconds it took for MPW to last synchronise.',
    transaction:
        'A ping indicating a Tx, no unique data is sent, but may be inferred from on-chain time.',
};

export const cStatKeys = Object.keys(STATS);

// A list of Analytics 'levels' at which the user may set depending on their privacy preferences
let arrAnalytics = [
    // Statistic level  // Allowed statistics
    { name: 'Disabled', stats: [] },
    { name: 'Minimal', stats: [STATS.hit, STATS.time_to_sync] },
    {
        name: 'Balanced',
        stats: [STATS.hit, STATS.time_to_sync, STATS.transaction],
    },
];

export let cAnalyticsLevel = arrAnalytics[2];

// Users need not look below here.
// ------------------------------
// Global Keystore / Wallet Information

// --- DOM Cache
export function start() {
    //TRANSLATIONS
    //to make translations work we need to change it so that we just enable or disable the visibility of the text
    doms.domNetworkE.style.display = networkEnabled ? '' : 'none';
    doms.domNetworkD.style.display = networkEnabled ? 'none' : '';
    doms.domTestnet.style.display = cChainParams.current.isTestnet
        ? ''
        : 'none';
    doms.domDebug.style.display = debug ? '' : 'none';

    // Hook up the 'explorer' select UI
    document.getElementById('explorer').onchange = function (evt) {
        setExplorer(
            cChainParams.current.Explorers.find(
                (a) => a.url === evt.target.value
            )
        );
    };

    document.getElementById('translation').onchange = function (evt) {
        setTranslation(evt.target.value);
    };
    // Hook up the 'analytics' select UI
    document.getElementById('analytics').onchange = function (evt) {
        setAnalytics(arrAnalytics.find((a) => a.name === evt.target.value));
    };

    const domAnalyticsSelect = document.getElementById('analytics');

    fillExplorerSelect();
    fillNodeSelect();
    fillTranslationSelect();

    // Add each analytics level into the UI selector
    for (const analLevel of arrAnalytics) {
        const opt = document.createElement('option');
        opt.value = opt.innerHTML = analLevel.name;
        domAnalyticsSelect.appendChild(opt);
    }

    // Fetch settings from LocalStorage
    const strSettingAnalytics = localStorage.getItem('analytics');

    // Apply translations to the transparency report
    STATS = {
        // Stat key   // Description of the stat, it's data, and it's purpose
        hit: translation.hit,
        time_to_sync: translation.time_to_sync,
        transaction: translation.transaction,
    };
    transparencyReport = translation.transparencyReport;
    arrAnalytics = [
        // Statistic level  // Allowed statistics
        { name: 'Disabled', stats: [] },
        { name: 'Minimal', stats: [STATS.hit, STATS.time_to_sync] },
        {
            name: 'Balanced',
            stats: [STATS.hit, STATS.time_to_sync, STATS.transaction],
        },
    ];

    // Honour the "Do Not Track" header by default
    if (!strSettingAnalytics && navigator.doNotTrack === '1') {
        // Disabled
        setAnalytics(arrAnalytics[0], true);
        doms.domAnalyticsDescriptor.innerHTML =
            '<h6 style="color:#dcdf6b;font-family:mono !important;"><pre style="color: inherit;">Analytics disabled to honour "Do Not Track" browser setting, you may manually enable if desired, though!</pre></h6>';
    } else {
        // Load from storage, or use defaults
        setAnalytics(
            (cAnalyticsLevel =
                arrAnalytics.find((a) => a.name === strSettingAnalytics) ||
                cAnalyticsLevel),
            true
        );
    }

    // And update the UI to reflect them
    domAnalyticsSelect.value = cAnalyticsLevel.name;
}
// --- Settings Functions
function setExplorer(explorer, fSilent = false) {
    cExplorer = explorer;
    localStorage.setItem(
        'explorer' + (cChainParams.current.isTestnet ? '-testnet' : ''),
        explorer.url
    );

    // Enable networking + notify if allowed
    enableNetwork();
    if (!fSilent)
        createAlert(
            'success',
            ALERTS.SWITCHED_EXPLORERS,
            [{ explorerName: cExplorer.name }],
            2250
        );
}

function setNode(node, fSilent = false) {
    cNode = node;
    localStorage.setItem(
        'node' + (cChainParams.current.isTestnet ? '-testnet' : ''),
        node.url
    );

    // Enable networking + notify if allowed
    enableNetwork();
    if (!fSilent)
        createAlert(
            'success',
            ALERTS.SWITCHED_NODE,
            [{ node: cNode.name }],
            2250
        );
}

//TRANSLATION
/**
 * switches the translation and sets the translation preference to local storage
 * @param {string} lang
 * @param {bool} fSilent
 */
function setTranslation(lang) {
    switchTranslation(lang);
    localStorage.setItem('translation', lang);
}

/**
 * Fills the translation dropbox on the settings page
 */
function fillTranslationSelect() {
    while (doms.domTranslationSelect.options.length > 0) {
        doms.domTranslationSelect.remove(0);
    }

    // Add each trusted explorer into the UI selector
    for (const lang of arrActiveLangs) {
        const opt = document.createElement('option');
        opt.value = lang;
        opt.innerHTML = lang;
        doms.domTranslationSelect.appendChild(opt);
    }

    // And update the UI to reflect them
    doms.domTranslationSelect.value =
        localStorage.getItem('translation') || 'en';
}

function setAnalytics(level, fSilent = false) {
    cAnalyticsLevel = level;
    localStorage.setItem('analytics', level.name);
    // For total transparency, we'll 'describe' the various analytic keys of this chosen level
    let strDesc = '<center>--- ' + transparencyReport + ' ---</center><br>',
        i = 0;
    const nLongestKeyLen = cStatKeys.reduce((prev, e) =>
        prev.length >= e.length ? prev : e
    ).length;
    for (i; i < cAnalyticsLevel.stats.length; i++) {
        const cStat = cAnalyticsLevel.stats[i];
        // This formats Stat keys into { $key $(padding) $description }
        strDesc +=
            cStatKeys
                .find((a) => STATS[a] === cStat)
                .padEnd(nLongestKeyLen, ' ') +
            ': ' +
            cStat +
            '<br>';
    }

    // Set display + notify if allowed
    doms.domAnalyticsDescriptor.innerHTML =
        cAnalyticsLevel.name === arrAnalytics[0].name
            ? ''
            : '<h6 style="color:#dcdf6b;font-family:mono !important;"><pre style="color: inherit;">' +
              strDesc +
              '</pre></h6>';
    if (!fSilent)
        createAlert(
            'success',
            ALERTS.SWITCHED_ANALYTICS,
            [{ level: cAnalyticsLevel.name }],
            2250
        );
}

export function toggleTestnet() {
    if (fWalletLoaded)
        return createAlert('warning', ALERTS.UNABLE_SWITCH_TESTNET, [], 3250);

    // Update current chain config
    cChainParams.current = cChainParams.current.isTestnet
        ? cChainParams.main
        : cChainParams.testnet;

    // Update UI and static tickers
    //TRANSLATIONS
    doms.domTestnet.style.display = cChainParams.current.isTestnet
        ? ''
        : 'none';
    doms.domGuiBalanceTicker.innerText = cChainParams.current.TICKER;
    doms.domGuiBalanceStakingTicker.innerText = cChainParams.current.TICKER;
    doms.domPrefixNetwork.innerText =
        cChainParams.current.PUBKEY_PREFIX.join(' or ');
    fillExplorerSelect();
    fillNodeSelect();
    getBalance(true);
    getStakingBalance(true);
    updateStakingRewardsGUI();
}

export function toggleDebug() {
    debug = !debug;
    //TRANSLATION CHANGES
    //doms.domDebug.innerHTML = debug ? '<b>DEBUG MODE ON</b>' : '';
    doms.domDebug.style.display = debug ? '' : 'none';
}

function fillExplorerSelect() {
    cExplorer = cChainParams.current.Explorers[0];

    while (doms.domExplorerSelect.options.length > 0) {
        doms.domExplorerSelect.remove(0);
    }

    // Add each trusted explorer into the UI selector
    for (const explorer of cChainParams.current.Explorers) {
        const opt = document.createElement('option');
        opt.value = explorer.url;
        opt.innerHTML =
            explorer.name + ' (' + explorer.url.replace('https://', '') + ')';
        doms.domExplorerSelect.appendChild(opt);
    }

    // Fetch settings from LocalStorage
    const strSettingExplorer = localStorage.getItem(
        'explorer' + (cChainParams.current.isTestnet ? '-testnet' : '')
    );

    // For any that exist: load them, or use the defaults
    setExplorer(
        cChainParams.current.Explorers.find(
            (a) => a.url === strSettingExplorer
        ) || cExplorer,
        true
    );

    // And update the UI to reflect them
    doms.domExplorerSelect.value = cExplorer.url;
}

function fillNodeSelect() {
    cNode = cChainParams.current.Nodes[0];

    while (doms.domNodeSelect.options.length > 0) {
        doms.domNodeSelect.remove(0);
    }

    // Add each trusted node into the UI selector
    for (const node of cChainParams.current.Nodes) {
        const opt = document.createElement('option');
        opt.value = node.url;
        opt.innerHTML =
            node.name + ' (' + node.url.replace('https://', '') + ')';
        doms.domNodeSelect.appendChild(opt);
    }

    // Fetch settings from LocalStorage
    const strSettingNode = localStorage.getItem(
        'node' + (cChainParams.current.isTestnet ? '-testnet' : '')
    );

    // For any that exist: load them, or use the defaults
    setNode(
        cChainParams.current.Nodes.find((a) => a.url === strSettingNode) ||
            cNode,
        true
    );

    // And update the UI to reflect them
    doms.domNodeSelect.value = cNode.url;
}
