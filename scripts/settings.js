import {
    doms,
    updateLogOutButton,
    dashboard,
    refreshChainData,
} from './global.js';
import { wallet, hasEncryptedWallet } from './wallet.js';
import { cChainParams } from './chain_params.js';
import { confirmPopup } from './misc.js';
import {
    switchTranslation,
    ALERTS,
    translation,
    arrActiveLangs,
    tr,
} from './i18n.js';
import { createAlert } from './alerts/alert.js';
import { Database } from './database.js';
import { getEventEmitter } from './event_bus.js';
import countries from 'country-locale-map/countries.json';
import { getNetwork } from './network/network_manager.js';
import { getRandomElement } from './utils.js';

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

/** A mode which allows MPW to automatically select it's data sources */
export let fAutoSwitch = true;
/** The decimals to display for the wallet balance */
export let nDisplayDecimals = 2;
/** A mode which configures MPW towards Advanced users, with low-level feature access and less restrictions (Potentially dangerous) */
export let fAdvancedMode = false;
/** Automatically lock the wallet after any operation that requires unlocking */
export let fAutoLockWallet = false;
/** The user's transaction mode, `true` for public, `false` for private */
export let fPublicMode = true;

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
    /**
     * @type {Boolean} The user's transaction mode, `true` for public, `false` for private
     */
    publicMode;

    /** @type {String} The Cold Address that this account delegates to. */
    coldAddress = '';

    constructor({
        explorer,
        node,
        autoswitch = true,
        translation = '',
        displayCurrency = getDefaultCurrency(),
        displayDecimals = nDisplayDecimals,
        advancedMode = false,
        autoLockWallet = false,
        publicMode = true,
        coldAddress = '',
    } = {}) {
        this.explorer = explorer;
        this.node = node;
        this.autoswitch = autoswitch;
        this.translation = translation;
        this.displayCurrency = displayCurrency;
        this.displayDecimals = displayDecimals;
        this.advancedMode = advancedMode;
        this.autoLockWallet = autoLockWallet;
        this.publicMode = publicMode;
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
        publicMode,
    } = await database.getSettings();

    // Transaction Mode (Public/Private)
    fPublicMode = publicMode;

    // Auto lock wallet
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
    await database.setSettings({ explorer: explorer.url });
    getNetwork().setNetwork(explorer.url, false);

    // Update the selector UI
    doms.domExplorerSelect.value = explorer.url;

    if (!fSilent) {
        createAlert(
            'success',
            tr(ALERTS.SWITCHED_EXPLORERS, [{ explorerName: explorer.name }]),
            2250
        );
    }
    getEventEmitter().emit('explorer_changed', explorer.url);
}

export async function setNode(node, fSilent = false) {
    getNetwork().setNetwork(node.url, true);
    const database = await Database.getInstance();
    database.setSettings({ node: node.url });

    // Update the selector UI
    doms.domNodeSelect.value = node.url;

    if (!fSilent)
        createAlert(
            'success',
            tr(ALERTS.SWITCHED_NODE, [{ node: node.name }]),
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
    getEventEmitter().emit('price-update');
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
    getEventEmitter().emit('price-update');
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
    getNetwork().reset();
    await start();
    // Make sure we have the correct number of blocks before loading any wallet
    await refreshChainData();
    getEventEmitter().emit('toggle-network');
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
    const firstExplorer = getRandomElement(cChainParams.current.Explorers);

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

    // For any that exist: load them, or use the default
    await setExplorer(
        cChainParams.current.Explorers.find(
            (a) => a.url === strSettingExplorer
        ) || firstExplorer,
        true
    );
}

async function fillNodeSelect() {
    const firstNode = getRandomElement(cChainParams.current.Nodes);

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
            firstNode,
        true
    );
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
 * Toggle Advanced Mode at runtime and in DB
 */
export async function toggleAutoLockWallet() {
    fAutoLockWallet = !fAutoLockWallet;
    configureAutoLockWallet();

    // Update the setting in the DB
    const database = await Database.getInstance();
    await database.setSettings({ autoLockWallet: fAutoLockWallet });
}

/**
 * Toggle the Transaction Mode at runtime and in DB
 * @param {boolean?} fNewPublicMode - Optionally force the setting to a value
 */
export async function togglePublicMode(fNewPublicMode = !fPublicMode) {
    fPublicMode = fNewPublicMode;

    // Update the setting in the DB
    const database = await Database.getInstance();
    await database.setSettings({ publicMode: fPublicMode });
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
