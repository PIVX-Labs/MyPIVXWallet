<script setup>
import Color from 'color';
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
import { onMounted, watch } from 'vue';
import { beautifyNumber } from '../misc';
import { translation } from '../i18n';
import { shallowRef } from 'vue';
import { onUnmounted } from 'vue';

const canvas = useTemplateRef('canvas');
const arrBreakdown = ref([]);
const chartWalletBreakdown = shallowRef();

const { vaults } = useWallets();
const emit = defineEmits(['close']);
const isGenerated = ref(false);

const baseColours = [
    '#2196F3',
    '#3A0CA3',
    '#D62828',
    '#6D6875',
    '#E63946',
    '#F4A261',
    '#E9C46A',
    '#A7C957',
    '#2A9D8F',
];

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
    const res = [];
    let walletNumber = 0;
    for (const vault of vaults) {
        for (const [i, activeWallet] of vault.wallets.entries()) {
            const baseColour = Color(
                baseColours[walletNumber++ % baseColours.length]
            );
            // Public (Available)
            const spendable_bal = activeWallet.balance;
            if (spendable_bal > 0) {
                res.push({
                    type: `${translation.chartPublicAvailable}-${vault.label}-${i}`,
                    balance: spendable_bal / COIN,
                    colour: baseColour.toString(),
                });
            }

            // Shielded (Available spendable)
            const shield_spendable = activeWallet.shieldBalance;
            if (shield_spendable > 0) {
                res.push({
                    type: `Shield Available-${vault.label}-${i}`,
                    balance: shield_spendable / COIN,
                    colour: baseColour.darken(0.2).toString(),
                });
            }

            // Shielded (Pending i.e still unspendable)
            const shield_pending = activeWallet.pendingShieldBalance;
            if (shield_pending > 0) {
                res.push({
                    type: `Shield Pending-${vault.label}-${i}`,
                    balance: shield_pending1 / COIN,
                    colour: baseColour.darken(0.1).toString(),
                });
            }

            const immature_bal = activeWallet.immatureBalance;
            if (immature_bal > 0) {
                res.push({
                    type: `${translation.chartImmatureBalance}-${vault.label}-${i}`,
                    balance: immature_bal / COIN,
                    colour: baseColour.lighten(0.1).toString(),
                });
            }
            // Staking (Locked)
            const spendable_cold_bal = activeWallet.coldBalance;
            if (spendable_cold_bal > 0) {
                res.push({
                    type: `Staking-${vault.label}-${i}`,
                    balance: spendable_cold_bal / COIN,
                    colour: baseColour.darken(0.3).toString(),
                });
            }

            const masternodes = await (
                await Database.getInstance()
            ).getMasternodes();
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
                    masternodeValue +=
                        cChainParams.current.collateralInSats / COIN;
                }
            }
            if (masternodeValue !== 0)
                res.push({
                    type: `Masternodes-${vault.label}-${i}`,
                    balance: masternodeValue,
                    colour: baseColour.darken(0.4).toString(),
                });
        }
    }
    arrBreakdown.value = res;
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
                const imgSize = 100;
                const x = left + width / 2 - imgSize / 2;
                const y = top + height / 2 - imgSize / 2;
                ctx.globalAlpha = 1;
                ctx.drawImage(image, x, y, imgSize, imgSize);
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
    if (chartWalletBreakdown.value) {
        // Update the chart
        chartWalletBreakdown.value.data.labels = arrBreakdown.value.map(
            (data) => data.type
        );

        chartWalletBreakdown.value.data.datasets[0].data =
            arrBreakdown.value.map((data) => data.balance);
        chartWalletBreakdown.value.data.datasets[0].backgroundColor =
            arrBreakdown.value.map((data) => data.colour);
        chartWalletBreakdown.value.update();
    }
}
const interval = ref();
onMounted(async () => {
    Chart.register(
        Colors,
        DoughnutController,
        ArcElement,
        Legend,
        Tooltip,
        LinearScale
    );
    const updateData = async () => {
        await getWalletDataset();
        await generateWalletBreakdown(arrBreakdown.value);
    };
    updateData();
    interval.value = setInterval(updateData, 5000);
});
onUnmounted(() => {
    clearInterval(interval.value);
});

watch(arrBreakdown, () => {
    renderWalletBreakdown();
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
