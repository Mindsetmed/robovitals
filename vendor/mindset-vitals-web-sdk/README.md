# Vitals Web SDK

A JavaScript SDK for camera-based vital signs measurement.

## Overview

The Vitals Web SDK enables browser-based measurement of vitals from a standard webcam. Once authorized, the client library takes an HTML video element, processes frames, and returns vital measurements.

**Architecture:**
- **Client Library** (Browser) - Captures and processes video frames, returns vital measurements
- **Your Backend** (Server) - Handles authorization and submits results to Mindset REST API
- **Security** - All credentials and sensitive operations stay server-side

The SDK runs processing in a Web Worker to keep your UI responsive during measurement.

## Documentation

- **[Integration Guide](./integration_guide.md)** - Complete guide for integrating the SDK into your application (includes backend setup)
- **[Mindset REST APIs](./mindset_rest_apis.md)** - Backend REST API reference for patient management, authorization, and vitals submission
- **[Vanilla JS Example](./examples/vanilla-js/README.md)** - Reference implementation with patient creation, authorization, and vitals submission
- **[Architecture](./architecture.md)** - Technical architecture, data flow, and internal design

**Note:** This SDK requires both frontend (client library) and backend (server) components. The client library captures vitals, and your backend handles all Mindset REST API communication using your clinic API key. See the [Integration Guide](./integration_guide.md) and [Mindset REST APIs](./mindset_rest_apis.md) for complete setup.

The Vanilla JS example is the canonical integration path. Its backend endpoint names are used throughout the docs:

```
SDK client -> your backend endpoint -> Mindset REST API

/patient/create  -> POST /users/shadow
/auth            -> POST /users/{patientId}/notifications
/patient/vitals  -> PUT /users/{patientId}/pro_submissions/{proSubmissionId}
```

The `/auth` response from Mindset includes both a notification `id` and `meta.pro_submission_id`. Store `meta.pro_submission_id` on your backend and use it for the later `/pro_submissions/{proSubmissionId}` submission. Do not send the clinic API key, notification ID, or PRO submission ID to the browser.

## Features

- **Camera-based measurement** - No special hardware required
- **MediaPipe face detection** - High-accuracy facial landmark detection
- **WebAssembly powered** - High-performance vital signs algorithms
- **Encrypted authorization** - Secure WASM licensing with RSA encryption
- **Event-driven client library** - Simple callback-based event system
- **Multiple formats** - ESM, UMD, and bundled web worker
- **Framework agnostic** - Works with React, Vue, Angular, or vanilla JS

## Installation

```bash
npm install @mindset-vitals/web-sdk
```

Or include via script tag:

```html
<script src="./dist/index.umd.js"></script>
<script>
  const { createVitalClient } = window.VitalSDK;
  // Use createVitalClient as shown below
</script>
```

## Quick Start

```javascript
import { createVitalClient } from '@mindset-vitals/web-sdk';

// 1. Create authenticator callback
async function authenticator(runToken) {
  // Call your backend to authorize the WASM algorithm
  const response = await fetch('/api/auth', {
    method: 'POST',
    body: JSON.stringify({ runToken })
  });
  const data = await response.json();
  return data.vitalCoreAuth; // Return encrypted auth response
}

// 2. Initialize SDK
const vitalClient = createVitalClient({
  workerDirectory: '/dist',  // Path to worker.js and models
  authenticator              // Your auth callback
});

// 3. Set up event listeners
vitalClient.on('ready', () => {
  console.log('SDK ready');
});

vitalClient.on('authorizedVitals', (vitals) => {
  console.log('Authorized to measure:', vitals);
  // ['PR_MD', 'RR_MD', 'SPO2_MD', ...]
});

vitalClient.on('timeLeft', (data) => {
  console.log(`${data.timeLeft}s remaining (${Math.round(data.percentComplete * 100)}% complete)`);
});

vitalClient.on('signsMessage', (message) => {
  // Real-time warnings/guidance
  console.log('Status:', message.dataStatus);
});

vitalClient.on('stop', async (result) => {
  console.log('Measurement complete:', result);
  // SDK returns complete VITAL-TRAC data structure - ready to submit!
  // {
  //   vitals: { vitals: { PR_MD: {...}, RR_MD: {...} } },
  //   signsMsgs: { ... },
  //   finalVitalsMeasurementValues: { PR_MD: {...}, ... },
  //   prevVitals: [],
  //   prevSignsMsgs: [],
  //   noValidMeasurements: false,
  //   webAppVersion: '1.0.0',
  //   frameCollectionMethod: 'web-sdk',
  //   timestamp: ...
  // }

  // Submit to your backend
  await fetch('/api/vitals', {
    method: 'POST',
    body: JSON.stringify({ vitals: result })
  });
});

// 4. Initialize
await vitalClient.init();

// 5. Start preview mode (optional - shows camera without measuring)
await vitalClient.startPreviewMode(videoElement);

// 6. Authorize and start measurement
await vitalClient.authorize();
await vitalClient.start(['PR_MD', 'RR_MD'], videoElement);

// 7. Stop measurement (or it stops automatically)
const results = await vitalClient.stop();
```

