export const MINDSET_VITALS_MAX_ATTEMPTS = 3;

export interface MindsetVitalMeasureClient {
  start(vitals: string[], videoEl: HTMLVideoElement): Promise<unknown>;
  stop?(): Promise<unknown>;
  on(event: 'stop', handler: (result: unknown) => void): void;
  off(event: 'stop', handler: (result: unknown) => void): void;
}

export interface MindsetMeasureOnceOptions {
  attemptNumber?: number;
  attemptTimeoutMs?: number;
  onMeasureStarted?: () => void;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  options: MindsetMeasureOnceOptions = {},
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const attemptNumber = options.attemptNumber ?? 0;
    let settled = false;
    let measurementStarted = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const finish = (action: () => void): void => {
      console.log('[Vitals Retry] Finish called', {
        attemptNumber,
        settledBefore: settled,
      });

      if (settled) {
        return;
      }

      settled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      client.off('stop', onStop);
      action();
    };

    const onStop = (result: unknown): void => {
      console.log('[Vitals Retry] Stop event received', {
        attemptNumber,
        settled,
        result,
      });

      if (!measurementStarted) {
        return;
      }

      if (settled) {
        console.log('[Vitals Retry] Ignoring duplicate stop event', {
          attemptNumber,
        });
        return;
      }

      finish(() => {
        console.log('[Vitals Retry] Promise settled', {
          attemptNumber,
          outcome: 'resolved',
        });
        resolve((result ?? {}) as Record<string, unknown>);
      });
    };

    client.on('stop', onStop);

    const attemptTimeoutMs = options.attemptTimeoutMs;
    if (attemptTimeoutMs && attemptTimeoutMs > 0 && client.stop) {
      timeoutId = setTimeout(() => {
        if (!measurementStarted || settled) {
          return;
        }

        void client.stop!()
          .then((result) => {
            finish(() => {
              console.log('[Vitals Retry] Promise settled', {
                attemptNumber,
                outcome: 'resolved',
              });
              resolve((result ?? {}) as Record<string, unknown>);
            });
          })
          .catch((error: unknown) => {
            finish(() => {
              console.log('[Vitals Retry] Promise settled', {
                attemptNumber,
                outcome: 'rejected',
              });
              reject(error);
            });
          });
      }, attemptTimeoutMs);
    }

    void client
      .start(vitals, videoEl)
      .then(() => {
        measurementStarted = true;
        console.log('[Vitals Retry] Attempt started', attemptNumber);
        options.onMeasureStarted?.();
      })
      .catch((error: unknown) => {
        finish(() => {
          console.log('[Vitals Retry] Promise settled', {
            attemptNumber,
            outcome: 'rejected',
          });
          reject(error);
        });
      });
  });
}

export interface MindsetMeasureWithRetriesOptions {
  maxAttempts?: number;
  attemptTimeoutMs?: number;
  delayBetweenAttemptsMs?: number;
  onAttemptStarted?: (attempt: number, maxAttempts: number, vitals: string[]) => void;
  onAttemptComplete?: (
    attempt: number,
    collected: Record<string, Record<string, unknown>>,
  ) => void;
}

function isNonEmptySigns(signs: Record<string, unknown>): boolean {
  return Object.keys(signs).length > 0;
}

function buildSignsFromAttempts(
  signsByAttempt: Record<string, unknown>[],
): { signsMsgs: Record<string, unknown>; prevSignsMsgs: Record<string, unknown>[] } {
  if (signsByAttempt.length === 0) {
    return { signsMsgs: {}, prevSignsMsgs: [] };
  }

  let signsMsgsIndex = -1;
  for (let i = signsByAttempt.length - 1; i >= 0; i--) {
    if (isNonEmptySigns(signsByAttempt[i])) {
      signsMsgsIndex = i;
      break;
    }
  }

  const signsMsgs = signsMsgsIndex >= 0 ? signsByAttempt[signsMsgsIndex] : {};
  const prevSignsMsgs: Record<string, unknown>[] = [];

  for (let i = signsByAttempt.length - 1; i >= 0; i--) {
    if (i === signsMsgsIndex) {
      continue;
    }

    prevSignsMsgs.push(signsByAttempt[i]);
  }

  console.log(
    '[Vitals Retry] Attempts summary',
    signsByAttempt.map((signsMsgs, index) => ({
      attempt: index + 1,
      signsMsgs,
    })),
  );

  console.log('[Vitals Retry] Final signs selection', {
    selectedSignsMsgs: signsMsgs,
    previousSignsMsgs: prevSignsMsgs,
  });

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
  const delayBetweenAttemptsMs = options.delayBetweenAttemptsMs ?? 400;
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

    if (attempt > 1) {
      await sleep(delayBetweenAttemptsMs);
      if (activeAttempt !== attempt) {
        break;
      }
    }

    const result = await measureOnce(client, stillNeeded, videoEl, {
      attemptNumber: attempt,
      attemptTimeoutMs: options.attemptTimeoutMs,
      onMeasureStarted: () => {
        if (activeAttempt !== attempt) {
          return;
        }

        options.onAttemptStarted?.(attempt, maxAttempts, stillNeeded);
      },
    });
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
