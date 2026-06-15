# Mindset REST APIs for Vitals Web SDK Integration

This document describes the Mindset backend APIs required for integrating the Vitals Web SDK into your application.

**Related Documentation:**
- [Integration Guide](./integration_guide.md) - Step-by-step SDK integration
- [README](./README.md) - SDK client library reference and features
- [Architecture](./architecture.md) - Technical architecture and data flow
- [Vanilla JS Example](./examples/vanilla-js/README.md) - Working example application

Use the Vanilla JS example as the reference implementation. This document is the lower-level REST API reference for the Mindset calls made by the example backend.

## Overview

The Vitals Web SDK integration requires **three backend API calls** to Mindset:

1. **Create Patient** - Register a patient in the Mindset system
2. **Authorize Vitals** - Authorize the vitals client sdk for a measurement session
3. **Submit Results** - Save vitals measurement results

**Important:** These are **backend-only REST APIs**. All API calls must be made from your server, never from the browser/client. Your frontend (Vitals Web SDK client library) communicates with your backend, which then makes authenticated requests to Mindset REST APIs.

```
Browser (Client Library)  →  Your Backend  →  Mindset REST API
                               (API Key)
```

The client library should never have access to your API credentials or see internal IDs (notification IDs, PRO submission IDs).

## Authentication

### API Key

You'll need a Clinic API Key.

