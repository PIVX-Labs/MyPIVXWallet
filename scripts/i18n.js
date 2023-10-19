// import { translation_template } from '../locale/template/translation.js';
import { Database } from './database.js';
import { fillAnalyticSelect, setTranslation } from './settings.js';
import { updateEncryptionGUI } from './global.js';
import { wallet } from './wallet.js';
import { getNetwork } from './network.js';
import { cReceiveType, guiToggleReceiveType } from './contacts-book.js';
import { reactive } from 'vue';
import { negotiateLanguages } from '@fluent/langneg';
import toml from 'toml';


/**
 * @type {translation_template}
 */
export const ALERTS = {};

/**
 * @type {translation_template}
 */
export const translation = reactive({});

const defaultLang = 'en';

/**
 * @param {string} langName
 * @example getParentlanguage('es-ES') === 'es' // true
 * @example getParentLanguage('es') === defaultLang // true
 * @returns the 'parent' language of a langcode
 */
function getParentLanguage(langName) {
    return langName.includes('-') ? langName.split('-')[0] : defaultLang;
}

const cachedLangs = new Map();
/**
 * @param {string} code
 * @returns {Promise<translation_template>}
 */
async function getLanguage(code) {
    if (cachedLangs.has(code)) {
        return cachedLangs.get(code);
    } else {
        const translation = toml.parse(
            (await import(`../locale/${code}/translation.toml`)).default
        );
        cachedLangs.set(code, translation);
        return translation;
    }
}

async function setTranslationKey(key, langName) {
    const lang = await getLanguage(langName);
    // If there's an empty or missing key, use the parent language
    if (lang[key]) {
        translation[key] = lang[key];
    } else {
        setTranslationKey(key, getParentLanguage(langName));
    }
}

/**
 * Takes the language name and sets the translation settings based on the language file
 * @param {string} langName
 */
export async function switchTranslation(langName) {
    if (arrActiveLangs.find((lang) => lang.code === langName)) {
        // Load every 'active' key of the language, otherwise, we'll default the key to the EN file
        const arrNewLang = await getLanguage(langName);
        for (const strKey of Object.keys(arrNewLang)) {
            await setTranslationKey(strKey, langName);
        }

        // Translate static`data-i18n` tags
        translateStaticHTML(translation);

        // Translate any dynamic elements necessary
        const cNet = getNetwork();
        if (wallet.isLoaded() && cNet) {
            updateEncryptionGUI();
        }
        loadAlerts();
        fillAnalyticSelect();
        if (wallet.isLoaded()) {
            guiToggleReceiveType(cReceiveType);
        }
        return true;
    } else {
        console.log(
            'i18n: The language (' +
                langName +
                ") is not supported yet, if you'd like to contribute translations (for rewards!) contact us on GitHub or Discord!"
        );
        switchTranslation(defaultLang);
        return false;
    }
}

/**
 * Takes an i18n string that includes `{x}` and replaces that based on what is in the array of objects
 * @param {string} message
 * @param {Array<Object>} variables
 * @returns a string with the variables implemented in the string
 *
 * @example
 * //returns "test this"
 * tr("test {x}" [x: "this"])
 */
export function tr(message, variables) {
    variables.forEach((element) => {
        message = message.replaceAll(
            '{' + Object.keys(element)[0] + '}',
            Object.values(element)[0]
        );
    });
    return message;
}

/**
 * Translates all static HTML based on the `data-i18n` tag
 * @param {Array} i18nLangs
 */
export function translateStaticHTML(i18nLangs) {
    if (!i18nLangs) return;

    document.querySelectorAll('[data-i18n]').forEach(function (element) {
        if (!i18nLangs[element.dataset.i18n]) return;

        if (element.dataset.i18n_target) {
            element[element.dataset.i18n_target] =
                i18nLangs[element.dataset.i18n];
        } else {
            switch (element.tagName.toLowerCase()) {
                case 'input':
                case 'textarea':
                    element.placeholder = i18nLangs[element.dataset.i18n];
                    break;
                default:
                    element.innerHTML = i18nLangs[element.dataset.i18n];
                    break;
            }
        }
    });
    loadAlerts();
}

/**
 * Translates the alerts by loading the data into the ALERTS object
 */
export function loadAlerts() {
    // Alerts are designated by a special 'ALERTS' entry in each translation file
    let fFoundAlerts = false;
    for (const [alert_key, alert_translation] of Object.entries(translation)) {
        if (fFoundAlerts) {
            ALERTS[alert_key] = alert_translation;
        }
        // Skip all entries until we find the ALERTS flag
        if (alert_key === 'ALERTS') fFoundAlerts = true;
    }
}

export const arrActiveLangs = [
    { code: 'en', emoji: '🇬🇧' },
    { code: 'fr', emoji: '🇫🇷' },
    { code: 'de', emoji: '🇩🇪' },
    { code: 'nl', emoji: '🇳🇱' },
    { code: 'it', emoji: '🇮🇹' },
    { code: 'pt-pt', emoji: '🇵🇹' },
    { code: 'pt-br', emoji: '🇧🇷' },
    { code: 'es-mx', emoji: '🇲🇽' },
    { code: 'ph', emoji: '🇵🇭' },
    { code: 'uwu', emoji: '🐈' },
];

export async function start() {
    const db = await Database.getInstance();
    const settings = await db.getSettings();
    const language =
        settings?.translation ??
        negotiateLanguages(
            window.navigator.languages,
            arrActiveLangs.map((l) => l.code),
            {
                defualtLocale: defaultLang,
            }
        )[0];
    await setTranslation(language);
}
