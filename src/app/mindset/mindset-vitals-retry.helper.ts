export const MINDSET_VITALS_MAX_ATTEMPTS = 3;

export interface MindsetVitalMeasureClient {
  start(vitals: string[], videoEl: HTMLVideoElement): Promise<unknown>;
  on(event: 'stop', handler: (result: unknown) => void): void;
  off(event: 'stop', handler: (result: unknown) => void): void;
}

function readPositiveNumber(value: unknown): number | undefined {
  if (value == null) {
    return undefined;
  }
  const parsed = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export function gotVitalReading(tag: string, value: Record<string, unknown> | undefined): boolean {
  if (!value) {
    return false;
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
  if (tag.startsWith('BP_')) {
    return (
      readPositiveNumber(value['BP_SYS']) != null && readPositiveNumber(value['BP_DIA']) != null
    );
  }
  return false;
}

export function measureOnce(
  client: MindsetVitalMeasureClient,
  vitals: string[],
  videoEl: HTMLVideoElement,
  isActiveAttempt: () => boolean,
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const onStop = (result: unknown): void => {
      if (!isActiveAttempt()) {
        return;
      }

      client.off('stop', onStop);
      resolve((result ?? {}) as Record<string, unknown>);
    };

    client.on('stop', onStop);
    void client.start(vitals, videoEl).catch((error: unknown) => {
      if (!isActiveAttempt()) {
        client.off('stop', onStop);
        return;
      }

      client.off('stop', onStop);
      reject(error);
    });
  });
}

export interface MindsetMeasureWithRetriesOptions {
  maxAttempts?: number;
  onAttemptStart?: (attempt: number, maxAttempts: number, vitals: string[]) => void;
  onAttemptComplete?: (
    attempt: number,
    collected: Record<string, Record<string, unknown>>,
  ) => void;
}

function buildSignsFromAttempts(
  signsByAttempt: Record<string, unknown>[],
): { signsMsgs: Record<string, unknown>; prevSignsMsgs: Record<string, unknown>[] } {
  if (signsByAttempt.length === 0) {
    return { signsMsgs: {}, prevSignsMsgs: [] };
  }

  const signsMsgs = signsByAttempt[signsByAttempt.length - 1] ?? {};
  const prevSignsMsgs = signsByAttempt.slice(0, -1).reverse();

  return { signsMsgs, prevSignsMsgs };
}

function mergeCollectedIntoStopEnvelope(
  lastStopEnvelope: Record<string, unknown> | null,
  collected: Record<string, Record<string, unknown>>,
  signsByAttempt: Record<string, unknown>[],
): Record<string, unknown> {
  const hasCollected = Object.keys(collected).length > 0;
  const { signsMsgs, prevSignsMsgs } = buildSignsFromAttempts(signsByAttempt);

  if (!lastStopEnvelope) {
    return {
      vitals: { vitals: collected },
      finalVitalsMeasurementValues: collected,
      signsMsgs,
      prevSignsMsgs,
      noValidMeasurements: !hasCollected,
    };
  }

  const merged: Record<string, unknown> = { ...lastStopEnvelope };
  const existingVitalsWrapper =
    merged['vitals'] && typeof merged['vitals'] === 'object'
      ? (merged['vitals'] as Record<string, unknown>)
      : {};

  merged['vitals'] = { ...existingVitalsWrapper, vitals: collected };
  merged['finalVitalsMeasurementValues'] = collected;
  merged['signsMsgs'] = signsMsgs;
  merged['prevSignsMsgs'] = prevSignsMsgs;
  merged['noValidMeasurements'] = !hasCollected;

  return merged;
}

export async function measureWithRetries(
  client: MindsetVitalMeasureClient,
  videoEl: HTMLVideoElement,
  wantedVitals: string[],
  options: MindsetMeasureWithRetriesOptions = {},
): Promise<Record<string, unknown>> {
  const maxAttempts = options.maxAttempts ?? MINDSET_VITALS_MAX_ATTEMPTS;
  const collected: Record<string, Record<string, unknown>> = {};
  const signsByAttempt: Record<string, unknown>[] = [];
  let lastStopEnvelope: Record<string, unknown> | null = null;
  let activeAttempt = 0;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const stillNeeded = wantedVitals.filter((tag) => !gotVitalReading(tag, collected[tag]));
    if (stillNeeded.length === 0) {
      break;
    }

    activeAttempt = attempt;
    options.onAttemptStart?.(attempt, maxAttempts, stillNeeded);

    const result = await measureOnce(
      client,
      stillNeeded,
      videoEl,
      () => activeAttempt === attempt,
    );
    lastStopEnvelope = result;
    const readings = (result['finalVitalsMeasurementValues'] ?? {}) as Record<
      string,
      Record<string, unknown>
    >;

    stillNeeded.forEach((tag) => {
      if (gotVitalReading(tag, readings[tag])) {
        collected[tag] = readings[tag];
      }
    });

    signsByAttempt.push((result['signsMsgs'] ?? {}) as Record<string, unknown>);
    options.onAttemptComplete?.(attempt, collected);
  }

  return mergeCollectedIntoStopEnvelope(lastStopEnvelope, collected, signsByAttempt);
}