**How to get an API key:**
1. Log into Mindset Provider App as a provider user
2. Navigate to developer options in upper right menu
3. Go to the "API Keys" section
4. Click "Create API Key"
5. Copy and securely store the key (it's only shown once)

**Using the API key:**
Include it in the `Authorization` header of all requests:

```
Authorization: Bearer YOUR_API_KEY_HERE
```

### Clinic ID

You'll also need your **Clinic ID** (numeric). This can be found in the Provider App URL or clinic settings.

### Environment URLs

| Environment | Mindset REST API | Provider App |
|-------------|------------------|--------------|
| **Staging** | `https://api-develop.mindsetmedical.com` | `https://develop.mindsetmedical.com` |
| **Production** | `https://api.mindsetmedical.com` | `https://app.mindsetmedical.com` |

## REST API Endpoints

The integration is organized into three major operations:

1. **[Patient Management](#patient-management)** - Create, find, and update patient records
2. **[Authorize Vitals](#authorize-vitals-measurement)** - Authorize WASM algorithm for measurement
3. **[Submit Results](#submit-vitals-results)** - Save measurement results to Mindset

---

## Patient Management

### Create Patient

Creates a new patient record in the Mindset system.

**Endpoint:** `POST /users/shadow`

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY
```

**Request Body:**
```json
{
  "clinic_id": 123,
  "email": "patient@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "birth_date": "1990-01-01",
  "member_id": "MRN-12345"
}
```

**Parameters:**
- `clinic_id` (required) - Your clinic ID (numeric)
- `email` (required) - Patient email address
- `first_name` (required) - Patient first name
- `last_name` (required) - Patient last name
- `birth_date` (required) - Patient birth date (YYYY-MM-DD format)
- `member_id` (optional) - Your system's medical record number or patient identifier. Use this to link Mindset patient IDs to your existing patient records. Must be unique within your clinic.

**Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "patient@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "birth_date": "1990-01-01",
  "created_at": "2025-01-15T10:30:00Z"
}
```

**Important:** Save the `id` from the response - you'll need it for authorization and submission.

### Find Patient by Member ID

If you provided a `member_id` when creating the patient, you can retrieve the patient record using your external identifier.

**Endpoint:** `GET /clinics/{clinic_id}/patients?member_id={member_id}`

**Request Headers:**
```
Authorization: Bearer YOUR_API_KEY
```

**Query Parameters:**
- `member_id` - Your system's medical record number

**Example Request:**
```
GET /clinics/123/patients?member_id=MRN-12345
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "patient@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "birth_date": "1990-01-01",
      "member_id": "MRN-12345",
      "clinic_id": 123,
      "allow_data_access": true
    }
  ],
  "totalRecords": 1
}
```

**Use case:** This endpoint is useful when you need to look up a Mindset patient ID (`user_id`) using your own medical record number. For example, if a patient returns for another vitals measurement and you only have their MRN, you can use this endpoint to retrieve their Mindset `user_id` for authorization.

### Update Patient

Update an existing patient record.

**Endpoint:** `PUT /users/pro/{user_id}`

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY
```

**Request Body:**
```json
{
  "clinic_id": 123,
  "first_name": "John",
  "last_name": "Smith",
  "birth_date": "1990-01-01",
  "email": "john.smith@example.com",
  "cell_phone": "+1-555-0100",
  "member_id": "MRN-12345",
  "primary_language": "en",
  "flag_id": null
}
```

**Parameters:**
- `clinic_id` (required) - Your clinic ID (numeric)
- `first_name` (required) - Patient first name
- `last_name` (required) - Patient last name
- `birth_date` (required) - Patient birth date (YYYY-MM-DD format)
- `email` (optional) - Patient email address
- `cell_phone` (optional) - Patient phone number
- `member_id` (optional) - Your system's medical record number
- `primary_language` (optional) - Language code (e.g., 'en', 'es')
- `flag_id` (optional) - Internal flag identifier

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

## Authorize Vitals Measurement

This endpoint authorizes the WASM algorithm to perform a vitals measurement. Your backend calls this when the SDK's `authenticator` callback is invoked.

**Endpoint:** `POST /users/{user_id}/notifications`

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY
```

**Request Body:**
```json
{
  "clinic_id": 123,
  "notification_type": "VITAL-TRAC",
  "trigger_text": false,
  "pre_auth": true,
  "vitals_run_token": {created by vitals client}
}
```

**Parameters:**
- `clinic_id` - Your clinic ID (numeric)
- `notification_type` - Must be `"VITAL-TRAC"`
- `trigger_text` - Set to `false` (no SMS notification)
- `pre_auth` - Set to `true` (authorization request)
- `vitals_run_token` - The `runToken` object from SDK's authenticator callback

**Response (200 OK):**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "clinic_id": 123,
  "notification_type": "VITAL-TRAC",
  "vitals_auth": {
    "authToken": "encrypted-token-here",
    "vitals": [
      {
        "tag": "PR_MD",
        "max_session_time": 30
      },
      {
        "tag": "RR_MD",
        "max_session_time": 30
      }
    ]
  },
  "meta": {
    "pro_submission_id": 10001
  },
  "created_at": "2025-01-15T10:31:00Z"
}
```

**Important:**
- Return `vitals_auth` to the SDK's authenticator callback
- Store `meta.pro_submission_id` (numeric) on your server - you'll need it for submission
- **Never send** the notification ID or pro_submission_id to the client library

---

## Submit Vitals Results

This endpoint saves the measurement results to the Mindset system.

**Endpoint:** `PUT /users/{user_id}/pro_submissions/{pro_submission_id}`

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY
```

**Request Body:**
```json
{
  "pro_type": "VITAL-TRAC",
  "pro_data": {
    "data": {provided by vitals client stop event},
    "recorded_at": "2025-01-15T10:32:00Z"
  }
}
```

**Parameters:**
- `{user_id}` - Patient ID from Create Patient response
- `{pro_submission_id}` - Numeric ID from `meta.pro_submission_id` in authorization response
- `pro_type` - Must be `"VITAL-TRAC"`
- `pro_data.data` - The complete vitals result object from SDK's `stop` event (passed through from client)
- `pro_data.recorded_at` - ISO timestamp of when vitals were recorded

**Response (200 OK):**
```json
{
  "id": 10001,
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "pro_type": "VITAL-TRAC",
  "completion_date": "2025-01-15T10:32:00Z",
  "pro_score_data": {
    "string": "HR-MD: 72 | BR-MD: 16",
    "detail": { ... }
  },
  "created_at": "2025-01-15T10:31:00Z",
  "updated_at": "2025-01-15T10:32:00Z"
}
```

**Note:** The SDK provides the complete VITAL-TRAC data structure in the `stop` event - just pass it directly as `pro_data.data`.

---

## Error Responses

All endpoints return standard HTTP status codes:

### Common Errors

**401 Unauthorized**
```json
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Invalid authentication credentials"
}
```
- Check that your API key is correct and included in the Authorization header
- Verify the API key has `PROVIDER_SERVICE` scope

**403 Forbidden**
```json
{
  "statusCode": 403,
  "error": "Forbidden",
  "message": "Insufficient permissions"
}
```
- API key doesn't have required scope (`PROVIDER_SERVICE`)
- Patient doesn't have permission to access the clinic

**400 Bad Request**
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Invalid request payload",
  "validation": {
    "source": "payload",
    "keys": ["clinic_id"]
  }
}
```
- Check request body format
- Verify all required fields are present

**404 Not Found**
```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Resource not found"
}
```
- Patient ID doesn't exist
- PRO submission ID doesn't exist

---
## Security Best Practices

1. **Never expose credentials client-side**
   - API keys and clinic IDs should only exist on your server
   - Client library should call your backend, which then calls Mindset REST API

2. **Store PRO submission IDs securely**
   - Keep the mapping between patient IDs and PRO submission IDs on your server
   - Never send PRO submission IDs to the client library

3. **Use HTTPS**
   - All REST API calls must use HTTPS
   - Never send API keys over unencrypted connections

4. **Validate API key scope**
   - Ensure your API key has `PROVIDER_SERVICE` scope
   - This scope allows submitting PRO data on behalf of patients

5. **Secure API key storage**
   - Use environment variables for API keys
   - Never commit API keys to source control
   - Rotate keys periodically

---

## Related Documentation

- [Integration Guide](./integration_guide.md) - Complete SDK integration guide
- [README](./README.md) - SDK client library reference
- [Vanilla JS Example](./examples/vanilla-js/README.md) - Working example application
