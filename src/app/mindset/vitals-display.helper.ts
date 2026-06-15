import { MappedVitalsCaptureResult } from './mindset-vitals-sdk.mapper';

export interface VitalCaptureCard {
  key: string;
  shortLabel: string;
}

export const ALL_CAPTURE_CARDS: VitalCaptureCard[] = [
  { key: 'PR', shortLabel: 'PR' },
  { key: 'RR', shortLabel: 'RR' },
  { key: 'BP', shortLabel: 'BP' },
  { key: 'SpO2', shortLabel: 'SpO₂' },
];

export const VITAL_EMOJI_ICONS: Record<string, string> = {
  pr: '❤️',
  rr: '🫁',
  bp: '🩺',
  spo2: '🩸',
  PR: '❤️',
  RR: '🫁',
  BP: '🩺',
  SpO2: '🩸',
};

export function vitalEmojiIcon(key: string): string {
  return VITAL_EMOJI_ICONS[key] ?? VITAL_EMOJI_ICONS['PR'];
}

export type VitalResultDisplayKind = 'measured' | 'unmeasurable' | 'out_of_range';

export interface VitalResultRow {
  id: string;
  title: string;
  kind: VitalResultDisplayKind;
  valuePrefix?: string;
  valueNumber?: string;
  valueUnit?: string;
  displayText?: string;
  normalRange: string;
  description: string;
  bpDetail?: VitalBpResultDetail;
}

export interface VitalBpStage {
  label: string;
  range: string;
  tone: 'normal' | 'elevated' | 'stage1' | 'stage2' | 'stage3';
}

export interface VitalBpResultDetail {
  lifestyle: string;
  stages: VitalBpStage[];
}

export const BP_RESULT_DETAIL: VitalBpResultDetail = {
  lifestyle:
    'Lifestyle changes that may help reduce your blood pressure include maintaining a healthy weight, eating a well-balanced diet, regular physical activity, managing stress, and limiting or avoiding alcohol.',
  stages: [
    { label: 'Normal', range: '< 120 / 80', tone: 'normal' },
    { label: 'Elevated', range: '120-129 / < 80', tone: 'elevated' },
    { label: 'High Blood Pressure (Stage 1)', range: '130–139 / 80–89', tone: 'stage1' },
    { label: 'High Blood Pressure (Stage 2)', range: '140–179 / 90–119', tone: 'stage2' },
    { label: 'High Blood Pressure (Stage 3)', range: '> 180 / > 120', tone: 'stage3' },
  ],
};

const PR_RANGE = { min: 60, max: 100 };
const RR_NORMAL_RANGE = { min: 12, max: 22 };
const RR_REPORTABLE_MIN = 9;
const RR_REPORTABLE_MAX = 29;
const RR_BOUNDARY_LOW = 8;
const RR_BOUNDARY_HIGH = 30;
const SPO2_RANGE = { min: 95, max: 100 };
const BP_SYS_RANGE = { min: 90, max: 120 };
const BP_DIA_RANGE = { min: 60, max: 80 };

export const VITALS_RESULTS_DISCLAIMER =
  'The displayed results are not intended to diagnose, treat, cure, or prevent any disease and do not replace medical advice. Always consult a physician or health care provider with your health or treatment concerns.';

export const VITALS_RESULTS_BP_NOTE =
  'Note: Blood pressure varies throughout the day and numerous factors can affect the accuracy of measurements.';

const METRIC_ORDER = ['pr', 'rr', 'bp', 'spo2'] as const;

const METRIC_DEFS: Record<
  string,
  { title: string; normalRange: string; description: string; cardKeys: string[] }
