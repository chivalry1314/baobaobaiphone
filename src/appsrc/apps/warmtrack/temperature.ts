export const normalizeTemperatureValue = (value: number): number | null => {
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 10) / 10;
};

export const formatTemperatureValue = (value: number): string => `${value.toFixed(1)}℃`;

export const temperatureToDigits = (value: number | null): string => {
  if (value === null) return '0';
  const normalized = normalizeTemperatureValue(value);
  if (normalized === null) return '0';
  return `${Math.round(normalized * 10)}`;
};

export const digitsToTemperatureValue = (digits: string): number | null => {
  if (!digits) return null;
  const sanitizedDigits = digits.replace(/\D/g, '');
  if (!sanitizedDigits) return null;
  const raw = Number.parseInt(sanitizedDigits, 10);
  if (Number.isNaN(raw)) return null;
  if (sanitizedDigits.length === 1) {
    return normalizeTemperatureValue(raw);
  }
  if (sanitizedDigits.length === 2) {
    return normalizeTemperatureValue(raw);
  }
  return normalizeTemperatureValue(raw / 10);
};

export const formatTemperatureDigits = (digits: string): string => {
  const sanitized = digits.replace(/\D/g, '');
  if (!sanitized) return '0';
  if (sanitized.length === 1) return sanitized;
  if (sanitized.length === 2) return `${sanitized}.0`;
  return `${sanitized.slice(0, -1)}.${sanitized.slice(-1)}`;
};
