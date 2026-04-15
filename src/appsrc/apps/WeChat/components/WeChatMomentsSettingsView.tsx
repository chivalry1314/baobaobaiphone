import React from 'react';
import { ChevronLeft, Image as ImageIcon } from 'lucide-react';
import { useWeChatStore } from '../store';
import type { WeChatMomentsSettingsViewProps } from '../types';

export const WeChatMomentsSettingsView: React.FC<WeChatMomentsSettingsViewProps> = ({ onBack }) => {
  const { wechatUserProfile, updateWeChatUserProfile } = useWeChatStore();

  return (
    <div className="absolute inset-0 z-[70] bg-[#EDEDED] flex flex-col">
      <div className="bg-[#F7F7F7] px-3 pt-12 pb-3 flex items-center border-b border-gray-200 shrink-0">
        <button onClick={onBack} className="text-gray-900 flex items-center active:opacity-50">
          <ChevronLeft size={28} />
          <span className="text-[17px]">返回</span>
        </button>
        <h1 className="flex-1 text-center text-[17px] font-semibold text-gray-900 pr-10">朋友圈设置</h1>
      </div>

      <div className="p-3">
        <div className="rounded-xl bg-white border border-gray-100 p-3">
          <div className="text-[15px] font-semibold text-gray-900">封面管理</div>
          <div className="text-[12px] text-gray-500 mt-0.5">清空封面后将恢复默认渐变背景</div>
          <div className="mt-2 h-24 rounded-lg border border-gray-200 overflow-hidden bg-gradient-to-b from-[#dbeafe] to-[#f8fafc]">
            {wechatUserProfile.backgroundImage ? (
              <img src={wechatUserProfile.backgroundImage} alt="moments-cover" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-gray-400 text-[12px]">
                <ImageIcon size={16} className="mr-1" /> 当前无自定义封面
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => updateWeChatUserProfile({ backgroundImage: '' })}
            className="mt-2 h-9 px-3 rounded-md border border-gray-200 text-gray-600 text-[13px] active:bg-gray-50"
          >
            清空朋友圈封面
          </button>
        </div>
      </div>
    </div>
  );
};
