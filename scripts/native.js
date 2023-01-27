import { doms } from './global';
import { createAlert } from './misc';

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
            return createAlert('success', 'App Installed!', 2500);
        });
    }
}
