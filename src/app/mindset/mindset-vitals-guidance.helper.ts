export interface MindsetDataStatusItem {
  code?: string;
  message: string;
  severity: string;
}

const STATUS_BY_CODE: Record<string, { message: string; severity: string }> = {
  'E-FDM-041': { message: 'Face not detected. Please look directly at the camera', severity: 'warning' },
  'E-FDM-042': { message: 'Center your face within the frame', severity: 'warning' },
  'E-DQM-021': { message: 'Please hold still while we capture your vitals', severity: 'warning' },
  'E-DQM-022': { message: 'Improve lighting so your face is clearly visible', severity: 'warning' },
  'W-RES-073': { message: 'Center your face within the frame', severity: 'warning' },
  'W-RES-076': { message: 'Center your face within the frame', severity: 'warning' },
  'W-RES-078': { message: 'Center your face within the frame', severity: 'warning' },
  'W-RES-079': { message: 'Move a little closer to the camera', severity: 'warning' },
  'W-RES-080': { message: 'Move a little farther from the camera', severity: 'warning' },

  'S-HRT-061': { message: 'Pulse rate measurement completed', severity: 'success' },
  'S-RES-070': { message: 'Respiratory rate measurement completed', severity: 'success' },
  'S-BPR-090': { message: 'Blood pressure measurement completed', severity: 'success' },
  'S-SPO-100': { message: 'Oxygen saturation measurement completed', severity: 'success' },
};

export function normalizeMindsetDataStatus(
  items?: Array<string | { code?: string; message?: string; severity?: string }> | null,
): MindsetDataStatusItem[] {
  if (!items?.length) {
    return [];
  }

  return items
    .map((item) => {
      if (typeof item === 'string') {
        const code = item.trim();
        const mapped = STATUS_BY_CODE[code];
        return mapped
          ? { code, message: mapped.message, severity: mapped.severity }
          : { code, message: code, severity: 'info' };
      }

      const code = item.code?.trim() || '';
      const mapped = code ? STATUS_BY_CODE[code] : undefined;
      const message = mapped?.message || item.message?.trim() || code;
      const severity = (mapped?.severity || item.severity || 'info').toLowerCase();

      return {
        code: code || undefined,
        message,
        severity,
      };
    })
    .filter((item) => !!item.message);
}

export function isMindsetQualityWarning(item: MindsetDataStatusItem): boolean {
  return item.severity === 'warning';
}
