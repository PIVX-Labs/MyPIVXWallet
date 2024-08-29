<script setup>
import { watch, toRefs, ref, nextTick } from 'vue';
import { FlipDown } from '../flipdown.js';
import { v4 as uuid } from 'uuid';
const props = defineProps({
    timeStamp: Number,
});
const { timeStamp } = toRefs(props);
const uniqueId = ref(uuid());
const flipDown = ref(null);
const flipDownElement = ref(null);
watch(
    timeStamp,
    () => {
        if (flipDownElement.value) flipDownElement.value.innerHTML = '';
        nextTick(() => {
            flipDown.value = new FlipDown(
                parseInt(timeStamp.value),
                uniqueId.value
            ).start();
        });
    },
    { immediate: true }
);
</script>

<template>
    <div
        :id="uniqueId"
        data-testid="flipdown"
        class="flipdown"
        ref="flipDownElement"
    ></div>
</template>
