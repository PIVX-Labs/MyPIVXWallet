function switchTranslation(langName){
    if(arrActiveLangs.includes(langName)){
      translation = translatableLanguages[langName]
      translate(translation);
      console.log(translation)

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
      console.log("That language does not exist")
    }
}

function translateAlerts(message,variables){
    variables.forEach(element => {
        console.log(Object.keys(element))
        console.log(element)
        message = message.replace("{"+Object.keys(element)[0]+"}",Object.values(element)[0])
    });
    console.log(message)
    return message
}



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

function loadAlerts(){
    ALERTS = {
        FAILED_TO_IMPORT: translation.FAILED_TO_IMPORT,
        TESTNET_ENCRYPTION_DISABLED: translation.TESTNET_ENCRYPTION_DISABLED,
        PASSWORD_TOO_SMALL: translation.PASSWORD_TOO_SMALL,
        PASSWORD_DOESNT_MATCH: translation.PASSWORD_DOESNT_MATCH,
        NEW_PASSWORD_SUCCESS: translation.NEW_PASSWORD_SUCCESS,
        INVALID_AMOUNT: translation.INVALID_AMOUNT,
        VALIDATE_AMOUNT_LOW: translation.VALIDATE_AMOUNT_LOW,
        VALIDATE_AMOUNT_DECIMAL: translation.VALIDATE_AMOUNT_DECIMAL,
        SUCCESS_STAKING_ADDR: translation.SUCCESS_STAKING_ADDR,
        CONFIRM_UNSTAKE_H_WALLET: translation.CONFIRM_UNSTAKE_H_WALLET,
        CONFIRM_TRANSACTION_H_WALLET:translation.CONFIRM_TRANSACTION_H_WALLET,
        SUCCESS_STAKING_ADDR_SET: translation.SUCCESS_STAKING_ADDR_SET,
        STAKE_NOT_SEND: translation.STAKE_NOT_SEND,
        BAD_ADDR_LENGTH: translation.BAD_ADDR_LENGTH,
        BAD_ADDR_PREFIX: translation.BAD_ADDR_PREFIX,
        BAD_ADDR_PREFIX_2: translation.BAD_ADDR_PREFIX_2,
        SENT_NOTHING: translation.SENT_NOTHING,
        MORE_THEN_8_DECIMALS: translation.MORE_THEN_8_DECIMALS,
        SAVE_WALLET_PLEASE: translation.SAVE_WALLET_PLEASE,
        BACKUP_OR_ENCRYPT_WALLET: translation.BACKUP_OR_ENCRYPT_WALLET
    }
}