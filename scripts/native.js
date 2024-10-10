import { ALERTS } from './i18n.js';
import { AlertController } from './alerts/alert.js'

// Register a service worker, if it's supported
export function registerWorker() {
    const alertController = AlertController.getInstance();
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker
            .register('./native-worker.js')
            .then((registration) => {
                const sendMessage = (serviceWorker) => {
                    const files = Array.from(
                        document.head.querySelectorAll(
                            'link[rel="serviceworkprefetch"]'
                        )
                    ).map((l) => l.href);
                    serviceWorker.postMessage(files);
                };

                if (registration.active) {
                    sendMessage(registration.active);
                } else {
                    // Wait for the service worker to become active
                    registration.addEventListener('updatefound', () => {
                        const newWorker =
                            registration.installing || registration.waiting;
                        if (newWorker) {
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'activated') {
                                    sendMessage(newWorker);
                                }
                            });
                        }
                    });
                }
            });

        // Listen for device pre-install events, these fire if MPW is capable of being installed on the device
        window.addEventListener('beforeinstallprompt', (event) => {
            // Prevent the mini-infobar from appearing on mobile.
            event.preventDefault();
        });

        // Listen for successful installs
        window.addEventListener('appinstalled', (_event) => {
            // Notify!
            return alertController.createAlert('success', ALERTS.APP_INSTALLED, 2500);
        });
    }
}
