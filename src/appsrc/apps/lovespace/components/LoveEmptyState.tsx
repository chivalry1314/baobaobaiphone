import React from 'react';

import { Heart, Plus } from 'lucide-react';

import { LOVE_SPACE_TEXT } from '../constants';

interface LoveEmptyStateProps {
  onAddBond: () => void;
  allowAddBond?: boolean;
}

export const LoveEmptyState: React.FC<LoveEmptyStateProps> = ({
  onAddBond,
  allowAddBond = true,
}) => {
  return (
    <section className="mt-5 rounded-[26px] border border-rose-100/90 bg-white/92 p-5 text-center shadow-[0_20px_36px_-30px_rgba(180,130,150,0.2)]">
      <div className="w-16 h-16 rounded-full mx-auto bg-rose-50 text-rose-400 flex items-center justify-center">
        <Heart size={30} className="fill-rose-200" />
      </div>
      <p className="mt-3 text-[17px] font-semibold text-slate-700">{LOVE_SPACE_TEXT.emptyTitle}</p>
      <p className="mt-1 text-[13px] text-slate-500">{LOVE_SPACE_TEXT.emptyDescription}</p>
      {allowAddBond ? (
        <button
          onClick={onAddBond}
          className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-rose-50/95 text-rose-500 px-4 py-2 text-[14px] font-semibold border border-rose-100 shadow-[0_12px_24px_-18px_rgba(180,130,150,0.26)] active:scale-95 transition-transform"
        >
          <Plus size={16} />
          {LOVE_SPACE_TEXT.addNow}
        </button>
      ) : null}
    </section>
  );
};
