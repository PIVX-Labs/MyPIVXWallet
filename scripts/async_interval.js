import { sleep } from './utils.js';

/**
 * Async alternative to setInterval() and clearInterval().
 */
export class AsyncInterval {
    #active = true;

    constructor(cb, timeOut) {
        this.#setInterval(cb, timeOut);
    }
    async #setInterval(cb, timeOut) {
        while (this.#active) {
            await cb();
            await sleep(timeOut);
        }
    }
    clearInterval(timeOut) {
        setTimeout(() => {
            this.#active = false;
        }, timeOut);
    }
}
