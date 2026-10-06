<script setup>
import { computed, toRefs } from 'vue';

const props = defineProps({
    message: String,
    level: String,
    notificationCount: Number,
    actionName: String,
    // Total lifetime of the alert, in ms
    timeout: Number,
    // Time left before the alert expires, in ms
    remaining: Number,
    // Creation time of the newest folded alert; restarts the timer bar
    created: Number,
});

const { message, level, timeout, remaining } = toRefs(props);

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

const progressStyle = computed(() => ({
    '--from': Math.min(1, remaining.value / timeout.value),
    animationDuration: `${remaining.value}ms`,
}));
</script>

<template>
    <div
        class="notifyWrapper"
        :class="{ [level]: true }"
        :role="level === 'warning' ? 'alert' : 'status'"
        data-testid="alert"
    >
        <div class="notifyBadgeCount" v-if="notificationCount > 1">
            {{ notificationCount }}
        </div>
        <div class="notifyMain">
            <div class="notifyIcon" :class="{ ['notify-' + level]: true }">
                <i class="fas" :class="{ [icon]: true }"> </i>
            </div>
            <div class="notifyText" v-html="message"></div>
            <button
                class="notifyClose"
                aria-label="Close"
                data-testid="alertCloseButton"
                @click="$emit('hideAlert')"
            >
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>
        <button
            v-if="actionName"
            class="notifyAction"
            @click="$emit('runAction')"
        >
            {{ actionName }}
        </button>
        <div
            v-if="timeout > 0 && remaining > 0"
            class="notifyProgress"
            :key="created"
            :style="progressStyle"
        ></div>
    </div>
</template>
