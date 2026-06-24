export type VitalsCaptureScanState =
  | 'camera_permission_required'
  | 'initializing_scan'
  | 'ready_to_scan'
  | 'scanning_in_progress'
  | 'scan_completed'
  | 'scan_failed';

export interface MappedVitalsCaptureResult {
  pulseRate?: number;
  breathingRate?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  oxygenSaturation?: number;
  sdkVitalsPayload: Record<string, unknown>;
  isValid: boolean;
  validationMessage?: string;
}

export function buildSdkVitalsSubmissionPayload(sdkResult: unknown): Record<string, unknown> {
  return { ...((sdkResult ?? {}) as Record<string, unknown>) };
}

export function prepareSdkVitalsSubmissionPayload(
  sdkResult: unknown,
  vitalCoreVersion?: string | null,
  userAgent?: string | null,
): Record<string, unknown> {
  const payload = buildSdkVitalsSubmissionPayload(sdkResult);
  const version = vitalCoreVersion?.trim();
  const browserUserAgent = userAgent?.trim() || resolveBrowserUserAgent();

  if (version && payload['vitalCoreVersion'] == null) {
    payload['vitalCoreVersion'] = version;
  }

  if (browserUserAgent && payload['user_agent'] == null) {
    payload['user_agent'] = browserUserAgent;
  }

  return payload;
}

function resolveBrowserUserAgent(): string | undefined {
  if (typeof navigator === 'undefined') {
    return undefined;
  }

  const agent = navigator.userAgent?.trim();
  return agent || undefined;
}

function readNumber(value: unknown): number | undefined {
  if (value == null) {
    return undefined;
  }
  const parsed = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function mapBloodPressure(bp: Record<string, unknown> | undefined): { systolic?: number; diastolic?: number } {
  if (!bp) {
    return {};
  }

  const systolic = readNumber(bp['BP_SYS'] ?? bp['sbp_mmHg']);
  const diastolic = readNumber(bp['BP_DIA'] ?? bp['dbp_mmHg']);
  return { systolic, diastolic };
}

function isEmptyRecord(value: unknown): boolean {
  return value == null || typeof value !== 'object' || Object.keys(value as object).length === 0;
}

function extractSdkVitalsMap(result: Record<string, unknown>): Record<string, unknown> {
  const finalValues = result['finalVitalsMeasurementValues'];
  if (!isEmptyRecord(finalValues)) {
    return finalValues as Record<string, unknown>;
  }

  const vitalsWrapper = result['vitals'];
  if (vitalsWrapper && typeof vitalsWrapper === 'object') {
    const inner = (vitalsWrapper as Record<string, unknown>)['vitals'];
    if (!isEmptyRecord(inner)) {
      return inner as Record<string, unknown>;
    }
  }

  return {};
}

function sdkResultHasMeasurements(result: Record<string, unknown>): boolean {
  if (result['noValidMeasurements'] === true) {
    return false;
  }

  return Object.keys(extractSdkVitalsMap(result)).length > 0;
}

function pickAuthorizedVitalReading(
  finalValues: Record<string, Record<string, unknown>>,
  authorized: Set<string>,
  mdTag: string,
  gwTag: string,
): Record<string, unknown> | undefined {
  if (authorized.has(mdTag) && finalValues[mdTag]) {
    return finalValues[mdTag];
  }
  if (authorized.has(gwTag) && finalValues[gwTag]) {
    return finalValues[gwTag];
  }
  return undefined;
}

function authorizedPrefixes(authorized: Set<string>): Set<string> {
  const prefixes = new Set<string>();
  for (const tag of authorized) {
    const prefix = tag.split('_')[0];
    if (prefix) {
      prefixes.add(prefix);
    }
  }
  return prefixes;
}

function sdkResultHasAuthorizedMeasurements(
  result: Record<string, unknown>,
  authorized: Set<string>,
): boolean {
  if (authorized.size === 0) {
    return sdkResultHasMeasurements(result);
  }

  const finalValues = extractSdkVitalsMap(result);
  return [...authorized].some((tag) => !isEmptyRecord(finalValues[tag]));
}

export function mapSdkStopResultToCaptureRequest(
  sdkResult: unknown,
  vitalCoreVersion?: string | null,
  authorizedTags?: string[],
): MappedVitalsCaptureResult {
  const result = (sdkResult ?? {}) as Record<string, unknown>;
  const sdkVitalsPayload = prepareSdkVitalsSubmissionPayload(
    sdkResult,
    vitalCoreVersion,
    resolveBrowserUserAgent(),
  );
  const authorized = new Set(authorizedTags ?? []);

  if (!sdkResultHasAuthorizedMeasurements(result, authorized)) {
    return {
      sdkVitalsPayload,
      isValid: false,
      validationMessage:
        'No valid vitals were measured. Improve lighting, center your face in the guide, and remain still.',
    };
  }

  const finalValues = extractSdkVitalsMap(result) as Record<string, Record<string, unknown>>;

  const pr = pickAuthorizedVitalReading(finalValues, authorized, 'PR_MD', 'PR_GW');
  const rr = pickAuthorizedVitalReading(finalValues, authorized, 'RR_MD', 'RR_GW');
  const spo2 = pickAuthorizedVitalReading(finalValues, authorized, 'SPO2_MD', 'SPO2_GW');
  const bp = pickAuthorizedVitalReading(finalValues, authorized, 'BP_MD', 'BP_GW');
  const bpValues = mapBloodPressure(bp);

  const mapped: MappedVitalsCaptureResult = {
    pulseRate: authorized.size === 0 || authorizedPrefixes(authorized).has('PR')
      ? readNumber(pr?.['hr'])
      : undefined,
    breathingRate: authorized.size === 0 || authorizedPrefixes(authorized).has('RR')
      ? readNumber(rr?.['rr'])
      : undefined,
    bloodPressureSystolic:
      authorized.size === 0 || authorizedPrefixes(authorized).has('BP') ? bpValues.systolic : undefined,
    bloodPressureDiastolic:
      authorized.size === 0 || authorizedPrefixes(authorized).has('BP') ? bpValues.diastolic : undefined,
    oxygenSaturation:
      authorized.size === 0 || authorizedPrefixes(authorized).has('SPO2')
        ? readNumber(spo2?.['spO2'])
        : undefined,
    sdkVitalsPayload,
    isValid: false,
  };

  const hasAny =
    mapped.pulseRate != null ||
    mapped.breathingRate != null ||
    mapped.bloodPressureSystolic != null ||
    mapped.bloodPressureDiastolic != null ||
    mapped.oxygenSaturation != null;

  if (!hasAny) {
    mapped.validationMessage =
      'No valid vitals were detected from the scan. Try better lighting, face the camera, and hold still for the full measurement.';
    return mapped;
  }

  mapped.isValid = true;
  return mapped;
}
