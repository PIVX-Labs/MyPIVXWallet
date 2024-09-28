import {
    doms,
    updateLogOutButton,
    updateGovernanceTab,
    dashboard,
    refreshChainData,
} from './global.js';
import { wallet, hasEncryptedWallet } from './wallet.js';
import { cChainParams } from './chain_params.js';
import { setNetwork, ExplorerNetwork, getNetwork } from './network.js';
import { confirmPopup, createAlert } from './misc.js';
import {
    switchTranslation,
    ALERTS,
    translation,
    arrActiveLangs,
    tr,
} from './i18n.js';
import { Database } from './database.js';
import { getEventEmitter } from './event_bus.js';
import countries from 'country-locale-map/countries.json';

// --- Default Settings
/** A mode that emits verbose console info for internal MPW operations */
export let debug = false;
/**
 * The user-selected display currency from Oracle
 * @type {string}
 */
export let strCurrency = getDefaultCurrency();

/**
 * @returns {string} currency based on settings
 */
function getDefaultCurrency() {
    const langCode = navigator.languages[0]?.split('-')?.at(-1) || 'US';
    return (
        countries.find((c) => c.alpha2 === langCode)?.currency?.toLowerCase() ||
        'usd'
    );
}

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
/** automatically lock the wallet after any operation  that requires unlocking */
export let fAutoLockWallet = false;

export class Settings {
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
    /**
     * @type {boolean} Whether auto lock feature is enabled or disabled
     */
    autoLockWallet;
    constructor({
        explorer,
        node,
        autoswitch = true,
        translation = '',
        displayCurrency = getDefaultCurrency(),
        displayDecimals = nDisplayDecimals,
        advancedMode = false,
        coldAddress = '',
        autoLockWallet = false,
    } = {}) {
        this.explorer = explorer;
        this.node = node;
        this.autoswitch = autoswitch;
        this.translation = translation;
        this.displayCurrency = displayCurrency;
        this.displayDecimals = displayDecimals;
        this.advancedMode = advancedMode;
        this.autoLockWallet = autoLockWallet;
        // DEPRECATED: Read-only below here, for migration only
        this.coldAddress = coldAddress;
    }
}

// Users need not look below here.
// ------------------------------
// Global Keystore / Wallet Information

