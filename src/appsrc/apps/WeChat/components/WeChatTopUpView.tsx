import React, { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useWeChatStore } from '../store';

export const WeChatTopUpView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [amount, setAmount] = useState('');
  const { topUpWeChatBalance } = useWeChatStore();

  const handleTopUp = () => {
    const value = parseFloat(amount);
    if (!isNaN(value) && value > 0) {
      topUpWeChatBalance(value, { title: '零钱充值' });
      onBack();
    }
  };

  return (
    <div className="absolute inset-0 bg-[#EDEDED] flex flex-col z-50">
      <div className="bg-[#EDEDED] px-3 pt-12 pb-3 flex items-center shrink-0">
        <button onClick={onBack} className="text-gray-900 flex items-center gap-1 active:opacity-50">
          <ChevronLeft size={28} />
          <span className="text-[17px]">{'取消'}</span>
        </button>
        <h1 className="flex-1 text-center text-[17px] font-medium pr-10 text-gray-900">{'充值'}</h1>
      </div>

      <div className="p-4">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-[15px] text-gray-900 mb-6">{'充值金额'}</h2>
          <div className="flex items-end border-b border-gray-200 pb-2 mb-8">
            <span className="text-[36px] font-semibold mr-2 leading-none text-gray-900">¥</span>
            <input
              type="number"
              className="flex-1 text-[44px] font-semibold outline-none bg-transparent w-full leading-none h-[50px] text-gray-900"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              autoFocus
            />
          </div>

          <button
            onClick={handleTopUp}
            disabled={!amount || parseFloat(amount) <= 0}
            className="w-full bg-[#07C160] disabled:bg-[#A9E8C3] text-white rounded py-3 text-[17px] font-medium active:bg-[#06ad56] transition-colors"
          >
            {'充值'}
          </button>
        </div>
      </div>
    </div>
  );
};
