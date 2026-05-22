// src/components/wechat/WeChatChatMessageItem.tsx
import React from 'react';
import { Check, ArrowRightLeft, User, Pause, Volume2 } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { WeChatBubblePreset, WeChatMessage, WeChatUiRenderConfig } from '../types';
import { decodeWeChatOnlineStickerToken, wechatGifStickers } from '../emojiStickers';
import { DELIVERY_STORAGE_KEY } from '../../delivery/data';
import { DELIVERY_ORDERS_CHANGED_EVENT } from '../../delivery/paymentBridge';
import type { DeliveryOrderRecord, DeliveryTrackingRecord } from '../../delivery/types';

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
  selfBubbleColor?: string;
  customBubbleCss?: string;
  chatFontFamily?: string;
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

const normalizeSoftBubbleColor = (color: string): { backgroundColor: string; borderColor: string } => {
  const value = color.trim() || '#95ec69';
  const hex = value.match(/^#([0-9a-f]{6})$/i)?.[1];
  if (hex) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return {
      backgroundColor: `rgba(${r}, ${g}, ${b}, 0.58)`,
      borderColor: `rgba(${r}, ${g}, ${b}, 0.42)`,
    };
  }
  const rgb = value.match(/^rgba?\(([^)]+)\)$/i);
  if (rgb) {
    const [r, g, b] = rgb[1].split(',').map((part) => Number.parseFloat(part.trim()));
    if ([r, g, b].every((item) => Number.isFinite(item))) {
      return {
        backgroundColor: `rgba(${r}, ${g}, ${b}, 0.58)`,
        borderColor: `rgba(${r}, ${g}, ${b}, 0.42)`,
      };
    }
  }
  return { backgroundColor: value, borderColor: value };
};

const toCamelCaseStyleKey = (value: string): string =>
  value.trim().replace(/[-_]+([a-zA-Z0-9])/g, (_, c: string) => c.toUpperCase());

