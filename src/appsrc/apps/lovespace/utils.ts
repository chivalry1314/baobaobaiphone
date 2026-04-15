import { AVATAR_GRADIENTS } from './constants';

const DAY_MS = 24 * 60 * 60 * 1000;

export const getTodayDateInput = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getNameInitial = (name: string): string => {
  const first = name.trim().slice(0, 1).toUpperCase();
  return first || '#';
};

export const getAvatarGradient = (seedText: string): string => {
  const seed = seedText.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return AVATAR_GRADIENTS[seed % AVATAR_GRADIENTS.length];
};

export const parseDateInput = (dateInput: string): Date => {
  const [year, month, day] = dateInput.split('-').map(Number);
  return new Date(year || 1970, (month || 1) - 1, day || 1);
};

const getStartOfDayTimestamp = (date: Date): number =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

export const calcBondDays = (dateInput: string): number => {
  const sinceDate = parseDateInput(dateInput);
  const sinceStart = getStartOfDayTimestamp(sinceDate);
  const todayStart = getStartOfDayTimestamp(new Date());
  const diff = Math.max(0, todayStart - sinceStart);
  return Math.floor(diff / DAY_MS) + 1;
};

export const calcHeartbeatValue = (days: number): number => 520 + days * 66;

export const formatDateText = (dateInput: string): string => {
  const date = parseDateInput(dateInput);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const formatDateWithWeekday = (dateInput: string): string => {
  const date = parseDateInput(dateInput);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  });
};

export const calcElapsedDays = (dateInput: string, includeStartDay: boolean): number => {
  const targetDate = parseDateInput(dateInput);
  const targetStart = getStartOfDayTimestamp(targetDate);
  const todayStart = getStartOfDayTimestamp(new Date());
  const diffDays = Math.max(0, Math.floor((todayStart - targetStart) / DAY_MS));
  return includeStartDay ? diffDays + 1 : diffDays;
};