> = {
  pr: {
    title: 'Pulse Rate',
    normalRange: 'Normal Range: 60-100 bpm',
    description:
      'Measures the average number of heartbeats per minute, which reflects the current state of the autonomic nervous system and may be indicative of the cardiovascular fitness level.',
    cardKeys: ['PR'],
  },
  rr: {
    title: 'Respiratory Rate',
    normalRange: 'Normal Range: 12-22 bpm',
    description:
      "Measures the number of breaths taken per minute. Each breath includes one inhalation and one exhalation. It is a key vital sign used to assess a person's respiratory function and overall clinical status.",
    cardKeys: ['RR'],
  },
  bp: {
    title: 'Blood Pressure',
    normalRange: 'Normal Range: 120/80 mmHg',
    description:
      'Systolic and diastolic blood pressure measured during the scan session.',
    cardKeys: ['BP'],
  },
  spo2: {
    title: 'Oxygen Saturation',
    normalRange: 'Normal Range: 95-100%',
    description:
      "Oxygen saturation is a measure of how much oxygen is in your blood, and it's an important indicator of lung function.",
    cardKeys: ['SpO2'],
  },
};

export function vitalTagsToCaptureCards(tags: string[]): VitalCaptureCard[] {
  const normalized = tags?.length ? tags : ['PR_MD', 'RR_MD'];
  const cards: VitalCaptureCard[] = [];
  const add = (match: (t: string) => boolean, card: VitalCaptureCard) => {
    if (normalized.some(match) && !cards.some((c) => c.shortLabel === card.shortLabel)) {
      cards.push(card);
    }
  };

  add((t) => t.startsWith('PR_'), { key: 'PR', shortLabel: 'PR' });
  add((t) => t.startsWith('RR_'), { key: 'RR', shortLabel: 'RR' });
  add((t) => t.startsWith('BP_'), { key: 'BP', shortLabel: 'BP' });
  add((t) => t.startsWith('SPO2_'), { key: 'SpO2', shortLabel: 'SpO₂' });

  return cards.length
    ? cards
    : [
      { key: 'PR', shortLabel: 'PR' },
      { key: 'RR', shortLabel: 'RR' },
    ];
}

