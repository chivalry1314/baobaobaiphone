import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface WeChatMomentsImagePreviewProps {
  previewState: { images: string[]; index: number } | null;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onTouchStart: (event: React.TouchEvent<HTMLDivElement>) => void;
  onTouchMove: (event: React.TouchEvent<HTMLDivElement>) => void;
  onTouchEnd: () => void;
}

export const WeChatMomentsImagePreview: React.FC<WeChatMomentsImagePreviewProps> = ({
  previewState,
  onClose,
  onPrev,
  onNext,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
}) => (
  <AnimatePresence>
    {previewState ? (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="absolute inset-0 z-[85] bg-black flex flex-col"
      >
        <div className="px-3 pt-12 pb-3 flex items-center text-white">
          <button type="button" onClick={onClose} className="flex items-center active:opacity-70">
            <ChevronLeft size={28} />
            <span className="text-[17px]">返回</span>
          </button>
          <div className="flex-1 text-center text-[14px]">
            {previewState.index + 1}/{previewState.images.length}
          </div>
          <div className="w-[72px]" />
        </div>

        <div
          className="relative flex-1 flex items-center justify-center px-2"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <img
            src={previewState.images[previewState.index]}
            alt={`preview-${previewState.index + 1}`}
            className="max-h-full max-w-full object-contain"
          />

          {previewState.index > 0 ? (
            <button
              type="button"
              onClick={onPrev}
              className="absolute left-2 h-10 w-10 rounded-full bg-black/35 text-white flex items-center justify-center active:opacity-70"
              aria-label="上一张"
            >
              <ChevronLeft size={24} />
            </button>
          ) : null}

          {previewState.index < previewState.images.length - 1 ? (
            <button
              type="button"
              onClick={onNext}
              className="absolute right-2 h-10 w-10 rounded-full bg-black/35 text-white flex items-center justify-center active:opacity-70"
              aria-label="下一张"
            >
              <ChevronRight size={24} />
            </button>
          ) : null}
        </div>
      </motion.div>
    ) : null}
  </AnimatePresence>
);
