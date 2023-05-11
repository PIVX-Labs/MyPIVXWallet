import {
    doms,
    getBalance,
    getStakingBalance,
    refreshChainData,
    updateStakingRewardsGUI,
} from './global.js';
import { fWalletLoaded, masterKey } from './wallet.js';
import { cChainParams } from './chain_params.js';
import { setNetwork, ExplorerNetwork, getNetwork } from './network.js';
import { createAlert } from './misc.js';
import {
    switchTranslation,
    ALERTS,
    translation,
    arrActiveLangs,
} from './i18n.js';
import { CoinGecko, refreshPriceDisplay } from './prices.js';

// --- Default Settings
/** A mode that emits verbose console info for internal MPW operations */
export let debug = false;
/**
 * The user-selected display currency from market-aggregator sites
 * @type {string}
 */
export let strCurrency = 'usd';
/**
 * The global market data source
 * @type {CoinGecko}
 */
export let cMarket = new CoinGecko();
/** The user-selected explorer, used for most of MPW's data synchronisation */
export let cExplorer = cChainParams.current.Explorers[0];
/** The user-selected MPW node, used for alternative blockchain data */
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
    doms.domTestnet.style.display = cChainParams.current.isTestnet
        ? ''
        : 'none';
    doms.domDebug.style.display = debug ? '' : 'none';

    // Hook up the 'currency' select UI
    document.getElementById('currency').onchange = function (evt) {
        // @ts-ignore
        setCurrency(evt.target.value);
    };

    // Hook up the 'explorer' select UI
    document.getElementById('explorer').onchange = function (evt) {
        setExplorer(
            cChainParams.current.Explorers.find(
                // @ts-ignore
                (a) => a.url === evt.target.value
            )
        );
    };

    // Hook up the 'translation' select UI
    document.getElementById('translation').onchange = function (evt) {
        // @ts-ignore
        setTranslation(evt.target.value);
    };

    // Hook up the 'analytics' select UI
    document.getElementById('analytics').onchange = function (evt) {
        // @ts-ignore
        setAnalytics(arrAnalytics.find((a) => a.name === evt.target.value));
    };

    fillExplorerSelect();
    fillNodeSelect();
    fillTranslationSelect();

    // Fetch price data, then fetch chain data
    if (getNetwork().enabled) {
        refreshPriceDisplay()
            .then(() => {})
            .finally(refreshChainData);
    }

    // Add each analytics level into the UI selector
    const domAnalyticsSelect = document.getElementById('analytics');
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

    // Initialise status icons as their default variables
    doms.domNetwork.innerHTML =
        '<i class="fa-solid fa-' +
        (getNetwork().enabled ? 'wifi' : 'ban') +
        '"></i>';

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
    // @ts-ignore
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
    const network = new ExplorerNetwork(cExplorer.url, masterKey);
    setNetwork(network);

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
    getNetwork().enable();
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
 * Switches the translation and sets the translation preference to local storage
 * @param {string} lang
 */
function setTranslation(lang) {
    switchTranslation(lang);
    localStorage.setItem('translation', lang);
}

/**
 * Sets and saves the display currency setting in runtime and localStorage
 * @param {string} currency - The currency string name
 */
function setCurrency(currency) {
    strCurrency = currency;
    localStorage.setItem('displayCurrency', strCurrency);
    // Update the UI to reflect the new currency
    getBalance(true);
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
        opt.innerHTML = opt.value = lang;
        doms.domTranslationSelect.appendChild(opt);
    }

    // And update the UI to reflect them
    doms.domTranslationSelect.value =
        localStorage.getItem('translation') || 'en';
}

/**
 * Fills the display currency dropbox on the settings page
 */
export async function fillCurrencySelect() {
    while (doms.domCurrencySelect.options.length > 0) {
        doms.domCurrencySelect.remove(0);
    }

    // Add each data source currency into the UI selector
    for (const currency of await cMarket.getCurrencies()) {
        const opt = document.createElement('option');
        opt.innerHTML = currency.toUpperCase();
        opt.value = currency;
        doms.domCurrencySelect.appendChild(opt);
    }

    // And update the UI to reflect them
    strCurrency = doms.domCurrencySelect.value =
        localStorage.getItem('displayCurrency') || strCurrency;
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
    updateStakingRewardsGUI()
        .then(() => {})
        .catch((e) => {
            throw e;
        });
}

export function toggleDebug() {
    debug = !debug;
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
