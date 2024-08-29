<script setup>
import { translation } from './i18n.js';
import { ref, watch } from 'vue';

const emit = defineEmits(['update:modelValue']);

const props = defineProps({
  show_toggle: {
    type: Boolean,
    default: true
  }
});

const password = defineModel('password', {
    default: '',
});
const is_visible = defineModel('is_visible', {
    default: false,
});
const passwordInput = ref(null);

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
            :type="is_visible ? 'text' : 'password'"
            ref="passwordInput"
            v-model="password"
            :placeholder="translation.walletPassword"
            class="center-text textboxTransparency"
            :style="`${
                show_toggle
                    ? 'width: 85%; border-top-right-radius: 0; border-bottom-right-radius: 0;'
                    : 'width: 100%;'
            } font-family: monospace;`"
        />
        <span
            v-if="show_toggle"
            @click="is_visible = !is_visible"
            class="input-group-toggle input-group-text p-0"
            style="height: 100%"
        >
            <i :class="'fa-solid fa-' + (is_visible ? 'eye' : 'eye-slash')"></i>
        </span>
    </div>
</template>
