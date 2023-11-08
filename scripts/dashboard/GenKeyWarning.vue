<script setup>
import { translation, tr, ALERTS } from '../i18n.js';
import { ref } from 'vue';
import Modal from '../Modal.vue';
import { MIN_PASS_LENGTH } from '../chain_params.js';
import { createAlert } from '../misc';

const props = defineProps({
    showModal: Boolean,
    showBox: Boolean,
    isEncrypt: Boolean,
});

const currentPassword = ref('');
const password = ref('');
const passwordConfirm = ref('');

const emit = defineEmits(['onEncrypt', 'close']);

function close() {
    props.showModal = false;
    currentPassword.value = '';
    password.value = '';
    passwordConfirm.value = '';
    emit('close');
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
    <div class="col-12" v-show="showBox">
        <center>
            <div class="dcWallet-warningMessage" @click="showModal = true">
                <div class="shieldLogo">
                    <div class="shieldBackground">
                        <span
                            class="dcWallet-svgIconPurple"
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
        <Modal
            :show="showModal"
            @close="close()"
            modalClass="exportKeysModalColor"
        >
            <template #header>
                <h5 class="modal-title"> {{ translation.encryptWallet }} </h5>
                <button
                    type="button"
                    class="close"
                    aria-label="Close"
                    @click="close()"
                >
                    <i class="fa-solid fa-xmark closeCross"></i>
                </button>
            </template>
            <template #body>
                <div class="row m-0">
                    <input
                        class="center-text textboxTransparency"
                        data-i18n="encryptPasswordCurrent"
                        v-model="currentPassword"
                        style="width: 100%; font-family: monospace"
                        type="password"
                        :placeholder="translation.encryptPasswordCurrent"
                        v-show="isEncrypt"
                    />
                    <div class="col-12 col-md-6 p-0 pr-0 pr-md-1">
                        <input
                            class="center-text textboxTransparency"
                            v-model="password"
                            data-i18n="encryptPasswordFirst"
                            style="width: 100%; font-family: monospace"
                            type="password"
                            :placeholder="translation.encryptPasswordFirst"
                        />
                    </div>
                    <div class="col-12 col-md-6 p-0 pl-0 pl-md-1">
                        <input
                            class="center-text textboxTransparency"
                            v-model="passwordConfirm"
                            data-i18n="encryptPasswordSecond"
                            style="width: 100%; font-family: monospace"
                            type="password"
                            :placeholder="translation.encryptPasswordSecond"
                        />
                    </div>
                </div>
            </template>
            <template #footer>
                <button class="pivx-button-small" @click="submit()">
                    <span class="dcWallet-svgIconPurple">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 100 100"
                        >
                            <path
                                d="M85.967 10.65l-32.15-9.481a13.466 13.466 0 00-7.632 0l-32.15 9.48C11.661 11.351 10 13.567 10 16.042v26.623c0 12.321 3.67 24.186 10.609 34.31 6.774 9.885 16.204 17.49 27.264 21.99a5.612 5.612 0 004.251 0c11.061-4.5 20.491-12.104 27.266-21.99C86.329 66.85 90 54.985 90 42.664V16.042a5.656 5.656 0 00-4.033-5.392zM69 68.522C69 70.907 67.03 72 64.584 72H34.092C31.646 72 30 70.907 30 68.522v-23.49C30 42.647 31.646 41 34.092 41H37v-9.828C37 24.524 41.354 18.5 49.406 18.5 57.37 18.5 62 24.066 62 31.172V41h2.584C67.03 41 69 42.647 69 45.032v23.49zM58 41v-9.828c0-4.671-3.708-8.472-8.5-8.472-4.791 0-8.5 3.8-8.5 8.472V41h17z"
                            ></path>
                        </svg>
                    </span>
                    <span data-i18n="encrypt"> {{ translation.encrypt }} </span>
                </button>
            </template>
        </Modal>
    </Teleport>
</template>
