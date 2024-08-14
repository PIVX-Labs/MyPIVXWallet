<script setup>
import { useMasternode } from '../composables/use_masternode.js';
import { storeToRefs } from 'pinia';
import CreateMasternode from './CreateMasternode.vue';
import MasternodeController from './MasternodeController.vue';
import { useWallet } from '../composables/use_wallet';
import Masternode from '../masternode.js';
import RestoreWallet from '../dashboard/RestoreWallet.vue';
import { cChainParams } from '../chain_params';
import Modal from '../Modal.vue';
import { ref, watch, reactive } from 'vue';
import { getNetwork } from '../network';
import { translation } from '../i18n.js';
import {
    generateMasternodePrivkey,
    parseIpAddress,
    createAlert,
} from '../misc';

/**
 * @type{{masternode: import('vue').Ref<import('../masternode.js').default?>}}
 */
const { masternode } = storeToRefs(useMasternode());
const wallet = useWallet();
const { isSynced, balance, isViewOnly } = storeToRefs(wallet);
const showRestoreWallet = ref(false);
const showMasternodePrivateKey = ref(false);
const masternodePrivKey = ref('');
// Array of possible masternode UTXOs
const possibleUTXOs = ref(wallet.getMasternodeUTXOs());

function updatePossibleUTXOs() {
    possibleUTXOs.value = wallet.getMasternodeUTXOs();
}

watch(isSynced, () => {
    updatePossibleUTXOs();
});
/**
 * Start a Masternode via a signed network broadcast
 * @param {boolean} fRestart - Whether this is a Restart or a first Start
 */
async function startMasternode(fRestart = false) {
    const database = await Database.getInstance();
    const cMasternode = await database.getMasternode(wallet.getMasterKey());
    if (cMasternode) {
        if (
            wallet.isViewOnly() &&
            !(await restoreWallet(translation.walletUnlockMNStart))
        )
            return;
        if (await cMasternode.start()) {
            const strMsg = fRestart ? ALERTS.MN_RESTARTED : ALERTS.MN_STARTED;
            createAlert('success', strMsg, 4000);
        } else {
            const strMsg = fRestart
                ? ALERTS.MN_RESTART_FAILED
                : ALERTS.MN_START_FAILED;
            createAlert('warning', strMsg, 4000);
        }
    }
}

async function destroyMasternode() {
    const database = await Database.getInstance();
    const cMasternode = await database.getMasternode(wallet.getMasterKey());
    if (cMasternode) {
        // Unlock the coin and update the balance
        wallet.unlockCoin(
            new COutpoint({
                txid: cMasternode.collateralTxId,
                n: cMasternode.outidx,
            })
        );

        database.removeMasternode(wallet.getMasterKey());
        createAlert('success', ALERTS.MN_DESTROYED, 5000);
        updateMasternodeTab();
    }
}

/**
 * @param {string} privateKey - masternode private key
 * @param {string} ip - Ip to connect to. Can be ipv6 or ipv4
 * @param {import('../transaction.js').UTXO} utxo - Masternode utxo. Must be of exactly `cChainParams.current.collateralInSats` of value
 */
function importMasternode(privateKey, ip, utxo) {
    console.log(privateKey, ip, utxo);
    const address = parseIpAddress(ip);
    if (!address) {
        createAlert('warning', ALERTS.MN_BAD_IP, 5000);
        return;
    }
    if (!privateKey) {
        createAlert('warning', ALERTS.MN_BAD_PRIVKEY, 5000);
        return;
    }
    masternode.value = new Masternode({
        walletPrivateKeyPath: wallet.getPath(utxo.script),
        mnPrivateKey: privateKey,
        collateralTxId: utxo.outpoint.toUnique,
        outidx: utxo.outpoint.n,
        addr: address,
    });
}