function rangeStatus(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

function cardKeysToMetricIds(cards: VitalCaptureCard[]): string[] {
  const ids: string[] = [];
  for (const metricId of METRIC_ORDER) {
    const def = METRIC_DEFS[metricId];
    if (cards.some((c) => def.cardKeys.includes(c.key))) {
      ids.push(metricId);
    }
  }
  return ids;
}

function withMetricDetail(metricId: string, row: VitalResultRow): VitalResultRow {
  if (metricId === 'bp') {
    return { ...row, bpDetail: BP_RESULT_DETAIL };
  }
  return row;
}

function unmeasurableRow(metricId: string): VitalResultRow {
  const def = METRIC_DEFS[metricId];
  return withMetricDetail(metricId, {
    id: metricId,
    title: def.title,
    kind: 'unmeasurable',
    displayText: 'Unable to Measure',
    normalRange: def.normalRange,
    description: def.description,
  });
}

function formatRespiratoryRateValue(
  value: number,
): Pick<VitalResultRow, 'kind' | 'valuePrefix' | 'valueNumber' | 'valueUnit'> {
  const rounded = Math.round(value);

  if (rounded <= RR_BOUNDARY_LOW) {
    return {
      kind: 'out_of_range',
      valuePrefix: 'less than',
      valueNumber: String(RR_BOUNDARY_LOW),
      valueUnit: 'bpm',
    };
  }

  if (rounded >= RR_BOUNDARY_HIGH) {
    return {
      kind: 'out_of_range',
      valuePrefix: 'greater than',
      valueNumber: String(RR_BOUNDARY_HIGH),
      valueUnit: 'bpm',
    };
  }

  if (rounded >= RR_REPORTABLE_MIN && rounded <= RR_REPORTABLE_MAX) {
    return {
      kind: rangeStatus(rounded, RR_NORMAL_RANGE.min, RR_NORMAL_RANGE.max)
        ? 'measured'
        : 'out_of_range',
      valueNumber: String(rounded),
      valueUnit: 'bpm',
    };
  }

  return formatMeasuredValue(value, 'bpm', RR_NORMAL_RANGE.min, RR_NORMAL_RANGE.max);
}

function formatMeasuredValue(
  value: number,
  unit: string,
  min: number,
  max: number,
): Pick<VitalResultRow, 'kind' | 'valuePrefix' | 'valueNumber' | 'valueUnit'> {
  const rounded = Math.round(value);
  const inRange = rangeStatus(value, min, max);
  if (value > max) {
    return {
      kind: 'out_of_range',
      valuePrefix: 'greater than',
      valueNumber: String(rounded),
      valueUnit: unit,
    };
  }
  if (value < min) {
    return {
      kind: 'out_of_range',
      valuePrefix: 'less than',
      valueNumber: String(rounded),
      valueUnit: unit,
    };
  }
  return {
    kind: 'measured',
    valueNumber: String(rounded),
    valueUnit: unit,
  };
}

export function buildVitalResultRows(mapped: MappedVitalsCaptureResult): VitalResultRow[] {
  const rows: VitalResultRow[] = [];

  if (mapped.pulseRate != null) {
    const def = METRIC_DEFS['pr'];
    const value = formatMeasuredValue(mapped.pulseRate, 'bpm', PR_RANGE.min, PR_RANGE.max);
    rows.push({ id: 'pr', title: def.title, ...value, normalRange: def.normalRange, description: def.description });
  }

  if (mapped.breathingRate != null) {
    const def = METRIC_DEFS['rr'];
    const value = formatRespiratoryRateValue(mapped.breathingRate);
    rows.push({ id: 'rr', title: def.title, ...value, normalRange: def.normalRange, description: def.description });
  }

  if (mapped.bloodPressureSystolic != null && mapped.bloodPressureDiastolic != null) {
    const def = METRIC_DEFS['bp'];
    const sys = Math.round(mapped.bloodPressureSystolic);
    const dia = Math.round(mapped.bloodPressureDiastolic);
    const inRange =
      rangeStatus(sys, BP_SYS_RANGE.min, BP_SYS_RANGE.max) &&
      rangeStatus(dia, BP_DIA_RANGE.min, BP_DIA_RANGE.max);
    rows.push(
      withMetricDetail('bp', {
        id: 'bp',
        title: def.title,
        kind: inRange ? 'measured' : 'out_of_range',
        displayText: `${sys}/${dia} mmHg`,
        normalRange: def.normalRange,
        description: def.description,
      }),
    );
  }

  if (mapped.oxygenSaturation != null) {
    const def = METRIC_DEFS['spo2'];
    const value = formatMeasuredValue(mapped.oxygenSaturation, '%', SPO2_RANGE.min, SPO2_RANGE.max);
    rows.push({ id: 'spo2', title: def.title, ...value, normalRange: def.normalRange, description: def.description });
  }

  return rows;
}

export function buildVitalResultRowsForCapture(
  mapped: MappedVitalsCaptureResult,
  captureCards: VitalCaptureCard[],
): VitalResultRow[] {
  const measured = buildVitalResultRows(mapped);
  const byId = new Map(measured.map((row) => [row.id, row]));
  const expectedIds = cardKeysToMetricIds(captureCards);

  return expectedIds.map((metricId) => byId.get(metricId) ?? unmeasurableRow(metricId));
}

export function buildVitalResultRowsAll(mapped: MappedVitalsCaptureResult): VitalResultRow[] {
  const measured = buildVitalResultRows(mapped);
  const byId = new Map(measured.map((row) => [row.id, row]));
  return METRIC_ORDER.map((metricId) => byId.get(metricId) ?? unmeasurableRow(metricId));
}

export function hasWarningResults(rows: VitalResultRow[]): boolean {
  return rows.some((r) => r.kind === 'out_of_range');
}

export function hasUnmeasurableResults(rows: VitalResultRow[]): boolean {
  return rows.some((r) => r.kind === 'unmeasurable');
}
