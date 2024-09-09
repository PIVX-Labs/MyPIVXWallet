/**
 * Implement a lockable object
 * @template T
 * @param {T} f - the function on which we perform the lock
 * @returns T & { isLocked: () => bool }
 */
export const lockableFunction = (f) => {
    let lock = false;
    /**
     * @type{T & {isLocked: () => bool}}
     */
    const g = async (...args) => {
        try {
            if (!lock) {
                lock = true;
                return await f(...args);
            }
        } finally {
            lock = false;
        }
    };
    g.isLocked = () => lock;
    return g;
};