async function importMasternodelegacy() {
    const mnPrivKey = doms.domMnPrivateKey.value;
    const address = parseIpAddress(doms.domMnIP.value);
    if (!address) {
        createAlert('warning', ALERTS.MN_BAD_IP, 5000);
        return;
    }
    if (!mnPrivKey) {
        createAlert('warning', ALERTS.MN_BAD_PRIVKEY, 5000);
        return;
    }

    let collateralTxId;
    let outidx;
    let collateralPrivKeyPath;
    doms.domMnIP.value = '';
    doms.domMnPrivateKey.value = '';

    if (!wallet.isHD()) {
        // Find the first UTXO matching the expected collateral size
        const cCollaUTXO = wallet.getMasternodeUTXOs()[0];
        const balance = wallet.balance;
        // If there's no valid UTXO, exit with a contextual message
        if (!cCollaUTXO) {
            if (balance < cChainParams.current.collateralInSats) {
                // Not enough balance to create an MN UTXO
                const amount =
                    (cChainParams.current.collateralInSats - balance) / COIN;
                const ticker = cChainParams.current.TICKER;
                createAlert(
                    'warning',
                    tr(ALERTS.MN_NOT_ENOUGH_COLLAT, [
                        { amount: amount },
                        { ticker: ticker },
                    ]),
                    10000
                );
            } else {
                // Balance is capable of a masternode, just needs to be created
                // TODO: this UX flow is weird, is it even possible? perhaps we can re-design this entire function accordingly
                const amount = cChainParams.current.collateralInSats / COIN;
                const ticker = cChainParams.current.TICKER;
                createAlert(
                    'warning',
                    tr(ALERTS.MN_ENOUGH_BUT_NO_COLLAT, [
                        { amount },
                        { ticker },
                    ]),
                    10000
                );
            }
            return;
        }

        collateralTxId = cCollaUTXO.outpoint.txid;
        outidx = cCollaUTXO.outpoint.n;
        collateralPrivKeyPath = 'legacy';
    } else {
        const path = doms.domMnTxId.value;
        let masterUtxo;
        const utxos = wallet.getMasternodeUTXOs();
        for (const u of utxos) {
            if (
                u.value === cChainParams.current.collateralInSats &&
                wallet.getPath(u.script) === path
            ) {
                masterUtxo = u;
            }
        }

        // sanity check:
        if (masterUtxo.value !== cChainParams.current.collateralInSats) {
            return createAlert('warning', ALERTS.MN_COLLAT_NOT_SUITABLE, 10000);
        }
        collateralTxId = masterUtxo.outpoint.txid;
        outidx = masterUtxo.outpoint.n;
        collateralPrivKeyPath = path;
    }
    doms.domMnTxId.value = '';

    const cMasternode = new Masternode({
        walletPrivateKeyPath: collateralPrivKeyPath,
        mnPrivateKey: mnPrivKey,
        collateralTxId: collateralTxId,
        outidx: outidx,
        addr: address,
    });

    await refreshMasternodeData(cMasternode, true);
    await updateMasternodeTab();
}
function isMasternodeUTXO(cUTXO, cMasternode) {
    if (cMasternode?.collateralTxId) {
        const { collateralTxId, outidx } = cMasternode;
        return collateralTxId === cUTXO.id && cUTXO.vout === outidx;
    } else {
        return false;
    }
}

