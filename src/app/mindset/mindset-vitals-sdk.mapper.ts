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
): Record<string, unknown> {
  const payload = buildSdkVitalsSubmissionPayload(sdkResult);
  const version = vitalCoreVersion?.trim();

  if (version && payload['vitalCoreVersion'] == null) {
    payload['vitalCoreVersion'] = version;
  }

  return payload;
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

export function mapSdkStopResultToCaptureRequest(
  sdkResult: unknown,
  vitalCoreVersion?: string | null,
): MappedVitalsCaptureResult {
  const result = (sdkResult ?? {}) as Record<string, unknown>;
  const sdkVitalsPayload = prepareSdkVitalsSubmissionPayload(sdkResult, vitalCoreVersion);

  if (!sdkResultHasMeasurements(result)) {
    return {
      sdkVitalsPayload,
      isValid: false,
      validationMessage:
        'No valid vitals were measured. Improve lighting, center your face in the guide, and remain still.',
    };
  }

  const finalValues = extractSdkVitalsMap(result) as Record<string, Record<string, unknown>>;

  const pr = finalValues['PR_MD'] ?? finalValues['PR_GW'];
  const rr = finalValues['RR_MD'] ?? finalValues['RR_GW'];
  const spo2 = finalValues['SPO2_MD'] ?? finalValues['SPO2_GW'];
  const bp = finalValues['BP_MD'] ?? finalValues['BP_GW'];
  const bpValues = mapBloodPressure(bp);

  const mapped: MappedVitalsCaptureResult = {
    pulseRate: readNumber(pr?.['hr']),
    breathingRate: readNumber(rr?.['rr']),
    bloodPressureSystolic: bpValues.systolic,
    bloodPressureDiastolic: bpValues.diastolic,
    oxygenSaturation: readNumber(spo2?.['spO2']),
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
