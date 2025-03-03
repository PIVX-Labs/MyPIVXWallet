<script setup>
import { provide, reactive, ref } from 'vue';
import { translation } from '../i18n.js';

const props = defineProps({
    validationFunction: Function,
});
const formData = reactive({});
const error = ref('');
provide('formData', formData);

const emit = defineEmits(['submit']);
const submitForm = () => {
    const res = {};
    error.value = '';
    for (const key in formData) {
        // true is the only success
        // A string rapresents are error, and is relayed to the user
        if (formData[key].validationFunction() !== true) return;
        res[key] = formData[key].value;
    }
    if (props.validationFunction) {
        const validation = props.validationFunction(res);
        if (validation !== true) {
            error.value = validation;
            return;
        }
    }
    emit('submit', res);
};
</script>

<template>
    <form @submit.prevent="submitForm">
        {{ error }}
        <slot> </slot>
        <slot name="button" :onSubmit="() => submitForm()">
            <button
                type="button"
                class="pivx-button-big"
                style="float: right"
                @click="submitForm()"
            >
                {{ translation.popupConfirm }}
            </button>
        </slot>
    </form>
</template>
