import React, { useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Check, Image as ImageIcon } from 'lucide-react';
import { useMobileViewportPageStyle } from '../../../../core/mobileViewport';
import { TEXT } from '../constants';
import type { AddContactPayload, Contact, WeChatRelation } from '../types';
import type { AddContactView } from '../uiTypes';
import type { WorldInfoEntry } from '../../../../core/sdk/types';

interface AddContactPageProps {
  worldBook: WorldInfoEntry[];
  onBack: () => void;
  onSubmit: (payload: AddContactPayload) => void;
  initialContact?: Partial<Contact>;
  title?: string;
  submitLabel?: string;
}

export const AddContactPage: React.FC<AddContactPageProps> = ({
  worldBook,
  onBack,
  onSubmit,
  initialContact,
  title = TEXT.addContact,
  submitLabel = TEXT.save,
}) => {
  const [view, setView] = useState<AddContactView>('form');
  const [avatar, setAvatar] = useState(initialContact?.avatar ?? '');
  const [name, setName] = useState(initialContact?.name ?? '');
  const [phone, setPhone] = useState(initialContact?.phone ?? '');
  const [note, setNote] = useState(initialContact?.note ?? '');
  const [description, setDescription] = useState(initialContact?.description ?? '');
  const [greeting, setGreeting] = useState(initialContact?.greeting ?? '');
  const [selectedWorldBookId, setSelectedWorldBookId] = useState(initialContact?.worldBookId ?? '');
  const [wechatRelation, setWeChatRelation] = useState<WeChatRelation>(
    initialContact?.wechatRelation ?? 'friend'
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const worldBookListRef = useRef<HTMLDivElement | null>(null);
  const pageStyle = useMobileViewportPageStyle(false);

  const isFormValid = name.trim().length > 0;

  const selectedWorldBookName = useMemo(
    () => worldBook.find((entry) => entry.id === selectedWorldBookId)?.name ?? '',
    [selectedWorldBookId, worldBook]
  );

  const worldBookVirtualizer = useVirtualizer({
    count: worldBook.length + 1,
    getScrollElement: () => worldBookListRef.current,
    estimateSize: () => 52,
    overscan: 8,
    getItemKey: (index) =>
      index === 0 ? 'worldbook-not-selected' : worldBook[index - 1]?.id ?? `worldbook-item-${index}`,
  });

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const maxWidth = 256;
        const maxHeight = 256;
        let width = image.width;
        let height = image.height;

        if (width > height && width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else if (height >= width && height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        if (!context) return;

        context.drawImage(image, 0, 0, width, height);
        setAvatar(canvas.toDataURL('image/jpeg', 0.8));
      };
      image.src = String(loadEvent.target?.result ?? '');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!isFormValid) return;

    onSubmit({
      name: name.trim(),
      phone: phone.trim(),
      note: note.trim(),
      avatar: avatar.trim(),
      description: description.trim(),
      greeting: greeting.trim(),
      personality: '',
      background: '',
      worldBookId: selectedWorldBookId || undefined,
      wechatRelation,
    });
  };

  return (
    <div
      className="absolute left-0 right-0 z-[90] bg-white flex min-h-0 flex-col overflow-hidden"
      style={pageStyle}
    >
      <div className="sticky top-0 z-20 px-5 pt-11 pb-3 flex items-center justify-between border-b border-slate-200 bg-white shrink-0">
        {view === 'worldbook' ? (
          <button onClick={() => setView('form')} className="text-[15px] font-medium text-slate-600">
            {TEXT.back}
          </button>
        ) : (
          <button onClick={onBack} className="text-[15px] font-medium text-slate-600">
            {TEXT.cancel}
          </button>
        )}

        <h3 className="text-[18px] font-semibold text-slate-900">{title}</h3>
        <button
          onClick={handleSave}
          disabled={!isFormValid}
          className={`text-[15px] font-semibold ${isFormValid ? 'text-[#1E64D8]' : 'text-slate-300'}`}
        >
          {submitLabel}
        </button>
      </div>

      {view === 'form' ? (
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-5 pb-8 pt-4 space-y-3">
          <div className="flex flex-col items-center mb-1">
            <button
              onClick={handleAvatarClick}
              className="w-20 h-20 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center text-slate-400"
            >
              {avatar ? (
                <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon size={34} />
              )}
            </button>
            <span className="text-[12px] text-slate-500 mt-2">{TEXT.setAvatar}</span>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarFileChange}
              className="hidden"
              accept="image/*"
            />
          </div>

          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={`${TEXT.name} *`}
            className="w-full h-12 rounded-xl bg-slate-100 px-4 text-[16px] outline-none"
          />
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder={TEXT.phoneNumber}
            className="w-full h-12 rounded-xl bg-slate-100 px-4 text-[16px] outline-none"
          />

          <button
            onClick={() => setView('worldbook')}
            className="w-full h-12 rounded-xl bg-slate-100 px-4 flex items-center text-[15px] text-slate-700"
          >
            <span className="w-[104px] text-left">{TEXT.chooseWorldBook}</span>
            <span
              className={`flex-1 text-left truncate ${
                selectedWorldBookName ? 'text-slate-900' : 'text-slate-400'
              }`}
            >
              {selectedWorldBookName || TEXT.notSelected}
            </span>
          </button>

          <div className="w-full rounded-xl bg-slate-100 px-4 py-3">
            <p className="text-[15px] font-medium text-slate-800 mb-2">微信关系</p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setWeChatRelation('incomingRequest')}
                className={`w-full rounded-lg border px-3 py-2 text-left ${
                  wechatRelation === 'incomingRequest'
                    ? 'border-[#1E64D8] bg-[#1E64D8]/5'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <p className="text-[14px] font-medium text-slate-800">主动申请</p>
                <p className="text-[12px] text-slate-500 mt-0.5">联系人会主动向你发起好友申请</p>
              </button>

              <button
                type="button"
                onClick={() => setWeChatRelation('waitingForRequest')}
                className={`w-full rounded-lg border px-3 py-2 text-left ${
                  wechatRelation === 'waitingForRequest'
                    ? 'border-[#1E64D8] bg-[#1E64D8]/5'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <p className="text-[14px] font-medium text-slate-800">等待申请</p>
                <p className="text-[12px] text-slate-500 mt-0.5">联系人保持静默，等待你去搜索并添加</p>
              </button>

              <button
                type="button"
                onClick={() => setWeChatRelation('friend')}
                className={`w-full rounded-lg border px-3 py-2 text-left ${
                  wechatRelation === 'friend'
                    ? 'border-[#1E64D8] bg-[#1E64D8]/5'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <p className="text-[14px] font-medium text-slate-800">自动成为好友</p>
                <p className="text-[12px] text-slate-500 mt-0.5">联系人会直接出现在微信通讯录里</p>
              </button>
            </div>
          </div>

          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={TEXT.description}
            className="w-full min-h-[92px] rounded-xl bg-slate-100 px-4 py-3 text-[16px] outline-none resize-none"
          />
          <textarea
            value={greeting}
            onChange={(event) => setGreeting(event.target.value)}
            placeholder={TEXT.greeting}
            className="w-full min-h-[86px] rounded-xl bg-slate-100 px-4 py-3 text-[16px] outline-none resize-none"
          />
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={TEXT.note}
            className="w-full min-h-[72px] rounded-xl bg-slate-100 px-4 py-3 text-[16px] outline-none resize-none"
          />
        </div>
      ) : (
        <div ref={worldBookListRef} className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain py-2">
          <div className="relative" style={{ height: `${worldBookVirtualizer.getTotalSize()}px` }}>
            {worldBookVirtualizer.getVirtualItems().map((virtualRow) => {
              if (virtualRow.index === 0) {
                return (
                  <button
                    key={virtualRow.key}
                    onClick={() => {
                      setSelectedWorldBookId('');
                      setView('form');
                    }}
                    className="absolute left-0 right-0 px-5 py-3 flex items-center border-b border-slate-100 text-left"
                    style={{ transform: `translateY(${virtualRow.start}px)` }}
                  >
                    <span className="flex-1 text-[16px] text-slate-900">{TEXT.notSelected}</span>
                    {!selectedWorldBookId ? <Check size={18} className="text-[#1E64D8]" /> : null}
                  </button>
                );
              }

              const entry = worldBook[virtualRow.index - 1];
              if (!entry) return null;

              return (
                <button
                  key={virtualRow.key}
                  onClick={() => {
                    setSelectedWorldBookId(entry.id);
                    setView('form');
                  }}
                  className="absolute left-0 right-0 px-5 py-3 flex items-center border-b border-slate-100 text-left"
                  style={{ transform: `translateY(${virtualRow.start}px)` }}
                >
                  <span className="flex-1 text-[16px] text-slate-900 truncate">{entry.name}</span>
                  {selectedWorldBookId === entry.id ? (
                    <Check size={18} className="text-[#1E64D8]" />
                  ) : null}
                </button>
              );
            })}
          </div>

          {worldBook.length === 0 ? (
            <p className="px-5 py-6 text-[14px] text-slate-500 text-center">{TEXT.noWorldBook}</p>
          ) : null}
        </div>
      )}
    </div>
  );
};
