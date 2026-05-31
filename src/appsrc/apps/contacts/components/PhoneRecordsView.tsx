import React, { useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { AnimatePresence, motion } from 'motion/react';
import { Grid2X2, Info, Phone, PhoneMissed, PhoneOutgoing, X } from 'lucide-react';
import { TEXT } from '../constants';
import type { CallRecord, Contact } from '../types';
import type { CallFilterTab } from '../uiTypes';
import { formatMonthDay, getAvatarColor, getInitial } from '../utils';

interface PhoneRecordsViewProps {
  callRecords: CallRecord[];
  contacts: Contact[];
  onQuickCall: (contactId: string) => void;
  onOpenContact: (contactId: string) => void;
}

const formatRecordListTime = (record: CallRecord): string => {
  if (record.inspectorGeneratedSourceContactId) {
    const date = new Date(record.createdAt);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const time = date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return `${month}/${day} ${time}`;
  }
  return formatMonthDay(record.createdAt);
};

export const PhoneRecordsView: React.FC<PhoneRecordsViewProps> = ({
  callRecords,
  contacts,
  onQuickCall,
  onOpenContact,
}) => {
  const [filter, setFilter] = useState<CallFilterTab>('all');
  const [showQuickDialSheet, setShowQuickDialSheet] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const contactById = useMemo(
    () => new Map(contacts.map((contact) => [contact.id, contact])),
    [contacts]
  );

  const sortedRecords = useMemo(
    () => [...callRecords].sort((a, b) => b.createdAt - a.createdAt),
    [callRecords]
  );

  const visibleRecords = useMemo(() => {
    if (filter === 'missed') return sortedRecords.filter((record) => record.direction === 'missed');
    if (filter === 'voicemail') return [];
    return sortedRecords;
  }, [filter, sortedRecords]);

  const sortedContacts = useMemo(
    () => [...contacts].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN')),
    [contacts]
  );

  const virtualizer = useVirtualizer({
    count: visibleRecords.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 84,
    overscan: 10,
    getItemKey: (index) => visibleRecords[index]?.id ?? `call-row-${index}`,
  });

  return (
    <div className="relative flex-1 min-h-0 overflow-hidden bg-white flex flex-col">
      <div className="pt-4 border-b border-slate-200 flex gap-7 text-[16px] px-6">
        <button
          onClick={() => setFilter('all')}
          className={`pb-2.5 ${filter === 'all' ? 'text-[#1E64D8] border-b-[3px] border-[#1E64D8] font-semibold' : 'text-slate-500'}`}
        >
          {TEXT.allCalls}
        </button>
        <button
          onClick={() => setFilter('missed')}
          className={`pb-2.5 ${filter === 'missed' ? 'text-[#1E64D8] border-b-[3px] border-[#1E64D8] font-semibold' : 'text-slate-500'}`}
        >
          {TEXT.missedCalls}
        </button>
        <button
          onClick={() => setFilter('voicemail')}
          className={`pb-2.5 ${filter === 'voicemail' ? 'text-[#1E64D8] border-b-[3px] border-[#1E64D8] font-semibold' : 'text-slate-500'}`}
        >
          {TEXT.voicemail}
        </button>
      </div>

      {visibleRecords.length === 0 ? (
        <div className="mt-16 text-center text-slate-500 text-[16px]">{TEXT.noRecords}</div>
      ) : (
        <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto px-6 pb-28">
          <div className="relative mt-1" style={{ height: `${virtualizer.getTotalSize()}px` }}>
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const record = visibleRecords[virtualRow.index];
              if (!record) return null;

              const isMissed = record.direction === 'missed';
              const DirectionIcon = record.direction === 'missed' ? PhoneMissed : PhoneOutgoing;
              const matchedContact = contactById.get(record.contactId);
              const displayName =
                matchedContact?.name ||
                record.contactName ||
                record.phone ||
                TEXT.unknownCaller;
              const canCall = Boolean(matchedContact);

              return (
                <div
                  key={virtualRow.key}
                  className="absolute left-0 right-0 py-3.5 flex items-center gap-3 border-b border-slate-100"
                  style={{ transform: `translateY(${virtualRow.start}px)` }}
                >
                  <div className="w-6 flex justify-center">
                    {isMissed ? <DirectionIcon size={16} className="text-slate-400" /> : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`truncate ${record.inspectorGeneratedSourceContactId ? 'text-[17px] font-normal' : 'text-[18px] font-semibold'} ${isMissed ? 'text-[#D5433D]' : 'text-slate-900'}`}>
                      {displayName}
                    </p>
                    <p className="text-[14px] text-slate-500 truncate">{record.phone || '--'}</p>
                  </div>
                  <p className="max-w-[112px] text-right text-[12px] leading-tight text-slate-500">{formatRecordListTime(record)}</p>
                  <button
                    onClick={() => {
                      if (canCall) onQuickCall(record.contactId);
                    }}
                    disabled={!canCall}
                    className={`grid place-items-center ${canCall ? 'text-[#1E64D8]' : 'text-slate-300'}`}
                    aria-label="quick-call"
                    title={canCall ? '回拨' : '联系人已不存在'}
                  >
                    <Phone size={20} />
                  </button>
                  <button
                    onClick={() => {
                      if (matchedContact) onOpenContact(record.contactId);
                    }}
                    disabled={!matchedContact}
                    className={`${matchedContact ? 'text-slate-800' : 'text-slate-300'}`}
                    aria-label="contact-detail"
                  >
                    <Info size={22} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <button
        className="absolute right-6 bottom-28 w-14 h-14 rounded-full bg-[#68C95A] text-white shadow-xl grid place-items-center"
        aria-label="dial"
        onClick={() => setShowQuickDialSheet(true)}
      >
        <Grid2X2 size={24} />
      </button>

      <AnimatePresence>
        {showQuickDialSheet && (
          <motion.div
            className="absolute inset-0 z-[140] bg-black/35 flex items-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowQuickDialSheet(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.2 }}
              onClick={(event) => event.stopPropagation()}
              className="w-full rounded-t-[20px] bg-white max-h-[70%] flex flex-col"
            >
              <div className="h-14 px-5 flex items-center justify-between border-b border-slate-200">
                <div className="text-[17px] font-semibold text-slate-900">快速拨号</div>
                <button onClick={() => setShowQuickDialSheet(false)} className="text-slate-500" aria-label="close-sheet">
                  <X size={20} />
                </button>
              </div>

              {sortedContacts.length === 0 ? (
                <div className="py-10 text-center text-slate-500 text-[15px]">{TEXT.noContacts}</div>
              ) : (
                <div className="overflow-y-auto pb-[max(env(safe-area-inset-bottom),18px)]">
                  {sortedContacts.map((contact, index) => (
                    <div
                      key={contact.id}
                      className={`px-5 py-3.5 flex items-center gap-3 ${index === sortedContacts.length - 1 ? '' : 'border-b border-slate-100'}`}
                    >
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center text-slate-700 text-[16px] font-semibold">
                        {contact.avatar ? (
                          <img src={contact.avatar} alt={contact.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className={`${getAvatarColor(contact.name)} w-full h-full flex items-center justify-center`}>
                            {getInitial(contact.name)}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[16px] font-semibold text-slate-900 truncate">{contact.name}</p>
                        <p className="text-[13px] text-slate-500 truncate">{contact.phone || '--'}</p>
                      </div>
                      <button
                        onClick={() => {
                          setShowQuickDialSheet(false);
                          onQuickCall(contact.id);
                        }}
                        className="w-9 h-9 rounded-full bg-[#EAF2FF] text-[#1E64D8] grid place-items-center"
                        aria-label={`call-${contact.id}`}
                      >
                        <Phone size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
