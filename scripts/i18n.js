import { translation_template } from '../locale/template/translation.js';
import { Database } from './database.js';
import { fillAnalyticSelect, setTranslation } from './settings.js';
import { updateEncryptionGUI } from './global.js';
import { wallet } from './wallet.js';
import { getNetwork } from './network.js';
import { cReceiveType, guiToggleReceiveType } from './contacts-book.js';
import { reactive } from 'vue';

/**
 * @type {translation_template}
 */
export const ALERTS = {};

/**
 * @type {translation_template}
 */
export const translation = reactive({});

/**
 * @param {string} code
 * @returns {Promise<translation_template>}
 */
async function getLanguage(code) {
    return (await import(`../locale/${code}/translation.js`)).default;
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
            // Skip empty and/or missing i18n keys, defaulting them to EN
            if (!arrNewLang[strKey]) {
                // It's fine if we import a language multiple times
                // Webpack will fetch it once from the server
                translation[strKey] = (await getLanguage('en'))[strKey];
                continue;
            }

            // Apply the new i18n value to our runtime i18n sheet
            translation[strKey] = arrNewLang[strKey];
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
        switchTranslation('en');
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
function parseUserAgentLang(strUA, arrLangsWithSubset) {
    if (arrLangsWithSubset.some((strLang) => strUA.includes(strLang))) {
        // Split the lang in to 'primary' and 'subset', only use the primary lang
        return strUA.substring(0, 2);
    }
    // Otherwise, just use the full language spec
    return strUA;
}

export const arrActiveLangs = [
    { code: 'en', emoji: '🇬🇧' },
    { code: 'fr', emoji: '🇫🇷' },
    { code: 'de', emoji: '🇩🇪' },
    { code: 'it', emoji: '🇮🇹' },
    { code: 'pt-pt', emoji: '🇵🇹' },
    { code: 'pt-br', emoji: '🇧🇷' },
    { code: 'es-mx', emoji: '🇲🇽' },
    { code: 'ph', emoji: '🇵🇭' },
    { code: 'uwu', emoji: '🐈' },
];

export async function start() {
    // We use this function to parse the UA lang in a safer way: for example, there's multiple `en` definitions
    // ... but we shouldn't duplicate the language files, we can instead cut the affix (US, GB) and simply use 'en'.
    // ... This logic may apply to other languages with such subsets as well, so take care of them here!
    const arrLangsWithSubset = ['en', 'fr', 'de'];

    const localeLang =
        window?.navigator?.userLanguage || window?.navigator?.language;
    const strLang = localeLang
        ? parseUserAgentLang(localeLang.toLowerCase(), arrLangsWithSubset)
        : undefined;

    const database = await Database.getInstance();
    const { translation: localTranslation } = await database.getSettings();

    // Check if set in local storage
    if (localTranslation !== '') {
        setTranslation(localTranslation);
    } else {
        // Check if we support the user's browser locale
        if (arrActiveLangs.find((lang) => lang.code === strLang)) {
            setTranslation(strLang);
        } else {
            // Default to EN if the locale isn't supported yet
            console.log(
                'i18n: Your language (' +
                    strLang +
                    ") is not supported yet, if you'd like to contribute translations (for rewards!) contact us on GitHub or Discord!"
            );
            setTranslation('en');
        }
    }
    translateStaticHTML(translation);
}
