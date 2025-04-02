<script setup>
import { ref, inject, watch, toRaw } from 'vue';
import { tr, translation } from '../i18n.js';

const props = defineProps({
    name: String,
    validationFunction: Function,
    maxLength: Number,
    minLength: Number,
    placeholder: String,
    type: String,
    max: Number,
    min: Number,
    disabled: Boolean,
    'data-testid': String,
});

const value = ref('');
const error = ref('');
const validationFunction = () => {
    if (props.maxLength && value.value.length > props.maxLength)
        return tr(translation.formValidationMaxLength, [
            { length: props.maxLength },
        ]);
    if (props.minLength && value.value.length < props.minLength)
        return tr(translation.formValidationMinLength, [
            { length: props.minLength },
        ]);
    if (props.validationFunction) return props.validationFunction(value.value);
    return true;
};
/**
 * @type{import('vue').Reactive<{[key: string]: string}>}
 */
const formData = inject('formData');
watch(
    [
        value,
        () => props.validationFunction,
        () => props.name,
        () => props.disabled,
    ],
    () => {
        if (!props.name) return;
        if (props.disabled) {
            delete formData[props.name];
            return;
        }
        error.value = '';

        formData[props.name] = {
            value: value.value,
            validationFunction: () => {
                const res = validationFunction();
                if (res !== true) error.value = res;
                return res;
            },
        };
    },
    { immediate: true }
);

watch(
    () => props.disabled,
    () => {
        if (props.disabled) {
            value.value = '';
            error.value = '';
        }
    }
);
watch(
    () => props['data-testid'],
    () => console.log(props['data-testid'])
);
</script>

<template>
    <input
        :class="{ 'input-error': error?.length }"
        v-model="value"
        :placeholder="placeholder"
        :type="props.type"
        :max="props.max"
        :min="props.min"
        :disabled="props.disabled"
        :data-testid="props['dataTestid']"
    />
    <div class="validation-summary">
        {{ error }}
    </div>
</template>

<style>
.input-error {
    border: 2px solid #ff1d1d;
    margin-bottom: 0;
}
.validation-summary {
    color: #ff1d1d;
}
</style>
