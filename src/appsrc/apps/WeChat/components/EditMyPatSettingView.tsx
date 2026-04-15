import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, XCircle } from 'lucide-react';
import { useWeChatStore } from '../store';

interface EditMyPatSettingViewProps {
  onBack: () => void;
}

const normalizePatSuffix = (value?: string): string => {
  const raw = (value || '').trim();
  if (!raw || raw === '鐨勮偐鑶€') {
    return '的肩膀';
  }
  return raw;
};

export const EditMyPatSettingView: React.FC<EditMyPatSettingViewProps> = ({ onBack }) => {
  const { wechatUserProfile, updateWeChatUserProfile } = useWeChatStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [patSuffix, setPatSuffix] = useState(normalizePatSuffix(wechatUserProfile.patSuffix));

  useEffect(() => {
    if (!inputRef.current) return;
    inputRef.current.focus();
    inputRef.current.setSelectionRange(patSuffix.length, patSuffix.length);
  }, []);

  const previewText = useMemo(() => {
    const suffix = patSuffix.trim();
    return suffix ? `你拍了拍对方${suffix}` : '你拍了拍对方';
  }, [patSuffix]);

  const handleSave = () => {
    updateWeChatUserProfile({ patSuffix: normalizePatSuffix(patSuffix) });
    onBack();
  };

  const currentStoredSuffix = normalizePatSuffix(wechatUserProfile.patSuffix);
  const isChanged = patSuffix.trim() !== currentStoredSuffix;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.15 }}
      className="absolute inset-0 bg-[#EDEDED] flex flex-col z-[70]"
    >
      <div className="bg-[#F7F7F7] px-2 pt-12 pb-2.5 flex items-center border-b border-gray-200 shrink-0">
        <button onClick={onBack} className="text-gray-900 flex items-center active:opacity-50">
          <ChevronLeft size={30} strokeWidth={1.5} />
        </button>
        <h1 className="flex-1 text-center text-[17px] font-semibold text-gray-900 pr-8">拍一拍设置</h1>
        <button
          onClick={handleSave}
          disabled={!isChanged}
          className={`text-[15px] font-medium px-3 py-1.5 rounded-md transition-colors ${
            isChanged ? 'bg-[#07C160] text-white active:bg-[#06ad56]' : 'bg-[#D3EFDF] text-[#86D8A7]'
          }`}
        >
          完成
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mt-3 border-y border-gray-200 bg-white px-4 py-3">
          <div className="text-[14px] text-gray-500 mb-2">拍一拍后显示</div>
          <div className="flex items-center gap-2">
            <span className="text-[16px] text-gray-900 shrink-0">你拍了拍对方</span>
            <input
              ref={inputRef}
              type="text"
              value={patSuffix}
              maxLength={20}
              onChange={(event) => setPatSuffix(event.target.value)}
              className="flex-1 text-[16px] text-gray-900 outline-none placeholder:text-gray-300"
              placeholder="例如：的肩膀"
            />
            {patSuffix.length > 0 && (
              <button onClick={() => setPatSuffix('')} className="p-1 active:opacity-50">
                <XCircle size={20} className="text-gray-300 fill-gray-300 text-white" />
              </button>
            )}
          </div>
        </div>

        <div className="mx-4 mt-4 rounded-xl bg-white px-4 py-3 border border-gray-100">
          <div className="text-[13px] text-gray-500 mb-1">预览</div>
          <div className="text-[16px] text-gray-900">{previewText}</div>
        </div>
      </div>
    </motion.div>
  );
};
