var translate = function(i18nLangs) {
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
}