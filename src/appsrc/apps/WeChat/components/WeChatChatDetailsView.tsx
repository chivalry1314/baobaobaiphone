import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, User } from 'lucide-react';
import { useWeChatStore } from '../store';
import { useWeChatCharactersFromContacts } from '../contactAdapter';
import { compressImageFile } from './moments/momentsUtils';

interface WeChatChatDetailsViewProps {
  characterId: string;
  onBack: () => void;
  onDone?: () => void;
}

const WeChatSwitch: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}> = ({ checked, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={() => onChange(!checked)}
    className={`relative h-7 w-[50px] shrink-0 overflow-hidden rounded-full transition-colors ${
      checked ? 'bg-[#07C160]' : 'bg-[#E6E6E6]'
    }`}
  >
    <span
      className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.18)] transition-transform ${
        checked ? 'translate-x-[22px]' : 'translate-x-0'
      }`}
    />
  </button>
);

export const WeChatChatDetailsView: React.FC<WeChatChatDetailsViewProps> = ({
  characterId,
  onBack,
  onDone,
}) => {
  const characters = useWeChatCharactersFromContacts();
  const sessions = useWeChatStore((state) => state.wechatSessions);
  const updateWeChatSessionSettings = useWeChatStore((state) => state.updateWeChatSessionSettings);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [backgroundPreview, setBackgroundPreview] = useState<string | null>(null);
  const character = characters.find((item) => item.id === characterId);
  const session = sessions.find((item) => item.characterId === characterId);

  const handleChooseBackground = () => {
    fileInputRef.current?.click();
  };

  const handleBackgroundFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !session) return;
    const image = await compressImageFile(file);
    setBackgroundPreview(image);
  };

  const handleConfirmBackground = () => {
    if (!backgroundPreview || !session) return;
    updateWeChatSessionSettings(session.id, { chatBackgroundImage: backgroundPreview });
    setBackgroundPreview(null);
    onDone?.();
  };

  if (!character || !session) return null;

  return (
    <div className="absolute inset-0 z-[90] flex flex-col overflow-hidden bg-[#EDEDED] text-[14px] text-[#111]">
      <div className="shrink-0 border-b border-[#DCDCDC] bg-[#F7F7F7] px-2 pb-3 pt-12">
        <div className="flex items-center">
          <button
            type="button"
            onClick={onBack}
            className="flex h-9 min-w-[54px] items-center text-[#111] active:opacity-50"
            aria-label="返回"
          >
            <ChevronLeft size={34} strokeWidth={1.5} />
          </button>
          <h1 className="flex-1 text-center text-[16px] font-semibold">聊天详情</h1>
          <div className="min-w-[54px]" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <section className="bg-white px-9 pb-5 pt-6">
          <div className="flex items-start gap-9">
            <div className="w-14">
              <div className="h-14 w-14 overflow-hidden rounded-md bg-gray-200">
                {character.avatar ? (
                  <img src={character.avatar} alt={character.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-gray-400">
                    <User size={26} />
                  </div>
                )}
              </div>
              <div className="mt-1.5 truncate text-center text-[14px] text-[#6F6F6F]">{character.name}</div>
            </div>
            <button
              type="button"
              className="flex h-14 w-14 items-center justify-center rounded-md border border-dashed border-[#BEBEBE] bg-white text-[#A8A8A8]"
              aria-label="添加成员"
            >
              <span className="text-[34px] font-light leading-none">+</span>
            </button>
          </div>
        </section>

        <div className="h-2.5 bg-[#EDEDED]" />

        <section className="bg-white">
          <button
            type="button"
            className="flex h-[58px] w-full items-center justify-between border-b border-[#EEEEEE] px-5 text-left"
          >
            <span className="text-[14px] text-[#111]">查找聊天内容</span>
            <ChevronRight size={24} strokeWidth={1.6} className="text-[#B6B6B6]" />
          </button>
        </section>

        <div className="h-2.5 bg-[#EDEDED]" />

        <section className="bg-white">
          <div className="flex h-[58px] items-center justify-between border-b border-[#EEEEEE] px-5">
            <span className="text-[14px] text-[#111]">消息免打扰</span>
            <WeChatSwitch checked={false} onChange={() => undefined} label="消息免打扰" />
          </div>
          <div className="flex h-[58px] items-center justify-between border-b border-[#EEEEEE] px-5">
            <span className="text-[14px] text-[#111]">置顶聊天</span>
            <WeChatSwitch
              checked={Boolean(session.isPinned)}
              onChange={(checked) => updateWeChatSessionSettings(session.id, { isPinned: checked })}
              label="置顶聊天"
            />
          </div>
          <div className="flex h-[58px] items-center justify-between px-5">
            <span className="text-[14px] text-[#111]">提醒</span>
            <WeChatSwitch checked={false} onChange={() => undefined} label="提醒" />
          </div>
        </section>

        <div className="h-2.5 bg-[#EDEDED]" />

        <section className="bg-white">
          <button
            type="button"
            onClick={handleChooseBackground}
            className="flex h-[58px] w-full items-center justify-between border-b border-[#EEEEEE] px-5 text-left"
          >
            <span className="text-[14px] text-[#111]">设置当前聊天背景</span>
            <ChevronRight size={24} strokeWidth={1.6} className="text-[#B6B6B6]" />
          </button>
          <button
            type="button"
            className="flex h-[58px] w-full items-center px-5 text-left"
          >
            <span className="text-[14px] text-[#111]">清空聊天记录</span>
          </button>
        </section>

        <div className="h-2.5 bg-[#EDEDED]" />

        <section className="bg-white">
          <button
            type="button"
            className="flex h-[58px] w-full items-center justify-between px-5 text-left"
          >
            <span className="text-[14px] text-[#111]">投诉</span>
            <ChevronRight size={24} strokeWidth={1.6} className="text-[#B6B6B6]" />
          </button>
        </section>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleBackgroundFileChange}
      />

      {backgroundPreview ? (
        <div className="absolute inset-0 z-[120] flex flex-col bg-black">
          <div className="flex h-[118px] shrink-0 items-end justify-between bg-black/82 px-5 pb-4 text-white">
            <button
              type="button"
              onClick={() => setBackgroundPreview(null)}
              className="flex h-12 w-12 items-center justify-center active:opacity-60"
              aria-label="返回"
            >
              <ChevronLeft size={42} strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={handleConfirmBackground}
              className="rounded-md bg-[#07C160] px-7 py-3 text-[14px] font-semibold text-white active:opacity-80"
            >
              完成
            </button>
          </div>
          <div className="relative flex-1 overflow-hidden bg-black">
            <img src={backgroundPreview} alt="聊天背景预览" className="h-full w-full object-cover" />
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default WeChatChatDetailsView;
