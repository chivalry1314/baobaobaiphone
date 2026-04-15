export type WeightUnit = 'kg' | 'jin';

const KG_TO_JIN = 2;

export const normalizeWeightValue = (value: number): number | null => {
  if (!Number.isFinite(value)) return null;
  if (value < 0) return null;
  return Math.round(value * 10) / 10;
};

export const convertWeightValue = (value: number, fromUnit: WeightUnit, toUnit: WeightUnit): number => {
  if (fromUnit === toUnit) return value;
  if (fromUnit === 'kg') return value * KG_TO_JIN;
  return value / KG_TO_JIN;
};

export const parseWeightInput = (input: string): number | null => {
  const normalizedText = input.trim();
  if (!normalizedText) return null;
  const parsed = Number.parseFloat(normalizedText);
  if (Number.isNaN(parsed)) return null;
  return normalizeWeightValue(parsed);
};

export const formatWeightInput = (value: number): string => {
  const normalized = normalizeWeightValue(value);
  if (normalized === null) return '0';
  const rounded = Math.round(normalized * 10) / 10;
  if (Number.isInteger(rounded)) return `${rounded}`;
  return rounded.toFixed(1);
};

export const formatWeightRecordLabel = (weightKg: number): string => `${weightKg.toFixed(1)}公斤`;

export const toWeightInputFromKg = (weightKg: number | null, unit: WeightUnit): string => {
  if (weightKg === null) return '0';
  const normalizedKg = normalizeWeightValue(weightKg);
  if (normalizedKg === null) return '0';
  const converted = convertWeightValue(normalizedKg, 'kg', unit);
  return formatWeightInput(converted);
};
