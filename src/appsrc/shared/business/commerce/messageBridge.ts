import { getGlobalSettingsSnapshot } from '@baobaobaiOS/sdk';
import {
  appendShoppingOrderToStorage,
  readShoppingAddressesFromStorage,
} from './domain/ordersStorage';
import type { Favorite, Order, ProductItem } from './domain/types';
import {
  getDefaultStoreIdByKind,
  loadCommerceStores,
  readDessertProductsFromStorage,
  readFlowerProductsFromStorage,
} from './domain/store';
import {
  readMessageBridgeState,
  updateMessageBridgeState,
} from './domain/messageBridgeRepo';
import { renderPaperMagicPrompt } from '../../../apps/papermagic/promptCatalog';

export type SellerInboxMessage = {
  id: string;
  senderName: string;
  sender?: 'buyer' | 'seller';
  content: string;
  createdAt: number;
  status: 'unread' | 'read';
};

type CommerceContactSnapshot = {
  name?: string;
};

type SellerInboxMessageDraft = Omit<
  SellerInboxMessage,
  'id' | 'createdAt' | 'status'
> & {
  status?: SellerInboxMessage['status'];
};

type TriggerFavoriteInquiryParams = {
  kind: Favorite['kind'];
  product: ProductItem;
  storeName: string;
  storeId?: string;
};

type FavoriteEvent = {
  id: string;
  kind: Favorite['kind'];
  storeId: string;
  productId: string;
  productName: string;
  price: number;
  at: number;
};

type AutoOrderTask = {
  id: string;
  sessionId: string;
  consultantName: string;
  kind: Favorite['kind'];
  storeId: string;
  productId: string;
  productName: string;
  storeName: string;
  attempt: 1 | 2;
  executeAt: number;
};

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const AUTO_ORDER_DELAY_MS = 60 * 60 * 1000;
const AUTO_ORDER_TICK_MS = 30 * 1000;

export const SELLER_MESSAGE_UPDATED_EVENT = 'seller_message_updated';

let schedulerStarted = false;
let schedulerTimer: number | null = null;
let resolveContactsSnapshot: () => CommerceContactSnapshot[] = () => [];

export const registerCommerceContactsSnapshotResolver = (
  resolver: (() => CommerceContactSnapshot[]) | null | undefined
): void => {
  resolveContactsSnapshot = typeof resolver === 'function' ? resolver : () => [];
};


const todayKey = (ts = Date.now()) => {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const isSellable = (product?: ProductItem | null) => {
  if (!product) return false;
  const stock = Math.max(0, Math.floor(Number(product.stock) || 0));
  return product.isSelected !== false && stock > 0;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeFavoriteKind = (value: unknown): Favorite['kind'] => {
  return value === 'flower' ? 'flower' : 'dessert';
};

const normalizeFavoriteEvents = (value: unknown): FavoriteEvent[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!isPlainObject(item)) return null;
      if (typeof item.productId !== 'string') return null;
      if (typeof item.at !== 'number' || !Number.isFinite(item.at)) return null;
      const price = Number(item.price);
      return {
        id: typeof item.id === 'string' ? item.id : `fav-${item.at}`,
        kind: normalizeFavoriteKind(item.kind),
        storeId:
          typeof item.storeId === 'string'
            ? item.storeId
            : getDefaultStoreIdByKind(normalizeFavoriteKind(item.kind)),
        productId: item.productId,
        productName: typeof item.productName === 'string' ? item.productName : '',
        price: Number.isFinite(price) ? price : 0,
        at: item.at,
      } as FavoriteEvent;
    })
    .filter((item): item is FavoriteEvent => Boolean(item))
    .sort((a, b) => b.at - a.at);
};

const normalizeAutoOrderTasks = (value: unknown): AutoOrderTask[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!isPlainObject(item)) return null;
      if (typeof item.productId !== 'string') return null;
      if (typeof item.executeAt !== 'number' || !Number.isFinite(item.executeAt)) return null;
      const kind = normalizeFavoriteKind(item.kind);
      return {
        id:
          typeof item.id === 'string'
            ? item.id
            : `auto-order-${item.executeAt.toString(36)}`,
        sessionId: typeof item.sessionId === 'string' ? item.sessionId : '',
        consultantName: typeof item.consultantName === 'string' ? item.consultantName : '',
        kind,
        storeId:
          typeof item.storeId === 'string'
            ? item.storeId
            : getDefaultStoreIdByKind(kind),
        productId: item.productId,
        productName: typeof item.productName === 'string' ? item.productName : '',
        storeName: typeof item.storeName === 'string' ? item.storeName : '',
        attempt: item.attempt === 2 ? 2 : 1,
        executeAt: item.executeAt,
      } as AutoOrderTask;
    })
    .filter((item): item is AutoOrderTask => Boolean(item))
    .sort((a, b) => a.executeAt - b.executeAt);
};

