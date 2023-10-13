import {
    ArcElement,
    Chart,
    Colors,
    DoughnutController,
    Legend,
    LinearScale,
    Tooltip,
} from 'chart.js';
import { cChainParams, COIN } from './chain_params.js';
import { doms, mempool } from './global.js';
import { Database } from './database.js';
import { translation } from './i18n.js';
import { UTXO_WALLET_STATE } from './mempool.js';
import { COutpoint } from './mempool.js';

Chart.register(
    Colors,
    DoughnutController,
    ArcElement,
    Legend,
    Tooltip,
    LinearScale
);

/**
 * The wallet breakdown modal chart
 * @type {Chart}
 */
let chartWalletBreakdown = null;

/**
 * An element generated from the wallet for the purpose of charting or tables
 * @typedef {object} WalletDatasetPoint
 * @property {string} type
 * @property {number} balance
 * @property {string} colour
 */

/**
 * Generate an array of pie/doughnut charting data from the wallet's totals
 * @returns {Promise<Array<WalletDatasetPoint>>} - The charting data
 */
async function getWalletDataset() {
    const arrBreakdown = [];

    // Public (Available)
    const spendable_bal = mempool.balance;
    if (spendable_bal > 0) {
        arrBreakdown.push({
            type: translation.chartPublicAvailable,
            balance: spendable_bal / COIN,
            colour: 'rgba(127, 17, 224, 1)',
        });
    }

    // Staking (Locked)
    const spendable_cold_bal = mempool.coldBalance;
    if (spendable_cold_bal > 0) {
        arrBreakdown.push({
            type: 'Staking',
            balance: spendable_cold_bal / COIN,
            colour: 'rgba(42, 27, 66, 1)',
        });
    }

    const masternode = await (await Database.getInstance()).getMasternode();

    // Masternode (Locked)
    if (masternode) {
        const mnOp = new COutpoint({
            txid: masternode.collateralTxId,
            n: masternode.outidx,
        });
        if (mempool.hasUTXO(mnOp, UTXO_WALLET_STATE.SPENDABLE, true)) {
            arrBreakdown.push({
                type: 'Masternode',
                balance: cChainParams.current.collateralInSats / COIN,
                colour: 'rgba(19, 13, 30, 1)',
            });
        }
    }
    return arrBreakdown;
}

/**
 * Create the initial Wallet Breakdown chart configuration and UI rendering
 */
export async function generateWalletBreakdown(arrBreakdown) {
    // Render the PIVX logo in the centre of the "Wallet Doughnut"
    const image = new Image();
    image.src = (await import('../assets/logo-circle.svg')).default;
    const logo_plugin = {
        id: 'centreLogo',
        beforeDraw: (chart) => {
            const ctx = chart.ctx;
            const { top, left, width, height } = chart.chartArea;
            const x = left + width / 2 - image.width / 2;
            const y = top + height / 2 - image.height / 2;
            ctx.globalAlpha = 0.25;
            ctx.drawImage(image, x, y, image.width, image.height);
            ctx.globalAlpha = 1;
        },
    };

    // Initialise the chart
    chartWalletBreakdown = new Chart(doms.domWalletBreakdownCanvas, {
        type: 'doughnut',
        data: {
            labels: arrBreakdown.map((data) => data.type),
            datasets: [
                {
                    label: cChainParams.current.TICKER,
                    data: arrBreakdown.map((data) => data.balance),
                },
            ],
        },
        plugins: [logo_plugin],
        options: {
            backgroundColor: arrBreakdown.map((data) => data.colour),
            radius: '75%',
            cutout: '75%',
            animation: {
                duration: 500,
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#FFFFFF',
                        font: {
                            size: 16,
                        },
                    },
                },
            },
        },
    });

    // Set an interval internally to refresh the chart in real-time
    chartWalletBreakdown.interval = setInterval(renderWalletBreakdown, 2500);
}

/**
 * Render the wallet breakdown chart, or create it if not initialised
 */
export async function renderWalletBreakdown() {
    // Only if the modal is open, to save performance and prevent rendering when it's not visible
    if (!doms.domModalWalletBreakdown.style.display === 'block') return;

    // Update the chart data with the new dataset
    const arrBreakdown = await getWalletDataset();

    // If no chart exists, create it
    if (!chartWalletBreakdown)
        return await generateWalletBreakdown(arrBreakdown);

    // Update the chart
    chartWalletBreakdown.data.labels = arrBreakdown.map((data) => data.type);
    chartWalletBreakdown.data.datasets[0].data = arrBreakdown.map(
        (data) => data.balance
    );
    chartWalletBreakdown.data.datasets[0].backgroundColor = arrBreakdown.map(
        (data) => data.colour
    );
    chartWalletBreakdown.update();
}
