export const MINDSET_VITALS_WORKER_DIRECTORY = '/assets/mindset-vitals/dist';

// Cache-bust key for the SDK assets. Bumped to refetch the new client bundle.
export const MINDSET_VITALS_SDK_ASSET_VERSION = '2.6.0-3';

const BASE = MINDSET_VITALS_WORKER_DIRECTORY;

export const MINDSET_VITALS_PRELOAD_URLS = [
  `${BASE}/worker.js`,
  `${BASE}/webvital.js`,
  `${BASE}/webvital.wasm`,
  `${BASE}/webvital.data`,
  `${BASE}/selfie_multiclass_256x256.tflite`,
  `${BASE}/blaze_face_short_range.tflite`,
  `${BASE}/@mediapipe/tasks-vision/tasks-vision@0.10.21.js`,
  `${BASE}/@mediapipe/tasks-vision/wasm/vision_wasm_internal.js`,
  `${BASE}/@mediapipe/tasks-vision/wasm/vision_wasm_internal.wasm`,
] as const;
