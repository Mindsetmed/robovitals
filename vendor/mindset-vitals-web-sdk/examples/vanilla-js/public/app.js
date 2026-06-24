/**
 * Vitals Web SDK - Vanilla JS Example
 */

import { createVitalClient } from '/dist/index.js';

// DOM Elements
const statusEl = document.getElementById('status');
const statusText = statusEl.querySelector('.status-text');
const versionEl = document.getElementById('version');
const patientIdInput = document.getElementById('patient-id');
const videoEl = document.getElementById('video');
const resultsEl = document.getElementById('results');
const progressSection = document.getElementById('progress-section');
const progressFill = document.getElementById('progress-fill');
const timeRemaining = document.getElementById('time-remaining');
const warningsDisplay = document.getElementById('warnings-display');
const measurementControls = document.getElementById('measurement-controls');
const noPatientSelectedWarning = document.getElementById('no-patient-selected-warning');

// Buttons
const createPatientBtn = document.getElementById('create-patient');
const clearPatientBtn = document.getElementById('clear-patient');
const startMeasurementBtn = document.getElementById('start-measurement');
const stopMeasurementBtn = document.getElementById('stop-measurement');

// State
let vitalClient = null;
let mediaStream = null;
let measuring = false;
let currentPatientId = null;
let maxSessionTime = 0;
let countdownSetIntervalId = null;
let startMeasurementBtnDisabled = true;
let authorizedVitals = new Set();
let currentWarnings = [];
// The first session's PRO is created by authorize() -> /auth. authorize() is
// cached after that (vital-core auth is once per page), so every LATER session
// must mint its own PRO or it would overwrite the previous one's results.
let hasMeasuredOnce = false;

/**
 * Update warnings display
 */
function updateWarningsDisplay() {
  const warningMessagesSet = new Set();
  currentWarnings.forEach(warning => {
    warningMessagesSet.add(warning);
  });
  const warningsText = Array.from(warningMessagesSet).join('\n');
  warningsDisplay.textContent = warningsText;
}

/**
 * Add warning code to warning codes array
 */
function addWarningMessage(warningMessage) {
  currentWarnings.push(warningMessage);

  if (!startMeasurementBtnDisabled && !measuring) {
    startMeasurementBtn.disabled = true;
    startMeasurementBtnDisabled = true;
  }

  setTimeout(() => {
    removeWarningMessage(warningMessage);
  }, 3000);
}

/**
 * Remove warning code from warning codes array
 */
function removeWarningMessage(warningMessage) {
  currentWarnings = currentWarnings.filter(curWarning => curWarning !== warningMessage);

  if (currentWarnings.length === 0 && startMeasurementBtnDisabled && !measuring) {
    startMeasurementBtn.disabled = false;
    startMeasurementBtnDisabled = false;
  }

  updateWarningsDisplay();
}

/**
 * Process message from the Vital Core algorithm
 */
function processMessage(message) {
  let newWarnings = false;
  message.dataStatus.forEach((dataStatusMessage) => {
    if (dataStatusMessage.severity === 'warning' && !currentWarnings.includes(dataStatusMessage.message)) {
      newWarnings = true;
      addWarningMessage(dataStatusMessage.message);
    }
  });

  if (newWarnings) {
    updateWarningsDisplay();
  }
}

/**
 * Update status indicator
 */
function updateStatus(status, text) {
  statusEl.className = `status ${status}`;
  statusText.textContent = text;
}

/**
 * Load patient ID from session storage
 */
function loadPatientFromSession() {
  const savedPatientId = sessionStorage.getItem('patientId');
  if (savedPatientId) {
    currentPatientId = savedPatientId;
    patientIdInput.value = savedPatientId;
    createPatientBtn.style.display = 'none';
    clearPatientBtn.style.display = 'inline-block';
    addLog({ event: 'Patient loaded from session', patientId: savedPatientId }, 'info');
    measurementControls.style.display = 'flex';
  } else {
    noPatientSelectedWarning.style.display = 'block';
  }
}

/**
 * Create new patient
 */
async function createPatient() {
  try {
    addLog('Creating patient...', 'info');
    createPatientBtn.disabled = true;

    const response = await fetch('/patient/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        // Using defaults from server - can be customized
      })
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Failed to create patient');
    }

    currentPatientId = data.patientId;
    sessionStorage.setItem('patientId', data.patientId);
    patientIdInput.value = data.patientId;

    createPatientBtn.style.display = 'none';
    clearPatientBtn.style.display = 'inline-block';
    noPatientSelectedWarning.style.display = 'none';
    measurementControls.style.display = 'flex';

    addLog({ event: 'Patient created', patientId: data.patientId }, 'success');

  } catch (error) {
    addLog({ error: 'Failed to create patient: ' + error.message }, 'error');
    console.error('Create patient error:', error);
    createPatientBtn.disabled = false;
  }
}

