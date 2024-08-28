<script setup>
import { translation } from './i18n.js';
import { ref, defineProps, watch } from 'vue';

const props = defineProps(['password']);
const emit = defineEmits(['update:modelValue']);

const password = ref('');
const password_visibility = ref('password');
const password_visibility_icon = ref('fa-solid fa-eye-slash');

function togglePasswordVisibility() {
    const fVisible = password_visibility.value === 'text';
    password_visibility.value = fVisible ? 'password' : 'text';
    const strIcon = fVisible ? 'eye-slash' : 'eye';
    password_visibility_icon.value = 'fa-solid fa-' + strIcon;
}

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
            style="
                width: 85%;
                font-family: monospace;
                border-top-right-radius: 0;
                border-bottom-right-radius: 0;
            "
        />
        <span
            @click="togglePasswordVisibility()"
            class="input-group-toggle input-group-text p-0"
            style="height: 100%"
        >
            <i :class="password_visibility_icon"></i>
        </span>
    </div>
</template>
