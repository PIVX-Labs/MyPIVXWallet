<script setup>
import { translation } from './i18n.js';
import { ref } from 'vue';

const props = defineProps({
    showToggle: {
        type: Boolean,
        default: true,
    },
    placeholder: {
        type: String,
    },
    testid: {
        type: String,
    },
});

const password = defineModel('password', {
    default: '',
});
const isVisible = defineModel('isVisible', {
    default: false,
});
const passwordInput = ref(null);

function focus() {
    passwordInput?.value?.focus();
}

defineExpose({ focus });
</script>

<template>
    <div class="input-group">
        <input
            :type="isVisible ? 'text' : 'password'"
            ref="passwordInput"
            v-model="password"
            :placeholder="placeholder || translation.walletPassword"
            class="center-text textboxTransparency"
            :style="`${
                showToggle
                    ? 'width: 85%; border-top-right-radius: 0; border-bottom-right-radius: 0;'
                    : 'width: 100%;'
            } font-family: monospace;`"
            :data-testid="testid || null"
        />
        <span
            v-if="showToggle"
            @click="isVisible = !isVisible"
            class="input-group-toggle input-group-text p-0"
            style="height: 100%"
        >
            <i :class="'fa-solid fa-' + (isVisible ? 'eye' : 'eye-slash')"></i>
        </span>
    </div>
</template>
