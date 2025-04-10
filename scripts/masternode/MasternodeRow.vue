<script setup>
import Refresh from '../../assets/icons/icon-refresh.svg';
import Trash from '../../assets/icons/icon-trash.svg';
import { translation, ALERTS } from '../i18n';
import { useAlerts } from '../composables/use_alerts.js';
import Masternode from '../masternode.js';
import Modal from '../Modal.vue';

import { toRefs, ref, watch, onMounted } from 'vue';
import { nextTick } from 'vue';

const props = defineProps({
    masternode: Masternode,
});
const { createAlert } = useAlerts();
const emit = defineEmits(['restartMasternode', 'deleteMasternode']);

const { masternode } = toRefs(props);

const showRestartConfirmation = ref(false);
const showDeleteConfirmation = ref(false);

const info = ref({});

async function updateMnData(mn) {
    const { status, lastseen } = await mn.getFullData();
    info.value = {
        status: status,
        addr: mn.addr,
        lastSeen: new Date(lastseen).toLocaleTimeString() || 'Unknown',
    };
}
onMounted(() => {
    document
        .getElementById('masternodeTab')
        .addEventListener('click', () => updateMnData(masternode.value));
});
watch(masternode, updateMnData, { immediate: true });
watch(info, (info) => {
    if (info.status === 'MISSING') {
        createAlert('warning', ALERTS.MN_OFFLINE_STARTING, 6000);
        emit('restartMasternode', masternode.value, { restart: false });
        nextTick(() => updateMnData);
    }
});
function getClassByStatus(status) {
    switch (status) {
        case 'ENABLED':
            return 'enabledBadge';
        case 'PRE_ENABLED':
            return 'preEnabledBadge';
        default:
            return 'missingBadge';
    }
}

function translateStatus(status) {
    switch (status) {
        case 'ENABLED':
            return translation.masternodeStatusEnabled;
        case 'PRE_ENABLED':
            return translation.masternodeStatusPreEnabled;
        case 'MISSING':
            return translation.masternodeStatusMissing;
        case 'EXPIRED':
            return translation.masternodeStatusExpired;
        default:
            // Fall back to raw status
            return status;
    }
}
</script>

<template>
    <tr>
        <td>
            <span
                class="masternodeBadges"
                :class="{ [getClassByStatus(info.status)]: true }"
                >{{ translateStatus(info.status) }}</span
            >
        </td>
        <td>
            <code
                class="wallet-code text-center active ptr"
                style="padding: 4px 9px"
                >{{ info.addr }}</code
            >
        </td>
        <td>
            <span class="mnLastSeen">{{ info.lastSeen }}</span>
        </td>
        <td class="text-right" style="padding: 0px; padding-top: 11px">
            <button
                class="pivx-button-small"
                style="height: 43px; width: 43px; padding-left: 13px"
                @click="showRestartConfirmation = true"
            >
                <span class="buttoni-text">
                    <span class="plus-icon" v-html="Refresh"> </span>
                </span>
            </button>
            <button
                class="pivx-button-small"
                style="height: 43px; width: 43px; padding-left: 13px"
                @click="showDeleteConfirmation = true"
            >
                <span class="buttoni-text">
                    <span class="plus-icon" v-html="Trash"> </span>
                </span>
            </button>
        </td>
    </tr>
    <Teleport to="body">
        <Modal :show="showRestartConfirmation">
            <template #header>
                <h3
                    class="modal-title"
                    style="text-align: center; width: 100%; color: #8e21ff"
                >
                    {{ translation.masternodeRestartTitle }}
                </h3>
            </template>
            <template #body>
                {{ translation.masternodeRestartConfirmation }}
            </template>
            <template #footer>
                <button
                    data-i18n="popupConfirm"
                    type="button"
                    class="pivx-button-big"
                    style="float: right"
                    @click="
                        emit('restartMasternode', masternode);
                        showRestartConfirmation = false;
                    "
                >
                    Confirm
                </button>
                <button
                    type="button"
                    class="pivx-button-big-cancel"
                    style="float: right"
                    @click="showRestartConfirmation = false"
                >
                    {{ translation.popupCancel }}
                </button>
            </template>
        </Modal>
    </Teleport>
    <Teleport to="body">
        <Modal :show="showDeleteConfirmation">
            <template #header>
                <h3
                    class="modal-title"
                    style="text-align: center; width: 100%; color: #8e21ff"
                >
                    {{ translation.masternodeDeleteConfirmation }}
                </h3>
            </template>
            <template #body>
                {{ translation.masternodeDeleteConfirmation }}
            </template>
            <template #footer>
                <button
                    data-i18n="popupConfirm"
                    type="button"
                    class="pivx-button-big"
                    style="float: right"
                    @click="
                        emit('deleteMasternode', masternode);
                        showDeleteConfirmation = false;
                    "
                >
                    Confirm
                </button>
                <button
                    type="button"
                    class="pivx-button-big-cancel"
                    style="float: right"
                    @click="showDeleteConfirmation = false"
                >
                    {{ translation.popupCancel }}
                </button>
            </template>
        </Modal>
    </Teleport>
</template>
