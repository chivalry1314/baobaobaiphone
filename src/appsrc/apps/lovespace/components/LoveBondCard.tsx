import React from 'react';

import { CalendarDays, Heart, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';

import { LOVE_SPACE_TEXT } from '../constants';
import type { BondCardData } from '../types';
import { formatDateText } from '../utils';
import { ContactAvatar } from './ContactAvatar';

interface LoveBondCardProps {
  card: BondCardData;
  index: number;
  onOpenDetail: (bondId: string) => void;
  onRequestRemoveBond: (bondId: string, contactName: string) => void;
  readOnly?: boolean;
}

export const LoveBondCard: React.FC<LoveBondCardProps> = ({
  card,
  index,
  onOpenDetail,
  onRequestRemoveBond,
  readOnly = false,
}) => {
  const handleOpenDetail = () => {
    onOpenDetail(card.bond.id);
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.26, delay: Math.min(index * 0.05, 0.2) }}
      className="rounded-[24px] border border-rose-100/90 bg-white/92 px-4 py-4 shadow-[0_22px_34px_-28px_rgba(180,130,150,0.2)] cursor-pointer"
      onClick={handleOpenDetail}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleOpenDetail();
        }
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex -space-x-2">
            <div className="w-12 h-12 rounded-full border-2 border-white shadow-md bg-gradient-to-br from-rose-200 to-pink-200 text-rose-700 text-[13px] font-semibold flex items-center justify-center">
              {LOVE_SPACE_TEXT.me}
            </div>
            <ContactAvatar contact={card.contact} />
          </div>
          <div className="min-w-0">
            <p className="text-[16px] font-bold text-slate-800 truncate">
              {`${LOVE_SPACE_TEXT.withPrefix} ${card.contact.name} ${LOVE_SPACE_TEXT.togetherSuffix}`}
            </p>
            <p className="text-[12px] text-slate-500 truncate">
              {card.contact.role || LOVE_SPACE_TEXT.defaultRole}
            </p>
          </div>
        </div>
        {!readOnly ? (
          <button
            onClick={(event) => {
              event.stopPropagation();
              onRequestRemoveBond(card.bond.id, card.contact.name);
            }}
            className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 grid place-items-center active:scale-95 transition-transform"
            title={LOVE_SPACE_TEXT.removeBond}
          >
            <Trash2 size={16} />
          </button>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl bg-white/90 border border-rose-100 px-3 py-2.5">
          <p className="text-[11px] text-slate-500">{LOVE_SPACE_TEXT.togetherDays}</p>
          <p className="mt-1 text-[20px] leading-none font-bold text-slate-800">
            {card.days}
            <span className="ml-1 text-[13px] font-medium">{LOVE_SPACE_TEXT.dayUnit}</span>
          </p>
        </div>
        <div className="rounded-2xl bg-white/90 border border-rose-100 px-3 py-2.5">
          <p className="text-[11px] text-slate-500">{LOVE_SPACE_TEXT.heartbeat}</p>
          <p className="mt-1 text-[20px] leading-none font-bold text-rose-500 flex items-center gap-1">
            <Heart size={14} className="fill-rose-300 text-rose-300" />
            {card.heartbeat}
          </p>
        </div>
      </div>

      <div className="mt-3 text-[12px] text-slate-500 flex items-center gap-1.5">
        <CalendarDays size={13} />
        {`${LOVE_SPACE_TEXT.sinceDate}: ${formatDateText(card.bond.sinceDate)}`}
      </div>
    </motion.article>
  );
};
