export interface MindsetVitalsAuthorizationFlags {
  pr: boolean;
  rr: boolean;
  bp: boolean;
  spo2: boolean;
}

export function buildAuthorizationFlagsFromTags(tags: string[]): MindsetVitalsAuthorizationFlags {
  const normalized = tags ?? [];
  return {
    pr: normalized.some((tag) => tag.startsWith('PR_')),
    rr: normalized.some((tag) => tag.startsWith('RR_')),
    bp: normalized.some((tag) => tag.startsWith('BP_')),
    spo2: normalized.some((tag) => tag.startsWith('SPO2_')),
  };
}

export function summarizeEncryptedVitalCoreAuth(vitalCoreAuth: unknown): {
  encryptedVitalsCount: number;
  hasConfig: boolean;
  hasAuthToken: boolean;
} {
  const record = (vitalCoreAuth ?? {}) as Record<string, unknown>;
  const vitals = record['vitals'];
  return {
    encryptedVitalsCount: Array.isArray(vitals) ? vitals.length : 0,
    hasConfig: typeof record['config'] === 'string' && record['config'].length > 0,
    hasAuthToken: typeof record['authToken'] === 'string' && record['authToken'].length > 0,
  };
}

export function isAuthorizedVitalTag(authorizedVitals: Set<string>, tag: string): boolean {
  return authorizedVitals.has(tag);
}

export function filterMappedCaptureRequestForAuthorizedTags<
  T extends {
    pulseRate?: number;
    breathingRate?: number;
    bloodPressureSystolic?: number;
    bloodPressureDiastolic?: number;
    oxygenSaturation?: number;
  },
>(mapped: T, authorizedTags: string[]): T {
  const flags = buildAuthorizationFlagsFromTags(authorizedTags);
  return {
    ...mapped,
    pulseRate: flags.pr ? mapped.pulseRate : undefined,
    breathingRate: flags.rr ? mapped.breathingRate : undefined,
    bloodPressureSystolic: flags.bp ? mapped.bloodPressureSystolic : undefined,
    bloodPressureDiastolic: flags.bp ? mapped.bloodPressureDiastolic : undefined,
    oxygenSaturation: flags.spo2 ? mapped.oxygenSaturation : undefined,
  };
}
