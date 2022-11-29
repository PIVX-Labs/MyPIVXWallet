'use strict';

/**
 * Takes the language name and sets the translation settings based on the language file
 * @param {string} langName 
 */
function switchTranslation(langName){
    if(arrActiveLangs.includes(langName)){
      let translation = translatableLanguages[langName]
      translate(translation);

      //Apply translations to the transparency report
      STATS = {
          // Stat key   // Description of the stat, it's data, and it's purpose
          hit:          translation.hit,
          time_to_sync: translation.time_to_sync,
          transaction:  translation.transaction
      }
      transparencyReport = translation.transparencyReport
      arrAnalytics = [
          // Statistic level  // Allowed statistics
          { name: "Disabled", stats: [] },
          { name: "Minimal",  stats: [STATS.hit, STATS.time_to_sync] },
          { name: "Balanced", stats: [STATS.hit, STATS.time_to_sync, STATS.transaction] }
      ]
      let SettingAnalytics = localStorage.getItem('analytics');
      setAnalytics(cAnalyticsLevel = arrAnalytics.find(a => a.name === SettingAnalytics) || cAnalyticsLevel, true);

      loadAlerts();
    }else{
      console.log("That language does not exist");
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
function translateAlerts(message,variables){
    variables.forEach(element => {
        message = message.replace("{"+Object.keys(element)[0]+"}",Object.values(element)[0]);
    });
    return message;
}


/**
 * Translates all the static html based on the tag data-i18n
 * @param {Array} i18nLangs 
 *
 */
function translate(i18nLangs) {
    if (!i18nLangs) return;

    document.querySelectorAll("[data-i18n]").forEach(function(element) {
        if (!i18nLangs[element.dataset.i18n]) return;

        if (element.dataset.i18n_target) {
            element[element.dataset.i18n_target] = i18nLangs[element.dataset.i18n];
        } else {
            switch (element.tagName.toLowerCase()) {
                case "input":
                case "textarea":
                    element.placeholder = i18nLangs[element.dataset.i18n];
                default:
                    element.innerHTML = i18nLangs[element.dataset.i18n];
            }
        }
    });
    loadAlerts();
}

/**
 * Translates the alerts by loading the data into the ALERTS object
 */
function loadAlerts() {
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