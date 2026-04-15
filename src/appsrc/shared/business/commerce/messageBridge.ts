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
const SELLER_INBOX_STORAGE_KEY = 'seller_store_inbox_messages';
const SELLER_UNREAD_STORAGE_KEY = 'seller_store_message_has_unread';
const SELLER_FAVORITE_EVENTS_KEY = 'seller_favorite_events';
const SELLER_AUTO_ORDER_TASKS_KEY = 'seller_auto_order_tasks';
const AUTO_ORDER_DELAY_MS = 60* 60 * 1000; 
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

const safeJsonParse = <T>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const readFavoriteEvents = (): FavoriteEvent[] => {
  if (typeof window === 'undefined') return [];
  const parsed = safeJsonParse<FavoriteEvent[]>(
    window.localStorage.getItem(SELLER_FAVORITE_EVENTS_KEY),
    []
  );
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((item) => item && typeof item.productId === 'string' && typeof item.at === 'number')
    .sort((a, b) => b.at - a.at);
};

const saveFavoriteEvents = (events: FavoriteEvent[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SELLER_FAVORITE_EVENTS_KEY, JSON.stringify(events));
};

const readAutoOrderTasks = (): AutoOrderTask[] => {
  if (typeof window === 'undefined') return [];
  const parsed = safeJsonParse<AutoOrderTask[]>(
    window.localStorage.getItem(SELLER_AUTO_ORDER_TASKS_KEY),
    []
  );
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((item) => item && typeof item.productId === 'string' && typeof item.executeAt === 'number')
    .sort((a, b) => a.executeAt - b.executeAt);
};

const saveAutoOrderTasks = (tasks: AutoOrderTask[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SELLER_AUTO_ORDER_TASKS_KEY, JSON.stringify(tasks));
};