const normalizeSellerInboxMessages = (value: unknown): SellerInboxMessage[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!isPlainObject(item)) return null;
      if (typeof item.content !== 'string') return null;
      if (typeof item.createdAt !== 'number' || !Number.isFinite(item.createdAt)) return null;
      if (typeof item.senderName !== 'string') return null;
      return {
        id:
          typeof item.id === 'string'
            ? item.id
            : `seller-inbox-${item.createdAt.toString(36)}`,
        senderName: item.senderName,
        sender: item.sender === 'seller' ? 'seller' : 'buyer',
        content: item.content,
        createdAt: item.createdAt,
        status: item.status === 'read' ? 'read' : 'unread',
      } as SellerInboxMessage;
    })
    .filter((item): item is SellerInboxMessage => Boolean(item))
    .sort((a, b) => b.createdAt - a.createdAt);
};

const readFavoriteEvents = async (): Promise<FavoriteEvent[]> => {
  if (typeof window === 'undefined') return [];
  const state = await readMessageBridgeState();
  return normalizeFavoriteEvents(state.favoriteEvents);
};

const saveFavoriteEvents = async (events: FavoriteEvent[]): Promise<void> => {
  if (typeof window === 'undefined') return;
  await updateMessageBridgeState((state) => ({
    ...state,
    favoriteEvents: normalizeFavoriteEvents(events),
  }));
};

const readAutoOrderTasks = async (): Promise<AutoOrderTask[]> => {
  if (typeof window === 'undefined') return [];
  const state = await readMessageBridgeState();
  return normalizeAutoOrderTasks(state.autoOrderTasks);
};

const saveAutoOrderTasks = async (tasks: AutoOrderTask[]): Promise<void> => {
  if (typeof window === 'undefined') return;
  await updateMessageBridgeState((state) => ({
    ...state,
    autoOrderTasks: normalizeAutoOrderTasks(tasks),
  }));
};

const appendInboxMessage = async (
  message: SellerInboxMessageDraft
): Promise<void> => {
  const nextMessage: SellerInboxMessage = {
    id: `seller-inbox-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    senderName: message.senderName,
    sender: message.sender,
    content: message.content,
    createdAt: Date.now(),
    status: message.status || 'unread',
  };

  await updateMessageBridgeState((state) => {
    const current = normalizeSellerInboxMessages(state.inboxMessages);
    return {
      ...state,
      inboxMessages: [nextMessage, ...current],
    };
  });

  emitSellerMessageUpdated();
};

export const appendSellerInboxChatMessage = async (message: {
  senderName: string;
  sender: 'buyer' | 'seller';
  content: string;
  status?: SellerInboxMessage['status'];
}): Promise<void> => {
  await appendInboxMessage(message);
};

const callChatCompletion = async (
  systemPrompt: string,
  userPrompt: string,
  fallback: string
): Promise<string> => {
  const settings = getGlobalSettingsSnapshot();
  const apiKey = settings.apiKey?.trim() || '';
  if (!apiKey) return fallback;

  const response = await fetch(`${(settings.baseUrl || DEFAULT_BASE_URL).trim()}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model?.trim() || 'gpt-3.5-turbo',
      temperature: settings.temperature ?? 0.65,
      max_tokens: Math.min(420, Math.max(140, settings.maxTokens || 260)),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  }).catch(() => null);
  if (!response || !response.ok) return fallback;
  const data = await response.json().catch(() => null);
  const content = data?.choices?.[0]?.message?.content;
  return typeof content === 'string' && content.trim() ? content.trim() : fallback;
};

const buildInquiryByAi = async (product: ProductItem) => {
  const productInfo = JSON.stringify({
    name: product.name,
    desc: product.desc,
    price: product.price,
    stock: product.stock,
  });
  const aiPrompt = renderPaperMagicPrompt('commerce.buyerInquiry', { productInfo });
  return callChatCompletion(
    aiPrompt.system || '',
    aiPrompt.user || '',
    `你好，我想咨询一下「${product.name || '这件商品'}」的规格、现货和发货时间。我有个朋友很喜欢，麻烦你详细介绍下。`
  );
};

const buildRetryAskByAi = async (productName: string) => {
  const aiPrompt = renderPaperMagicPrompt('commerce.orderFailedRetry', { productName });
  return callChatCompletion(
    aiPrompt.system || '',
    aiPrompt.user || '',
    `刚刚下单失败了，请问「${productName}」还有货吗？大概什么时候可以补货呢？`
  );
};

