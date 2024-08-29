<script setup>
import { translation, tr, ALERTS } from '../i18n.js';
import { ref } from 'vue';
import Modal from '../Modal.vue';
import Password from '../Password.vue';
import { MIN_PASS_LENGTH } from '../chain_params.js';
import { createAlert } from '../misc';

import pLock from '../../assets/icons/icon-lock-locked.svg';

const props = defineProps({
    showModal: Boolean,
    showBox: Boolean,
    isEncrypt: Boolean,
});

const isDualPasswordVisible = defineModel('isVisible', {
    default: false,
});

const currentPassword = ref('');
const password = ref('');
const passwordConfirm = ref('');

const emit = defineEmits(['onEncrypt', 'close', 'open']);

function close() {
    currentPassword.value = '';
    password.value = '';
    passwordConfirm.value = '';
    emit('close');
}

const current_password_visibility = ref('password');
const current_password_visibility_icon = ref('fa-solid fa-eye-slash');
function toggleCurrentPasswordVisibility() {
    const fVisible = current_password_visibility.value === 'text';

    // Toggle the password visibility
    current_password_visibility.value = fVisible ? 'password' : 'text';

    // Toggle the 'eye' icon to open/closed
    const strIcon = fVisible ? 'eye-slash' : 'eye';
    current_password_visibility_icon.value = 'fa-solid fa-' + strIcon;
}

const new_password_visibility = ref('password');
const new_password_visibility_icon = ref('fa-solid fa-eye-slash');
function toggleNewPasswordVisibility() {
    const fVisible = new_password_visibility.value === 'text';

    // Toggle the password visibility
    new_password_visibility.value = fVisible ? 'password' : 'text';

    // Toggle the 'eye' icon to open/closed
    const strIcon = fVisible ? 'eye-slash' : 'eye';
    new_password_visibility_icon.value = 'fa-solid fa-' + strIcon;
}

/**
 * Perform basic checks, then emit the event to our parent
 */
function submit() {
    if (password.value.length < MIN_PASS_LENGTH) {
        return createAlert(
            'warning',
            tr(ALERTS.PASSWORD_TOO_SMALL, [{ MIN_PASS_LENGTH }]),
            4000
        );
    }

    if (password.value !== passwordConfirm.value) {
        return createAlert('warning', ALERTS.PASSWORD_DOESNT_MATCH, 2250);
    }
    emit('onEncrypt', password.value, currentPassword.value);
    close();
}
</script>

<template>
    <div class="col-12 p-0" v-show="showBox">
        <center>
            <div
                class="dcWallet-warningMessage"
                @click="emit('open')"
                data-testid="encryptBox"
            >
                <div class="shieldLogo" style="width: 42px">
                    <div class="shieldBackground">
                        <span
                            class="dcWallet-svgIconPurple publicSwitchIcon"
                            style="top: 14px; left: 7px"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 100 100"
                            >
                                <path
                                    d="M85.967 10.65l-32.15-9.481a13.466 13.466 0 00-7.632 0l-32.15 9.48C11.661 11.351 10 13.567 10 16.042v26.623c0 12.321 3.67 24.186 10.609 34.31 6.774 9.885 16.204 17.49 27.264 21.99a5.612 5.612 0 004.251 0c11.061-4.5 20.491-12.104 27.266-21.99C86.329 66.85 90 54.985 90 42.664V16.042a5.656 5.656 0 00-4.033-5.392zM69 68.522C69 70.907 67.03 72 64.584 72H34.092C31.646 72 30 70.907 30 68.522v-23.49C30 42.647 31.646 41 34.092 41H37v-9.828C37 24.524 41.354 18.5 49.406 18.5 57.37 18.5 62 24.066 62 31.172V41h2.584C67.03 41 69 42.647 69 45.032v23.49zM58 41v-9.828c0-4.671-3.708-8.472-8.5-8.472-4.791 0-8.5 3.8-8.5 8.472V41h17z"
                                ></path>
                            </svg>
                        </span>
                    </div>
                </div>
                <div>
                    <span style="color: #dfdfdf; font-size: 12px">{{
                        translation.gettingStarted
                    }}</span
                    ><br />
                    <span>{{ translation.secureYourWallet }}</span>
                </div>
            </div>
        </center>
    </div>

    <Teleport to="body">
        <Modal :show="showModal" modalClass="exportKeysModalColor modalMain">
            <template #header>
                <h5 class="modal-title" style="text-align: center; width: 100%">
                    {{ translation.encryptWallet }}
                </h5>
            </template>
            <template #body>
                <div v-show="isEncrypt">
                    <Password
                        v-model="currentPassword"
                        :placeholder="translation.encryptPasswordCurrent"
                    />
                </div>
                <Password
                    v-model="password"
                    v-model:isVisible="isDualPasswordVisible"
                    :placeholder="translation.encryptPasswordFirst"
                />
                <Password
                    v-model="passwordConfirm"
                    v-model:isVisible="isDualPasswordVisible"
                    :showToggle="false"
                    :placeholder="translation.encryptPasswordSecond"
                />
            </template>
            <template #footer>
                <button
                    type="button"
                    class="pivx-button-big-cancel"
                    style="float: left"
                    data-testid="closeBtn"
                    @click="close()"
                >
                    {{ translation.popupCancel }}
                </button>
                <button
                    class="pivx-button-big"
                    style="float: right"
                    @click="submit()"
                    data-testid="submitBtn"
                >
                    <span
                        class="dcWallet-svgIconPurple iconBtn"
                        style="margin-right: 5px; top: 4px"
                        v-html="pLock"
                    ></span>
                    <span data-i18n="encrypt"> {{ translation.encrypt }} </span>
                </button>
            </template>
        </Modal>
    </Teleport>
</template>
