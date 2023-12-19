import {
    doms,
    getStakingBalance,
    mempool,
    refreshChainData,
    updateEncryptionGUI,
    updateLogOutButton,
    updateGovernanceTab,
    stakingDashboard,
    dashboard,
} from './global.js';
import { wallet, hasEncryptedWallet } from './wallet.js';
import { cChainParams } from './chain_params.js';
import { setNetwork, ExplorerNetwork, getNetwork } from './network.js';
import { confirmPopup, createAlert, isEmpty } from './misc.js';
import {
    switchTranslation,
    ALERTS,
    translation,
    arrActiveLangs,
    tr,
} from './i18n.js';
import { CoinGecko, refreshPriceDisplay } from './prices.js';
import { Database } from './database.js';
import { getEventEmitter } from './event_bus.js';
import { getCurrencyByAlpha2 } from 'country-locale-map';

// --- Default Settings
/** A mode that emits verbose console info for internal MPW operations */
export let debug = false;
/**
 * The user-selected display currency from market-aggregator sites
 * @type {string}
 */
export let strCurrency = getDefaultCurrency();

/**
 * @returns {string} currency based on settings
 */
function getDefaultCurrency() {
    const langCode = navigator.languages[0]?.split('-')?.at(-1) || 'US';
    return getCurrencyByAlpha2(langCode)?.toLowerCase() || 'usd';
}
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
/** The decimals to display for the wallet balance */
export let nDisplayDecimals = 2;
/** A mode which configures MPW towards Advanced users, with low-level feature access and less restrictions (Potentially dangerous) */
export let fAdvancedMode = false;

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
    /**
     * @type {boolean} Whether Advanced Mode is enabled or disabled
     */
    advancedMode;
    constructor({
        analytics,
        explorer,
        node,
        autoswitch = true,
        translation = '',
        displayCurrency = getDefaultCurrency(),
        displayDecimals = nDisplayDecimals,
        advancedMode = false,
        coldAddress = '',
    } = {}) {
        this.analytics = analytics;
        this.explorer = explorer;
        this.node = node;
        this.autoswitch = autoswitch;
        this.translation = translation;
        this.displayCurrency = displayCurrency;
        this.displayDecimals = displayDecimals;
        this.advancedMode = advancedMode;
        // DEPRECATED: Read-only below here, for migration only
        this.coldAddress = coldAddress;
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
        displayCurrency,
        displayDecimals,
        advancedMode,
        // DEPRECATED: Below here are entries that are read-only due to being moved to a different location in the DB
        coldAddress,
    } = await database.getSettings();

    // Cold Staking: As of v1.2.1 this was moved to the Account class, if any exists here, we'll migrate it then wipe it
    // Note: We also only migrate Mainnet addresses, to keep the migration logic simple
    if (
        coldAddress &&
        coldAddress.startsWith(cChainParams.main.STAKING_PREFIX)
    ) {
        const cAccount = await database.getAccount();
        // Ensure an account exists (it is possible that a Cold Address was set without a wallet being encrypted)
        if (cAccount) {
            // We'll add the Cold Address to the account
            cAccount.coldAddress = coldAddress;
            // Save the changes
            await database.updateAccount(cAccount);
            // And wipe the old setting
            await database.setSettings({ coldAddress: '' });
        }
    }

    // Set any Toggles to their default or DB state
    // Network Auto-Switch
    fAutoSwitch = autoswitch;
    doms.domAutoSwitchToggle.checked = fAutoSwitch;

    // Advanced Mode
    fAdvancedMode = advancedMode;
    doms.domAdvancedModeToggler.checked = fAdvancedMode;
    await configureAdvancedMode();

    // Set the display currency
    strCurrency = doms.domCurrencySelect.value = displayCurrency;

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
    const network = new ExplorerNetwork(cExplorer.url, wallet);
    setNetwork(network);

    stakingDashboard.reset();

    // Update the selector UI
    doms.domExplorerSelect.value = cExplorer.url;

    if (!fSilent)
        createAlert(
            'success',
            tr(ALERTS.SWITCHED_EXPLORERS, [{ explorerName: cExplorer.name }]),
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
            tr(ALERTS.SWITCHED_NODE, [{ node: cNode.name }]),
            2250
        );
}

//TRANSLATION
/**
 * Switches the translation and sets the translation preference to database
 * @param {string} strLang
 */
