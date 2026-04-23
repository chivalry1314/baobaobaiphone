import React from 'react';
import { ChevronLeft, MoreHorizontal, Search } from 'lucide-react';

interface WeChatChatHeaderProps {
  isSelectionMode: boolean;
  selectedCount: number;
  characterName: string;
  isTyping: boolean;
  onBack: () => void;
  onReturnToShopping?: () => void;
  onExitSelection: () => void;
}

export const WeChatChatHeader: React.FC<WeChatChatHeaderProps> = ({
  isSelectionMode,
  selectedCount,
  characterName,
  isTyping,
  onBack,
  onReturnToShopping,
  onExitSelection,
}) => {
  if (isSelectionMode) {
    return (
      <div className="sticky top-0 z-20 shrink-0 border-b border-gray-200 bg-[#F7F7F7] px-4 pb-2.5 pt-12 flex items-center">
        <button onClick={onExitSelection} className="text-gray-900 text-[16px] active:opacity-50">
          {'取消'}
        </button>
        <h1 className="flex-1 text-center text-[17px] font-medium text-gray-900">
          {'已选择'} {selectedCount} {'条消息'}
        </h1>
        <button className="text-gray-900 active:opacity-50">
          <Search size={22} strokeWidth={1.5} />
        </button>
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-20 shrink-0 border-b border-gray-200 bg-[#F7F7F7] px-2 pb-2.5 pt-12 flex items-center">
      <div className="flex min-w-[54px] flex-col items-start justify-center gap-1">
        {onReturnToShopping ? (
          <button
            type="button"
            onClick={onReturnToShopping}
            className="flex items-center gap-0.5 pl-1 text-[11px] font-medium text-[#576B95] active:opacity-50"
          >
            <ChevronLeft size={12} strokeWidth={2} />
            <span>去购物</span>
          </button>
        ) : null}
        <button onClick={onBack} className="text-gray-900 flex items-center active:opacity-50">
          <ChevronLeft size={30} strokeWidth={1.5} />
        </button>
      </div>
      <h1 className="flex-1 text-center text-[17px] font-medium text-gray-900 truncate px-4">
        {isTyping ? '对方正在输入...' : characterName}
      </h1>
      <button className="text-gray-900 active:opacity-50 px-2">
        <MoreHorizontal size={26} strokeWidth={1.5} />
      </button>
    </div>
  );
};
