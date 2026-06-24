const ASSET_VERSION = '2.6.0-2';
const CACHE_NAME = `mindset-vitals-assets-${ASSET_VERSION}`;
const ASSET_PREFIX = '/assets/mindset-vitals/';

const PRECACHE_PATHS = [
  '/assets/mindset-vitals/dist/worker.js',
  '/assets/mindset-vitals/dist/webvital.js',
  '/assets/mindset-vitals/dist/webvital.wasm',
  '/assets/mindset-vitals/dist/webvital.data',
  '/assets/mindset-vitals/dist/selfie_multiclass_256x256.tflite',
  '/assets/mindset-vitals/dist/blaze_face_short_range.tflite',
  '/assets/mindset-vitals/dist/@mediapipe/tasks-vision/tasks-vision@0.10.21.js',
  '/assets/mindset-vitals/dist/@mediapipe/tasks-vision/wasm/vision_wasm_internal.js',
  '/assets/mindset-vitals/dist/@mediapipe/tasks-vision/wasm/vision_wasm_internal.wasm',
];

const PRECACHE_URLS = PRECACHE_PATHS.map((path) => `${path}?v=${ASSET_VERSION}`);

async function precacheAssets(cache) {
  await Promise.all(
    PRECACHE_URLS.map(async (url) => {
      try {
        const response = await fetch(url, { credentials: 'same-origin' });
        if (response.ok) {
          await cache.put(url, response);
        }
      } catch {
      }
    }),
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await precacheAssets(cache);
      await self.skipWaiting();
    }),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);
  if (!url.pathname.startsWith(ASSET_PREFIX)) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) {
        return cached;
      }

      const response = await fetch(request);
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    }),
  );
});