/**
 * Clear current patient
 */
function clearPatient() {
  currentPatientId = null;
  sessionStorage.removeItem('patientId');
  patientIdInput.value = '';

  createPatientBtn.style.display = 'inline-block';
  clearPatientBtn.style.display = 'none';
  createPatientBtn.disabled = false;

  noPatientSelectedWarning.style.display = 'block';
  measurementControls.style.display = 'none';

  // New patient starts fresh: first session again uses authorize -> /auth for its
  // PRO, so reset the session flag and the button label.
  hasMeasuredOnce = false;
  startMeasurementBtn.textContent = 'Start Measurement';

  addLog('Patient cleared', 'info');
}


/**
 * Add log message (console only)
 */
function addLog(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] [${type}]`, message);
}

/**
 * Display results
 */
function displayResults(data) {
  resultsEl.innerHTML = `
    <div class="result-card">
      <h3>Measurement Results</h3>
      <div class="result-grid">
        ${authorizedVitals.has('PR_MD') ? `<div class="result-item"><label>Heart Rate (MD):</label><value>${data.PR_MD || '--'} bpm</value></div>` : ''}
        ${authorizedVitals.has('PR_GW') ? `<div class="result-item"><label>Heart Rate (GW):</label><value>${data.PR_GW || '--'} bpm</value></div>` : ''}
        ${authorizedVitals.has('RR_MD') ? `<div class="result-item"><label>Respiratory Rate (MD):</label><value>${data.RR_MD || '--'} rpm</value></div>` : ''}
        ${authorizedVitals.has('RR_GW') ? `<div class="result-item"><label>Respiratory Rate (GW):</label><value>${data.RR_GW || '--'} rpm</value></div>` : ''}
        ${authorizedVitals.has('SPO2_MD') ? `<div class="result-item"><label>Oxygen Saturation (MD):</label><value>${data.SPO2_MD || '--'}%</value></div>` : ''}
        ${authorizedVitals.has('SPO2_GW') ? `<div class="result-item"><label>Oxygen Saturation (GW):</label><value>${data.SPO2_GW || '--'}%</value></div>` : ''}
        ${authorizedVitals.has('BP_MD') ? `<div class="result-item"><label>Blood Pressure (MD):</label><value>${data.BP_MD || '--'} bpm</value></div>` : ''}
        ${authorizedVitals.has('BP_GW') ? `<div class="result-item"><label>Blood Pressure (GW):</label><value>${data.BP_GW || '--'} bpm</value></div>` : ''}
      </div>
    </div>
  `;
}

/**
 * Authenticator callback for SDK
 * Gets called by SDK with runToken
 * Uses currentPatientId from app state
 * Returns the auth response from the server
 */
async function authenticateVitalCore(runToken) {
  if (!currentPatientId) {
    throw new Error('No patient ID available');
  }

  addLog('Authenticating with server...', 'info');

  const response = await fetch('/auth', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      patientId: currentPatientId,
      runToken
    })
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message || 'Authentication failed');
  }

  addLog({
    event: 'Authentication successful',
    notificationId: data.notificationId
  }, 'success');

  // Server stores auth tokens - client doesn't need them

  // Return the vitalCoreAuth response to SDK
  return data.vitalCoreAuth;
}

/**
 * Initialize SDK
 */
async function initializeSDK() {
  try {
    updateStatus('loading', 'Initializing SDK...');
    addLog('Initializing Vitals Web SDK', 'info');

    vitalClient = createVitalClient({
      workerDirectory: '/dist',
      authenticator: authenticateVitalCore,
    });

    // Set up event listeners
    vitalClient.on('ready', () => {
      updateStatus('ready', 'SDK Ready');
      addLog('SDK initialized successfully', 'success');
    });

    vitalClient.on('previewModeStart', () => {
      addLog('preview mode started');
    });

    vitalClient.on('error', (error) => {
      updateStatus('error', 'SDK Error');
      addLog({ error: error.message }, 'error');
    });

    vitalClient.on('log', (msg) => {
      addLog(msg, 'debug');
    });

    vitalClient.on('start', (data) => {
      addLog({ event: 'Measurement started', data }, 'info');
    });

    // The measurement session is awaited via measureOnce() (once('stop')), and
    // startMeasurement() owns the single save + flag/label update. This listener
    // is just for logging, matching the vanilla-js-retries structure.
    vitalClient.on('stop', (result) => {
      addLog({ event: 'Measurement stopped', result }, 'info');
    });

    vitalClient.on('maxSessionTime', (duration) => {
      maxSessionTime = duration;
    });

    vitalClient.on('timeLeft', (timeLeft) => {
      timeLeftListener(timeLeft);
    });

    vitalClient.on('signsMessage', (message) => {
      processMessage(message);
    });

    vitalClient.on('authorizedVitals', (vitals) => {
      vitals.forEach((vital => { authorizedVitals.add(vital); }));
    });

    // Initialize worker
    await vitalClient.init();
    await vitalClient.startPreviewMode(videoEl);

    startMeasurementBtnDisabled = false;

    // Get version
    const version = await vitalClient.getVersion();
    versionEl.textContent = `Version: ${version}`;
    addLog({ version }, 'info');

  } catch (error) {
    updateStatus('error', 'Initialization failed');
    addLog({ error: error.message }, 'error');
    console.error('SDK initialization error:', error);
  }
}

/**
 * Start camera
 */
async function startCamera() {
  try {
    addLog('Requesting camera access...', 'info');

    const constraints = {
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: 'user'
      },
      audio: false
    };

    mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
    videoEl.srcObject = mediaStream;

    videoEl.onloadedmetadata = () => {
      addLog({
        event: 'Camera started',
        resolution: `${videoEl.videoWidth}x${videoEl.videoHeight}`
      }, 'success');
    };

    startMeasurementBtn.disabled = false;

    updateStatus('ready', 'Camera active - Ready to measure');

  } catch (error) {
    addLog({ error: 'Camera access denied: ' + error.message }, 'error');
    console.error('Camera error:', error);
    throw error;
  }
}

/**
 * Get authorized vitals as array
 */
function getSelectedVitals() {
  return Array.from(authorizedVitals);
}

function timeLeftListener(timeLeftData) {
  const { timeLeft, percentComplete } = timeLeftData;
  timeRemaining.textContent = `${timeLeft}s remaining`;
  progressFill.style.width = `${100 * percentComplete}%`;
}

/**
 * Start measurement
 */
async function startMeasurement() {
  try {
    // Guard against a double-start: there are awaits below (authorize, new-pro)
    // before measuring/disable take effect, so a fast second click could run a
    // second session concurrently (two PROs, overlapping measurements).
    if (measuring) return;
    if (!currentPatientId) {
      addLog({ error: 'No patient ID available' }, 'error');
      return;
    }
    // Claim the session now and disable Start immediately, before any awaits.
    measuring = true;
    startMeasurementBtn.disabled = true;

    // SDK will call our authenticator callback with runToken
    // Authenticator uses currentPatientId from closure scope
    try {
      await vitalClient.authorize();
    } catch (e) {
      console.log(e);
      measuring = false;
      startMeasurementBtn.disabled = false;
      return;
    }

    const selectedVitals = getSelectedVitals();

    if (selectedVitals.length === 0) {
      addLog({ error: 'No vitals authorized. Check authorization.' }, 'error');
      measuring = false;
      startMeasurementBtn.disabled = false;
      return;
    }

    // For a second-or-later session, authorize() was cached so /auth didn't run
    // and no new PRO was minted. Create one now so we don't overwrite the prior
    // session's PRO. (First session already has its PRO from authorize -> /auth.)
    if (hasMeasuredOnce) {
      addLog('Creating new PRO for this session...', 'info');
      const proRes = await fetch('/patient/new-pro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: currentPatientId })
      });
      const proData = await proRes.json();
      if (!proData.success) {
        addLog({ error: 'Failed to create new PRO: ' + proData.message }, 'error');
        measuring = false;
        startMeasurementBtn.disabled = false;
        return;
      }
    }

    addLog({ event: 'Starting measurement', vitals: selectedVitals }, 'info');
    updateStatus('measuring', 'Measuring...');

    // measuring/disable already set on entry; finish enabling the session UI.
    stopMeasurementBtn.disabled = false;
    progressSection.style.display = 'block';
    displayResults({});

    // Run one measurement session and wait for its result.
    const result = await measureOnce(selectedVitals);

    measuring = false;
    clearInterval(countdownSetIntervalId);
    startMeasurementBtn.disabled = false;
    stopMeasurementBtn.disabled = true;
    progressSection.style.display = 'none';
    progressFill.style.width = '0%';
    updateStatus('ready', 'Measurement complete');

    displayResults(processVitalCoreResults(result));
    await saveVitalsData(result);

    // This session is done and saved (results submitted, good vitals or not); any
    // further session must mint its own PRO. Relabel Start so it's clear to users
    // and developers that the next click begins a brand-new session/PRO.
    hasMeasuredOnce = true;
    startMeasurementBtn.textContent = 'Start New Session';

  } catch (error) {
    addLog({ error: 'Failed to start measurement: ' + error.message }, 'error');
    console.error('Measurement error:', error);
    measuring = false;
    startMeasurementBtn.disabled = false;
    stopMeasurementBtn.disabled = true;
  }
}

/**
 * Run one measurement session and resolve with its 'stop' result.
 * once('stop', ...) gives us the result as a promise we can await. Manual Stop
 * (stopMeasurement) calls vitalClient.stop(), which also resolves this.
 */
function measureOnce(vitals) {
  return new Promise((resolve, reject) => {
    const onStop = (result) => resolve(result);
    vitalClient.once('stop', onStop);
    vitalClient.start(vitals, videoEl).catch((err) => {
      vitalClient.off('stop', onStop);
      reject(err);
    });
  });
}

/**
 * Stop measurement
 */
async function stopMeasurement() {
  try {
    addLog('Stopping measurement...', 'info');
    // Just stop the session. measureOnce() in startMeasurement() is awaiting the
    // 'stop' result and owns the single save + flag/label update, for both manual
    // stop and the automatic session end. Don't save here too, or we'd submit twice.
    await vitalClient.stop();
  } catch (error) {
    addLog({ error: error.message }, 'error');
    console.error('Stop measurement error:', error);
  }
}

function processVitalCoreResults(result) {
  // SDK returns complete VITAL-TRAC structure with finalVitalsMeasurementValues
  const { finalVitalsMeasurementValues, timestamp } = result;
  const vitals = finalVitalsMeasurementValues || {};
  const results = {}

  if (vitals.PR_GW) {
    results.PR_GW = vitals.PR_GW.hr;
  }
  if (vitals.RR_GW) {
    results.RR_GW = vitals.RR_GW.rr;
  }
  if (vitals.SPO2_GW) {
    results.SPO2_GW = vitals.SPO2_GW.spO2;
  }
  if (vitals.BP_GW) {
    results.BP_GW = `${vitals.BP_GW.BP_SYS} / ${vitals.BP_GW.BP_DIA}`;
  }
  if (vitals.PR_MD) {
    results.PR_MD = vitals.PR_MD.hr;
  }
  if (vitals.RR_MD) {
    results.RR_MD = vitals.RR_MD.rr;
  }
  if (vitals.SPO2_MD) {
    results.SPO2_MD = vitals.SPO2_MD.spO2;
  }
  if (vitals.BP_MD) {
    results.BP_MD = `${vitals.BP_MD.BP_SYS} / ${vitals.BP_MD.BP_DIA}`;
  }

  results.timestamp = timestamp;

  return results;
}

/**
 * Save vitals data to server
 */
async function saveVitalsData(vitalsData) {
  try {
    if (!currentPatientId) {
      addLog({ error: 'No patient ID available. Create a patient first.' }, 'error');
      return;
    }

    addLog('Submitting vitals to Mindset API...', 'info');

    const response = await fetch('/patient/vitals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        patientId: currentPatientId,
        vitals: vitalsData
      })
    });

    const data = await response.json();

    if (data.success) {
      addLog({ event: 'Vitals submitted to Mindset API successfully' }, 'success');
    } else {
      addLog({ error: 'Failed to submit vitals: ' + data.message }, 'error');
    }

  } catch (error) {
    addLog({ error: 'Failed to submit vitals: ' + error.message }, 'error');
    console.error('Save error:', error);
  }
}

// Event Listeners
createPatientBtn.addEventListener('click', createPatient);
clearPatientBtn.addEventListener('click', clearPatient);
startMeasurementBtn.addEventListener('click', startMeasurement);
stopMeasurementBtn.addEventListener('click', stopMeasurement);

// Initialize on load
window.addEventListener('DOMContentLoaded', async () => {
  addLog('Application started', 'info');
  loadPatientFromSession();
  try {
    await startCamera();
  } catch {}
  initializeSDK();
});
