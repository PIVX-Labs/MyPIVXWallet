// Listen for native worker installs
self.addEventListener('install', function (_event) {
    console.log('[ServiceWorker] Install');

    // Activate the newly installed worker
    self.skipWaiting();
});

// Listen for native worker activation
self.addEventListener('activate', (_event) => {
    console.log('[ServiceWorker] Activated');

    // Tell the active service worker to take control of the page immediately.
    self.clients.claim();
});
