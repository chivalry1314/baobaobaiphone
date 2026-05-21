import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_ACTIVE_ROLE_ID, getActiveRoleId } from '../contacts/activeRole';
import { createWeChatPersistOptions } from './data/repositories/storePersistRepo';
import type { WeChatContactExtension, WeChatMessage } from './types';
import { createWeChatActions } from './store/actions';
import {
  WECHAT_IMAGE_PLACEHOLDER,
  WECHAT_SYSTEM_PROMPT_PREFIX,
  WECHAT_TRANSFER_ACCEPTED_TEXT_PREFIX,
  WECHAT_TRANSFER_TEXT_PREFIX,
} from './store/constants';
import { createDefaultRoleScopedState } from './store/defaults';
import type { WeChatRoleScopedState, WeChatState } from './store/types';

const normalizeRoleId = (value: string | undefined): string => {
  const normalized = value?.trim() ?? '';
  return normalized || DEFAULT_ACTIVE_ROLE_ID;
};

const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
};

const normalizeRoleScopedState = (
  input: Partial<WeChatRoleScopedState> | undefined
): WeChatRoleScopedState => {
  const fallback = createDefaultRoleScopedState();
  if (!input) return fallback;

  return {
    wechatSessions: Array.isArray(input.wechatSessions) ? input.wechatSessions : fallback.wechatSessions,
    wechatCurrentSessionId:
      typeof input.wechatCurrentSessionId === 'string' || input.wechatCurrentSessionId === null
        ? input.wechatCurrentSessionId
        : fallback.wechatCurrentSessionId,
    wechatBills: Array.isArray(input.wechatBills) ? input.wechatBills : fallback.wechatBills,
    wechatMoments: Array.isArray(input.wechatMoments) ? input.wechatMoments : fallback.wechatMoments,
    wechatUserProfile: {
      ...fallback.wechatUserProfile,
      ...(input.wechatUserProfile || {}),
    },
    wechatUiSettings: {
      ...fallback.wechatUiSettings,
      ...(input.wechatUiSettings || {}),
    },
    wechatAiChatSettings: {
      ...fallback.wechatAiChatSettings,
      ...(input.wechatAiChatSettings || {}),
    },
    wechatAiMomentsSettings: {
      ...fallback.wechatAiMomentsSettings,
      ...(input.wechatAiMomentsSettings || {}),
    },
    wechatContactExtensions:
      input.wechatContactExtensions && typeof input.wechatContactExtensions === 'object'
        ? (input.wechatContactExtensions as Record<string, WeChatContactExtension>)
        : fallback.wechatContactExtensions,
    wechatDeletedMemorySourceIds: Array.isArray(input.wechatDeletedMemorySourceIds)
      ? input.wechatDeletedMemorySourceIds.filter((item): item is string => typeof item === 'string')
      : fallback.wechatDeletedMemorySourceIds,
    wechatDeletedMemoryContentHints: Array.isArray(input.wechatDeletedMemoryContentHints)
      ? input.wechatDeletedMemoryContentHints.filter((item): item is string => typeof item === 'string')
      : fallback.wechatDeletedMemoryContentHints,
  };
};

const ensureRoleContextState = (
  state: WeChatState,
  preferredRoleId?: string
): { state: WeChatState; roleId: string; roleState: WeChatRoleScopedState } => {
  const roleId = normalizeRoleId(preferredRoleId ?? getActiveRoleId());
  const existingRoleState = state.wechatStateByRoleId[roleId];

  if (existingRoleState && state.activeRoleId === roleId) {
    return {
      state,
      roleId,
      roleState: existingRoleState,
    };
  }

  const roleState = existingRoleState ?? createDefaultRoleScopedState();
  const nextRoleMap = existingRoleState
    ? state.wechatStateByRoleId
    : {
        ...state.wechatStateByRoleId,
        [roleId]: roleState,
      };

  return {
    state: {
      ...state,
      activeRoleId: roleId,
      wechatStateByRoleId: nextRoleMap,
      ...roleState,
    },
    roleId,
    roleState,
  };
};

const applyRoleState = (
  state: WeChatState,
  roleId: string,
  roleState: WeChatRoleScopedState
): WeChatState => {
  const nextRoleMap = {
    ...state.wechatStateByRoleId,
    [roleId]: roleState,
  };

  if (state.activeRoleId === roleId) {
    return {
      ...state,
      wechatStateByRoleId: nextRoleMap,
      ...roleState,
    };
  }

  return {
    ...state,
    wechatStateByRoleId: nextRoleMap,
  };
};

const clampRecentMessageCount = (value: number): number =>
  Math.max(0, Math.min(120, Math.round(value)));
const clampMemoryReferenceCount = (value: number): number =>
  Math.max(0, Math.min(40, Math.round(value)));

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

const normalizeMessageContentForMemory = (
  message: Omit<WeChatMessage, 'id' | 'timestamp'>
): string => {
  if (message.type === 'order_request' && typeof message.amount === 'number') {
    const actionText =
      message.orderRequestStatus === 'accepted'
        ? '已同意代付'
        : message.orderRequestStatus === 'rejected'
          ? '已拒绝代付'
          : '有一笔订单等你支付';
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

  if (message.type === 'image') {
    const caption = message.content.trim();
    if (caption && caption !== WECHAT_IMAGE_PLACEHOLDER) {
      return `${WECHAT_IMAGE_PLACEHOLDER} ${caption}`;
    }
    return WECHAT_IMAGE_PLACEHOLDER;
  }

  if (message.type === 'sticker') {
    return `[动态表情] ${message.stickerName || message.content.replace('[表情]', '').trim() || '表情'}`;
  }

  if (message.type === 'voice') {
    const transcript = message.voiceTranscriptText?.trim();
    if (transcript) return transcript;
  }

  if (message.type === 'transfer' && typeof message.amount === 'number') {
    return `${WECHAT_TRANSFER_TEXT_PREFIX}${message.amount.toFixed(2)}`;
  }

  if (message.type === 'transfer_accepted' && typeof message.amount === 'number') {
    return `${WECHAT_TRANSFER_ACCEPTED_TEXT_PREFIX}${message.amount.toFixed(2)}`;
  }

  return message.content.trim();
};

const shouldRecordInteractionMemory = (content: string): boolean =>
  Boolean(content) && !content.startsWith(WECHAT_SYSTEM_PROMPT_PREFIX);

const normalizePersistedRoleMap = (
  input: unknown
): Record<string, WeChatRoleScopedState> => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};

  const next: Record<string, WeChatRoleScopedState> = {};
  Object.entries(input as Record<string, unknown>).forEach(([rawRoleId, value]) => {
    const roleId = normalizeRoleId(rawRoleId);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return;
    next[roleId] = normalizeRoleScopedState(value as Partial<WeChatRoleScopedState>);
  });
  return next;
};

const initialRoleId = normalizeRoleId(getActiveRoleId());
const initialRoleState = createDefaultRoleScopedState();

export const useWeChatStore = create<WeChatState>()(
  persist(
    (set, get) => ({
      activeRoleId: initialRoleId,
      wechatStateByRoleId: {
        [initialRoleId]: initialRoleState,
      },
      ...initialRoleState,

      ...createWeChatActions({
        set,
        get,
        ensureRoleContextState,
        applyRoleState,
        normalizeMessageContentForMemory,
        shouldRecordInteractionMemory,
        clampRecentMessageCount,
        clampMemoryReferenceCount,
        generateId,
      }),
    }),
    createWeChatPersistOptions({
      normalizeRoleId,
      normalizePersistedRoleMap,
      createDefaultRoleScopedState,
    })
  )
);
