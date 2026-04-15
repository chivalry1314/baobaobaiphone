import React, { useEffect, useMemo, useState } from 'react';

import { ChevronLeft, ChevronRight, Heart, Plus, X } from 'lucide-react';
import { motion } from 'motion/react';

import { LOVE_SPACE_TEXT } from '../constants';
import type { BondCardData, LoveAnniversary, SaveLoveAnniversaryPayload } from '../types';
import {
  calcElapsedDays,
  formatDateText,
  formatDateWithWeekday,
  getTodayDateInput,
} from '../utils';
import {
  ANNIVERSARY_CUSTOM_ICON,
  ANNIVERSARY_TEMPLATE_DEFS,
  BACKGROUND_OPTIONS,
  getDefaultDraft,
  getRepeatLabel,
  REMINDER_OPTIONS,
  REPEAT_OPTIONS,
  resolveTemplateTitle,
  type DraftState,
} from './anniversaryConfig';
import { ContactAvatar } from './ContactAvatar';

interface LoveAnniversaryPageProps {
  card: BondCardData;
  anniversaries: LoveAnniversary[];
  onBack: () => void;
  onSaveAnniversary: (payload: SaveLoveAnniversaryPayload) => void;
  readOnly?: boolean;
}

export const LoveAnniversaryPage: React.FC<LoveAnniversaryPageProps> = ({
  card,
  anniversaries,
  onBack,
  onSaveAnniversary,
  readOnly = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<DraftState>(() => getDefaultDraft(getTodayDateInput()));

  const bondAnniversaries = useMemo(
    () =>
      anniversaries
        .filter((item) => item.bondId === card.bond.id)
        .sort((left, right) => right.createdAt - left.createdAt),
    [anniversaries, card.bond.id]
  );

  const presetAnniversaryMap = useMemo(
    () =>
      new Map(
        bondAnniversaries
          .filter((item) => item.presetKey)
          .map((item) => [item.presetKey as string, item])
      ),
    [bondAnniversaries]
  );

  const customAnniversaries = useMemo(
    () => bondAnniversaries.filter((item) => !item.presetKey),
    [bondAnniversaries]
  );

  const startEditing = (partial?: Partial<DraftState>) => {
    if (readOnly) return;
    setDraft({
      ...getDefaultDraft(getTodayDateInput()),
      ...partial,
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    if (readOnly) return;
    const title = draft.title.trim();
    if (!title) return;
    onSaveAnniversary({
      bondId: card.bond.id,
      ...draft,
      title,
    });
    setIsEditing(false);
  };

  useEffect(() => {
    if (readOnly && isEditing) {
      setIsEditing(false);
    }
  }, [isEditing, readOnly]);

  const cycleReminder = () => {
    const currentIndex = REMINDER_OPTIONS.findIndex((item) => item === draft.reminderText);
    const nextIndex = (currentIndex + 1) % REMINDER_OPTIONS.length;
    setDraft((current) => ({ ...current, reminderText: REMINDER_OPTIONS[nextIndex] }));
  };

  const cycleRepeat = () => {
    const currentIndex = REPEAT_OPTIONS.findIndex((item) => item.value === draft.repeatType);
    const nextIndex = (currentIndex + 1) % REPEAT_OPTIONS.length;
    setDraft((current) => ({ ...current, repeatType: REPEAT_OPTIONS[nextIndex].value }));
  };

  const cycleBackground = () => {
    const currentIndex = BACKGROUND_OPTIONS.findIndex((item) => item.key === draft.backgroundKey);
    const nextIndex = (currentIndex + 1) % BACKGROUND_OPTIONS.length;
    setDraft((current) => ({ ...current, backgroundKey: BACKGROUND_OPTIONS[nextIndex].key }));
  };

  if (isEditing) {
    const selectedBackground =
      BACKGROUND_OPTIONS.find((item) => item.key === draft.backgroundKey) ?? BACKGROUND_OPTIONS[0];

    return (
      <motion.section
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 16 }}
        className="absolute inset-0 z-50 bg-[#f5f6f8] text-slate-900 flex flex-col"
      >
        <header className="bg-[#fff8fc] px-4 pt-12 pb-3 border-b border-rose-100 flex items-center">
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="w-11 h-11 grid place-items-center text-slate-700 active:scale-95 transition-transform"
            aria-label={LOVE_SPACE_TEXT.cancel}
          >
            <X size={26} />
          </button>
          <h2 className="flex-1 text-center text-[20px] font-semibold">
            {LOVE_SPACE_TEXT.anniversaryAddTitle}
          </h2>
          <button
            type="button"
            onClick={handleSave}
            disabled={!draft.title.trim()}
            className={`h-9 min-w-20 rounded-full text-[15px] font-semibold px-4 ${
              draft.title.trim()
                ? 'bg-gradient-to-r from-[#ff6c9e] to-[#f35588] text-white shadow-[0_12px_22px_-16px_rgba(243,85,136,0.75)] active:scale-95 transition-transform'
                : 'bg-slate-200 text-slate-400'
            }`}
          >
            {LOVE_SPACE_TEXT.anniversaryDone}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-4">
          <div className={`h-26 rounded-[20px] ${selectedBackground.className}`} />

          <section className="mt-[-18px] rounded-[18px] bg-white border border-slate-100 overflow-hidden shadow-[0_18px_34px_-30px_rgba(15,23,42,0.35)]">
            <div className="px-4 py-4 border-b border-slate-100 min-h-[72px] flex items-center">
              <input
                value={draft.title}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, title: event.target.value }))
                }
                placeholder={LOVE_SPACE_TEXT.anniversaryAddPlaceholder}
                className="w-full text-[17px] text-slate-800 placeholder:text-slate-400 bg-transparent outline-none"
              />
            </div>

            <div className="px-4 py-4 border-b border-slate-100 min-h-[72px] flex items-center">
              <div className="flex items-center justify-between gap-3">
                <input
                  type="date"
                  value={draft.date}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, date: event.target.value }))
                  }
                  className="text-[17px] text-slate-900 bg-transparent outline-none"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((current) => ({ ...current, calendarType: 'solar' }))
                    }
                    className={`px-3 py-1.5 rounded-full text-[14px] font-medium ${
                      draft.calendarType === 'solar'
                        ? 'bg-rose-100 text-rose-500'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {LOVE_SPACE_TEXT.anniversarySolar}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((current) => ({ ...current, calendarType: 'lunar' }))
                    }
                    className={`px-3 py-1.5 rounded-full text-[14px] font-medium ${
                      draft.calendarType === 'lunar'
                        ? 'bg-rose-100 text-rose-500'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {LOVE_SPACE_TEXT.anniversaryLunar}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  includeStartDay: !current.includeStartDay,
                }))
              }
              className="w-full px-4 py-4 border-b border-slate-100 text-left min-h-[84px]"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[17px] text-slate-900">
                    {LOVE_SPACE_TEXT.anniversaryIncludeStartDay}
                  </p>
                  <p className="mt-1 text-[13px] text-slate-400">
                    {LOVE_SPACE_TEXT.anniversaryIncludeStartDayHint}
                  </p>
                </div>
                <div
                  className={`w-12 h-7 rounded-full p-0.5 transition-colors ${
                    draft.includeStartDay ? 'bg-rose-300' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`block w-6 h-6 rounded-full bg-white shadow transition-transform ${
                      draft.includeStartDay ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={cycleReminder}
              className="w-full px-4 py-4 border-b border-slate-100 text-left min-h-[84px]"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[17px] text-slate-900">
                    {LOVE_SPACE_TEXT.anniversaryReminder}
                  </p>
                  <p className="mt-1 text-[13px] text-slate-400">
                    {LOVE_SPACE_TEXT.anniversaryReminderHint}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-[16px] text-slate-700">
                  <span>{draft.reminderText}</span>
                  <ChevronRight size={20} className="text-slate-300" />
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={cycleRepeat}
              className="w-full px-4 py-4 border-b border-slate-100 text-left min-h-[72px]"
            >
              <div className="flex items-center justify-between">
                <p className="text-[17px] text-slate-900">{LOVE_SPACE_TEXT.anniversaryRepeat}</p>
                <div className="flex items-center gap-1 text-[16px] text-slate-700">
                  <span>{getRepeatLabel(draft.repeatType)}</span>
                  <ChevronRight size={20} className="text-slate-300" />
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={cycleBackground}
              className="w-full px-4 py-4 text-left min-h-[72px]"
            >
              <div className="flex items-center justify-between">
                <p className="text-[17px] text-slate-900">
                  {LOVE_SPACE_TEXT.anniversaryBackground}
                </p>
                <div className="flex items-center gap-2">
                  <span className={`w-14 h-10 rounded-lg ${selectedBackground.className}`} />
                  <ChevronRight size={20} className="text-slate-300" />
                </div>
              </div>
            </button>
          </section>
        </main>
      </motion.section>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      className="absolute inset-0 z-50 bg-[#f5f6f8] text-slate-900 flex flex-col overflow-hidden"
    >
      <header className="bg-gradient-to-r from-[#ffd9e7] to-[#ffcddd] text-rose-600 px-4 pt-10 pb-3 border-b border-rose-100">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 grid place-items-center active:scale-95 transition-transform"
            aria-label={LOVE_SPACE_TEXT.back}
          >
            <ChevronLeft size={26} />
          </button>
          <h2 className="text-[20px] font-semibold tracking-wide">
            {LOVE_SPACE_TEXT.anniversaryPageTitle}
          </h2>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pb-28 pt-10">
        <section className="relative rounded-[22px] bg-gradient-to-r from-[#f8b8ca] to-[#f68faf] px-5 pb-5 pt-11 text-white shadow-[0_22px_36px_-30px_rgba(239,102,147,0.65)]">
          <div className="absolute left-1/2 -top-9 -translate-x-1/2 flex -space-x-2">
            <div className="w-16 h-16 rounded-full border-[3px] border-white bg-[#f6d7e3] text-[#cf315f] text-[22px] font-bold flex items-center justify-center shadow-[0_12px_22px_-16px_rgba(15,23,42,0.55)]">
              {LOVE_SPACE_TEXT.me}
            </div>
            <ContactAvatar contact={card.contact} sizeClassName="w-16 h-16" />
          </div>

          <p className="text-center text-[18px]">
            {LOVE_SPACE_TEXT.anniversaryTogetherTitle}
            {LOVE_SPACE_TEXT.anniversaryElapsedPrefix}
            <span className="ml-1 text-[36px] font-bold leading-none align-middle">
              {card.days}
            </span>
            <span className="ml-1">{LOVE_SPACE_TEXT.dayUnit}</span>
          </p>
          <p className="mt-2 text-center text-[15px] text-white/85">
            {`${LOVE_SPACE_TEXT.anniversarySinceLabel}: ${formatDateWithWeekday(card.bond.sinceDate)}`}
          </p>
        </section>

        <section className="mt-4 rounded-[18px] bg-white border border-slate-100 overflow-hidden divide-y divide-slate-100">
          <div className="px-4 py-4 min-h-[84px] flex items-center gap-3">
            <Heart size={24} className="text-rose-400" />
            <div className="flex-1 min-w-0">
              <p className="text-[17px] font-medium text-slate-900">
                {LOVE_SPACE_TEXT.anniversaryTogetherTitle}
              </p>
              <p className="text-[13px] text-slate-500">{formatDateText(card.bond.sinceDate)}</p>
            </div>
            <p className="text-[16px] text-slate-700">
              {LOVE_SPACE_TEXT.anniversaryElapsedPrefix}
              <span className="mx-1 text-rose-500 text-[28px] font-semibold leading-none">
                {card.days}
              </span>
              {LOVE_SPACE_TEXT.dayUnit}
            </p>
          </div>

          {ANNIVERSARY_TEMPLATE_DEFS.map((template) => {
            const Icon = template.icon;
            const templateTitle = resolveTemplateTitle(template.key, card.contact.name);
            const existing = presetAnniversaryMap.get(template.key);
            const elapsedDays = existing
              ? calcElapsedDays(existing.date, existing.includeStartDay)
              : 0;

            return (
              <div key={template.key} className="px-4 py-4 min-h-[84px] flex items-center gap-3">
                <Icon size={24} className="text-rose-300" />
                <div className="flex-1 min-w-0">
                  <p className="text-[16px] text-slate-900 truncate">{templateTitle}</p>
                  {existing ? (
                    <p className="text-[13px] text-slate-500">{formatDateText(existing.date)}</p>
                  ) : null}
                </div>
                {existing ? (
                  <p className="text-[15px] text-slate-600">{`${LOVE_SPACE_TEXT.anniversaryElapsedPrefix} ${elapsedDays} ${LOVE_SPACE_TEXT.dayUnit}`}</p>
                ) : !readOnly ? (
                  <button
                    type="button"
                    onClick={() =>
                      startEditing({
                        title: templateTitle,
                        presetKey: template.key,
                      })
                    }
                    className="w-9 h-9 rounded-full border border-rose-200 text-rose-400 grid place-items-center active:scale-95 transition-transform shadow-[0_8px_16px_-14px_rgba(239,102,147,0.7)]"
                    aria-label={`Add ${templateTitle}`}
                  >
                    <Plus size={18} />
                  </button>
                ) : null}
              </div>
            );
          })}

          {customAnniversaries.map((item) => {
            const elapsedDays = calcElapsedDays(item.date, item.includeStartDay);
            const CustomIcon = ANNIVERSARY_CUSTOM_ICON;
            return (
              <div key={item.id} className="px-4 py-4 min-h-[84px] flex items-center gap-3">
                <CustomIcon size={24} className="text-rose-300" />
                <div className="flex-1 min-w-0">
                  <p className="text-[16px] text-slate-900 truncate">{item.title}</p>
                  <p className="text-[13px] text-slate-500">{formatDateText(item.date)}</p>
                </div>
                <p className="text-[15px] text-slate-600">{`${LOVE_SPACE_TEXT.anniversaryElapsedPrefix} ${elapsedDays} ${LOVE_SPACE_TEXT.dayUnit}`}</p>
              </div>
            );
          })}
        </section>
      </main>

      {!readOnly ? (
        <button
          type="button"
          onClick={() => startEditing()}
          className="absolute right-5 bottom-8 w-[60px] h-[60px] rounded-full bg-gradient-to-r from-[#ff6b9e] to-[#f55286] text-white shadow-[0_18px_30px_-20px_rgba(244,82,134,0.85)] grid place-items-center active:scale-95 transition-transform"
          aria-label={LOVE_SPACE_TEXT.anniversaryFloatingAdd}
        >
          <Plus size={30} />
        </button>
      ) : null}
    </motion.section>
  );
};
