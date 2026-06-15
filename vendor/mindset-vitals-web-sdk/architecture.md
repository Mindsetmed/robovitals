# Vitals Web SDK Architecture

This document describes the internal architecture of the Vitals Web SDK, how components communicate, and how video frames flow through the system for vital signs measurement.

**Related Documentation:**
- [README](./README.md) - SDK features and client library reference
- [Integration Guide](./integration_guide.md) - Step-by-step integration
- [Mindset REST APIs](./mindset_rest_apis.md) - Backend REST API reference for patient management, authorization, and vitals submission

## Overview

The Vitals Web SDK is a browser-based vital signs measurement system that uses facial photoplethysmography (PPG) to measure pulse rate, respiratory rate, oxygen saturation, and blood pressure through a standard webcam.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         User Application                            │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  import { createVitalClient } from '@mindset-vitals/web-sdk'  │  │
│  └───────────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌───────────────────────────────────────────────────────────────────────┐
│                      Main Thread (Browser)                            │
│                                                                       │
│  ┌──────────────────┐        ┌──────────────────┐                     │
│  │  VitalClient     │◄──────►│  WorkerManager   │                     │
│  │  (Coordinator)   │        │  (RPC Manager)   │                     │
│  └────────┬─────────┘        └────────┬─────────┘                     │
│           │                           │                               │
│           │                           │ postMessage (rawr RPC)        │
│  ┌────────▼─────────┐                 │                               │
│  │  StatusManager   │                 │                               │
│  │  (State)         │                 │                               │
│  └──────────────────┘                 │                               │
│                                       │                               │
│  ┌────────────────────────────────────┼───────────────────────────┐   │
│  │  <video> Element                   │                           │   │
│  │  ┌──────────────────────────────┐  │                           │   │
│  │  │  requestVideoFrameCallback() │  │                           │   │
│  │  │         ▼                    │  │                           │   │
│  │  │  createImageBitmap()         │  │                           │   │
│  │  └──────────────────────────────┘  │                           │   │
│  └────────────────────────────────────┼───────────────────────────┘   │
└───────────────────────────────────────┼───────────────────────────────┘
                                        │
                                        │ ImageBitmap (transferable)
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Web Worker Thread                              │
│                                                                     │
│  ┌──────────────────┐        ┌──────────────────┐                   │
│  │  Worker.js       │◄──────►│  Rawr RPC Peer   │                   │
│  │  (Orchestrator)  │        │  (Bidirectional) │                   │
│  └────────┬─────────┘        └──────────────────┘                   │
│           │                                                         │
│           ├─────────► MediaPipe Face Detection                      │
│           │           (WASM + TensorFlow Lite)                      │
│           │                                                         │
│           ├─────────► Image Segmentation                            │
│           │           (Skin detection)                              │
│           │                                                         │
│           └─────────► Vital Core Algorithm (WASM)                   │
│                       • Pulse Rate (PR_MD/PR_GW)                    │
│                       • Respiratory Rate (RR_MD/RR_GW)              │
│                       • Oxygen Saturation (SPO2_MD/SPO2_GW)         │
│                       • Blood Pressure (BP_MD/BP_GW)                │
│                                                                     │
│  Emits: 'signs' messages                                            │
└─────────────────────────────────────────────────────────────────────┘
                                         │
                                         │ postMessage (results)
                                         │
                                         ▼
                         ┌───────────────────────────┐
                         │  User Event Handlers      │
                         │  • on('signsMessage')     │
                         │  • on('stop')             │
                         │  • on('timeLeft')         │
                         └───────────────────────────┘
```

## How It Works

### VitalClient - Your Main Interface

This is what you interact with. It provides methods like:
- `init()` - Initialize the Web SDK
- `authorize()` - Authorize with your backend
- `start()` - Begin measurement
- `stop()` - End measurement

It also emits events you listen to:
- `'ready'` - Web SDK is initialized
- `'signsMessage'` - Real-time status updates
- `'stop'` - Measurement complete with results

### Behind the Scenes

The Web SDK runs heavy processing in a Web Worker to keep your UI responsive:

1. **Video frames** are captured from your `<video>` element
2. **Worker** processes each frame for face detection and vital signs
3. **Events** are emitted back to your application with status and results

That's it - you don't need to manage the worker or understand the internals.

## Measurement Flow

```
1. Initialize
   ├─► await vitalClient.init()
   └─► Listen for 'ready' event

2. Authorize
   ├─► await vitalClient.authorize()
   ├─► Your backend → Mindset API
   └─► Listen for 'authorizedVitals' event

3. Start Measurement
   ├─► await vitalClient.start(['PR_MD', 'RR_MD'], videoElement)
   ├─► Web SDK captures video frames automatically
   ├─► Listen for 'signsMessage' events (real-time status)
   └─► Listen for 'timeLeft' events (countdown)

