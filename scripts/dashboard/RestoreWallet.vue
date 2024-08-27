<script setup>
import { nextTick, ref, toRefs, watch } from 'vue';
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
const passwordInput = ref(null);

watch(show, (show) => {
    nextTick(() => {
        if (show) passwordInput?.value?.focus();
    });
    if (!show) password.value = '';
});

async function submit() {
    const db = await Database.getInstance();
    const account = await db.getAccount();
    const wif = await decrypt(account.encWif, password.value);
    const extsk = await decrypt(account.encExtsk, password.value);
    if (wif) {
        emit('import', wif, extsk);
    } else {
        createAlert('warning', ALERTS.FAILED_TO_IMPORT);
    }
}

function close() {
    emit('close');
    password.value = '';
}

const password_visibility = ref('password');
const password_visibility_icon = ref('fa-solid fa-eye-slash');
function togglePasswordVisibility() {
    const fVisible = password_visibility.value === 'text';

    // Toggle the password visibility
    password_visibility.value = fVisible ? 'password' : 'text';

    // Toggle the 'eye' icon to open/closed
    const strIcon = fVisible ? 'eye-slash' : 'eye';
    password_visibility_icon.value = 'fa-solid fa-' + strIcon;
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
                    :type="password_visibility"
                    ref="passwordInput"
                    v-model="password"
                    :placeholder="translation.walletPassword"
                    style="
                        text-align: center;
                        width: 80%;
                        border-top-right-radius: 0;
                        border-bottom-right-radius: 0;
                    "
                /><span
                    @click="togglePasswordVisibility()"
                    class="input-group-toggle input-group-text p-0"
                >
                    <i :class="password_visibility_icon"></i>
                </span>
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
