import React from 'react';
import { ChevronLeft, Landmark } from 'lucide-react';
import { useWeChatStore } from '../store';

export const WeChatWalletView: React.FC<{
  onBack: () => void;
  onBalanceClick: () => void;
  onBillClick: () => void;
}> = ({
  onBack,
  onBalanceClick,
  onBillClick,
}) => {
  const { wechatUserProfile } = useWeChatStore();
  const balance = wechatUserProfile.balance || 0;

  return (
    <div className="absolute inset-0 bg-[#EDEDED] flex flex-col z-30">
      <div className="bg-[#EDEDED] px-3 pt-12 pb-3 flex items-center shrink-0">
        <button onClick={onBack} className="text-gray-900 flex items-center gap-1 active:opacity-50">
          <ChevronLeft size={28} />
        </button>
        <h1 className="flex-1 text-center text-[21px] font-semibold text-gray-900">{'钱包'}</h1>
        <button onClick={onBillClick} className="text-[14px] text-gray-900 active:opacity-50">
          {'账单'}
        </button>
      </div>

      <div className="p-2">
        <div
          className="bg-[#27A372] text-white rounded-xl p-6 flex flex-col shadow-sm cursor-pointer active:opacity-90 transition-opacity"
          onClick={onBalanceClick}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Landmark size={22} />
              <span className="text-[16px] font-medium">{'余额'}</span>
            </div>
          </div>
          <div>
            <span className="text-[32px] font-semibold">¥{balance.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
