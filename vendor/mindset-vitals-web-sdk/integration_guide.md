# @mindset-vitals/web-sdk Integration Guide

The Vitals Web SDK is made up of two major components - the worker file that runs in a Web Worker, and the Vital Client library that is used by your app to initialize the worker, and send commands and receive messages from the worker.

## Overview

The integration requires both frontend (client library) and backend (server) components:

**Client Library (Browser):**
- Displays video feed and guides user
- Captures vitals using WASM algorithm
- Sends vitals to your backend

**Server (Your Backend):**
- Creates patients via Mindset REST API
- Authorizes WASM and creates notifications
- Submits vitals to Mindset REST API using clinic API key

**Security:** All sensitive operations happen server-side. Client library never sees API keys, auth tokens, notification IDs, or PRO submission IDs.

The `examples/vanilla-js` app is the reference implementation for this flow. The docs use its backend endpoint names:

```
SDK client -> your backend endpoint -> Mindset REST API

/patient/create  -> POST /users/shadow
/auth            -> POST /users/{patientId}/notifications
/patient/vitals  -> PUT /users/{patientId}/pro_submissions/{proSubmissionId}
```

When your backend calls `POST /users/{patientId}/notifications`, Mindset returns both a notification `id` and `meta.pro_submission_id`. Store `meta.pro_submission_id` server-side and use that numeric value for the later `/pro_submissions/{proSubmissionId}` request. The notification `id` is not the PRO submission ID.

## Steps to integrate and use SDK
The worker file and its dependencies need to be moved to a directory that will be available to your web application.

If you are integrating the SDK through a zip file distribution and using the SDK's ES module, copy dist/index.js into your source code. This is where `createVitalClient` will be imported from. If you are integrating with the zip file distribution and using the UMD module, copy dist/index.umd.js into your public folder, and use the file's URL as the value for a script tag's src attribute. Copy the worker file and its dependencies into your public folder (these are all the files in the dist folder other than index.js, index.js.map, index.umd.js, and index.umd.js.map).

If you are integrating the SDK through an NPM module, follow these steps to move the necessary files to a public directory available to your web application:
* Run the command `npx mindset-vitals-web-sdk-copy-worker-files <public-directory>` to move the worker files to `<public-directory>`. If `<public-directory>` is not given, a folder named “public” in the root directory of the project will be used, and if the “public” folder does not exist, it will be created.
* If using a UMD module, the `npx mindset-vitals-web-sdk-copy-vital-client-umd <public-directory>` command will move the UMD bundle to `<public-directory>`. If `<public-directory>` is not given, a folder named “public” in the root directory the project will be used, and if the “public” folder does not exist, it will be created.

Import SDK into project:

**ES Module (recommended):**
```javascript
import { createVitalClient } from '@mindset-vitals/web-sdk';
```

**Script tag:**
```html
<script src="./dist/index.umd.js"></script>
<script>
  const { createVitalClient } = window.VitalSDK;
</script>
```

Start using the SDK:

* Calling `createVitalClient(config)` returns a `vitalClient` object. The `config` object requires:
    * `workerDirectory` - path to worker files (typically `/dist`)
    * `authenticator` - callback function that receives a `runToken` and returns WASM authorization

**Example authenticator (calls your backend):**
```javascript
async function authenticator(runToken) {
  // Call YOUR backend - it handles Mindset REST API communication
  const response = await fetch('/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      patientId: currentPatientId,
      runToken
    })
  });
  const data = await response.json();
  return data.vitalCoreAuth;
}
```

**Your backend creates an authorization:**

For complete REST API documentation, see **[Mindset REST APIs](./mindset_rest_apis.md)**.

