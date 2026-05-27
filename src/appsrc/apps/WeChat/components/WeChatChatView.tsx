// src/components/wechat/WeChatChatView.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useWeChatStore } from '../store';
import { useGlobalSettingsStore, useGlobalWorldBookStore } from '@baobaobaiOS/sdk';
import type { CSSProperties } from 'react';
import type { WeChatChatViewProps, WeChatMessage } from '../types';
import { useWeChatCharactersFromContacts } from '../contactAdapter';
import { normalizeUiStyleRecord, parseWeChatUiRenderConfig } from '../uiRenderConfig';
import { isVoiceProviderConfigured, synthesizeVoice } from '../voice';
import { compressImageFile } from './moments/momentsUtils';
import { isLikelyVisionChatModel } from '../../../../core/modelCapabilities';
import { PUSH_OPEN_APP_MESSAGE_TYPE } from '../../../../core/push/webPush';
import { wechatMemoryController } from '../memory';
import { queryPersonalMemoryByApp } from '../../../../core/appMemoryCenter';
import { getAppById } from '../../../../core/registry';
import { patchPersistedDeliveryOrders, updatePersistedDeliveryOrders } from '../../delivery/paymentBridge';
import type { DeliveryOrderRecord } from '../../delivery/types';
import { useShoppingStore } from '../../shopping/store';
import { updateShoppingOrdersInStorage } from '../../../shared/business/commerce/domain/ordersStorage';
import { useDreamMusicStore } from '../../dreammusic/store';
import { renderPaperMagicText } from '../../papermagic/promptCatalog';

import { WeChatChatHeader } from './WeChatChatHeader';
import { WeChatChatMessageItem } from './WeChatChatMessageItem';
import { WeChatChatInputBar } from './WeChatChatInputBar';
import { Modals } from './WeChatChatModals';
import { addWeChatCustomSticker } from '../emojiStickers';

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike extends ArrayLike<SpeechRecognitionAlternativeLike> {
  isFinal: boolean;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives?: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

interface VoiceCaptureResult {
  audioBlob: Blob;
  durationSeconds: number;
}

interface PendingVoiceDraft {
  audioDataUrl: string;
  durationSeconds: number;
  transcript: string;
}

type ChatCompletionContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

type ChatCompletionMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string | ChatCompletionContentPart[];
};

const getSpeechRecognitionConstructor = (): SpeechRecognitionConstructor | null => {
  if (typeof window === 'undefined') return null;
  const anyWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return anyWindow.SpeechRecognition || anyWindow.webkitSpeechRecognition || null;
};

const mapSpeechRecognitionError = (code?: string): string => {
  if (!code) return '语音识别失败';
  if (code === 'not-allowed' || code === 'service-not-allowed') {
    return '麦克风权限被拒绝，请在浏览器设置中允许麦克风';
  }
  if (code === 'audio-capture') {
    return '未检测到可用麦克风设备';
  }
  if (code === 'network') {
    return '语音识别服务不可达（网络或地区限制）';
  }
  if (code === 'no-speech') {
    return '未检测到语音，请重试';
  }
  if (code === 'aborted') {
    return '语音识别已停止';
  }
  return `语音识别失败：${code}`;
};

const normalizeSessionContextMessageLimit = (value: number | undefined): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) return 30;
  return Math.max(0, Math.min(120, Math.round(value)));
};

const normalizeMemoryReferenceLimit = (value: number | undefined): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) return 12;
  return Math.max(0, Math.min(40, Math.round(value)));
};

const normalizePersonalProfileMemoryLimit = (value: number): number => {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.max(0, Math.min(24, Math.round(value)));
};

const WECHAT_MEMORY_STOP_WORDS = new Set([
  '什么',
  '时候',
  '怎么',
  '可以',
  '不会',
  '没有',
  '这个',
  '那个',
  '今天',
  '明天',
  '一下',
  '哈哈',
  '呵呵',
  'ok',
]);

const extractWeChatMemoryKeywords = (content: string): string[] => {
  const normalized = content.toLowerCase();
  const chunks: string[] = normalized.match(/[\u4e00-\u9fa5]{2,}|[a-z0-9]{2,}/g) ?? [];
  const keywords = new Set<string>();

  chunks.forEach((chunk) => {
    if (WECHAT_MEMORY_STOP_WORDS.has(chunk)) return;
    keywords.add(chunk);
    if (/^[\u4e00-\u9fa5]+$/.test(chunk) && chunk.length > 2) {
      for (let index = 0; index < chunk.length - 1; index += 1) {
        const keyword = chunk.slice(index, index + 2);
        if (!WECHAT_MEMORY_STOP_WORDS.has(keyword)) keywords.add(keyword);
      }
    }
  });

  return [...keywords];
};

const isWeChatMemoryRelevantToTurn = (content: string, turnKeywords: string[]): boolean => {
  if (turnKeywords.length === 0) return false;
  const normalizedContent = content.toLowerCase();
  return turnKeywords.some((keyword) => normalizedContent.includes(keyword));
};

const isWeChatContentRecentlyUsed = (content: string, recentAssistantContents: string[]): boolean => {
  const normalizedContent = content.replace(/\s+/g, '').toLowerCase();
  if (normalizedContent.length < 4) return false;
  return recentAssistantContents.some((recentContent) => {
    const normalizedRecent = recentContent.replace(/\s+/g, '').toLowerCase();
    if (!normalizedRecent) return false;
    return (
      normalizedRecent.includes(normalizedContent) ||
      normalizedContent.includes(normalizedRecent)
    );
  });
};

const selectRelevantWorldBookLines = (content: string, turnKeywords: string[]): string[] => {
  if (turnKeywords.length === 0) return [];
  return content
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 6)
    .filter((line) => isWeChatMemoryRelevantToTurn(line, turnKeywords))
    .slice(0, 4);
};

const formatOrderPreviewForMemory = (message: Pick<WeChatMessage, 'orderPreview'>): string => {
  const previewItems = Array.isArray(message.orderPreview?.items)
    ? message.orderPreview.items.filter((item) => item.name.trim())
    : [];
  if (previewItems.length === 0) return '';
  const previewedCount = previewItems.reduce((sum, item) => sum + Math.max(0, Number(item.qty) || 0), 0);
  const totalItemCount = Math.max(0, Number(message.orderPreview?.totalItemCount) || 0);
  const remainingItemCount = Math.max(0, totalItemCount - previewedCount);
  const storeNames = Array.isArray(message.orderPreview?.storeNames)
    ? message.orderPreview.storeNames.map((item) => item.trim()).filter(Boolean)
    : [];
  const itemText = previewItems.map((item) => `${item.name}x${item.qty}`).join('、');
  const moreText = remainingItemCount > 0 ? ` 等${remainingItemCount}件商品` : '';
  const storeText =
    storeNames.length === 0
      ? ''
      : storeNames.length === 1
        ? ` 店铺：${storeNames[0]}`
        : ` 店铺：${storeNames[0]}等${storeNames.length}家店铺`;
  return ` 商品：${itemText}${moreText}${storeText}`;
};

