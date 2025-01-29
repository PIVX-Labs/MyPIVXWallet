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
import { ref, watch, onMounted } from 'vue';
import { getNetwork } from '../network/network_manager.js';
import { translation, ALERTS } from '../i18n.js';
import { generateMasternodePrivkey, parseIpAddress } from '../misc';
import { useAlerts } from '../composables/use_alerts.js';
import { COutpoint } from '../transaction.js';

const { createAlert } = useAlerts();

/**
 * @type{{masternode: import('vue').Ref<import('../masternode.js').default?>}}
 */
const { masternode } = storeToRefs(useMasternode());
const wallet = useWallet();
const { isSynced, balance, isViewOnly, isHardwareWallet } = storeToRefs(wallet);
const showRestoreWallet = ref(false);
const showMasternodePrivateKey = ref(false);
const masternodePrivKey = ref('');
// Array of possible masternode UTXOs
const possibleUTXOs = ref(wallet.getMasternodeUTXOs());

watch(masternode, (masternode, oldValue) => {
    if (oldValue?.collateralTxId) {
        wallet.unlockCoin(
            new COutpoint({ txid: oldValue.collateralTxId, n: oldValue.outidx })
        );
    }

    if (masternode?.collateralTxId) {
        wallet.lockCoin(
            new COutpoint({
                txid: masternode.collateralTxId,
                n: masternode.outidx,
            })
        );
    }
});
function updatePossibleUTXOs() {
    possibleUTXOs.value = wallet.getMasternodeUTXOs();
}

onMounted(() => {
    document
        .getElementById('masternodeTab')
        .addEventListener('click', updatePossibleUTXOs);
});

watch(isSynced, () => {
    updatePossibleUTXOs();
});
/**
 * Start a Masternode via a signed network broadcast
 * @param {boolean} fRestart - Whether this is a Restart or a first Start
 */
async function startMasternode(fRestart = false) {
    if (
        !isHardwareWallet.value &&
        isViewOnly.value &&
        !(await restoreWallet())
    ) {
        return;
    }
    if (await masternode.value.start()) {
        const strMsg = fRestart ? ALERTS.MN_RESTARTED : ALERTS.MN_STARTED;
        createAlert('success', strMsg, 4000);
    } else {
        const strMsg = fRestart
            ? ALERTS.MN_RESTART_FAILED
            : ALERTS.MN_START_FAILED;
        createAlert('warning', strMsg, 4000);
    }
}

async function destroyMasternode() {
    masternode.value = null;
}

/**
 * @param {string} privateKey - masternode private key
 * @param {string} ip - Ip to connect to. Can be ipv6 or ipv4
 * @param {import('../transaction.js').UTXO} utxo - Masternode utxo. Must be of exactly `cChainParams.current.collateralInSats` of value
 */
function importMasternode(privateKey, ip, utxo) {
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
        collateralTxId: utxo.outpoint.txid,
        outidx: utxo.outpoint.n,
        addr: address,
    });
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
    if (!isHardwareWallet.value && isViewOnly.value && !(await restoreWallet()))
        return;
    const [address] = wallet.getNewAddress(1);
    const res = await wallet.createAndSendTransaction(
        getNetwork(),
        address,
        cChainParams.current.collateralInSats
    );
    if (!res) {
        createAlert('warning', translation.ALERTS.TRANSACTION_FAILED);
        return;
    }

    if (isVPS) openShowPrivKeyModal();
    updatePossibleUTXOs();
}

function openShowPrivKeyModal() {
    masternodePrivKey.value = generateMasternodePrivkey();
    showMasternodePrivateKey.value = true;
}
</script>

<template>
    <RestoreWallet
        :show="showRestoreWallet"
        :wallet="wallet"
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
    <MasternodeController
        v-if="masternode"
        :masternode="masternode"
        @start="({ restart }) => startMasternode(restart)"
        @destroy="destroyMasternode"
    />
    <Modal :show="showMasternodePrivateKey">
        <template #header>
            <b>{{ translation?.ALERTS?.CONFIRM_POPUP_MN_P_KEY }}</b>
            <button
                @click="showMasternodePrivateKey = false"
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
