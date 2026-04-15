import React from 'react';
import { ChevronLeft, CircleDollarSign } from 'lucide-react';
import { useWeChatStore } from '../store';

export const WeChatBalanceView: React.FC<{
  onBack: () => void;
  onTopUpClick: () => void;
  onWithdrawClick: () => void;
}> = ({ onBack, onTopUpClick, onWithdrawClick }) => {
  const { wechatUserProfile } = useWeChatStore();
  const balance = wechatUserProfile.balance || 0;

  return (
    <div className="absolute inset-0 bg-white flex flex-col z-40">
      <div className="bg-white px-3 pt-12 pb-3 flex items-center shrink-0">
        <button onClick={onBack} className="text-gray-900 flex items-center gap-1 active:opacity-50">
          <ChevronLeft size={28} />
          <span className="text-[17px]">{'返回'}</span>
        </button>
        <h1 className="flex-1 text-center text-[17px] font-medium pr-10 text-gray-900">{'零钱'}</h1>
      </div>

      <div className="flex-1 flex flex-col items-center pt-16 px-6">
        <CircleDollarSign size={64} className="text-[#F1B136] mb-4" strokeWidth={1.5} />
        <span className="text-[15px] text-gray-500 mb-2">{'我的零钱'}</span>
        <span className="text-[44px] font-bold mb-16 text-gray-900">¥{balance.toFixed(2)}</span>

        <button
          onClick={onTopUpClick}
          className="w-full max-w-[200px] bg-[#07C160] text-white rounded flex items-center justify-center py-2.5 text-[17px] font-medium active:bg-[#06ad56]"
        >
          {'充值'}
        </button>

        <button
          onClick={onWithdrawClick}
          className="w-full max-w-[200px] bg-[#F2F2F2] text-[#07C160] font-medium rounded flex items-center justify-center py-2.5 text-[17px] active:bg-gray-200"
        >
          {'提现'}
        </button>
      </div>
    </div>
  );
};
