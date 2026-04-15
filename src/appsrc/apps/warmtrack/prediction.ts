import type { PeriodRange, PredictionConfidence, PredictionDaySets, PredictionModel, PredictionWindow } from './types';
import { addDaysToDateKey, compareDateKeys, diffDateKeys, sortRanges } from './utils';

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const percentile = (values: number[], ratio: number): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = (sorted.length - 1) * ratio;
  const low = Math.floor(index);
  const high = Math.ceil(index);
  if (low === high) return sorted[low];
  const weight = index - low;
  return sorted[low] + (sorted[high] - sorted[low]) * weight;
};

const filterIqrOutliers = (values: number[]): number[] => {
  if (values.length < 4) return values;
  const q1 = percentile(values, 0.25);
  const q3 = percentile(values, 0.75);
  const iqr = q3 - q1;
  const lower = q1 - iqr * 1.5;
  const upper = q3 + iqr * 1.5;
  return values.filter((value) => value >= lower && value <= upper);
};

const weightedAverage = (values: number[]): number => {
  if (values.length === 0) return 0;
  let numerator = 0;
  let denominator = 0;
  values.forEach((value, index) => {
    const weight = index + 1;
    numerator += value * weight;
    denominator += weight;
  });
  return denominator === 0 ? 0 : numerator / denominator;
};

const stdDev = (values: number[]): number => {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
};

const normalizeMetricSamples = (values: number[], min: number, max: number): number[] => {
  const plausible = values.filter((value) => value >= min && value <= max);
  const base = plausible.length > 0 ? plausible : values;
  const iqrFiltered = filterIqrOutliers(base);
  return iqrFiltered.length > 0 ? iqrFiltered : base;
};

export const buildPredictionModel = (ranges: PeriodRange[]): PredictionModel | null => {
  const sortedRanges = sortRanges(ranges);
  if (sortedRanges.length < 2) return null;

  const starts = sortedRanges.map((range) => range.start);
  const cycleLengths: number[] = [];
  for (let index = 1; index < starts.length; index += 1) {
    const length = diffDateKeys(starts[index], starts[index - 1]);
    if (length > 0) cycleLengths.push(length);
  }
  if (cycleLengths.length === 0) return null;

  const durationLengths = sortedRanges
    .filter((range) => range.end !== null)
    .map((range) => diffDateKeys(range.end as string, range.start) + 1)
    .filter((value) => value > 0);

  const normalizedCycles = normalizeMetricSamples(cycleLengths, 18, 45);
  const normalizedDurations = normalizeMetricSamples(durationLengths, 2, 12);
  const cycleLength = clamp(Math.round(weightedAverage(normalizedCycles) || 28), 21, 40);
  const periodLength = clamp(Math.round(weightedAverage(normalizedDurations) || 5), 3, 9);
  const cycleVariation = stdDev(normalizedCycles);

  let confidence: PredictionConfidence = 'low';
  if (normalizedCycles.length >= 6 && cycleVariation <= 2.5 && normalizedDurations.length >= 4) {
    confidence = 'high';
  } else if (normalizedCycles.length >= 3 && cycleVariation <= 5) {
    confidence = 'medium';
  }

  if (normalizedCycles.length / cycleLengths.length < 0.7 && confidence === 'high') {
    confidence = 'medium';
  } else if (normalizedCycles.length / cycleLengths.length < 0.7 && confidence === 'medium') {
    confidence = 'low';
  }

  const lastStart = starts[starts.length - 1];
  const nextPeriodStartKey = addDaysToDateKey(lastStart, cycleLength);
  const nextPeriodEndKey = addDaysToDateKey(nextPeriodStartKey, periodLength - 1);

  const windows: PredictionWindow[] = [];
  for (let index = 0; index < 6; index += 1) {
    const periodStartKey = addDaysToDateKey(nextPeriodStartKey, cycleLength * index);
    const periodEndKey = addDaysToDateKey(periodStartKey, periodLength - 1);
    const ovulationDayKey = addDaysToDateKey(periodStartKey, -14);
    windows.push({
      periodStartKey,
      periodEndKey,
      ovulationStartKey: addDaysToDateKey(ovulationDayKey, -4),
      ovulationDayKey,
      ovulationEndKey: addDaysToDateKey(ovulationDayKey, 1),
    });
  }

  return {
    cycleLength,
    periodLength,
    cycleSamples: normalizedCycles.length,
    durationSamples: normalizedDurations.length,
    confidence,
    nextPeriodStartKey,
    nextPeriodEndKey,
    windows,
  };
};

const collectRangeDateKeys = (startKey: string, endKey: string, target: Set<string>) => {
  let cursor = startKey;
  while (compareDateKeys(cursor, endKey) <= 0) {
    target.add(cursor);
    cursor = addDaysToDateKey(cursor, 1);
  }
};

export const buildPredictionDaySets = (prediction: PredictionModel | null): PredictionDaySets => {
  const marks: PredictionDaySets = {
    predictedPeriodDays: new Set<string>(),
    ovulationWindowDays: new Set<string>(),
    ovulationDays: new Set<string>(),
  };
  if (!prediction) return marks;

  prediction.windows.forEach((window) => {
    collectRangeDateKeys(window.periodStartKey, window.periodEndKey, marks.predictedPeriodDays);
    collectRangeDateKeys(window.ovulationStartKey, window.ovulationEndKey, marks.ovulationWindowDays);
    marks.ovulationDays.add(window.ovulationDayKey);
  });
  return marks;
};

export const getConfidenceLabel = (value: PredictionConfidence): string => {
  if (value === 'high') return '高';
  if (value === 'medium') return '中';
  return '低';
};