const pickTodayBestCandidate = async (): Promise<{
  kind: Favorite['kind'];
  storeId: string;
  storeName: string;
  product: ProductItem;
} | null> => {
  const events = (await readFavoriteEvents()).filter((item) => todayKey(item.at) === todayKey());
  if (events.length === 0) return null;
  const [dessertProducts, flowerProducts, stores] = await Promise.all([
    readDessertProductsFromStorage(),
    readFlowerProductsFromStorage(),
    loadCommerceStores(),
  ]);

  const resolveByEvent = (event: FavoriteEvent): ProductItem | null => {
    const list = event.kind === 'flower' ? flowerProducts : dessertProducts;
    return list.find((item) => item.id === event.productId && (item.storeId || getDefaultStoreIdByKind(event.kind)) === event.storeId) || null;
  };

  const sellable = events
    .map((event) => ({ event, product: resolveByEvent(event) }))
    .filter((item) => isSellable(item.product))
    .sort((a, b) => Number(b.product?.price || 0) - Number(a.product?.price || 0));
  const best = sellable[0];
  if (!best || !best.product) return null;
  const storeName =
    stores.find((item) => item.id === best.event.storeId)?.signboard
    || stores.find((item) => item.id === best.event.storeId)?.name
    || '店铺';
  return {
    kind: best.event.kind,
    storeId: best.event.storeId,
    storeName,
    product: best.product,
  };
};

const createAutoOrder = async (payload: {
  consultantName: string;
  kind: Favorite['kind'];
  storeId: string;
  storeName: string;
  product: ProductItem;
}): Promise<Order | null> => {
  const addresses = await readShoppingAddressesFromStorage();
  const defaultAddress = addresses.find((item) => item.isDefault) || addresses[0];
  if (!defaultAddress) return null;
  const now = Date.now();
  const order: Order = {
    id: `AUTO${now.toString().slice(-10)}`,
    kind: payload.kind,
    title: `${payload.storeName}订单`,
    lines: [{ name: payload.product.name, qty: 1, unitPrice: Number(payload.product.price) || 0 }],
    total: Number(payload.product.price) || 0,
    createdAt: now,
    address: {
      ...defaultAddress,
    },
    meta: {
      shipMode: 'now',
      shipAt: now,
      trackingId: `SF${Math.floor(100000000 + Math.random() * 900000000)}`,
      storeId: payload.storeId,
      storeName: payload.storeName,
    },
  };
  await appendShoppingOrderToStorage(order);
  return order;
};

const resolveCurrentProduct = async (kind: Favorite['kind'], storeId: string, productId: string) => {
  const list = kind === 'flower' ? await readFlowerProductsFromStorage() : await readDessertProductsFromStorage();
  return (
    list.find((item) => item.id === productId && (item.storeId || getDefaultStoreIdByKind(kind)) === storeId) ||
    null
  );
};

