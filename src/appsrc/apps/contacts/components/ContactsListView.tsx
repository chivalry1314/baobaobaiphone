import React, { useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Search, UserRound } from 'lucide-react';
import { LETTER_INDEX, TEXT } from '../constants';
import type { Contact } from '../types';
import { getAvatarColor, getGroupKey, getInitial } from '../utils';

interface ContactsListViewProps {
  contacts: Contact[];
  onOpenContact: (contactId: string) => void;
  onOpenMyCards: () => void;
  showMyCardsEntry?: boolean;
}

export const ContactsListView: React.FC<ContactsListViewProps> = ({
  contacts,
  onOpenContact,
  onOpenMyCards,
  showMyCardsEntry = true,
}) => {
  const [search, setSearch] = useState('');
  const listRef = useRef<HTMLDivElement | null>(null);

  const sortedContacts = useMemo(
    () => [...contacts].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN')),
    [contacts]
  );

  const filteredContacts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return sortedContacts;

    return sortedContacts.filter((contact) =>
      `${contact.name} ${contact.phone} ${contact.note ?? ''} ${contact.description ?? ''} ${contact.greeting ?? ''}`
        .toLowerCase()
        .includes(query)
    );
  }, [search, sortedContacts]);

  const contactIndexByLetter = useMemo(() => {
    const map = new Map<string, number>();
    filteredContacts.forEach((contact, index) => {
      const key = getGroupKey(contact.name);
      if (!map.has(key)) map.set(key, index);
    });
    return map;
  }, [filteredContacts]);

  const virtualizer = useVirtualizer({
    count: filteredContacts.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 72,
    overscan: 10,
    getItemKey: (index) => filteredContacts[index]?.id ?? `contact-row-${index}`,
  });

  const handleJumpToLetter = (letter: string) => {
    const targetIndex = contactIndexByLetter.get(letter);
    if (targetIndex === undefined) return;
    virtualizer.scrollToIndex(targetIndex, { align: 'start' });
  };

  return (
    <div className="relative flex-1 min-h-0 bg-white">
      <div ref={listRef} className="h-full overflow-y-auto px-6 pb-28">
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85 pt-4 pb-3">
          <div className="h-12 rounded-full bg-[#F1F2F4] border border-slate-200/70 flex items-center px-4 gap-2.5 text-slate-500">
            <Search size={20} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={TEXT.searchPlaceholder}
              className="w-full bg-transparent text-[17px] leading-none outline-none placeholder:text-slate-500"
            />
          </div>
        </div>

        {showMyCardsEntry && (
          <section className="mt-4">
            <button
              onClick={onOpenMyCards}
              className="w-full rounded-3xl border border-slate-200/70 bg-gradient-to-br from-white via-slate-50 to-slate-100/70 px-4 py-3.5 flex items-center gap-3.5 shadow-[0_8px_28px_-18px_rgba(15,23,42,0.35)]"
            >
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-500">
                <UserRound size={20} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-[17px] font-semibold text-slate-800">{TEXT.myCard}</p>
                <p className="text-[13px] text-slate-500 mt-0.5">{TEXT.myCardDesc}</p>
              </div>
            </button>
          </section>
        )}

        {filteredContacts.length === 0 ? (
          <div className="pt-8 text-center text-slate-500 text-[16px]">{TEXT.noContacts}</div>
        ) : (
          <section className="mt-4 bg-white overflow-hidden">
            <div className="relative" style={{ height: `${virtualizer.getTotalSize()}px` }}>
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const contact = filteredContacts[virtualRow.index];
                if (!contact) return null;

                const subtitle =
                  contact.phone ||
                  contact.note ||
                  TEXT.tapToCall;

                return (
                  <div
                    key={virtualRow.key}
                    className="absolute left-0 right-0"
                    style={{ transform: `translateY(${virtualRow.start}px)` }}
                  >
                    <button
                      onClick={() => onOpenContact(contact.id)}
                      className="w-full px-4 py-2.5 flex items-center gap-3.5 text-left border-b border-slate-100/80"
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
                      <div className="min-w-0 flex-1">
                        <p className="text-[18px] font-semibold text-slate-900 truncate">{contact.name}</p>
                        <p className="text-[13px] text-slate-500 truncate">{subtitle}</p>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      <div className="absolute right-1.5 top-[150px] bottom-[108px] flex flex-col items-center justify-center gap-[1px] text-[11px] select-none pointer-events-none">
        {LETTER_INDEX.map((letter) => {
          const isAvailable = contactIndexByLetter.has(letter);
          return (
            <button
              key={letter}
              onClick={() => handleJumpToLetter(letter)}
              disabled={!isAvailable}
              className={`pointer-events-auto leading-[11px] ${isAvailable ? 'text-slate-500' : 'text-slate-300'} ${letter === '#' ? 'text-[#1E64D8] font-semibold' : ''}`}
            >
              {letter}
            </button>
          );
        })}
      </div>
    </div>
  );
};
