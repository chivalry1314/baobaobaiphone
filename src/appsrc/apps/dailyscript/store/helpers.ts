import type { DailyScriptPlan } from '../types';
import { DATE_KEY_PATTERN, DEFAULT_STEP_TIME } from './constants';

export const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
};

export const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export const sanitizeText = (value: unknown, maxLength: number): string => {
  const text = typeof value === 'string' ? value : '';
  return text.trim().slice(0, maxLength);
};

export const toDayKey = (timestamp: number): string => {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const sanitizeDateKey = (value: unknown, fallbackTimestamp = Date.now()): string => {
  const text = typeof value === 'string' ? value.trim() : '';
  if (DATE_KEY_PATTERN.test(text)) return text;
  return toDayKey(fallbackTimestamp);
};

export const sanitizeTime = (value: unknown): string => {
  const text = typeof value === 'string' ? value.trim() : '';
  if (/^([01]\d|2[0-3]):([0-5]\d)$/.test(text)) return text;
  return DEFAULT_STEP_TIME;
};

export const parseTimeMinutes = (time: string): number => {
  const [hourText = '', minuteText = ''] = time.split(':');
  const hours = Number.parseInt(hourText, 10);
  const minutes = Number.parseInt(minuteText, 10);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;
  return Math.max(0, Math.min(23, hours)) * 60 + Math.max(0, Math.min(59, minutes));
};

export const toDedupeKey = (
  planId: string,
  stepId: string,
  dayKey: string,
  scheduledTime: string
): string => `${planId}:${stepId}:${dayKey}:${scheduledTime}`;

export const sortPlans = (plans: DailyScriptPlan[]): DailyScriptPlan[] =>
  [...plans].sort((left, right) => left.createdAt - right.createdAt);
