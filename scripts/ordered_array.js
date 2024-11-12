/**
 * @template T
 */
export class OrderedArray {
    /**
     * Actual data of the array
     * @type {T[]}
     */
    #data = [];

    /**
     * Comparison function used to keep the array ordered
     * @type {(e1: T, e2: T) => boolean}
     */
    #fun;

    /**
     * @param {(e1: T, e2: T) => boolean} fun
     */
    constructor(fun) {
        this.#fun = fun;
    }

    /**
     * insert an element in the array.
     * @param{T} x
     */
    insert(x) {
        // TODO: optimize with binary search so that running time is O(log(N)) instead of O(N)
        for (const [i, el] of this.#data.entries()) {
            if (this.#fun(x, el)) {
                this.#data.splice(i, 0, x);
                return;
            }
        }
        this.#data.push(x);
    }

    /**
     * Remove the first element that satisfies the condition cond
     * @param {(e1: T) => boolean} cond
     */
    remove(cond) {
        for (const [i, el] of this.#data.entries()) {
            if (cond(el)) {
                this.#data.splice(i, 1);
                return;
            }
        }
    }

    /**
     * @returns {T[]}
     */
    get() {
        return this.#data;
    }

    clear() {
        this.#data = [];
    }
}