const appendInboxMessage = (
  message: Omit<SellerInboxMessage, 'id' | 'createdAt'> & { status?: SellerInboxMessage['status'] }
) => {
  const nextMessage: SellerInboxMessage = {
    id: `seller-inbox-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    senderName: message.senderName,
    sender: message.sender,
    content: message.content,
    createdAt: Date.now(),
    status: message.status || 'unread',
  };
  const current = readSellerInboxMessages();
  const next = [nextMessage, ...current];
  saveSellerInboxMessages(next);
  updateUnreadFlag(next);
  emitSellerMessageUpdated();
};

export const appendSellerInboxChatMessage = (message: {
  senderName: string;
  sender: 'buyer' | 'seller';
  content: string;
  status?: SellerInboxMessage['status'];
}) => {
  appendInboxMessage(message);
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
  return callChatCompletion(
    '你是购物平台买家，正在向店主咨询商品。只输出一条 10-30 字中文消息。',
    `你现在扮演我，我想悄悄给最重要的朋友买 TA 收藏的商品，需要去咨询店主。请用日常、自然、不刻意的语气，向店主询问商品细节（材质 / 尺寸 / 发货 / 质量等），并不经意提到这是送给很重要的人、想给对方惊喜，不要太刻意煽情，像普通买家正常咨询一样。商品信息：${JSON.stringify(
      {
        name: product.name,
        desc: product.desc,
        price: product.price,
        stock: product.stock,
      }
    )}`,
    `你好，我想咨询一下「${product.name || '这件商品'}」的规格、现货和发货时间。我有个朋友很喜欢，麻烦你详细介绍下。`
  );
};

const buildRetryAskByAi = async (productName: string) => {
  return callChatCompletion(
    '你是购物平台买家，遇到下单失败后继续咨询店主。只输出一条 15-40 字中文消息。',
    `商品「${productName}」下单失败，原因是售罄或已下架。请向店主询问是否还有货以及何时补货。`,
    `刚刚下单失败了，请问「${productName}」还有货吗？大概什么时候可以补货呢？`
  );
};

const pickTodayBestCandidate = async (): Promise<{
  kind: Favorite['kind'];
  storeId: string;
  storeName: string;
  product: ProductItem;
} | null> => {
  const events = readFavoriteEvents().filter((item) => todayKey(item.at) === todayKey());
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
      appendInboxMessage({
        senderName: '系统',
        content: `${task.consultantName} 为您下单成功，${orderInfo}。`,
      });
      appendInboxMessage({
        senderName: task.consultantName,
        content: `我已成功下单，${orderInfo}。请帮我确认预计发货时间，谢谢。`,
      });
      return;
    }
  }

  appendInboxMessage({
    senderName: '系统',
    content: `自动下单失败：${task.productName} 当前已售罄或已下架。`,
  });

  const ask = await buildRetryAskByAi(task.productName);
  appendInboxMessage({
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
    const tasks = readAutoOrderTasks();
    saveAutoOrderTasks([...tasks, nextTask]);
  }
};
const processDueAutoOrders = async () => {
  if (typeof window === 'undefined') return;
  const tasks = readAutoOrderTasks();
  if (tasks.length === 0) return;
  const now = Date.now();
  const due = tasks.filter((item) => item.executeAt <= now);
  const pending = tasks.filter((item) => item.executeAt > now);
  if (due.length === 0) return;
  saveAutoOrderTasks(pending);
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

export const readSellerInboxMessages = (): SellerInboxMessage[] => {
  if (typeof window === 'undefined') return [];
  const parsed = safeJsonParse<SellerInboxMessage[]>(
    window.localStorage.getItem(SELLER_INBOX_STORAGE_KEY),
    []
  );
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter(
      (item) =>
        item &&
        typeof item.content === 'string' &&
        typeof item.createdAt === 'number' &&
        typeof item.senderName === 'string'
    )
    .map((item) => ({
      ...item,
      sender: item.sender === 'seller' ? 'seller' : 'buyer',
    }))
    .sort((a, b) => b.createdAt - a.createdAt);
};

const saveSellerInboxMessages = (messages: SellerInboxMessage[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SELLER_INBOX_STORAGE_KEY, JSON.stringify(messages));
};

const updateUnreadFlag = (messages: SellerInboxMessage[]) => {
  if (typeof window === 'undefined') return;
  const hasUnread = messages.some((item) => item.status === 'unread');
  window.localStorage.setItem(SELLER_UNREAD_STORAGE_KEY, hasUnread ? '1' : '0');
};

const emitSellerMessageUpdated = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(SELLER_MESSAGE_UPDATED_EVENT));
};

export const markSellerInboxAsRead = () => {
  const current = readSellerInboxMessages();
  if (current.length === 0) {
    if (typeof window !== 'undefined') window.localStorage.setItem(SELLER_UNREAD_STORAGE_KEY, '0');
    emitSellerMessageUpdated();
    return;
  }
  const next = current.map((item) => ({ ...item, status: 'read' as const }));
  saveSellerInboxMessages(next);
  updateUnreadFlag(next);
  emitSellerMessageUpdated();
};

export const deleteSellerInboxMessageById = (id: string) => {
  if (typeof window === 'undefined') return;
  const current = readSellerInboxMessages();
  const next = current.filter((item) => item.id !== id);
  saveSellerInboxMessages(next);
  updateUnreadFlag(next);
  emitSellerMessageUpdated();
};

export const deleteSellerInboxMessagesBySenderName = (senderName: string) => {
  if (typeof window === 'undefined') return;
  const current = readSellerInboxMessages();
  const next = current.filter((item) => item.senderName !== senderName);
  saveSellerInboxMessages(next);
  updateUnreadFlag(next);
  emitSellerMessageUpdated();
};

export const clearSellerInboxMessages = () => {
  if (typeof window === 'undefined') return;
  saveSellerInboxMessages([]);
  updateUnreadFlag([]);
  emitSellerMessageUpdated();
};

export const markSellerInboxMessagesReadBySenderName = (senderName: string) => {
  const current = readSellerInboxMessages();
  if (current.length === 0) return;
  const next = current.map((item) =>
    item.senderName === senderName ? { ...item, status: 'read' as const } : item
  );
  saveSellerInboxMessages(next);
  updateUnreadFlag(next);
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
  const events = readFavoriteEvents();
  const event: FavoriteEvent = {
    id: `fav-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    storeId: resolvedStoreId,
    productId: product.id,
    productName: product.name,
    price: Number(product.price) || 0,
    at: Date.now(),
  };
  saveFavoriteEvents([event, ...events].slice(0, 300));

  const candidate = await pickTodayBestCandidate();
  if (!candidate) return;

  const sessionMarkKey = `${todayKey()}:${candidate.kind}:${event.id}`;

  const contacts = resolveContactsSnapshot();
  const randomContact = contacts.length > 0 ? contacts[Math.floor(Math.random() * contacts.length)] : null;
  const senderName = randomContact?.name?.trim() || '张凌赫';
  const inquiryText = await buildInquiryByAi(candidate.product);
  appendInboxMessage({
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
  saveAutoOrderTasks([...readAutoOrderTasks(), task]);
  void processDueAutoOrders();

  console.info('[seller-message] 已根据收藏生成咨询消息', {
    senderName,
    kind: candidate.kind,
    storeId: candidate.storeId,
    productId: candidate.product.id,
  });
};





