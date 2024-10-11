/**
 * Async alternative to setInterval() and clearInterval().
 */
export class AsyncInterval {
    #active = true;

    constructor(cb, timeOut) {
        this.#setInterval(cb, timeOut);
    }
    async #setInterval(cb, timeOut) {
        if (!this.#active) {
            return;
        }
        await cb();
        setTimeout(() => {
            this.#setInterval(cb, timeOut);
        }, timeOut);
    }
    clearInterval(timeOut) {
        setTimeout(() => {
            this.#active = false;
        }, timeOut);
    }
}