```javascript
// Server-side code (Node.js/Express example)
app.post('/auth', async (req, res) => {
  const { patientId, runToken } = req.body;

  // Create notification with runToken
  const response = await fetch(`${MINDSET_API_URL}/users/${patientId}/notifications`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${MINDSET_API_KEY}`
    },
    body: JSON.stringify({
      clinic_id: CLINIC_ID,
      notification_type: 'VITAL-TRAC',
      trigger_text: false,
      pre_auth: true,
      vitals_run_token: runToken
    })
  });

  const data = await response.json();

  // Store PRO submission ID for later vitals submission.
  // Use meta.pro_submission_id, not the notification id.
  proSubmissionStore.set(patientId, data.meta.pro_submission_id);

  // Return WASM auth to client
  res.json({
    success: true,
    vitalCoreAuth: data.vitals_auth
  });
});
```

See `examples/vanilla-js` for complete end-to-end example including vitals submission.
* Add event listeners to `vitalClient` by calling `vitalClient.on()` with the first argument being the event type as a string, and the second argument a callback that is invoked when the event occurs. Depending on the event, the callback will receive an argument that contains data related to the event.
    * `ready` event lets the app know that the worker has been initialized, and a measurement session or preview mode can be started
    * `timeLeft` event fires during a measurement session every second with progress data (object containing timeLeft, maxTime, percentComplete, percentRemaining)
    * `stop` event fires when a measurement session ends. The event listener callback is passed the final results for the measurement session
* Call `vitalClient.init()` to initialize the SDK (no parameters required - face guide coordinates are automatically calculated from the video element)

When the worker is ready and the `ready` event has been emitted, a measurement session or preview mode can be started:

* To start preview mode, call `vitalClient.startPreviewMode(videoEl)` with a reference to the video element as an argument
* To start a measurement session, call `vitalClient.start(vitalsToMeasure, videoEl)` with the first argument being an array of strings specifying which vitals are to be measured, and the second argument being a reference to the video element. If the worker is currently operating in preview mode, preview mode will automatically be stopped before starting the measurement session.
    * The array of strings specifying which vitals are to be measued can contain the following values: `PR_MD`, `PR_GW`, `RR_MD`, `RR_GW`, `SPO2_MD`, `SPO2_GW`, `BP_MD`, `BP_GW`, `HRV_MD`, `HRV_GW`. Only vitals that are authorized to be measured will be measured.
* When a measurement session is finished, the `stop` event fires with results:

```javascript
vitalClient.on('stop', async (result) => {
  // SDK returns complete VITAL-TRAC structure - ready to submit!
  const { finalVitalsMeasurementValues, signsMsgs, timestamp } = result;

  // Heart rate
  const hr = finalVitalsMeasurementValues.PR_MD?.hr || finalVitalsMeasurementValues.PR_GW?.hr;

  // Respiratory rate
  const rr = finalVitalsMeasurementValues.RR_MD?.rr || finalVitalsMeasurementValues.RR_GW?.rr;

  // Blood oxygen saturation
  const spO2 = finalVitalsMeasurementValues.SPO2_GW?.spO2;

  // Blood pressure
  const bp = finalVitalsMeasurementValues.BP_GW;
  if (bp) {
    console.log(`BP: ${bp.BP_SYS}/${bp.BP_DIA}`);
  }

  // Submit to your backend (send entire result - SDK provides everything!)
  await fetch('/patient/vitals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      patientId: currentPatientId,
      vitals: result  // SDK provides complete VITAL-TRAC structure
    })
  });

  // All vitals follow pattern: finalVitalsMeasurementValues.{TAG}.{property}
  // Tags: PR_MD, PR_GW, RR_MD, RR_GW, SPO2_MD, SPO2_GW, BP_MD, BP_GW, HRV_MD, HRV_GW
});
```

**Your backend submits to Mindset REST API:**

For complete REST API documentation including patient management, see **[Mindset REST APIs](./mindset_rest_apis.md)**.

```javascript
// Server-side code - submit vitals using clinic API key
app.post('/patient/vitals', async (req, res) => {
  const { patientId, vitals } = req.body;

  // Lookup PRO submission ID stored during authorization
  const proSubmissionId = proSubmissionStore.get(patientId);

  // SDK provides complete VITAL-TRAC structure - just pass it through!
  const response = await fetch(
    `${MINDSET_API_URL}/users/${patientId}/pro_submissions/${proSubmissionId}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MINDSET_API_KEY}` // Use clinic API key
      },
      body: JSON.stringify({
        pro_type: 'VITAL-TRAC',
        pro_data: {
          data: vitals, // SDK provides everything ready for submission
          recorded_at: new Date().toISOString()
        }
      })
    }
  );

  const data = await response.json();
  res.json({ success: true, data });
});
```

**Note:** The clinic API key must have `PROVIDER_SERVICE` scope to submit PRO data on behalf of patients.

## Key Methods

**Core lifecycle:**
- `init()` - Initialize SDK
- `authorize()` - Authorize WASM (calls your authenticator callback)
- `start(selectedVitals, videoEl)` - Start measurement
- `stop()` - Stop measurement
- `destroy()` - Cleanup

**Preview mode:**
- `startPreviewMode(videoEl)` - Show camera without measuring
- `stopPreviewMode()` - Stop preview

**Utilities:**
- `getVersion()` - Get SDK version
- `setExtendedLogs(enabled)` - Enable debug logging

For complete client library documentation, see [README.md](./README.md).

## Key Events

**Lifecycle:**
- `ready` - SDK initialized
- `authorizedVitals` - List of authorized vitals after authorization
- `maxSessionTime` - Max duration for session
- `start` - Measurement started
- `stop` - Measurement complete (includes results)

**Progress:**
- `timeLeft` - Progress updates every second

**Quality feedback:**
- `signsMessage` - Real-time guidance (face position, lighting, movement)

**Errors:**
- `error` - SDK errors

For complete event documentation, see [README.md](./README.md).

## Script commands to move worker, worker dependencies, and UMD module to a public directory
* `npx mindset-vitals-web-sdk-copy-worker-files <public-directory>`
    * Moves the worker and worker dependency files to `<public-directory>`. If `<public-directory>` is not given, a folder named “public” in the root directory of the project will be used, and if the “public” folder does not exist, it will be created.
* `npx mindset-vitals-web-sdk-copy-vital-client-umd <public-directory>`
    * Moves the UMD module to `<public-directory>`. If `<public-directory>` is not given, a folder named “public” in the root directory the project will be used, and if the “public” folder does not exist, it will be created
