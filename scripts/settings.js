import {
    doms,
    getBalance,
    getStakingBalance,
    refreshChainData,
    updateActivityGUI,
    updateGovernanceTab,
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
import { Database } from './database.js';

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
/** A mode which allows MPW to automatically select it's data sources */
export let fAutoSwitch = true;
/** The active Cold Staking address: default is the PIVX Labs address */
export let strColdStakingAddress = 'SdgQDpS8jDRJDX8yK8m9KnTMarsE84zdsy';
/** The decimals to display for the wallet balance */
export let nDisplayDecimals = 2;

let transparencyReport;

export class Settings {
    /**
     * @type {String} analytics level
     */
    analytics;
    /**
     * @type {String} Explorer url to use
     */
    explorer;
    /**
     * @type {String} Node url to use
     */
    node;
    /**
     * @type {Boolean} The Auto-Switch mode state
     */
    autoswitch;
    /**
     * @type {String} The user's active Cold Staking address
     */
    coldAddress;
    /**
     * @type {String} translation to use
     */
    translation;
    /**
     * @type {String} Currency to display
     */
    displayCurrency;
    /**
     * @type {number} The decimals to display for the wallet balance
     */
    displayDecimals;
    constructor({
        analytics,
        explorer,
        node,
        autoswitch = true,
        coldAddress = strColdStakingAddress,
        translation = '',
        displayCurrency = 'usd',
        displayDecimals = nDisplayDecimals,
    } = {}) {
        this.analytics = analytics;
        this.explorer = explorer;
        this.node = node;
        this.autoswitch = autoswitch;
        this.coldAddress = coldAddress;
        this.translation = translation;
        this.displayCurrency = displayCurrency;
        this.displayDecimals = displayDecimals;
    }
}

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
// NOTE: When changing Level Names, ensure the i18n system is updated to support them too
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
export async function start() {
    //TRANSLATIONS
    //to make translations work we need to change it so that we just enable or disable the visibility of the text
    doms.domTestnet.style.display = cChainParams.current.isTestnet
        ? ''
        : 'none';
    doms.domDebug.style.display = debug ? '' : 'none';

    // Hook up the 'currency' select UI
    document.getElementById('currency').onchange = function (evt) {
        setCurrency(evt.target.value);
    };

    // Hook up the 'display decimals' slider UI
    doms.domDisplayDecimalsSlider.onchange = function (evt) {
        setDecimals(Number(evt.target.value));
    };

    // Hook up the 'explorer' select UI
    document.getElementById('explorer').onchange = function (evt) {
        setExplorer(
            cChainParams.current.Explorers.find(
                (a) => a.url === evt.target.value
            )
        );
    };

    // Hook up the 'translation' select UI
    document.getElementById('translation').onchange = function (evt) {
        setTranslation(evt.target.value);
    };

    // Hook up the 'analytics' select UI
    document.getElementById('analytics').onchange = function (evt) {
        setAnalytics(arrAnalytics.find((a) => a.name === evt.target.value));
    };

    await Promise.all([
        fillExplorerSelect(),
        fillNodeSelect(),
        fillTranslationSelect(),
    ]);

    // Fetch price data, then fetch chain data
    if (getNetwork().enabled) {
        refreshPriceDisplay().finally(refreshChainData);
    }

    const database = await Database.getInstance();

    // Fetch settings from Database
    const {
        analytics: strSettingAnalytics,
        autoswitch,
        coldAddress,
        displayDecimals,
    } = await database.getSettings();

    // Set the Cold Staking address
    strColdStakingAddress = coldAddress;

    // Set any Toggles to their default or DB state
    fAutoSwitch = autoswitch;
    doms.domAutoSwitchToggle.checked = fAutoSwitch;

    // Set the display decimals
    nDisplayDecimals = displayDecimals;
    doms.domDisplayDecimalsSlider.value = nDisplayDecimals;

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

    // Add each analytics level into the UI selector
    fillAnalyticSelect();
}
// --- Settings Functions
export async function setExplorer(explorer, fSilent = false) {
    const database = await Database.getInstance();
    database.setSettings({ explorer: explorer.url });
    cExplorer = explorer;

    // Enable networking + notify if allowed
    const network = new ExplorerNetwork(cExplorer.url, masterKey);
    setNetwork(network);

    // Update the selector UI
    doms.domExplorerSelect.value = cExplorer.url;

    if (!fSilent)
        createAlert(
            'success',
            ALERTS.SWITCHED_EXPLORERS,
            [{ explorerName: cExplorer.name }],
            2250
        );
}

async function setNode(node, fSilent = false) {
    cNode = node;
    const database = await Database.getInstance();
    database.setSettings({ node: node.url });

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
 * Switches the translation and sets the translation preference to database
 * @param {string} strLang
 */
export async function setTranslation(strLang) {
    switchTranslation(strLang);
    const database = await Database.getInstance();
    database.setSettings({ translation: strLang });
    doms.domTranslationSelect.value = strLang;
}

/**
 * Sets and saves the display currency setting in runtime and database
 * @param {string} currency - The currency string name
 */
async function setCurrency(currency) {
    strCurrency = currency;
    const database = await Database.getInstance();
    database.setSettings({ displayCurrency: strCurrency });
    // Update the UI to reflect the new currency
    getBalance(true);
    getStakingBalance(true);
}

/**
 * Sets and saves the display decimals setting in runtime and database
 * @param {number} decimals - The decimals to set for the display
 */
async function setDecimals(decimals) {
    nDisplayDecimals = decimals;
    const database = await Database.getInstance();
    database.setSettings({ displayDecimals: nDisplayDecimals });
    // Update the UI to reflect the new decimals
    getBalance(true);
    getStakingBalance(true);
}

/**
 * Sets and saves the active Cold Staking address
 * @param {string} strColdAddress - The Cold Staking address
 */
export async function setColdStakingAddress(strColdAddress) {
    strColdStakingAddress = strColdAddress;
    const database = await Database.getInstance();
    database.setSettings({ coldAddress: strColdAddress });
}

/**
 * Fills the translation dropbox on the settings page
 */
async function fillTranslationSelect() {
    while (doms.domTranslationSelect.options.length > 0) {
        doms.domTranslationSelect.remove(0);
    }

    // Add each language into the UI selector
    for (const cLang of arrActiveLangs) {
        const opt = document.createElement('option');
        opt.innerHTML = `${cLang.emoji} ${cLang.code.toUpperCase()}`;
        opt.value = cLang.code;
        doms.domTranslationSelect.appendChild(opt);
    }

    const database = await Database.getInstance();
    const { translation: strLang } = await database.getSettings();
    // And update the UI to reflect them (default to English if none)
    doms.domTranslationSelect.value = strLang;
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

    const database = await Database.getInstance();
    const { displayCurrency } = await database.getSettings();

    // And update the UI to reflect them
    strCurrency = doms.domCurrencySelect.value = displayCurrency;
}

/**
 * Fills the Analytics Settings UI
 */
export function fillAnalyticSelect() {
    const domAnalyticsSelect = document.getElementById('analytics');
    domAnalyticsSelect.innerHTML = '';
    for (const analLevel of arrAnalytics) {
        const opt = document.createElement('option');
        // Apply translation to the display HTML
        opt.value = analLevel.name;
        opt.innerHTML = translation['analytic' + analLevel.name];
        domAnalyticsSelect.appendChild(opt);
    }
}

async function setAnalytics(level, fSilent = false) {
    cAnalyticsLevel = level;
    const database = await Database.getInstance();
    await database.setSettings({ analytics: level.name });

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
            [{ level: translation['analytic' + cAnalyticsLevel.name] }],
            2250
        );
}

export function toggleTestnet() {
    if (fWalletLoaded) {
        // Revert testnet toggle
        doms.domTestnetToggler.checked = !doms.domTestnetToggler.checked;
        return createAlert('warning', ALERTS.UNABLE_SWITCH_TESTNET, [], 3250);
    }

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

    // Update testnet toggle in settings
    doms.domTestnetToggler.checked = cChainParams.current.isTestnet;

    fillExplorerSelect();
    fillNodeSelect();
    getBalance(true);
    getStakingBalance(true);
    updateActivityGUI();
    updateGovernanceTab();
}

export function toggleDebug() {
    debug = !debug;
    doms.domDebug.style.display = debug ? '' : 'none';
}

/**
 * Toggle the Auto-Switch mode at runtime and in DB
 */
export async function toggleAutoSwitch() {
    fAutoSwitch = !fAutoSwitch;

    // Update the setting in the DB
    const database = await Database.getInstance();
    await database.setSettings({ autoswitch: fAutoSwitch });
}

async function fillExplorerSelect() {
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

    // Fetch settings from Database
    const database = await Database.getInstance();
    const { explorer: strSettingExplorer } = await database.getSettings();

    // For any that exist: load them, or use the defaults
    await setExplorer(
        cChainParams.current.Explorers.find(
            (a) => a.url === strSettingExplorer
        ) || cExplorer,
        true
    );

    // And update the UI to reflect them
    doms.domExplorerSelect.value = cExplorer.url;
}

async function fillNodeSelect() {
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

    // Fetch settings from Database
    const database = await Database.getInstance();
    const { node: strSettingNode } = await database.getSettings();

    // For any that exist: load them, or use the defaults
    setNode(
        cChainParams.current.Nodes.find((a) => a.url === strSettingNode) ||
            cNode,
        true
    );

    // And update the UI to reflect them
    doms.domNodeSelect.value = cNode.url;
}
