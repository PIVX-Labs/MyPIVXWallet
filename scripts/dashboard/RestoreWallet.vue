<script setup>
import { ref, toRefs } from 'vue';
import Modal from '../Modal.vue';
import { ALERTS, translation } from '../i18n.js';
import { Database } from '../database.js';
import { decrypt } from '../aes-gcm';
import { createAlert } from '../misc';

const props = defineProps({
    show: Boolean,
    reason: String,
});
const { show, reason } = toRefs(props);
const emit = defineEmits(['close', 'import']);
const password = ref('');

async function submit() {
    const db = await Database.getInstance();
    const account = await db.getAccount();
    const wif = await decrypt(account.encWif, password.value);
    const extsk = await decrypt(account.encExtsk, password.value);
    if (wif) {
        emit('import', wif, extsk);
        close();
    } else {
        createAlert('warning', ALERTS.FAILED_TO_IMPORT);
    }
}
function close() {
    emit('close');
    password.value = '';
}
</script>
<template>
    <Teleport to="body">
        <Modal :show="show">
            <template #header>
                <h3
                    class="modal-title"
                    style="text-align: center; width: 100%; color: #8e21ff"
                >
                    {{ translation.walletUnlock }}
                </h3>
            </template>

            <template #body>
                <p style="opacity: 0.75" v-if="!!reason">{{ reason }}</p>
                <input
                    type="password"
                    v-model="password"
                    :placeholder="translation.walletPassword"
                    style="text-align: center"
                />
            </template>
            <template #footer>
                <button
                    data-i18n="popupConfirm"
                    type="button"
                    class="pivx-button-big"
                    style="float: right"
                    @click="submit()"
                >
                    Confirm
                </button>
                <button
                    type="button"
                    class="pivx-button-big"
                    style="float: right; opacity: 0.7"
                    @click="close()"
                >
                    Cancel
                </button>
            </template>
        </Modal>
    </Teleport>
</template>
