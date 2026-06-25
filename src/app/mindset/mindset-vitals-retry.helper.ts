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

// Did this vital produce any real reading at all, in range or out of range?
// gotReading only returns true for in-range values, so on its own it treats an
// out-of-range PR or RR as "nothing measured" and keeps asking for retries until
// the reading gets wiped. gotAnyReading lets us tell the two apart: a present but
// out-of-range value is a real result we want to keep and report, not discard.
export function gotAnyReading(tag: string, value: Record<string, unknown> | undefined): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }

  if (tag.startsWith('BP_')) {
    const systolic = readPositiveNumber(value['BP_SYS'] ?? value['sbp_mmHg']);
    const diastolic = readPositiveNumber(value['BP_DIA'] ?? value['dbp_mmHg']);
    return systolic != null && diastolic != null;
  }
  if (tag.startsWith('PR_')) {
    return readPositiveNumber(value['hr']) != null;
  }
  if (tag.startsWith('RR_')) {
    return readPositiveNumber(value['rr']) != null;
  }
  if (tag.startsWith('SPO2_')) {
    return readPositiveNumber(value['spO2']) != null;
  }
  return Object.keys(value).length > 0;
}

// Is this a present but out-of-range PR or RR reading? Only PR and RR have range
// gates (PR 40 to 120, RR 8 to 30). vital-trac-app keeps these readings and reports
// them rather than retrying them away, so a second out-of-range reading is submitted
// instead of being replaced by a later "unable to measure" attempt.
export function isOutOfRange(tag: string, value: Record<string, unknown> | undefined): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }
  if (tag.startsWith('PR_')) {
    const hr = readPositiveNumber(value['hr']);
    return hr != null && (hr < 40 || hr > 120);
  }
  if (tag.startsWith('RR_')) {
    const rr = readPositiveNumber(value['rr']);
    return rr != null && (rr <= 8 || rr >= 30);
  }
  return false;
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
  vitalsByAttempt: Record<string, unknown>[],
  pendingVitalReadings?: Record<string, Record<string, unknown>>,
): Record<string, unknown> {
  // Match vital-trac-app's submit shape. The newest attempt's signs and vitals go
  // in signsMsgs / vitals, and the older attempts go in prevSignsMsgs / prevVitals
  // newest first, index aligned with each other. The old code picked the "last non
  // empty" signs attempt instead of the newest, which could attach one attempt's
  // signs to a different attempt's readings.
  const newestSigns = signsByAttempt[signsByAttempt.length - 1] || {};
  const prevSignsMsgs = signsByAttempt.slice(0, -1).reverse();
  const newestVitals = vitalsByAttempt[vitalsByAttempt.length - 1];
  const prevVitals = vitalsByAttempt.slice(0, -1).reverse();

  const merged: Record<string, unknown> = { ...(lastStopEnvelope ?? {}) };

  merged['finalVitalsMeasurementValues'] = collected;

  // As of SDK 2.6.0-3 result.vitals is the full final core message (it contains a
  // nested .vitals plus dataStatus, sessionTime, metadata, processorTimes). Forward
  // the newest attempt's full message and overwrite only its nested .vitals with the
  // aggregated readings, so the payload keeps the core diagnostics while reporting
  // the best value collected per vital across attempts. If no attempt produced a
  // message, fall back to the minimal nested shape.
  if (newestVitals && typeof newestVitals === 'object') {
    merged['vitals'] = { ...(newestVitals as Record<string, unknown>), vitals: collected };
  } else {
    merged['vitals'] = { vitals: collected };
  }

  merged['signsMsgs'] = newestSigns;
  merged['prevSignsMsgs'] = prevSignsMsgs;
  merged['prevVitals'] = prevVitals;
  // Always false on the submit path, matching vital-trac-app. The caller decides
  // from finalVitalsMeasurementValues whether anything is actually submittable.
  merged['noValidMeasurements'] = false;
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
  // The full per attempt core message (result.vitals), kept so the merged envelope
  // can forward the newest attempt's message and an index aligned prevVitals history.
  const vitalsByAttempt: Record<string, unknown>[] = [];
  let lastStopEnvelope: Record<string, unknown> | null = null;
  let pendingVitalReadings: Record<string, Record<string, unknown>> = {};

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    // A vital is still needed only if it produced no reading at all. An out-of-range
    // reading counts as produced, so it is reported and does not burn another attempt.
    const stillNeeded = wantedVitals.filter((tag) => !gotAnyReading(tag, collected[tag]));
    if (stillNeeded.length === 0) {
      break;
    }

    if (attempt > 1) {
      const partialEnvelope = mergeCollectedIntoStopEnvelope(
        lastStopEnvelope,
        collected,
        signsByAttempt,
        vitalsByAttempt,
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
    vitalsByAttempt.push(
      attemptResult['vitals'] && typeof attemptResult['vitals'] === 'object'
        ? (attemptResult['vitals'] as Record<string, unknown>)
        : {},
    );

    const readings = extractFinalVitalsMap(attemptResult);
    pendingVitalReadings = {};
    stillNeeded.forEach((tag) => {
      const reading = readings[tag];
      // In range reading is the best case, take it.
      if (gotReading(tag, reading)) {
        collected[tag] = reading;
        return;
      }

      // Out-of-range reading is real. Keep it and report it as long as we do not
      // already hold an in-range reading for this tag from an earlier attempt. It
      // satisfies stillNeeded above, so it will not trigger another retry.
      if (isOutOfRange(tag, reading) && !gotReading(tag, collected[tag])) {
        collected[tag] = reading;
        return;
      }

      // Anything else present but not usable (for example a zero or empty object) is
      // stashed for the retry-decision UI but not submitted.
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
    vitalsByAttempt,
    pendingVitalReadings,
  );
}
