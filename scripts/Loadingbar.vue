<script setup>
const props = defineProps({
    show: Boolean,
    percentage: Number,
});
</script>

<template>
    <div
        v-if="show"
        class="mpw-progress"
        role="progressbar"
        :aria-valuenow="percentage"
        aria-valuemin="0"
        aria-valuemax="100"
    >
        <div
            class="mpw-progress-bar"
            :style="{ width: Math.max(2, Math.min(100, percentage)) + '%' }"
        ></div>
    </div>
</template>

<style>
.mpw-progress {
    position: relative;
    height: 4px;
    margin-top: 7px;
    border-radius: 999px;
    background-color: rgba(146, 33, 255, 0.18);
    overflow: hidden;
}

.mpw-progress-bar {
    position: relative;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #7b1fd8, #c56bff);
    transition: width 0.45s var(--mpw-ease-out);
    overflow: hidden;
}

/* Travelling sheen so the bar feels alive between progress updates */
.mpw-progress-bar::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.45),
        transparent
    );
    transform: translateX(-100%);
    animation: mpw-progress-sheen 1.6s ease-in-out infinite;
}

@keyframes mpw-progress-sheen {
    to {
        transform: translateX(100%);
    }
}
</style>