export async function setTranslation(strLang = 'auto') {
    await switchTranslation(strLang);
    const database = await Database.getInstance();
    await database.setSettings({ translation: strLang });
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
    getEventEmitter().emit('balance-update');
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
    getEventEmitter().emit('balance-update');
    getStakingBalance(true);
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
        opt.innerHTML = `${cLang.emoji} ${cLang.display}`;
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
    const arrCurrencies = await cMarket.getCurrencies();

    // Only update if we have a currency list
    if (!isEmpty(arrCurrencies)) {
        while (doms.domCurrencySelect.options.length > 0) {
            doms.domCurrencySelect.remove(0);
        }
        // Add each data source currency into the UI selector
        for (const currency of arrCurrencies) {
            const opt = document.createElement('option');
            opt.innerHTML = currency.toUpperCase();
            opt.value = currency;
            doms.domCurrencySelect.appendChild(opt);
        }
    }

    const database = await Database.getInstance();
    let { displayCurrency } = await database.getSettings();
    if (!arrCurrencies.find((v) => v === displayCurrency)) {
        // Currency not supported; fallback to USD
        displayCurrency = 'usd';
        database.setSettings({ displayCurrency });
    }
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
            tr(ALERTS.SWITCHED_ANALYTICS, [
                { level: translation['analytic' + cAnalyticsLevel.name] },
            ]),
            2250
        );
}

/**
 * Log out from the current wallet
 */
export async function logOut() {
    const cNet = getNetwork();
    if (!cNet.fullSynced && wallet.isLoaded()) {
        createAlert('warning', `${ALERTS.WALLET_NOT_SYNCED}`, 3000);
        return;
    }
    const fContinue = await confirmPopup({
        title: `${ALERTS.CONFIRM_POPUP_DELETE_ACCOUNT_TITLE}`,
        html: `
        <b>${tr(translation.netSwitchUnsavedWarningSubtitle, [
            { network: cChainParams.current.name },
        ])}</b>
        <br>
        ${ALERTS.CONFIRM_POPUP_DELETE_ACCOUNT}
        <br>
        <br>
    `,
    });
    if (!fContinue) return;
    const database = await Database.getInstance();
    await database.removeAccount({ publicKey: null });

    getEventEmitter().emit('toggle-network');
    updateLogOutButton();
    await updateEncryptionGUI();
    createAlert('success', translation.accountDeleted, 3000);
}

/**
 * Toggle between Mainnet and Testnet
 */
export async function toggleTestnet() {
    const cNet = getNetwork();
    if (!cNet.fullSynced && wallet.isLoaded()) {
        createAlert('warning', `${ALERTS.WALLET_NOT_SYNCED}`, 3000);
        doms.domTestnetToggler.checked = cChainParams.current.isTestnet;
        return;
    }
    const cNextNetwork = cChainParams.current.isTestnet
        ? cChainParams.main
        : cChainParams.testnet;

    // If the current wallet is not saved, we'll ask the user for confirmation, since they'll lose their wallet if they switch with an unsaved wallet!
    if (wallet.isLoaded() && !(await hasEncryptedWallet())) {
        const fContinue = await confirmPopup({
            title: tr(translation.netSwitchUnsavedWarningTitle, [
                { network: cChainParams.current.name },
            ]),
            html: `
            <b>${tr(translation.netSwitchUnsavedWarningSubtitle, [
                { network: cChainParams.current.name },
            ])}</b>
            <br>
            ${tr(translation.netSwitchUnsavedWarningSubtext, [
                { network: cNextNetwork.name },
            ])}
            <br>
            <br>
            <i style="opacity:0.65">${
                translation.netSwitchUnsavedWarningConfirmation
            }</i>
        `,
        });

        if (!fContinue) {
            // Kick back the "toggle" switch
            doms.domTestnetToggler.checked = cChainParams.current.isTestnet;
            return;
        }
    }

    // Update current chain config
    cChainParams.current = cNextNetwork;

    // Update UI and static tickers
    doms.domTestnet.style.display = cChainParams.current.isTestnet
        ? ''
        : 'none';
    doms.domGuiBalanceStakingTicker.innerText = cChainParams.current.TICKER;
    // Update testnet toggle in settings
    doms.domTestnetToggler.checked = cChainParams.current.isTestnet;

    await fillExplorerSelect();
    await fillNodeSelect();

    stakingDashboard.reset();

    getEventEmitter().emit('toggle-network');
    await updateGovernanceTab();
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

/**
 * Toggle Advanced Mode at runtime and in DB
 */
export async function toggleAdvancedMode() {
    fAdvancedMode = !fAdvancedMode;

    // Configure the app accordingly
    await configureAdvancedMode();

    // Update the setting in the DB
    const database = await Database.getInstance();
    await database.setSettings({ advancedMode: fAdvancedMode });
}

/**
 * Configure the app functionality and UI for the current mode
 */
async function configureAdvancedMode() {
    getEventEmitter().emit('advanced-mode', fAdvancedMode);
    // Hide or Show the "Owner Address" configuration for Staking, and reset it's input
    doms.domStakeOwnerAddress.value = '';
    doms.domStakeOwnerAddressContainer.hidden = !fAdvancedMode;
}

export function changePassword() {
    dashboard.changePassword();
}
