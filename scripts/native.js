import { ALERTS } from './i18n.js';
import { createAlert } from './misc.js';

// Register a service worker, if it's supported
export function registerWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./native-worker.js');

        // Listen for device pre-install events, these fire if MPW is capable of being installed on the device
        window.addEventListener('beforeinstallprompt', (event) => {
            // Prevent the mini-infobar from appearing on mobile.
            event.preventDefault();
        });

        // Listen for successful installs
        window.addEventListener('appinstalled', (_event) => {
            // Notify!
            return createAlert('success', ALERTS.APP_INSTALLED, 2500);
        });
    }
}