async function updateMasternodeTab() {
    //TODO: IN A FUTURE ADD MULTI-MASTERNODE SUPPORT BY SAVING MNs with which you logged in the past.
    // Ensure a wallet is loaded
    doms.domMnTextErrors.innerHTML = '';
    doms.domAccessMasternode.style.display = 'none';
    doms.domCreateMasternode.style.display = 'none';
    doms.domMnDashboard.style.display = 'none';

    if (!wallet.isLoaded()) {
        doms.domMnTextErrors.innerHTML =
            'Please ' +
            ((await hasEncryptedWallet()) ? 'unlock' : 'import') +
            ' your <b>COLLATERAL WALLET</b> first.';
        return;
    }

    if (!wallet.isSynced) {
        doms.domMnTextErrors.innerHTML =
            'Your wallet is empty or still loading, re-open the tab in a few seconds!';
        return;
    }

    const database = await Database.getInstance();

    let cMasternode = await database.getMasternode();
    // If the collateral is missing (spent, or switched wallet) then remove the current MN
    if (cMasternode) {
        if (
            !wallet.isCoinLocked(
                new COutpoint({
                    txid: cMasternode.collateralTxId,
                    n: cMasternode.outidx,
                })
            )
        ) {
            database.removeMasternode();
            cMasternode = null;
        }
    }

    doms.domControlMasternode.style.display = cMasternode ? 'block' : 'none';

    // first case: the wallet is not HD and it is not hardware, so in case the wallet has collateral the user can check its status and do simple stuff like voting
    if (!wallet.isHD()) {
        doms.domMnAccessMasternodeText.innerHTML =
            doms.masternodeLegacyAccessText;
        doms.domMnTxId.style.display = 'none';
        // Find the first UTXO matching the expected collateral size
        const cCollaUTXO = wallet.getMasternodeUTXOs()[0];

        const balance = wallet.balance;
        if (cMasternode) {
            await refreshMasternodeData(cMasternode);
            doms.domMnDashboard.style.display = '';
        } else if (cCollaUTXO) {
            doms.domMnTxId.style.display = 'none';
            doms.domAccessMasternode.style.display = 'block';
        } else if (balance < cChainParams.current.collateralInSats) {
            // The user needs more funds
            doms.domMnTextErrors.innerHTML =
                'You need <b>' +
                (cChainParams.current.collateralInSats - balance) / COIN +
                ' more ' +
                cChainParams.current.TICKER +
                '</b> to create a Masternode!';
        } else {
            // The user has the funds, but not an exact collateral, prompt for them to create one
            doms.domCreateMasternode.style.display = 'flex';
            doms.domMnTxId.style.display = 'none';
            doms.domMnTxId.innerHTML = '';
        }
    } else {
        doms.domMnTxId.style.display = 'none';
        doms.domMnTxId.innerHTML = '';
        doms.domMnAccessMasternodeText.innerHTML = doms.masternodeHDAccessText;

        // First UTXO for each address in HD
        const mapCollateralPath = new Map();

        // Aggregate all valid Masternode collaterals into a map of Path <--> Collateral
        for (const cUTXO of wallet.getMasternodeUTXOs()) {
            mapCollateralPath.set(wallet.getPath(cUTXO.script), cUTXO);
        }
        const fHasCollateral = mapCollateralPath.size > 0;
        // If there's no loaded MN, but valid collaterals, display the configuration screen
        if (!cMasternode && fHasCollateral) {
            doms.domMnTxId.style.display = 'block';
            doms.domAccessMasternode.style.display = 'block';

            for (const [key] of mapCollateralPath) {
                const option = document.createElement('option');
                option.value = key;
                option.innerText = wallet.getAddressFromPath(key);
                doms.domMnTxId.appendChild(option);
            }
        }

        // If there's no collateral found, display the creation UI
        if (!fHasCollateral && !cMasternode)
            doms.domCreateMasternode.style.display = 'flex';

        // If we a loaded Masternode, display the Dashboard
        if (cMasternode) {
            // Refresh the display
            refreshMasternodeData(cMasternode);
            doms.domMnDashboard.style.display = '';
        }
    }
}

