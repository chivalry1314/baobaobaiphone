import React from 'react';
import { ChevronLeft, Wallet } from 'lucide-react';

export const WeChatServicesView: React.FC<{ onBack: () => void; onWalletClick: () => void }> = ({
  onBack,
  onWalletClick,
}) => (
  <div className="absolute inset-0 bg-[#EDEDED] flex flex-col z-20">
    <div className="bg-[#EDEDED] px-3 pt-12 pb-3 flex items-center shrink-0">
      <button onClick={onBack} className="text-gray-900 flex items-center gap-1 active:opacity-50">
        <ChevronLeft size={28} />
        <span className="text-[17px]">{'返回'}</span>
      </button>
      <h1 className="flex-1 text-center text-[17px] font-medium pr-10 text-gray-900">{'服务'}</h1>
    </div>

    <div className="p-2">
      <div
        className="bg-white rounded-xl p-5 flex items-center justify-between shadow-sm cursor-pointer active:bg-gray-50 transition-colors"
        onClick={onWalletClick}
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-[#27A372] rounded flex items-center justify-center text-white">
            <Wallet size={24} />
          </div>
          <span className="text-[16px] text-gray-900">{'钱包'}</span>
        </div>
        <span className="text-gray-400 text-[15px]">¥***</span>
      </div>
    </div>
  </div>
);