**Your backend submits to Mindset REST API:**
```javascript
// Server-side - submit vitals using clinic API key
app.post('/api/vitals', async (req, res) => {
  const { patientId, vitals } = req.body;

  // Stored during authorization from notificationData.meta.pro_submission_id
  const proSubmissionId = proSubmissionStore.get(patientId);

  // SDK provides complete VITAL-TRAC structure - just pass it through!
  await fetch(`${MINDSET_API_URL}/users/${patientId}/pro_submissions/${proSubmissionId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${MINDSET_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      pro_type: 'VITAL-TRAC',
      pro_data: {
        data: vitals, // SDK provides everything ready for submission
        recorded_at: new Date().toISOString()
      }
    })
  });

  res.json({ success: true });
});
```

## Client Library Reference

### `createVitalClient(config)`

Creates a new Vital Client instance.

**Configuration:**
```javascript
{
  workerDirectory: '/dist',     // Path to worker.js and static assets
  authenticator: Function       // Callback: (runToken) => authResponse
}
```

**Returns:** VitalClient instance

### VitalClient Methods

#### `init()`
Initializes the SDK and loads the web worker.

```javascript
await vitalClient.init();
```

#### `authorize()`
Authorizes the WASM algorithm. Calls your authenticator callback with the runToken.

```javascript
await vitalClient.authorize();
```

**Note:** Authorization is required before starting measurements.

#### `start(selectedVitals, videoElement)`
Starts a measurement session.

```javascript
await vitalClient.start(['PR_MD', 'RR_MD'], videoElement);
```

**Parameters:**
- `selectedVitals`: Array of vital tags to measure (e.g., `['PR_MD', 'RR_MD', 'SPO2_MD', 'BP_MD']`)
- `videoElement`: HTML video element for camera feed

#### `stop()`
Stops the current measurement and returns results.

```javascript
const result = await vitalClient.stop();
// { vitals: { PR_MD: {...}, RR_MD: {...} }, timestamp: 1234567890 }
```

#### `startPreviewMode(videoElement)`
Starts preview mode (camera active, no measurement).

```javascript
await vitalClient.startPreviewMode(videoElement);
```

#### `stopPreviewMode()`
Stops preview mode.

```javascript
await vitalClient.stopPreviewMode();
```

#### `setExtendedLogs(enabled)`
Enables or disables extended logging for debugging.

```javascript
await vitalClient.setExtendedLogs(true);
```

#### `getVersion()`
Returns the SDK version string.

```javascript
const version = await vitalClient.getVersion();
```

#### `destroy()`
Cleans up and terminates the worker.

```javascript
vitalClient.destroy();
```

### Events

The SDK uses an event-driven architecture. Subscribe using `on()`, unsubscribe with `off()`.

#### `ready`
Fired when SDK initialization is complete.

```javascript
vitalClient.on('ready', () => {
  console.log('SDK ready');
});
```

#### `authorizedVitals`
Fired after successful authorization with the list of authorized vitals.

```javascript
vitalClient.on('authorizedVitals', (vitals) => {
  console.log('Can measure:', vitals);
  // ['PR_MD', 'RR_MD', ...]
});
```

#### `maxSessionTime`
Fired after authorization with maximum session duration (seconds).

```javascript
vitalClient.on('maxSessionTime', (duration) => {
  console.log('Max session:', duration, 'seconds');
});
```

#### `start`
Fired when measurement starts.

```javascript
vitalClient.on('start', ({ selectedVitals }) => {
  console.log('Measuring:', selectedVitals);
});
```

#### `stop`
Fired when measurement completes. SDK provides complete VITAL-TRAC data structure ready for submission.

```javascript
vitalClient.on('stop', (result) => {
  console.log('Results:', result);
  // Complete VITAL-TRAC structure - ready to submit!
  // {
  //   vitals: { vitals: { PR_MD: {...}, RR_MD: {...}, ... } },
  //   signsMsgs: { timestamp1: {...}, ... },
  //   finalVitalsMeasurementValues: { PR_MD: {...}, ... },
  //   prevVitals: [],
  //   prevSignsMsgs: [],
  //   noValidMeasurements: false,
  //   webAppVersion: '1.0.0',
  //   frameCollectionMethod: 'web-sdk',
  //   timestamp: 1234567890
  // }
});
```

#### `timeLeft`
Fired every second during measurement with progress information.

```javascript
vitalClient.on('timeLeft', (data) => {
  console.log(`${data.timeLeft}s remaining`);
  updateProgressBar(data.percentComplete); // 0 to 1
  // data = { timeLeft, maxTime, percentComplete, percentRemaining }
});
```

#### `signsMessage`
Fired during measurement with real-time quality/guidance messages.

```javascript
vitalClient.on('signsMessage', (message) => {
  // message.dataStatus contains warning/error codes and messages
  message.dataStatus.forEach((dataStatusObj) => {
    if (dataStatusObj.severity === 'warning') {
      console.log(`Code ${dataStatusObj.code}: ${dataStatusObj.message}`);
    }
  });
});
```

**Common Status Codes:**
- `E-FDM-041` - Face not detected
- `E-FDM-042` - Face not centered
- `E-DQM-021` - Too much movement
- `E-DQM-022` - Poor lighting
- `W-RES-073` - Face not centered
- `W-RES-076` - Face not centered
- `W-RES-078` - Face not centered
- `W-RES-079` - Face too far from camera
- `W-RES-080` - Face too close to camera
- `S-HRT-061` - Pulse rate ready
- `S-RES-070` - Respiratory rate ready
- `S-BPR-090` - Blood pressure ready
- `S-SPO-100` - Oxygen saturation ready

#### `previewModeStart` / `previewModeStop`
Fired when preview mode starts/stops.

#### `guideCoordinates`
Fired when face guide coordinates are calculated (during preview or measurement start).

```javascript
vitalClient.on('guideCoordinates', (coords) => {
  console.log('Guide area:', coords);
  // coords = { x, y, width, height }
});
```

#### `error`
Fired on SDK errors.

```javascript
vitalClient.on('error', (error) => {
  console.error('SDK error:', error);
});
```

#### `log`
Fired for debug/diagnostic messages from the worker.

```javascript
vitalClient.on('log', (message) => {
  console.log('Worker log:', message);
});
```

## Authenticator Pattern

The SDK requires an authenticator callback that handles WASM authorization. This keeps the SDK protocol-agnostic and lets you control authorization logic.

### Backend Integration

Your backend should:

1. Accept the `runToken` from the SDK
2. Call the Mindset REST API to authorize the WASM
3. Return the encrypted auth response

**Example Backend (Express):**

```javascript
app.post('/auth', async (req, res) => {
  const { runToken } = req.body;

  // Call Mindset REST API
  const response = await fetch(`${MINDSET_API_URL}/users/${patientId}/notifications`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${API_KEY}` },
    body: JSON.stringify({
      clinic_id: CLINIC_ID,
      notification_type: 'VITAL-TRAC',
      pre_auth: true,
      trigger_text: false,
      vitals_run_token: runToken  // Pass runToken to REST API
    })
  });

  const data = await response.json();

  res.json({
    success: true,
    vitalCoreAuth: data.vitals_auth  // Return encrypted tokens
  });
});
```

**Frontend Authenticator:**

```javascript
async function authenticator(runToken) {
  const response = await fetch('/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ runToken })
  });

  const data = await response.json();
  return data.vitalCoreAuth;
}
```

## Vital Signs Results

The SDK automatically formats results in complete VITAL-TRAC structure - ready to submit!

```javascript
{
  vitals: {
    vitals: {  // Double-nested structure for VITAL-TRAC compatibility
      PR_MD: { hr: 72, confidence: 0.95, ... },
      PR_GW: { hr: 71, confidence: 0.92, ... },
      RR_MD: { rr: 16, confidence: 0.88, ... },
      RR_GW: { rr: 15, confidence: 0.85, ... },
      SPO2_MD: { spO2: 98, confidence: 0.90, ... },
      SPO2_GW: { spO2: 97, confidence: 0.87, ... },
      BP_MD: { BP_SYS: 120, BP_DIA: 80, ... },
      BP_GW: { BP_SYS: 118, BP_DIA: 78, ... }
    }
  },
  signsMsgs: {  // Automatically collected during measurement
    1234567890123: { dataStatus: ['W-RES-073'], ... },
    1234567891456: { dataStatus: ['S-HRT-061'], ... }
  },
  finalVitalsMeasurementValues: {  // Same as vitals.vitals - required for score display
    PR_MD: { hr: 72, confidence: 0.95, ... },
    RR_MD: { rr: 16, confidence: 0.88, ... },
    // ...
  },
  prevVitals: [],           // For multi-session support
  prevSignsMsgs: [],        // For multi-session support
  noValidMeasurements: false,
  webAppVersion: '1.0.0',
  frameCollectionMethod: 'web-sdk',
  timestamp: 1234567890
}
```

**Vital Tags:**
- `PR_MD` / `PR_GW` - Pulse Rate (pulse rate)
- `RR_MD` / `RR_GW` - Respiratory Rate
- `SPO2_MD` / `SPO2_GW` - Blood Oxygen Saturation
- `BP_MD` / `BP_GW` - Blood Pressure
- `HRV_MD` / `HRV_GW` - Pulse Rate Variability

Suffix meaning:
- `_MD` - Medical-grade algorithm
- `_GW` - General wellness algorithm

## File Structure

```
dist/
├── index.js              # ESM bundle
├── index.umd.js          # UMD bundle (browser global)
├── worker.js             # Web worker bundle
├── @mediapipe/       # MediaPipe WASM files
│   └── tasks-vision/
│       └── wasm/
├── webvital.js       # Vital signs WASM
├── webvital.wasm     # Vital signs WASM binary
├── *.tflite          # TensorFlow Lite models
└── ...
```

## Browser Support

- **Chrome 114+** (recommended)
- **Safari 16+** (iOS 18+ / iPadOS 17+ / macOS Ventura or later)
- **Edge 123+**
- **Samsung Internet 27+**

**Requirements:**
- ES Modules support
- Web Workers
- WebAssembly
- getUserMedia() API (camera access)
- OffscreenCanvas (for optimal performance)

## Examples

See `/examples/vanilla-js/` for a complete working example with:
- Patient management
- Camera handling
- Real-time measurement
- Results display
- Server integration

For a complete integration guide, see [integration_guide.md](./integration_guide.md).

## Development

```bash
# Install dependencies
npm install

# Build SDK
npm run build

# Run tests
npm test

# Lint code
npm run lint

# Run example
npm run build:start:example
```

## License

UNLICENSED - Private/Internal Use

## Additional Resources

- **[Integration Guide](./integration_guide.md)** - Step-by-step integration instructions
- **[Mindset REST APIs](./mindset_rest_apis.md)** - Complete backend REST API reference
- **[Architecture Documentation](./architecture.md)** - Internal architecture and design
- **[Examples](./examples/)** - Working code examples

## Support

For issues and questions, contact the Mindset Medical development team.
