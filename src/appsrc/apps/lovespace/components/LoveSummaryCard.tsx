import React from 'react';

import { Plus, Sparkles } from 'lucide-react';

import { LOVE_SPACE_TEXT } from '../constants';

interface LoveSummaryCardProps {
  hasBonds: boolean;
  totalHeartbeat: number;
  onAddBond: () => void;
  allowAddBond?: boolean;
}

export const LoveSummaryCard: React.FC<LoveSummaryCardProps> = ({
  hasBonds,
  totalHeartbeat,
  onAddBond,
  allowAddBond = true,
}) => {
  return (
    <section className="rounded-[28px] border border-rose-100/90 bg-white/92 px-4 py-4 shadow-[0_18px_32px_-28px_rgba(180,130,150,0.2)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] text-rose-400">{LOVE_SPACE_TEXT.summaryTitle}</p>
          <p className="mt-1 text-[20px] font-bold text-rose-600">
            {hasBonds
              ? `${totalHeartbeat.toLocaleString('zh-CN')} ${LOVE_SPACE_TEXT.heartSymbol}`
              : LOVE_SPACE_TEXT.noBondSummary}
          </p>
        </div>
        {allowAddBond ? (
          <button
            onClick={onAddBond}
            className="shrink-0 rounded-full bg-rose-50/95 text-rose-500 px-3.5 py-2 text-[13px] font-semibold flex items-center gap-1.5 border border-rose-100 shadow-[0_10px_24px_-18px_rgba(180,130,150,0.26)] active:scale-95 transition-transform"
          >
            <Plus size={15} />
            {LOVE_SPACE_TEXT.addBond}
          </button>
        ) : null}
      </div>
      <div className="mt-3 rounded-2xl bg-rose-50/75 border border-rose-100 px-3 py-2.5 text-[13px] text-rose-500 flex items-center gap-2">
        <Sparkles size={14} />
        {LOVE_SPACE_TEXT.summaryHint}
      </div>
    </section>
  );
};
