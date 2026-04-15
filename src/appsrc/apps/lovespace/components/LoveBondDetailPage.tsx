import React, { useRef } from 'react';

import {
  CalendarDays,
  ChevronLeft,
  Clock3,
  ClipboardCheck,
  Globe2,
  Heart,
  Image as ImageIcon,
} from 'lucide-react';
import { motion } from 'motion/react';

import { LOVE_SPACE_TEXT } from '../constants';
import type { BondCardData } from '../types';
import { ContactAvatar } from './ContactAvatar';

interface LoveBondDetailPageProps {
  card: BondCardData;
  backgroundImage?: string;
  onUploadBackground: (imageDataUrl: string) => void;
  onBack: () => void;
  onOpenAnniversary: () => void;
  onOpenMoments: () => void;
  onOpenTimeline: () => void;
  onOpenCheckIn: () => void;
  readOnly?: boolean;
}

const shortcutItems = [
  { id: 'anniversary', label: LOVE_SPACE_TEXT.detailShortcutAnniversary, icon: CalendarDays },
  { id: 'moments', label: LOVE_SPACE_TEXT.detailShortcutMoments, icon: ImageIcon },
  { id: 'quiz', label: LOVE_SPACE_TEXT.detailShortcutQuiz, icon: Clock3 },
  { id: 'checkin', label: LOVE_SPACE_TEXT.detailShortcutCheckIn, icon: ClipboardCheck },
  { id: 'dynamic', label: LOVE_SPACE_TEXT.detailShortcutDynamic, icon: Globe2 },
] as const;

export const LoveBondDetailPage: React.FC<LoveBondDetailPageProps> = ({
  card,
  backgroundImage,
  onUploadBackground,
  onBack,
  onOpenAnniversary,
  onOpenMoments,
  onOpenTimeline,
  onOpenCheckIn,
  readOnly = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handlePickBackground = () => {
    if (readOnly) return;
    fileInputRef.current?.click();
  };

  const handleBackgroundFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) {
      event.currentTarget.value = '';
      return;
    }

    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      event.currentTarget.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUploadBackground(reader.result);
      }
    };
    reader.readAsDataURL(file);
    event.currentTarget.value = '';
  };

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-40 overflow-hidden text-white"
    >
      {backgroundImage ? (
        <>
          <img src={backgroundImage} alt={LOVE_SPACE_TEXT.detailUploadBackground} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-white/16" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/22 via-white/8 to-black/20" />
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-gradient-to-b from-[#fffbfd] via-[#fff7fb] to-[#fff1f7]" />
          <div className="absolute -top-24 -left-16 w-72 h-72 rounded-full bg-white/65 blur-2xl" />
          <div className="absolute top-28 -right-20 w-72 h-72 rounded-full bg-rose-100/45 blur-2xl" />
        </>
      )}

      <div className="relative z-10 flex h-full flex-col px-4 pb-7 pt-12">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="w-12 h-12 rounded-full bg-white/95 border border-slate-200 shadow-[0_10px_22px_-18px_rgba(15,23,42,0.4)] grid place-items-center active:scale-95 transition-transform text-slate-600"
            aria-label={LOVE_SPACE_TEXT.back}
          >
            <ChevronLeft size={28} />
          </button>
          {readOnly ? (
            <span className="w-12 h-12" />
          ) : (
            <button
              type="button"
              onClick={handlePickBackground}
              className="w-12 h-12 rounded-full bg-white/95 border border-slate-200 shadow-[0_10px_22px_-18px_rgba(15,23,42,0.4)] grid place-items-center active:scale-95 transition-transform text-slate-600"
              aria-label={LOVE_SPACE_TEXT.detailUploadBackground}
            >
              <ImageIcon size={24} />
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleBackgroundFileChange}
          className="hidden"
        />

        <div className="mt-6 flex items-center gap-3">
          <div className="flex -space-x-2">
            <div className="w-16 h-16 rounded-full border-[3px] border-white shadow-[0_10px_24px_-16px_rgba(15,23,42,0.55)] bg-[#f6d7e3] text-[#cf315f] text-[22px] font-bold flex items-center justify-center">
              {LOVE_SPACE_TEXT.me}
            </div>
            <ContactAvatar contact={card.contact} sizeClassName="w-16 h-16" />
          </div>
          <p className="text-[18px] leading-none font-semibold text-slate-700 drop-shadow-[0_1px_0_rgba(255,255,255,0.55)]">
            {`${LOVE_SPACE_TEXT.detailTogetherPrefix} ${card.days} ${LOVE_SPACE_TEXT.dayUnit}`}
          </p>
        </div>

        <div className="mt-6 inline-flex w-fit max-w-full items-center gap-3 rounded-full bg-white/94 border border-white/90 px-4 py-2.5 shadow-[0_16px_30px_-26px_rgba(15,23,42,0.56)]">
          <span className="text-[16px] text-slate-800 truncate">{LOVE_SPACE_TEXT.detailReminderText}</span>
          <button
            type="button"
            className="shrink-0 rounded-full bg-gradient-to-r from-[#f4a7bf] to-[#f08db0] text-white text-[16px] font-semibold px-4 py-1.5 active:scale-95 transition-transform"
          >
            {LOVE_SPACE_TEXT.detailRemindAction}
          </button>
        </div>

        <div className="absolute right-4 bottom-52 flex flex-col items-center gap-1.5">
          <ContactAvatar contact={card.contact} sizeClassName="w-20 h-20" />
          <span className="rounded-full bg-gradient-to-r from-[#8f74d5] to-[#6f58c3] text-white text-[12px] px-3 py-1.5 shadow-[0_10px_20px_-14px_rgba(79,58,146,0.66)]">
            {LOVE_SPACE_TEXT.detailFutureNote}
          </span>
        </div>

        <div className="mt-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/95 bg-white/92 px-4 py-2.5 text-slate-800 text-[18px] shadow-[0_16px_28px_-20px_rgba(15,23,42,0.4)]">
            <Heart size={22} className="fill-rose-300 text-rose-300" />
            <span className="font-medium">{LOVE_SPACE_TEXT.detailMoodTag}</span>
          </div>

          <div className="mt-4 grid grid-cols-5 gap-2.5">
            {shortcutItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.id === 'anniversary') {
                      onOpenAnniversary();
                      return;
                    }
                    if (item.id === 'moments') {
                      onOpenMoments();
                      return;
                    }
                    if (item.id === 'quiz') {
                      onOpenTimeline();
                      return;
                    }
                    if (item.id === 'checkin') {
                      onOpenCheckIn();
                    }
                  }}
                  className="h-36 rounded-[22px] bg-white/90 border border-white/95 text-slate-700 flex flex-col items-center justify-center gap-3 shadow-[0_14px_26px_-22px_rgba(15,23,42,0.45)] active:scale-[0.98] transition-transform"
                >
                  <Icon size={30} strokeWidth={1.8} className="text-slate-400" />
                  <span className="text-[12px] leading-tight">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </motion.section>
  );
};
