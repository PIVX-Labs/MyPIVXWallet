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
        console.log(previousAlert);
        if (previousAlert) {
            const countStr = count === 1 ? '' : ` (x${count})`;
            const timeout =
                previousAlert.created + previousAlert.timeout - Date.now();
            const alert = ref({
                ...previousAlert,
                message: `${previousAlert.message}${countStr}`,
                show: timeout > 0,
            });
	    
            res.push(alert);
            if (timeout > 0) {
                setTimeout(() => {
                  //  alert.value.show = false;
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
</script>

<template>
    <div v-for="alert of foldedAlerts">
	<Transition name="alert"> 
            <Alert
		v-show="alert.value.show"
		:message="alert.value.message"
		:level="alert.value.level"
		@click="alert.value.show = false"
            />
	</Transition>
    </div>
</template>

<style>
 .alert-enter-active,
 .alert-leave-active {
     transition: opacity 0.5s ease;
 }

 .alert-enter-from,
 .alert-leave-to {
     opacity: 0;
 }
</style>
