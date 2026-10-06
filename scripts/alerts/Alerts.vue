<script setup>
import { useAlerts } from '../composables/use_alerts';
import { computed, watch, ref } from 'vue';
import Alert from './Alert.vue';

const alerts = useAlerts();
const foldedAlerts = ref([]);
watch(alerts, () => {
    const res = [];
    let previousAlert;
    let count = 1;
    const pushAlert = () => {
        if (previousAlert) {
            const timeout =
                previousAlert.created + previousAlert.timeout - Date.now();
            const show = timeout > 0;
            if (!show) return;
            const alert = ref({
                ...previousAlert,
                message: `${previousAlert.message}`,
                show,
                count,
                remaining: timeout,
                actionName: previousAlert.actionName,
                actionFunc: previousAlert.actionFunc,
                // Store original message so we can use it as key.
                // This skips the animation in case of multiple errors
                original: previousAlert,
            });

            res.push(alert);
            if (timeout > 0) {
                setTimeout(() => {
                    alert.value.original.show = false;
                }, timeout);
            }
        }
    };
    for (const alert of alerts.alerts) {
        if (previousAlert && previousAlert?.message === alert.message) {
            count++;
        } else {
            pushAlert();
            count = 1;
        }
        previousAlert = alert;
    }
    pushAlert();
    foldedAlerts.value = res;
});

/**
 * Run an 'action' connected to an alert
 * @param {import('./alert.js').Alert} cAlert - The caller alert which is running an action
 */
function runAction(cAlert) {
    cAlert.actionFunc();
    cAlert.original.show = false;
}
</script>

<template>
    <transition-group name="alert">
        <div
            v-for="alert of foldedAlerts.filter(
                (a) => a.value.original.show !== false
            )"
            :key="alert.value.original.message"
            data-testid="alerts"
        >
            <Alert
                :message="alert.value.message"
                :level="alert.value.level"
                :notificationCount="alert.value.count"
                :actionName="alert.value.actionName"
                :timeout="alert.value.timeout"
                :remaining="alert.value.remaining"
                :created="alert.value.created"
                @hideAlert="alert.value.original.show = false"
                @runAction="runAction(alert.value)"
            />
        </div>
    </transition-group>
</template>

<style>
.alert-enter-active {
    transition: opacity var(--mpw-dur-base) ease,
        transform var(--mpw-dur-slow) var(--mpw-ease-out);
}
.alert-leave-active {
    transition: opacity var(--mpw-dur-base) ease,
        transform var(--mpw-dur-base) ease-in;
    /* Take leaving toasts out of the flow so the rest glide up smoothly */
    position: absolute;
    width: 100%;
}
.alert-move {
    transition: transform var(--mpw-dur-slow) var(--mpw-ease-out);
}
.alert-enter-from {
    opacity: 0;
    transform: translateX(40px) scale(0.98);
}
.alert-leave-to {
    opacity: 0;
    transform: translateX(24px) scale(0.96);
}
@media (max-width: 576px) {
    .alert-enter-from {
        transform: translateY(-16px) scale(0.98);
    }
    .alert-leave-to {
        transform: translateY(-8px) scale(0.96);
    }
}
</style>
