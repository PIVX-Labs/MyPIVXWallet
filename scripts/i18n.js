import template from '../locale/template/translation.toml';
import { Database } from './database.js';
import { fillAnalyticSelect, setTranslation } from './settings.js';
import { updateEncryptionGUI } from './global.js';
import { wallet } from './wallet.js';
import { getNetwork } from './network.js';
import { cReceiveType, guiToggleReceiveType } from './contacts-book.js';
import { reactive } from 'vue';
import { negotiateLanguages } from '@fluent/langneg';

/**
 * @type {translation_template}
 */
export let ALERTS = {};

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
    const strParentCode = langName.includes('-')
        ? langName.split('-')[0]
        : defaultLang;
    // Ensure the code exists
    return strParentCode;
}

/**
 * @param {string} code
 * @returns {Promise<translation_template>}
 */
async function getLanguage(code) {
    try {
        return (await import(`../locale/${code}/translation.toml`)).default;
    } catch (e) {
        return template;
    }
}

async function setTranslationKey(key, langName) {
    const lang = await getLanguage(langName);

    if (key === 'ALERTS') {
        await setAlertKey(langName);
        return;
    }
    if (lang[key]) {
        translation[key] = lang[key];
    } else {
        if (langName === defaultLang) {
            // If the default language doens't have a string, then it has never been translated
            translation[key] = '';
            return;
        }
        // If there's an empty or missing key, use the parent language
        await setTranslationKey(key, getParentLanguage(langName));
    }
}

/**
 * Set the alert key for a given langName
 * @param {String} langName - language name
 */
async function setAlertKey(langName) {
    const lang = await getLanguage(langName);
    translation['ALERTS'] = lang['ALERTS'];
    for (const subKey in lang['ALERTS']) {
        setAlertSubKey(subKey, langName);
    }
}

/**
 * Set a given subkey for ALERTS key for a given langName
 * @param {String} langName - language name
 * @param {String} subKey - ALERT subkey that we want to set
 */
async function setAlertSubKey(subKey, langName) {
    const lang = await getLanguage(langName);
    const item = lang['ALERTS'][subKey];
    if (item) {
        translation['ALERTS'][subKey] = item;
    } else {
        if (langName === defaultLang) {
            //Should not happen but just in case
            translation['ALERTS'][subKey] = '';
            return;
        }
        await setAlertSubKey(subKey, getParentLanguage(langName));
    }
}

/**
 * Takes the language name and sets the translation settings based on the language file
 * @param {string} langName
 */
export async function switchTranslation(langName) {
    if (langName === 'auto' || !langName) {
        langName = negotiateLanguages(
            window.navigator.languages,
            arrActiveLangs.slice(1).map((l) => l.code),
            {
                defaultLocale: defaultLang,
            }
        )[0];
    }

    if (arrActiveLangs.find((lang) => lang.code === langName)) {
        // Load every 'active' key of the language, otherwise, we'll default the key to the EN file
        for (const strKey of Object.keys(template)) {
            await setTranslationKey(strKey, langName);
        }

        // Translate static`data-i18n` tags
        translateStaticHTML(translation);

        // Translate any dynamic elements necessary
        const cNet = getNetwork();
        if (wallet.isLoaded() && cNet) {
            await updateEncryptionGUI();
        }
        ALERTS = translation['ALERTS'];
        fillAnalyticSelect();
        if (wallet.isLoaded()) {
            await guiToggleReceiveType(cReceiveType);
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
    ALERTS = translation['ALERTS'];
}

export const arrActiveLangs = [
    { code: 'auto', display: 'Auto', emoji: '🌐' },
    { code: 'en', display: 'English', emoji: '🇬🇧' },
    { code: 'fr', display: 'French', emoji: '🇫🇷' },
    { code: 'de', display: 'German', emoji: '🇩🇪' },
    { code: 'nl', display: 'Dutch', emoji: '🇳🇱' },
    { code: 'it', display: 'Italian', emoji: '🇮🇹' },
    { code: 'pl', display: 'Polish', emoji: '🇵🇱' },
    { code: 'pt-pt', display: 'Portuguese', emoji: '🇵🇹' },
    { code: 'pt-br', display: 'Brazilian Portuguese', emoji: '🇧🇷' },
    { code: 'cnr', display: 'Montenegrin', emoji: '🇲🇪' },
    { code: 'es-mx', display: 'Mexican Spanish', emoji: '🇲🇽' },
    { code: 'ph', display: 'Filipino', emoji: '🇵🇭' },
    { code: 'uwu', display: 'UwU', emoji: '🐈' },
];

export async function start() {
    const db = await Database.getInstance();
    const settings = await db.getSettings();

    await setTranslation(settings?.translation || 'auto');
}