const processAutoOrderTask = async (task: AutoOrderTask): Promise<void> => {
  const product = await resolveCurrentProduct(task.kind, task.storeId, task.productId);
  if (isSellable(product)) {
    const order = await createAutoOrder({
      consultantName: task.consultantName,
      kind: task.kind,
      storeId: task.storeId,
      storeName: task.storeName,
      product: product as ProductItem,
    });
    if (order) {
      const orderInfo = `订单号 ${order.id}，商品「${task.productName}」，金额 ￥${Number(order.total).toFixed(2)}`;
      await appendInboxMessage({
        senderName: '系统',
        content: `${task.consultantName} 为您下单成功，${orderInfo}。`,
      });
      await appendInboxMessage({
        senderName: task.consultantName,
        content: `我已成功下单，${orderInfo}。请帮我确认预计发货时间，谢谢。`,
      });
      return;
    }
  }

  await appendInboxMessage({
    senderName: '系统',
    content: `自动下单失败：${task.productName} 当前已售罄或已下架。`,
  });

  const ask = await buildRetryAskByAi(task.productName);
  await appendInboxMessage({
    senderName: task.consultantName,
    content: ask,
  });

  if (task.attempt < 2) {
    const nextTask: AutoOrderTask = {
      ...task,
      id: `auto-order-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      attempt: 2,
      executeAt: Date.now() + AUTO_ORDER_DELAY_MS,
    };
    const tasks = await readAutoOrderTasks();
    await saveAutoOrderTasks([...tasks, nextTask]);
  }
};

const processDueAutoOrders = async () => {
  if (typeof window === 'undefined') return;
  const tasks = await readAutoOrderTasks();
  if (tasks.length === 0) return;
  const now = Date.now();
  const due = tasks.filter((item) => item.executeAt <= now);
  const pending = tasks.filter((item) => item.executeAt > now);
  if (due.length === 0) return;
  await saveAutoOrderTasks(pending);
  for (const task of due) {
    // eslint-disable-next-line no-await-in-loop
    await processAutoOrderTask(task);
  }
};

const ensureAutoOrderScheduler = () => {
  if (schedulerStarted || typeof window === 'undefined') return;
  schedulerStarted = true;
  void processDueAutoOrders();
  schedulerTimer = window.setInterval(() => {
    void processDueAutoOrders();
  }, AUTO_ORDER_TICK_MS);
};

export const initializeSellerMessageScheduler = () => {
  if (typeof window === 'undefined') return;
  ensureAutoOrderScheduler();
  void processDueAutoOrders();
};

export const readSellerInboxMessages = async (): Promise<SellerInboxMessage[]> => {
  if (typeof window === 'undefined') return [];
  const state = await readMessageBridgeState();
  return normalizeSellerInboxMessages(state.inboxMessages);
};

const emitSellerMessageUpdated = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(SELLER_MESSAGE_UPDATED_EVENT));
};

export const markSellerInboxAsRead = async (): Promise<void> => {
  if (typeof window === 'undefined') return;
  await updateMessageBridgeState((state) => {
    const current = normalizeSellerInboxMessages(state.inboxMessages);
    return {
      ...state,
      inboxMessages: current.map((item) => ({ ...item, status: 'read' as const })),
    };
  });
  emitSellerMessageUpdated();
};

export const deleteSellerInboxMessageById = async (id: string): Promise<void> => {
  if (typeof window === 'undefined') return;
  await updateMessageBridgeState((state) => {
    const current = normalizeSellerInboxMessages(state.inboxMessages);
    return {
      ...state,
      inboxMessages: current.filter((item) => item.id !== id),
    };
  });
  emitSellerMessageUpdated();
};

export const deleteSellerInboxMessagesBySenderName = async (senderName: string): Promise<void> => {
  if (typeof window === 'undefined') return;
  await updateMessageBridgeState((state) => {
    const current = normalizeSellerInboxMessages(state.inboxMessages);
    return {
      ...state,
      inboxMessages: current.filter((item) => item.senderName !== senderName),
    };
  });
  emitSellerMessageUpdated();
};

export const clearSellerInboxMessages = async (): Promise<void> => {
  if (typeof window === 'undefined') return;
  await updateMessageBridgeState((state) => ({
    ...state,
    inboxMessages: [],
  }));
  emitSellerMessageUpdated();
};

export const markSellerInboxMessagesReadBySenderName = async (
  senderName: string
): Promise<void> => {
  if (typeof window === 'undefined') return;
  await updateMessageBridgeState((state) => {
    const current = normalizeSellerInboxMessages(state.inboxMessages);
    return {
      ...state,
      inboxMessages: current.map((item) =>
        item.senderName === senderName ? { ...item, status: 'read' as const } : item
      ),
    };
  });
  emitSellerMessageUpdated();
};
export const triggerFavoriteInquiryMessage = async ({
  kind,
  product,
  storeName,
  storeId,
}: TriggerFavoriteInquiryParams) => {
  if (typeof window === 'undefined') return;
  ensureAutoOrderScheduler();

  const resolvedStoreId = storeId || product.storeId || getDefaultStoreIdByKind(kind);
  const events = await readFavoriteEvents();
  const event: FavoriteEvent = {
    id: `fav-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    storeId: resolvedStoreId,
    productId: product.id,
    productName: product.name,
    price: Number(product.price) || 0,
    at: Date.now(),
  };
  await saveFavoriteEvents([event, ...events].slice(0, 300));

  const candidate = await pickTodayBestCandidate();
  if (!candidate) return;

  const sessionMarkKey = `${todayKey()}:${candidate.kind}:${event.id}`;

  const contacts = resolveContactsSnapshot();
  const randomContact = contacts.length > 0 ? contacts[Math.floor(Math.random() * contacts.length)] : null;
  const senderName = randomContact?.name?.trim() || '张凌赫';
  const inquiryText = await buildInquiryByAi(candidate.product);
  await appendInboxMessage({
    senderName,
    content: inquiryText,
  });

  const task: AutoOrderTask = {
    id: `auto-order-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    sessionId: sessionMarkKey,
    consultantName: senderName,
    kind: candidate.kind,
    storeId: candidate.storeId,
    productId: candidate.product.id,
    productName: candidate.product.name,
    storeName: candidate.storeName || storeName || '店铺',
    attempt: 1,
    executeAt: Date.now() + AUTO_ORDER_DELAY_MS,
  };
  const nextAutoOrderTasks = await readAutoOrderTasks();
  await saveAutoOrderTasks([...nextAutoOrderTasks, task]);
  void processDueAutoOrders();

  console.info('[seller-message] 已根据收藏生成咨询消息', {
    senderName,
    kind: candidate.kind,
    storeId: candidate.storeId,
    productId: candidate.product.id,
  });
};













