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

            // Stash the event so it can be triggered later.
            window.deferredInstallPrompt = event;

            // Remove the 'hidden' class from the install button container.
            doms.domInstall.style.display = '';
        });

        // Listen for installer clicks
        doms.domInstall.addEventListener('click', async () => {
            const promptEvent = window.deferredInstallPrompt;
            if (!promptEvent) {
                // The deferred install prompt isn't available.
                return;
            }

            // Show the install prompt.
            promptEvent.prompt();

            // Log the result
            const result = await promptEvent.userChoice;
            console.log(result);

            // Reset the deferred prompt variable, since
            // prompt() can only be called once.
            window.deferredInstallPrompt = null;

            // Hide the install button.
            doms.domInstall.style.display = 'none';
        });

        // Listen for successful installs
        window.addEventListener('appinstalled', (_event) => {
            // Clear the deferredPrompt so it can be garbage collected.
            window.deferredInstallPrompt = null;

            // Notify!
            return createAlert('success', 'App Installed!', 2500);
        });
    }
}
