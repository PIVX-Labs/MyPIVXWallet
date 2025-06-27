<script setup>
import { useWallet } from '../composables/use_wallet';
import Modal from '../Modal.vue';
import { KoinlyExport } from '../tx_export/koinly_export.js';
import { ref } from 'vue';
import { translation } from '../i18n.js';

const wallet = useWallet();
const showConfirmationModal = ref(false);

function exportToCsv() {
    const koinlyExport = new KoinlyExport(wallet.historicalTxs);
    const csvBlob = new Blob([koinlyExport.getCsv()], { type: 'text/csv' });

    const csvURL = URL.createObjectURL(csvBlob);

    const downloadLink = document.createElement('a');
    downloadLink.href = csvURL;
    downloadLink.download = 'MPW-transactions.csv';

    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    showConfirmationModal.value = false;
}
</script>

<template>
    <i
        class="fa-solid fa-file-csv cur-pointer"
        @click="showConfirmationModal = true"
    ></i>
    <Teleport to="body">
        <Modal :show="showConfirmationModal">
            <template #header>
                <h3
                    class="modal-title"
                    style="text-align: center; width: 100%; color: #8e21ff"
                >
                    {{ translation.exportToCsv }}
                </h3>
            </template>

            <template #body>
                {{ translation.exportToCsvBody }}
            </template>
            <template #footer>
                <button
                    data-i18n="popupConfirm"
                    type="button"
                    class="pivx-button-big"
                    style="float: right"
                    @click="exportToCsv()"
                >
                    Confirm
                </button>
                <button
                    type="button"
                    class="pivx-button-big-cancel"
                    style="float: right"
                    @click="showConfirmationModal = false"
                >
                    {{ translation.popupCancel }}
                </button>
            </template>
        </Modal>
    </Teleport>
</template>
