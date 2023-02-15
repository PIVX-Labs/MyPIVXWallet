import { getBalance } from './global';
import { cMarket, fillCurrencySelect } from './settings';

/**
 * CoinGecko's endpoint for PIVX data, optimised for least bandwidth
 * - No localisation, tickers, community data, developer data or sparklines
 */
export const COINGECKO_ENDPOINT =
    'https://api.coingecko.com/api/v3/coins/pivx?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false';

/**
 * The generic market data source template, used to build site-specific classes
 */
export class MarketSource {
    /** The storage object for raw market data */
    cData = {};

    /** The name of the market source */
    strName = '';

    /** The customised API endpoint of the market source */
    strEndpoint = '';

    /**
     * Ensure a market data cache exists, if not, fetch it and resume
     */
    async ensureCacheExists() {
        if (!this.cData || !Object.keys(this.cData).length) await this.fetch();
    }

    /**
     * Fetches the raw market source data
     * @returns {Promise<object>}
     */
    async fetch() {
        return (this.cData = await (await fetch(this.strEndpoint)).json());
    }
}

/**
 * The CoinGecko market data source
 */
export class CoinGecko extends MarketSource {
    constructor() {
        super();
        this.strName = 'CoinGecko';
        this.strEndpoint = COINGECKO_ENDPOINT;
    }

    /**
     * Get the price in a specific display currency
     * @param {string} strCurrency - The CoinGecko-supported display currency
     * @return {Promise<number>}
     */
    async getPrice(strCurrency) {
        await this.ensureCacheExists();
        return this.cData.market_data.current_price[strCurrency];
    }

    /**
     * Get a list of the supported display currencies
     * @returns {Promise<Array<string>>} - A list of CoinGecko-supported display currencies
     */
    async getCurrencies() {
        await this.ensureCacheExists();
        return Object.keys(this.cData.market_data.current_price);
    }
}

/**
 * Refreshes market data from the user's data source, then re-renders currency options and price displays
 */
export async function refreshPriceDisplay() {
    // Refresh our price data
    await cMarket.fetch();

    // Update the currency customisation menu from the selected data source
    await fillCurrencySelect();

    // Update price values
    getBalance(true);
}
