<script setup>
const props = defineProps({
    show: Boolean,
    percentage: Number,
});
</script>

<template>
    <Transition name="modal">
        <div v-if="show" div class="progress" style="max-width: 310px">
            <div
                class="progress-bar progress-bar-striped progress-bar-animated"
                role="progressbar"
                aria-valuenow="percentage"
                aria-valuemin="0"
                aria-valuemax="100"
                :style="{ width: percentage + '%' }"
            ></div>
        </div>
    </Transition>
</template>
