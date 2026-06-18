import { VitalResultDisplayKind, VitalResultRow } from './vitals-display.helper';

export const MINDSET_VITALS_MAX_ATTEMPTS = 3;

export interface MindsetVitalMeasureClient {
  start(vitals: string[], videoEl: HTMLVideoElement): Promise<unknown>;
  on(event: 'stop', handler: (result: unknown) => void): void;
  off(event: 'stop', handler: (result: unknown) => void): void;
}

export interface BpRetryEligibility {
  authorizedTags: string[];
  bpRetryUsed: boolean;
  bpRetryInProgress: boolean;
  bpResultKind?: VitalResultDisplayKind;
}

export interface PrRrRetryEligibility {
  authorizedTags: string[];
  prRrRetryUsed: boolean;
  prRrRetryInProgress: boolean;
  bpRetryInProgress: boolean;
  resultRows: VitalResultRow[];
}

export interface MeasureWithRetriesOptions {
  maxAttempts?: number;
  onAttemptStarted?: (attempt: number, maxAttempts: number, vitals: string[]) => void;
  onAttemptComplete?: (attempt: number) => void;
}

function readPositiveNumber(value: unknown): number | undefined {
  if (value == null) {
    return undefined;
  }
  const parsed = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
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

function extractSignsMsgs(result: Record<string, unknown>): Record<string, unknown> {
  const signs = result['signsMsgs'];
  return signs && typeof signs === 'object' ? (signs as Record<string, unknown>) : {};
}

function isNonEmptySigns(signs: Record<string, unknown> | undefined): boolean {
  return !!signs && Object.keys(signs).length > 0;
}

export function gotVitalReading(tag: string, value: Record<string, unknown> | undefined): boolean {
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

export function getAuthorizedBpTags(authorizedTags: string[]): string[] {
  return authorizedTags.filter((tag) => tag.startsWith('BP_'));
}

export function isBpAuthorized(authorizedTags: string[]): boolean {
  return getAuthorizedBpTags(authorizedTags).length > 0;
}

export function isPrOutOfRangeForRetry(row?: VitalResultRow): boolean {
  return row?.id === 'pr' && row.kind === 'out_of_range';
}

export function isRrOutOfRangeForRetry(row?: VitalResultRow): boolean {
  return row?.id === 'rr' && row.kind === 'out_of_range';
}

export function isPrUnmeasurableForRetry(row?: VitalResultRow): boolean {
  return row?.id === 'pr' && row.kind === 'unmeasurable';
}

export function isRrUnmeasurableForRetry(row?: VitalResultRow): boolean {
  return row?.id === 'rr' && row.kind === 'unmeasurable';
}

export function isPrRetryEligible(row?: VitalResultRow): boolean {
  return isPrOutOfRangeForRetry(row) || isPrUnmeasurableForRetry(row);
}

export function isRrRetryEligible(row?: VitalResultRow): boolean {
  return isRrOutOfRangeForRetry(row) || isRrUnmeasurableForRetry(row);
}

export function getAuthorizedPrRrTagsForRetry(
  authorizedTags: string[],
  resultRows: VitalResultRow[],
): string[] {
  const byId = new Map(resultRows.map((row) => [row.id, row]));
  const tags: string[] = [];

  if (isPrRetryEligible(byId.get('pr'))) {
    tags.push(...authorizedTags.filter((tag) => tag.startsWith('PR_')));
  }

  if (isRrRetryEligible(byId.get('rr'))) {
    tags.push(...authorizedTags.filter((tag) => tag.startsWith('RR_')));
  }

  return [...new Set(tags)];
}

export function canOfferBpRetry(params: BpRetryEligibility): boolean {
  if (params.bpRetryUsed || params.bpRetryInProgress) {
    return false;
  }

  if (params.bpResultKind !== 'unmeasurable') {
    return false;
  }

  return isBpAuthorized(params.authorizedTags);
}

export function canOfferPrRrRetry(params: PrRrRetryEligibility): boolean {
  if (params.prRrRetryUsed || params.prRrRetryInProgress || params.bpRetryInProgress) {
    return false;
  }

  return getAuthorizedPrRrTagsForRetry(params.authorizedTags, params.resultRows).length > 0;
}

export function canShowResultsRetry(params: {
  scanFailed: boolean;
  bp: BpRetryEligibility;
  prRr: PrRrRetryEligibility;
}): boolean {
  if (params.scanFailed) {
    return true;
  }

  return canOfferBpRetry(params.bp) || canOfferPrRrRetry(params.prRr);
}

export function resolveMeasurementVitals(
  authorizedTags: string[],
  options?: { bpRetryOnly?: boolean; prRrRetryOnly?: string[] },
): string[] {
  if (options?.bpRetryOnly) {
    const bpTags = getAuthorizedBpTags(authorizedTags);
    console.info('[Vitals Retry] BP-only measurement tags:', bpTags);
    return bpTags;
  }

  if (options?.prRrRetryOnly?.length) {
    console.info('[Vitals Retry] PR/RR retry measurement tags:', options.prRrRetryOnly);
    return options.prRrRetryOnly;
  }

  return [...authorizedTags];
}

export function buildSignsFromAttempts(
  attempts: Array<{ signsMsgs: Record<string, unknown> }>,
): { signsMsgs: Record<string, unknown>; prevSignsMsgs: Record<string, unknown>[] } {
  console.log(
    '[Vitals Retry] Attempts summary',
    attempts.map((attempt, index) => ({
      attempt: index + 1,
      signsMsgs: attempt.signsMsgs,
    })),
  );

  let selectedIndex = -1;
  for (let index = attempts.length - 1; index >= 0; index -= 1) {
    if (isNonEmptySigns(attempts[index].signsMsgs)) {
      selectedIndex = index;
      break;
    }
  }

  const signsMsgs = selectedIndex >= 0 ? attempts[selectedIndex].signsMsgs : {};
  const prevSignsMsgs: Record<string, unknown>[] = [];

  for (let index = attempts.length - 1; index >= 0; index -= 1) {
    if (index !== selectedIndex) {
      prevSignsMsgs.push(attempts[index].signsMsgs ?? {});
    }
  }

  console.log('[Vitals Retry] Final signs selection', {
    selectedSignsMsgs: signsMsgs,
    previousSignsMsgs: prevSignsMsgs,
  });

  return { signsMsgs, prevSignsMsgs };
}

function mergeCollectedIntoStopEnvelope(
  lastStopEnvelope: Record<string, unknown> | null,
  collected: Record<string, Record<string, unknown>>,
  signsByAttempt: Array<{ signsMsgs: Record<string, unknown> }>,
): Record<string, unknown> {
  const { signsMsgs, prevSignsMsgs } = buildSignsFromAttempts(signsByAttempt);
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

  return merged;
}

export function measureOnce(
  client: MindsetVitalMeasureClient,
  vitals: string[],
  videoEl: HTMLVideoElement,
  attemptNumber: number,
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let settled = false;

    const finish = (outcome: 'resolved' | 'rejected', value: unknown): void => {
      console.log('[Vitals Retry] Finish called', {
        attemptNumber,
        settledBefore: settled,
      });

      if (settled) {
        console.log('[Vitals Retry] Ignoring duplicate stop event', {
          attemptNumber,
        });
        return;
      }

      settled = true;
      client.off('stop', onStop);

      console.log('[Vitals Retry] Promise settled', {
        attemptNumber,
        outcome,
      });

      if (outcome === 'resolved') {
        resolve((value ?? {}) as Record<string, unknown>);
        return;
      }

      reject(value);
    };

    const onStop = (result: unknown): void => {
      console.log('[Vitals Retry] Stop event received', {
        attemptNumber,
        settled,
        result,
      });
      finish('resolved', result);
    };

    console.log('[Vitals Retry] Attempt started', attemptNumber);
    client.on('stop', onStop);
    void client.start(vitals, videoEl).catch((error: unknown) => {
      finish('rejected', error);
    });
  });
}

