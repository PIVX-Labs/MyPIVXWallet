/**
 * Attributes that opt an <input> out of every browser-side capture channel we
 * can control: autofill, form history, spellcheck and password-manager capture.
 *
 * Wallet secrets must not reach the browser's form history, which is a store we
 * do not own and cannot clear. `autocomplete="off"` is required for that: the
 * non-standard `nope` token used previously suppresses Chrome's credential
 * autofill but does not disable form history in Firefox.
 *
 * `spellcheck="false"` also keeps field text from being sent to a remote
 * spellchecking service.
 *
 * The `data-*` hints are the documented opt-outs for 1Password, LastPass,
 * Bitwarden and Dashlane respectively.
 *
 * @type {Readonly<{[key: string]: string}>}
 */
export const SENSITIVE_INPUT_ATTRS = Object.freeze({
    autocomplete: 'off',
    autocorrect: 'off',
    autocapitalize: 'off',
    spellcheck: 'false',
    'data-1p-ignore': '',
    'data-lpignore': 'true',
    'data-bwignore': 'true',
    'data-form-type': 'other',
});

/**
 * The same opt-out set as an HTML attribute string, for the few places that
 * build inputs from template literals instead of Vue templates.
 * @type {string}
 */
export const SENSITIVE_INPUT_ATTRS_HTML = Object.entries(SENSITIVE_INPUT_ATTRS)
    .map(([key, value]) => (value === '' ? key : `${key}="${value}"`))
    .join(' ');
