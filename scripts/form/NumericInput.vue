<script setup>
import { tr, translation } from '../i18n.js';
import Input from './Input.vue';

const props = defineProps([
    'name',
    'validationFunction',
    'max',
    'min',
    'placeholder',
    'dataTestid',
]);

const validationFunction = (value) => {
    if (!Number.isInteger(value))
        return translation.formValidationInvalidNumber;
    if (props.max && value > props.max)
        return tr(translation.formValidationMax, [{ value: props.max }]);
    if (props.min && value < props.min)
        return tr(translation.formValidationMin, [{ value: props.min }]);
    if (props.validationFunction) return props.validationFunction(value);
    return true;
};
</script>

<template>
    {{ error }}
    <Input
        type="number"
        v-model="value"
        :name="name"
        :placeholder="placeholder"
        :max="props.max"
        :min="props.min"
        :validation-function="validationFunction"
        :data-testid="props.dataTestid"
    />
</template>
