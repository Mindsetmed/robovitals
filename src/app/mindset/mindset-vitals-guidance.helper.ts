export interface MindsetDataStatusItem {
  code?: string;
  message: string;
  severity: string;
}

export function extractSdkWarningStatuses(
  items?: Array<string | { code?: string; message?: string; severity?: string }> | null,
): MindsetDataStatusItem[] {
  if (!items?.length) {
    return [];
  }

  const warnings: MindsetDataStatusItem[] = [];

  for (const item of items) {
    if (typeof item === 'string') {
      continue;
    }

    const message = item.message?.trim();
    const severity = (item.severity || 'info').toLowerCase();
    if (!message || severity !== 'warning') {
      continue;
    }

    warnings.push({
      code: item.code?.trim() || undefined,
      message,
      severity,
    });
  }

  return warnings;
}