// --- DOM Cache
export async function start() {
    //TRANSLATIONS
    //to make translations work we need to change it so that we just enable or disable the visibility of the text

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

    // Hook up the 'node' select UI
    document.getElementById('node').onchange = function (evt) {
        setNode(
            cChainParams.current.Nodes.find((a) => a.url === evt.target.value)
        );
    };

    // Hook up the 'translation' select UI
    document.getElementById('translation').onchange = function (evt) {
        setTranslation(evt.target.value);
    };

    await Promise.all([
        fillExplorerSelect(),
        fillNodeSelect(),
        fillTranslationSelect(),
    ]);

    const database = await Database.getInstance();

    // Fetch settings from Database
    const {
        autoswitch,
        displayCurrency,
        displayDecimals,
        advancedMode,
        autoLockWallet,
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
    // auto lock wallet
    fAutoLockWallet = autoLockWallet;
    doms.domAutoLockModeToggler.checked = fAutoLockWallet;
    configureAutoLockWallet();

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

    // Subscribe to events
    subscribeToNetworkEvents();

    // Check if password is encrypted
    if (await hasEncryptedWallet()) {
        doms.domChangePasswordContainer.classList.remove('d-none');
    }
}

function subscribeToNetworkEvents() {
    getEventEmitter().on('currency-loaded', async (mapCurrencies) => {
        await fillCurrencySelect(mapCurrencies);
    });
}

// --- Settings Functions
export async function setExplorer(explorer, fSilent = false) {
    const database = await Database.getInstance();
    database.setSettings({ explorer: explorer.url });
    cExplorer = explorer;

    // Enable networking + notify if allowed
    if (getNetwork()) {
        getNetwork().strUrl = cExplorer.url;
    } else {
        const network = new ExplorerNetwork(cExplorer.url, wallet);
        setNetwork(network);
    }

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
async function fillCurrencySelect(mapCurrencies) {
    while (doms.domCurrencySelect.options.length > 0) {
        doms.domCurrencySelect.remove(0);
    }
    // Add each data source currency into the UI selector
    for (const cCurrency of mapCurrencies.values()) {
        const opt = document.createElement('option');
        opt.innerHTML = cCurrency.currency.toUpperCase();
        opt.value = cCurrency.currency;
        doms.domCurrencySelect.appendChild(opt);
    }

    const database = await Database.getInstance();
    let { displayCurrency } = await database.getSettings();
    if (!mapCurrencies.has(displayCurrency)) {
        // Currency not supported; fallback to USD
        displayCurrency = 'usd';
        database.setSettings({ displayCurrency });
    }
    // And update the UI to reflect them
    strCurrency = doms.domCurrencySelect.value = displayCurrency;
}

/**
 * Log out from the current wallet
 */
export async function logOut() {
    if (wallet.isSyncing) {
        createAlert('warning', `${ALERTS.WALLET_NOT_SYNCED}`, 3000);
        return;
    }
    const fContinue = await confirmPopup({
        title: `${ALERTS.CONFIRM_POPUP_DELETE_ACCOUNT_TITLE}`,
        html: `
        <div class="modalContents">
            <span class="topText">
                <b>${tr(translation.netSwitchUnsavedWarningSubtitle, [
                    { network: cChainParams.current.name },
                ])}</b><br><br>

                <span class="textGradientKeys">${
                    ALERTS.CONFIRM_POPUP_DELETE_ACCOUNT
                }</span>
            </span>
        </div>
    `,
    });
    if (!fContinue) return;
    const database = await Database.getInstance();
    await database.removeAccount({ publicKey: null });

    getEventEmitter().emit('toggle-network');
    updateLogOutButton();
    createAlert('success', translation.accountDeleted, 3000);
}

/**
 * Toggle between Mainnet and Testnet
 */
export async function toggleTestnet(
    wantTestnet = !cChainParams.current.isTestnet
) {
    if (wallet.isLoaded() && !wallet.isSynced) {
        createAlert('warning', `${ALERTS.WALLET_NOT_SYNCED}`, 3000);
        doms.domTestnetToggler.checked = cChainParams.current.isTestnet;
        return;
    }
    const cNextNetwork = wantTestnet ? cChainParams.testnet : cChainParams.main;

    // If the current wallet is not saved, we'll ask the user for confirmation, since they'll lose their wallet if they switch with an unsaved wallet!
    if (wallet.isLoaded() && !(await hasEncryptedWallet())) {
        const fContinue = await confirmPopup({
            title: tr(translation.netSwitchUnsavedWarningTitle, [
                { network: cChainParams.current.name },
            ]),
            html: `<div style="color:#af9cc6;">
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
        </div>`,
        });

        if (!fContinue) {
            // Kick back the "toggle" switch
            doms.domTestnetToggler.checked = cChainParams.current.isTestnet;
            return;
        }
    }

    // Update current chain config
    cChainParams.current = cNextNetwork;

    // Update testnet toggle in settings
    doms.domTestnetToggler.checked = cChainParams.current.isTestnet;
    await start();
    // Make sure we have the correct number of blocks before loading any wallet
    await refreshChainData();
    getEventEmitter().emit('toggle-network');
    await updateGovernanceTab();
}

export function toggleDebug(newValue = !debug) {
    debug = newValue;
    getEventEmitter().emit('toggle-debug', debug);
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

export async function toggleAutoLockWallet() {
    fAutoLockWallet = !fAutoLockWallet;
    configureAutoLockWallet();
    // Update the setting in the DB
    const database = await Database.getInstance();
    await database.setSettings({ autoLockWallet: fAutoLockWallet });
}

/**
 * Configure the app functionality and UI for the current mode
 */
async function configureAdvancedMode() {
    getEventEmitter().emit('advanced-mode', fAdvancedMode);
}

function configureAutoLockWallet() {
    getEventEmitter().emit('auto-lock-wallet', fAutoLockWallet);
}

export function changePassword() {
    dashboard.changePassword();
}
