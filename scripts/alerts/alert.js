export class Alert {
    /**
     * @type{string} Message of the alert. Can contain <html>
     * and must be properly escaped if it contains untrusted input
     */
    message;

    /**
     * @type{'success'|'info'|'warning'} Alert level
     */
    level;

    /**
     * @type{number} timeout of the alert, in milliseconds
     */
    timeout;

    /**
     * @type{number} Time of creation in ms since unix epoch. Defaults to `Date.now()`
     */
    created;

    /**
     * @type{string} The user-readable button title for an Action
     */
    actionName;

    /**
     * @type{function} The function to be executed if the user runs the Action
     */
    actionFunc;

    constructor({
        message,
        level,
        timeout = 0,
        created = Date.now(),
        actionName,
        actionFunc,
    }) {
        this.message = message;
        this.level = level;
        this.timeout = timeout;
        this.created = created;
        this.actionName = actionName;
        this.actionFunc = actionFunc;
    }
}

export class AlertController {
    /**
     * @type{Alert[]}
     */
    #alerts = [];

    /**
     * @param{((alert: Alert)=>void)[]} array of subscribers
     */
    #subscribers = [];

    /**
     * @returns the array of alerts
     * DO NOT PUSH TO THIS ARRAY. Use `createAlert` or `addAlert` instead
     */
    getAlerts() {
        return this.#alerts;
    }

    /**
     * Create a custom GUI Alert popup
     *
     * ### Do NOT display arbitrary / external errors:
     * - The use of `.innerHTML` allows for input styling at this cost.
     * @param {'success'|'info'|'warning'} type - The alert level
     * @param {string} message - The message to relay to the user
     * @param {number?} timeout - The time in `ms` until the alert expires
     * @param {string?} actionName - The button title of an optional Action to perform
     * @param {function?} actionFunc - The function to execute if the Action button is used
     */
    createAlert(level, message, timeout = 10000, actionName, actionFunc) {
        this.addAlert(
            new Alert({ level, message, timeout, actionName, actionFunc })
        );
    }

    /**
     * @param {Alert} alert - alert to add
     */
    addAlert(alert) {
        this.#alerts.push(alert);
        this.#alerts.splice(0, this.#alerts.length - 1000);
        for (const sub of this.#subscribers) {
            // Notify subscribers of the new alert
            sub(alert);
        }
    }

    /**
     * @param {(alert: Alert) => void} When a new alert is created, calls the `fn` callback
     */
    subscribe(fn) {
        this.#subscribers.push(fn);
    }

    static #instance = new AlertController();

    static getInstance() {
        return this.#instance;
    }
}

/**
 * Create a custom GUI Alert popup
 *
 * ### Do NOT display arbitrary / external errors:
 * - The use of `.innerHTML` allows for input styling at this cost.
 * @param {'success'|'info'|'warning'} type - The alert level
 * @param {string} message - The message to relay to the user
 * @param {number?} [timeout] - The time in `ms` until the alert expires
 * @param {string?} actionName - The button title of an optional Action to perform
 * @param {function?} actionFunc - The function to execute if the Action button is used
 */
export function createAlert(type, message, timeout, actionName, actionFunc) {
    const alertController = AlertController.getInstance();
    return alertController.createAlert(
        type,
        message,
        timeout,
        actionName,
        actionFunc
    );
}
