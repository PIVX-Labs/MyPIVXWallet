<script setup>
import { computed, toRefs } from 'vue';

const props = defineProps({
    message: String,
    level: String,
    notificationCount: Number,
});

const { message, level } = toRefs(props);

const icon = computed(() => {
    switch (level.value) {
        case 'warning':
            return 'fa-exclamation';
        case 'info':
            return 'fa-info';
        case 'success':
            return 'fa-check';
        default:
            throw new Error('Invalid type');
    }
});
</script>

<template>
    <div
        class="notifyWrapper"
        :class="{ [level]: true }"
        :style="{ opacity: 1 }"
        data-testid="alert"
    >
        <div class="notifyBadgeCount" v-if="notificationCount > 1" v-html="notificationCount"></div>
        <div style="display: inline-flex; align-items: stretch;">
            <div class="notifyIcon" :class="{ ['notify-' + level]: true }">
                <i class="fas fa-xl" :class="{ [icon]: true }"> </i>
            </div>
            <div class="notifyText" v-html="message"></div>
        </div>
        <div style="display:flex; flex-direction: column;">
            <button class="btn btn-notification-close" @click="$emit('hideAlert')">CLOSE</button>
        </div>
    </div>
</template>
