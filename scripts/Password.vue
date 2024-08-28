<script setup>
import { translation } from './i18n.js';
import { ref, watch } from 'vue';

const emit = defineEmits(['update:modelValue']);

const password = defineModel('password', {
    default: '',
});
const show_toggle = defineModel('show_toggle', {
    default: true,
});
const passwordInput = ref(null);
const password_visibility = ref('password');
const password_visibility_icon = ref('fa-solid fa-eye-slash');

function togglePasswordVisibility() {
    const fVisible = password_visibility.value === 'text';
    password_visibility.value = fVisible ? 'password' : 'text';
    const strIcon = fVisible ? 'eye-slash' : 'eye';
    password_visibility_icon.value = 'fa-solid fa-' + strIcon;
}

function focus() {
    passwordInput?.value?.focus();
}

defineExpose({ focus });

watch(password, (newVal) => {
    emit('update:modelValue', newVal);
});
</script>

<template>
    <div class="input-group">
        <input
            :type="password_visibility"
            ref="passwordInput"
            v-model="password"
            :placeholder="translation.walletPassword"
            class="center-text textboxTransparency"
            :style="`${show_toggle ? 'width: 85%; border-top-right-radius: 0; border-bottom-right-radius: 0;' : 'width: 100%;'} font-family: monospace;`"
        />
        <span
            v-if="show_toggle"
            @click="togglePasswordVisibility()"
            class="input-group-toggle input-group-text p-0"
            style="height: 100%"
        >
            <i :class="password_visibility_icon"></i>
        </span>
    </div>
</template>
