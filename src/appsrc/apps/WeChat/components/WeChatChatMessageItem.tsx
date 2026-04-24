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
  onOrderRequestAction?: (message: WeChatMessage, action: 'accepted' | 'rejected') => void;
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
  isSelected, isSelectionMode, isMenuOpen, onMessageClick, onOpenMessageMenu, onVoiceMessagePlay, onOrderRequestAction, isVoicePlaying, onToggleSelection, onAvatarClick
}) => {
  const isPat = message.type === 'pat';
  const isTransfer = message.type === 'transfer' || message.type === 'transfer_accepted';
  const isOrderRequest = message.type === 'order_request';
  const isShoppingInvite = message.type === 'shopping_invite';
  const isMovieTicket = message.type === 'movie_ticket' && Boolean(message.movieTicket);
  const isGiftDelivery = message.type === 'gift_delivery' && Boolean(message.giftDelivery);
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
  const showTail =
    !isUsingCustomBubble &&
    bubblePreset === 'wechat' &&
    !isOrderRequest &&
    !isShoppingInvite &&
    !isMovieTicket &&
    !isGiftDelivery;
  const tailClass = isUser ? 'border-l-[#95ec69]' : 'border-r-white';
  const movieTicket = message.movieTicket;
  const giftDelivery = message.giftDelivery;
  const orderPreviewItems = Array.isArray(message.orderPreview?.items)
    ? message.orderPreview.items.filter((item) => item.name.trim())
    : [];
  const previewedItemCount = orderPreviewItems.reduce((sum, item) => sum + Math.max(0, Number(item.qty) || 0), 0);
  const totalPreviewItemCount = Math.max(0, Number(message.orderPreview?.totalItemCount) || 0);
  const remainingPreviewItemCount = Math.max(0, totalPreviewItemCount - previewedItemCount);
  const orderPreviewStoreNames = Array.isArray(message.orderPreview?.storeNames)
    ? message.orderPreview.storeNames.map((item) => item.trim()).filter(Boolean)
    : [];
  const orderPreviewStoreText =
    orderPreviewStoreNames.length === 0
      ? ''
      : orderPreviewStoreNames.length === 1
        ? orderPreviewStoreNames[0]
        : `${orderPreviewStoreNames[0]}等${orderPreviewStoreNames.length}家店铺`;
  const orderPreviewGridItems = orderPreviewItems.slice(0, 4);
  const orderRemainingSummaryCount = Math.max(
    remainingPreviewItemCount,
    Math.max(0, orderPreviewItems.length - orderPreviewGridItems.length)
  );
  const orderAmountText = `¥${Number(message.amount || 0).toFixed(2)}`;
  const isLongOrderAmount = orderAmountText.length >= 8;
  const isVeryLongOrderAmount = orderAmountText.length >= 10;

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

  const handleOrderRequestAction = (event: React.MouseEvent<HTMLButtonElement>, action: 'accepted' | 'rejected') => {
    event.stopPropagation();
    if (onOrderRequestAction) {
      onOrderRequestAction(message, action);
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
                  : isOrderRequest || isShoppingInvite || isMovieTicket || isGiftDelivery
                    ? 'overflow-hidden rounded-[18px] border border-[#EAECEF] bg-white shadow-[0_8px_20px_rgba(15,23,42,0.06)]'
                  : `${bubblePresetClass} ${isImage ? 'p-1.5' : 'px-3.5 py-2.5'}`
                }`}
              style={
                !isTransfer && !isOrderRequest && !isShoppingInvite && !isMovieTicket && !isGiftDelivery
                  ? customBubbleStyle
                  : undefined
              }
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
              ) : isOrderRequest ? (
                <div className="flex w-[244px] max-w-full flex-col bg-white">
                  <div className="border-b border-[#E5E7EB] px-4 pb-3 pt-3">
                    <div className="text-[17px] font-medium leading-tight text-[#1F2937]">
                      {message.content.trim() || '有一笔订单等你支付~'}
                    </div>
                    <div className="mt-3 rounded-[16px] bg-[#F3F4F6] px-3 py-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 text-[12px] font-medium text-[#64748B]">订单金额</div>
                        <div className="shrink-0 text-right">
                          <div
                            className="whitespace-nowrap font-semibold text-[#F97316]"
                            style={{
                              fontSize: isVeryLongOrderAmount ? '18px' : isLongOrderAmount ? '21px' : '24px',
                              letterSpacing: isVeryLongOrderAmount ? '-0.03em' : '-0.02em',
                              lineHeight: 1.1,
                              textShadow: '0 1px 0 rgba(194, 65, 12, 0.18)',
                            }}
                          >
                            {orderAmountText}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 border-t border-[#E5E7EB] pt-2">
                        <div className="text-[12px] font-medium text-[#64748B]">订单详情:</div>
                        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[13px] leading-[1.45] text-[#4B5563]">
                          {orderPreviewGridItems.length > 0 ? (
                            orderPreviewGridItems.map((item) => (
                              <div key={item.name} className="truncate">
                                • {item.name}
                                {item.qty > 1 ? ` x${item.qty}` : ''}
                              </div>
                            ))
                          ) : orderPreviewStoreText ? (
                            <div className="col-span-2 truncate">• {orderPreviewStoreText}</div>
                          ) : (
                            <div className="col-span-2 truncate">• 待支付订单</div>
                          )}
                          {orderRemainingSummaryCount > 0 ? (
                            <div className="col-span-2 truncate">• 其余{orderRemainingSummaryCount}件商品...</div>
                          ) : null}
                          {orderPreviewGridItems.length === 1 ? (
                            <div className="opacity-0 select-none">占位</div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                  {message.orderRequestStatus === 'accepted' ? (
                    <div className="px-4 py-3 text-center text-[14px] font-medium text-[#16A34A]">已同意代付</div>
                  ) : message.orderRequestStatus === 'rejected' ? (
                    <div className="px-4 py-3 text-center text-[14px] font-medium text-[#DC2626]">已拒绝代付</div>
                  ) : (
                    <div className="grid grid-cols-2 divide-x divide-[#E5E7EB]">
                      <button
                        type="button"
                        onClick={(event) => handleOrderRequestAction(event, 'accepted')}
                        className="px-4 py-3 text-[15px] font-medium text-[#16A34A] active:bg-[#F0FDF4]"
                      >
                        同意
                      </button>
                      <button
                        type="button"
                        onClick={(event) => handleOrderRequestAction(event, 'rejected')}
                        className="px-4 py-3 text-[15px] font-medium text-[#DC2626] active:bg-[#FEF2F2]"
                      >
                        拒绝
                      </button>
                    </div>
                  )}
                </div>
              ) : isShoppingInvite ? (
                <div className="flex w-[238px] max-w-full flex-col bg-white">
                  <div className="border-b border-[#E5E7EB] px-4 pb-3 pt-3">
                    <div className="text-[17px] font-medium leading-tight text-[#1F2937]">
                      {message.content.trim() || '邀请你一起购物'}
                    </div>
                    <div className="mt-3 rounded-[16px] bg-[linear-gradient(135deg,#FDF2F8_0%,#EFF6FF_100%)] px-3 py-3">
                      <div className="text-[13px] font-semibold text-[#BE185D]">同TA购物邀请</div>
                      <div className="mt-1 text-[12px] leading-[1.55] text-[#475569]">
                        {message.shoppingInvite?.inviteText?.trim() || '一起边逛边聊，看到喜欢的就马上分享。'}
                      </div>
                      <div className="mt-2 rounded-[12px] bg-white/80 px-3 py-2 text-[12px] text-[#64748B]">
                        同意后会直接进入一起购物模式，页面里会一直有陪伴聊天浮窗。
                      </div>
                    </div>
                  </div>
                  {message.orderRequestStatus === 'accepted' ? (
                    <div className="px-4 py-3 text-center text-[14px] font-medium text-[#16A34A]">已同意一起购物</div>
                  ) : message.orderRequestStatus === 'rejected' ? (
                    <div className="px-4 py-3 text-center text-[14px] font-medium text-[#DC2626]">已拒绝一起购物</div>
                  ) : (
                    <div className="grid grid-cols-2 divide-x divide-[#E5E7EB]">
                      <button
                        type="button"
                        onClick={(event) => handleOrderRequestAction(event, 'accepted')}
                        className="px-4 py-3 text-[15px] font-medium text-[#16A34A] active:bg-[#F0FDF4]"
                      >
                        同意
                      </button>
                      <button
                        type="button"
                        onClick={(event) => handleOrderRequestAction(event, 'rejected')}
                        className="px-4 py-3 text-[15px] font-medium text-[#DC2626] active:bg-[#FEF2F2]"
                      >
                        拒绝
                      </button>
                    </div>
                  )}
                </div>
              ) : isGiftDelivery && giftDelivery ? (
                <div
                  className="relative flex w-[214px] max-w-full flex-col overflow-hidden rounded-[20px] px-3 pb-3 pt-3"
                  style={{ background: 'linear-gradient(180deg, #FDE7ED 0%, #FBD0DA 100%)' }}
                >
                  <div className="pointer-events-none absolute inset-0 opacity-70">
                    <span className="absolute left-[16px] top-[18px] text-[18px] text-white/70">♡</span>
                    <span className="absolute right-[18px] top-[22px] text-[15px] text-white/70">♡</span>
                    <span className="absolute right-[24px] bottom-[58px] text-[17px] text-white/65">♡</span>
                  </div>
                  <div className="relative text-center">
                    <div className="text-[14px] font-semibold tracking-[0.02em] text-[#B4536C]">
                      {giftDelivery.title || '送你一份小礼物'}
                    </div>
                    <div className="mt-1 text-[11px] text-[#C26B84]">
                      {giftDelivery.subtitle || '希望你能喜欢~'}
                    </div>
                  </div>
                  <div className="relative mt-3 rounded-[16px] bg-white px-4 pb-4 pt-4 shadow-[0_10px_20px_rgba(244,114,182,0.10)]">
                    <div className="flex justify-center">
                      <div
                        className="flex h-[84px] w-[84px] items-center justify-center rounded-[20px] text-[54px] shadow-[inset_0_0_0_1px_rgba(251,191,202,0.45)]"
                        style={{ background: 'linear-gradient(180deg, #FFF7F2 0%, #FFE8DD 100%)' }}
                      >
                        {giftDelivery.coverEmoji || '🎁'}
                      </div>
                    </div>
                    <div className="mt-3 text-center text-[13px] font-semibold leading-[1.4] text-[#475569]">
                      {giftDelivery.productName}
                    </div>
                    <div className="mt-1.5 text-center text-[16px] font-black text-[#F59E0B]">
                      ¥ {Number(message.amount || 0).toFixed(2)}
                    </div>
                    <div className="mt-3 flex justify-center">
                      <div className="rounded-full border border-[#E8B8C5] bg-white px-5 py-1.5 text-[12px] font-semibold text-[#B4536C] shadow-[0_4px_10px_rgba(244,114,182,0.08)]">
                        查看详情
                      </div>
                    </div>
                  </div>
                </div>
              ) : isMovieTicket && movieTicket ? (
                <div
                  className="relative flex w-[238px] max-w-full flex-col overflow-hidden rounded-[20px] px-2.5 pb-2.5 pt-2.5 shadow-[0_12px_24px_rgba(30,64,175,0.24)]"
                  style={{ background: 'linear-gradient(180deg, #3C8EFF 0%, #2B63C7 42%, #234790 100%)' }}
                >
                  <div className="pointer-events-none absolute inset-x-2.5 top-2.5 h-[14px] rounded-t-[14px] opacity-55" style={{ background: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.22) 0px, rgba(255,255,255,0.22) 6px, transparent 6px, transparent 11px)' }} />
                  <div className="relative h-5" />

                  <div className="relative mx-1 rounded-[16px] bg-white px-3.5 pb-3.5 pt-3 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.12)]">
                    <div className="absolute -left-[10px] top-[98px] h-[20px] w-[20px] rounded-full bg-[#295AB7]" />
                    <div className="absolute -right-[10px] top-[98px] h-[20px] w-[20px] rounded-full bg-[#295AB7]" />

                    <div className="flex items-start justify-between gap-2.5">
                      <div className="min-w-0">
                        <div className="text-[12px] font-semibold tracking-[0.08em] text-[#1E3A8A]">银河系电影票根</div>
                        <div className="mt-1 truncate text-[11px] text-[#64748B]">{movieTicket.cinema}</div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-[11px] text-[#94A3B8]">票价</div>
                        <div className="mt-0.5 text-[18px] font-black tracking-[-0.02em] text-[#F97316]">
                          ¥{Number(message.amount || 0).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-[40px_minmax(0,1fr)] gap-x-2 gap-y-1 text-[11px] leading-[1.4] text-[#0F172A]">
                      <div className="text-[#64748B]">日期:</div>
                      <div className="font-semibold">{movieTicket.date} {movieTicket.time}</div>
                      <div className="text-[#64748B]">影院:</div>
                      <div className="font-semibold">{movieTicket.cinema}</div>
                      <div className="text-[#64748B]">厅号:</div>
                      <div className="font-semibold">{movieTicket.hall}</div>
                      <div className="text-[#64748B]">座位:</div>
                      <div className="font-semibold">{movieTicket.seat}</div>
                      <div className="text-[#64748B]">票数:</div>
                      <div className="font-semibold">{movieTicket.qty} 张</div>
                    </div>

                    <div className="pointer-events-none my-3 flex items-center justify-center gap-10">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#F87171]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-[#F87171]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-[#F87171]" />
                    </div>

                    <div className="rounded-[12px] border border-dashed border-[#CBD5E1] px-3 py-2.5">
                      <div className="flex items-center justify-between gap-2 text-[11px] text-[#64748B]">
                        <span className="truncate">票号 {movieTicket.orderId}</span>
                        <span className="shrink-0">取票码 {movieTicket.pickupCode}</span>
                      </div>
                    </div>
                  </div>

                  <div className="px-3 pt-2.5 text-center text-[11px] font-medium tracking-[0.08em] text-white/82">
                    查看详情 &gt;
                  </div>
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
