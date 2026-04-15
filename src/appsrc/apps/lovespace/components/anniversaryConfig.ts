import type { ComponentType } from 'react';

import {
  CalendarDays,
  ClipboardCheck,
  Heart,
  Image as ImageIcon,
  Package,
  Sparkles,
} from 'lucide-react';

import { LOVE_SPACE_TEXT } from '../constants';
import type { LoveRepeatType, SaveLoveAnniversaryPayload } from '../types';

export type DraftState = Omit<SaveLoveAnniversaryPayload, 'bondId'>;

export interface AnniversaryTemplateDef {
  key: string;
  title: string;
  icon: ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
}

export const ANNIVERSARY_TEMPLATE_DEFS: AnniversaryTemplateDef[] = [
  { key: 'birthday_me', title: LOVE_SPACE_TEXT.anniversaryTemplateBirthdayMe, icon: CalendarDays },
  { key: 'birthday_ta', title: LOVE_SPACE_TEXT.anniversaryTemplateBirthdayTaSuffix, icon: CalendarDays },
  { key: 'first_kiss', title: LOVE_SPACE_TEXT.anniversaryTemplateFirstKiss, icon: Heart },
  { key: 'first_hug', title: LOVE_SPACE_TEXT.anniversaryTemplateFirstHug, icon: Sparkles },
  { key: 'first_trip', title: LOVE_SPACE_TEXT.anniversaryTemplateFirstTrip, icon: ImageIcon },
  { key: 'wedding', title: LOVE_SPACE_TEXT.anniversaryTemplateWedding, icon: Package },
];

export const REMINDER_OPTIONS = [
  LOVE_SPACE_TEXT.anniversaryReminderUnset,
  LOVE_SPACE_TEXT.anniversaryReminderSameDay,
  LOVE_SPACE_TEXT.anniversaryReminderAdvance1,
  LOVE_SPACE_TEXT.anniversaryReminderAdvance3,
  LOVE_SPACE_TEXT.anniversaryReminderAdvance7,
] as const;

export const REPEAT_OPTIONS: Array<{ label: string; value: LoveRepeatType }> = [
  { label: LOVE_SPACE_TEXT.anniversaryRepeatNone, value: 'none' },
  { label: LOVE_SPACE_TEXT.anniversaryRepeatYearly, value: 'yearly' },
  { label: LOVE_SPACE_TEXT.anniversaryRepeatMonthly, value: 'monthly' },
];

export const BACKGROUND_OPTIONS = [
  { key: 'pink', className: 'bg-gradient-to-r from-[#f6cad7] to-[#f3adc3]' },
  { key: 'pearl', className: 'bg-gradient-to-r from-[#ffffff] to-[#f3f5f8]' },
  { key: 'purple', className: 'bg-gradient-to-r from-[#d4ccfb] to-[#b9adef]' },
  { key: 'blue', className: 'bg-gradient-to-r from-[#cfe7ff] to-[#b9d8ff]' },
] as const;

export const getDefaultDraft = (todayDate: string): DraftState => ({
  title: '',
  date: todayDate,
  includeStartDay: true,
  calendarType: 'solar',
  reminderText: REMINDER_OPTIONS[0],
  repeatType: 'none',
  backgroundKey: BACKGROUND_OPTIONS[0].key,
});

export const getRepeatLabel = (repeatType: LoveRepeatType): string =>
  REPEAT_OPTIONS.find((item) => item.value === repeatType)?.label ??
  LOVE_SPACE_TEXT.anniversaryRepeatNone;

export const resolveTemplateTitle = (templateKey: string, contactName: string): string => {
  if (templateKey === 'birthday_ta') {
    return `${contactName}${LOVE_SPACE_TEXT.anniversaryTemplateBirthdayTaSuffix}`;
  }
  return ANNIVERSARY_TEMPLATE_DEFS.find((item) => item.key === templateKey)?.title ?? '';
};

export const ANNIVERSARY_CUSTOM_ICON = ClipboardCheck;
