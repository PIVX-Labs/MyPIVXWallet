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
     * @param {string?} actionName - The button title of an optional Action to perform
     * @param {function?} actionFunc - The function to execute if the Action button is used
     */
    const createAlert = (type, message, timeout, actionName, actionFunc) => {
        alertController.createAlert(
            type,
            message,
            timeout,
            actionName,
            actionFunc
        );
    };

    alertController.subscribe(() => {
        alerts.value = [...alertController.getAlerts()];
    });

    return {
        alerts,
        createAlert,
    };
});
