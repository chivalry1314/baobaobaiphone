// src/components/wechat/WeChatChatMessageItem.tsx
import React from 'react';
import { Check, ArrowRightLeft, User, Pause, Volume2 } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { WeChatBubblePreset, WeChatMessage, WeChatUiRenderConfig } from '../types';

// 通用头像组件
export const Avatar: React.FC<{ url?: string | null }> = ({ url }) => (
  <div className="w-10 h-10 rounded-lg bg-gray-200 overflow-hidden shrink-0 border border-gray-100 flex items-center justify-center text-gray-400 relative">
    {url ? (
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
    ) : (
      <User size={24} />
    )}
  </div>
);

interface WeChatChatMessageItemProps {
  message: WeChatMessage;
  isUser: boolean;
  userAvatar?: string | null;
  characterAvatar?: string | null;
  characterName: string;
  selfBubblePreset: WeChatBubblePreset;
  peerBubblePreset: WeChatBubblePreset;
  customRenderConfig: WeChatUiRenderConfig | null;
  isSelected: boolean;
  isSelectionMode: boolean;
  isMenuOpen: boolean;
  onMessageClick: (e: React.MouseEvent, msg: WeChatMessage) => void;
  onOpenMessageMenu?: (message: WeChatMessage, clientX: number, clientY: number) => void;
  onVoiceMessagePlay?: (message: WeChatMessage) => void;
  isVoicePlaying?: boolean;
  onToggleSelection: (messageId: string) => void;
  onAvatarClick?: (message: WeChatMessage, isUser: boolean) => void;
}

const getBubblePresetClass = (preset: WeChatBubblePreset, isUser: boolean): string => {
  switch (preset) {
    case 'rounded':
      return isUser
        ? 'bg-[#A6EB7A] border border-[#8ED865] rounded-2xl rounded-tr-[8px] text-gray-900 shadow-sm'
        : 'bg-white border border-gray-200 rounded-2xl rounded-tl-[8px] text-gray-900 shadow-sm';
    case 'glass':
      return isUser
        ? 'bg-[#95ec69]/65 border border-[#7fd35a]/60 rounded-2xl rounded-tr-[8px] text-gray-900 backdrop-blur-md'
        : 'bg-white/70 border border-white/80 rounded-2xl rounded-tl-[8px] text-gray-900 backdrop-blur-md';
    case 'outline':
      return isUser
        ? 'bg-transparent border border-[#95ec69] rounded-xl rounded-tr-[8px] text-gray-900'
        : 'bg-transparent border border-gray-300 rounded-xl rounded-tl-[8px] text-gray-900';
    case 'wechat':
    default:
      return isUser
        ? 'bg-[#95ec69] rounded-lg rounded-tr-none text-gray-900'
        : 'bg-white rounded-lg rounded-tl-none text-gray-900';
  }
};

const normalizeStyle = (
  styleRecord?: Record<string, string | number>
): CSSProperties | undefined => {
  if (!styleRecord) return undefined;
  const entries = Object.entries(styleRecord);
  if (entries.length === 0) return undefined;
  return entries.reduce<CSSProperties>((acc, [key, value]) => {
    (acc as Record<string, string | number>)[key] = value;
    return acc;
  }, {});
};

