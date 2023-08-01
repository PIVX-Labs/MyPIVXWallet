import {
    ArcElement,
    Chart,
    Colors,
    DoughnutController,
    Legend,
    LinearScale,
    Tooltip,
} from 'chart.js';
import { cChainParams, COIN } from './chain_params';
import { doms, isMasternodeUTXO, mempool } from './global';
import { Database } from './database.js';
import { translation } from './i18n';

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
    if (mempool.getBalance() > 0) {
        arrBreakdown.push({
            type: translation.chartPublicAvailable,
            balance: mempool.getBalance() / COIN,
            colour: 'rgba(127, 17, 224, 1)',
        });
    }

    // Staking (Locked)
    if (mempool.getDelegatedBalance() > 0) {
        arrBreakdown.push({
            type: 'Staking',
            balance: mempool.getDelegatedBalance() / COIN,
            colour: 'rgba(42, 27, 66, 1)',
        });
    }

    const masternode = await (await Database.getInstance()).getMasternode();

    // Masternode (Locked)
    (
        await Promise.all(
            mempool.getConfirmed().map(async (cUTXO) => {
                return {
                    UTXO: cUTXO,
                    isMnUTXO: isMasternodeUTXO(cUTXO, masternode),
                };
            })
        )
    )
        .filter(({ isMnUTXO }) => isMnUTXO)
        .forEach(({ UTXO }) =>
            arrBreakdown.push({
                type: 'Masternode',
                balance: UTXO.sats / COIN,
                colour: 'rgba(19, 13, 30, 1)',
            })
        );

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
