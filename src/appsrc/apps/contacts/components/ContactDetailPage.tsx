import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  ChevronLeft,
  ChevronRight,
  Ellipsis,
  MessageCircle,
  Phone,
  PhoneIncoming,
  PhoneMissed,
  PhoneOutgoing,
  QrCode,
  SquarePen,
  Star,
  Video,
} from 'lucide-react';
import { TEXT } from '../constants';
import type { CallRecord, Contact } from '../types';
import { getAvatarColor, getInitial } from '../utils';

interface ContactDetailPageProps {
  contact: Contact;
  callRecords: CallRecord[];
  onBack: () => void;
  onEdit: () => void;
  onQuickCall: (contactId: string) => void;
  onClearRecords: () => void;
  readOnly?: boolean;
}

const formatRecordDateTime = (timestamp: number) =>
  new Date(timestamp).toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export const ContactDetailPage: React.FC<ContactDetailPageProps> = ({
  contact,
  callRecords,
  onBack,
  onEdit,
  onQuickCall,
  onClearRecords,
  readOnly = false,
}) => {
  const [showCompactHeader, setShowCompactHeader] = useState(false);
  const [recordsScrollMargin, setRecordsScrollMargin] = useState(0);
  const pageScrollRef = useRef<HTMLDivElement | null>(null);
  const recordsContainerRef = useRef<HTMLDivElement | null>(null);
  const sortedRecords = useMemo(
    () => [...callRecords].sort((a, b) => b.createdAt - a.createdAt),
    [callRecords]
  );

  useEffect(() => {
    const scrollElement = pageScrollRef.current;
    const recordsElement = recordsContainerRef.current;
    if (!scrollElement || !recordsElement) return;

    const syncScrollMargin = () => {
      const margin =
        recordsElement.getBoundingClientRect().top -
        scrollElement.getBoundingClientRect().top +
        scrollElement.scrollTop;
      setRecordsScrollMargin(Math.max(0, Math.round(margin)));
    };

    syncScrollMargin();
    window.addEventListener('resize', syncScrollMargin);
    return () => window.removeEventListener('resize', syncScrollMargin);
  }, [sortedRecords.length]);

  const recordsVirtualizer = useVirtualizer({
    count: sortedRecords.length,
    getScrollElement: () => pageScrollRef.current,
    scrollMargin: recordsScrollMargin,
    estimateSize: () => 82,
    overscan: 8,
    getItemKey: (index) => sortedRecords[index]?.id ?? `contact-record-${index}`,
  });

  const handleBodyScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const shouldShow = event.currentTarget.scrollTop > 108;
    setShowCompactHeader((prev) => (prev === shouldShow ? prev : shouldShow));
  };

  return (
    <div className="absolute inset-0 z-[92] bg-[#F3F4F7] flex flex-col">
      <div className="px-5 pt-11 pb-3 flex items-center justify-between shrink-0">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-white text-slate-800 shadow-[0_6px_18px_-12px_rgba(15,23,42,0.45)] grid place-items-center"
        >
          <ChevronLeft size={24} />
        </button>
        <button className="w-9 h-9 rounded-full bg-white text-slate-700 shadow-[0_6px_18px_-12px_rgba(15,23,42,0.45)] grid place-items-center">
          <QrCode size={20} />
        </button>
      </div>

      <div
        ref={pageScrollRef}
        className="flex-1 overflow-y-auto pb-24 px-5"
        onScroll={handleBodyScroll}
      >
        <div
          className={`sticky top-0 z-20 pt-1 pb-2 transition-all duration-200 ${
            showCompactHeader ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
          }`}
        >
          <div className="h-12 rounded-2xl bg-white/95 backdrop-blur border border-white/80 shadow-[0_10px_24px_-20px_rgba(15,23,42,0.55)] px-3.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center text-sm font-semibold text-slate-700">
              {contact.avatar ? (
                <img src={contact.avatar} alt={contact.name} className="w-full h-full object-cover" />
              ) : (
                <span className={`${getAvatarColor(contact.name)} w-full h-full flex items-center justify-center`}>
                  {getInitial(contact.name)}
                </span>
              )}
            </div>
            <p className="text-[17px] font-semibold text-slate-900 truncate">{contact.name}</p>
          </div>
        </div>

        <div className="pt-1 min-h-full flex flex-col">
          <div className="rounded-[28px] bg-gradient-to-b from-[#EBE4EC] to-[#F8F6FA] px-5 pt-6 pb-5 shadow-[0_16px_36px_-28px_rgba(15,23,42,0.45)]">
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center text-3xl font-semibold text-slate-700 border-[5px] border-white">
                {contact.avatar ? (
                  <img src={contact.avatar} alt={contact.name} className="w-full h-full object-cover" />
                ) : (
                  <span className={`${getAvatarColor(contact.name)} w-full h-full flex items-center justify-center`}>
                    {getInitial(contact.name)}
                  </span>
                )}
              </div>
              <h2 className="mt-3 text-[30px] leading-none font-semibold text-slate-900 tracking-tight">
                {contact.name}
              </h2>
            </div>

            <div className="mt-5 flex items-center gap-3.5">
              <div className="min-w-0 flex-1">
                <p className="text-[17px] leading-none font-semibold text-slate-900 tracking-[0.01em]">
                  {contact.phone || '--'}
                </p>
                <p className="mt-1.5 text-[13px] text-slate-500">{TEXT.mobileLabel}</p>
              </div>

              <div className="flex items-center gap-3 text-slate-700">
                <button
                  onClick={() => onQuickCall(contact.id)}
                  className="w-10 h-10 rounded-full bg-white shadow-[0_10px_22px_-18px_rgba(15,23,42,0.55)] grid place-items-center active:scale-95 transition-transform"
                >
                  <Phone size={18} />
                </button>
                <button className="w-10 h-10 rounded-full bg-white shadow-[0_10px_22px_-18px_rgba(15,23,42,0.55)] grid place-items-center active:scale-95 transition-transform">
                  <Video size={18} />
                </button>
                <button className="w-10 h-10 rounded-full bg-white shadow-[0_10px_22px_-18px_rgba(15,23,42,0.55)] grid place-items-center active:scale-95 transition-transform">
                  <MessageCircle size={18} />
                </button>
              </div>
            </div>

            <div className="mt-4 border-t border-slate-200/80 pt-4 flex items-center">
              <div className="min-w-0 flex-1">
                <p className="text-[16px] font-medium text-slate-900">{TEXT.defaultRingtone}</p>
                <p className="text-[13px] text-slate-500 mt-1">{TEXT.ringtone}</p>
              </div>
              <ChevronRight size={18} className="text-slate-300" />
            </div>
          </div>

          <section className="mt-5 flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-[16px] font-medium text-slate-700">{TEXT.callRecords}</h3>
              {sortedRecords.length > 0 && !readOnly ? (
                <button onClick={onClearRecords} className="text-[15px] text-[#1E64D8]">
                  {TEXT.clear}
                </button>
              ) : null}
            </div>

            {sortedRecords.length === 0 ? (
              <p className="pt-5 pb-2 text-[14px] text-slate-500">{TEXT.noContactRecords}</p>
            ) : (
              <div
                ref={recordsContainerRef}
                className="mt-3 bg-white rounded-2xl shadow-[0_10px_28px_-24px_rgba(15,23,42,0.55)] overflow-hidden"
              >
                <div className="relative" style={{ height: `${recordsVirtualizer.getTotalSize()}px` }}>
                  {recordsVirtualizer.getVirtualItems().map((virtualRow) => {
                    const record = sortedRecords[virtualRow.index];
                    if (!record) return null;

                    const DirectionIcon =
                      record.direction === 'missed'
                        ? PhoneMissed
                        : record.direction === 'incoming'
                        ? PhoneIncoming
                        : PhoneOutgoing;

                    const isLast = virtualRow.index === sortedRecords.length - 1;
                    return (
                      <div
                        key={virtualRow.key}
                        className={`absolute left-0 right-0 px-4 py-3.5 ${isLast ? '' : 'border-b border-slate-100'}`}
                        style={{ transform: `translateY(${virtualRow.start - recordsScrollMargin}px)` }}
                      >
                        <p className="text-[16px] leading-tight font-medium text-slate-900">
                          {formatRecordDateTime(record.createdAt)}
                        </p>
                        <div className="mt-2 flex items-center justify-between text-slate-500">
                          <p className="flex items-center gap-1.5 text-[13px] truncate">
                            <DirectionIcon size={14} />
                            <span>{record.phone || contact.phone || '--'}</span>
                          </p>
                          <p className="text-[13px]">
                            {record.durationSec}
                            {TEXT.seconds}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      <div className="shrink-0 min-h-[84px] bg-white/95 backdrop-blur border-t border-slate-200 flex items-start justify-around pt-2.5 pb-[max(env(safe-area-inset-bottom,0px),8px)]">
        <button className="w-20 flex flex-col items-center gap-1 text-slate-500">
          <Star size={20} />
          <span className="text-[12px]">{TEXT.favorites}</span>
        </button>
        {readOnly ? (
          <div className="w-20" />
        ) : (
          <button onClick={onEdit} className="w-20 flex flex-col items-center gap-1 text-[#1E64D8]">
            <SquarePen size={20} />
            <span className="text-[12px]">{TEXT.edit}</span>
          </button>
        )}
        <button className="w-20 flex flex-col items-center gap-1 text-slate-500">
          <Ellipsis size={20} />
          <span className="text-[12px]">{TEXT.moreOptions}</span>
        </button>
      </div>
    </div>
  );
};

