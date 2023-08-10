import { en_translation } from '../locale/en/translation.js';
import { pt_br_translation } from '../locale/pt-br/translation.js';
import { pt_pt_translation } from '../locale/pt-pt/translation.js';
import { ph_translation } from '../locale/ph/translation.js';
import { uwu_translation } from '../locale/uwu/translation.js';
import { fr_translation } from '../locale/fr/translation.js';
import { de_translation } from '../locale/de/translation.js';
import { Database } from './database.js';
import { fillAnalyticSelect, setTranslation } from './settings.js';

export const ALERTS = {};
export let translation = {};

// TRANSLATION
//Create an object of objects filled with all the translations
export const translatableLanguages = {
    en: en_translation,
    uwu: uwu_translation,
    'pt-pt': pt_pt_translation,
    'pt-br': pt_br_translation,
    ph: ph_translation,
    fr: fr_translation,
    de: de_translation,
};

/**
 * Takes the language name and sets the translation settings based on the language file
 * @param {string} langName
 */
export function switchTranslation(langName) {
    if (arrActiveLangs.find((lang) => lang.code === langName)) {
        translation = translatableLanguages[langName];
        translate(translation);
        loadAlerts();
        fillAnalyticSelect();
        return true;
    } else {
        console.log(
            'i18n: The language (' +
                langName +
                ") is not supported yet, if you'd like to contribute translations (for rewards!) contact us on GitHub or Discord!"
        );
        translation = translatableLanguages.en_translation;
        return false;
    }
}

/**
 * Takes a string that includes {x} and replaces that based on what is in the array of objects
 * @param {string} message
 * @param {array<Object>} variables
 * @returns a string with the variables implemented in the string
 *
 * @example
 * //returns "test this"
 * translateAlerts("test {x}" [x : "this"])
 */
export function translateAlerts(message, variables) {
    variables.forEach((element) => {
        message = message.replaceAll(
            '{' + Object.keys(element)[0] + '}',
            Object.values(element)[0]
        );
    });
    return message;
}

/**
 * Translates all the static html based on the tag data-i18n
 * @param {Array} i18nLangs
 *
 */
export function translate(i18nLangs) {
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

// When adding a lang remember to add it to the object translatableLanguages as well as here.
export const arrActiveLangs = [
    { code: 'en', emoji: '🇬🇧' },
    { code: 'fr', emoji: '🇫🇷' },
    { code: 'de', emoji: '🇩🇪' },
    { code: 'pt-pt', emoji: '🇵🇹' },
    { code: 'pt-br', emoji: '🇧🇷' },
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

    // When removing you do not have to remove from translatableLanguages
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
    translate(translation);
}
