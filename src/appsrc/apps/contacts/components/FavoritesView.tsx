import React, { useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Phone } from 'lucide-react';
import { TEXT } from '../constants';
import type { Contact } from '../types';
import { getAvatarColor, getInitial } from '../utils';

interface FavoritesViewProps {
  contacts: Contact[];
  onQuickCall: (contactId: string) => void;
  onOpenContact: (contactId: string) => void;
}

export const FavoritesView: React.FC<FavoritesViewProps> = ({ contacts, onQuickCall, onOpenContact }) => {
  const listRef = useRef<HTMLDivElement | null>(null);

  const favoriteContacts = useMemo(
    () => [...contacts].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN')).slice(0, 8),
    [contacts]
  );

  const virtualizer = useVirtualizer({
    count: favoriteContacts.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 84,
    overscan: 10,
    getItemKey: (index) => favoriteContacts[index]?.id ?? `favorite-row-${index}`,
  });

  return (
    <div className="flex-1 min-h-0 overflow-hidden bg-white flex flex-col">
      <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto px-6 pb-28">
        {favoriteContacts.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-[16px]">{TEXT.noFavorites}</div>
        ) : (
          <div className="relative mt-3" style={{ height: `${virtualizer.getTotalSize()}px` }}>
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const contact = favoriteContacts[virtualRow.index];
              if (!contact) return null;

              const isLast = virtualRow.index === favoriteContacts.length - 1;
              return (
                <div
                  key={virtualRow.key}
                  className={`absolute left-0 right-0 px-1 py-3.5 flex items-center gap-3.5 cursor-pointer ${isLast ? '' : 'border-b border-slate-100'}`}
                  style={{ transform: `translateY(${virtualRow.start}px)` }}
                  onClick={() => onOpenContact(contact.id)}
                >
                  <div className="w-11 h-11 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center text-slate-700 text-[17px] font-semibold">
                    {contact.avatar ? (
                      <img src={contact.avatar} alt={contact.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className={`${getAvatarColor(contact.name)} w-full h-full flex items-center justify-center`}>
                        {getInitial(contact.name)}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[17px] font-semibold text-slate-900 truncate">{contact.name}</p>
                    <p className="text-[13px] text-slate-500 truncate">{contact.phone || contact.note || '--'}</p>
                  </div>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      onQuickCall(contact.id);
                    }}
                    className="w-9 h-9 rounded-full bg-[#EAF2FF] text-[#1E64D8] grid place-items-center"
                    aria-label="call"
                  >
                    <Phone size={18} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
