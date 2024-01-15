<script setup>
import coinPlant from '../../assets/coin_plant.svg';
import pLogo from '../../assets/p_logo.svg';
import { ref, watch, toRefs } from 'vue';
import { translation } from '../i18n.js';
import { isBase64 } from '../misc';

const showInput = ref(false);
const showPassword = ref(false);
const cloakSecret = ref(true);
const passwordPlaceholder = ref(translation.password);

const props = defineProps({
    advancedMode: Boolean,
});
const { advancedMode } = toRefs(props);

/**
 * Secret is the thing being imported:
 * seed phrase, xpub, address, ...
 */
const secret = ref('');
/**
 * Password encrypts the secret
 * Can be bip32 password or our own encryption
 */
const password = ref('');

watch([secret, advancedMode], ([secret, advancedMode]) => {
    // If it cointains spaces, it's likely a bip39 seed
    const fContainsSpaces = secret.trim().includes(' ');

    // Show password input if it's a bip39 seed and we're in advanced mode
    if (fContainsSpaces && advancedMode) {
        showPassword.value = true;
    }
    // If it's a Base64 secret, it's likely an MPW encrypted import,
    // Show the password field
    else if (secret.length >= 128 && isBase64(secret)) {
        showPassword.value = true;
    } else {
        showPassword.value = false;
    }

    // If it's a mnemonic phrase, don't hide the pasword
    cloakSecret.value = !fContainsSpaces;
    passwordPlaceholder.value = fContainsSpaces
        ? translation.optionalPassphrase
        : translation.password;
});
watch(showPassword, (showPassword) => {
    // Empty password prompt when hidden
    if (!showPassword) password.value = '';
});
const emit = defineEmits(['import-wallet']);
function importWallet() {
    emit('import-wallet', secret.value, password.value);
    // Clear the input fields
    secret.value = '';
    password.value = '';
}
</script>

<template>
    <div class="col-12 col-lg-6 p-2">
        <div
            class="h-100 dashboard-item dashboard-display"
            style="margin-bottom: 100px"
        >
            <div class="container">
                <div class="coinstat-icon" v-html="coinPlant"></div>

                <div class="col-md-12 dashboard-title">
                    <h3 class="pivx-bold-title-smaller">
                        <span>{{ translation.dCardFourTitle }}</span>
                        <div>{{ translation.dCardFourSubTitle }}</div>
                    </h3>
                    <p>
                        {{ translation.dCardFourDesc }}
                    </p>
                </div>

                <!-- IMPORT WALLET -->
                <input class="hide-element" type="text" id="clipboard" />
                <div v-show="showInput">
                    <input
                        v-model="secret"
                        :type="cloakSecret ? 'password' : 'text'"
                        placeholder="Seed Phrase, XPriv or WIF Private Key"
                        data-testid="secretInp"
                    />
                    <input
                        v-show="showPassword"
                        v-model="password"
                        type="password"
                        :placeholder="passwordPlaceholder"
                        data-testid="passwordInp"
                    />
                    <button
                        class="pivx-button-big"
                        @click="importWallet()"
                        data-testid="importWalletButton"
                    >
                        <span class="buttoni-icon"
                            ><i class="fas fa-file-upload fa-tiny-margin"></i
                        ></span>
                        <span class="buttoni-text" data-i18n="dCardFourButtonI"
                            >Import Wallet</span
                        >
                        <span class="buttoni-arrow">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 32 32"
                            >
                                <path
                                    d="M23.328 16.707L13.121 26.914a.5.5 0 01-.707 0l-2.828-2.828a.5.5 0 010-.707L16.964 16 9.586 8.621a.5.5 0 010-.707l2.828-2.828a.5.5 0 01.707 0l10.207 10.207a1 1 0 010 1.414z"
                                ></path>
                            </svg>
                        </span>
                    </button>
                </div>
                <!-- // IMPORT WALLET -->

                <button
                    v-show="!showInput"
                    class="pivx-button-big"
                    @click="showInput = true"
                    data-testid="accWalletButton"
                >
                    <span class="buttoni-icon" v-html="pLogo"> </span>

                    <span class="buttoni-text" data-i18n="dCardFourButtonA"
                        >Access My Wallet</span
                    >
                </button>
            </div>
        </div>
    </div>
</template>