export async function measureWithRetries(
  client: MindsetVitalMeasureClient,
  videoEl: HTMLVideoElement,
  wantedVitals: string[],
  options?: MeasureWithRetriesOptions,
): Promise<Record<string, unknown>> {
  const maxAttempts = options?.maxAttempts ?? MINDSET_VITALS_MAX_ATTEMPTS;
  const collected: Record<string, Record<string, unknown>> = {};
  const signsByAttempt: Array<{ signsMsgs: Record<string, unknown> }> = [];
  let lastStopEnvelope: Record<string, unknown> | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const stillNeeded = wantedVitals.filter((tag) => !gotVitalReading(tag, collected[tag]));
    if (stillNeeded.length === 0) {
      console.log('[Vitals Retry] All wanted vitals collected before attempt', attempt);
      break;
    }

    options?.onAttemptStarted?.(attempt, maxAttempts, stillNeeded);

    const attemptResult = await measureOnce(client, stillNeeded, videoEl, attempt);
    lastStopEnvelope = attemptResult;
    signsByAttempt.push({ signsMsgs: extractSignsMsgs(attemptResult) });

    const readings = extractFinalVitalsMap(attemptResult);
    for (const [tag, reading] of Object.entries(readings)) {
      if (wantedVitals.includes(tag) && gotVitalReading(tag, reading)) {
        collected[tag] = reading;
      }
    }

    options?.onAttemptComplete?.(attempt);
  }

  return mergeCollectedIntoStopEnvelope(lastStopEnvelope, collected, signsByAttempt);
}

export async function runAuthorizedBpRetry(
  client: MindsetVitalMeasureClient,
  authorizedTags: string[],
  videoEl: HTMLVideoElement,
): Promise<Record<string, unknown>> {
  const bpTags = getAuthorizedBpTags(authorizedTags);
  if (!bpTags.length) {
    throw new Error('BP is not authorized for retry.');
  }

  console.info('[Vitals Retry] Starting authorized BP retry with tags:', bpTags);
  return measureOnce(client, bpTags, videoEl, 1);
}
