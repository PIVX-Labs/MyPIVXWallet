import { getEventEmitter } from './event_bus.js';
import { cOracle, fillCurrencySelect, strCurrency } from './settings.js';

/**
 * @typedef {Object} Currency
 * @property {string} currency - The type of currency
 * @property {number} value - The value of the currency
 * @property {number} last_updated - The timestamp when this value was last updated
 */

/**
 * Oracle's primary instance.
 *
 * @todo Allow an array of Oracle instances for better privacy and decentralisation
 */
export const ORACLE_BASE = 'https://pivxla.bz/oracle/api/v1';

/**
 * An Oracle instance
 */
export class Oracle {
    /**
     * The currencies cache list
     * @type {Currency[]} Array to store currency objects
     */
    arrCurrencies = [];

    /**
     * A lock-like flag which waits until at least once successful "full fetch" of currencies has occurred.
     * This flag massively lowers bandwidth by only fetching the bulk once, falling to per-currency APIs afterwards.
     */
    fLoadedCurrencies = false;

    /**
     * Get the price in a specific display currency with extremely low bandwidth
     * @param {string} strCurrency - The Oracle display currency
     * @param {boolean} fUseCache - Whether to use local cache or fetch via API
     * @return {Promise<Currency>}
     */
    async getPrice(strCurrency, fUseCache = true) {
        if (fUseCache && this.arrCurrencies.length !== 0) {
            // We're attempting to read in-cache, and we have some data, let's try finding it
            return (
                this.arrCurrencies?.find((a) => a.currency === strCurrency)
                    ?.value || 0
            );
        } else {
            // Either a refresh request, or no cache available: let's fetch it
            try {
                /** @type {Currency} */
                const cCurrency = await (
                    await fetch(`${ORACLE_BASE}/price/${strCurrency}`)
                ).json();

                // If we already have it, update it
                const nCachedCurrencyIndex = this.arrCurrencies.findIndex(
                    (a) => a.currency === strCurrency
                );
                if (nCachedCurrencyIndex !== -1) {
                    this.arrCurrencies[nCachedCurrencyIndex] = cCurrency;
                } else {
                    // Otherwise, add it new
                    this.arrCurrencies.push(cCurrency);
                }

                // And finally return it
                return cCurrency;
            } catch (e) {
                console.warn(
                    'Oracle: Failed to fetch ' +
                        strCurrency.toUpperCase() +
                        ' price!'
                );
                console.warn(e);
                return 0;
            }
        }
    }

    /**
     * Get a list of the supported display currencies
     * @param {boolean} fUseCache - Whether to use local cache or fetch via API
     * @returns {Promise<Array<Currency>>} - A list of Oracle-supported display currencies
     */
    async getCurrencies(fUseCache = true) {
        if (fUseCache && this.arrCurrencies.length !== 0)
            return this.arrCurrencies;

        // Either a refresh request, or no cache, fetch everything we can get!
        try {
            this.arrCurrencies = await (
                await fetch(`${ORACLE_BASE}/currencies`)
            ).json();

            // Now we've loaded all currencies: we'll flag it and use the lower bandwidth price fetches in the future
            this.fLoadedCurrencies = true;
            return this.arrCurrencies;
        } catch (e) {
            console.warn('Oracle: Failed to fetch currencies!');
            console.warn(e);
            return [];
        }
    }
}

/**
 * Refreshes market data from the user's Oracle, then re-renders currency options and price displays
 */
export async function refreshPriceDisplay() {
    // If we have an empty cache, we'll do a heavy full-fetch to populate the cache
    if (!cOracle.fLoadedCurrencies) {
        await cOracle.getCurrencies(false);
    } else {
        // And if we have cache: we do a low-bandwidth, single-currency refresh
        await cOracle.getPrice(strCurrency, false);
    }

    if (cOracle.fLoadedCurrencies) {
        // Update the currency customisation menu from the selected Oracle
        await fillCurrencySelect();

        // Update price values
        getEventEmitter().emit('balance-update');
    }
}
