import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChevronLeft, Plus, UserRound } from 'lucide-react';
import { TEXT } from '../constants';
import type { MyCard } from '../types';
import { getAvatarColor, getInitial } from '../utils';

interface MyCardsPageProps {
  myCards: MyCard[];
  onBack: () => void;
  onAdd: () => void;
  onActivate: (cardId: string) => void;
  onOpen: (cardId: string) => void;
}

export const MyCardsPage: React.FC<MyCardsPageProps> = ({ myCards, onBack, onAdd, onActivate, onOpen }) => {
  const listRef = useRef<HTMLDivElement | null>(null);
  const virtualizer = useVirtualizer({
    count: myCards.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 124,
    overscan: 10,
    getItemKey: (index) => myCards[index]?.id ?? `my-card-${index}`,
  });

  return (
    <div className="absolute inset-0 z-[90] bg-white flex flex-col">
      <div className="px-5 pt-11 pb-3 flex items-center justify-between border-b border-slate-200 shrink-0">
        <button onClick={onBack} className="text-slate-700">
          <ChevronLeft size={26} />
        </button>
        <h3 className="text-[18px] font-semibold text-slate-900">{TEXT.myCardList}</h3>
        <button onClick={onAdd} className="text-slate-800" aria-label="add-my-card">
          <Plus size={26} />
        </button>
      </div>

      {myCards.length === 0 ? (
        <div className="flex-1 flex items-center justify-center px-10 text-center text-[15px] text-slate-500">
          {TEXT.noMyCards}
        </div>
      ) : (
        <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto px-5 pb-8">
          <div className="relative pt-3" style={{ height: `${virtualizer.getTotalSize()}px` }}>
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const myCard = myCards[virtualRow.index];
              if (!myCard) return null;

              const meta = [myCard.gender, myCard.age && `${myCard.age}岁`].filter(Boolean).join(' · ');

              return (
                <div
                  key={virtualRow.key}
                  ref={virtualizer.measureElement}
                  data-index={virtualRow.index}
                  className="absolute left-0 right-0 pb-3"
                  style={{ transform: `translateY(${virtualRow.start}px)` }}
                >
                  <div
                    className={`relative w-full rounded-2xl border bg-white shadow-[0_8px_26px_-20px_rgba(15,23,42,0.35)] ${
                      myCard.isActive ? 'border-[#1E64D8]/40' : 'border-slate-200'
                    }`}
                  >
                    <button onClick={() => onOpen(myCard.id)} className="w-full px-4 pr-28 pt-3.5 pb-3.5 text-left">
                      <div className="flex items-center gap-3.5">
                        <div className="h-12 w-12 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center text-slate-700 text-[17px] font-semibold">
                          {myCard.avatar ? (
                            <img src={myCard.avatar} alt={myCard.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className={`${getAvatarColor(myCard.name)} w-full h-full flex items-center justify-center`}>
                              {myCard.name ? getInitial(myCard.name) : <UserRound size={18} />}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[17px] font-semibold text-slate-900">{myCard.name || '--'}</p>
                          <p className="truncate text-[13px] text-slate-500">{meta || TEXT.unknown}</p>
                        </div>
                      </div>
                      <div className="mt-2.5 text-[13px] text-slate-500 truncate">{myCard.phone || myCard.wechatId || '--'}</div>
                    </button>

                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onActivate(myCard.id);
                      }}
                      className={`absolute right-3.5 top-3.5 z-10 rounded-full border px-3.5 py-1 text-[12px] font-medium transition-colors ${
                        myCard.isActive
                          ? 'border-[#1E64D8] bg-[#1E64D8] text-white active:bg-[#1A56BC]'
                          : 'border-[#1E64D8] bg-white text-[#1E64D8] active:bg-[#1E64D8]/5'
                      }`}
                    >
                      {myCard.isActive ? '取消激活' : '激活'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
