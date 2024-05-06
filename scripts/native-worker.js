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
self.addEventListener('message', (event) => {
    if (event.data) populatePrefetchCache(event.data);
});

async function populatePrefetchCache(files) {
    const cache = await caches.open('sapling-params-v1');
    for (const file of files) {
        const res = await fetch(file, {
            priority: 'low',
        });
        if (res.ok) await cache.put(file, res);
    }
}

self.addEventListener('fetch', (event) => {
    // Let the browser do its default thing
    // for non-GET requests.
    if (event.request.method !== 'GET') return;

    const cacheRegexps = [
        /sapling-(spend|output)\.params/,
        /.wasm$/,
        /(pivx-shield|util)/,
    ];

    if (!cacheRegexps.some((r) => r.test(event.request.url))) {
        return;
    }

    event.respondWith(
        (async () => {
            // Try to get the response from a cache.
            const cache = await caches.open('sapling-params-v1');
            const cachedResponse = await cache.match(event.request.url);

            if (cachedResponse && cachedResponse.ok) {
                return cachedResponse;
            }
            // If we didn't find a match in the cache, use the network.
            const response = await fetch(event.request);
            await cache.put(event.request.url, response.clone());
            return response;
        })()
    );
});
