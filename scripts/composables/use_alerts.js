import { ref } from 'vue';
import { defineStore } from 'pinia';
import { AlertController } from '../alerts/alert.js';

export const useAlerts = defineStore('alerts', () => {
    const alerts = ref([]);

    const alertController = AlertController.getInstance();

    /**
     * Create a custom GUI Alert popup
     *
     * ### Do NOT display arbitrary / external errors:
     * - The use of `.innerHTML` allows for input styling at this cost.
     * @param {'success'|'info'|'warning'} type - The alert level
     * @param {string} message - The message to relay to the user
     * @param {number?} timeout - The time in `ms` until the alert expires (Defaults to never expiring)
     */
    const createAlert = (type, message, timeout) => {
        alertController.createAlert(type, message, timeout);
    };

    alertController.subscribe(() => {
        alerts.value = [...alertController.getAlerts()];
        console.log(alerts.value);
    });

    return {
        alerts,
        createAlert,
    };
});
