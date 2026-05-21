import React, { useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Image as ImageIcon, Smartphone, User } from 'lucide-react';
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

const defaultChatBackgrounds = [
  {
    id: 'mist',
    name: '浅灰',
    image: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="420" height="760" viewBox="0 0 420 760">
        <defs>
          <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
            <stop stop-color="#f7f4ed"/>
            <stop offset="1" stop-color="#dfe7e5"/>
          </linearGradient>
          <pattern id="p" width="56" height="56" patternUnits="userSpaceOnUse">
            <path d="M8 18h18M18 8v18M38 40h10M43 35v10" stroke="#cfd8d4" stroke-width="2" stroke-linecap="round" opacity=".42"/>
          </pattern>
        </defs>
        <rect width="420" height="760" fill="url(#g)"/>
        <rect width="420" height="760" fill="url(#p)"/>
      </svg>
    `)}`,
  },
  {
    id: 'green',
    name: '青绿',
    image: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="420" height="760" viewBox="0 0 420 760">
        <defs>
          <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
            <stop stop-color="#e9f5e9"/>
            <stop offset=".58" stop-color="#c9e4d9"/>
            <stop offset="1" stop-color="#e8ead4"/>
          </linearGradient>
        </defs>
        <rect width="420" height="760" fill="url(#g)"/>
        <circle cx="70" cy="110" r="38" fill="#fff" opacity=".24"/>
        <circle cx="334" cy="256" r="68" fill="#78b797" opacity=".18"/>
        <circle cx="126" cy="570" r="86" fill="#fff7cf" opacity=".28"/>
      </svg>
    `)}`,
  },
  {
    id: 'blue',
    name: '晴蓝',
    image: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="420" height="760" viewBox="0 0 420 760">
        <defs>
          <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
            <stop stop-color="#eaf4ff"/>
            <stop offset="1" stop-color="#d8e4f5"/>
          </linearGradient>
          <pattern id="dots" width="30" height="30" patternUnits="userSpaceOnUse">
            <circle cx="4" cy="4" r="1.6" fill="#9db9d5" opacity=".34"/>
          </pattern>
        </defs>
        <rect width="420" height="760" fill="url(#g)"/>
        <rect width="420" height="760" fill="url(#dots)"/>
      </svg>
    `)}`,
  },
  {
    id: 'pink',
    name: '暖粉',
    image: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="420" height="760" viewBox="0 0 420 760">
        <defs>
          <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
            <stop stop-color="#fff2f2"/>
            <stop offset=".52" stop-color="#f4dfe8"/>
            <stop offset="1" stop-color="#e6ecff"/>
          </linearGradient>
        </defs>
        <rect width="420" height="760" fill="url(#g)"/>
        <path d="M84 180c72 56 148 58 228 5M54 520c98-76 206-76 312 0" fill="none" stroke="#fff" stroke-width="18" opacity=".25" stroke-linecap="round"/>
      </svg>
    `)}`,
  },
];

export const WeChatChatDetailsView: React.FC<WeChatChatDetailsViewProps> = ({
  characterId,
  onBack,
  onDone,
}) => {
  const characters = useWeChatCharactersFromContacts();
  const sessions = useWeChatStore((state) => state.wechatSessions);
  const updateWeChatSessionSettings = useWeChatStore((state) => state.updateWeChatSessionSettings);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [backgroundStep, setBackgroundStep] = useState<'details' | 'settings' | 'defaults'>('details');
  const [backgroundPreview, setBackgroundPreview] = useState<string | null>(null);
  const character = characters.find((item) => item.id === characterId);
  const session = sessions.find((item) => item.characterId === characterId);

  const handleChooseBackground = () => {
    fileInputRef.current?.click();
  };

  const handleOpenPreview = (image: string) => {
    if (!session) return;
    setBackgroundPreview(image);
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
    setBackgroundStep('details');
    onDone?.();
  };

  if (!character || !session) return null;

  const renderHeader = (title: string, back: () => void, right?: React.ReactNode) => (
    <div className="shrink-0 border-b border-[#DCDCDC] bg-[#F7F7F7] px-2 pb-3 pt-12">
      <div className="flex items-center">
        <button
          type="button"
          onClick={back}
          className="flex h-9 min-w-[54px] items-center text-[#111] active:opacity-50"
          aria-label="返回"
        >
          <ChevronLeft size={34} strokeWidth={1.5} />
        </button>
        <h1 className="flex-1 text-center text-[16px] font-semibold">{title}</h1>
        <div className="flex min-w-[54px] justify-end">{right}</div>
      </div>
    </div>
  );

  return (
    <div className="absolute inset-0 z-[90] flex flex-col overflow-hidden bg-[#EDEDED] text-[14px] text-[#111]">
      {backgroundStep === 'details' ? renderHeader('聊天详情', onBack) : null}
      {backgroundStep === 'settings' ? renderHeader('设置聊天背景', () => setBackgroundStep('details')) : null}
      {backgroundStep === 'defaults' ? renderHeader('选择背景图', () => setBackgroundStep('settings')) : null}

      {backgroundStep === 'details' ? (
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
            onClick={() => setBackgroundStep('settings')}
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
      ) : null}

      {backgroundStep === 'settings' ? (
        <div className="flex-1 overflow-y-auto">
          <div className="h-2.5 bg-[#EDEDED]" />
          <section className="bg-white">
            <button
              type="button"
              onClick={() => setBackgroundStep('defaults')}
              className="flex h-[58px] w-full items-center justify-between border-b border-[#EEEEEE] px-5 text-left"
            >
              <span className="flex items-center gap-3 text-[14px] text-[#111]">
                <ImageIcon size={20} strokeWidth={1.8} className="text-[#576B95]" />
                选择背景图
              </span>
              <ChevronRight size={24} strokeWidth={1.6} className="text-[#B6B6B6]" />
            </button>
            <button
              type="button"
              onClick={handleChooseBackground}
              className="flex h-[58px] w-full items-center justify-between px-5 text-left"
            >
              <span className="flex items-center gap-3 text-[14px] text-[#111]">
                <Smartphone size={20} strokeWidth={1.8} className="text-[#576B95]" />
                从手机相册选择
              </span>
              <ChevronRight size={24} strokeWidth={1.6} className="text-[#B6B6B6]" />
            </button>
          </section>
        </div>
      ) : null}

      {backgroundStep === 'defaults' ? (
        <div className="flex-1 overflow-y-auto bg-[#EDEDED] px-5 py-5">
          <div className="grid grid-cols-2 gap-4">
            {defaultChatBackgrounds.map((background) => {
              const isSelected = session.chatBackgroundImage === background.image;
              return (
                <button
                  key={background.id}
                  type="button"
                  onClick={() => handleOpenPreview(background.image)}
                  className="overflow-hidden rounded-md bg-white text-left active:opacity-80"
                >
                  <div className="relative aspect-[9/14] overflow-hidden bg-[#F7F7F7]">
                    <img src={background.image} alt={background.name} className="h-full w-full object-cover" />
                    {isSelected ? (
                      <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#07C160] text-white">
                        <Check size={16} strokeWidth={2.2} />
                      </span>
                    ) : null}
                  </div>
                  <div className="px-2 py-2 text-center text-[14px] text-[#111]">{background.name}</div>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

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
