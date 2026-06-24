export const MINDSET_VITALS_MAX_ATTEMPTS = 3;

export interface MindsetVitalMeasureClient {
  start(vitals: string[], videoEl: HTMLVideoElement): Promise<unknown>;
  on(event: 'stop', handler: (result: unknown) => void): void;
  off(event: 'stop', handler: (result: unknown) => void): void;
}

export interface MeasureWithRetriesOptions {
  maxAttempts?: number;
  onAttemptStarted?: (attempt: number, maxAttempts: number, vitals: string[]) => void;
  onAttemptComplete?: (attempt: number) => void;
  waitForRetry?: (
    stillNeeded: string[],
    attempt: number,
    partialEnvelope: Record<string, unknown>,
  ) => Promise<boolean>;
}

function extractFinalVitalsMap(result: Record<string, unknown>): Record<string, Record<string, unknown>> {
  const finalValues = result['finalVitalsMeasurementValues'];
  if (finalValues && typeof finalValues === 'object') {
    return finalValues as Record<string, Record<string, unknown>>;
  }

  const vitalsWrapper = result['vitals'];
  if (vitalsWrapper && typeof vitalsWrapper === 'object') {
    const inner = (vitalsWrapper as Record<string, unknown>)['vitals'];
    if (inner && typeof inner === 'object') {
      return inner as Record<string, Record<string, unknown>>;
    }
  }

  return {};
}

export function gotReading(tag: string, value: Record<string, unknown> | undefined): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }

  if (tag.startsWith('BP_')) {
    const systolic = readPositiveNumber(value['BP_SYS'] ?? value['sbp_mmHg']);
    const diastolic = readPositiveNumber(value['BP_DIA'] ?? value['dbp_mmHg']);
    return systolic != null && diastolic != null;
  }

  if (tag.startsWith('PR_')) {
    const hr = readPositiveNumber(value['hr']);
    return hr != null && hr >= 40 && hr <= 120;
  }

  if (tag.startsWith('RR_')) {
    const rr = readPositiveNumber(value['rr']);
    return rr != null && rr > 8 && rr < 30;
  }

  if (tag.startsWith('SPO2_')) {
    return readPositiveNumber(value['spO2']) != null;
  }

  return Object.keys(value).length > 0;
}

function readPositiveNumber(value: unknown): number | undefined {
  if (value == null) {
    return undefined;
  }
  const parsed = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function isNonEmptySigns(signs: Record<string, unknown> | undefined): boolean {
  return !!signs && Object.keys(signs).length > 0;
}

export function measureOnce(
  client: MindsetVitalMeasureClient,
  vitals: string[],
  videoEl: HTMLVideoElement,
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const onStop = (result: unknown): void => {
      client.off('stop', onStop);
      resolve((result ?? {}) as Record<string, unknown>);
    };

    client.on('stop', onStop);
    void client.start(vitals, videoEl).catch((error: unknown) => {
      client.off('stop', onStop);
      reject(error);
    });
  });
}

function mergeCollectedIntoStopEnvelope(
  lastStopEnvelope: Record<string, unknown> | null,
  collected: Record<string, Record<string, unknown>>,
  signsByAttempt: Record<string, unknown>[],
  pendingVitalReadings?: Record<string, Record<string, unknown>>,
): Record<string, unknown> {
  let primary = signsByAttempt.length - 1;
  for (let index = signsByAttempt.length - 1; index >= 0; index -= 1) {
    if (isNonEmptySigns(signsByAttempt[index])) {
      primary = index;
      break;
    }
  }

  const signsMsgs = signsByAttempt[primary] || {};
  const prevSignsMsgs = signsByAttempt.filter((_, index) => index !== primary).reverse();
  const merged: Record<string, unknown> = { ...(lastStopEnvelope ?? {}) };

  merged['finalVitalsMeasurementValues'] = collected;
  const vitalsWrapper =
    merged['vitals'] && typeof merged['vitals'] === 'object'
      ? (merged['vitals'] as Record<string, unknown>)
      : {};
  merged['vitals'] = { ...vitalsWrapper, vitals: collected };
  merged['signsMsgs'] = signsMsgs;
  merged['prevSignsMsgs'] = prevSignsMsgs;
  merged['noValidMeasurements'] = Object.keys(collected).length === 0;
  if (pendingVitalReadings && Object.keys(pendingVitalReadings).length > 0) {
    merged['pendingVitalReadings'] = pendingVitalReadings;
  }

  return merged;
}

export async function measureWithRetries(
  client: MindsetVitalMeasureClient,
  videoEl: HTMLVideoElement,
  wantedVitals: string[],
  options?: MeasureWithRetriesOptions,
): Promise<Record<string, unknown>> {
  const maxAttempts = options?.maxAttempts ?? MINDSET_VITALS_MAX_ATTEMPTS;
  const collected: Record<string, Record<string, unknown>> = {};
  const signsByAttempt: Record<string, unknown>[] = [];
  let lastStopEnvelope: Record<string, unknown> | null = null;
  let pendingVitalReadings: Record<string, Record<string, unknown>> = {};

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const stillNeeded = wantedVitals.filter((tag) => !gotReading(tag, collected[tag]));
    if (stillNeeded.length === 0) {
      break;
    }

    if (attempt > 1) {
      const partialEnvelope = mergeCollectedIntoStopEnvelope(
        lastStopEnvelope,
        collected,
        signsByAttempt,
        pendingVitalReadings,
      );
      const wantsRetry = await options?.waitForRetry?.(stillNeeded, attempt, partialEnvelope);
      if (!wantsRetry) {
        break;
      }
    }

    options?.onAttemptStarted?.(attempt, maxAttempts, stillNeeded);

    const attemptResult = await measureOnce(client, stillNeeded, videoEl);
    lastStopEnvelope = attemptResult;
    signsByAttempt.push(
      attemptResult['signsMsgs'] && typeof attemptResult['signsMsgs'] === 'object'
        ? (attemptResult['signsMsgs'] as Record<string, unknown>)
        : {},
    );

    const readings = extractFinalVitalsMap(attemptResult);
    pendingVitalReadings = {};
    stillNeeded.forEach((tag) => {
      const reading = readings[tag];
      if (gotReading(tag, reading)) {
        collected[tag] = reading;
        return;
      }

      if (reading && typeof reading === 'object' && Object.keys(reading).length > 0) {
        pendingVitalReadings[tag] = reading;
      }
    });

    options?.onAttemptComplete?.(attempt);
  }

  return mergeCollectedIntoStopEnvelope(
    lastStopEnvelope,
    collected,
    signsByAttempt,
    pendingVitalReadings,
  );
}