const formatListenTogetherMinutes = (durationMs: number | undefined): string => {
  const totalMinutes = Math.max(1, Math.floor(Math.max(0, durationMs || 0) / 60000));
  if (totalMinutes < 60) return `${totalMinutes}分钟`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}小时${minutes}分钟` : `${hours}小时`;
};

const formatDreamMusicInviteForAi = (message: Pick<WeChatMessage, 'dreamMusicInvite' | 'orderRequestStatus'>): string => {
  const inviterName = message.dreamMusicInvite?.inviterName?.trim() || '用户';
  const trackText = message.dreamMusicInvite?.trackTitle
    ? `；歌曲：${message.dreamMusicInvite.trackTitle}${message.dreamMusicInvite.trackArtist ? ` - ${message.dreamMusicInvite.trackArtist}` : ''}`
    : '';
  const statusText =
    message.orderRequestStatus === 'accepted'
      ? '已同意加入'
      : message.orderRequestStatus === 'rejected'
        ? '已拒绝加入'
        : '等待你决定是否加入';
  return renderPaperMagicText('wechat.chat.specialMessage.listenInvite', {
    inviterName,
    statusText,
    trackText,
  }).replace(/^\[系统记录：/, '').replace(/\]$/, '');
};

const formatDreamMusicListenSummaryForAi = (message: Pick<WeChatMessage, 'dreamMusicListenSummary'>): string =>
  `一起听歌记录：我们一起听了${formatListenTogetherMinutes(message.dreamMusicListenSummary?.durationMs)}`;

const normalizeMessageContentForMemoryComparison = (message: WeChatMessage): string => {
  if (message.type === 'order_request' && typeof message.amount === 'number') {
    const actionText =
      message.orderRequestStatus === 'accepted'
        ? '已同意代付'
        : message.orderRequestStatus === 'rejected'
          ? '已拒绝代付'
          : '待支付订单';
    const orderIdsText =
      Array.isArray(message.orderIds) && message.orderIds.length > 0
        ? ` 订单号：${message.orderIds.join('、')}`
        : '';
    return `${actionText} ¥${message.amount.toFixed(2)}${orderIdsText}${formatOrderPreviewForMemory(message)}`;
  }

  if (message.type === 'movie_ticket' && message.movieTicket) {
    const ticket = message.movieTicket;
    return `分享电影票：${ticket.movieTitle}，影院${ticket.cinema}，日期${ticket.date} ${ticket.time}，${ticket.hall}，座位${ticket.seat}，${ticket.qty}张，取票码${ticket.pickupCode}`;
  }

  if (message.type === 'gift_delivery' && message.giftDelivery && typeof message.amount === 'number') {
    const gift = message.giftDelivery;
    return `收到礼物卡片：${gift.productName}，金额¥${message.amount.toFixed(2)}，订单号${gift.orderId}`;
  }

  if (message.type === 'recipe_card' && message.recipeCard) {
    const recipe = message.recipeCard;
    const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
    const ingredientText = ingredients.map((item) => `${item.name}${item.amount}`).join('、');
    return `分享菜谱：${recipe.title}，${recipe.subtitle}，${recipe.time}，${recipe.servings}，食材：${ingredientText}`;
  }

  if (message.type === 'dream_music_invite') {
    return formatDreamMusicInviteForAi(message);
  }

  if (message.type === 'dream_music_listen_summary') {
    return formatDreamMusicListenSummaryForAi(message);
  }

  if (message.type === 'image') {
    const caption = message.content.trim();
    if (caption && caption !== '[图片]') return `[图片] ${caption}`;
    return '[图片]';
  }

  if (message.type === 'sticker') {
    return `[动态表情] ${message.stickerName || message.content.replace('[表情]', '').trim() || '表情'}`;
  }

  if (message.type === 'voice') {
    const transcript = message.voiceTranscriptText?.trim();
    if (transcript) return transcript;
  }

  if (message.type === 'transfer' && typeof message.amount === 'number') {
    return `转账 ¥${message.amount.toFixed(2)}`;
  }

  if (message.type === 'transfer_accepted' && typeof message.amount === 'number') {
    return `收款 ¥${message.amount.toFixed(2)}`;
  }

  return message.content.trim();
};

const WECHAT_EMOJI_MEANING_MAP: Record<string, string> = {
  流泪: '难过、委屈、想哭',
  大哭: '非常难过或撒娇式崩溃',
  大笑: '开心、觉得好笑',
  发怒: '生气、不满',
  爱心: '喜欢、关心、表达爱意',
  点赞: '认可、赞同',
  害羞: '不好意思、羞涩',
  震惊: '惊讶、疑惑',
  亲亲: '亲昵、撒娇',
  睡觉: '困了、想睡',
  便便: '吐槽、嫌弃、玩笑',
  庆祝: '开心庆祝',
};

const explainWeChatEmojiText = (content: string): string => {
  const onlineGifNames = Array.from(content.matchAll(/\[gif:([^:\]]+):[^\]]+\]/g))
    .map((match) => {
      try {
        return decodeURIComponent(match[1]);
      } catch {
        return '';
      }
    })
    .filter(Boolean);
  const emojiNames = Array.from(content.matchAll(/\[([^\[\]:]{1,12})\]/g))
    .map((match) => match[1])
    .filter((name) => WECHAT_EMOJI_MEANING_MAP[name]);
  if (emojiNames.length === 0 && onlineGifNames.length === 0) return content;
  const uniqueNames = Array.from(new Set(emojiNames));
  const explanations = [
    ...uniqueNames.map((name) => `[${name}]≈${WECHAT_EMOJI_MEANING_MAP[name]}`),
    ...Array.from(new Set(onlineGifNames)).map((name) => `[在线GIF:${name}]≈动态表情，表达${name}`),
  ].join('；');
  return `${content}\n（表情含义：${explanations}）`;
};

const isIOSViewportDevice = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const userAgent = navigator.userAgent || '';
  const isIOSUserAgent = /iPad|iPhone|iPod/i.test(userAgent);
  const isMacTouchDevice = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return isIOSUserAgent || isMacTouchDevice;
};

const parseAssistantOrderDecision = (
  rawReply: string
): { action: 'accepted' | 'rejected' | null; content: string } => {
  const normalized = rawReply.trim();
  const match = normalized.match(/^\[(ORDER_REQUEST|代付决策|LISTEN_TOGETHER|一起听歌|MOVIE_TICKET|电影票|GIFT|礼物|RECIPE_CARD|菜谱|IMAGE_MESSAGE|图片)\s*:\s*(accepted|rejected|同意|拒绝)\]\s*/i);
  if (!match) {
    return {
      action: null,
      content: normalized,
    };
  }

  const label = match[1].toUpperCase();
  const actionToken = match[2].toLowerCase();
  const shouldApplyUiAction = ['ORDER_REQUEST', 'LISTEN_TOGETHER'].includes(label) || match[1] === '代付决策' || match[1] === '一起听歌';
  return {
    action: shouldApplyUiAction
      ? actionToken === 'accepted' || actionToken === '同意'
        ? 'accepted'
        : actionToken === 'rejected' || actionToken === '拒绝'
          ? 'rejected'
          : null
      : null,
    content: normalized.slice(match[0].length).trim(),
  };
};

export const WeChatChatView: React.FC<WeChatChatViewProps> = ({
  characterId,
  onBack,
  onOpenDetails,
  onReturnToShopping,
  returnToShoppingLabel,
  restoreVoiceCallSignal,
  onVoiceCallUiStateChange,
  readOnly = false,
}) => {
  const {
    wechatSessions, addWeChatMessage, deleteWeChatMessages,
    updateWeChatMessage, createWeChatSession, ensureWeChatSession, wechatUserProfile, withdrawWeChatBalance, wechatUiSettings, updateWeChatSessionSettings
  } = useWeChatStore();
  const wechatCharacters = useWeChatCharactersFromContacts();
  const settings = useGlobalSettingsStore((state) => state.settings);
  const worldBook = useGlobalWorldBookStore((state) => state.worldBook);
  
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isMultiline, setIsMultiline] = useState(false);
  const [isComposerFocused, setIsComposerFocused] = useState(false);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [showFullScreenEditor, setShowFullScreenEditor] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const cameraFileInputRef = useRef<HTMLInputElement>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const [isSendingImage, setIsSendingImage] = useState(false);
  const [showCameraCaptureModal, setShowCameraCaptureModal] = useState(false);
  const [isCameraInitializing, setIsCameraInitializing] = useState(false);

  const [showTransferView, setShowTransferView] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');
  const [showCallTypeSheet, setShowCallTypeSheet] = useState(false);
  const [showVoiceCallView, setShowVoiceCallView] = useState(false);
  const [isVoiceCallMinimized, setIsVoiceCallMinimized] = useState(false);
  const [voiceCallMicEnabled, setVoiceCallMicEnabled] = useState(true);
  const [voiceCallSpeakerEnabled, setVoiceCallSpeakerEnabled] = useState(false);
  const [voiceCallStatusText, setVoiceCallStatusText] = useState('等待对方接受邀请...');
  const [showVoiceRecorderModal, setShowVoiceRecorderModal] = useState(false);
  const [isRealVoiceRecording, setIsRealVoiceRecording] = useState(false);

  const [menuState, setMenuState] = useState<{
    messageId: string;
    x: number;
    y: number;
    text: string;
    messageType?: WeChatMessage['type'];
    canTranscribe?: boolean;
    transcriptVisible?: boolean;
    canAddSticker?: boolean;
  } | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<string | 'multi' | null>(null);
  const [quotingMessage, setQuotingMessage] = useState<{ senderName: string; content: string } | null>(null);

  const [forwardTargetModal, setForwardTargetModal] = useState<{ messageIds: string[] } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [pendingVoiceDraft, setPendingVoiceDraft] = useState<PendingVoiceDraft | null>(null);
  const [playingVoiceMessageId, setPlayingVoiceMessageId] = useState<string | null>(null);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [isVoiceSynthesizing, setIsVoiceSynthesizing] = useState(false);
  const peerAvatarTapStateRef = useRef<{ count: number; lastTapAt: number }>({
    count: 0,
    lastTapAt: 0,
  });
  const speechRecognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const voiceRecognitionManualStopRef = useRef(false);
  const voiceRecognitionRestartTimerRef = useRef<number | null>(null);
  const voiceRecognitionDiscardResultRef = useRef(false);
  const finalizeVoiceRecordingRef = useRef<(() => void) | null>(null);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const voiceAudioUrlRef = useRef<string | null>(null);
  const voiceSynthesisAbortRef = useRef<AbortController | null>(null);
  const messageVoiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const realVoiceMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const realVoiceMediaStreamRef = useRef<MediaStream | null>(null);
  const realVoiceChunksRef = useRef<Blob[]>([]);
  const realVoiceStartedAtRef = useRef(0);
  const realVoiceShouldSaveRef = useRef(false);
  const realVoiceRecognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const realVoiceRecognitionRestartTimerRef = useRef<number | null>(null);
  const realVoiceRecognitionStopRequestedRef = useRef(false);
  const realVoiceRecognitionActiveRef = useRef(false);
  const realVoiceTranscriptFinalRef = useRef('');
  const realVoiceTranscriptCurrentRef = useRef('');
  const realVoiceTranscriptSnapshotRef = useRef('');
  const voiceCallRecognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const voiceCallRecognitionRestartTimerRef = useRef<number | null>(null);
  const voiceCallRecognitionActiveRef = useRef(false);
  const voiceCallRecognitionStopRequestedRef = useRef(false);
  const voiceCallLastFinalAggregateRef = useRef('');
  const voiceCallUtteranceQueueRef = useRef<string[]>([]);
  const voiceCallRespondingRef = useRef(false);
  const voiceCallConversationRef = useRef<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const voiceCallConnectTimerRef = useRef<number | null>(null);
  const voiceCallSpeakerEnabledRef = useRef(false);
  const lastRestoreVoiceCallSignalRef = useRef<number | null>(restoreVoiceCallSignal ?? null);
  const handledAutoReplyMessageIdsRef = useRef<Set<string>>(new Set());
  const autoReplyTimerRef = useRef<number | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomAnchorRef = useRef<HTMLDivElement>(null);
  const pendingAssistantReplyCountRef = useRef(0);
  const shouldFollowVisualViewport = useMemo(() => isIOSViewportDevice(), []);

  const character = wechatCharacters.find(c => c.id === characterId);
  const session = wechatSessions.find(s => s.characterId === characterId);
  const messages = session?.messages || [];
  const sessionUiSettings = {
    ...wechatUiSettings,
    selfBubblePreset: session?.selfBubblePreset || wechatUiSettings.selfBubblePreset,
    peerBubblePreset: session?.peerBubblePreset || wechatUiSettings.peerBubblePreset,
    selfBubbleColor: session?.selfBubbleColor || wechatUiSettings.selfBubbleColor,
    customBubbleCss: session?.customBubbleCss || '',
    customBubbleStyleId: session?.customBubbleStyleId || '',
    chatFontFamily: session?.chatFontFamily || '',
    chatFontData: session?.chatFontData || '',
    customBubbleStyles: session?.customBubbleStyles || [],
    customChatFonts: session?.customChatFonts || [],
  };
  const updateCurrentSessionUiSettings = useCallback(
    (settings: Parameters<typeof updateWeChatSessionSettings>[1]) => {
      const normalizedCharacterId = characterId.trim();
      if (!normalizedCharacterId) return;
      const sessionId = session?.id || ensureWeChatSession(normalizedCharacterId, { switchCurrent: false });
      updateWeChatSessionSettings(sessionId, settings);
    },
    [characterId, ensureWeChatSession, session?.id, updateWeChatSessionSettings]
  );

  useEffect(() => {
    if (!readOnly) return;
    setShowFullScreenEditor(false);
    setShowPlusMenu(false);
    setShowCameraCaptureModal(false);
    setShowTransferView(false);
    setShowCallTypeSheet(false);
    setShowVoiceCallView(false);
    setShowVoiceRecorderModal(false);
    setIsSelectionMode(false);
    setSelectedMessageIds([]);
    setMenuState(null);
    setDeleteTarget(null);
    setForwardTargetModal(null);
    setQuotingMessage(null);
    setPendingVoiceDraft(null);
  }, [readOnly]);

  useEffect(() => {
    const normalizedCharacterId = characterId.trim();
    if (!normalizedCharacterId) return;
    ensureWeChatSession(normalizedCharacterId, { switchCurrent: false });
  }, [characterId, ensureWeChatSession]);

  const chatModelSupportsVision = isLikelyVisionChatModel(settings.model || '');
  const customRenderConfig = useMemo(
    () =>
      wechatUiSettings.customRendererEnabled
        ? parseWeChatUiRenderConfig(wechatUiSettings.customRendererSource)
        : null,
    [wechatUiSettings.customRendererEnabled, wechatUiSettings.customRendererSource]
  );
  const chatBackgroundStyle = useMemo<CSSProperties>(() => {
    const baseStyle: CSSProperties = {};
    const customBackgroundStyle = normalizeUiStyleRecord(customRenderConfig?.chatBackgroundStyle);
    if (customBackgroundStyle) {
      Object.assign(baseStyle, customBackgroundStyle);
    }

    const backgroundOpacity = Math.max(
      0,
      Math.min(1, wechatUiSettings.chatBackgroundOpacity ?? 1)
    );

    const backgroundImage =
      session?.chatBackgroundImage ||
      customRenderConfig?.chatBackgroundImage ||
      wechatUiSettings.chatBackgroundImage;
    if (backgroundImage) {
      const backgroundUrl = JSON.stringify(backgroundImage);
      baseStyle.backgroundImage = `linear-gradient(rgba(255,255,255,${
        1 - backgroundOpacity
      }), rgba(255,255,255,${1 - backgroundOpacity})), url(${backgroundUrl})`;
      baseStyle.backgroundSize = 'cover';
      baseStyle.backgroundPosition = 'center';
      baseStyle.backgroundRepeat = 'no-repeat';
      baseStyle.backgroundBlendMode = 'normal';
    } else if (!baseStyle.backgroundColor) {
      baseStyle.backgroundColor = '#EDEDED';
    }

    return baseStyle;
  }, [
    customRenderConfig?.chatBackgroundImage,
    customRenderConfig?.chatBackgroundStyle,
    session?.chatBackgroundImage,
    wechatUiSettings.chatBackgroundImage,
    wechatUiSettings.chatBackgroundOpacity,
  ]);
  const chatFontFamily = sessionUiSettings.chatFontFamily || '';
  const chatFontFaceCss = [
    ...(sessionUiSettings.chatFontData && chatFontFamily
      ? [`@font-face{font-family:${JSON.stringify(chatFontFamily)};src:url(${sessionUiSettings.chatFontData});font-display:swap;}`]
      : []),
    ...(sessionUiSettings.customChatFonts || []).map(
      (font) => `@font-face{font-family:${JSON.stringify(font.fontFamily)};src:url(${font.fontData});font-display:swap;}`
    ),
  ].join('\n');

  const scrollToBottom = useCallback((extraPasses = 2) => {
    if (isSelectionMode) return;

    const run = (remaining: number) => {
      window.requestAnimationFrame(() => {
        const scroller = scrollRef.current;
        if (!scroller) return;

        const targetTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
        scroller.scrollTo({ top: targetTop, behavior: 'auto' });
        bottomAnchorRef.current?.scrollIntoView({ block: 'end' });

        if (remaining > 0) {
          window.setTimeout(() => run(remaining - 1), 80);
        }
      });
    };

    run(extraPasses);
  }, [isSelectionMode]);

  useEffect(() => {
    scrollToBottom(1);
  }, [messages.length, quotingMessage, scrollToBottom]);

  useEffect(() => {
    if (!isComposerFocused && keyboardInset === 0 && !showPlusMenu) return;
    scrollToBottom(2);
  }, [isComposerFocused, keyboardInset, scrollToBottom, showPlusMenu]);

  useEffect(() => {
    if (shouldFollowVisualViewport) {
      setKeyboardInset(0);
      return;
    }

    const KEYBOARD_INSET_THRESHOLD = 80;
    const syncKeyboardInset = () => {
      const layoutViewportHeight = Math.round(window.innerHeight);
      const viewportHeight = Math.round(window.visualViewport?.height ?? layoutViewportHeight);
      const viewportOffsetTop = Math.max(0, Math.round(window.visualViewport?.offsetTop ?? 0));
      const nextInset = Math.max(0, layoutViewportHeight - viewportHeight - viewportOffsetTop);
      setKeyboardInset(nextInset > KEYBOARD_INSET_THRESHOLD ? nextInset : 0);
    };

    syncKeyboardInset();
    window.addEventListener('resize', syncKeyboardInset);
    window.addEventListener('orientationchange', syncKeyboardInset);
    window.visualViewport?.addEventListener('resize', syncKeyboardInset);
    window.visualViewport?.addEventListener('scroll', syncKeyboardInset);

    return () => {
      window.removeEventListener('resize', syncKeyboardInset);
      window.removeEventListener('orientationchange', syncKeyboardInset);
      window.visualViewport?.removeEventListener('resize', syncKeyboardInset);
      window.visualViewport?.removeEventListener('scroll', syncKeyboardInset);
    };
  }, [shouldFollowVisualViewport]);

  const handleComposerFocus = useCallback(() => {
    setIsComposerFocused(true);
    if (showPlusMenu) setShowPlusMenu(false);
    scrollToBottom(3);
    window.setTimeout(() => scrollToBottom(3), 180);
  }, [scrollToBottom, setShowPlusMenu, showPlusMenu]);

  const handleComposerBlur = useCallback(() => {
    window.setTimeout(() => {
      const activeElement = document.activeElement;
      if (activeElement !== textareaRef.current) {
        setIsComposerFocused(false);
      }
    }, 0);
  }, []);

  const focusComposer = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    window.requestAnimationFrame(() => {
      try {
        textarea.focus({ preventScroll: true });
      } catch {
        textarea.focus();
      }

      const end = textarea.value.length;
      try {
        textarea.setSelectionRange(end, end);
      } catch {
        // ignore browsers that do not support selection on textarea
      }
    });
  }, []);

  const handleChatAreaClick = useCallback(() => {
    if (showPlusMenu) setShowPlusMenu(false);

    const textarea = textareaRef.current;
    if (textarea && document.activeElement === textarea) {
      textarea.blur();
    }
    setIsComposerFocused(false);
  }, [showPlusMenu]);

  const chatViewportStyle = useMemo<CSSProperties>(() => {
    if (shouldFollowVisualViewport) {
      return {
        top: 'var(--app-vv-offset-top, 0px)',
        height: 'var(--app-vv-height, var(--app-dvh, 100dvh))',
      };
    }

    return {
      top: 0,
      height: 'var(--app-dvh, 100dvh)',
      paddingBottom: `${keyboardInset}px`,
    };
  }, [keyboardInset, shouldFollowVisualViewport]);

  const isKeyboardVisible = shouldFollowVisualViewport
    ? isComposerFocused
    : keyboardInset > 0;

  const beginAssistantReply = useCallback(() => {
    pendingAssistantReplyCountRef.current += 1;
    setIsTyping(true);
  }, []);

  const endAssistantReply = useCallback(() => {
    pendingAssistantReplyCountRef.current = Math.max(
      0,
      pendingAssistantReplyCountRef.current - 1
    );
    setIsTyping(pendingAssistantReplyCountRef.current > 0);
  }, []);

  const clearVoicePlayback = () => {
    if (voiceAudioRef.current) {
      voiceAudioRef.current.pause();
      voiceAudioRef.current.onended = null;
      voiceAudioRef.current.onerror = null;
      voiceAudioRef.current = null;
    }
    if (voiceAudioUrlRef.current) {
      URL.revokeObjectURL(voiceAudioUrlRef.current);
      voiceAudioUrlRef.current = null;
    }
  };

  const stopVoiceSynthesis = () => {
    if (voiceSynthesisAbortRef.current) {
      voiceSynthesisAbortRef.current.abort();
      voiceSynthesisAbortRef.current = null;
    }
    setIsVoiceSynthesizing(false);
  };

  const stopVoiceRecognition = (discardResult = false) => {
    voiceRecognitionDiscardResultRef.current = discardResult;
    if (voiceRecognitionRestartTimerRef.current) {
      window.clearTimeout(voiceRecognitionRestartTimerRef.current);
      voiceRecognitionRestartTimerRef.current = null;
    }
    const recognition = speechRecognitionRef.current;
    if (!recognition) return;
    voiceRecognitionManualStopRef.current = true;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
    try {
      recognition.abort();
    } catch {
      // ignore stop errors when recognition is not active
    }
    speechRecognitionRef.current = null;
    setIsVoiceRecording(false);

    if (finalizeVoiceRecordingRef.current) {
      finalizeVoiceRecordingRef.current();
      finalizeVoiceRecordingRef.current = null;
    }
  };

  const blobToDataUrl = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
          return;
        }
        reject(new Error('voice-read-failed'));
      };
      reader.onerror = () => reject(reader.error || new Error('voice-read-failed'));
      reader.readAsDataURL(blob);
    });

  const stopMessageVoicePlayback = () => {
    if (messageVoiceAudioRef.current) {
      messageVoiceAudioRef.current.pause();
      messageVoiceAudioRef.current.onended = null;
      messageVoiceAudioRef.current.onerror = null;
      messageVoiceAudioRef.current = null;
    }
    setPlayingVoiceMessageId(null);
  };

  const clearVoiceCallConnectTimer = () => {
    if (voiceCallConnectTimerRef.current) {
      window.clearTimeout(voiceCallConnectTimerRef.current);
      voiceCallConnectTimerRef.current = null;
    }
  };

  const clearVoiceCallRecognitionRestartTimer = () => {
    if (voiceCallRecognitionRestartTimerRef.current) {
      window.clearTimeout(voiceCallRecognitionRestartTimerRef.current);
      voiceCallRecognitionRestartTimerRef.current = null;
    }
  };

  const stopVoiceCallRecognition = () => {
    voiceCallRecognitionActiveRef.current = false;
    voiceCallRecognitionStopRequestedRef.current = true;
    clearVoiceCallRecognitionRestartTimer();
    voiceCallLastFinalAggregateRef.current = '';
    const recognition = voiceCallRecognitionRef.current;
    if (!recognition) return;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
    try {
      recognition.stop();
    } catch {
      // ignore
    }
    voiceCallRecognitionRef.current = null;
  };

  const clearRealVoiceRecognitionRestartTimer = () => {
    if (realVoiceRecognitionRestartTimerRef.current) {
      window.clearTimeout(realVoiceRecognitionRestartTimerRef.current);
      realVoiceRecognitionRestartTimerRef.current = null;
    }
  };

  const stopRealVoiceRecognitionCapture = (): string => {
    realVoiceRecognitionActiveRef.current = false;
    realVoiceRecognitionStopRequestedRef.current = true;
    clearRealVoiceRecognitionRestartTimer();

    const transcript = (
      realVoiceTranscriptFinalRef.current || realVoiceTranscriptCurrentRef.current
    ).trim();

    const recognition = realVoiceRecognitionRef.current;
    if (recognition) {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        recognition.stop();
      } catch {
        // ignore
      }
      realVoiceRecognitionRef.current = null;
    }

    realVoiceTranscriptSnapshotRef.current = transcript;
    return transcript;
  };

  const startRealVoiceRecognitionCapture = (): boolean => {
    const SpeechRecognition = getSpeechRecognitionConstructor();
    if (!SpeechRecognition) {
      return false;
    }

    const startRecognitionInstance = () => {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'zh-CN';
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event) => {
          let nextFinal = '';
          let nextInterim = '';
          for (let index = 0; index < event.results.length; index += 1) {
            const result = event.results[index];
            const transcript = result?.[0]?.transcript?.trim();
            if (!transcript) continue;
            if (result.isFinal) {
              nextFinal += transcript;
            } else {
              nextInterim += transcript;
            }
          }

          realVoiceTranscriptFinalRef.current = nextFinal.trim();
          realVoiceTranscriptCurrentRef.current = `${nextFinal}${nextInterim}`.trim();
        };

        recognition.onerror = (event) => {
          if (!realVoiceRecognitionStopRequestedRef.current) {
            const message = mapSpeechRecognitionError(event?.error);
            if (event?.error && event.error !== 'no-speech' && event.error !== 'aborted') {
              setToastMessage(message);
              setTimeout(() => setToastMessage(null), 1800);
            }
          }
        };

        recognition.onend = () => {
          realVoiceRecognitionRef.current = null;
          if (realVoiceRecognitionStopRequestedRef.current || !realVoiceRecognitionActiveRef.current) {
            return;
          }
          clearRealVoiceRecognitionRestartTimer();
          realVoiceRecognitionRestartTimerRef.current = window.setTimeout(() => {
            realVoiceRecognitionRestartTimerRef.current = null;
            if (realVoiceRecognitionActiveRef.current && !realVoiceRecognitionStopRequestedRef.current) {
              startRecognitionInstance();
            }
          }, 120);
        };

        realVoiceRecognitionRef.current = recognition;
        recognition.start();
      } catch {
        realVoiceRecognitionRef.current = null;
      }
    };

    realVoiceRecognitionActiveRef.current = true;
    realVoiceRecognitionStopRequestedRef.current = false;
    realVoiceTranscriptFinalRef.current = '';
    realVoiceTranscriptCurrentRef.current = '';
    realVoiceTranscriptSnapshotRef.current = '';
    startRecognitionInstance();
    return true;
  };

  const stopRealVoiceRecording = (saveResult: boolean) => {
    realVoiceShouldSaveRef.current = saveResult;
    stopRealVoiceRecognitionCapture();
    const recorder = realVoiceMediaRecorderRef.current;
    if (!recorder) {
      setIsRealVoiceRecording(false);
      if (!saveResult) {
        setShowVoiceRecorderModal(false);
      }
      return;
    }
    if (recorder.state === 'inactive') {
      setIsRealVoiceRecording(false);
      return;
    }
    try {
      recorder.stop();
    } catch {
      setIsRealVoiceRecording(false);
    }
  };

  const handleOpenVoiceRecorderModal = () => {
    stopVoiceRecognition(true);
    if (showPlusMenu) setShowPlusMenu(false);
    setShowVoiceRecorderModal(true);
  };

  const handleOpenCallTypeSheet = () => {
    stopVoiceRecognition(true);
    if (showPlusMenu) setShowPlusMenu(false);
    setShowCallTypeSheet(true);
  };

  const handleOpenImagePicker = () => {
    if (isTyping || isSendingImage) return;
    stopVoiceRecognition(true);
    if (showPlusMenu) setShowPlusMenu(false);
    imageFileInputRef.current?.click();
  };

  const stopCameraStream = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
    }
  };

  const handleOpenCameraCapture = () => {
    if (isTyping || isSendingImage) return;
    stopVoiceRecognition(true);
    if (showPlusMenu) setShowPlusMenu(false);
    if (!navigator.mediaDevices?.getUserMedia) {
      cameraFileInputRef.current?.click();
      return;
    }
    setShowCameraCaptureModal(true);
  };

  const handleCloseCameraCapture = () => {
    setShowCameraCaptureModal(false);
    setIsCameraInitializing(false);
    stopCameraStream();
  };

  const sendImageFile = async (file: File) => {
    if (!character || isSendingImage) return;

    setIsSendingImage(true);
    try {
      const imageDataUrl = await compressImageFile(file);
      const sessionId = session?.id || createWeChatSession(character.id);
      addWeChatMessage(sessionId, {
        role: 'user',
        type: 'image',
        content: '[图片]',
        imageDataUrl,
        imageMimeType: file.type || 'image/jpeg',
        assistantReplyPending: true,
      });
      scrollToBottom();

      if (!settings.apiKey) {
        alert('请先配置 API Key');
        return;
      }
      if (!chatModelSupportsVision) {
        setToastMessage('当前模型可能不支持图片解析，请在设置中检测后再尝试');
        setTimeout(() => setToastMessage(null), 1800);
      }
    } catch {
      setToastMessage('图片处理失败，请重试');
      setTimeout(() => setToastMessage(null), 1800);
    } finally {
      setIsSendingImage(false);
    }
  };

  const handleChooseImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    await sendImageFile(file);
  };

  const handleTakePhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    await sendImageFile(file);
  };

  const handleCaptureFromCamera = async () => {
    const video = cameraVideoRef.current;
    if (!video || video.videoWidth <= 0 || video.videoHeight <= 0) {
      setToastMessage('相机尚未就绪，请稍后重试');
      setTimeout(() => setToastMessage(null), 1800);
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setToastMessage('拍照失败，请重试');
      setTimeout(() => setToastMessage(null), 1800);
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((value) => resolve(value), 'image/jpeg', 0.9)
    );
    if (!blob) {
      setToastMessage('拍照失败，请重试');
      setTimeout(() => setToastMessage(null), 1800);
      return;
    }

    const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
    handleCloseCameraCapture();
    await sendImageFile(file);
  };

  const handleStartVoiceCall = () => {
    if (!character) return;
    setShowCallTypeSheet(false);
    setIsVoiceCallMinimized(false);
    stopVoiceRecognition(true);
    stopRealVoiceRecording(false);
    voiceCallUtteranceQueueRef.current = [];
    voiceCallRespondingRef.current = false;
    voiceCallConversationRef.current = [];
    setVoiceCallMicEnabled(true);
    setVoiceCallSpeakerEnabled(false);
    voiceCallSpeakerEnabledRef.current = false;
    setVoiceCallStatusText('等待对方接受邀请...');
    setShowVoiceCallView(true);
    clearVoiceCallConnectTimer();
    voiceCallConnectTimerRef.current = window.setTimeout(() => {
      voiceCallConnectTimerRef.current = null;
      setVoiceCallStatusText('通话中...');
    }, 1100);
  };

  const handleCloseVoiceCall = () => {
    clearVoiceCallConnectTimer();
    stopVoiceCallRecognition();
    stopVoiceSynthesis();
    voiceCallUtteranceQueueRef.current = [];
    voiceCallRespondingRef.current = false;
    voiceCallConversationRef.current = [];
    setShowVoiceCallView(false);
    setIsVoiceCallMinimized(false);
    setVoiceCallMicEnabled(true);
    setVoiceCallSpeakerEnabled(false);
    voiceCallSpeakerEnabledRef.current = false;
    setVoiceCallStatusText('等待对方接受邀请...');
  };

  const handleMinimizeVoiceCall = () => {
    setIsVoiceCallMinimized(true);
    setToastMessage('已缩略');
    window.setTimeout(() => setToastMessage(null), 700);
  };

  const handleCloseVoiceRecorderModal = () => {
    if (isRealVoiceRecording) {
      stopRealVoiceRecording(false);
    }
    setShowVoiceRecorderModal(false);
  };

  const handleToggleRealVoiceRecording = async () => {
    if (isRealVoiceRecording) {
      stopRealVoiceRecording(true);
      return;
    }

    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setToastMessage('当前浏览器不支持录音');
      setTimeout(() => setToastMessage(null), 1800);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      realVoiceMediaStreamRef.current = stream;
      realVoiceMediaRecorderRef.current = recorder;
      realVoiceChunksRef.current = [];
      realVoiceStartedAtRef.current = Date.now();
      realVoiceShouldSaveRef.current = false;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          realVoiceChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const shouldSave = realVoiceShouldSaveRef.current;
        realVoiceShouldSaveRef.current = false;
        setIsRealVoiceRecording(false);
        const transcript = (
          realVoiceTranscriptSnapshotRef.current ||
          realVoiceTranscriptFinalRef.current ||
          realVoiceTranscriptCurrentRef.current
        ).trim();
        realVoiceTranscriptSnapshotRef.current = '';
        realVoiceTranscriptFinalRef.current = '';
        realVoiceTranscriptCurrentRef.current = '';

        const mediaStream = realVoiceMediaStreamRef.current;
        if (mediaStream) {
          mediaStream.getTracks().forEach((track) => track.stop());
          realVoiceMediaStreamRef.current = null;
        }

        const mediaRecorder = realVoiceMediaRecorderRef.current;
        realVoiceMediaRecorderRef.current = null;
        const chunks = realVoiceChunksRef.current;
        realVoiceChunksRef.current = [];
        if (!shouldSave) {
          setShowVoiceRecorderModal(false);
          return;
        }
        if (!chunks.length || !character) {
          setShowVoiceRecorderModal(false);
          return;
        }

        void (async () => {
          try {
            const blob = new Blob(chunks, {
              type: mediaRecorder?.mimeType || 'audio/webm',
            });
            if (!blob.size) {
              setShowVoiceRecorderModal(false);
              return;
            }
            const audioDataUrl = await blobToDataUrl(blob);
            const durationSeconds = Math.max(
              1,
              Math.round((Date.now() - realVoiceStartedAtRef.current) / 1000)
            );
            const sessionId = session?.id || createWeChatSession(character.id);
            addWeChatMessage(sessionId, {
              role: 'user',
              type: 'voice',
              content: transcript || '[语音]',
              voiceAudioDataUrl: audioDataUrl,
              voiceDurationSeconds: durationSeconds,
              voiceTranscriptText: transcript || undefined,
              voiceTranscriptVisible: false,
              assistantReplyPending: true,
            });
            setShowVoiceRecorderModal(false);
            scrollToBottom();
            if (!transcript) {
              setToastMessage('未识别到语音文本，未发送给AI');
              setTimeout(() => setToastMessage(null), 1800);
              return;
            }
            if (!settings.apiKey) {
              alert('请先配置 API Key');
              return;
            }
          } catch {
            setShowVoiceRecorderModal(false);
            setToastMessage('语音保存失败');
            setTimeout(() => setToastMessage(null), 1800);
          }
        })();
      };

      recorder.start();
      const transcriptionStarted = startRealVoiceRecognitionCapture();
      if (!transcriptionStarted) {
        setToastMessage('当前浏览器不支持语音转写，仅保存录音');
        setTimeout(() => setToastMessage(null), 1800);
      }
      setIsRealVoiceRecording(true);
    } catch {
      setToastMessage('无法启动录音');
      setTimeout(() => setToastMessage(null), 1800);
    }
  };

  useEffect(() => {
    return () => {
      stopVoiceRecognition(true);
      stopRealVoiceRecording(false);
      stopVoiceCallRecognition();
      stopCameraStream();
      clearVoiceCallConnectTimer();
      stopVoiceSynthesis();
      clearVoicePlayback();
      stopMessageVoicePlayback();
    };
  }, []);

  useEffect(() => {
    if (!showCameraCaptureModal) return;
    if (!navigator.mediaDevices?.getUserMedia) return;

    let cancelled = false;
    const startCamera = async () => {
      setIsCameraInitializing(true);
      try {
        stopCameraStream();
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        cameraStreamRef.current = stream;
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream;
          try {
            await cameraVideoRef.current.play();
          } catch {
            // ignore play failures and keep stream for manual interaction
          }
        }
      } catch {
        setToastMessage('无法打开摄像头，请检查权限');
        setTimeout(() => setToastMessage(null), 2000);
        setShowCameraCaptureModal(false);
        cameraFileInputRef.current?.click();
      } finally {
        if (!cancelled) {
          setIsCameraInitializing(false);
        }
      }
    };

    void startCamera();

    return () => {
      cancelled = true;
      setIsCameraInitializing(false);
      stopCameraStream();
    };
  }, [showCameraCaptureModal]);

  useEffect(() => {
    if (!showVoiceCallView || !voiceCallMicEnabled) {
      stopVoiceCallRecognition();
      return;
    }
    startVoiceCallRecognition();
    return () => {
      stopVoiceCallRecognition();
    };
  }, [showVoiceCallView, voiceCallMicEnabled]);

  useEffect(() => {
    if (voiceAudioRef.current && showVoiceCallView) {
      voiceAudioRef.current.muted = !voiceCallSpeakerEnabled;
      voiceAudioRef.current.volume = voiceCallSpeakerEnabled ? 1 : 0;
    }
    voiceCallSpeakerEnabledRef.current = voiceCallSpeakerEnabled;
  }, [voiceCallSpeakerEnabled, showVoiceCallView]);

  useEffect(() => {
    if (restoreVoiceCallSignal == null) return;
    if (lastRestoreVoiceCallSignalRef.current === restoreVoiceCallSignal) return;
    lastRestoreVoiceCallSignalRef.current = restoreVoiceCallSignal;
    setShowVoiceCallView(true);
    setIsVoiceCallMinimized(false);
  }, [restoreVoiceCallSignal]);

  useEffect(() => {
    if (!onVoiceCallUiStateChange) return;
    onVoiceCallUiStateChange({
      active: showVoiceCallView,
      minimized: showVoiceCallView && isVoiceCallMinimized,
      characterId,
      characterName: character?.name || '对方',
      characterAvatar: character?.avatar,
    });
  }, [
    onVoiceCallUiStateChange,
    showVoiceCallView,
    isVoiceCallMinimized,
    characterId,
    character?.name,
    character?.avatar,
  ]);

  const playVoiceReply = async (replyContent: string) => {
    const content = replyContent.trim();
    if (!content || !settings.voiceAutoPlay || !isVoiceProviderConfigured(settings)) {
      return;
    }

    stopVoiceSynthesis();
    clearVoicePlayback();
    const abortController = new AbortController();
    voiceSynthesisAbortRef.current = abortController;
    setIsVoiceSynthesizing(true);

    try {
      const audioBlob = await synthesizeVoice(settings, content, abortController.signal);
      if (abortController.signal.aborted) return;

      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      const endPlayback = () => {
        clearVoicePlayback();
        setIsVoiceSynthesizing(false);
      };

      voiceAudioRef.current = audio;
      voiceAudioUrlRef.current = audioUrl;
      audio.onended = endPlayback;
      audio.onerror = endPlayback;
      await audio.play();
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        console.error('Voice playback failed:', error);
      }
      clearVoicePlayback();
      setIsVoiceSynthesizing(false);
    } finally {
      if (voiceSynthesisAbortRef.current === abortController) {
        voiceSynthesisAbortRef.current = null;
      }
    }
  };

  const getAudioDurationSeconds = (audioSrc: string): Promise<number> =>
    new Promise((resolve) => {
      const audio = new Audio();
      const settle = (value: number) => {
        audio.onloadedmetadata = null;
        audio.onerror = null;
        resolve(Math.max(1, Math.round(value || 1)));
      };

      const timer = window.setTimeout(() => {
        settle(1);
      }, 1500);

      audio.onloadedmetadata = () => {
        window.clearTimeout(timer);
        settle(audio.duration || 1);
      };
      audio.onerror = () => {
        window.clearTimeout(timer);
        settle(1);
      };
      audio.src = audioSrc;
    });

  const playVoiceFromMessage = async (
    audioDataUrl: string,
    options?: { force?: boolean; muted?: boolean }
  ) => {
    if (!options?.force && !settings.voiceAutoPlay) return;
    clearVoicePlayback();
    const audio = new Audio(audioDataUrl);
    audio.muted = Boolean(options?.muted);
    audio.volume = options?.muted ? 0 : 1;
    const endPlayback = () => {
      clearVoicePlayback();
    };
    voiceAudioRef.current = audio;
    voiceAudioUrlRef.current = null;
    audio.onended = endPlayback;
    audio.onerror = endPlayback;
    try {
      await audio.play();
    } catch {
      clearVoicePlayback();
    }
  };

  const buildCharacterReplyMessage = async (
    replyContent: string
  ): Promise<Omit<WeChatMessage, 'id' | 'timestamp'>> => {
    const content = replyContent.trim();
    if (!content || !isVoiceProviderConfigured(settings)) {
      return { role: 'character', content };
    }

    stopVoiceSynthesis();
    const abortController = new AbortController();
    voiceSynthesisAbortRef.current = abortController;
    setIsVoiceSynthesizing(true);

    try {
      const audioBlob = await synthesizeVoice(settings, content, abortController.signal);
      if (abortController.signal.aborted) {
        return { role: 'character', content };
      }
      const audioDataUrl = await blobToDataUrl(audioBlob);
      const durationSeconds = await getAudioDurationSeconds(audioDataUrl);
      return {
        role: 'character',
        type: 'voice',
        content,
        voiceAudioDataUrl: audioDataUrl,
        voiceDurationSeconds: durationSeconds,
        voiceTranscriptText: content,
        voiceTranscriptVisible: false,
      };
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        console.error('Build character voice message failed:', error);
      }
      return { role: 'character', content };
    } finally {
      if (voiceSynthesisAbortRef.current === abortController) {
        voiceSynthesisAbortRef.current = null;
      }
      setIsVoiceSynthesizing(false);
    }
  };

  const adjustTextareaHeight = (element: HTMLTextAreaElement | null) => {
    if (!element) return;
    element.style.height = 'auto';
    const scrollHeight = element.scrollHeight;
    element.style.height = `${Math.min(scrollHeight, 120)}px`;
    setIsMultiline(scrollHeight > 36);
  };

  const handleInputChange = (value: string) => {
    if (pendingVoiceDraft) {
      setPendingVoiceDraft(null);
    }
    setInputValue(value);
    adjustTextareaHeight(textareaRef.current);
    if (showPlusMenu) setShowPlusMenu(false);
  };

  const handleDeleteInput = () => {
    if (pendingVoiceDraft) {
      setPendingVoiceDraft(null);
    }
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? inputValue.length;
    const end = textarea?.selectionEnd ?? inputValue.length;
    if (start === 0 && end === 0) return;
    const beforeCursor = inputValue.slice(0, start);
    const emojiTokenMatch = beforeCursor.match(/\[[^\[\]]{1,8}\]$/);
    const deleteStart = start === end
      ? emojiTokenMatch
        ? start - emojiTokenMatch[0].length
        : Math.max(0, start - (Array.from(beforeCursor).at(-1)?.length || 1))
      : start;
    const nextValue = `${inputValue.slice(0, deleteStart)}${inputValue.slice(end)}`;
    setInputValue(nextValue);
    window.requestAnimationFrame(() => {
      const nextTextarea = textareaRef.current;
      if (!nextTextarea) return;
      nextTextarea.focus({ preventScroll: true });
      nextTextarea.setSelectionRange(deleteStart, deleteStart);
      adjustTextareaHeight(nextTextarea);
    });
  };

  const toggleSelection = (messageId: string) => {
    setSelectedMessageIds(prev => prev.includes(messageId) ? prev.filter(id => id !== messageId) : [...prev, messageId]);
  };

  const exitSelectionMode = () => { setIsSelectionMode(false); setSelectedMessageIds([]); };

  const openMessageMenu = (msg: WeChatMessage, clientX: number, clientY: number) => {
    if (isSelectionMode) {
      toggleSelection(msg.id);
      return;
    }
    if (navigator.vibrate) navigator.vibrate(50);
    const x = Math.min(Math.max(clientX - 100, 20), window.innerWidth - 220);
    const y = Math.max(clientY - 90, 100);
    setMenuState({
      messageId: msg.id,
      x,
      y,
      text: msg.content,
      messageType: msg.type,
      canTranscribe: msg.type === 'voice' && Boolean(msg.voiceTranscriptText),
      transcriptVisible: Boolean(msg.voiceTranscriptVisible),
      canAddSticker: msg.type === 'sticker' && Boolean(msg.stickerUrl),
    });
  };

  const handleMessageClick = (e: React.MouseEvent, msg: WeChatMessage) => {
    e.stopPropagation();
    openMessageMenu(msg, e.clientX, e.clientY);
  };

  const executeDelete = () => {
    if (!session?.id) return;
    const idsToDelete = deleteTarget === 'multi' ? selectedMessageIds : [deleteTarget!];
    if (idsToDelete.length > 0) deleteWeChatMessages(session.id, idsToDelete);
    setDeleteTarget(null);
    if (deleteTarget === 'multi') exitSelectionMode();
  };

  const handleCopy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); } 
    catch (err) { /* 忽略剪贴板失败，保持静默降级 */ }
    setMenuState(null);
  };

  const handlePlayVoiceMessage = (message: WeChatMessage) => {
    if (!message.voiceAudioDataUrl) {
      setToastMessage('语音文件不存在');
      setTimeout(() => setToastMessage(null), 1500);
      return;
    }

    if (playingVoiceMessageId === message.id) {
      stopMessageVoicePlayback();
      return;
    }

    stopMessageVoicePlayback();
    const audio = new Audio(message.voiceAudioDataUrl);
    audio.onended = () => {
      stopMessageVoicePlayback();
    };
    audio.onerror = () => {
      stopMessageVoicePlayback();
      setToastMessage('语音播放失败');
      setTimeout(() => setToastMessage(null), 1500);
    };

    messageVoiceAudioRef.current = audio;
    setPlayingVoiceMessageId(message.id);
    void audio.play().catch(() => {
      stopMessageVoicePlayback();
      setToastMessage('语音播放失败');
      setTimeout(() => setToastMessage(null), 1500);
    });
  };

  const toggleVoiceTranscript = () => {
    if (!session?.id || !menuState?.messageId) return;
    const targetMessage = messages.find((item) => item.id === menuState.messageId);
    if (!targetMessage || targetMessage.type !== 'voice' || !targetMessage.voiceTranscriptText) {
      setMenuState(null);
      return;
    }
    updateWeChatMessage(session.id, targetMessage.id, {
      voiceTranscriptVisible: !targetMessage.voiceTranscriptVisible,
    });
    setToastMessage(targetMessage.voiceTranscriptVisible ? '已隐藏文字' : '已转为文字');
    setTimeout(() => setToastMessage(null), 1500);
    setMenuState(null);
  };

  const handlePeerAvatarTap = () => {
    if (!session?.id) return;

    const now = Date.now();
    const tapWindowMs = 700;
    const tapState = peerAvatarTapStateRef.current;
    tapState.count = now - tapState.lastTapAt <= tapWindowMs ? tapState.count + 1 : 1;
    tapState.lastTapAt = now;

    if (tapState.count < 2) return;

    tapState.count = 0;
    const suffix = (character?.patSuffix ?? '的肩膀').trim();
    const content = suffix ? `你拍了拍${character?.name}${suffix}` : `你拍了拍${character?.name}`;
    addWeChatMessage(session.id, { role: 'user', content, type: 'pat' });
    scrollToBottom();
  };

  const executeForward = (targetCharacterId: string) => {
    if (!forwardTargetModal) return;

    let targetSessionId = wechatSessions.find((sessionItem) => sessionItem.characterId === targetCharacterId)?.id;
    if (!targetSessionId) {
      targetSessionId = ensureWeChatSession(targetCharacterId, { switchCurrent: false });
    }
    if (!targetSessionId) return;

    const msgsToForward = messages
      .filter((messageItem) => forwardTargetModal.messageIds.includes(messageItem.id))
      .sort((left, right) => left.timestamp - right.timestamp);

    msgsToForward.forEach((messageItem) =>
      addWeChatMessage(targetSessionId!, {
        role: 'user',
        content: messageItem.content,
        type: messageItem.type,
        appSource: messageItem.appSource,
        amount: messageItem.amount,
        orderRequestStatus: messageItem.orderRequestStatus,
        orderIds: messageItem.orderIds,
        orderPreview: messageItem.orderPreview,
        giftDelivery: messageItem.giftDelivery,
        recipeCard: messageItem.recipeCard,
        movieTicket: messageItem.movieTicket,
        voiceAudioDataUrl: messageItem.voiceAudioDataUrl,
        voiceDurationSeconds: messageItem.voiceDurationSeconds,
        voiceTranscriptText: messageItem.voiceTranscriptText,
        voiceTranscriptVisible: messageItem.voiceTranscriptVisible,
        imageDataUrl: messageItem.imageDataUrl,
        imageMimeType: messageItem.imageMimeType,
        stickerUrl: messageItem.stickerUrl,
        stickerName: messageItem.stickerName,
      })
    );

    setForwardTargetModal(null);
    if (isSelectionMode) exitSelectionMode();
    setToastMessage('已转发');
    setTimeout(() => setToastMessage(null), 2000);
  };

  const buildApiMessages = (basePrompt: string, sessionId: string): ChatCompletionMessage[] => {
    const stateSnapshot = useWeChatStore.getState();
    stateSnapshot.syncWeChatRoleContext();
    const syncedStateSnapshot = useWeChatStore.getState();
    const chatHistory = syncedStateSnapshot.wechatSessions.find((s) => s.id === sessionId)?.messages || [];
    const sessionContextLimit = normalizeSessionContextMessageLimit(
      syncedStateSnapshot.wechatAiChatSettings?.recentMessageCount
    );
    const memoryReferenceLimit = normalizeMemoryReferenceLimit(
      syncedStateSnapshot.wechatAiChatSettings?.memoryReferenceCount
    );
    const effectiveMemoryReferenceLimit = Math.min(2, Math.ceil(memoryReferenceLimit / 4));
    const includePersonalProfileMemory =
      syncedStateSnapshot.wechatAiChatSettings?.includePersonalProfileMemory !== false;
    const personalProfileMemoryLimit = includePersonalProfileMemory
      ? normalizePersonalProfileMemoryLimit(Math.min(4, Math.max(0, effectiveMemoryReferenceLimit)))
      : 0;
    const deletedMemorySourceIdSet = new Set(
      (syncedStateSnapshot.wechatDeletedMemorySourceIds || []).map((item) => item.trim()).filter(Boolean)
    );
    const deletedMemoryContentHints = (syncedStateSnapshot.wechatDeletedMemoryContentHints || [])
      .map((item) => item.trim())
      .filter((item) => item.length >= 4);
    const sessionContextMessages =
      sessionContextLimit > 0 ? chatHistory.slice(-sessionContextLimit) : [];
    const latestUserTurnForMemory: WeChatMessage[] = [];
    for (let index = sessionContextMessages.length - 1; index >= 0; index -= 1) {
      const item = sessionContextMessages[index];
      if (item.role !== 'user') break;
      latestUserTurnForMemory.unshift(item);
    }
    const latestUserTurnKeywords = extractWeChatMemoryKeywords(
      latestUserTurnForMemory
        .map((message) => normalizeMessageContentForMemoryComparison(message))
        .join('\n')
    );
    const recentSourceIdSet = new Set(sessionContextMessages.map((item) => item.id));
    const recentAssistantContents = sessionContextMessages
      .filter((item) => item.role === 'character')
      .slice(-3)
      .map((item) => normalizeMessageContentForMemoryComparison(item));
    const recentContentSet = new Set(
      sessionContextMessages
        .map((item) => normalizeMessageContentForMemoryComparison(item))
        .map((item) => item.trim())
        .filter(Boolean)
    );
    const apiMessages: ChatCompletionMessage[] = [{ role: 'system', content: basePrompt }];
    const worldBookContent = character?.worldBookId
      ? worldBook.find((entry) => entry.id === character.worldBookId)?.content?.trim()
      : '';
    const relevantWorldBookLines = worldBookContent
      ? selectRelevantWorldBookLines(worldBookContent, latestUserTurnKeywords)
          .filter((line) => !isWeChatContentRecentlyUsed(line, recentAssistantContents))
      : [];

    if (relevantWorldBookLines.length > 0) {
      apiMessages.push({
        role: 'system',
        content: renderPaperMagicText('wechat.chat.context.worldBook', {
          relevantWorldBookLines: relevantWorldBookLines.map((line) => `- ${line}`).join('\n'),
        }),
      });
    }

    const memoryLines = (() => {
      if (effectiveMemoryReferenceLimit <= 0) return [];

      // Pull a larger candidate window, then dedupe against current session context.
      const candidateRecords = wechatMemoryController.selectByContact(characterId, {
        limit: Math.max(effectiveMemoryReferenceLimit * 4, effectiveMemoryReferenceLimit + sessionContextMessages.length),
      });

      const dedupedRecords = candidateRecords.filter((record) => {
        if (record.role !== 'user') return false;
        if (record.sourceId && recentSourceIdSet.has(record.sourceId)) return false;
        const normalizedContent = record.content.trim();
        if (!normalizedContent) return false;
        if (!isWeChatMemoryRelevantToTurn(normalizedContent, latestUserTurnKeywords)) return false;
        if (isWeChatContentRecentlyUsed(normalizedContent, recentAssistantContents)) return false;
        return !recentContentSet.has(normalizedContent);
      });
      const isWeakenedRecord = (record: (typeof dedupedRecords)[number]): boolean => {
        if (record.sourceId && deletedMemorySourceIdSet.has(record.sourceId)) return true;
        const normalizedContent = record.content.trim();
        if (normalizedContent.length < 4) return false;
        return deletedMemoryContentHints.some(
          (hint) => normalizedContent.includes(hint) || hint.includes(normalizedContent)
        );
      };
      const normalRecords = dedupedRecords.filter((record) => !isWeakenedRecord(record));
      const weakenedRecords = dedupedRecords.filter(isWeakenedRecord);

      return [...normalRecords, ...weakenedRecords]
        .slice(0, effectiveMemoryReferenceLimit)
        .slice()
        .reverse()
        .map((record) => `${isWeakenedRecord(record) ? '- （弱参考）我：' : '- 我：'}${record.content}`);
    })();

    if (memoryLines.length > 0) {
      apiMessages.push({
        role: 'system',
        content: renderPaperMagicText('wechat.chat.context.memory', {
          memoryLines: memoryLines.join('\n'),
        }),
      });
    }

    const personalProfileLines = (() => {
      if (personalProfileMemoryLimit <= 0) return [];

      const perAppLimit = Math.max(1, Math.min(6, Math.ceil(personalProfileMemoryLimit / 4)));
      const groups = queryPersonalMemoryByApp({
        roleId: syncedStateSnapshot.activeRoleId,
        order: 'desc',
        limitPerApp: perAppLimit,
      }).filter((group) => group.appId !== 'wechat');

      if (groups.length === 0) return [];

      const dedupedContent = new Set<string>();
      const lines: string[] = [];

      groups.forEach((group) => {
        if (lines.length >= personalProfileMemoryLimit) return;
        const appLabel = getAppById(group.appId)?.name || group.appId;

        group.records.forEach((record) => {
          if (lines.length >= personalProfileMemoryLimit) return;
          const normalizedContent = record.content.trim();
          if (!normalizedContent) return;
          if (recentContentSet.has(normalizedContent)) return;
          if (dedupedContent.has(normalizedContent)) return;
          dedupedContent.add(normalizedContent);
          lines.push(`- [${appLabel}] ${normalizedContent}`);
        });
      });

      return lines;
    })();

    if (personalProfileLines.length > 0) {
      apiMessages.push({
        role: 'system',
        content: renderPaperMagicText('wechat.chat.context.personalProfile', {
          personalProfileLines: personalProfileLines.join('\n'),
        }),
      });
    }

    if (sessionContextMessages.length > 0) {
      apiMessages.push({
        role: 'system',
        content: renderPaperMagicText('wechat.chat.context.sessionIntro'),
      });
    }

    sessionContextMessages.forEach((m) => {
      const role: 'user' | 'assistant' = m.role === 'user' ? 'user' : 'assistant';

      if (m.type === 'image') {
        const caption = m.content.trim();
        const normalizedCaption = caption && caption !== '[图片]' ? caption : '';

        if (m.role === 'user' && m.imageDataUrl) {
          const textPrompt = normalizedCaption || renderPaperMagicText('wechat.chat.specialMessage.image', {
            normalizedCaption: '请根据这张图片内容回复。',
          });
          apiMessages.push({
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: m.imageDataUrl } },
              { type: 'text', text: textPrompt },
            ],
          });
          return;
        }

        const fallbackContent = normalizedCaption
          ? `[系统记录：${role === 'user' ? '用户' : '对方'}发送了一张图片，附言：${normalizedCaption}]`
          : `[系统记录：${role === 'user' ? '用户' : '对方'}发送了一张图片]`;
        apiMessages.push({
          role,
          content: fallbackContent,
        });
        return;
      }

      let content = explainWeChatEmojiText(m.content);
      if (m.type === 'order_request') {
        const actionText =
          m.orderRequestStatus === 'accepted'
            ? '已同意代付'
            : m.orderRequestStatus === 'rejected'
              ? '已拒绝代付'
              : '有一笔订单待支付';
        const orderIdsText =
          Array.isArray(m.orderIds) && m.orderIds.length > 0
            ? `；订单号：${m.orderIds.join('、')}`
            : '';
        const orderPreviewText = formatOrderPreviewForMemory(m).replace(/^ /, '；');
        content = renderPaperMagicText('wechat.chat.specialMessage.order', {
          actionText,
          amount: Number(m.amount || 0).toFixed(2),
          orderIdsText,
          orderPreviewText,
        });
      }
      if (m.type === 'movie_ticket' && m.movieTicket) {
        content = renderPaperMagicText('wechat.chat.specialMessage.movieTicket', {
          title: m.movieTicket.movieTitle,
          cinema: m.movieTicket.cinema,
          date: m.movieTicket.date,
          time: m.movieTicket.time,
          hall: m.movieTicket.hall,
          seat: m.movieTicket.seat,
          qty: m.movieTicket.qty,
          pickupCode: m.movieTicket.pickupCode,
        });
      }
      if (m.type === 'gift_delivery' && m.giftDelivery) {
        content = renderPaperMagicText('wechat.chat.specialMessage.gift', {
          productName: m.giftDelivery.productName,
          amount: Number(m.amount || 0).toFixed(2),
          orderId: m.giftDelivery.orderId,
        });
      }
      if (m.type === 'recipe_card' && m.recipeCard) {
        const ingredients = Array.isArray(m.recipeCard.ingredients) ? m.recipeCard.ingredients : [];
        const ingredientText = ingredients.map((item) => `${item.name}${item.amount}`).join('、');
        content = renderPaperMagicText('wechat.chat.specialMessage.recipe', {
          title: m.recipeCard.title,
          subtitle: m.recipeCard.subtitle,
          time: m.recipeCard.time,
          servings: m.recipeCard.servings,
          ingredientText,
        });
      }
      if (m.type === 'dream_music_invite') {
        content = `[系统记录：${formatDreamMusicInviteForAi(m)}]`;
      }
      if (m.type === 'dream_music_listen_summary') {
        content = renderPaperMagicText('wechat.chat.specialMessage.listenSummary', {
          durationText: formatListenTogetherMinutes(m.dreamMusicListenSummary?.durationMs),
        });
      }
      if (m.type === 'transfer') content = renderPaperMagicText('wechat.chat.specialMessage.transfer', { amount: m.amount });
      if (m.type === 'transfer_accepted') content = renderPaperMagicText('wechat.chat.specialMessage.transferAccepted', { amount: m.amount });
      if (m.type === 'pat') content = `[系统记录：${m.content}]`;
      if (m.type === 'voice') content = m.voiceTranscriptText?.trim() || m.content;
      if (m.quoteText) content = `[引用："${m.quoteText}"]\n${content}`;
      apiMessages.push({ role, content });
    });

    const latestUserTurn: WeChatMessage[] = [];
    for (let index = sessionContextMessages.length - 1; index >= 0; index -= 1) {
      const item = sessionContextMessages[index];
      if (item.role !== 'user') break;
      latestUserTurn.unshift(item);
    }
    if (latestUserTurn.length > 0) {
      const latestUserContent = latestUserTurn
        .map((message, index) => `${index + 1}. ${normalizeMessageContentForMemoryComparison(message)}`)
        .join('\n');
      apiMessages.push({
        role: 'system',
        content: renderPaperMagicText('wechat.chat.context.latestTurn', { latestUserContent }),
      });
    }

    return apiMessages;
  };

  const buildCharacterSystemPrompt = (
    mode: 'chat' | 'voice' = 'chat',
    extraInstruction = ''
  ): string => {
    if (!character) return extraInstruction;
    const personality = character.personality?.trim();
    const promptText = [
      `你正在微信里扮演「${character.name}」和我聊天。`,
      `人物简介：${character.description || '暂无'}`,
      personality ? `性格与说话方式：${personality}` : '',
      `开场语气参考：${character.greeting || '自然打招呼'}`,
      '',
      '回复原则：',
      '- 活人感优先：像真实微信好友临场反应，不像资料抽取器、任务助手、客服或设定朗读。',
      '- 先接情绪和语境，再决定要不要给信息；可以轻松、犹豫、吐槽、敷衍半句、顺着玩笑走。',
      '- 先回应我最近一句话的真实意图和情绪，再按人物口吻推进。',
      '- 如果我连续发了两条或多条消息，把它们当成同一轮输入一起理解；抓住最后这一轮的主问题回复，不要拆成每条各回一次。',
      '- 一次回复只围绕一个主要意思展开；不要把旧记忆、旧事件和当前问题都塞进同一条里。',
      '- 少说一点，只回一句；除非我明确追问细节，不要连续解释、补充建议或展开联想。',
      '- 当我表达“好、嗯、不用了、算了、今天到这、先这样”等确认、拒绝或收尾意思时，只自然接住当下情绪，不要继续上一轮的邀约、建议或解释。',
      '- 句子要像真人自然说话，前后要有明确关系；不要把零散记忆、物品、地点、情绪硬拼成一句不通顺的话。',
      '- 如果不确定怎么接，宁可短回一句自然的话，不要为了显得有细节而强行补充。',
      '- 严格区分说话人和事实归属：我发过的内容才是用户说过/做过的事；你自己上一条说过的话，只代表你的提议、玩笑或情绪，不能反过来说成是我说的。',
      '- 世界书和记忆中心的优先级低于当前聊天；除非我主动提到，不要把里面的旧事件拿出来继续聊。',
      '- 当前最后一轮没有出现的人物、地点、事件，不要突然引入；需要细节时可以顺着当前话题轻轻补一句。',
      '- 像微信真人聊天：自然、有来有回，可以短，可以停顿，可以追问，不要像客服、旁白、总结器或设定说明。',
      '- 优先复现人物的句长、语气词、表情/标点、玩笑方式、解释习惯、拒绝边界和情绪反应。',
      '- 不要连续两轮使用同一句开场或同一个问题；最近已经表达过的意思，只接新的信息，或换一个更自然的角度回应。',
      '- 不要复述世界书，不要解释你在扮演谁，不要输出“作为xxx”。',
      '- 不要每次都很完整地解决问题；关系里可以犹豫、吐槽、敷衍一下、转移话题或只接半句，但要贴合人物。',
      '- 没有证据的重大身份、亲密关系、疾病、家庭、财务不要编造。',
      mode === 'voice'
        ? '- 语音通话要更短、更即时，像边听边回。'
        : '- 文字微信优先只输出 1 句，短一点、像真人顺手回；直接输出聊天内容，不带姓名前缀。',
      extraInstruction,
    ].filter(Boolean).join('\n');
    return renderPaperMagicText('wechat.chat.characterSystem', {
      characterName: character.name,
      description: character.description || '暂无',
      personality: personality || '',
      greeting: character.greeting || '自然打招呼',
      extraInstruction,
    }) || promptText;
  };

  const requestAssistantReply = async (sessionId: string) => {
    if (!character) return;

    const requestStartedAt = Date.now();
    beginAssistantReply();
    try {
      const systemPrompt = buildCharacterSystemPrompt(
        'chat',
        [
          renderPaperMagicText('wechat.chat.orderRequestDecision'),
          renderPaperMagicText('wechat.chat.listenTogetherDecision'),
          renderPaperMagicText('wechat.chat.movieTicketDecision'),
          renderPaperMagicText('wechat.chat.giftDecision'),
          renderPaperMagicText('wechat.chat.recipeDecision'),
          renderPaperMagicText('wechat.chat.imageDecision'),
        ].filter(Boolean).join('\n\n')
      );

      const response = await fetch(`${settings.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${settings.apiKey}` },
        body: JSON.stringify({
          model: settings.model || 'gpt-3.5-turbo',
          messages: buildApiMessages(systemPrompt, sessionId),
          temperature: settings.temperature || 0.7,
          max_tokens: 80,
          frequency_penalty: 0.6,
          presence_penalty: 0.2,
        })
      });
      if (!response.ok) throw new Error('API 失败');
      const replyContentRaw = (await response.json()).choices[0].message.content;
      if (replyContentRaw) {
        const hasNewPendingUserMessage = (
          useWeChatStore.getState().wechatSessions.find((item) => item.id === sessionId)?.messages || []
        ).some(
          (message) =>
            message.role === 'user' &&
            message.assistantReplyPending &&
            message.timestamp > requestStartedAt
        );
        if (hasNewPendingUserMessage) return;

        const { action, content } = parseAssistantOrderDecision(replyContentRaw);
        const replyContent =
          content ||
          (action === 'accepted'
            ? '行，这单我来付。'
            : action === 'rejected'
              ? '这单我先不帮你付了。'
              : '');

        if (action) {
          const latestPendingActionMessage = [...(useWeChatStore.getState().wechatSessions.find((item) => item.id === sessionId)?.messages || [])]
            .reverse()
            .find(
              (message) =>
                message.role === 'user' &&
                (message.type === 'order_request' || message.type === 'dream_music_invite') &&
                message.orderRequestStatus === 'pending'
            );
          if (latestPendingActionMessage) {
            await applyOrderRequestAction(sessionId, latestPendingActionMessage, action, { silent: true });
          }
        }

        if (!replyContent) return;
        const replyMessage = await buildCharacterReplyMessage(replyContent);
        addWeChatMessage(sessionId, replyMessage);
        if (replyMessage.type === 'voice' && replyMessage.voiceAudioDataUrl) {
          void playVoiceFromMessage(replyMessage.voiceAudioDataUrl);
        } else {
          void playVoiceReply(replyContent);
        }
      }
    } catch (e) {
      addWeChatMessage(sessionId, { role: 'character', content: '[系统提示：AI连接失败]' });
    } finally {
      endAssistantReply();
      scrollToBottom();
    }
  };

  React.useEffect(() => {
    if (readOnly) return;
    if (!session) return;
    if (pendingAssistantReplyCountRef.current > 0) return;
    const pendingMessages = messages.filter(
      (message) =>
        message.role === 'user' &&
        message.assistantReplyPending &&
        !handledAutoReplyMessageIdsRef.current.has(message.id)
    );
    if (pendingMessages.length === 0) return;

    const sessionId = session.id;
    if (autoReplyTimerRef.current !== null) {
      window.clearTimeout(autoReplyTimerRef.current);
    }

    autoReplyTimerRef.current = window.setTimeout(() => {
      autoReplyTimerRef.current = null;
      if (pendingAssistantReplyCountRef.current > 0) return;

      const latestSession = useWeChatStore
        .getState()
        .wechatSessions.find((item) => item.id === sessionId);
      const latestPendingMessages = (latestSession?.messages || []).filter(
        (message) =>
          message.role === 'user' &&
          message.assistantReplyPending &&
          !handledAutoReplyMessageIdsRef.current.has(message.id)
      );
      if (latestPendingMessages.length === 0) return;

      latestPendingMessages.forEach((message) => {
        handledAutoReplyMessageIdsRef.current.add(message.id);
        updateWeChatMessage(sessionId, message.id, {
          assistantReplyPending: false,
        });
      });
      void requestAssistantReply(sessionId);
    }, 1600);

    return () => {
      if (autoReplyTimerRef.current !== null) {
        window.clearTimeout(autoReplyTimerRef.current);
        autoReplyTimerRef.current = null;
      }
    };
  }, [messages, readOnly, requestAssistantReply, session, updateWeChatMessage]);

  const requestAssistantReplyForVoiceCall = async (userText: string) => {
    if (!character) return;
    if (!settings.apiKey) {
      setToastMessage('请先配置 API Key');
      setTimeout(() => setToastMessage(null), 1600);
      return;
    }

    const normalizedUserText = userText.trim();
    if (!normalizedUserText) return;

    const nextConversation = [
      ...voiceCallConversationRef.current,
      { role: 'user' as const, content: normalizedUserText },
    ].slice(-20);
    voiceCallConversationRef.current = nextConversation;

    try {
      const systemPrompt = buildCharacterSystemPrompt('voice');

      const response = await fetch(`${settings.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${settings.apiKey}` },
        body: JSON.stringify({
          model: settings.model || 'gpt-3.5-turbo',
          messages: [{ role: 'system', content: systemPrompt }, ...nextConversation],
          temperature: settings.temperature || 0.7,
        }),
      });
      if (!response.ok) throw new Error('API 失败');
      const payload = await response.json();
      const replyContentRaw = payload?.choices?.[0]?.message?.content;
      const replyContent = typeof replyContentRaw === 'string' ? replyContentRaw.trim() : '';
      if (!replyContent) return;

      voiceCallConversationRef.current = [
        ...nextConversation,
        { role: 'assistant' as const, content: replyContent },
      ].slice(-20);

      const replyMessage = await buildCharacterReplyMessage(replyContent);
      if (replyMessage.type === 'voice' && replyMessage.voiceAudioDataUrl) {
        await playVoiceFromMessage(replyMessage.voiceAudioDataUrl, {
          force: true,
          muted: !voiceCallSpeakerEnabledRef.current,
        });
      } else {
        setToastMessage('语音通话需要配置 Minimax 语音');
        setTimeout(() => setToastMessage(null), 1600);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      setToastMessage('语音通话请求失败');
      setTimeout(() => setToastMessage(null), 1600);
    }
  };

  const processVoiceCallUtteranceQueue = async () => {
    if (voiceCallRespondingRef.current) return;
    if (!showVoiceCallView) return;
    const nextText = (voiceCallUtteranceQueueRef.current.shift() || '').trim();
    if (!nextText || !character) return;

    voiceCallRespondingRef.current = true;
    setVoiceCallStatusText('对方正在说话...');
    await requestAssistantReplyForVoiceCall(nextText);
    voiceCallRespondingRef.current = false;
    if (showVoiceCallView) {
      setVoiceCallStatusText('通话中...');
    }

    if (voiceCallUtteranceQueueRef.current.length > 0) {
      void processVoiceCallUtteranceQueue();
    }
  };

  const enqueueVoiceCallUtterance = (text: string) => {
    const normalized = text.trim();
    if (!normalized || !showVoiceCallView) return;
    voiceCallUtteranceQueueRef.current.push(normalized);
    void processVoiceCallUtteranceQueue();
  };

  const startVoiceCallRecognition = () => {
    const SpeechRecognition = getSpeechRecognitionConstructor();
    if (!SpeechRecognition) {
      setToastMessage('当前浏览器不支持语音识别');
      setTimeout(() => setToastMessage(null), 1800);
      return;
    }

    const startRecognitionInstance = () => {
      try {
        const recognition = new SpeechRecognition();
        voiceCallLastFinalAggregateRef.current = '';
        recognition.lang = 'zh-CN';
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event) => {
          let finalAggregate = '';
          for (let index = 0; index < event.results.length; index += 1) {
            const result = event.results[index];
            if (!result.isFinal) continue;
            const transcript = result?.[0]?.transcript?.trim();
            if (!transcript) continue;
            finalAggregate += transcript;
          }
          const normalizedFinal = finalAggregate.trim();
          if (!normalizedFinal) return;

          const previous = voiceCallLastFinalAggregateRef.current;
          let delta = '';
          if (!previous) {
            delta = normalizedFinal;
          } else if (normalizedFinal.startsWith(previous)) {
            delta = normalizedFinal.slice(previous.length).trim();
          } else if (!previous.startsWith(normalizedFinal)) {
            delta = normalizedFinal;
          }
          voiceCallLastFinalAggregateRef.current = normalizedFinal;
          if (delta) enqueueVoiceCallUtterance(delta);
        };

        recognition.onerror = (event) => {
          const code = event?.error || '';
          if (!code || code === 'no-speech' || code === 'aborted') return;
          setToastMessage(mapSpeechRecognitionError(code));
          setTimeout(() => setToastMessage(null), 1800);
        };

        recognition.onend = () => {
          voiceCallRecognitionRef.current = null;
          if (voiceCallRecognitionStopRequestedRef.current || !voiceCallRecognitionActiveRef.current) {
            return;
          }
          clearVoiceCallRecognitionRestartTimer();
          voiceCallRecognitionRestartTimerRef.current = window.setTimeout(() => {
            voiceCallRecognitionRestartTimerRef.current = null;
            if (voiceCallRecognitionActiveRef.current && !voiceCallRecognitionStopRequestedRef.current) {
              startRecognitionInstance();
            }
          }, 140);
        };

        voiceCallRecognitionRef.current = recognition;
        recognition.start();
      } catch {
        setToastMessage('语音识别启动失败');
        setTimeout(() => setToastMessage(null), 1800);
      }
    };

    voiceCallRecognitionActiveRef.current = true;
    voiceCallRecognitionStopRequestedRef.current = false;
    startRecognitionInstance();
  };

  const handleTransferSubmit = async () => {
    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0 || !character) return;
    if (amount > (wechatUserProfile.balance || 0)) {
      alert('零钱余额不足');
      return;
    }

    let sessionId = session?.id || createWeChatSession(character.id);
    addWeChatMessage(sessionId, { role: 'user', content: `转账 ¥${amount.toFixed(2)}`, type: 'transfer', amount });
    setShowTransferView(false); setTransferAmount(''); scrollToBottom();

    if (!settings.apiKey) {
      beginAssistantReply();
      setTimeout(() => {
        withdrawWeChatBalance(amount, {
          title: '转账',
          counterparty: character.name,
          avatar: character.avatar,
        });
        const acceptedText = `已收款 ¥${amount.toFixed(2)}`;
        addWeChatMessage(sessionId!, { role: 'character', content: acceptedText, type: 'transfer_accepted', amount });
        void playVoiceReply(acceptedText);
        endAssistantReply(); scrollToBottom();
      }, 2000); return;
    }

    beginAssistantReply();
    try {
      const systemPrompt = buildCharacterSystemPrompt(
        'chat',
        renderPaperMagicText('wechat.chat.transferDecision', { amount })
      );

      const response = await fetch(`${settings.baseUrl}/chat/completions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${settings.apiKey}` },
        body: JSON.stringify({ model: settings.model || 'gpt-3.5-turbo', messages: buildApiMessages(systemPrompt, sessionId), temperature: settings.temperature || 0.7 })
      });
      if (!response.ok) throw new Error('API 失败');
      const data = await response.json();
      let replyContent = data.choices[0].message.content;

      if (replyContent.includes('【接收转账】')) {
        withdrawWeChatBalance(amount, {
          title: '转账',
          counterparty: character.name,
          avatar: character.avatar,
        });
        addWeChatMessage(sessionId, { role: 'character', content: `已收款 ¥${amount.toFixed(2)}`, type: 'transfer_accepted', amount });
        replyContent = replyContent.replace('【接收转账】', '').trim();
      }
      if (replyContent) {
        const replyMessage = await buildCharacterReplyMessage(replyContent);
        addWeChatMessage(sessionId, replyMessage);
        if (replyMessage.type === 'voice' && replyMessage.voiceAudioDataUrl) {
          void playVoiceFromMessage(replyMessage.voiceAudioDataUrl);
        } else {
          void playVoiceReply(replyContent);
        }
      }
    } catch (e) { addWeChatMessage(sessionId, { role: 'character', content: '[系统提示：AI连接失败]' }); } 
    finally { endAssistantReply(); scrollToBottom(); }
  };

  const handleSend = async (inputOverride?: string) => {
    const contentToSend = (inputOverride ?? inputValue).trim();
    if (isVoiceRecording) {
      stopVoiceRecognition(true);
    }
    const hasVoiceDraftToSend = Boolean(pendingVoiceDraft);
    if ((!contentToSend && !hasVoiceDraftToSend) || !character) {
      return;
    }
    if (!settings.apiKey) {
      alert('请先配置 API Key');
      return;
    }

    let sessionId = session?.id || createWeChatSession(character.id);
    const messageData: Omit<WeChatMessage, 'id' | 'timestamp'> = hasVoiceDraftToSend
      ? {
          role: 'user',
          type: 'voice',
          content: contentToSend || pendingVoiceDraft!.transcript,
          voiceAudioDataUrl: pendingVoiceDraft!.audioDataUrl,
          voiceDurationSeconds: pendingVoiceDraft!.durationSeconds,
          voiceTranscriptText: contentToSend || pendingVoiceDraft!.transcript,
          voiceTranscriptVisible: false,
          assistantReplyPending: true,
        }
      : {
          role: 'user',
          content: contentToSend,
          assistantReplyPending: true,
        };
    if (quotingMessage) messageData.quoteText = `${quotingMessage.senderName}: ${quotingMessage.content}`;

    addWeChatMessage(sessionId, messageData);
    setInputValue('');
    setPendingVoiceDraft(null);
    setQuotingMessage(null);
    setShowFullScreenEditor(false);
    setIsMultiline(false);
    setShowPlusMenu(false);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    scrollToBottom();
    focusComposer();
  };

  const handleSendOnlineSticker = (sticker: { name: string; url: string }) => {
    if (!character || !sticker.url) return;
    if (!settings.apiKey) {
      alert('请先配置 API Key');
      return;
    }
    const sessionId = session?.id || createWeChatSession(character.id);
    addWeChatMessage(sessionId, {
      role: 'user',
      type: 'sticker',
      content: `[在线GIF:${sticker.name || '表情'}]`,
      stickerUrl: sticker.url,
      stickerName: sticker.name || '表情',
      assistantReplyPending: true,
    });
    setInputValue('');
    setPendingVoiceDraft(null);
    setQuotingMessage(null);
    setShowFullScreenEditor(false);
    setIsMultiline(false);
    setShowPlusMenu(false);
    scrollToBottom();
  };

  const handleAddCustomStickerFile = async (file: File) => {
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      addWeChatCustomSticker({
        name: file.name.replace(/\.[^.]+$/, '') || '表情',
        url: dataUrl,
      });
      setToastMessage('已添加到表情');
      setTimeout(() => setToastMessage(null), 1500);
    } catch {
      setToastMessage('添加失败');
      setTimeout(() => setToastMessage(null), 1500);
    }
  };

  const handleAddCustomFontFile = async (file: File, name: string) => {
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      const fontName = `WechatCustomFont_${Date.now()}`;
      const nextFont = {
        id: `font-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: name.trim() || file.name.replace(/\.[^.]+$/, '') || '自定义字体',
        fontFamily: fontName,
        fontData: dataUrl,
      };
      updateCurrentSessionUiSettings({
        chatFontFamily: fontName,
        chatFontData: dataUrl,
        customChatFonts: [nextFont, ...(sessionUiSettings.customChatFonts || [])],
      });
      setToastMessage('已导入字体');
      setTimeout(() => setToastMessage(null), 1500);
    } catch {
      setToastMessage('字体导入失败');
      setTimeout(() => setToastMessage(null), 1500);
    }
  };

  const handleAddCustomBubbleStyle = (name: string, css: string) => {
    const nextStyle = {
      id: `bubble-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim() || '自定义气泡',
      css: css.trim(),
    };
    updateCurrentSessionUiSettings({
      customBubbleCss: nextStyle.css,
      customBubbleStyleId: nextStyle.id,
      customBubbleStyles: [nextStyle, ...(sessionUiSettings.customBubbleStyles || [])],
    });
  };

  const handleDeleteCustomBubbleStyle = (id: string) => {
    const isDeletingSelected = sessionUiSettings.customBubbleStyleId === id;
    updateCurrentSessionUiSettings({
      customBubbleCss: isDeletingSelected ? '' : sessionUiSettings.customBubbleCss,
      customBubbleStyleId: isDeletingSelected ? '' : sessionUiSettings.customBubbleStyleId,
      customBubbleStyles: (sessionUiSettings.customBubbleStyles || []).filter((item) => item.id !== id),
    });
  };

  const handleDeleteCustomFont = (id: string) => {
    const target = (sessionUiSettings.customChatFonts || []).find((item) => item.id === id);
    updateCurrentSessionUiSettings({
      chatFontFamily: target?.fontFamily === sessionUiSettings.chatFontFamily ? '' : sessionUiSettings.chatFontFamily,
      chatFontData: target?.fontFamily === sessionUiSettings.chatFontFamily ? '' : sessionUiSettings.chatFontData,
      customChatFonts: (sessionUiSettings.customChatFonts || []).filter((item) => item.id !== id),
    });
  };

  const handleAddStickerFromMessage = () => {
    const target = messages.find((item) => item.id === menuState?.messageId);
    if (!target?.stickerUrl) return;
    addWeChatCustomSticker({
      name: target.stickerName || '表情',
      url: target.stickerUrl,
      online: /^https?:\/\//.test(target.stickerUrl),
    });
    setMenuState(null);
    setToastMessage('已添加到表情');
    setTimeout(() => setToastMessage(null), 1500);
  };

  const applyOrderRequestAction = useCallback(
    async (
      sessionId: string,
      message: WeChatMessage,
      action: 'accepted' | 'rejected',
      options?: { silent?: boolean }
    ) => {
      updateWeChatMessage(sessionId, message.id, {
        orderRequestStatus: action,
      });

      if (message.type === 'shopping_invite') {
        if (action === 'accepted' && character) {
          window.dispatchEvent(
            new CustomEvent(PUSH_OPEN_APP_MESSAGE_TYPE, {
              detail: {
                appId: 'shopping',
                params: {
                  shoppingState: {
                    tab: 'home',
                    route: { tab: 'home', screen: 'home' },
                    history: [],
                  },
                  shoppingTogether: {
                    active: true,
                    companionId: character.id,
                    companionName: character.name,
                    companionAvatar: character.avatar || '',
                  },
                },
              },
            })
          );
        }

        if (!options?.silent) {
          setToastMessage(action === 'accepted' ? '已同意一起购物' : '已拒绝一起购物');
          window.setTimeout(() => setToastMessage(null), 1800);
        }
        return;
      }

      if (message.type === 'dream_music_invite') {
        if (action === 'accepted' && character) {
          const invite = message.dreamMusicInvite;
          useDreamMusicStore.getState().acceptListenTogether({
            companionId: character.id,
            companionName: character.name,
            companionAvatar: character.avatar || '',
            inviterName: invite?.inviterName || '我',
          });
          window.dispatchEvent(
            new CustomEvent(PUSH_OPEN_APP_MESSAGE_TYPE, {
              detail: {
                appId: 'dreammusic',
              },
            })
          );
        }

        if (!options?.silent) {
          setToastMessage(action === 'accepted' ? '已同意一起听' : '已拒绝一起听');
          window.setTimeout(() => setToastMessage(null), 1800);
        }
        return;
      }

      const orderIds = Array.isArray(message.orderIds)
        ? message.orderIds
            .map((item) => (typeof item === 'string' ? item.trim() : ''))
            .filter(Boolean)
        : [];
      const isDeliveryOrderRequest =
        message.appSource === 'delivery' ||
        (message.appSource !== 'shopping' && returnToShoppingLabel === '返回外卖');
      const shouldHandleShoppingOrder = message.appSource === 'shopping' || !isDeliveryOrderRequest;

      if (orderIds.length > 0 && shouldHandleShoppingOrder) {
        const orderIdSet = new Set(orderIds);
        const now = Date.now();
        const nextOrders = await updateShoppingOrdersInStorage((orders) =>
          orders.map((order) => {
            if (!orderIdSet.has(order.id)) return order;
            if (action === 'accepted') {
              return {
                ...order,
                meta: {
                  ...order.meta,
                  paymentStatus: 'paid',
                  payStatus: 'paid',
                  status: '已付款',
                  delegateStatus: 'accepted',
                  shipAt: now,
                },
              };
            }
            return {
              ...order,
              meta: {
                ...order.meta,
                paymentStatus: 'pending-pay',
                payStatus: 'pending-pay',
                status: '待付款',
                delegateStatus: 'rejected',
              },
            };
          })
        );
        useShoppingStore.getState().setOrders(nextOrders);
      }

      const deliveryOrderIds = Array.isArray(message.orderIds)
        ? message.orderIds
            .map((item) => (typeof item === 'string' ? item.trim() : ''))
            .filter(Boolean)
        : [];

      if (deliveryOrderIds.length > 0 && isDeliveryOrderRequest) {
        let nextDeliveryOrders = patchPersistedDeliveryOrders(deliveryOrderIds, {
          status: action === 'accepted' ? '配送中' : '已取消',
          paymentStatus: action === 'accepted' ? 'accepted' : 'rejected',
        }, {
          clearCart: true,
        });
        const deliveryOrderIdSet = new Set(deliveryOrderIds);
        let hasMatchedDeliveryOrder = nextDeliveryOrders.some((order) => deliveryOrderIdSet.has(order.id));
        if (!hasMatchedDeliveryOrder) {
          const now = Date.now();
          const previewItems = Array.isArray(message.orderPreview?.items)
            ? message.orderPreview.items.filter((item) => item.name.trim())
            : [];
          const title = previewItems.slice(0, 2).map((item) => item.name.trim()).join('、') || '外卖订单';
          const storeNames = Array.isArray(message.orderPreview?.storeNames)
            ? message.orderPreview.storeNames.map((item) => item.trim()).filter(Boolean)
            : [];
          const deliveryOrderItems = Array.isArray(message.deliveryOrderItems)
            ? message.deliveryOrderItems.filter((item) => typeof item.productId === 'string' && item.productId.trim() && Number.isFinite(item.qty) && item.qty > 0)
            : [];
          const fallbackOrders: DeliveryOrderRecord[] = deliveryOrderIds.map((orderId) => ({
            id: orderId,
            type: '发起代付',
            title,
            merchantName: storeNames[0] || '外卖订单',
            amount: typeof message.amount === 'number' ? message.amount : 0,
            status: action === 'accepted' ? '配送中' : '已取消',
            createdAt: now,
            paymentMode: 'delegate',
            paymentStatus: action === 'accepted' ? 'accepted' : 'rejected',
            paymentContactId: character.id,
            paymentContactName: character.name,
            paymentContactAvatar: character.avatar,
            ...(deliveryOrderItems.length > 0 ? { items: deliveryOrderItems } : {}),
          }));
          nextDeliveryOrders = updatePersistedDeliveryOrders((current) => [
            ...fallbackOrders,
            ...current.filter((order) => !deliveryOrderIdSet.has(order.id)),
          ], {
            clearCart: true,
            orderIds: deliveryOrderIds,
          });
          hasMatchedDeliveryOrder = fallbackOrders.length > 0;
        }
      }

      if (!options?.silent) {
        setToastMessage(action === 'accepted' ? '已同意代付' : '已拒绝代付');
        window.setTimeout(() => setToastMessage(null), 1800);
      }
    },
    [character, returnToShoppingLabel, updateWeChatMessage]
  );

  const handleOrderRequestAction = useCallback(
    (message: WeChatMessage, action: 'accepted' | 'rejected') => {
      if (!session) return;
      void (async () => {
        try {
          await applyOrderRequestAction(session.id, message, action);
        } catch (error) {
          console.error('[WeChatChatView] order request action failed:', error);
          setToastMessage('订单状态更新失败，请稍后重试');
          window.setTimeout(() => setToastMessage(null), 1800);
        }
      })();
    },
    [applyOrderRequestAction, session]
  );

  const handleToggleVoiceInput = () => {
    if (isVoiceRecording) {
      stopVoiceRecognition(false);
      return;
    }

    const SpeechRecognition = getSpeechRecognitionConstructor();
    if (!SpeechRecognition) {
      setToastMessage('当前浏览器不支持语音识别');
      setTimeout(() => setToastMessage(null), 2000);
      return;
    }
    stopVoiceRecognition();
    voiceRecognitionManualStopRef.current = false;
    voiceRecognitionDiscardResultRef.current = false;
    setPendingVoiceDraft(null);
    if (showPlusMenu) setShowPlusMenu(false);

    let mediaRecorder: MediaRecorder | null = null;
    let mediaStream: MediaStream | null = null;
    let recordStartedAt = 0;
    const audioChunks: Blob[] = [];

    let transcriptCommitted = '';
    let transcriptRealtime = '';
    let hasRecognitionError = false;
    let recognitionErrorCode = '';
    let recognitionErrorMessage = '';
    let shouldStopDueToError = false;

    const stopVoiceCapture = async (): Promise<VoiceCaptureResult | null> => {
      const finalizeCapture = (): VoiceCaptureResult | null => {
        if (!mediaStream) return null;
        mediaStream.getTracks().forEach((track) => track.stop());
        mediaStream = null;
        if (audioChunks.length === 0) return null;
        const audioBlob = new Blob(audioChunks, {
          type: mediaRecorder?.mimeType || 'audio/webm',
        });
        if (!audioBlob.size) return null;
        const durationSeconds = Math.max(1, Math.round((Date.now() - recordStartedAt) / 1000));
        return { audioBlob, durationSeconds };
      };

      if (!mediaRecorder) {
        if (mediaStream) {
          mediaStream.getTracks().forEach((track) => track.stop());
          mediaStream = null;
        }
        return null;
      }

      if (mediaRecorder.state === 'inactive') {
        return finalizeCapture();
      }

      return new Promise((resolve) => {
        const done = () => resolve(finalizeCapture());
        mediaRecorder?.addEventListener('stop', done, { once: true });
        try {
          mediaRecorder?.stop();
        } catch {
          done();
        }
      });
    };

    const finalizeVoiceRecording = async () => {
      if (voiceRecognitionRestartTimerRef.current) {
        window.clearTimeout(voiceRecognitionRestartTimerRef.current);
        voiceRecognitionRestartTimerRef.current = null;
      }

      const voiceCaptureResult = await stopVoiceCapture();
      const transcript = (transcriptRealtime || transcriptCommitted).trim();
      speechRecognitionRef.current = null;
      setIsVoiceRecording(false);
      finalizeVoiceRecordingRef.current = null;

      if (voiceRecognitionDiscardResultRef.current) {
        voiceRecognitionDiscardResultRef.current = false;
        setPendingVoiceDraft(null);
        return;
      }

      if (transcript) {
        if (voiceCaptureResult) {
          try {
            const audioDataUrl = await blobToDataUrl(voiceCaptureResult.audioBlob);
            setPendingVoiceDraft({
              audioDataUrl,
              durationSeconds: voiceCaptureResult.durationSeconds,
              transcript,
            });
          } catch {
            setPendingVoiceDraft(null);
          }
        } else {
          setPendingVoiceDraft(null);
        }
        setInputValue(transcript);
        setTimeout(() => adjustTextareaHeight(textareaRef.current), 0);
        return;
      }

      setPendingVoiceDraft(null);
      voiceRecognitionDiscardResultRef.current = false;
      if (
        hasRecognitionError &&
        recognitionErrorCode &&
        recognitionErrorCode !== 'aborted' &&
        recognitionErrorCode !== 'no-speech'
      ) {
        setToastMessage(recognitionErrorMessage || '语音识别失败');
        setTimeout(() => setToastMessage(null), 2000);
      }
    };

    const startRecognition = () => {
      try {
        const recognition = new SpeechRecognition();
        let currentSessionFinal = '';
        let currentSessionInterim = '';

        recognition.lang = 'zh-CN';
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event) => {
          let nextFinal = '';
          let nextInterim = '';

          for (let index = 0; index < event.results.length; index += 1) {
            const result = event.results[index];
            const transcript = result?.[0]?.transcript?.trim();
            if (!transcript) continue;

            if (result.isFinal) {
              nextFinal += transcript;
            } else {
              nextInterim += transcript;
            }
          }

          currentSessionFinal = nextFinal.trim();
          currentSessionInterim = nextInterim.trim();
          transcriptRealtime = `${transcriptCommitted}${currentSessionFinal}${currentSessionInterim}`.trim();
          setInputValue(transcriptRealtime);
          setTimeout(() => adjustTextareaHeight(textareaRef.current), 0);
        };

        recognition.onerror = (event) => {
          hasRecognitionError = true;
          recognitionErrorCode = event?.error || '';
          recognitionErrorMessage = mapSpeechRecognitionError(event?.error);

          if (
            recognitionErrorCode &&
            recognitionErrorCode !== 'aborted' &&
            recognitionErrorCode !== 'no-speech'
          ) {
            shouldStopDueToError = true;
          }
        };

        recognition.onend = () => {
          speechRecognitionRef.current = null;

          const stablePart = (currentSessionFinal || currentSessionInterim).trim();
          if (stablePart) {
            transcriptCommitted = `${transcriptCommitted}${stablePart}`.trim();
            transcriptRealtime = transcriptCommitted;
            setInputValue(transcriptCommitted);
            setTimeout(() => adjustTextareaHeight(textareaRef.current), 0);
          }

          if (voiceRecognitionManualStopRef.current || shouldStopDueToError) {
            void finalizeVoiceRecording();
            return;
          }

          if (voiceRecognitionRestartTimerRef.current) {
            window.clearTimeout(voiceRecognitionRestartTimerRef.current);
            voiceRecognitionRestartTimerRef.current = null;
          }
          voiceRecognitionRestartTimerRef.current = window.setTimeout(() => {
            voiceRecognitionRestartTimerRef.current = null;
            if (!voiceRecognitionManualStopRef.current) {
              startRecognition();
            }
          }, 120);
        };

        speechRecognitionRef.current = recognition;
        recognition.start();
      } catch {
        hasRecognitionError = true;
        recognitionErrorCode = 'start-failed';
        recognitionErrorMessage = '无法启动语音识别';
        shouldStopDueToError = true;
        void finalizeVoiceRecording();
      }
    };

    const startCaptureAndRecognition = async () => {
      if (typeof MediaRecorder !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          mediaRecorder = new MediaRecorder(mediaStream);
          mediaRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
              audioChunks.push(event.data);
            }
          };
          recordStartedAt = Date.now();
          mediaRecorder.start();
        } catch {
          mediaRecorder = null;
          if (mediaStream) {
            mediaStream.getTracks().forEach((track) => track.stop());
            mediaStream = null;
          }
        }
      }

      setIsVoiceRecording(true);
      finalizeVoiceRecordingRef.current = () => {
        void finalizeVoiceRecording();
      };
      startRecognition();
    };

    void startCaptureAndRecognition();
  };

  if (!character) return null;

  return (
    <>
      {chatFontFaceCss ? <style>{chatFontFaceCss}</style> : null}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.2 }}
        className="absolute left-0 right-0 z-50 flex min-h-0 flex-col overflow-hidden bg-[#EDEDED]"
        style={chatViewportStyle}
      >
        
        {/* 顶部 Header */}
        <WeChatChatHeader
          isSelectionMode={isSelectionMode}
          selectedCount={selectedMessageIds.length}
          characterName={character.name}
          isTyping={isTyping}
          onBack={onBack}
          onReturnToShopping={onReturnToShopping}
          returnToShoppingLabel={returnToShoppingLabel}
          onExitSelection={exitSelectionMode}
          onDetailsClick={onOpenDetails}
        />

        {/* 消息列表内容 */}
        <div
          className="relative flex-1 min-h-0 overflow-hidden bg-[#EDEDED]"
          onClick={handleChatAreaClick}
        >
          <div
            ref={scrollRef}
            style={{
              position: 'absolute',
              inset: 0,
              overflowY: 'auto',
              overflowX: 'hidden',
              overflowAnchor: 'none',
              overscrollBehaviorY: 'contain',
              WebkitOverflowScrolling: 'touch',
              ...chatBackgroundStyle,
            }}
          >
            <div className="flex min-h-full flex-col px-4 pt-4 pb-6">
              {messages.map((message) => (
                <div key={message.id} className="pb-2">
                  <WeChatChatMessageItem 
                    message={message} isUser={message.role === 'user'} 
                    userAvatar={wechatUserProfile?.avatar} characterAvatar={character.avatar} characterName={character.name}
                    selfBubblePreset={sessionUiSettings.selfBubblePreset}
                    peerBubblePreset={sessionUiSettings.peerBubblePreset}
                    selfBubbleColor={sessionUiSettings.selfBubbleColor}
                    customBubbleCss={sessionUiSettings.customBubbleCss}
                    chatFontFamily={chatFontFamily}
                    customRenderConfig={customRenderConfig}
                    isSelected={selectedMessageIds.includes(message.id)} isSelectionMode={isSelectionMode}
                    isMenuOpen={menuState?.messageId === message.id}
                    onMessageClick={readOnly ? (event) => event.stopPropagation() : handleMessageClick}
                    onOpenMessageMenu={readOnly ? undefined : openMessageMenu}
                    onVoiceMessagePlay={readOnly ? undefined : handlePlayVoiceMessage}
                    onOrderRequestAction={readOnly ? undefined : handleOrderRequestAction}
                    isVoicePlaying={playingVoiceMessageId === message.id}
                    onToggleSelection={readOnly ? () => undefined : toggleSelection}
                    onAvatarClick={readOnly ? undefined : handlePeerAvatarTap}
                  />
                </div>
              ))}
              <div ref={bottomAnchorRef} className="h-px w-full shrink-0" />
            </div>
          </div>
        </div>

        {/* 底部输入组件 */}
        <WeChatChatInputBar 
          readOnly={readOnly}
          isKeyboardVisible={isKeyboardVisible}
          isSelectionMode={isSelectionMode} selectedCount={selectedMessageIds.length}
          inputValue={inputValue}
          hasVoiceDraft={Boolean(pendingVoiceDraft)}
          isTyping={isTyping}
          isVoiceRecording={isVoiceRecording}
          isVoiceBusy={isVoiceSynthesizing}
          isMultiline={isMultiline}
          textareaRef={textareaRef}
          onInputFocus={handleComposerFocus}
          onInputBlur={handleComposerBlur}
          showPlusMenu={showPlusMenu}
          setShowPlusMenu={setShowPlusMenu}
          quotingMessage={quotingMessage} setQuotingMessage={setQuotingMessage}
          onSend={() => { void handleSend(); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void handleSend();
            }
          }}
          onInputChange={handleInputChange}
          onDeleteInput={handleDeleteInput}
          onSendOnlineSticker={handleSendOnlineSticker}
          onAddCustomStickerFile={handleAddCustomStickerFile}
          currentBubblePreset={sessionUiSettings.selfBubblePreset}
          currentBubbleColor={sessionUiSettings.selfBubbleColor}
          customBubbleCss={sessionUiSettings.customBubbleCss}
          currentCustomBubbleStyleId={sessionUiSettings.customBubbleStyleId || ''}
          currentChatFontFamily={chatFontFamily}
          hasCustomChatFont={Boolean(sessionUiSettings.chatFontData)}
          customBubbleStyles={sessionUiSettings.customBubbleStyles || []}
          customChatFonts={sessionUiSettings.customChatFonts || []}
          onSelectBubblePreset={(preset) => updateCurrentSessionUiSettings({ selfBubblePreset: preset, peerBubblePreset: preset, customBubbleCss: '', customBubbleStyleId: '' })}
          onSelectBubbleColor={(color) => updateCurrentSessionUiSettings({ selfBubbleColor: color })}
          onSelectCustomBubbleStyle={(id, css) => updateCurrentSessionUiSettings({ customBubbleStyleId: id, customBubbleCss: css })}
          onAddCustomBubbleStyle={handleAddCustomBubbleStyle}
          onDeleteCustomBubbleStyle={handleDeleteCustomBubbleStyle}
          onAddCustomFontFile={handleAddCustomFontFile}
          onDeleteCustomFont={handleDeleteCustomFont}
          onSelectChatFont={(fontFamily) => updateCurrentSessionUiSettings({ chatFontFamily: fontFamily, chatFontData: fontFamily ? sessionUiSettings.chatFontData : '' })}
          onShowTransfer={() => setShowTransferView(true)}
          onShowCallOptions={handleOpenCallTypeSheet}
          onChooseImage={handleOpenImagePicker}
          onTakePhoto={handleOpenCameraCapture}
          onShowFullScreenEditor={() => setShowFullScreenEditor(true)}
          onToggleVoiceInput={handleToggleVoiceInput}
          onOpenVoiceRecorder={handleOpenVoiceRecorderModal}
          onForwardMulti={() => setForwardTargetModal({ messageIds: selectedMessageIds })} onDeleteMulti={() => setDeleteTarget('multi')}
        />
      </motion.div>
      {!readOnly && (
        <>
      <input
        ref={imageFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          void handleChooseImage(event);
        }}
      />
      <input
        ref={cameraFileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          void handleTakePhoto(event);
        }}
      />
      {showCameraCaptureModal ? (
        <div className="fixed inset-0 z-[280] bg-black/85 flex flex-col">
          <div className="px-4 pt-[max(env(safe-area-inset-top),18px)] pb-3 flex items-center justify-between text-white">
            <button
              type="button"
              onClick={handleCloseCameraCapture}
              className="rounded-md px-3 py-1.5 bg-white/15 active:bg-white/25 text-[14px]"
            >
              取消
            </button>
            <div className="text-[15px] font-medium">
              {isCameraInitializing ? '正在打开摄像头...' : '拍照发送'}
            </div>
            <div className="w-[58px]" />
          </div>
          <div className="flex-1 px-4 pb-4 flex items-center justify-center">
            <div className="relative w-full max-w-[520px] rounded-2xl overflow-hidden bg-black border border-white/10">
              <video
                ref={cameraVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full max-h-[70vh] object-contain bg-black"
              />
              {isCameraInitializing ? (
                <div className="absolute inset-0 flex items-center justify-center text-[14px] text-white/90 bg-black/35">
                  正在连接摄像头...
                </div>
              ) : null}
            </div>
          </div>
          <div className="pb-[max(env(safe-area-inset-bottom),24px)] px-6 pt-2">
            <button
              type="button"
              onClick={() => {
                void handleCaptureFromCamera();
              }}
              disabled={isCameraInitializing || isSendingImage}
              className={`w-full h-12 rounded-full text-[16px] font-medium text-white ${
                isCameraInitializing || isSendingImage
                  ? 'bg-gray-500'
                  : 'bg-[#07C160] active:opacity-85'
              }`}
            >
              {isSendingImage ? '发送中...' : '拍照并发送'}
            </button>
          </div>
        </div>
      ) : null}

      {/* 集成所有的 Modals 弹窗 */}
      <Modals.TransferView show={showTransferView} onClose={() => setShowTransferView(false)} onSubmit={handleTransferSubmit} amount={transferAmount} setAmount={setTransferAmount} character={character} />
      <Modals.FullScreenEditor show={showFullScreenEditor} onClose={() => setShowFullScreenEditor(false)} onSend={() => { void handleSend(); }} inputValue={inputValue} setInputValue={setInputValue} isTyping={isTyping} adjustHeight={adjustTextareaHeight} textareaRef={textareaRef} />
      <Modals.ContextMenu
        menuState={menuState}
        closeMenu={() => setMenuState(null)}
        onCopy={() => handleCopy(menuState!.text)}
        onForward={() => { setForwardTargetModal({ messageIds: [menuState!.messageId] }); setMenuState(null); }}
        onDelete={() => { setDeleteTarget(menuState!.messageId); setMenuState(null); }}
        onAddSticker={menuState?.canAddSticker ? handleAddStickerFromMessage : undefined}
        onSelect={() => { setIsSelectionMode(true); setSelectedMessageIds([menuState!.messageId]); setMenuState(null); }}
        onQuote={() => {
          const t = messages.find(m => m.id === menuState!.messageId);
          if (t) {
            setQuotingMessage({ senderName: t.role === 'user' ? (wechatUserProfile?.name || '我') : character.name, content: menuState!.text });
          }
          setMenuState(null);
        }}
        onTranscribe={menuState?.canTranscribe ? toggleVoiceTranscript : undefined}
        transcribeLabel={menuState?.transcriptVisible ? '隐藏文字' : '转文字'}
      />
      <Modals.ForwardTargetModal show={!!forwardTargetModal} onClose={() => setForwardTargetModal(null)} characters={wechatCharacters} onSelectContact={executeForward} />
      <Modals.ConfirmDialog show={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={executeDelete} />
      <Modals.CallTypeSheet
        show={showCallTypeSheet}
        onClose={() => setShowCallTypeSheet(false)}
        onVideoCall={() => {
          setToastMessage('视频通话暂未开放');
          setTimeout(() => setToastMessage(null), 1600);
        }}
        onVoiceCall={handleStartVoiceCall}
      />
      <Modals.VoiceCallView
        show={showVoiceCallView && !isVoiceCallMinimized}
        onClose={handleCloseVoiceCall}
        onMinimize={handleMinimizeVoiceCall}
        character={character}
        statusText={voiceCallStatusText}
        micEnabled={voiceCallMicEnabled}
        speakerEnabled={voiceCallSpeakerEnabled}
        onToggleMic={() => {
          setVoiceCallMicEnabled((prev) => {
            const next = !prev;
            if (!next) {
              setVoiceCallStatusText('麦克风已关闭');
              stopVoiceCallRecognition();
            } else {
              setVoiceCallStatusText('通话中...');
            }
            return next;
          });
        }}
        onToggleSpeaker={() => setVoiceCallSpeakerEnabled((prev) => !prev)}
      />
      <Modals.VoiceRecorderModal
        show={showVoiceRecorderModal}
        onClose={handleCloseVoiceRecorderModal}
        isRecording={isRealVoiceRecording}
        onToggleRecording={handleToggleRealVoiceRecording}
      />
        </>
      )}
      <Modals.Toast message={toastMessage} />
    </>
  );
};

