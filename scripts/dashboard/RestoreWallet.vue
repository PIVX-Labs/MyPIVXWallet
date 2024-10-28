<script setup>
import { nextTick, ref, toRefs, watch } from 'vue';
import Modal from '../Modal.vue';
import Password from '../Password.vue';
import { ALERTS, translation } from '../i18n.js';
import { Database } from '../database.js';
import { decrypt } from '../aes-gcm';
import { ParsedSecret } from '../parsed_secret';
import { useAlerts } from '../composables/use_alerts.js';

const { createAlert } = useAlerts();

const props = defineProps({
    show: Boolean,
    reason: String,
    wallet: Object,
});
const { show, reason, wallet } = toRefs(props);
const emit = defineEmits(['close', 'import']);
const password = ref('');
const passwordInput = ref(null);

watch(show, (show) => {
    nextTick(() => {
        if (show) passwordInput?.value?.focus();
    });
    if (!show) password.value = '';
});

async function importWif(wif, extsk) {
    const secret = await ParsedSecret.parse(wif);
    if (secret.masterKey) {
        await wallet.value.setMasterKey({ mk: secret.masterKey, extsk });
        if (wallet.value.hasShield && !extsk) {
            createAlert(
                'warning',
                'Could not decrypt sk even if password is correct, please contact a developer'
            );
        }
        createAlert('success', ALERTS.WALLET_UNLOCKED, 1500);
    }
}

async function submit() {
    const db = await Database.getInstance();
    const account = await db.getAccount();
    const wif = await decrypt(account.encWif, password.value);
    const extsk = await decrypt(account.encExtsk, password.value);
    if (wif) {
        await importWif(wif, extsk);
        emit('import', wif, extsk);
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
                <Password v-model:password="password" ref="passwordInput" />
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
                    class="pivx-button-big-cancel"
                    style="float: right"
                    @click="close()"
                >
                    {{ translation.popupCancel }}
                </button>
            </template>
        </Modal>
    </Teleport>
</template>