4. Complete
   ├─► Measurement stops automatically when done
   ├─► OR call await vitalClient.stop() manually
   └─► Receive results via 'stop' event
```

### Automatic Session End

The Web SDK automatically stops measurement when:
- All selected vitals have been successfully measured
- Maximum session time is reached
- You manually call `stop()`

Status codes in `signsMessage` events indicate when each vital is ready:
- `S-HRT-061` - Pulse rate ready
- `S-RES-070` - Respiratory rate ready
- `S-BPR-090` - Blood pressure ready
- `S-SPO-100` - Oxygen saturation ready

## Distribution Structure

```
dist/
├── index.js                    # ESM bundle
├── index.umd.js                # UMD bundle (browser global)
├── worker.js                   # Web Worker bundle
├── webvital.wasm           # Vital Core algorithm
├── webvital.js             # WASM glue code
├── webvital.data           # WASM data file
├── blaze_face_short_range.tflite
├── selfie_multiclass_256x256.tflite
└── @mediapipe/
   └── tasks-vision/
      └── wasm/
            ├── vision_wasm_internal.wasm
            └── vision_wasm_internal.js
```

## Performance

The Web SDK uses a Web Worker to run all heavy computation (face detection, vital signs processing) off the main thread. This keeps your UI responsive even during intensive processing.

Benefits:
- No frame drops in your video feed
- UI remains interactive
- Efficient memory usage

## Authentication

The Web SDK uses a callback pattern for authorization, giving you full control over how you communicate with your backend:

```javascript
async function authenticator(runToken) {
  // Call YOUR backend
  const response = await fetch('/api/authorize', {
    method: 'POST',
    body: JSON.stringify({ runToken })
  });

  const data = await response.json();
  return data.vitalCoreAuth; // Return encrypted auth from Mindset REST API
}
```

Your backend calls the Mindset REST API with the `runToken`, receives an encrypted authorization response, and returns it to the client library.

## Error Handling

### Initialization Errors
- Worker fails to load → `error` event
- Models fail to load → logged to console
- Timeout on ready signal → Promise rejection

### Runtime Errors
- Face not detected → Status code in `signsMessage`
- Poor lighting → Status code in `signsMessage`
- Authorization failed → Promise rejection
- Worker crash → `error` event

### Recovery Strategies
- User can retry authorization
- Face detection errors are transient (wait for better positioning)
- Worker can be destroyed and recreated via `destroy()` + `init()`

## Browser Compatibility & System Requirements

### Supported Browsers

| Browser | Minimum Version |
|---------|----------------|
| Chrome | 114+ (recommended) |
| Safari | 16+ (iOS 18+ / iPadOS 17+ / macOS Ventura or later) |
| Edge | 123+ |
| Samsung Internet | 27+ |

**Note:** Firefox is not supported.

### System Requirements

**Minimum RAM:** 6 GB

### Required Browser Features
- ES Modules (import/export)
- Web Workers
- WebAssembly
- getUserMedia() API
- requestVideoFrameCallback() API
- createImageBitmap() API
- OffscreenCanvas (optimal, fallback available)

## Security Considerations

### WASM Authorization
- Run token generated in WASM (not tamperable)
- Backend validates with Mindset API
- Encrypted auth response
- WASM validates auth before processing

### CSP (Content Security Policy)
If your application uses a Content Security Policy, you may need to allow:
- Web Workers (`worker-src` or `script-src`)
- WebAssembly execution (`script-src 'wasm-unsafe-eval'` in some browsers)
- Network requests to your backend (`connect-src`)

### Data Privacy
- All processing happens locally (client-side)
- No video data sent to servers
- Only measurement results can be transmitted
- User controls data sharing

## Data Collection & Privacy

### Information Collected

The Web SDK collects device and system information for diagnostics (device memory, CPU, browser type, WebAssembly capabilities), processes video frames locally for vital signs measurement, and generates measurement results.

### What Gets Transmitted

- Vital signs results (pulse rate, respiratory rate, blood pressure, SpO2)
- Data quality metrics and status codes
- Session metadata (timestamps, device info)

### What Stays Local

- Raw video frames (never uploaded)
- Face detection data
- Segmentation masks
- All video processing happens in the browser

### Privacy & Security

- Camera access requires explicit user permission
- All processing runs locally via WebAssembly
- Video data is never stored or transmitted
- Results transmitted via HTTPS encryption
- Integrators must obtain user consent and implement appropriate security controls

---

*For integration instructions, see [integration_guide.md](./integration_guide.md)*
*For API reference, see [README.md](./README.md)*
