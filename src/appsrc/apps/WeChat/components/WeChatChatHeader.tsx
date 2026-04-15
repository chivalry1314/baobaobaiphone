import React from 'react';
import { ChevronLeft, MoreHorizontal, Search } from 'lucide-react';

interface WeChatChatHeaderProps {
  isSelectionMode: boolean;
  selectedCount: number;
  characterName: string;
  isTyping: boolean;
  onBack: () => void;
  onExitSelection: () => void;
}

export const WeChatChatHeader: React.FC<WeChatChatHeaderProps> = ({
  isSelectionMode,
  selectedCount,
  characterName,
  isTyping,
  onBack,
  onExitSelection,
}) => {
  if (isSelectionMode) {
    return (
      <div className="bg-[#F7F7F7] px-4 pt-12 pb-2.5 flex items-center border-b border-gray-200 shrink-0">
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
    <div className="bg-[#F7F7F7] px-2 pt-12 pb-2.5 flex items-center border-b border-gray-200 shrink-0">
      <button onClick={onBack} className="text-gray-900 flex items-center active:opacity-50">
        <ChevronLeft size={30} strokeWidth={1.5} />
      </button>
      <h1 className="flex-1 text-center text-[17px] font-medium text-gray-900 truncate px-4">
        {isTyping ? '对方正在输入...' : characterName}
      </h1>
      <button className="text-gray-900 active:opacity-50 px-2">
        <MoreHorizontal size={26} strokeWidth={1.5} />
      </button>
    </div>
  );
};
