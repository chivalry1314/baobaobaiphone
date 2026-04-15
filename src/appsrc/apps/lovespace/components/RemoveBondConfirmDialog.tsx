import React from 'react';

import { AlertTriangle } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

import { LOVE_SPACE_TEXT } from '../constants';

interface RemoveBondConfirmDialogProps {
  isOpen: boolean;
  contactName: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export const RemoveBondConfirmDialog: React.FC<RemoveBondConfirmDialogProps> = ({
  isOpen,
  contactName,
  onCancel,
  onConfirm,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-[90] bg-slate-900/22 flex items-end px-4 pb-8"
          onClick={onCancel}
        >
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="w-full rounded-[26px] border border-slate-200/90 bg-white/95 px-4 py-4 shadow-[0_24px_44px_-32px_rgba(15,23,42,0.28)]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <AlertTriangle size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold text-slate-900">
                  {`${LOVE_SPACE_TEXT.removeBondConfirmTitle} ${contactName}`}
                </p>
                <p className="mt-1 text-[12px] text-slate-500">{LOVE_SPACE_TEXT.removeBondConfirmHint}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={onCancel}
                className="h-10 rounded-xl bg-white text-slate-600 border border-slate-200 text-[14px] font-semibold active:scale-[0.99] transition-transform"
              >
                {LOVE_SPACE_TEXT.cancel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="h-10 rounded-xl bg-slate-900 text-white border border-slate-900 text-[14px] font-semibold shadow-[0_10px_20px_-16px_rgba(15,23,42,0.45)] active:scale-[0.99] transition-transform"
              >
                {LOVE_SPACE_TEXT.confirmRemoveBond}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
