<script setup>
 import { useAlerts } from '../composables/use_alerts'
 import { computed, watch } from 'vue';
 import Alert from './Alert.vue'

 const alerts = useAlerts();
 const foldedAlerts = computed(()=> {
     for (let i = 0; i < 5; i++) {
	 alerts.createAlert('warning', 'dummy error');
     }
     const res = [];
     let previousAlert;
     let count = 1;
     for (const alert of alerts.alerts) {
	 if(previousAlert && previousAlert?.message === alert.message) {
	     count++;
	 } else {
	     if (previousAlert)
		 res.push({...previousAlert, message: `${previousAlert.message} (x${count})`});

	     count = 1;
	 }
	 previousAlert = alert;
     }
     if (previousAlert){
	 res.push({...previousAlert, message: `${previousAlert.message} (x${count})`});

     }
     return res;
     
 })
 watch(foldedAlerts, console.log);

</script>

<template>
    <div v-for="alert of foldedAlerts">
	<Alert :message="alert.message" :level="alert.level" />
    </div>
</template>
