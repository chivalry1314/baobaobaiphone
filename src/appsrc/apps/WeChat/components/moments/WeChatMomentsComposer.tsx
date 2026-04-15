import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ImagePlus, X } from 'lucide-react';

interface WeChatMomentsComposerProps {
  isOpen: boolean;
  canPublish: boolean;
  draftContent: string;
  draftImages: string[];
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onClose: () => void;
  onPublish: () => void;
  onDraftContentChange: (value: string) => void;
  onChooseImages: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveDraftImage: (index: number) => void;
}

export const WeChatMomentsComposer: React.FC<WeChatMomentsComposerProps> = ({
  isOpen,
  canPublish,
  draftContent,
  draftImages,
  fileInputRef,
  onClose,
  onPublish,
  onDraftContentChange,
  onChooseImages,
  onRemoveDraftImage,
}) => (
  <AnimatePresence>
    {isOpen ? (
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 18 }}
        transition={{ duration: 0.15 }}
        className="absolute inset-0 z-[70] bg-[#F7F7F7] flex flex-col"
      >
        <div className="px-3 pt-12 pb-3 border-b border-gray-200 bg-white flex items-center">
          <button type="button" onClick={onClose} className="text-[17px] text-gray-700 active:opacity-50">
            取消
          </button>
          <h2 className="flex-1 text-center text-[17px] font-semibold text-gray-900">发朋友圈</h2>
          <button
            type="button"
            onClick={onPublish}
            disabled={!canPublish}
            className={`rounded-md px-3 py-1 text-[14px] ${
              canPublish ? 'bg-[#07C160] text-white active:opacity-90' : 'bg-gray-200 text-gray-400'
            }`}
          >
            发布
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          <textarea
            value={draftContent}
            onChange={(event) => onDraftContentChange(event.target.value)}
            placeholder="这一刻的想法..."
            className="w-full min-h-[130px] resize-none bg-transparent text-[16px] text-gray-900 outline-none placeholder:text-gray-400"
          />

          <div className="mt-2 grid grid-cols-3 gap-2">
            {draftImages.map((image, index) => (
              <div key={`draft-${index}`} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                <img src={image} alt="draft" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => onRemoveDraftImage(index)}
                  className="absolute right-1 top-1 h-5 w-5 rounded-full bg-black/50 text-white flex items-center justify-center"
                  aria-label="删除图片"
                  title="删除图片"
                >
                  <X size={14} />
                </button>
              </div>
            ))}

            {draftImages.length < 9 ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-lg border border-dashed border-gray-300 bg-white flex flex-col items-center justify-center text-gray-400 active:bg-gray-50"
              >
                <ImagePlus size={24} />
                <span className="text-[12px] mt-1">图片</span>
              </button>
            ) : null}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={onChooseImages}
          />
        </div>
      </motion.div>
    ) : null}
  </AnimatePresence>
);