const readCssBlock = (css: string, selector: string): string => {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escapedSelector}\\s*\\{([\\s\\S]*?)\\}`, 'i'));
  return (match?.[1] || '').trim();
};

const splitCssDeclarations = (css: string): string[] => {
  const parts: string[] = [];
  let current = '';
  let parenDepth = 0;
  let quote: string | null = null;
  for (const char of css) {
    if (quote) {
      current += char;
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }
    if (char === '(') parenDepth += 1;
    if (char === ')') parenDepth = Math.max(0, parenDepth - 1);
    if (char === ';' && parenDepth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) parts.push(current);
  return parts;
};

const parseCssDeclarationStyle = (css: string): CSSProperties | undefined => {
  const declarations = readCssBlock(css, '.bubble') || css;
  const blockedKeys = new Set(['zIndex']);
  const entries = splitCssDeclarations(declarations)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const index = item.indexOf(':');
      if (index <= 0) return null;
      const key = toCamelCaseStyleKey(item.slice(0, index));
      if (blockedKeys.has(key)) return null;
      return [key, item.slice(index + 1).trim()] as const;
    })
    .filter((item): item is readonly [string, string] => Boolean(item?.[0] && item?.[1]));
  if (entries.length === 0) return undefined;
  return entries.reduce<CSSProperties>((acc, [key, value]) => {
    (acc as Record<string, string>)[key] = value;
    return acc;
  }, {});
};

const parseBubblePseudoStyle = (
  css: string,
  selector: '.bubble::before' | '.bubble::after'
): CSSProperties | undefined => parseCssDeclarationStyle(readCssBlock(css, selector));

const mirrorBubbleSideStyle = (style?: CSSProperties): CSSProperties | undefined => {
  if (!style) return undefined;
  const next: CSSProperties = { ...style };
  const left = next.left;
  next.left = next.right;
  next.right = left;
  const marginLeft = next.marginLeft;
  next.marginLeft = next.marginRight;
  next.marginRight = marginLeft;
  const borderLeft = next.borderLeft;
  next.borderLeft = next.borderRight;
  next.borderRight = borderLeft;
  const borderLeftColor = next.borderLeftColor;
  next.borderLeftColor = next.borderRightColor;
  next.borderRightColor = borderLeftColor;
  const borderTopLeftRadius = next.borderTopLeftRadius;
  next.borderTopLeftRadius = next.borderTopRightRadius;
  next.borderTopRightRadius = borderTopLeftRadius;
  const borderBottomLeftRadius = next.borderBottomLeftRadius;
  next.borderBottomLeftRadius = next.borderBottomRightRadius;
  next.borderBottomRightRadius = borderBottomLeftRadius;
  return next;
};

const omitBubbleColorStyle = (style?: CSSProperties): CSSProperties | undefined => {
  if (!style) return undefined;
  const colorKeys = new Set([
    'background',
    'backgroundColor',
    'backgroundImage',
    'border',
    'borderColor',
    'borderTop',
    'borderRight',
    'borderBottom',
    'borderLeft',
    'borderTopColor',
    'borderRightColor',
    'borderBottomColor',
    'borderLeftColor',
    'color',
  ]);
  const entries = Object.entries(style).filter(([key]) => !colorKeys.has(key));
  if (entries.length === 0) return undefined;
  return entries.reduce<CSSProperties>((acc, [key, value]) => {
    (acc as Record<string, string | number>)[key] = value as string | number;
    return acc;
  }, {});
};

const renderInlineEmojiContent = (content: string) => {
  const stickerMap = new Map(wechatGifStickers.map((sticker) => [sticker.name, sticker]));
  const parts = content.split(/(\[gif:[^\]]+\]|\[[^\[\]]{1,12}\])/g).filter((part) => part.length > 0);
  return parts.map((part, index) => {
    const onlineSticker = decodeWeChatOnlineStickerToken(part);
    const name = part.match(/^\[([^\[\]]{1,12})\]$/)?.[1];
    const sticker = onlineSticker || (name ? stickerMap.get(name) : undefined);
    if (!sticker) return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
    const previousPart = parts[index - 1] || '';
    const previousOnlineSticker = decodeWeChatOnlineStickerToken(previousPart);
    const previousName = previousPart.match(/^\[([^\[\]]{1,12})\]$/)?.[1];
    const hasPreviousSticker = Boolean(previousOnlineSticker || (previousName && stickerMap.has(previousName)));
    return (
      <img
        key={`${sticker.id}-${index}`}
        src={sticker.url}
        alt={sticker.name}
        className={`${hasPreviousSticker ? '-ml-1' : ''} inline-block h-8 w-8 min-w-8 shrink-0 align-[-8px] object-contain`}
        loading="lazy"
      />
    );
  });
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readDeliveryOrderById = (orderId: string | undefined): DeliveryOrderRecord | null => {
  if (!orderId || typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(DELIVERY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const orders = isRecord(parsed) && Array.isArray(parsed.orders) ? parsed.orders : [];
    const match = orders.find((item) => isRecord(item) && item.id === orderId);
    return match ? (match as DeliveryOrderRecord) : null;
  } catch {
    return null;
  }
};

const createLiveDeliveryTracking = (
  order: DeliveryOrderRecord | null,
  fallback: NonNullable<WeChatMessage['giftDelivery']>,
  now: number,
): DeliveryTrackingRecord | null => {
  if (!order) {
    if (!fallback.deliveryStage && typeof fallback.deliveryEtaMinutes !== 'number' && !fallback.addressTitle) return null;
    return {
      stage: fallback.deliveryStage === '接单' || fallback.deliveryStage === '出餐' || fallback.deliveryStage === '配送' || fallback.deliveryStage === '送达'
        ? fallback.deliveryStage
        : '配送',
      progress: 58,
      driverName: '骑手阿泽',
      driverDistanceKm: 1.2,
      etaMinutes: Math.max(0, Math.round(fallback.deliveryEtaMinutes ?? 18)),
      destination: fallback.addressTitle || '等待骑手更新配送信息',
      updatedAt: now,
    };
  }

  const destination = order.deliveryAddress?.title || order.delivery?.destination || fallback.addressTitle || '等待骑手更新配送信息';
  if (order.status === '已送达') {
    return {
      stage: '送达',
      progress: 100,
      driverName: order.delivery?.driverName || '骑手阿泽',
      driverDistanceKm: 0,
      etaMinutes: 0,
      destination,
      updatedAt: now,
    };
  }

  const elapsedMinutes = Math.max(0, (now - order.createdAt) / 60000);
  const progress = Math.min(100, Math.round(14 + elapsedMinutes * 4.8));
  const stage = progress < 25 ? '接单' : progress < 55 ? '出餐' : progress < 90 ? '配送' : '送达';

  return {
    stage,
    progress,
    driverName: order.delivery?.driverName || '骑手阿泽',
    driverDistanceKm: Math.max(0.1, Number((2.3 - elapsedMinutes * 0.12).toFixed(1))),
    etaMinutes: Math.max(0, Math.round(18 - elapsedMinutes * 1.2)),
    destination,
    updatedAt: now,
  };
};

export const WeChatChatMessageItem: React.FC<WeChatChatMessageItemProps> = ({
  message, isUser, userAvatar, characterAvatar, characterName,
  selfBubblePreset, peerBubblePreset, selfBubbleColor, customBubbleCss, chatFontFamily, customRenderConfig,
  isSelected, isSelectionMode, isMenuOpen, onMessageClick, onOpenMessageMenu, onVoiceMessagePlay, onOrderRequestAction, isVoicePlaying, onToggleSelection, onAvatarClick
}) => {
  const isPat = message.type === 'pat';
  const isTransfer = message.type === 'transfer' || message.type === 'transfer_accepted';
  const isOrderRequest = message.type === 'order_request';
  const isShoppingInvite = message.type === 'shopping_invite';
  const isMovieTicket = message.type === 'movie_ticket' && Boolean(message.movieTicket);
  const isGiftDelivery = message.type === 'gift_delivery' && Boolean(message.giftDelivery);
  const isRecipeCard = message.type === 'recipe_card' && Boolean(message.recipeCard);
  const isVoice = message.type === 'voice' && Boolean(message.voiceAudioDataUrl);
  const isImage = message.type === 'image' && Boolean(message.imageDataUrl);
  const isSticker = message.type === 'sticker' && Boolean(message.stickerUrl);
  const imageCaption = message.content.trim();
  const showImageCaption = imageCaption.length > 0 && imageCaption !== '[图片]';
  const voiceDuration = Math.max(1, Math.round(message.voiceDurationSeconds || 1));
  const voiceWidth = Math.max(96, Math.min(220, 92 + voiceDuration * 6));
  const quoteText = message.quoteText;
  const bubblePreset = isUser ? selfBubblePreset : peerBubblePreset;
  const bubblePresetClass = getBubblePresetClass(bubblePreset, isUser);
  const effectiveSelfBubbleColor = selfBubbleColor?.trim() || '#95ec69';
  const customBubbleStyle = normalizeStyle(
    isUser ? customRenderConfig?.selfBubbleStyle : customRenderConfig?.peerBubbleStyle
  );
  const customCssBubbleStyleRaw = parseCssDeclarationStyle(customBubbleCss || '');
  const customCssBubbleBeforeStyleRaw = parseBubblePseudoStyle(customBubbleCss || '', '.bubble::before');
  const customCssBubbleAfterStyleRaw = parseBubblePseudoStyle(customBubbleCss || '', '.bubble::after');
  const shouldMirrorImageBubble = !isUser && Boolean(customCssBubbleStyleRaw?.borderImageSource);
  const customCssBubbleStyle = isUser ? customCssBubbleStyleRaw : omitBubbleColorStyle(customCssBubbleStyleRaw);
  const customCssBubbleBeforeStyle = isUser ? customCssBubbleBeforeStyleRaw : mirrorBubbleSideStyle(customCssBubbleBeforeStyleRaw);
  const customCssBubbleAfterStyle = isUser ? customCssBubbleAfterStyleRaw : mirrorBubbleSideStyle(customCssBubbleAfterStyleRaw);
  const selfBubbleColorStyle: CSSProperties | undefined = isUser
    ? normalizeSoftBubbleColor(effectiveSelfBubbleColor)
    : undefined;
  const mergedBubbleStyle: CSSProperties | undefined = customBubbleStyle || selfBubbleColorStyle || customCssBubbleStyle
    ? {
        ...(selfBubbleColorStyle || {}),
        ...(customCssBubbleStyle || {}),
        ...(customBubbleStyle || {}),
        ...(shouldMirrorImageBubble
          ? { transform: `${customCssBubbleStyle?.transform || ''} scaleX(-1)`.trim() }
          : {}),
      }
    : undefined;
  const mirrorContentStyle: CSSProperties | undefined = shouldMirrorImageBubble ? { transform: 'scaleX(-1)' } : undefined;
  const messageFontStyle: CSSProperties | undefined = chatFontFamily ? { fontFamily: chatFontFamily } : undefined;
  const customTextStyle = normalizeStyle(
    isUser ? customRenderConfig?.selfTextStyle : customRenderConfig?.peerTextStyle
  );
  const isUsingCustomBubble = Boolean(customBubbleStyle || customCssBubbleStyle);
  const showTail =
    !isUsingCustomBubble &&
    bubblePreset === 'wechat' &&
    !isOrderRequest &&
    !isShoppingInvite &&
    !isMovieTicket &&
    !isGiftDelivery &&
    !isRecipeCard &&
    !isSticker;
  const tailClass = isUser ? 'border-l-[#95ec69]' : 'border-r-white';
  const tailStyle: CSSProperties | undefined = isUser
    ? { borderLeftColor: normalizeSoftBubbleColor(effectiveSelfBubbleColor).backgroundColor }
    : undefined;
  const movieTicket = message.movieTicket;
  const giftDelivery = message.giftDelivery;
  const recipeCard = message.recipeCard;
  const recipeIngredients = Array.isArray(recipeCard?.ingredients)
    ? recipeCard.ingredients
    : [];
  const recipeIngredientsText = recipeIngredients
    .map((ingredient) => `${ingredient.name}${ingredient.amount}`)
    .join('、');
  const recipeSeasoningIngredients = recipeIngredients.filter((ingredient) =>
    /酱|糖|醋|料|盐|油|葱|姜|蒜|香|粉|汁/.test(ingredient.name)
  );
  const recipeSeasoningText = recipeSeasoningIngredients.length > 0
    ? recipeSeasoningIngredients
      .map((ingredient) => `${ingredient.name}${ingredient.amount}`)
      .join(' + ')
    : '按口味加入盐、生抽和少许香油';
  const recipeStepsText = Array.isArray(recipeCard?.steps) && recipeCard.steps.length > 0
    ? recipeCard.steps.map((step, index) => `${index + 1}. ${step}`).join(' ')
    : recipeCard?.shareText ?? '';
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
  const [giftDetailsVisible, setGiftDetailsVisible] = React.useState(false);
  const [giftDeliveryRefreshKey, setGiftDeliveryRefreshKey] = React.useState(0);
  const giftDeliveryOrderId = Array.isArray(message.orderIds)
    ? message.orderIds.find((item) => typeof item === 'string' && item.trim())?.trim()
    : undefined;
  const liveGiftOrder = React.useMemo(
    () => (isGiftDelivery ? readDeliveryOrderById(giftDeliveryOrderId) : null),
    [giftDeliveryOrderId, giftDeliveryRefreshKey, isGiftDelivery],
  );
  const liveGiftTracking = React.useMemo(
    () => (giftDelivery ? createLiveDeliveryTracking(liveGiftOrder, giftDelivery, Date.now()) : null),
    [giftDelivery, giftDeliveryRefreshKey, liveGiftOrder],
  );
  const giftDeliveryStatusText = liveGiftOrder?.status === '已取消'
    ? '订单已取消'
    : liveGiftTracking?.stage === '送达'
      ? '已送达'
      : liveGiftTracking?.stage
        ? `${liveGiftTracking.stage}中`
        : '配送中';

  React.useEffect(() => {
    if (!isGiftDelivery) return undefined;

    const refresh = () => setGiftDeliveryRefreshKey((value) => value + 1);
    window.addEventListener(DELIVERY_ORDERS_CHANGED_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(DELIVERY_ORDERS_CHANGED_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [isGiftDelivery]);

  React.useEffect(() => {
    if (!isGiftDelivery || !giftDetailsVisible) return undefined;
    const timer = window.setInterval(() => {
      setGiftDeliveryRefreshKey((value) => value + 1);
    }, 15000);
    return () => window.clearInterval(timer);
  }, [giftDetailsVisible, isGiftDelivery]);

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
              }`} style={!isTransfer ? tailStyle : undefined} />
            ) : null}
            
            {/* 气泡本体 */}
            <div 
              onClick={(e) => onMessageClick(e, message)}
              className={`relative cursor-pointer ${isMenuOpen ? 'brightness-90' : ''} ${
                isTransfer
                  ? `bg-[#F39B3A] text-white overflow-hidden ${message.type === 'transfer_accepted' ? 'opacity-95' : ''}` 
                  : isOrderRequest || isShoppingInvite || isMovieTicket || isGiftDelivery || isRecipeCard
                    ? 'overflow-hidden rounded-[18px] border border-[#EAECEF] bg-white shadow-[0_8px_20px_rgba(15,23,42,0.06)]'
                  : isSticker
                    ? 'bg-transparent p-0'
                    : `${bubblePresetClass} ${isImage ? 'p-1.5' : 'px-3.5 py-2.5'}`
                }`}
              style={
                !isTransfer && !isOrderRequest && !isShoppingInvite && !isMovieTicket && !isGiftDelivery && !isRecipeCard && !isSticker
                  ? mergedBubbleStyle
                  : undefined
              }
            >
              {!isTransfer && !isOrderRequest && !isShoppingInvite && !isMovieTicket && !isGiftDelivery && !isRecipeCard && !isSticker && customCssBubbleBeforeStyle ? (
                <span className="pointer-events-none absolute" style={customCssBubbleBeforeStyle} />
              ) : null}
              {!isTransfer && !isOrderRequest && !isShoppingInvite && !isMovieTicket && !isGiftDelivery && !isRecipeCard && !isSticker && customCssBubbleAfterStyle ? (
                <span className="pointer-events-none absolute" style={customCssBubbleAfterStyle} />
              ) : null}
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
                  className="flex w-[244px] max-w-full flex-col overflow-hidden rounded-[16px] border border-[#EAECEF] bg-white shadow-[0_8px_20px_rgba(15,23,42,0.06)]"
                >
                  <div className="px-3.5 pb-3 pt-3">
                    <div className="text-[17px] font-bold leading-[1.35] text-[#0F172A]">
                      {giftDelivery.title || '为你点了一份外卖'}
                    </div>
                    <div className="mt-2.5 flex items-center gap-3">
                      <div className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-[14px] bg-[#FFF7ED] text-[34px] shadow-[inset_0_0_0_1px_rgba(251,146,60,0.18)]">
                        {giftDelivery.coverEmoji || '🍱'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[15px] font-semibold text-[#1F2937]">
                          {giftDelivery.productName}
                        </div>
                        <div className="mt-0.5 text-[18px] font-black text-[#F97316]">
                          ¥ {Number(message.amount || 0).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {giftDetailsVisible ? (
                      <div className="mt-3 rounded-[12px] bg-[#F8FAFC] px-3 py-2.5">
                        <div className="flex items-center justify-between gap-2 text-[13px] font-semibold text-[#334155]">
                          <span>{giftDeliveryStatusText}</span>
                          {liveGiftTracking ? (
                            <span>{liveGiftTracking.etaMinutes > 0 ? `约 ${liveGiftTracking.etaMinutes} 分钟` : '即将完成'}</span>
                          ) : null}
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#E2E8F0]">
                          <div
                            className="h-full rounded-full bg-[#94A3B8]"
                            style={{ width: `${liveGiftTracking?.progress ?? 0}%` }}
                          />
                        </div>
                        <div className="mt-2 truncate text-[12px] text-[#64748B]">
                          {giftDelivery.recipientName ? `${giftDelivery.recipientName} · ` : ''}
                          {liveGiftTracking?.destination || '等待骑手更新配送信息'}
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setGiftDetailsVisible((visible) => !visible);
                          setGiftDeliveryRefreshKey((value) => value + 1);
                        }}
                        className="w-full rounded-full border border-[#CBD5E1] bg-white px-3 py-2 text-[14px] font-semibold text-[#475569] active:bg-[#F8FAFC]"
                      >
                        {giftDetailsVisible ? '收起详情' : '查看详情'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : isRecipeCard && recipeCard ? (
                <div className="flex w-[220px] max-w-full flex-col overflow-hidden rounded-[16px] border border-[#F1E5A2] bg-white shadow-[0_8px_20px_rgba(15,23,42,0.06)]">
                  <div className="flex items-center gap-2 bg-[#FFF6A8] px-2.5 py-2">
                    <div className="relative h-[46px] w-[50px] shrink-0">
                      <div className="absolute left-0 top-5 h-5 w-7 rounded-[50%] bg-[#F5B2A9] shadow-[inset_0_0_0_1px_rgba(120,53,15,0.12)]" />
                      <div className="absolute left-3 top-6 h-5 w-7 rounded-[50%] bg-[#FFD0BE] shadow-[inset_0_0_0_1px_rgba(120,53,15,0.1)]" />
                      <div className="absolute left-5 top-2 h-6 w-6 rounded-full border border-[#F4C84A] bg-[#FFE36B] text-center text-[15px] leading-6">
                        🍋
                      </div>
                      <div className="absolute right-0 top-1 h-4 w-6 rotate-[-22deg] rounded-[50%] bg-[#9BC75A]" />
                      <div className="absolute right-2 top-7 h-5 w-4 rotate-[-18deg] rounded-[50%] bg-[#E7D240]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-1">
                        <span className="shrink-0 text-[14px] leading-none">🍋</span>
                        <div className="min-w-0 truncate text-[16px] font-black leading-[1.08] text-[#111111]">
                          {recipeCard.title}
                        </div>
                      </div>
                      <div className="mt-1 truncate text-[10px] font-semibold leading-[1.3] text-[#8A7A3B]">
                        *{recipeCard.subtitle || recipeCard.shareText} | {recipeCard.time}搞定*
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 px-3 py-3 text-[#111827]">
                    <div>
                      <div className="flex items-center gap-1.5 text-[14px] font-black leading-none">
                        <span className="text-[15px]">🧺</span>
                        <span>食材</span>
                      </div>
                      <p
                        className="mt-1 overflow-hidden break-words text-[12px] leading-[1.45]"
                        style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2 }}
                      >
                        {recipeIngredientsText || '按菜谱准备食材'}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 text-[14px] font-black leading-none">
                        <span className="text-[15px]">🥣</span>
                        <span>酱汁</span>
                      </div>
                      <p
                        className="mt-1 overflow-hidden break-words text-[12px] leading-[1.45]"
                        style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2 }}
                      >
                        {recipeSeasoningText}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 text-[14px] font-black leading-none">
                        <span className="text-[15px]">🔍</span>
                        <span>做法</span>
                      </div>
                      <p
                        className="mt-1 overflow-hidden break-words text-[12px] leading-[1.45]"
                        style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 3 }}
                      >
                        {recipeStepsText || '查看菜谱后开始制作。'}
                      </p>
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
              ) : isSticker ? (
                <div
                  className="flex max-w-[170px] overflow-hidden"
                  onContextMenu={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    openMenuByPoint(event.clientX, event.clientY);
                  }}
                >
                  <img
                    src={message.stickerUrl}
                    alt={message.stickerName || '表情'}
                    className="h-24 w-24 object-contain"
                    loading="lazy"
                  />
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
                      style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap', ...mirrorContentStyle, ...messageFontStyle, ...customTextStyle }}
                      className="px-0.5 pb-0.5 text-[14px] leading-[1.35]"
                    >
                      {imageCaption}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div
                  style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap', ...mirrorContentStyle, ...messageFontStyle, ...customTextStyle }}
                  className="text-[16px] leading-[1.4]"
                >
                  {renderInlineEmojiContent(message.content)}
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
