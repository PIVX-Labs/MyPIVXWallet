/**
 * Implement a lockable object
 * @template T
 * @param {T} f - the function on which we perform the lock
 * @returns {T & { isLocked: () => bool }}
 */
export const lockableFunction = (f) => {
    let promise = null;

    const g = async (...args) => {
        if (!promise) {
            promise = f(...args).finally(() => {
                promise = null;
            });
        }
        return await promise;
    };
    g.isLocked = () => !!promise;
    return g;
};
