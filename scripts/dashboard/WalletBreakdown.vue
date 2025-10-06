<script setup>
import {
    ArcElement,
    Chart,
    Colors,
    DoughnutController,
    Legend,
    LinearScale,
    Tooltip,
} from 'chart.js';
import Modal from '../Modal.vue';
import { useTemplateRef, ref } from 'vue';
import { useWallets } from '../composables/use_wallet.js';
import { Database } from '../database.js';
import { cChainParams, COIN } from '../chain_params';
import { onMounted } from 'vue';
import { beautifyNumber } from '../misc';
import { translation } from '../i18n';

const canvas = useTemplateRef('canvas');
const arrBreakdown = ref([]);
const chartWalletBreakdown = ref();

const { activeWallet } = useWallets();
const emit = defineEmits(['close']);
const isGenerated = ref(false);

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
    const spendable_bal = activeWallet.balance;
    if (spendable_bal > 0) {
        arrBreakdown.push({
            type: translation.chartPublicAvailable,
            balance: spendable_bal / COIN,
            colour: '#C898F5',
        });
    }

    // Shielded (Available spendable)
    const shield_spendable = activeWallet.shieldBalance;
    if (shield_spendable > 0) {
        arrBreakdown.push({
            type: 'Shield Available',
            balance: shield_spendable / COIN,
            colour: '#9131EA',
        });
    }

    // Shielded (Pending i.e still unspendable)
    const shield_pending = activeWallet.pendingShieldBalance;
    if (shield_pending > 0) {
        arrBreakdown.push({
            type: 'Shield Pending',
            balance: shield_pending / COIN,
            colour: '#5e169c',
        });
    }

    const immature_bal = activeWallet.immatureBalance;
    if (immature_bal > 0) {
        arrBreakdown.push({
            type: translation.chartImmatureBalance,
            balance: immature_bal / COIN,
            colour: '#4A1399',
        });
    }
    // Staking (Locked)
    const spendable_cold_bal = activeWallet.coldBalance;
    if (spendable_cold_bal > 0) {
        arrBreakdown.push({
            type: 'Staking',
            balance: spendable_cold_bal / COIN,
            colour: '#721DEA',
        });
    }

    const masternodes = await (await Database.getInstance()).getMasternodes();
    let masternodeValue = 0;

    // Masternode (Locked)
    for (const masternode of masternodes) {
        if (
            activeWallet.isCoinLocked(
                new COutpoint({
                    txid: masternode.collateralTxId,
                    n: masternode.outidx,
                })
            )
        ) {
            masternodeValue += cChainParams.current.collateralInSats / COIN;
        }
    }
    if (masternodeValue !== 0)
        arrBreakdown.push({
            type: 'Masternodes',
            balance: masternodeValue,
            colour: 'rgba(19, 13, 30, 1)',
        });
    return arrBreakdown;
}

/**
 * Create the initial Wallet Breakdown chart configuration and UI rendering
 * @param {Array<WalletDatasetPoint>} arrBreakdown - The dataset to render
 */
async function generateWalletBreakdown(arrBreakdown) {
    if (!isGenerated.value) {
        isGenerated.value = true;
        // Render the PIVX logo in the centre of the "Wallet Doughnut"
        const image = new Image();
        const svg = (await import('../../assets/icons/image-pivx-logo.svg'))
            .default;
        const url = URL.createObjectURL(
            new Blob([svg], { type: 'image/svg+xml' })
        );
        image.src = url;
        const logo_plugin = {
            id: 'centreLogo',
            beforeDraw: (chart) => {
                const ctx = chart.ctx;
                const { top, left, width, height } = chart.chartArea;
                const x = left + width / 2 - (image.width - 30) / 2;
                const y = top + height / 2 - (image.height - 30) / 2;
                ctx.globalAlpha = 1;
                ctx.drawImage(image, x, y, image.width - 30, image.height - 30);
                ctx.globalAlpha = 1;
            },
        };

        // Initialise the chart
        chartWalletBreakdown.value = new Chart(canvas.value, {
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
                borderWidth: 0,
                backgroundColor: arrBreakdown.map((data) => data.colour),
                radius: '85%',
                cutout: '60%',
                animation: {
                    duration: 500,
                },
                plugins: {
                    legend: {
                        display: false,
                        labels: {
                            color: '#FFFFFF',
                            font: {
                                size: 16,
                            },
                        },
                    },
                },
                layout: {},
            },
        });
    }
}

/**
 * Render the wallet breakdown chart, or create it if not initialised
 */
async function renderWalletBreakdown() {
    // Update the chart data with the new dataset
    const arrBreakdown = await getWalletDataset();

    // Update the chart
    chartWalletBreakdown.value.data.labels = arrBreakdown.map(
        (data) => data.type
    );
    chartWalletBreakdown.value.data.datasets[0].data = arrBreakdown.map(
        (data) => data.balance
    );
    chartWalletBreakdown.value.data.datasets[0].backgroundColor =
        arrBreakdown.map((data) => data.colour);
    chartWalletBreakdown.value.update();
}

onMounted(async () => {
    Chart.register(
        Colors,
        DoughnutController,
        ArcElement,
        Legend,
        Tooltip,
        LinearScale
    );

    setInterval(async () => {
        arrBreakdown.value = await getWalletDataset();
        await generateWalletBreakdown(arrBreakdown.value);
        await renderWalletBreakdown();
    }, 5000);
});
</script>

<template>
    <Modal :show="true" header-class="balanceBreakdownHeader">
        <template #header>
            <h5 class="modal-title" id="walletBreakdownModalLabel">
                {{ translation.balanceBreakdown }}
            </h5>
        </template>
        <template #body>
            <canvas ref="canvas"></canvas>
            <div
                id="walletBreakdownLegend"
                style="padding-left: 14px; padding-top: 20px"
            >
                <div
                    style="display: flex; margin-bottom: 12px"
                    v-for="cPoint of arrBreakdown"
                >
                    <div
                        style="width: 40px; height: 40px; border-radius: 5px"
                        :style="{ backgroundColor: cPoint.colour }"
                    ></div>
                    <div
                        style="
                            padding-left: 13px;
                            text-align: left;
                            display: flex;
                            flex-direction: column;
                            font-size: 16px;
                        "
                    >
                        <span>
                            <span
                                v-html="
                                    beautifyNumber(
                                        cPoint.balance.toFixed(2),
                                        '13px'
                                    )
                                "
                            >
                            </span>
                            <span style="opacity: 0.55; font-size: 13px">{{
                                cChainParams.current.TICKER
                            }}</span></span
                        >
                        <span style="font-size: 13px; color: #c0b1d2">{{
                            cPoint.type
                        }}</span>
                    </div>
                </div>
            </div>
        </template>
        <template #footer>
            <button
                @click="emit('close')"
                type="button"
                class="pivx-button-big-cancel"
            >
                Close
            </button>
        </template>
    </Modal>
</template>
<style>
.balanceBreakdownHeader {
    justify-content: center;
}
</style>
