import React from 'react';
import { ImagePlus, X } from 'lucide-react';

interface AddSymptomDialogProps {
  isOpen: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  iconDataUrl: string;
  iconError: string;
  inputValue: string;
  inputError: string;
  onClose: () => void;
  onPickIcon: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onResetIcon: () => void;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
}

export const AddSymptomDialog: React.FC<AddSymptomDialogProps> = ({
  isOpen,
  fileInputRef,
  iconDataUrl,
  iconError,
  inputValue,
  inputError,
  onClose,
  onPickIcon,
  onResetIcon,
  onInputChange,
  onSubmit,
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-[80] bg-black/20 backdrop-blur-[1px] flex items-center justify-center px-6">
      <button type="button" aria-label="关闭添加症状弹窗" onClick={onClose} className="absolute inset-0" />

      <section className="relative w-full max-w-[340px] rounded-3xl bg-white border border-rose-100 shadow-[0_20px_36px_-24px_rgba(244,77,143,0.6)] p-4">
        <h3 className="text-[19px] font-semibold text-slate-900 text-center">添加症状</h3>
        <p className="mt-1 text-[13px] text-center text-slate-400">记录你的个性化感受，方便后续分析</p>

        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onPickIcon} />

        <div className="mt-4 rounded-2xl border border-rose-100 bg-[#fff7fb] p-3 flex items-center gap-3">
          <span className="w-14 h-14 rounded-2xl grid place-items-center bg-gradient-to-br from-[#ffd9e8] to-[#ffc6dc] text-[22px]">
            {iconDataUrl ? <img src={iconDataUrl} alt="" className="w-12 h-12 rounded-xl object-cover" /> : '✨'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-medium text-slate-800">症状图标</p>
            <p className="mt-0.5 text-[12px] text-slate-500">可上传图片，不上传将使用默认图标</p>
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-8 px-3 rounded-full bg-[#f24f8f] text-white text-[12px] font-semibold inline-flex items-center gap-1.5"
              >
                <ImagePlus size={14} />
                上传图片
              </button>
              {iconDataUrl ? (
                <button
                  type="button"
                  onClick={onResetIcon}
                  className="h-8 px-3 rounded-full border border-rose-200 text-[#e05692] text-[12px] font-semibold inline-flex items-center gap-1.5"
                >
                  <X size={13} />
                  默认图标
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {iconError ? <p className="mt-1.5 text-[12px] text-[#e95493]">{iconError}</p> : null}

        <input
          autoFocus
          type="text"
          value={inputValue}
          maxLength={8}
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              onSubmit();
            }
          }}
          placeholder="请输入症状名称"
          className="mt-4 w-full h-11 rounded-xl border border-rose-100 bg-rose-50/40 px-3 text-[15px] text-slate-700 placeholder:text-slate-400 outline-none focus:border-[#f28ab4] focus:ring-2 focus:ring-[#f7d4e5]"
        />

        {inputError ? <p className="mt-1.5 text-[12px] text-[#e95493]">{inputError}</p> : null}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl border border-slate-200 bg-white text-[14px] font-medium text-slate-500 active:scale-[0.99] transition-transform"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onSubmit}
            className="h-10 rounded-xl bg-[#f24f8f] text-[14px] font-semibold text-white active:scale-[0.99] transition-transform"
          >
            添加
          </button>
        </div>
      </section>
    </div>
  );
};