async function refreshMasternodeData(cMasternode, fAlert = false) {
    const cMasternodeData = await cMasternode.getFullData();

    debugLog(DebugTopics.GLOBAL, ' ---- NEW MASTERNODE DATA (Debug Mode) ----');
    debugLog(DebugTopics.GLOBAL, cMasternodeData);
    debugLog(DebugTopics.GLOBAL, '---- END MASTERNODE DATA (Debug Mode) ----');

    // If we have MN data available, update the dashboard
    if (cMasternodeData && cMasternodeData.status !== 'MISSING') {
        doms.domMnTextErrors.innerHTML = '';
        doms.domMnProtocol.innerText = `(${sanitizeHTML(
            cMasternodeData.version
        )})`;
        doms.domMnStatus.innerText = sanitizeHTML(cMasternodeData.status);
        doms.domMnNetType.innerText = sanitizeHTML(
            cMasternodeData.network.toUpperCase()
        );
        doms.domMnNetIP.innerText = cMasternode.addr;
        doms.domMnLastSeen.innerText = new Date(
            cMasternodeData.lastseen * 1000
        ).toLocaleTimeString();
    }

    if (cMasternodeData.status === 'MISSING') {
        doms.domMnTextErrors.innerHTML =
            'Masternode is currently <b>OFFLINE</b>';
        if (
            !wallet.isViewOnly() ||
            (await restoreWallet(translation.walletUnlockCreateMN))
        ) {
            createAlert('warning', ALERTS.MN_OFFLINE_STARTING, 6000);
            // try to start the masternode
            const started = await cMasternode.start();
            if (started) {
                doms.domMnTextErrors.innerHTML = ALERTS.MN_STARTED;
                createAlert('success', ALERTS.MN_STARTED_ONLINE_SOON, 6000);
                const database = await Database.getInstance();
                await database.addMasternode(cMasternode);
                wallet.lockCoin(
                    new COutpoint({
                        txid: cMasternode.collateralTxId,
                        n: cMasternode.outidx,
                    })
                );
            } else {
                doms.domMnTextErrors.innerHTML = ALERTS.MN_START_FAILED;
                createAlert('warning', ALERTS.MN_START_FAILED, 6000);
            }
        }
    } else if (
        cMasternodeData.status === 'ENABLED' ||
        cMasternodeData.status === 'PRE_ENABLED'
    ) {
        if (fAlert)
            createAlert(
                'success',
                `${ALERTS.MN_STATUS_IS} <b> ${sanitizeHTML(
                    cMasternodeData.status
                )} </b>`,
                6000
            );
        const database = await Database.getInstance();
        await database.addMasternode(cMasternode);
        wallet.lockCoin(
            new COutpoint({
                txid: cMasternode.collateralTxId,
                n: cMasternode.outidx,
            })
        );
    } else if (cMasternodeData.status === 'REMOVED') {
        const state = cMasternodeData.status;
        doms.domMnTextErrors.innerHTML = tr(ALERTS.MN_STATE, [
            { state: state },
        ]);
        if (fAlert)
            createAlert(
                'warning',
                tr(ALERTS.MN_STATE, [{ state: state }]),
                6000
            );
    } else {
        // connection problem
        doms.domMnTextErrors.innerHTML = ALERTS.MN_CANT_CONNECT;
        if (fAlert) createAlert('warning', ALERTS.MN_CANT_CONNECT, 6000);
    }

    // Return the data in case the caller needs additional context
    return cMasternodeData;
}
async function restoreWallet() {
    if (!wallet.isEncrypted) return false;
    if (wallet.isHardwareWallet) return true;
    showRestoreWallet.value = true;
    return await new Promise((res) => {
        watch(
            [showRestoreWallet, isViewOnly],
            () => {
                showRestoreWallet.value = false;
                res(!isViewOnly.value);
            },
            { once: true }
        );
    });
}

async function createMasternode({ isVPS }) {
    // Ensure wallet is unlocked
    if (!isViewOnly.value && (await restoreWallet())) return;
    const [address] = wallet.getNewAddress(1);
    const res = await wallet.createAndSendTransaction(
        getNetwork(),
        address,
        cChainParams.current.collateralInSats
    );
    if (!res) createAlert('warning', translation.ALERTS.TRANSACTION_FAILED);

    if (isVPS) openShowPrivKeyModal();
}

function openShowPrivKeyModal() {
    masternodePrivKey.value = generateMasternodePrivkey();
    showMasternodePrivateKey.value = true;
}
function closeShowPrivKeyModal() {}
</script>

<template>
    <RestoreWallet
        :show="showRestoreWallet"
        @close="showRestoreWallet = false"
    />
    <CreateMasternode
        v-if="!masternode"
        :synced="isSynced"
        :balance="balance"
        :possibleUTXOs="possibleUTXOs"
        @createMasternode="createMasternode"
        @importMasternode="importMasternode"
    />
    <MasternodeController v-if="masternode" :masternode="masternode" />
    <Modal :show="showMasternodePrivateKey">
        <template #header>
            <b>{{ translation?.ALERTS?.CONFIRM_POPUP_MN_P_KEY }}</b>
            <button
                @click="showModal = false"
                type="button"
                class="close"
                data-dismiss="modal"
                aria-label="Close"
            >
                <i class="fa-solid fa-xmark closeCross"></i>
            </button>
        </template>
        <template #body>
            <code>{{ masternodePrivKey }}</code>
            <span
                v-html="translation?.ALERTS?.CONFIRM_POPUP_MN_P_KEY_HTML"
            ></span>
        </template>
    </Modal>
</template>
