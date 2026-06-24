import { HttpErrorResponse } from '@angular/common/http';

export const MINDSET_VITALS_SERVICE_UNAVAILABLE_MESSAGE =
  'The vitals service is currently unavailable. Please try again in a few minutes. If the issue persists, contact support.';

export const MINDSET_VITALS_SESSION_NOT_AUTHORIZED_MESSAGE =
  'No PRO submission found for patient. Please authorize first.';

export function isGatewayHttpStatus(status: number): boolean {
  return status === 502 || status === 503 || status === 504;
}

export function extractMindsetVitalsApiErrorMessage(error: unknown): string | undefined {
  if (!(error instanceof HttpErrorResponse)) {
    return undefined;
  }

  if (isGatewayHttpStatus(error.status)) {
    return MINDSET_VITALS_SERVICE_UNAVAILABLE_MESSAGE;
  }

  const body = error.error;
  if (typeof body === 'string' && body.trim()) {
    return body.trim();
  }

  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>;
    const msg = record['message'] ?? record['Message'];
    if (typeof msg === 'string' && msg.trim()) {
      return msg.trim();
    }
  }

  return undefined;
}

export function isMissingProSubmissionCaptureError(error: unknown): boolean {
  if (!(error instanceof HttpErrorResponse) || error.status !== 400) {
    return false;
  }

  const message = extractMindsetVitalsApiErrorMessage(error);
  if (!message) {
    return false;
  }

  return message.toLowerCase().includes('no pro submission found');
}

const PATIENT_LOOKUP_NOT_FOUND_MESSAGE =
  'No patient record found for this ID. Complete the fields below, then select Capture Vitals to register and continue.';

export function normalizePatientLookupMessage(message: string | undefined): string {
  const trimmed = (message ?? '').trim();
  if (!trimmed || trimmed.toLowerCase() === 'resource not found') {
    return PATIENT_LOOKUP_NOT_FOUND_MESSAGE;
  }

  return trimmed;
}

export function isMindsetVitalsServiceUnavailableMessage(message: string | undefined): boolean {
  if (!message?.trim()) {
    return false;
  }

  return (
    message === MINDSET_VITALS_SERVICE_UNAVAILABLE_MESSAGE ||
    message.toLowerCase().includes('currently unavailable')
  );
}
