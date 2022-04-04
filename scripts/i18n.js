// The locale our app first shows
const defaultLocale = "en";

const supportedLocales = ["en", "de"];

const fullyQualifiedLocaleDefaults = {
  en: "en-US",
  ar: "de",
};

// The active locale
let locale;

// Gets filled with active locale translations
let translations = {};

// When the page content is ready...
//document.addEventListener("DOMContentLoaded", () => {     // ** NOTE: This event won't fire on dynamically loaded file; switched to jQuery hook // Ky
$(document).ready(function() {
  const initialLocale = supportedOrDefault(
    browserLocales(true),
  );

  setLocale(initialLocale);

  bindLocaleSwitcher(initialLocale);
});

// Load translations for the given locale and translate
// the page to this locale
async function setLocale(newLocale) {
  if (newLocale === locale) return;

  const newTranslations = await fetchTranslationsFor(
    newLocale,
  );

  locale = newLocale;
  translations = newTranslations;
  document.documentElement.lang = newLocale;
  document.documentElement.dir = dir(newLocale);

  translatePage();
}

// Retrieves translations JSON object for the given
// locale over the network
async function fetchTranslationsFor(newLocale) {
  const response = await fetch(`/lang/${newLocale}.json`);

  return await response.json();
}

// Replace the inner text of all elements with the
// data-i18n-key attribute to translations corresponding
// to their data-i18n-key
function translatePage() {
  document
    .querySelectorAll("[data-i18n-key]")
    .forEach((el) => translateElement(el));
}

// Replace the inner text of the given HTML element
// with the translation in the active locale,
// corresponding to the element's data-i18n-key
function translateElement(element) {
  const key = element.getAttribute("data-i18n-key");

  const options =
    JSON.parse(element.getAttribute("data-i18n-opt")) || {};

  element.innerText = translate(key, options);
}

function translate(key, interpolations = {}) {
  const message = translations[key];

  if (key.endsWith("-plural")) {
    return interpolate(
      pluralFormFor(message, interpolations.count),
      interpolations,
    );
  }

  return interpolate(message, interpolations);
}

// Convert a message like "Hello, {name}" to "Hello, Chad"
// where the given interpolations object is {name: "Chad"}
function interpolate(message, interpolations) {
  return Object.keys(interpolations).reduce(
    (interpolated, key) => {
      const value = formatDate(
        formatNumber(interpolations[key]),
      );

      return interpolated.replace(
        new RegExp(`{\s*${key}\s*}`, "g"),
        value,
      );
    },
    message,
  );
}

/*
  Given a value object like
  {
    "number" : 300000,
    "style": "currency",
    "currency": "EUR"
  } and that the current locale is en, returns "€300,000.00"
*/
function formatNumber(value) {
  if (typeof value === "object" && value.number) {
    const { number, ...options } = value;

    return new Intl.NumberFormat(
      fullyQualifiedLocaleDefaults[locale],
      options,
    ).format(number);
  } else {
    return value;
  }
}

/*
  Given a value object like
  {
    "date": "2021-12-05 15:29:00",
    "dateStyle": "long",
    "timeStyle": "short"
  } and that the current locale is en,
  returns "December 5, 2021 at 3:29 PM"
*/
function formatDate(value) {
  if (typeof value === "object" && value.date) {
    const { date, ...options } = value;

    const parsedDate =
      typeof date === "string" ? Date.parse(date) : date;

    return new Intl.DateTimeFormat(
      fullyQualifiedLocaleDefaults[locale],
      options,
    ).format(parsedDate);
  } else {
    return value;
  }
}

/*
  Given a forms object like
  {
    "zero": "No articles",
    "one": "One article",
    "other": "{count} articles"
  } and a count of 1, returns "One article"
*/
function pluralFormFor(forms, count) {
  const matchingForm = new Intl.PluralRules(locale).select(
    count,
  );

  return forms[matchingForm];
}

function isSupported(locale) {
  return supportedLocales.indexOf(locale) > -1;
}

// Retrieve the first locale we support from the given
// array, or return our default locale
function supportedOrDefault(locales) {
  return locales.find(isSupported) || defaultLocale;
}

function dir(locale) {
  return locale === "de" ? "rtl" : "ltr";
}

function bindLocaleSwitcher(initialValue) {
  const switcher = document.querySelector(
    "[data-i18n-switcher]",
  );

  switcher.value = initialValue;

  switcher.onchange = (e) => {
    setLocale(e.target.value);
  };
}

/**
 * Retrieve user-preferred locales from browser
 *
 * @param {boolean} languageCodeOnly - when true, returns
 * ["en", "fr"] instead of ["en-US", "fr-FR"]
 * @returns array | undefined
 */
function browserLocales(languageCodeOnly = false) {
  return navigator.languages.map((locale) =>
    languageCodeOnly ? locale.split("-")[0] : locale,
  );
}