export const WeChatChatMessageItem: React.FC<WeChatChatMessageItemProps> = ({
  message, isUser, userAvatar, characterAvatar, characterName,
  selfBubblePreset, peerBubblePreset, customRenderConfig,
  isSelected, isSelectionMode, isMenuOpen, onMessageClick, onOpenMessageMenu, onVoiceMessagePlay, isVoicePlaying, onToggleSelection, onAvatarClick
}) => {
  const isPat = message.type === 'pat';
  const isTransfer = message.type === 'transfer' || message.type === 'transfer_accepted';
  const isVoice = message.type === 'voice' && Boolean(message.voiceAudioDataUrl);
  const isImage = message.type === 'image' && Boolean(message.imageDataUrl);
  const imageCaption = message.content.trim();
  const showImageCaption = imageCaption.length > 0 && imageCaption !== '[图片]';
  const voiceDuration = Math.max(1, Math.round(message.voiceDurationSeconds || 1));
  const voiceWidth = Math.max(96, Math.min(220, 92 + voiceDuration * 6));
  const quoteText = message.quoteText;
  const bubblePreset = isUser ? selfBubblePreset : peerBubblePreset;
  const bubblePresetClass = getBubblePresetClass(bubblePreset, isUser);
  const customBubbleStyle = normalizeStyle(
    isUser ? customRenderConfig?.selfBubbleStyle : customRenderConfig?.peerBubbleStyle
  );
  const customTextStyle = normalizeStyle(
    isUser ? customRenderConfig?.selfTextStyle : customRenderConfig?.peerTextStyle
  );
  const isUsingCustomBubble = Boolean(customBubbleStyle);
  const showTail = !isUsingCustomBubble && bubblePreset === 'wechat';
  const tailClass = isUser ? 'border-l-[#95ec69]' : 'border-r-white';

  const openMenuByPoint = (clientX: number, clientY: number) => {
    if (onOpenMessageMenu) {
      onOpenMessageMenu(message, clientX, clientY);
      return;
    }

    const fakeEvent = {
      clientX,
      clientY,
      stopPropagation: () => undefined,
    } as unknown as React.MouseEvent;
    onMessageClick(fakeEvent, message);
  };

  const handleVoiceIconClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (onVoiceMessagePlay) {
      onVoiceMessagePlay(message);
    }
  };

  if (isPat) {
    return (
      <div className="flex items-center w-full" onClick={() => isSelectionMode && onToggleSelection(message.id)}>
        {isSelectionMode && (
          <div className="w-10 shrink-0 flex items-center justify-center transition-all">
            <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
              isSelected ? 'bg-[#07C160] border-[#07C160]' : 'border-gray-400 bg-transparent'
            }`}>
              {isSelected && <Check size={14} className="text-white" strokeWidth={3} />}
            </div>
          </div>
        )}
        <div className="flex-1 py-1 text-center">
          <div
            onClick={(e) => onMessageClick(e, message)}
            className={`inline-block rounded px-2 py-1 text-[12px] text-gray-500 ${
              isMenuOpen ? 'bg-gray-200/70' : 'bg-transparent'
            }`}
          >
            {message.content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start w-full" onClick={() => isSelectionMode && onToggleSelection(message.id)}>
      {isSelectionMode && (
        <div className="w-10 shrink-0 flex items-center justify-center pt-2.5 transition-all">
          <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
            isSelected ? 'bg-[#07C160] border-[#07C160]' : 'border-gray-400 bg-transparent'
          }`}>
            {isSelected && <Check size={14} className="text-white" strokeWidth={3} />}
          </div>
        </div>
      )}

      <div className={`flex-1 flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''} ${isSelectionMode ? 'pointer-events-none' : ''}`}>
        {!isUser && !isSelectionMode && onAvatarClick ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onAvatarClick(message, isUser);
            }}
            className="rounded-lg active:opacity-70"
          >
            <Avatar url={characterAvatar} />
          </button>
        ) : (
          <Avatar url={isUser ? userAvatar : characterAvatar} />
        )}
        
        <div className={`relative max-w-[70%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          <div className={`relative flex ${isUser ? 'justify-end' : 'justify-start'}`}>
            {/* 气泡三角 */}
            {showTail ? (
              <div className={`absolute top-3.5 w-0 h-0 border-[5px] border-transparent ${
                isUser
                  ? `left-full ${isTransfer ? 'border-l-[#F39B3A]' : tailClass}`
                  : `right-full ${isTransfer ? 'border-r-[#F39B3A]' : tailClass}`
              }`} />
            ) : null}
            
            {/* 气泡本体 */}
            <div 
              onClick={(e) => onMessageClick(e, message)}
              className={`relative cursor-pointer ${isMenuOpen ? 'brightness-90' : ''} ${
                isTransfer
                  ? `bg-[#F39B3A] text-white overflow-hidden ${message.type === 'transfer_accepted' ? 'opacity-95' : ''}` 
                  : `${bubblePresetClass} ${isImage ? 'p-1.5' : 'px-3.5 py-2.5'}`
              }`}
              style={!isTransfer ? customBubbleStyle : undefined}
            >
              {isTransfer ? (
                <div className="flex flex-col w-[200px] sm:w-[220px]">
                  <div className="flex items-center gap-3 p-3">
                    <div className="w-10 h-10 shrink-0 border-2 border-white/80 rounded-full flex items-center justify-center">
                      {message.type === 'transfer_accepted' ? <Check size={24} /> : <ArrowRightLeft size={20} />}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[17px] leading-tight font-medium">¥{message.amount?.toFixed(2)}</span>
                      <span className="text-[13px] opacity-90 mt-0.5">
                        {message.type === 'transfer' ? (isUser ? `转账给${characterName}` : `转账给你`) : '已收款'}
                      </span>
                    </div>
                  </div>
                  <div className="bg-white/20 px-3 py-1 text-[11px] text-white/90">微信转账</div>
                </div>
              ) : isVoice ? (
                <div
                  className="flex items-center gap-2.5 px-3 py-2"
                  style={{ width: `${voiceWidth}px` }}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    openMenuByPoint(event.clientX, event.clientY);
                  }}
                >
                  {isUser ? (
                    <>
                      <span className="text-[13px] font-medium">{voiceDuration}"</span>
                      <div className="flex-1 flex justify-end">
                        <button
                          type="button"
                          onClick={handleVoiceIconClick}
                          className="p-0.5 active:opacity-70"
                          aria-label={isVoicePlaying ? '暂停语音' : '播放语音'}
                        >
                          {isVoicePlaying ? <Pause size={18} strokeWidth={2} /> : <Volume2 size={18} strokeWidth={2} />}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex-1">
                        <button
                          type="button"
                          onClick={handleVoiceIconClick}
                          className="p-0.5 active:opacity-70"
                          aria-label={isVoicePlaying ? '暂停语音' : '播放语音'}
                        >
                          {isVoicePlaying ? <Pause size={18} strokeWidth={2} /> : <Volume2 size={18} strokeWidth={2} />}
                        </button>
                      </div>
                      <span className="text-[13px] font-medium">{voiceDuration}"</span>
                    </>
                  )}
                </div>
              ) : isImage ? (
                <div
                  className="flex w-[220px] max-w-full flex-col gap-2 overflow-hidden"
                  onContextMenu={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    openMenuByPoint(event.clientX, event.clientY);
                  }}
                >
                  <img
                    src={message.imageDataUrl}
                    alt={showImageCaption ? imageCaption : '图片消息'}
                    className="max-h-[280px] w-full rounded-[10px] object-cover"
                    loading="lazy"
                  />
                  {showImageCaption ? (
                    <div
                      style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap', ...customTextStyle }}
                      className="px-0.5 pb-0.5 text-[14px] leading-[1.35]"
                    >
                      {imageCaption}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div
                  style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap', ...customTextStyle }}
                  className="text-[16px] leading-[1.4]"
                >
                  {message.content}
                </div>
              )}
            </div>
          </div>

          {isVoice && message.voiceTranscriptVisible && message.voiceTranscriptText ? (
            <div
              className="mt-1 max-w-[100%] overflow-hidden rounded-[6px] bg-black/5 px-2 py-1 text-[13px] text-gray-600"
              style={{ alignSelf: isUser ? 'flex-end' : 'flex-start' }}
            >
              {message.voiceTranscriptText}
            </div>
          ) : null}

          {quoteText && (
            <div className="mt-1 bg-[#E5E5E5] rounded-[4px] px-2 py-1 max-w-[100%] overflow-hidden" style={{ alignSelf: isUser ? 'flex-end' : 'flex-start' }}>
              <div className="text-[12px] text-gray-500 break-words" style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 3, overflow: 'hidden' }}>
                {quoteText}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
