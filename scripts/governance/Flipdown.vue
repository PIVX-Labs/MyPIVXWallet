<script setup>
import { watch, toRefs, ref, nextTick, onUnmounted } from 'vue';
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
        nextTick(() => {
            // Stop the previous clock before rebuilding, or its interval leaks
            flipDown.value?.stop();
            if (flipDownElement.value) flipDownElement.value.innerHTML = '';
            flipDown.value = new FlipDown(
                parseInt(timeStamp.value),
                uniqueId.value
            ).start();
        });
    },
    { immediate: true }
);
onUnmounted(() => flipDown.value?.stop());
</script>

<template>
    <div
        :id="uniqueId"
        data-testid="flipdown"
        class="flipdown"
        ref="flipDownElement"
    ></div>
</template>
