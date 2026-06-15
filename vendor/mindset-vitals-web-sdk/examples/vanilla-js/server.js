import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3015;

// Mindset API configuration
const MINDSET_API_URL = process.env.MINDSET_API_URL || 'https://api-develop.mindsetmedical.com';
const MINDSET_API_KEY = process.env.MINDSET_API_KEY || '';
const CLINIC_ID = process.env.CLINIC_ID || '';
const NOTIFICATION_TYPE = process.env.NOTIFICATION_TYPE || 'VITAL-TRAC';

// In-memory store for patient PRO submission IDs (server-side only, never sent to client)
const patientNotificationStore = new Map();
// Structure: patientId -> proSubmissionId (numeric ID from notification.meta.pro_submission_id)

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increase limit for signsMsgs data
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve SDK dist files
app.use('/dist', express.static(path.join(__dirname, '../../dist')));

// API Routes

/**
 * POST /patient/create - Create new patient via Mindset API
 * Creates a patient record and returns patient ID
 */
app.post('/patient/create', async (req, res) => {
  try {
    if (!MINDSET_API_KEY || !CLINIC_ID) {
      return res.status(400).json({
        success: false,
        message: 'Server not configured. Set MINDSET_API_KEY and CLINIC_ID in .env file.'
      });
    }

    const { email, firstName, lastName, birthDate } = req.body;

    console.log('Creating patient via Mindset API:', { email, firstName, lastName, birthDate });

    // Call Mindset API to create patient
    const response = await fetch(`${MINDSET_API_URL}/users/shadow`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MINDSET_API_KEY}`
      },
      body: JSON.stringify({
        clinic_id: CLINIC_ID,
        email: email || `patient+${Date.now()}@example.com`,
        first_name: firstName || 'Test',
        last_name: lastName || 'Patient',
        birth_date: birthDate || '1990-01-01'
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error('Mindset API error:', data);
      return res.status(data.statusCode || 500).json({
        success: false,
        message: data.message || 'Failed to create patient',
        error: data.error
      });
    }

    console.log('Patient created successfully:', data.id);

    res.json({
      success: true,
      patientId: data.id,
      message: 'Patient created successfully'
    });

  } catch (error) {
    console.error('Patient creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create patient',
      error: error.message
    });
  }
});

/**
 * POST /auth - Combined authorization endpoint
 * Creates notification AND authorizes Vital Core algorithm in one call
 */
app.post('/auth', async (req, res) => {
  try {
    if (!MINDSET_API_KEY || !CLINIC_ID) {
      return res.status(400).json({
        success: false,
        message: 'Server not configured. Set MINDSET_API_KEY and CLINIC_ID in .env file.'
      });
    }

    const { patientId, runToken } = req.body;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID is required'
      });
    }

    if (!runToken) {
      return res.status(400).json({
        success: false,
        message: 'Run token is required'
      });
    }

    console.log('Creating notification for patient:', patientId);

    // Step 1: Create notification with vitals_run_token
    // runToken is an object with { config, pubKey } from WASM
    const notificationResponse = await fetch(`${MINDSET_API_URL}/users/${patientId}/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MINDSET_API_KEY}`
      },
      body: JSON.stringify({
        clinic_id: CLINIC_ID,
        notification_type: NOTIFICATION_TYPE,
        trigger_text: false,
        pre_auth: true,
        vitals_run_token: runToken
      })
    });

    const notificationData = await notificationResponse.json();

    if (notificationData.error) {
      console.error('Mindset API error (notification):', notificationData);
      return res.status(notificationData.statusCode || 500).json({
        success: false,
        message: notificationData.message || 'Failed to create notification',
        error: notificationData.error
      });
    }

    console.log('Notification created successfully:', {
      notificationId: notificationData.id,
      proSubmissionId: notificationData.meta?.pro_submission_id
    });

    // Store PRO submission ID server-side (never send to client)
    // The notification creates a PRO submission with a numeric ID
    patientNotificationStore.set(patientId, notificationData.meta?.pro_submission_id);

    // Return response (client doesn't need notification ID or tokens)
    res.json({
      success: true,
      notificationType: NOTIFICATION_TYPE,
      vitalCoreAuth: notificationData.vitals_auth,
      message: 'Authorization created successfully'
    });

  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({
      success: false,
      message: 'Authorization failed',
      error: error.message
    });
  }
});

/**
 * POST /patient/vitals - Submit vitals to Mindset API PRO system
 * Uses clinic API key for secure server-to-server communication
 */
app.post('/patient/vitals', async (req, res) => {
  try {
    const { patientId, vitals } = req.body;

    if (!patientId || !vitals) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: patientId, vitals'
      });
    }

    if (!MINDSET_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'Server not configured. Set MINDSET_API_KEY in .env file.'
      });
    }

    // Lookup PRO submission ID from server-side store
    const proSubmissionId = patientNotificationStore.get(patientId);
    if (!proSubmissionId) {
      return res.status(400).json({
        success: false,
        message: 'No PRO submission found for patient. Please authorize first.'
      });
    }

    console.log('Submitting vitals to Mindset API:', {
      patientId,
      proSubmissionId,
      vitalsCount: Object.keys(vitals?.vitals?.vitals || {}).length,
      signsMsgsCount: Object.keys(vitals?.signsMsgs || {}).length
    });

    // SDK returns complete VITAL-TRAC data structure - just pass it through
    const proResponse = await fetch(`${MINDSET_API_URL}/users/${patientId}/pro_submissions/${proSubmissionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MINDSET_API_KEY}`, // Use clinic API key
        'User-Agent': req.headers['user-agent'] || 'Vitals-Web-SDK-Example/1.0'
      },
      body: JSON.stringify({
        pro_type: 'VITAL-TRAC',
        pro_data: {
          data: vitals, // SDK provides complete structure ready for submission
          recorded_at: new Date().toISOString(),
          user_agent: req.headers['user-agent']
        }
      })
    });

    const proData = await proResponse.json();

    if (!proResponse.ok) {
      console.error('Mindset API error (PRO submission):', proData);
      return res.status(proResponse.status).json({
        success: false,
        message: proData.message || 'Failed to submit vitals to Mindset API',
        error: proData.error
      });
    }

    console.log('Vitals submitted successfully:', { proSubmissionId });

    res.json({
      success: true,
      data: proData,
      message: 'Vitals submitted successfully'
    });

  } catch (error) {
    console.error('Vitals submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit vitals',
      error: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║  Vitals Web SDK - Vanilla JS Example         ║
╚═══════════════════════════════════════════════╝

Server running on: http://localhost:${PORT}

Available endpoints:
  - GET  /                → Example application
  - POST /auth            → Create notification (Mindset API)
  - POST /patient/create  → Create patient (Mindset API)
  - POST /patient/vitals  → Save vitals data
  - GET  /dist/*          → SDK files

Configuration:
  - API URL: ${MINDSET_API_URL}
  - API Key: ${MINDSET_API_KEY ? '✓ Set' : '✗ Not set'}
  - Clinic ID: ${CLINIC_ID || '✗ Not set'}
  - Notification Type: ${NOTIFICATION_TYPE}

Press Ctrl+C to stop
`);
});
