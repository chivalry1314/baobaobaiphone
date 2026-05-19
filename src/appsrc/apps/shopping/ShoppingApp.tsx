import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useGlobalSettingsStore } from '@baobaobaiOS/sdk';
import { Gift, Tags, TrendingUp } from 'lucide-react';
import type {
  Address,
  CommerceStore,
  Favorite,
  Order,
  ProductItem,
  ShoppingAppProps,
  StoreKind,
} from './types';
import type { GoodsKind, Movie, Route, Screen, ShippingMode, TabKey } from './uiTypes';
import { useShoppingStore } from './store';
import { useContactsStore } from '../contacts/store';
import { useWeChatFriendCharactersFromContacts } from '../WeChat/contactAdapter';
import { useWeChatStore } from '../WeChat/store';
import type { WeChatGiftDeliveryCard, WeChatMessage, WeChatOrderPreview } from '../WeChat/types';
import { PUSH_OPEN_APP_MESSAGE_TYPE } from '../../../core/push/webPush';
import type { GlobalSettings } from '../../../core/sdk/types';
import styles from './ShoppingApp.module.css';
import { toMovie, toMovieStoreProducts } from './movies';
import { addDays, formatDate, formatMoney, getOrderStatus, groupCartLines } from './utils';
import {
  COMMERCE_ROLE_CHANGED_EVENT,
  defaultStores,
  getDefaultStoreIdByKind,
  loadCommerceStores,
  readMovieProductsFromStorage,
  resolveStoreByKind,
  STORES_UPDATED_EVENT,
} from '../../shared/business/commerce/domain/store';
import {
  DEFAULT_STORE_MOVIE_CHECKOUT_LABELS,
  DEFAULT_STORE_MOVIE_SESSION_OPTIONS,
  sortProductsByDecorationOrder,
} from '../../shared/business/commerce/domain/storeDecoration';
import { updateShoppingOrdersInStorage } from '../../shared/business/commerce/domain/ordersStorage';
import {
  DEFAULT_SHOPPING_HOME_TAB,
  resolveShoppingHomeTabs,
} from '../../shared/business/commerce/domain/storeTypeTabs';
import {
  initializeSellerMessageScheduler,
  triggerFavoriteInquiryMessage,
} from '../../shared/business/commerce/messageBridge';
import {
  ShoppingAddressAdd,
  ShoppingAddresses,
  ShoppingCart,
  ShoppingFavorites,
  ShoppingGoodsCheckout,
  ShoppingHeader,
  ShoppingHome,
  ShoppingLogistics,
  ShoppingMe,
  ShoppingMovieCheckout,
  ShoppingMovies,
  ShoppingOrderDetail,
  ShoppingOrders,
  ShoppingProductList,
  ShoppingSettings,
  ShoppingTabBar,
} from './components';
import type { ShoppingCartGroup, ShoppingCartLine } from './components/ShoppingCart';

const getTabRoot = (tab: TabKey): Screen => {
  if (tab === 'home') return 'home';
  if (tab === 'cart') return 'cart';
  if (tab === 'orders') return 'orders';
  return 'me';
};

const staticHeaderTitleMap: Record<Screen, string> = {
  home: '首页',
  dessert: '甜品店',
  flowers: '鲜花店',
  movies: '电影票',
  cart: '购物车',
  'movie-checkout': '选择场次',
  'goods-checkout': '确认订单',
  orders: '订单',
  'order-detail': '订单详情',
  logistics: '物流详情',
  me: '我的',
  favorites: '我的收藏',
  addresses: '地址管理',
  'address-add': '新增地址',
  settings: '设置',
};

const pickStore = (stores: CommerceStore[], kind: StoreKind, storeId?: string): CommerceStore => {
  return (
    resolveStoreByKind(stores, kind, storeId) ||
    defaultStores.find((item) => item.kind === kind) ||
    defaultStores[0]
  );
};

const resolveProductStoreId = (item: ProductItem, kind: GoodsKind) => {
  return item.storeId || getDefaultStoreIdByKind(kind);
};

const filterProductsByStore = (items: ProductItem[], kind: GoodsKind, storeId: string) => {
  return items.filter((item) => resolveProductStoreId(item, kind) === storeId);
};

const mergeCartToLines = (items: ProductItem[]): ShoppingCartLine[] => {
  const lineMap = new Map<string, ShoppingCartLine>();
  items.forEach((item) => {
    const key = item.id;
    const found = lineMap.get(key);
    if (found) {
      found.qty += 1;
      found.subtotal = found.qty * found.unitPrice;
      return;
    }
    lineMap.set(key, {
      id: item.id,
      name: item.name,
      desc: item.desc,
      qty: 1,
      unitPrice: item.price,
      subtotal: item.price,
    });
  });
  return Array.from(lineMap.values());
};

const buildCartLineKey = (kind: GoodsKind, storeId: string, lineId: string) => `${kind}-${storeId}-${lineId}`;

const dropPurchasedItemsFromCart = (
  items: ProductItem[],
  kind: GoodsKind,
  purchasedGroups: ShoppingCartGroup[]
) => {
  const removePlan = new Map<string, number>();
  purchasedGroups
    .filter((group) => group.kind === kind)
    .forEach((group) => {
      group.lines.forEach((line) => {
        const key = `${group.storeId}::${line.id}`;
        removePlan.set(key, (removePlan.get(key) || 0) + line.qty);
      });
    });
  if (removePlan.size === 0) return items;
  return items.filter((item) => {
    const storeId = resolveProductStoreId(item, kind);
    const key = `${storeId}::${item.id}`;
    const remain = removePlan.get(key) || 0;
    if (remain <= 0) return true;
    removePlan.set(key, remain - 1);
    return false;
  });
};

const resolveMovieCinemaDefault = (store: CommerceStore) => {
  const value = (store.decorationConfig?.movieCheckoutLabels?.[8] || '').trim();
  return value || DEFAULT_STORE_MOVIE_CHECKOUT_LABELS[8];
};

const resolveMovieDateDefault = (store: CommerceStore) => {
  const configured = (store.decorationConfig?.movieCheckoutLabels?.[9] || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(configured)) return configured;
  return formatDate(addDays(new Date(), 1));
};

const resolveMovieQtyDefault = (store: CommerceStore) => {
  const configured = Number((store.decorationConfig?.movieCheckoutLabels?.[10] || '').trim());
  if (Number.isFinite(configured) && configured >= 1 && configured <= 6) return Math.floor(configured);
  return 2;
};

const toMoney2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const ORDER_PREVIEW_ITEM_LIMIT = 3;

type MergedPaymentMethod = 'wechat' | 'delegate';
type PaymentSheetTarget = 'merged-cart' | 'movie' | 'order-detail' | 'movie-share';
type ShoppingEntryMode = 'solo' | 'together';
type PayeeContact = {
  id: string;
  name: string;
  avatar?: string;
};

const getContactInitials = (name: string) => {
  const normalized = name.trim();
  if (!normalized) return '?';
  return normalized.slice(0, 2).toUpperCase();
};

const buildOrderPreview = (
  orders: Array<Pick<Order, 'lines' | 'meta'>>
): WeChatOrderPreview => {
  const storeNames = Array.from(
    new Set(
      orders
        .map((order) => String(order.meta?.storeName ?? '').trim())
        .filter(Boolean)
    )
  );
  const itemMap = new Map<string, { name: string; qty: number }>();
  let totalItemCount = 0;

  orders.forEach((order) => {
    order.lines.forEach((line) => {
      const name = String(line.name ?? '').trim();
      if (!name) return;
      const qty = Number.isFinite(line.qty) && line.qty > 0 ? Math.round(line.qty) : 1;
      totalItemCount += qty;
      const found = itemMap.get(name);
      if (found) {
        found.qty += qty;
        return;
      }
      itemMap.set(name, { name, qty });
    });
  });

  return {
    storeNames: storeNames.length > 0 ? storeNames : undefined,
    items: Array.from(itemMap.values()).slice(0, ORDER_PREVIEW_ITEM_LIMIT),
    totalItemCount,
  };
};

type ShoppingLaunchState = {
  tab: TabKey;
  route: Route;
  history: Route[];
};

type CartAddressTab = 'address' | 'gift';
type ShoppingEntryStage = 'mode' | 'contact';
type ShoppingTogetherState = {
  active: boolean;
  companionId: string;
  companionName: string;
  companionAvatar?: string;
};
type ShoppingCompanionMessage = {
  id: string;
  role: 'ai' | 'user';
  content: string;
};
const SHOPPING_ENTRY_INTRO_EXIT_MS = 460;
const SHOPPING_COMPANION_MESSAGE_LIMIT = 6;
const DEFAULT_CHAT_BASE_URL = 'https://api.openai.com/v1';

const normalizeTextContent = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const requestShoppingCompanionModelReply = async (
  settings: GlobalSettings,
  params: {
    companionName: string;
    screen: Screen;
    latestTopic?: string;
    triggerLabel?: string;
    userInput?: string;
    recentMessages: ShoppingCompanionMessage[];
  }
): Promise<string> => {
  const apiKey = normalizeTextContent(settings.apiKey);
  if (!apiKey) throw new Error('missing-chat-api-key');

  const baseUrl = normalizeTextContent(settings.baseUrl || DEFAULT_CHAT_BASE_URL).replace(/\/+$/, '');
  if (!baseUrl) throw new Error('missing-chat-base-url');

  const model = normalizeTextContent(settings.model) || 'gpt-4o-mini';
  const recentTranscript = params.recentMessages
    .slice(-4)
    .map((message) => `${message.role === 'ai' ? params.companionName : '我'}：${message.content}`)
    .join('\n');

  const promptMode = params.userInput ? 'reply' : 'observe';
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: Math.min(0.95, Math.max(0.4, settings.temperature ?? 0.75)),
      max_tokens: Math.min(220, Math.max(90, settings.maxTokens || 140)),
      messages: [
        {
          role: 'system',
          content:
            `你是用户正在一起购物的陪伴搭子，名字叫${params.companionName}。` +
            '你在购物过程中陪聊、夸赞、给情绪价值，也可以轻微调侃，但语气要自然、亲近、像微信聊天。' +
            '不要提自己是AI，不要提模型，不要写分析过程，不要使用列表，不要加引号。' +
            '输出只要1到2句中文，总长度控制在18到60字，口语化、温柔、有陪伴感。' +
            '如果用户在看具体商品、电影、订单或礼物，要结合那个对象来回应，不要空泛。',
        },
        {
          role: 'user',
          content:
            `当前页面：${params.screen}\n` +
            `最近关注的对象：${params.latestTopic || params.triggerLabel || '暂无'}\n` +
            `最近聊天：\n${recentTranscript || '暂无'}\n` +
            (promptMode === 'observe'
              ? `用户刚刚在购物页面点了：${params.triggerLabel || '某个内容'}\n请像陪着一起逛街的人那样，自然接一句。`
              : `用户刚刚对你说：${params.userInput || ''}\n请直接接话回复。`),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`shopping-companion-api-failed-${response.status}`);
  }

  const data = await response.json().catch(() => null);
  const content = data?.choices?.[0]?.message?.content;
  const normalized = normalizeTextContent(content);
  if (!normalized) throw new Error('shopping-companion-empty-response');
  return normalized;
};

const resolveShoppingTogetherState = (
  context?: ShoppingAppProps['context']
): ShoppingTogetherState | null => {
  const raw = context?.params?.shoppingTogether;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const payload = raw as Record<string, unknown>;
  const companionId = normalizeTextContent(payload.companionId);
  const companionName = normalizeTextContent(payload.companionName);
  if (payload.active !== true || !companionId || !companionName) return null;
  return {
    active: true,
    companionId,
    companionName,
    companionAvatar: normalizeTextContent(payload.companionAvatar),
  };
};

const buildShoppingCompanionMessageId = () =>
  `shopping-companion-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const appendShoppingCompanionMessage = (
  messages: ShoppingCompanionMessage[],
  message: ShoppingCompanionMessage
) => [...messages, message].slice(-SHOPPING_COMPANION_MESSAGE_LIMIT);

const buildShoppingCompanionWelcomeMessage = (companionName: string): string =>
  `${companionName}上线啦，今天我就陪你一起逛，你负责心动，我负责捧场。`;

const isGenericShoppingActionLabel = (value: string): boolean => {
  const normalized = value.replace(/\s+/g, '');
  return [
    '加入购物车',
    '添加1件',
    '移除1件',
    '查看详情',
    '去首页',
    '搜索',
    '取消',
    '关闭',
    '立即发货',
    '预约发货',
    '管理地址',
    '切换地址',
    '提交订单',
    '合并支付',
    '微信支付',
    '由他代付',
    '选择微信联系人',
  ].includes(normalized);
};

const extractShoppingInteractionLabel = (target: HTMLElement | null): string => {
  if (!target) return '';
  const candidates: string[] = [];
  const pushCandidate = (value: string | null | undefined) => {
    const normalized = normalizeTextContent(value);
    if (!normalized) return;
    candidates.push(normalized.replace(/\s+/g, ' ').slice(0, 42));
  };

  const interactive = target.closest(
    'button, label, a, [role="button"], input, select, textarea, [aria-label]'
  ) as HTMLElement | null;
  if (interactive) {
    pushCandidate(interactive.getAttribute('aria-label'));
    if (interactive instanceof HTMLInputElement || interactive instanceof HTMLTextAreaElement) {
      pushCandidate(interactive.placeholder);
      pushCandidate(interactive.value);
    } else if (interactive instanceof HTMLSelectElement) {
      pushCandidate(interactive.selectedOptions?.[0]?.textContent || '');
    }
    pushCandidate(interactive.textContent);
    if (isGenericShoppingActionLabel(candidates[0] || '')) {
      const richTextNode = interactive.closest('article, section, li, div')?.querySelector('h1, h2, h3, strong');
      pushCandidate(richTextNode?.textContent || '');
    }
  }

  if (candidates.length === 0) {
    const semanticParent = target.closest('article, section, li, div');
    pushCandidate(
      semanticParent?.querySelector('h1, h2, h3, strong, [aria-label]')?.textContent || target.textContent || ''
    );
  }

  return candidates.find(Boolean) || '';
};

const buildShoppingCompanionObservation = (
  screen: Screen,
  label: string,
  companionName: string
): string => {
  if (screen === 'home') return `${companionName}觉得你刚刚看上的“${label}”挺有眼光，今天的购物雷达很准。`;
  if (screen === 'dessert' || screen === 'flowers') {
    return `你居然盯上“${label}”了？风格有点不一样，但我觉得你拿捏得住，选它很有惊喜。`;
  }
  if (screen === 'cart') return `“${label}”都进购物车了，你今天出手挺果断，我喜欢你这种心动就行动。`;
  if (screen === 'goods-checkout') return `都看到“${label}”这一步了，我感觉这单八成会成，你现在眼神里都是想买。`;
  if (screen === 'movies' || screen === 'movie-checkout') {
    return `“${label}”这个选择有点会挑，和你一起看肯定比一个人刷更有意思。`;
  }
  if (screen === 'orders' || screen === 'order-detail' || screen === 'logistics') {
    return `你连“${label}”都点开认真看，我发现你买完东西以后也很有仪式感。`;
  }
  if (screen === 'favorites') return `收藏里的“${label}”你还惦记着啊，我就知道你是真的有点喜欢。`;
  if (screen === 'addresses') return `连“${label}”你都点得这么认真，今天这趟购物明显不是随便逛逛。`;
  return `看到你点了“${label}”，我第一反应就是这也太像你的选择了。`;
};

const buildShoppingCompanionReplyToUser = (
  input: string,
  companionName: string,
  screen: Screen,
  latestTopic: string
): string => {
  const normalized = input.trim();
  if (!normalized) return `${companionName}在呢，你继续说，我认真听着。`;
  if (/好看|适合|可以吗|怎么样|行不行/.test(normalized)) {
    return `我觉得挺适合你的，尤其是“${latestTopic || '这个'}”这种感觉，穿在你身上会比我想象里还顺眼。`;
  }
  if (/买|下单|冲|要不要/.test(normalized)) {
    return `如果你已经心动两次以上，那就别再犹豫了，买下来大概率会让你开心。`;
  }
  if (/贵|预算|价格|太贵/.test(normalized)) {
    return `价格确实要看值不值，但如果是“${latestTopic || '这个'}”这种让你反复回头的东西，我会觉得可以稍微偏心一点。`;
  }
  if (/送人|礼物/.test(normalized)) {
    return `拿来送人也很合适，而且会显得你特别会挑。你选礼物的审美，我一直都挺服气。`;
  }
  if (/电影|场次|票/.test(normalized) || screen === 'movies' || screen === 'movie-checkout') {
    return `这场如果和你一起看，氛围应该会很好。选你最有感觉的那一场，别只挑时间最顺手的。`;
  }
  if (/吃|甜|蛋糕|花|鲜花/.test(normalized)) {
    return `你一认真挑这些，我就会觉得今天的快乐值已经开始上涨了。`;
  }
  return `${companionName}收到。你继续慢慢挑，我负责在旁边夸你眼光好，顺便帮你一起犹豫。`;
};

const isShoppingCompanionVisibleScreen = (screen: Screen): boolean =>
  screen === 'home' ||
  screen === 'dessert' ||
  screen === 'flowers' ||
  screen === 'movies' ||
  screen === 'movie-checkout' ||
  screen === 'goods-checkout';

const resolveShoppingLaunchState = (context?: ShoppingAppProps['context']): ShoppingLaunchState => {
  const defaultState: ShoppingLaunchState = {
    tab: 'home',
    route: { tab: 'home', screen: 'home' },
    history: [],
  };
  const params = context?.params;
  const rawState = params?.shoppingState;
  if (!rawState || typeof rawState !== 'object' || Array.isArray(rawState)) return defaultState;
  const state = rawState as Partial<ShoppingLaunchState> & { route?: Partial<Route> };
  const tab: TabKey = state.tab === 'cart' || state.tab === 'orders' || state.tab === 'me' ? state.tab : 'home';
  const routeTab = state.route?.tab;
  const routeScreen = state.route?.screen;
  const route: Route =
    routeTab && routeScreen
      ? {
          tab: routeTab as TabKey,
          screen: routeScreen as Screen,
          params: state.route?.params && typeof state.route.params === 'object' ? state.route.params : undefined,
        }
      : { tab, screen: getTabRoot(tab) };
  const history = Array.isArray(state.history)
    ? state.history
        .filter((item): item is Route => Boolean(item && typeof item === 'object'))
        .map((item) => ({
          tab: (item as Route).tab,
          screen: (item as Route).screen,
          params: (item as Route).params,
        }))
    : [];
  return { tab, route, history };
};

export const ShoppingApp: React.FC<ShoppingAppProps> = ({ onClose, context }) => {
  const launchState = React.useMemo(() => resolveShoppingLaunchState(context), [context]);
  const launchShoppingTogetherState = React.useMemo(() => resolveShoppingTogetherState(context), [context]);
  const hasExplicitLaunchParams = React.useMemo(
    () => Boolean(context?.params && Object.keys(context.params).length > 0),
    [context?.params]
  );
  const shouldShowShoppingEntryIntroOnLaunch = React.useMemo(
    () =>
      !hasExplicitLaunchParams &&
      launchState.tab === 'home' &&
      launchState.route.screen === 'home' &&
      launchState.history.length === 0,
    [hasExplicitLaunchParams, launchState]
  );
  const contentRef = React.useRef<HTMLDivElement>(null);
  const deliveredGiftOrderIdsRef = React.useRef<Set<string>>(new Set());
  const shoppingEntryIntroTimeoutRef = React.useRef<number | null>(null);
  const shoppingEntrySwipePointerIdRef = React.useRef<number | null>(null);
  const shoppingEntrySwipeStartYRef = React.useRef<number | null>(null);
  const lastShoppingInteractionRef = React.useRef<{ key: string; timestamp: number }>({ key: '', timestamp: 0 });
  const shoppingCompanionDragOffsetRef = React.useRef({ x: 0, y: 0 });
  const [tab, setTab] = React.useState<TabKey>(launchState.tab);
  const [route, setRoute] = React.useState<Route>(launchState.route);
  const [history, setHistory] = React.useState<Route[]>(launchState.history);
  const [stores, setStores] = React.useState<CommerceStore[]>([]);
  const [homeTopTab, setHomeTopTab] = React.useState<string>(DEFAULT_SHOPPING_HOME_TAB);
  const [shoppingEntryMode, setShoppingEntryMode] = React.useState<ShoppingEntryMode>('solo');
  const [shoppingEntryStage, setShoppingEntryStage] = React.useState<ShoppingEntryStage>('mode');
  const [showShoppingEntryIntro, setShowShoppingEntryIntro] = React.useState(shouldShowShoppingEntryIntroOnLaunch);
  const [shoppingEntryIntroLeaving, setShoppingEntryIntroLeaving] = React.useState(false);
  const [shoppingTogetherState, setShoppingTogetherState] = React.useState<ShoppingTogetherState | null>(
    launchShoppingTogetherState
  );
  const [shoppingCompanionMessages, setShoppingCompanionMessages] = React.useState<ShoppingCompanionMessage[]>(() =>
    launchShoppingTogetherState
      ? [
          {
            id: buildShoppingCompanionMessageId(),
            role: 'ai',
            content: buildShoppingCompanionWelcomeMessage(launchShoppingTogetherState.companionName),
          },
        ]
      : []
  );
  const [shoppingCompanionInput, setShoppingCompanionInput] = React.useState('');
  const [shoppingCompanionComposerOpen, setShoppingCompanionComposerOpen] = React.useState(false);
  const [shoppingCompanionPosition, setShoppingCompanionPosition] = React.useState({ x: 18, y: 140 });
  const [shoppingCompanionDragging, setShoppingCompanionDragging] = React.useState(false);
  const [shoppingCompanionLatestTopic, setShoppingCompanionLatestTopic] = React.useState('');
  const [shoppingCompanionPending, setShoppingCompanionPending] = React.useState(false);

  const {
    products: dessertProducts,
    cart: dessertCart,
    setDessertCart,
    hydrateCommerceData,
    addToCart: addDessertToCart,
    setLoading: setDessertLoading,
    flowerProducts,
    flowerCart,
    setFlowerProducts,
    setFlowerCart,
    orders,
    setOrders,
    favorites,
    setFavorites,
    addresses,
    setAddresses,
    settings,
    setSettingNotify,
    setSettingFaceId,
  } = useShoppingStore();
  const globalSettings = useGlobalSettingsStore((state) => state.settings);
  const contacts = useContactsStore((state) => state.contacts);

  const [movieQuery, setMovieQuery] = React.useState('');
  const [selectedMovie, setSelectedMovie] = React.useState<Movie | null>(null);
  const [movieProducts, setMovieProducts] = React.useState<ProductItem[]>([]);
  const [movieDate, setMovieDate] = React.useState(resolveMovieDateDefault(defaultStores[2]));
  const [movieQty, setMovieQty] = React.useState(resolveMovieQtyDefault(defaultStores[2]));
  const [movieCinema, setMovieCinema] = React.useState(DEFAULT_STORE_MOVIE_CHECKOUT_LABELS[8]);
  const [movieSession, setMovieSession] = React.useState(DEFAULT_STORE_MOVIE_SESSION_OPTIONS[0]);
  const wechatCharacters = useWeChatFriendCharactersFromContacts();
  const wechatSessions = useWeChatStore((state) => state.wechatSessions);
  const syncWeChatRoleContext = useWeChatStore((state) => state.syncWeChatRoleContext);
  const [selectedPayeeContactId, setSelectedPayeeContactId] = React.useState('');
  const [mergedPaymentSheetStage, setMergedPaymentSheetStage] = React.useState<'method' | 'payee'>('method');

  const [newAddrName, setNewAddrName] = React.useState('');
  const [newAddrPhone, setNewAddrPhone] = React.useState('');
  const [newAddrAddress, setNewAddrAddress] = React.useState('');

  const [shippingMode, setShippingMode] = React.useState<ShippingMode>('now');
  const [scheduleDate, setScheduleDate] = React.useState(formatDate(addDays(new Date(), 1)));
  const [scheduleTime, setScheduleTime] = React.useState('10:00');
  const [selectedCartAddressId, setSelectedCartAddressId] = React.useState<string | null>(null);
  const [cartAddressTab, setCartAddressTab] = React.useState<CartAddressTab>('address');
  const [selectedGiftContactId, setSelectedGiftContactId] = React.useState('');
  const [selectedCartLineKeys, setSelectedCartLineKeys] = React.useState<Record<string, boolean>>({});
  const [paymentSheetTarget, setPaymentSheetTarget] = React.useState<PaymentSheetTarget | null>(null);
  const [pendingMovieStoreId, setPendingMovieStoreId] = React.useState<string | null>(null);
  const [pendingOrderPaymentId, setPendingOrderPaymentId] = React.useState<string | null>(null);
  const [pendingMovieShareOrderId, setPendingMovieShareOrderId] = React.useState<string | null>(null);
  const homeTopTabs = React.useMemo(() => resolveShoppingHomeTabs(stores), [stores]);
  const payeeContacts = React.useMemo(
    () =>
      contacts
        .filter(
          (contact) =>
            (contact.wechatRelation === 'friend' || typeof contact.wechatRelation === 'undefined') &&
            contact.id.trim() &&
            contact.name.trim()
        )
        .map((contact) => ({
          id: contact.id.trim(),
          name: contact.name.trim(),
          avatar: contact.avatar?.trim() || '',
        })),
    [contacts]
  );
  const movieShareContacts = React.useMemo(
    () => {
      const characterById = new Map(
        wechatCharacters.map((character) => [character.id.trim(), character] as const)
      );
      const seen = new Set<string>();
      return wechatSessions
        .map((session): PayeeContact | null => {
          const characterId = session.characterId.trim();
          if (!characterId) return null;
          if (seen.has(characterId)) return null;
          if (!Array.isArray(session.messages) || session.messages.length === 0) return null;
          const character = characterById.get(characterId);
          if (!character) return null;
          const name = character.name.trim();
          if (!name) return null;
          seen.add(characterId);
          return {
            id: characterId,
            name,
            avatar: character.avatar?.trim() || '',
          };
        })
        .filter((contact): contact is PayeeContact => Boolean(contact));
    },
    [wechatCharacters, wechatSessions]
  );
  const selectedPayeeContact = React.useMemo(
    () => payeeContacts.find((contact) => contact.id === selectedPayeeContactId),
    [payeeContacts, selectedPayeeContactId]
  );
  const giftContacts = React.useMemo(
    () =>
      contacts
        .filter((contact) => contact.id.trim() && contact.name.trim())
        .map((contact) => ({
          id: contact.id.trim(),
          name: contact.name.trim(),
          avatar: contact.avatar?.trim() || '',
        })),
    [contacts]
  );
  const selectedGiftContact = React.useMemo(
    () => giftContacts.find((contact) => contact.id === selectedGiftContactId),
    [giftContacts, selectedGiftContactId]
  );


  React.useEffect(() => {
    syncWeChatRoleContext();
  }, [syncWeChatRoleContext]);

  React.useEffect(() => {
    if (homeTopTabs.includes(homeTopTab)) return;
    setHomeTopTab(DEFAULT_SHOPPING_HOME_TAB);
  }, [homeTopTab, homeTopTabs]);

  React.useEffect(() => {
    if (payeeContacts.length === 0) {
      if (selectedPayeeContactId !== '') setSelectedPayeeContactId('');
      return;
    }
    if (selectedPayeeContactId && payeeContacts.some((contact) => contact.id === selectedPayeeContactId)) return;
    setSelectedPayeeContactId(payeeContacts[0].id);
  }, [payeeContacts, selectedPayeeContactId]);

  React.useEffect(() => {
    if (giftContacts.length === 0) {
      if (selectedGiftContactId !== '') setSelectedGiftContactId('');
      if (cartAddressTab === 'gift') setCartAddressTab('address');
      return;
    }
    if (selectedGiftContactId && giftContacts.some((contact) => contact.id === selectedGiftContactId)) return;
    setSelectedGiftContactId(giftContacts[0].id);
  }, [cartAddressTab, giftContacts, selectedGiftContactId]);

  React.useEffect(
    () => () => {
      if (shoppingEntryIntroTimeoutRef.current !== null) {
        window.clearTimeout(shoppingEntryIntroTimeoutRef.current);
      }
    },
    []
  );

  React.useEffect(() => {
    if (!launchShoppingTogetherState) return;
    setShoppingTogetherState(launchShoppingTogetherState);
    setShoppingCompanionMessages([
      {
        id: buildShoppingCompanionMessageId(),
        role: 'ai',
        content: buildShoppingCompanionWelcomeMessage(launchShoppingTogetherState.companionName),
      },
    ]);
    setShoppingCompanionComposerOpen(false);
    setShoppingCompanionInput('');
  }, [launchShoppingTogetherState]);


  const refreshStores = React.useCallback(async () => {
    await hydrateCommerceData();
    const [next, nextMovieProducts] = await Promise.all([
      loadCommerceStores(),
      readMovieProductsFromStorage(),
    ]);
    setStores(next);
    setMovieProducts(nextMovieProducts);
  }, [hydrateCommerceData]);

  React.useEffect(() => {
    initializeSellerMessageScheduler();
  }, []);

  React.useEffect(() => {
    const handleStoresUpdated = () => {
      void refreshStores();
    };
    window.addEventListener(STORES_UPDATED_EVENT, handleStoresUpdated);
    return () => window.removeEventListener(STORES_UPDATED_EVENT, handleStoresUpdated);
  }, [refreshStores]);

  React.useEffect(() => {
    let cancelled = false;
    const syncRoleScopedShoppingState = async () => {
      await useShoppingStore.persist.rehydrate();
      if (cancelled) return;
      await refreshStores();
    };

    const handleCommerceRoleChanged = () => {
      void syncRoleScopedShoppingState();
    };

    void syncRoleScopedShoppingState();

    window.addEventListener(COMMERCE_ROLE_CHANGED_EVENT, handleCommerceRoleChanged);

    return () => {
      cancelled = true;
      window.removeEventListener(COMMERCE_ROLE_CHANGED_EVENT, handleCommerceRoleChanged);
    };
  }, [refreshStores]);

  const hasDock = route.screen === 'dessert' || route.screen === 'flowers';
  const isRoot = route.screen === getTabRoot(tab) && history.length === 0;
  const isShoppingCompanionVisible = shoppingTogetherState?.active && isShoppingCompanionVisibleScreen(route.screen);
  const settingNotify = settings.notify;
  const settingFaceId = settings.faceId;

  const defaultAddress = React.useMemo(
    () => addresses.find((addr) => addr.isDefault) ?? addresses[0],
    [addresses]
  );
  const selectedCartAddress = React.useMemo(() => {
    if (addresses.length === 0) return undefined;
    return addresses.find((addr) => addr.id === selectedCartAddressId) ?? defaultAddress ?? addresses[0];
  }, [addresses, defaultAddress, selectedCartAddressId]);

  React.useEffect(() => {
    if (addresses.length === 0) {
      if (selectedCartAddressId !== null) setSelectedCartAddressId(null);
      return;
    }
    if (selectedCartAddressId && addresses.some((addr) => addr.id === selectedCartAddressId)) return;
    const fallbackId = (defaultAddress ?? addresses[0])?.id;
    if (fallbackId && fallbackId !== selectedCartAddressId) {
      setSelectedCartAddressId(fallbackId);
    }
  }, [addresses, defaultAddress, selectedCartAddressId]);

  const editingAddressId = route.screen === 'address-add' ? (route.params?.editId as string | undefined) : undefined;
  React.useEffect(() => {
    if (route.screen !== 'address-add') return;
    if (editingAddressId) {
      const target = addresses.find((addr) => addr.id === editingAddressId);
      if (!target) return;
      setNewAddrName(target.name);
      setNewAddrPhone(target.phone);
      setNewAddrAddress(target.address);
      return;
    }
    setNewAddrName('');
    setNewAddrPhone('');
    setNewAddrAddress('');
  }, [addresses, editingAddressId, route.screen, setNewAddrAddress, setNewAddrName, setNewAddrPhone]);

  const routeStoreId = route.params?.storeId as string | undefined;
  const activeDessertStore = pickStore(stores, 'dessert', routeStoreId);
  const activeFlowerStore = pickStore(stores, 'flower', routeStoreId);
  const activeMovieStore = pickStore(stores, 'movie', routeStoreId);
  const mergedCartGroups = React.useMemo<ShoppingCartGroup[]>(() => {
    const groupedRaw = new Map<
      string,
      {
        kind: GoodsKind;
        storeId: string;
        storeName: string;
        storeTypeName?: string;
        storeSignboard?: string;
        storeDecoration?: string;
        items: ProductItem[];
      }
    >();
    const appendGroupItems = (kind: GoodsKind, items: ProductItem[]) => {
      items.forEach((item) => {
        const storeId = resolveProductStoreId(item, kind);
        const key = `${kind}-${storeId}`;
        const store = pickStore(stores, kind, storeId);
        const found = groupedRaw.get(key);
        if (found) {
          found.items.push(item);
          return;
        }
        groupedRaw.set(key, {
          kind,
          storeId,
          storeName: store.name,
          storeTypeName: store.typeName,
          storeSignboard: store.signboard,
          storeDecoration: store.decoration,
          items: [item],
        });
      });
    };
    appendGroupItems('dessert', dessertCart);
    appendGroupItems('flower', flowerCart);
    return Array.from(groupedRaw.values())
      .map((group) => {
        const lines = mergeCartToLines(group.items);
        const count = group.items.length;
        const total = lines.reduce((sum, line) => sum + line.subtotal, 0);
        return {
          kind: group.kind,
          storeId: group.storeId,
          storeName: group.storeName,
          storeTypeName: group.storeTypeName,
          storeSignboard: group.storeSignboard,
          storeDecoration: group.storeDecoration,
          lines,
          count,
          total,
        };
      })
      .sort((left, right) => left.storeName.localeCompare(right.storeName));
  }, [dessertCart, flowerCart, stores]);
  const mergedCartTotalCount = React.useMemo(
    () => mergedCartGroups.reduce((sum, group) => sum + group.count, 0),
    [mergedCartGroups]
  );
  React.useEffect(() => {
    const availableKeys = new Set<string>();
    mergedCartGroups.forEach((group) => {
      group.lines.forEach((line) => {
        availableKeys.add(buildCartLineKey(group.kind, group.storeId, line.id));
      });
    });
    setSelectedCartLineKeys((prev) => {
      const next: Record<string, boolean> = {};
      let changed = false;
      availableKeys.forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(prev, key)) {
          next[key] = prev[key];
        } else {
          next[key] = true;
          changed = true;
        }
      });
      Object.keys(prev).forEach((key) => {
        if (!availableKeys.has(key)) changed = true;
      });
      if (!changed && Object.keys(prev).length === Object.keys(next).length) return prev;
      return next;
    });
  }, [mergedCartGroups]);
  const mergedSelectedCartGroups = React.useMemo<ShoppingCartGroup[]>(() => {
    return mergedCartGroups
      .map((group) => {
        const selectedLines = group.lines.filter((line) => {
          const key = buildCartLineKey(group.kind, group.storeId, line.id);
          return selectedCartLineKeys[key] !== false;
        });
        if (selectedLines.length === 0) return null;
        const selectedCount = selectedLines.reduce((sum, line) => sum + line.qty, 0);
        const selectedTotal = selectedLines.reduce((sum, line) => sum + line.subtotal, 0);
        return {
          ...group,
          lines: selectedLines,
          count: selectedCount,
          total: selectedTotal,
        };
      })
      .filter((group): group is ShoppingCartGroup => Boolean(group));
  }, [mergedCartGroups, selectedCartLineKeys]);
  const mergedSelectedCartTotalCount = React.useMemo(
    () => mergedSelectedCartGroups.reduce((sum, group) => sum + group.count, 0),
    [mergedSelectedCartGroups]
  );
  const mergedSelectedCartTotalAmount = React.useMemo(
    () => mergedSelectedCartGroups.reduce((sum, group) => sum + group.total, 0),
    [mergedSelectedCartGroups]
  );
  const globalGoodsCart = React.useMemo(() => [...dessertCart, ...flowerCart], [dessertCart, flowerCart]);
  const globalGoodsCartTotal = React.useMemo(
    () => globalGoodsCart.reduce((sum, item) => sum + item.price, 0),
    [globalGoodsCart]
  );
  const activeMovieCheckoutLabels = React.useMemo(
    () =>
      DEFAULT_STORE_MOVIE_CHECKOUT_LABELS.map(
        (label, index) => (activeMovieStore.decorationConfig?.movieCheckoutLabels?.[index] || '').trim() || label
      ),
    [activeMovieStore]
  );
  const activeMovieSessionOptions = React.useMemo(
    () =>
      DEFAULT_STORE_MOVIE_SESSION_OPTIONS.map(
        (label, index) => (activeMovieStore.decorationConfig?.movieSessionOptions?.[index] || '').trim() || label
      ),
    [activeMovieStore]
  );

  React.useEffect(() => {
    if (activeMovieSessionOptions.includes(movieSession)) return;
    setMovieSession(activeMovieSessionOptions[0] || DEFAULT_STORE_MOVIE_SESSION_OPTIONS[0]);
  }, [activeMovieSessionOptions, movieSession]);

  const headerTitle = React.useMemo(() => {
    if (route.screen === 'dessert') return activeDessertStore.signboard || activeDessertStore.name;
    if (route.screen === 'flowers') return activeFlowerStore.signboard || activeFlowerStore.name;
    if (route.screen === 'movies') return activeMovieStore.signboard || activeMovieStore.name;
    if (route.screen === 'movie-checkout') return activeMovieCheckoutLabels[7];
    if (route.screen === 'address-add' && route.params?.editId) return '编辑地址';
    return staticHeaderTitleMap[route.screen] ?? '购物';
  }, [route.screen, route.params?.editId, activeDessertStore, activeFlowerStore, activeMovieStore, activeMovieCheckoutLabels]);

  const navigate = (next: Route) => {
    setHistory((prev) => [...prev, route]);
    setRoute(next);
  };

  const go = (screen: Screen, params?: Route['params']) => {
    navigate({ tab, screen, params });
  };

  const switchTab = (nextTab: TabKey) => {
    setTab(nextTab);
    setHistory([]);
    setRoute({ tab: nextTab, screen: getTabRoot(nextTab) });
  };

  const goBack = () => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setHistory((prevHistory) => prevHistory.slice(0, -1));
      setTab(prev.tab);
      setRoute(prev);
      return;
    }

    if (tab !== 'home') {
      switchTab('home');
      return;
    }

    onClose();
  };

  const closeShoppingEntryIntro = React.useCallback(() => {
    setShoppingEntryIntroLeaving(true);
    shoppingEntrySwipePointerIdRef.current = null;
    shoppingEntrySwipeStartYRef.current = null;
    if (shoppingEntryIntroTimeoutRef.current !== null) {
      window.clearTimeout(shoppingEntryIntroTimeoutRef.current);
    }
    shoppingEntryIntroTimeoutRef.current = window.setTimeout(() => {
      setShowShoppingEntryIntro(false);
      setShoppingEntryIntroLeaving(false);
      setShoppingEntryStage('mode');
      shoppingEntryIntroTimeoutRef.current = null;
    }, SHOPPING_ENTRY_INTRO_EXIT_MS);
  }, []);

  const exitShoppingAppFromIntro = React.useCallback(() => {
    shoppingEntrySwipePointerIdRef.current = null;
    shoppingEntrySwipeStartYRef.current = null;
    if (shoppingEntryIntroTimeoutRef.current !== null) {
      window.clearTimeout(shoppingEntryIntroTimeoutRef.current);
      shoppingEntryIntroTimeoutRef.current = null;
    }
    onClose();
  }, [onClose]);

  const handleShoppingEntryChoice = React.useCallback((mode: ShoppingEntryMode) => {
    setShoppingEntryMode(mode);
    if (mode === 'solo') {
      closeShoppingEntryIntro();
      return;
    }
    if (payeeContacts.length === 0) {
      window.alert('微信联系人里还没有可邀请的人');
      setShoppingEntryMode('solo');
      return;
    }
    setShoppingEntryStage('contact');
  }, [closeShoppingEntryIntro, payeeContacts.length]);

  const handleShoppingEntrySwipeStart = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (shoppingEntryStage !== 'mode' || shoppingEntryIntroLeaving) return;
    shoppingEntrySwipePointerIdRef.current = event.pointerId;
    shoppingEntrySwipeStartYRef.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  }, [shoppingEntryIntroLeaving, shoppingEntryStage]);

  const handleShoppingEntrySwipeEnd = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (shoppingEntrySwipePointerIdRef.current !== event.pointerId) return;
    const startY = shoppingEntrySwipeStartYRef.current;
    shoppingEntrySwipePointerIdRef.current = null;
    shoppingEntrySwipeStartYRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (startY !== null && startY - event.clientY >= 72) {
      exitShoppingAppFromIntro();
    }
  }, [exitShoppingAppFromIntro]);

  const resetShippingSchedule = () => {
    setShippingMode('now');
    setScheduleDate(formatDate(addDays(new Date(), 1)));
    setScheduleTime('10:00');
  };

  const addFlowerToCart = (id: string) => {
    const product = flowerProducts.find((item) => item.id === id);
    if (!product) return;
    setFlowerCart((prev) => [...prev, product]);
    notifyShoppingCompanionAddToCart(product.name);
  };

  const clearDessertCartByStore = (storeId: string) => {
    setDessertCart((prev) => prev.filter((item) => resolveProductStoreId(item, 'dessert') !== storeId));
  };

  const clearFlowerCartByStore = (storeId: string) => {
    setFlowerCart((prev) => prev.filter((item) => resolveProductStoreId(item, 'flower') !== storeId));
  };

  const removeOneDessertCartItem = React.useCallback((storeId: string, productId: string) => {
    setDessertCart((prev) => {
      const targetIndex = prev.findIndex(
        (item) => item.id === productId && resolveProductStoreId(item, 'dessert') === storeId
      );
      if (targetIndex < 0) return prev;
      const next = [...prev];
      next.splice(targetIndex, 1);
      return next;
    });
  }, [setDessertCart]);

  const removeOneFlowerCartItem = React.useCallback((storeId: string, productId: string) => {
    setFlowerCart((prev) => {
      const targetIndex = prev.findIndex(
        (item) => item.id === productId && resolveProductStoreId(item, 'flower') === storeId
      );
      if (targetIndex < 0) return prev;
      const next = [...prev];
      next.splice(targetIndex, 1);
      return next;
    });
  }, [setFlowerCart]);

  const addOneDessertCartItem = React.useCallback((storeId: string, productId: string) => {
    const product =
      dessertProducts.find(
        (item) => item.id === productId && resolveProductStoreId(item, 'dessert') === storeId
      ) ||
      dessertCart.find(
        (item) => item.id === productId && resolveProductStoreId(item, 'dessert') === storeId
      );
    if (!product) return;
    setDessertCart((prev) => [...prev, product]);
  }, [dessertCart, dessertProducts, setDessertCart]);

  const addOneFlowerCartItem = React.useCallback((storeId: string, productId: string) => {
    const product =
      flowerProducts.find(
        (item) => item.id === productId && resolveProductStoreId(item, 'flower') === storeId
      ) ||
      flowerCart.find(
        (item) => item.id === productId && resolveProductStoreId(item, 'flower') === storeId
      );
    if (!product) return;
    setFlowerCart((prev) => [...prev, product]);
  }, [flowerCart, flowerProducts, setFlowerCart]);

  const handleDessertAddToCart = (id: string) => {
    const product = dessertProducts.find((item) => item.id === id);
    setDessertLoading(true);
    setTimeout(() => {
      addDessertToCart(id);
      if (product) notifyShoppingCompanionAddToCart(product.name);
      setDessertLoading(false);
    }, 300);
  };

  const isFavorited = (kind: Favorite['kind'], id: string, storeId: string) =>
    favorites.some(
      (fav) => fav.kind === kind && fav.id === id && (fav.storeId || getDefaultStoreIdByKind(kind)) === storeId
    );

  const toggleFavorite = (kind: Favorite['kind'], product: ProductItem, storeId: string) => {
    const existsNow = favorites.some(
      (fav) => fav.kind === kind && fav.id === product.id && (fav.storeId || getDefaultStoreIdByKind(kind)) === storeId
    );
    setFavorites((prev) => {
      const exists = prev.some(
        (fav) => fav.kind === kind && fav.id === product.id && (fav.storeId || getDefaultStoreIdByKind(kind)) === storeId
      );
      if (exists) {
        return prev.filter(
          (fav) =>
            !(fav.kind === kind && fav.id === product.id && (fav.storeId || getDefaultStoreIdByKind(kind)) === storeId)
        );
      }
      return [
        {
          id: product.id,
          kind,
          storeId,
          name: product.name,
          desc: product.desc,
          price: product.price,
        },
        ...prev,
      ];
    });
    if (!existsNow) {
      const storeName = stores.find((item) => item.id === storeId)?.signboard
        || stores.find((item) => item.id === storeId)?.name
        || '店铺';
      void triggerFavoriteInquiryMessage({ kind, product, storeName });
    }
  };

  const ensureAddressOrGoAdd = (after: Route) => {
    if (selectedCartAddress || defaultAddress) return true;
    go('address-add', {
      returnTo: after.screen,
      returnTab: after.tab,
      returnParams: after.params ?? {},
    });
    return false;
  };

  const openOrderDetail = (orderId: string) => {
    navigate({ tab: 'orders', screen: 'order-detail', params: { orderId } });
  };

  const placeGoodsOrder = (kind: GoodsKind, store: CommerceStore) => {
    const fullCart = kind === 'dessert' ? dessertCart : flowerCart;
    const cart = filterProductsByStore(fullCart, kind, store.id);
    if (cart.length === 0) return;

    const nextRoute: Route = { tab: 'orders', screen: 'orders' };
    if (!ensureAddressOrGoAdd(nextRoute)) return;

    const lines = groupCartLines(cart);
    const total = lines.reduce((sum, line) => sum + line.qty * line.unitPrice, 0);
    const now = Date.now();
    const orderId = `OD${now.toString().slice(-10)}`;

    const scheduleAt =
      shippingMode === 'schedule' ? new Date(`${scheduleDate}T${scheduleTime}:00`).getTime() : now;
    const shipAt = Number.isFinite(scheduleAt) ? scheduleAt : now;
    const trackingId = `SF${Math.floor(100000000 + Math.random() * 900000000)}`;
    const isDelegatePayment = Boolean(selectedPayeeContact);

    const newOrder: Order = {
      id: orderId,
      kind,
      title: `${store.name}订单`,
      lines,
      total,
      createdAt: now,
      address: defaultAddress,
      meta: {
        shipMode: shippingMode,
        shipAt,
        trackingId,
        storeId: store.id,
        storeName: store.name,
        storeCode: store.code,
        paymentStatus: isDelegatePayment ? 'pending-pay' : 'paid',
        payStatus: isDelegatePayment ? 'pending-pay' : 'paid',
        status: isDelegatePayment ? '待付款' : '已付款',
        payeeContactId: selectedPayeeContact?.id || '',
        payeeName: selectedPayeeContact?.name || '',
      },
    };

    setOrders((prev) => [newOrder, ...prev]);
    if (kind === 'dessert') clearDessertCartByStore(store.id);
    else clearFlowerCartByStore(store.id);

    setTab('orders');
    setHistory([{ tab: 'orders', screen: 'orders' }]);
    setRoute({ tab: 'orders', screen: 'order-detail', params: { orderId } });

    if (selectedPayeeContact) {
      const addressText = [(selectedCartAddress ?? defaultAddress)]
        .filter(Boolean)
        .map((item) => `${item.name} ${item.phone} ${item.address}`)
        .join(' · ');
      const shareText = [
        `麻烦你帮我代付这笔${kind === 'dessert' ? '甜品' : '鲜花'}订单`,
        `订单号：${orderId}`,
        `店铺：${store.name}`,
        `商品：${lines.map((line) => `${line.name} x${line.qty}`).join('，')}`,
        `金额：${formatMoney(total)}`,
        `配送：${shippingMode === 'schedule' ? `预约 ${scheduleDate} ${scheduleTime}` : '立即发货'}`,
        addressText ? `收货地址：${addressText}` : '',
      ]
        .filter(Boolean)
        .join('\n');
      shareWechatOrder(shareText);
    }
  };

  const payByWechatBalance = React.useCallback((amount: number, title: string) => {
    const wechatStore = useWeChatStore.getState();
    if (typeof wechatStore.syncWeChatRoleContext === 'function') {
      wechatStore.syncWeChatRoleContext();
    }
    const amountToPay = toMoney2(amount);
    const balance = toMoney2(Number(wechatStore.wechatUserProfile.balance || 0));
    if (balance < amountToPay) {
      window.alert(`余额不足，当前微信钱包余额 ${formatMoney(balance)}，需支付 ${formatMoney(amountToPay)}`);
      return false;
    }
    wechatStore.withdrawWeChatBalance(amountToPay, { title });
    return true;
  }, []);

  const openApp = React.useCallback((appId: string, params?: Record<string, unknown>) => {
    window.dispatchEvent(
      new CustomEvent(PUSH_OPEN_APP_MESSAGE_TYPE, {
        detail: {
          appId,
          params,
        },
      })
    );
  }, []);

  const shareWechatMessage = React.useCallback((message: {
    content: string;
    type?: 'text' | 'order_request' | 'movie_ticket' | 'gift_delivery' | 'shopping_invite';
    appSource?: WeChatMessage['appSource'];
    amount?: number;
    orderRequestStatus?: 'pending' | 'accepted' | 'rejected';
    orderIds?: string[];
    orderPreview?: WeChatOrderPreview;
    giftDelivery?: WeChatGiftDeliveryCard;
    assistantReplyPending?: boolean;
    shoppingInvite?: {
      mode: 'together';
      inviterName?: string;
      inviteText?: string;
    };
    movieTicket?: {
      orderId: string;
      movieTitle: string;
      cinema: string;
      date: string;
      time: string;
      hall: string;
      seat: string;
      qty: number;
      pickupCode: string;
    };
  }, targetContact?: PayeeContact) => {
    const contact = targetContact ?? selectedPayeeContact;
    if (!contact) return false;
    const wechatStore = useWeChatStore.getState();
    if (typeof wechatStore.syncWeChatRoleContext === 'function') {
      wechatStore.syncWeChatRoleContext();
    }
    const sessionId = wechatStore.ensureWeChatSession(contact.id, { switchCurrent: true });
    if (!sessionId) return false;
    wechatStore.addWeChatMessage(sessionId, {
      role: 'user',
      content: message.content,
      assistantReplyPending: message.assistantReplyPending ?? true,
      type: message.type || 'text',
      appSource: message.appSource,
      amount: message.amount,
      orderRequestStatus: message.orderRequestStatus,
      orderIds: message.orderIds,
      orderPreview: message.orderPreview,
      giftDelivery: message.giftDelivery,
      shoppingInvite: message.shoppingInvite,
      movieTicket: message.movieTicket,
    });
    return true;
  }, [selectedPayeeContact]);
  const shareWechatOrder = React.useCallback((content: string, targetContact?: PayeeContact) => {
    return shareWechatMessage({ content, type: 'text' }, targetContact);
  }, [shareWechatMessage]);
  const sendShoppingTogetherInvite = React.useCallback((targetContact: PayeeContact) => {
    const shared = shareWechatMessage(
      {
        content: '邀请你和我一起购物',
        type: 'shopping_invite',
        orderRequestStatus: 'pending',
        assistantReplyPending: false,
        shoppingInvite: {
          mode: 'together',
          inviterName: '我',
          inviteText: '我想拉你一起逛逛，边买边聊。',
        },
      },
      targetContact
    );
    if (!shared) return false;
    closeShoppingEntryIntro();
    openApp('wechat', {
      openChatCharacterId: targetContact.id,
      returnAppId: 'shopping',
      returnParams: {
        shoppingState: {
          tab: 'home',
          route: { tab: 'home', screen: 'home' },
          history: [],
        },
      },
    });
    return true;
  }, [closeShoppingEntryIntro, openApp, shareWechatMessage]);
  const buildGiftDeliveryProductName = React.useCallback((order: Order) => {
    const namedLines = order.lines.filter((line) => line.name.trim());
    if (namedLines.length === 0) return '一份惊喜小礼物';
    if (namedLines.length === 1) {
      const onlyLine = namedLines[0];
      return onlyLine.qty > 1 ? `${onlyLine.name} x${onlyLine.qty}` : onlyLine.name;
    }
    const totalQty = namedLines.reduce((sum, line) => sum + Math.max(1, line.qty), 0);
    return `${namedLines[0].name}等${totalQty}件好物`;
  }, []);
  const shareGiftDeliveryCard = React.useCallback((order: Order) => {
    const targetContactId = String(order.meta?.giftRecipientContactId ?? '').trim();
    if (!targetContactId) return false;
    const wechatStore = useWeChatStore.getState();
    if (typeof wechatStore.syncWeChatRoleContext === 'function') {
      wechatStore.syncWeChatRoleContext();
    }
    const sessionId = wechatStore.ensureWeChatSession(targetContactId, { switchCurrent: false });
    if (!sessionId) return false;
    wechatStore.addWeChatMessage(sessionId, {
      role: 'user',
      content: '送你一份小礼物',
      assistantReplyPending: true,
      type: 'gift_delivery',
      amount: order.total,
      giftDelivery: {
        orderId: order.id,
        title: '送你一份小礼物',
        subtitle: '希望你能喜欢~',
        productName: buildGiftDeliveryProductName(order),
        coverEmoji: '🎁',
      },
    });
    return true;
  }, [buildGiftDeliveryProductName]);
  const placeMergedGoodsOrders = React.useCallback((paymentMethod: MergedPaymentMethod, targetContact?: PayeeContact) => {
    if (mergedSelectedCartGroups.length === 0) {
      window.alert('请先勾选要结算的商品');
      return false;
    }

    const isGiftOrder = cartAddressTab === 'gift';
    const giftContact = isGiftOrder ? selectedGiftContact : undefined;
    if (isGiftOrder && !giftContact) {
      window.alert('请先选择要送礼的联系人');
      return false;
    }

    if (!isGiftOrder) {
      const nextRoute: Route = { tab: 'cart', screen: 'cart' };
      if (!ensureAddressOrGoAdd(nextRoute)) return false;
    }

    if (paymentMethod === 'wechat') {
      const uniqueStoreNames = Array.from(
        new Set(
          mergedSelectedCartGroups
            .map((group) => (group.storeName || '').trim())
            .filter((value) => value.length > 0)
        )
      );
      const billTitle =
        uniqueStoreNames.length === 0
          ? '购物支出'
          : uniqueStoreNames.length === 1
            ? `${uniqueStoreNames[0]}支出`
            : `${uniqueStoreNames[0]}等${uniqueStoreNames.length}家店铺支出`;
      if (!payByWechatBalance(mergedSelectedCartTotalAmount, billTitle)) return false;
    }

    const now = Date.now();
    const scheduleAt =
      shippingMode === 'schedule' ? new Date(`${scheduleDate}T${scheduleTime}:00`).getTime() : now;
    const shipAt = Number.isFinite(scheduleAt) ? scheduleAt : now;

    const nextOrders: Order[] = mergedSelectedCartGroups.map((group, index) => {
      const store = pickStore(stores, group.kind, group.storeId);
      const trackingId = `SF${Math.floor(100000000 + Math.random() * 900000000)}`;
      const orderId = `OD${(now + index).toString().slice(-10)}`;
      const isDelegatePayment = paymentMethod === 'delegate';
      return {
        id: orderId,
        kind: group.kind,
        title: `${store.name}订单`,
        lines: group.lines.map((line) => ({
          name: line.name,
          qty: line.qty,
          unitPrice: line.unitPrice,
        })),
        total: group.total,
        createdAt: now + index,
        address: isGiftOrder ? undefined : (selectedCartAddress ?? defaultAddress),
        meta: {
          shipMode: shippingMode,
          shipAt,
          trackingId,
          storeId: store.id,
          storeName: store.name,
          storeCode: store.code,
          paymentStatus: isDelegatePayment ? 'pending-pay' : 'paid',
          payStatus: isDelegatePayment ? 'pending-pay' : 'paid',
          status: isDelegatePayment ? '待付款' : '已付款',
          delegateStatus: isDelegatePayment ? 'pending' : '',
          payeeContactId: (targetContact ?? selectedPayeeContact)?.id || '',
          payeeName: (targetContact ?? selectedPayeeContact)?.name || '',
          giftRecipientContactId: giftContact?.id || '',
          giftRecipientName: giftContact?.name || '',
          giftRecipientAvatar: giftContact?.avatar || '',
          giftDeliveryCardSentAt: '',
        },
      };
    });

    setOrders((prev) => [...nextOrders, ...prev]);
    setDessertCart((prev) => dropPurchasedItemsFromCart(prev, 'dessert', mergedSelectedCartGroups));
    setFlowerCart((prev) => dropPurchasedItemsFromCart(prev, 'flower', mergedSelectedCartGroups));
    setTab('orders');
    setHistory([]);
    setRoute({ tab: 'orders', screen: 'orders' });

    const payeeContact = targetContact ?? selectedPayeeContact;
    if (paymentMethod === 'delegate' && payeeContact) {
      shareWechatMessage(
        {
          content: '有一笔订单等你支付~',
          type: 'order_request',
          appSource: 'shopping',
          amount: mergedSelectedCartTotalAmount,
          orderRequestStatus: 'pending',
          orderIds: nextOrders.map((order) => order.id),
          orderPreview: buildOrderPreview(nextOrders),
        },
        payeeContact
      );
      openApp('wechat', {
        openChatCharacterId: payeeContact.id,
        returnAppId: 'shopping',
        returnParams: {
          shoppingState: {
            tab: 'cart',
            route: { tab: 'cart', screen: 'cart' },
            history: [],
          },
        },
      });
    }
    return true;
  }, [
    selectedCartAddress,
    defaultAddress,
    ensureAddressOrGoAdd,
    mergedSelectedCartGroups,
    mergedSelectedCartTotalAmount,
    scheduleDate,
    scheduleTime,
    setDessertCart,
    setFlowerCart,
    shippingMode,
    stores,
    payByWechatBalance,
    selectedPayeeContact,
    openApp,
    shareWechatMessage,
    cartAddressTab,
    selectedGiftContact,
  ]);

  React.useEffect(() => {
    const deliveredGiftOrders = orders.filter((order) => {
      if (order.kind === 'movie') return false;
      const giftContactId = String(order.meta?.giftRecipientContactId ?? '').trim();
      if (!giftContactId) return false;
      const giftSentAt = Number(order.meta?.giftDeliveryCardSentAt ?? 0);
      if (giftSentAt > 0) return false;
      return getOrderStatus(order) === '已送达';
    });
    if (deliveredGiftOrders.length === 0) return;

    let cancelled = false;
    const processGiftOrders = async () => {
      for (const order of deliveredGiftOrders) {
        if (cancelled) return;
        if (deliveredGiftOrderIdsRef.current.has(order.id)) continue;
        deliveredGiftOrderIdsRef.current.add(order.id);

        const sent = shareGiftDeliveryCard(order);
        if (sent) {
          const sentAt = Date.now();
          await updateShoppingOrdersInStorage((storedOrders) =>
            storedOrders.map((item) =>
              item.id === order.id
                ? {
                    ...item,
                    meta: {
                      ...item.meta,
                      giftDeliveryCardSentAt: sentAt,
                    },
                  }
                : item
            )
          );
          if (cancelled) return;
          setOrders((prev) =>
            prev.map((item) =>
              item.id === order.id
                ? {
                    ...item,
                    meta: {
                      ...item.meta,
                      giftDeliveryCardSentAt: sentAt,
                    },
                  }
                : item
            )
          );
        }

        deliveredGiftOrderIdsRef.current.delete(order.id);
      }
    };

    void processGiftOrders();
    return () => {
      cancelled = true;
    };
  }, [orders, setOrders, shareGiftDeliveryCard]);

  const openOrderDetailPaymentSheet = React.useCallback((orderId: string) => {
    const targetOrder = orders.find((item) => item.id === orderId);
    if (!targetOrder) return;
    setPendingMovieStoreId(null);
    setPendingOrderPaymentId(orderId);
    setPendingMovieShareOrderId(null);
    setMergedPaymentSheetStage('method');
    setPaymentSheetTarget('order-detail');
  }, [orders]);

  const openMovieShareSheet = React.useCallback((orderId: string) => {
    const targetOrder = orders.find((item) => item.id === orderId && item.kind === 'movie');
    if (!targetOrder) return;
    setPendingMovieStoreId(null);
    setPendingOrderPaymentId(null);
    setPendingMovieShareOrderId(orderId);
    setMergedPaymentSheetStage('payee');
    setPaymentSheetTarget('movie-share');
  }, [orders]);

  const openMergedPaymentSheet = React.useCallback(() => {
    if (mergedCartGroups.length === 0) return;
    if (mergedSelectedCartGroups.length === 0) {
      window.alert('请先勾选要结算的商品');
      return;
    }
    const nextRoute: Route = { tab: 'cart', screen: 'cart' };
    if (!ensureAddressOrGoAdd(nextRoute)) return;
    setPendingMovieStoreId(null);
    setPendingOrderPaymentId(null);
    setPendingMovieShareOrderId(null);
    setMergedPaymentSheetStage('method');
    setPaymentSheetTarget('merged-cart');
  }, [ensureAddressOrGoAdd, mergedCartGroups.length, mergedSelectedCartGroups.length]);

  const openMoviePaymentSheet = React.useCallback((store: CommerceStore) => {
    if (!selectedMovie) return;
    setPendingMovieStoreId(store.id);
    setPendingOrderPaymentId(null);
    setPendingMovieShareOrderId(null);
    setPaymentSheetTarget('movie');
  }, [selectedMovie]);

  const placeMovieOrder = React.useCallback((store: CommerceStore, paymentMethod: MergedPaymentMethod) => {
    if (!selectedMovie) return;
    if (paymentMethod === 'wechat') {
      const totalAmount = selectedMovie.price * movieQty;
      if (!payByWechatBalance(totalAmount, `${store.name}支出`)) return;
    }

    const now = Date.now();
    const orderId = `TP${now.toString().slice(-10)}`;

    const total = selectedMovie.price * movieQty;
    const seatStart = 10;
    const seatEnd = seatStart + Math.max(1, movieQty) - 1;

    const newOrder: Order = {
      id: orderId,
      kind: 'movie',
      title: `${store.name}票据`,
      lines: [{ name: selectedMovie.title, qty: movieQty, unitPrice: selectedMovie.price }],
      total,
      createdAt: now,
      meta: {
        movieTitle: selectedMovie.title,
        cinema: movieCinema,
        date: movieDate,
        time: movieSession,
        hall: '3号厅',
        seat: `F${seatStart}-F${seatEnd}`,
        storeId: store.id,
        storeName: store.name,
        storeCode: store.code,
      },
    };

    setOrders((prev) => [newOrder, ...prev]);

    setTab('orders');
    setHistory([{ tab: 'orders', screen: 'orders' }]);
    setRoute({ tab: 'orders', screen: 'order-detail', params: { orderId } });
  }, [
    movieCinema,
    movieDate,
    movieQty,
    movieSession,
    payByWechatBalance,
    selectedMovie,
  ]);

  const placeOrderDetailPayment = React.useCallback((orderId: string, paymentMethod: MergedPaymentMethod, targetContact?: PayeeContact) => {
    const targetOrder = orders.find((item) => item.id === orderId);
    if (!targetOrder) return false;

    const payeeContact = targetContact ?? selectedPayeeContact;
    const storeName =
      String(targetOrder.meta?.storeName ?? '').trim() ||
      targetOrder.title.replace(/订单$|票据$/, '').trim() ||
      '购物';

    if (paymentMethod === 'wechat') {
      if (!payByWechatBalance(targetOrder.total, `${storeName}支出`)) return false;
      const now = Date.now();
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? {
                ...order,
                meta: {
                  ...order.meta,
                  paymentStatus: 'paid',
                  payStatus: 'paid',
                  status: '已付款',
                  delegateStatus: 'accepted',
                  shipAt: now,
                },
              }
            : order
        )
      );

      setTab('orders');
      if (targetOrder.kind === 'movie') {
        setHistory([{ tab: 'orders', screen: 'orders' }]);
        setRoute({ tab: 'orders', screen: 'order-detail', params: { orderId } });
      } else {
        setHistory([
          { tab: 'orders', screen: 'orders' },
          { tab: 'orders', screen: 'order-detail', params: { orderId } },
        ]);
        setRoute({ tab: 'orders', screen: 'logistics', params: { orderId } });
      }
      return true;
    }

      if (!payeeContact) {
        window.alert('微信联系人里还没有可用于代付的人');
        return false;
      }

    setSelectedPayeeContactId(payeeContact.id);
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId
          ? {
              ...order,
              meta: {
                ...order.meta,
                paymentStatus: 'pending-pay',
                payStatus: 'pending-pay',
                status: '待付款',
                delegateStatus: 'pending',
                payeeContactId: payeeContact.id,
                payeeName: payeeContact.name,
              },
            }
          : order
      )
    );

    const shared = shareWechatMessage(
      {
        content: '有一笔订单等你支付~',
        type: 'order_request',
        appSource: 'shopping',
        amount: targetOrder.total,
        orderRequestStatus: 'pending',
        orderIds: [orderId],
        orderPreview: buildOrderPreview([targetOrder]),
      },
      payeeContact
    );
    if (!shared) return false;

    openApp('wechat', {
      openChatCharacterId: payeeContact.id,
      returnAppId: 'shopping',
      returnParams: {
        shoppingState: {
          tab: 'orders',
          route: { tab: 'orders', screen: 'order-detail', params: { orderId } },
          history: [{ tab: 'orders', screen: 'orders' }],
        },
      },
    });
    return true;
  }, [openApp, orders, payByWechatBalance, selectedPayeeContact, setOrders, shareWechatMessage]);

  const shareMovieTicketOrder = React.useCallback((orderId: string, targetContact?: PayeeContact) => {
    const targetOrder = orders.find((item) => item.id === orderId && item.kind === 'movie');
    if (!targetOrder) return false;
    const contact = targetContact ?? selectedPayeeContact;
    if (!contact) {
      window.alert('微信聊天列表里还没有可分享的人');
      return false;
    }

    const pickupCode = (() => {
      const storedCode = String(targetOrder.meta?.pickupCode ?? '').trim();
      if (/^\d{6}$/.test(storedCode)) return storedCode;
      const digits = targetOrder.id.replace(/\D/g, '');
      if (digits.length >= 6) return digits.slice(-6);
      return digits.padStart(6, '0').slice(-6) || '462800';
    })();

    setSelectedPayeeContactId(contact.id);
    const shared = shareWechatMessage(
      {
        content: '电影票票据',
        type: 'movie_ticket',
        amount: targetOrder.total,
        movieTicket: {
          orderId: targetOrder.id,
          movieTitle: String(targetOrder.meta?.movieTitle ?? ''),
          cinema: String(targetOrder.meta?.cinema ?? ''),
          date: String(targetOrder.meta?.date ?? ''),
          time: String(targetOrder.meta?.time ?? ''),
          hall: String(targetOrder.meta?.hall ?? ''),
          seat: String(targetOrder.meta?.seat ?? ''),
          qty: targetOrder.lines[0]?.qty ?? 1,
          pickupCode,
        },
      },
      contact
    );
    if (!shared) return false;

    openApp('wechat', {
      openChatCharacterId: contact.id,
      returnAppId: 'shopping',
      returnParams: {
        shoppingState: {
          tab: 'orders',
          route: { tab: 'orders', screen: 'order-detail', params: { orderId } },
          history: [{ tab: 'orders', screen: 'orders' }],
        },
      },
    });
    return true;
  }, [openApp, orders, selectedPayeeContact, shareWechatOrder]);

  const closePaymentSheet = React.useCallback(() => {
    setPaymentSheetTarget(null);
    setPendingMovieStoreId(null);
    setPendingOrderPaymentId(null);
    setPendingMovieShareOrderId(null);
    setMergedPaymentSheetStage('method');
  }, []);

  const appendCompanionAiMessage = React.useCallback((content: string) => {
    setShoppingCompanionMessages((prev) =>
      appendShoppingCompanionMessage(prev, {
        id: buildShoppingCompanionMessageId(),
        role: 'ai',
        content,
      })
    );
  }, []);

  const requestShoppingCompanionAiMessage = React.useCallback(
    async (params: {
      triggerLabel?: string;
      userInput?: string;
      latestTopic?: string;
      fallback: string;
      markPending?: boolean;
    }) => {
      if (!shoppingTogetherState?.active) return;
      if (params.markPending) setShoppingCompanionPending(true);
      try {
        const content = await requestShoppingCompanionModelReply(globalSettings, {
          companionName: shoppingTogetherState.companionName,
          screen: route.screen,
          latestTopic: params.latestTopic,
          triggerLabel: params.triggerLabel,
          userInput: params.userInput,
          recentMessages: shoppingCompanionMessages,
        });
        appendCompanionAiMessage(content);
      } catch (error) {
        console.error('[ShoppingApp] companion ai reply failed:', error);
        appendCompanionAiMessage(params.fallback);
      } finally {
        if (params.markPending) setShoppingCompanionPending(false);
      }
    },
    [appendCompanionAiMessage, globalSettings, route.screen, shoppingCompanionMessages, shoppingTogetherState]
  );

  const notifyShoppingCompanionAddToCart = React.useCallback((productName: string) => {
    if (!shoppingTogetherState?.active || !isShoppingCompanionVisibleScreen(route.screen)) return;
    const label = normalizeTextContent(productName);
    if (!label) return;
    lastShoppingInteractionRef.current = {
      key: `${route.screen}:${label}`,
      timestamp: Date.now(),
    };
    setShoppingCompanionLatestTopic(label);
    void requestShoppingCompanionAiMessage({
      triggerLabel: `${label} 已加入购物车`,
      latestTopic: label,
      fallback: `“${label}”都被你放进购物车啦，我就知道你对它是真的心动，这一单的快乐值又往上跳了一格。`,
    });
  }, [requestShoppingCompanionAiMessage, route.screen, shoppingTogetherState]);

  const handleShoppingCompanionPointerDown = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const currentTarget = event.currentTarget;
    const rect = currentTarget.getBoundingClientRect();
    shoppingCompanionDragOffsetRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    currentTarget.setPointerCapture(event.pointerId);
    setShoppingCompanionDragging(true);
  }, []);

  const handleShoppingCompanionPointerMove = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!shoppingCompanionDragging) return;
    const host = contentRef.current?.parentElement;
    const panel = event.currentTarget.parentElement as HTMLElement | null;
    const hostRect = host?.getBoundingClientRect();
    if (!hostRect) return;
    const width = panel?.offsetWidth || 248;
    const height = panel?.offsetHeight || (shoppingCompanionComposerOpen ? 232 : 142);
    const nextX = Math.max(8, Math.min(hostRect.width - width - 8, event.clientX - hostRect.left - shoppingCompanionDragOffsetRef.current.x));
    const nextY = Math.max(74, Math.min(hostRect.height - height - 74, event.clientY - hostRect.top - shoppingCompanionDragOffsetRef.current.y));
    setShoppingCompanionPosition({ x: nextX, y: nextY });
  }, [shoppingCompanionComposerOpen, shoppingCompanionDragging]);

  const handleShoppingCompanionPointerUp = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!shoppingCompanionDragging) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    setShoppingCompanionDragging(false);
  }, [shoppingCompanionDragging]);

  const handleShoppingCompanionReplySubmit = React.useCallback(() => {
    if (!shoppingTogetherState?.active) return;
    const input = shoppingCompanionInput.trim();
    if (!input) return;
    setShoppingCompanionMessages((prev) =>
      appendShoppingCompanionMessage(prev, {
        id: buildShoppingCompanionMessageId(),
        role: 'user',
        content: input,
      })
    );
    setShoppingCompanionInput('');
    setShoppingCompanionComposerOpen(false);
    void requestShoppingCompanionAiMessage({
      userInput: input,
      latestTopic: shoppingCompanionLatestTopic,
      fallback: buildShoppingCompanionReplyToUser(
        input,
        shoppingTogetherState.companionName,
        route.screen,
        shoppingCompanionLatestTopic
      ),
      markPending: true,
    });
  }, [
    requestShoppingCompanionAiMessage,
    route.screen,
    shoppingCompanionInput,
    shoppingCompanionLatestTopic,
    shoppingTogetherState,
  ]);

  const handleShoppingContentClickCapture = React.useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (!shoppingTogetherState?.active || !isShoppingCompanionVisibleScreen(route.screen)) return;
    if (showShoppingEntryIntro) return;
    const target = event.target as HTMLElement | null;
    if (!target) return;
    if (target.closest(`.${styles.shoppingCompanionFloating}`)) return;
    const label = extractShoppingInteractionLabel(target);
    if (!label) return;
    const interactionKey = `${route.screen}:${label}`;
    const now = Date.now();
    if (
      lastShoppingInteractionRef.current.key === interactionKey &&
      now - lastShoppingInteractionRef.current.timestamp < 1200
    ) {
      return;
    }
    lastShoppingInteractionRef.current = { key: interactionKey, timestamp: now };
    setShoppingCompanionLatestTopic(label);
    void requestShoppingCompanionAiMessage({
      triggerLabel: label,
      latestTopic: label,
      fallback: buildShoppingCompanionObservation(route.screen, label, shoppingTogetherState.companionName),
    });
  }, [requestShoppingCompanionAiMessage, route.screen, shoppingTogetherState, showShoppingEntryIntro]);

  const activeMovieProducts = React.useMemo(() => {
    const scopedProducts = movieProducts.filter(
      (item) => (item.storeId || getDefaultStoreIdByKind('movie')) === activeMovieStore.id
    );
    const source = scopedProducts.length ? scopedProducts : toMovieStoreProducts(activeMovieStore.id);
    return sortProductsByDecorationOrder(source, activeMovieStore.decorationConfig?.productOrder);
  }, [activeMovieStore, movieProducts]);

  const filteredMovies = React.useMemo(() => {
    const source = activeMovieProducts.map(toMovie);
    if (!movieQuery.trim()) return source;
    const query = movieQuery.trim().toLowerCase();
    return source.filter((movie) => movie.title.toLowerCase().includes(query));
  }, [activeMovieProducts, movieQuery]);

  const setDefaultAddress = (id: string) => {
    setAddresses((prev) => prev.map((addr) => ({ ...addr, isDefault: addr.id === id })));
  };

  const selectAddressForCart = (id: string) => {
    setSelectedCartAddressId(id);
    if (route.screen !== 'addresses') return;
    const returnTo = route.params?.returnTo as Screen | undefined;
    const returnTab = (route.params?.returnTab as TabKey | undefined) ?? tab;
    const returnParams =
      (route.params?.returnParams as Record<string, unknown> | undefined) ?? {};
    if (!returnTo) return;
    setTab(returnTab);
    setHistory([]);
    setRoute({ tab: returnTab, screen: returnTo, params: returnParams });
  };

  const removeAddress = (id: string) => {
    setAddresses((prev) => {
      const next = prev.filter((addr) => addr.id !== id);
      if (next.length > 0 && !next.some((addr) => addr.isDefault)) {
        next[0] = { ...next[0], isDefault: true };
      }
      return next;
    });
  };

  const addAddress = () => {
    const editingId = route.screen === 'address-add' ? (route.params?.editId as string | undefined) : undefined;
    const name = newAddrName.trim();
    const phone = newAddrPhone.trim();
    const address = newAddrAddress.trim();
    if (!name || !phone || !address) return;

    if (editingId) {
      setAddresses((prev) =>
        prev.map((addr) => (addr.id === editingId ? { ...addr, name, phone, address } : addr))
      );
    } else {
      const id = `addr-${Date.now().toString().slice(-8)}`;
      const next: Address = {
        id,
        name,
        phone,
        address,
        isDefault: addresses.length === 0,
      };
      setAddresses((prev) => {
        if (prev.length === 0) return [next];
        return [...prev, next];
      });
    }

    setNewAddrName('');
    setNewAddrPhone('');
    setNewAddrAddress('');

    const returnTo = (route.params?.returnTo as string | undefined) ?? 'addresses';
    const returnTab = (route.params?.returnTab as TabKey | undefined) ?? tab;
    const returnParams =
      (route.params?.returnParams as Record<string, unknown> | undefined) ?? {};
    setTab(returnTab);
    setHistory([]);
    setRoute({ tab: returnTab, screen: returnTo as Screen, params: returnParams });
  };

  const toggleMergedCartLineSelected = React.useCallback(
    (kind: GoodsKind, storeId: string, productId: string, selected: boolean) => {
      const key = buildCartLineKey(kind, storeId, productId);
      setSelectedCartLineKeys((prev) => {
        if (prev[key] === selected) return prev;
        return { ...prev, [key]: selected };
      });
    },
    []
  );

  const isMergedCartLineSelected = React.useCallback(
    (kind: GoodsKind, storeId: string, productId: string) => {
      const key = buildCartLineKey(kind, storeId, productId);
      return selectedCartLineKeys[key] !== false;
    },
    [selectedCartLineKeys]
  );

  const renderContent = () => {
    switch (route.screen) {
      case 'home':
        return (
          <ShoppingHome
            ordersCount={orders.length}
            cartCount={mergedCartTotalCount}
            favoritesCount={favorites.length}
            addressesCount={addresses.length}
            stores={stores}
            topTabs={homeTopTabs}
            activeTopTab={homeTopTab}
            onSwitchTopTab={setHomeTopTab}
            onGoOrders={() => switchTab('orders')}
            onGoCart={() => switchTab('cart')}
            onGoStore={(store) => {
              if (store.kind === 'dessert') go('dessert', { storeId: store.id });
              else if (store.kind === 'flower') go('flowers', { storeId: store.id });
              else go('movies', { storeId: store.id });
            }}
          />
        );
      case 'cart':
        return (
          <ShoppingCart
            groups={mergedCartGroups}
            totalCount={mergedSelectedCartTotalCount}
            totalAmount={mergedSelectedCartTotalAmount}
            shippingMode={shippingMode}
            scheduleDate={scheduleDate}
            scheduleTime={scheduleTime}
            defaultAddress={selectedCartAddress}
            addressTab={cartAddressTab}
            giftContacts={giftContacts}
            selectedGiftContactId={selectedGiftContactId}
            onSwitchAddress={() =>
              go('addresses', {
                returnTo: 'cart',
                returnTab: 'cart',
                returnParams: {},
                selectMode: 'cart',
              })
            }
            onManageAddress={() => go('addresses')}
            onAddressTabChange={setCartAddressTab}
            onGiftContactSelect={setSelectedGiftContactId}
            onShippingModeChange={(mode) => setShippingMode(mode)}
            onScheduleDateChange={(value) => setScheduleDate(value)}
            onScheduleTimeChange={(value) => setScheduleTime(value)}
            onCheckoutAll={openMergedPaymentSheet}
            onGoHome={() => switchTab('home')}
            isLineSelected={isMergedCartLineSelected}
            onToggleLineSelected={toggleMergedCartLineSelected}
            onAddOne={(kind, storeId, productId) => {
              if (kind === 'dessert') addOneDessertCartItem(storeId, productId);
              else addOneFlowerCartItem(storeId, productId);
            }}
            onRemoveOne={(kind, storeId, productId) => {
              if (kind === 'dessert') removeOneDessertCartItem(storeId, productId);
              else removeOneFlowerCartItem(storeId, productId);
            }}
            onClearStore={(kind, storeId) => {
              if (kind === 'dessert') clearDessertCartByStore(storeId);
              else clearFlowerCartByStore(storeId);
            }}
          />
        );
      case 'dessert': {
        const store = pickStore(stores, 'dessert', routeStoreId);
        const products = sortProductsByDecorationOrder(
          filterProductsByStore(dessertProducts, 'dessert', store.id),
          store.decorationConfig?.productOrder
        );
        return (
          <ShoppingProductList
            kind="dessert"
            storeName={store.name}
            storeTypeName={store.typeName}
            storeDescription={store.description}
            storeSignboard={store.signboard}
            storeDecoration={store.decoration}
            storeLogo={store.logo}
            storeCover={store.cover}
            storeTheme={store.theme}
            tabLabels={store.decorationConfig?.tabLabels}
            filterLabels={store.decorationConfig?.filterLabels}
            heroRatingLabels={store.decorationConfig?.heroRatingLabels}
            heroTagLabels={store.decorationConfig?.heroTagLabels}
            products={products}
            cart={globalGoodsCart}
            cartTotal={globalGoodsCartTotal}
            isFavorited={(id) => isFavorited('dessert', id, store.id)}
            onToggleFavorite={(product) => toggleFavorite('dessert', product, store.id)}
            onAddToCart={handleDessertAddToCart}
            onClearCart={() => clearDessertCartByStore(store.id)}
            onOpenCart={() => switchTab('cart')}
            onCheckout={() => {
              resetShippingSchedule();
              go('goods-checkout', { kind: 'dessert', storeId: store.id });
            }}
          />
        );
      }
      case 'flowers': {
        const store = pickStore(stores, 'flower', routeStoreId);
        const products = sortProductsByDecorationOrder(
          filterProductsByStore(flowerProducts, 'flower', store.id),
          store.decorationConfig?.productOrder
        );
        return (
          <ShoppingProductList
            kind="flower"
            storeName={store.name}
            storeTypeName={store.typeName}
            storeDescription={store.description}
            storeSignboard={store.signboard}
            storeDecoration={store.decoration}
            storeLogo={store.logo}
            storeCover={store.cover}
            storeTheme={store.theme}
            tabLabels={store.decorationConfig?.tabLabels}
            filterLabels={store.decorationConfig?.filterLabels}
            heroRatingLabels={store.decorationConfig?.heroRatingLabels}
            heroTagLabels={store.decorationConfig?.heroTagLabels}
            products={products}
            cart={globalGoodsCart}
            cartTotal={globalGoodsCartTotal}
            isFavorited={(id) => isFavorited('flower', id, store.id)}
            onToggleFavorite={(product) => toggleFavorite('flower', product, store.id)}
            onAddToCart={addFlowerToCart}
            onClearCart={() => clearFlowerCartByStore(store.id)}
            onOpenCart={() => switchTab('cart')}
            onCheckout={() => {
              resetShippingSchedule();
              go('goods-checkout', { kind: 'flower', storeId: store.id });
            }}
          />
        );
      }
      case 'goods-checkout': {
        const kind = (route.params?.kind as GoodsKind | undefined) ?? 'dessert';
        const storeId = (route.params?.storeId as string | undefined) ?? getDefaultStoreIdByKind(kind);
        const store = pickStore(stores, kind, storeId);
        const cart =
          kind === 'dessert'
            ? filterProductsByStore(dessertCart, 'dessert', store.id)
            : filterProductsByStore(flowerCart, 'flower', store.id);
        return (
          <ShoppingGoodsCheckout
            kind={kind}
            storeName={store.name}
            storeTypeName={store.typeName}
            storeSignboard={store.signboard}
            storeDecoration={store.decoration}
            cart={cart}
            shippingMode={shippingMode}
            scheduleDate={scheduleDate}
            scheduleTime={scheduleTime}
            defaultAddress={defaultAddress}
            payeeContacts={payeeContacts}
            selectedPayeeContactId={selectedPayeeContactId}
            onPayeeContactChange={(value) => setSelectedPayeeContactId(value)}
            onShippingModeChange={(mode) => setShippingMode(mode)}
            onScheduleDateChange={(value) => setScheduleDate(value)}
            onScheduleTimeChange={(value) => setScheduleTime(value)}
            onManageAddress={() => go('addresses')}
            onPlaceOrder={() => placeGoodsOrder(kind, store)}
            onBackToList={() => go(kind === 'dessert' ? 'dessert' : 'flowers', { storeId: store.id })}
          />
        );
      }
      case 'movies': {
        const store = pickStore(stores, 'movie', routeStoreId);
        return (
          <ShoppingMovies
            query={movieQuery}
            movies={filteredMovies}
            scrollRef={contentRef}
            onQueryChange={(value) => setMovieQuery(value)}
            storeSignboard={store.signboard}
            storeTypeName={store.typeName}
            storeDescription={store.description}
            storeLogo={store.logo}
            storeCover={store.cover}
            storeTheme={store.theme}
            movieTextLabels={store.decorationConfig?.movieTextLabels}
            onSelectMovie={(movie) => {
              setSelectedMovie(movie);
              setMovieDate(resolveMovieDateDefault(store));
              setMovieQty(resolveMovieQtyDefault(store));
              setMovieCinema(resolveMovieCinemaDefault(store));
              setMovieSession(activeMovieSessionOptions[0] || DEFAULT_STORE_MOVIE_SESSION_OPTIONS[0]);
              go('movie-checkout', { movieId: movie.id, storeId: store.id });
            }}
          />
        );
      }
      case 'movie-checkout': {
        const storeId =
          (route.params?.storeId as string | undefined) ?? getDefaultStoreIdByKind('movie');
        const store = pickStore(stores, 'movie', storeId);
        return (
          <ShoppingMovieCheckout
            movie={selectedMovie}
            movieCinema={movieCinema}
            movieDate={movieDate}
            movieSession={movieSession}
            movieQty={movieQty}
            movieCheckoutLabels={store.decorationConfig?.movieCheckoutLabels}
            movieSessionOptions={store.decorationConfig?.movieSessionOptions}
            onCinemaChange={(value) => setMovieCinema(value)}
            onDateChange={(value) => setMovieDate(value)}
            onSessionChange={(value) => setMovieSession(value)}
            onQtyChange={(value) => setMovieQty(value)}
            onPlaceOrder={() => openMoviePaymentSheet(store)}
            onBackToMovies={() => go('movies', { storeId: store.id })}
          />
        );
      }
      case 'orders':
        return (
          <ShoppingOrders
            orders={orders}
            scrollRef={contentRef}
            onOpenOrder={openOrderDetail}
            onDeleteOrder={(orderId) => setOrders((prev) => prev.filter((item) => item.id !== orderId))}
            onGoHome={() => switchTab('home')}
          />
        );
      case 'order-detail': {
        const orderId = route.params?.orderId as string | undefined;
        const order = orders.find((item) => item.id === orderId);
        return (
          <ShoppingOrderDetail
            order={order}
            onBackOrders={() => switchTab('orders')}
            onViewLogistics={(id) => go('logistics', { orderId: id })}
            onOpenPaymentOptions={openOrderDetailPaymentSheet}
            onShareMovieTicket={openMovieShareSheet}
          />
        );
      }
      case 'logistics': {
        const orderId = route.params?.orderId as string | undefined;
        const order = orders.find((item) => item.id === orderId);
        return <ShoppingLogistics order={order} onBackOrders={() => switchTab('orders')} />;
      }
      case 'me':
        return (
          <ShoppingMe
            ordersCount={orders.length}
            favoritesCount={favorites.length}
            addressesCount={addresses.length}
            onGoOrders={() => switchTab('orders')}
            onGoFavorites={() => go('favorites')}
            onGoAddresses={() => go('addresses')}
            onGoSettings={() => go('settings')}
          />
        );
      case 'favorites':
        return (
          <ShoppingFavorites
            favorites={favorites}
            scrollRef={contentRef}
            onRemove={(favorite) =>
              setFavorites((prev) =>
                prev.filter(
                  (item) =>
                    !(
                      item.kind === favorite.kind &&
                      item.id === favorite.id &&
                      (item.storeId || getDefaultStoreIdByKind(item.kind)) ===
                        (favorite.storeId || getDefaultStoreIdByKind(favorite.kind))
                    )
                )
              )
            }
            onGoHome={() => switchTab('home')}
          />
        );
      case 'addresses':
        {
          const isCartAddressSelectMode = route.params?.selectMode === 'cart';
          const nextAddressAddParams = isCartAddressSelectMode
            ? {
                returnTo: 'addresses',
                returnTab: 'cart',
                returnParams: route.params ?? {},
              }
            : undefined;
          const openAddressEditor = (id: string) => {
            go('address-add', {
              editId: id,
              returnTo: 'addresses',
              returnTab: isCartAddressSelectMode ? 'cart' : tab,
              returnParams: isCartAddressSelectMode ? route.params ?? {} : {},
            });
          };
        return (
          <ShoppingAddresses
            addresses={addresses}
            scrollRef={contentRef}
            actionMode={isCartAddressSelectMode ? 'select' : 'default'}
            selectedAddressId={selectedCartAddress?.id}
            actionHint={
              isCartAddressSelectMode ? '选中后用于本次购物车结算' : '下单会优先使用默认地址'
            }
            showDelete={!isCartAddressSelectMode}
            onPrimaryAction={(id) => {
              if (isCartAddressSelectMode) selectAddressForCart(id);
              else setDefaultAddress(id);
            }}
            onEdit={openAddressEditor}
            onRemove={removeAddress}
            onAdd={() => {
              if (nextAddressAddParams) go('address-add', nextAddressAddParams);
              else go('address-add');
            }}
          />
        );
        }
      case 'address-add':
        return (
          <ShoppingAddressAdd
            name={newAddrName}
            phone={newAddrPhone}
            address={newAddrAddress}
            saveLabel={editingAddressId ? '保存修改' : '保存'}
            onNameChange={(value) => setNewAddrName(value)}
            onPhoneChange={(value) => setNewAddrPhone(value)}
            onAddressChange={(value) => setNewAddrAddress(value)}
            onSave={addAddress}
            canSave={Boolean(newAddrName.trim() && newAddrPhone.trim() && newAddrAddress.trim())}
          />
        );
      case 'settings':
        return (
          <ShoppingSettings
            notify={settingNotify}
            faceId={settingFaceId}
            onToggleNotify={() => setSettingNotify(!settingNotify)}
            onToggleFaceId={() => setSettingFaceId(!settingFaceId)}
          />
        );
      default:
        return null;
    }
  };

  return (
      <motion.div
        className={styles.appRoot}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
    >
      <ShoppingHeader title={headerTitle} isRoot={isRoot} onBack={goBack} />

      <main
        ref={contentRef}
        className={`${styles.content} ${hasDock ? styles.contentDocked : ''}`}
        onClickCapture={handleShoppingContentClickCapture}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={`${route.tab}-${route.screen}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {paymentSheetTarget ? (
        <div
          className={styles.paymentSheetOverlay}
          onClick={closePaymentSheet}
          role="presentation"
        >
          <div className={styles.paymentSheetPanel} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            {(paymentSheetTarget === 'merged-cart' || paymentSheetTarget === 'order-detail' || paymentSheetTarget === 'movie-share') &&
            mergedPaymentSheetStage === 'payee' ? (
              <div className={styles.paymentSheetStage}>
                <div className={styles.paymentSheetHeader}>
                  <strong className={styles.paymentSheetTitle}>
                    {paymentSheetTarget === 'movie-share' ? '选择微信联系人' : '选择代付联系人'}
                  </strong>
                  <span className={styles.paymentSheetSubtitle}>
                    {paymentSheetTarget === 'movie-share' ? '从微信聊天列表里选择一个聊天框分享票据信息' : '从微信联系人里选择一个头像和人名'}
                  </span>
                </div>
                {(paymentSheetTarget === 'movie-share' ? movieShareContacts : payeeContacts).length > 0 ? (
                  <div className={styles.paymentSheetContactList}>
                    {(paymentSheetTarget === 'movie-share' ? movieShareContacts : payeeContacts).map((contact) => (
                      <button
                        key={contact.id}
                        type="button"
                        className={styles.paymentSheetContactItem}
                        onClick={() => {
                          setSelectedPayeeContactId(contact.id);
                          const succeeded =
                            paymentSheetTarget === 'merged-cart'
                              ? placeMergedGoodsOrders('delegate', contact)
                              : paymentSheetTarget === 'movie-share'
                                ? pendingMovieShareOrderId
                                  ? shareMovieTicketOrder(pendingMovieShareOrderId, contact)
                                  : false
                              : pendingOrderPaymentId
                                ? placeOrderDetailPayment(pendingOrderPaymentId, 'delegate', contact)
                                : false;
                          if (succeeded !== false) closePaymentSheet();
                        }}
                      >
                        <span className={styles.paymentSheetContactAvatar}>
                          {contact.avatar ? (
                            <img
                              src={contact.avatar}
                              alt={contact.name}
                              className={styles.paymentSheetContactAvatarImage}
                            />
                          ) : (
                            <span>{getContactInitials(contact.name)}</span>
                          )}
                        </span>
                        <span className={styles.paymentSheetContactName}>{contact.name}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className={styles.paymentSheetEmpty}>
                    {paymentSheetTarget === 'movie-share'
                      ? '微信聊天列表里还没有可分享的人。'
                      : '微信联系人里还没有可用于代付的人。'}
                  </div>
                )}
                <div className={styles.paymentSheetFooter}>
                  {paymentSheetTarget !== 'movie-share' ? (
                    <button
                      type="button"
                      className={styles.paymentSheetSecondaryAction}
                      onClick={() => setMergedPaymentSheetStage('method')}
                    >
                      返回支付方式
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={styles.paymentSheetSecondaryAction}
                      onClick={closePaymentSheet}
                    >
                      关闭
                    </button>
                  )}
                  <button type="button" className={styles.paymentSheetCancel} onClick={closePaymentSheet}>
                    取消
                  </button>
                </div>
              </div>
            ) : paymentSheetTarget === 'merged-cart' ? (
              <>
                <button
                  type="button"
                  className={styles.paymentSheetOption}
                  onClick={() => {
                    const succeeded = placeMergedGoodsOrders('wechat');
                    if (succeeded !== false) closePaymentSheet();
                  }}
                >
                  微信支付
                </button>
                <button
                  type="button"
                  className={styles.paymentSheetOption}
                  onClick={() => {
                    if (payeeContacts.length === 0) {
                      window.alert('微信联系人里还没有可用于代付的人');
                      return;
                    }
                    setMergedPaymentSheetStage('payee');
                  }}
                >
                  由他代付
                </button>
                <button type="button" className={styles.paymentSheetCancel} onClick={closePaymentSheet}>
                  取消
                </button>
              </>
            ) : paymentSheetTarget === 'order-detail' ? (
              <>
                <button
                  type="button"
                  className={styles.paymentSheetOption}
                  onClick={() => {
                    if (!pendingOrderPaymentId) return;
                    const succeeded = placeOrderDetailPayment(pendingOrderPaymentId, 'wechat');
                    if (succeeded !== false) closePaymentSheet();
                  }}
                >
                  微信支付
                </button>
                <button
                  type="button"
                  className={styles.paymentSheetOption}
                  onClick={() => {
                    if (payeeContacts.length === 0) {
                      window.alert('微信联系人里还没有可用于代付的人');
                      return;
                    }
                    setMergedPaymentSheetStage('payee');
                  }}
                >
                  由他代付
                </button>
                <button type="button" className={styles.paymentSheetCancel} onClick={closePaymentSheet}>
                  取消
                </button>
              </>
            ) : paymentSheetTarget === 'movie-share' ? (
              <>
                <button
                  type="button"
                  className={styles.paymentSheetOption}
                  onClick={() => {
                    if (movieShareContacts.length === 0) {
                      window.alert('微信聊天列表里还没有可分享的人');
                      return;
                    }
                    setMergedPaymentSheetStage('payee');
                  }}
                >
                  选择微信联系人
                </button>
                <button type="button" className={styles.paymentSheetCancel} onClick={closePaymentSheet}>
                  取消
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className={styles.paymentSheetOption}
                  onClick={() => {
                    const movieStoreId = pendingMovieStoreId;
                    closePaymentSheet();
                    if (movieStoreId) {
                      const movieStore = pickStore(stores, 'movie', movieStoreId);
                      placeMovieOrder(movieStore, 'wechat');
                    }
                  }}
                >
                  微信支付
                </button>
                <button type="button" className={styles.paymentSheetCancel} onClick={closePaymentSheet}>
                  取消
                </button>
              </>
            )}
          </div>
        </div>
        ) : null}

        {isShoppingCompanionVisible ? (
          <div
            className={styles.shoppingCompanionFloating}
            style={{ transform: `translate(${shoppingCompanionPosition.x}px, ${shoppingCompanionPosition.y}px)` }}
          >
            <div
              className={`${styles.shoppingCompanionHandle} ${shoppingCompanionDragging ? styles.shoppingCompanionHandleDragging : ''}`}
              onPointerDown={handleShoppingCompanionPointerDown}
              onPointerMove={handleShoppingCompanionPointerMove}
              onPointerUp={handleShoppingCompanionPointerUp}
              onPointerCancel={handleShoppingCompanionPointerUp}
            >
              <div className={styles.shoppingCompanionHeaderMain}>
                <span className={styles.shoppingCompanionAvatar}>
                  {shoppingTogetherState.companionAvatar ? (
                    <img
                      src={shoppingTogetherState.companionAvatar}
                      alt={shoppingTogetherState.companionName}
                      className={styles.shoppingCompanionAvatarImage}
                    />
                  ) : (
                    <span>{getContactInitials(shoppingTogetherState.companionName)}</span>
                  )}
                </span>
                <div className={styles.shoppingCompanionHeaderText}>
                  <strong>{shoppingTogetherState.companionName}</strong>
                  <span>一起购物中</span>
                </div>
              </div>
              <span className={styles.shoppingCompanionGrip}>⋯</span>
            </div>

            <div className={styles.shoppingCompanionBody}>
              {shoppingCompanionMessages.slice(-1).map((message) => (
                <div
                  key={message.id}
                  className={
                    message.role === 'ai'
                      ? styles.shoppingCompanionAiBubble
                      : styles.shoppingCompanionUserBubble
                  }
                >
                  {message.content}
                </div>
              ))}
            </div>

            <div className={styles.shoppingCompanionActions}>
              <button
                type="button"
                className={styles.shoppingCompanionReplyBtn}
                disabled={shoppingCompanionPending}
                onClick={() => setShoppingCompanionComposerOpen((prev) => !prev)}
              >
                {shoppingCompanionPending ? '回复中...' : '回复'}
              </button>
            </div>

            {shoppingCompanionComposerOpen ? (
              <div className={styles.shoppingCompanionComposer}>
                <textarea
                  value={shoppingCompanionInput}
                  onChange={(event) => setShoppingCompanionInput(event.target.value)}
                  placeholder="回 TA 一句..."
                  rows={2}
                />
                <button type="button" onClick={handleShoppingCompanionReplySubmit}>
                  {shoppingCompanionPending ? '思考中...' : '发送'}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {showShoppingEntryIntro ? (
          <motion.div
            className={styles.shoppingEntryIntro}
            initial={false}
            animate={
              shoppingEntryIntroLeaving
                ? { y: '-100%', opacity: 0.98 }
                : { y: 0, opacity: 1 }
            }
            transition={{
              duration: shoppingEntryIntroLeaving ? 0.46 : 0.34,
              ease: shoppingEntryIntroLeaving ? [0.22, 1, 0.36, 1] : [0.16, 1, 0.3, 1],
            }}
          >
            <div className={styles.shoppingEntryGlowA} />
            <div className={styles.shoppingEntryGlowB} />
            <div className={styles.shoppingEntryHero}>
              <div className={styles.shoppingEntryBadge}>
                <svg className={styles.shoppingEntryBadgeIcon} viewBox="0 0 48 48" aria-hidden="true">
                  <path d="M21 8l3.2 9.8L34 21l-9.8 3.2L21 34l-3.2-9.8L8 21l9.8-3.2L21 8Z" />
                  <path d="M35 9l1.4 4.2L41 15l-4.6 1.8L35 21l-1.4-4.2L29 15l4.6-1.8L35 9Z" />
                </svg>
                一起出发去购物
              </div>
              <div className={styles.shoppingEntryCopy}>
              </div>

              <div className={styles.shoppingEntryScene} aria-hidden="true">
                <div className={styles.shoppingEntryTwinkles}>
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
                <div className={styles.shoppingEntryArtworkCard}>
                  <span className={styles.shoppingEntryArtworkBadge}>
                    <svg className={styles.shoppingEntrySparkleIcon} viewBox="0 0 48 48" aria-hidden="true">
                      <path d="M21 8l3.2 9.8L34 21l-9.8 3.2L21 34l-3.2-9.8L8 21l9.8-3.2L21 8Z" />
                      <path d="M35 9l1.4 4.2L41 15l-4.6 1.8L35 21l-1.4-4.2L29 15l4.6-1.8L35 9Z" />
                    </svg>
                  </span>
                  <svg className={styles.shoppingEntryBagSvg} viewBox="0 0 96 96" aria-hidden="true">
                    <path d="M30 28H66L76 40V78C76 82.4 72.4 86 68 86H28C23.6 86 20 82.4 20 78V40L30 28Z" />
                    <path d="M30 28L20 40H76L66 28" />
                    <path d="M36 50V52C36 60 41.4 66 48 66C54.6 66 60 60 60 52V50" />
                  </svg>
                </div>
              </div>

              <div className={styles.shoppingEntryChoiceArea}>
                {shoppingEntryStage === 'mode' && (
                  <div className={styles.shoppingEntryActions}>
                    <button
                      type="button"
                      className={styles.shoppingEntryPrimaryBtn}
                      onClick={() => handleShoppingEntryChoice('solo')}
                    >
                      疯狂购物
                    </button>
                    <button
                      type="button"
                      className={styles.shoppingEntrySecondaryBtn}
                      onClick={() => handleShoppingEntryChoice('together')}
                    >
                      同TA购物
                    </button>
                  </div>
                )}

                {shoppingEntryStage === 'contact' && (
                  <div className={styles.shoppingEntryContactPanel}>
                    <div className={styles.shoppingEntrySheetHeader}>
                      <button
                        type="button"
                        className={styles.shoppingEntryBackIconBtn}
                        aria-label="返回"
                        onClick={() => {
                          setShoppingEntryMode('solo');
                          setShoppingEntryStage('mode');
                        }}
                      >
                        <span className={styles.shoppingEntryBackArrow} aria-hidden="true" />
                      </button>
                      <p className={`${styles.shoppingEntrySheetTitle} ${styles.shoppingEntrySheetTitleContact}`}>
                        同TA一起逛，甜度直接拉满。
                      </p>
                      <span className={styles.shoppingEntrySheetHeaderSpacer} aria-hidden="true" />
                    </div>
                    {payeeContacts.length > 0 ? (
                      <div className={styles.shoppingEntryContactList}>
                        {payeeContacts.map((contact) => (
                          <button
                            key={contact.id}
                            type="button"
                            className={styles.shoppingEntryContactItem}
                            onClick={() => {
                              const succeeded = sendShoppingTogetherInvite(contact);
                              if (!succeeded) window.alert('购物邀请发送失败，请稍后再试');
                            }}
                          >
                            <span className={styles.shoppingEntryContactAvatar}>
                              {contact.avatar ? (
                                <img
                                  src={contact.avatar}
                                  alt={contact.name}
                                  className={styles.shoppingEntryContactAvatarImage}
                                />
                              ) : (
                                <span>{getContactInitials(contact.name)}</span>
                              )}
                            </span>
                            <span className={styles.shoppingEntryContactName}>{contact.name}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className={styles.paymentSheetEmpty}>微信联系人里还没有可邀请的人。</div>
                    )}
                  </div>
                )}
              </div>

              <div className={styles.shoppingEntryFeatureGrid}>
                <div className={styles.shoppingEntryFeatureCard}>
                  <span className={styles.shoppingEntryFeatureIcon}><Tags size={24} /></span>
                  <strong>优惠多多</strong>
                  <p>每日上新优惠券</p>
                </div>
                <div className={styles.shoppingEntryFeatureCard}>
                  <span className={styles.shoppingEntryFeatureIcon}><TrendingUp size={24} /></span>
                  <strong>品质保证</strong>
                  <p>精选优质商品</p>
                </div>
                <div className={styles.shoppingEntryFeatureCard}>
                  <span className={styles.shoppingEntryFeatureIcon}><Gift size={24} /></span>
                  <strong>新人礼包</strong>
                  <p>注册即送好礼</p>
                </div>
              </div>
            </div>

            {shoppingEntryStage === 'mode' ? (
              <div
                className={styles.shoppingEntrySwipeZone}
                onPointerDown={handleShoppingEntrySwipeStart}
                onPointerUp={handleShoppingEntrySwipeEnd}
                onPointerCancel={handleShoppingEntrySwipeEnd}
              >
                <button
                  type="button"
                  className={styles.shoppingEntrySwipeHint}
                  aria-label="退出App"
                  onClick={exitShoppingAppFromIntro}
                >
                  <span className={styles.shoppingEntrySwipeArrow} aria-hidden="true" />
                </button>
              </div>
            ) : null}
          </motion.div>
        ) : null}

        <ShoppingTabBar tab={tab} onSwitch={switchTab} />
      </motion.div>
    );
  };

export type { ShoppingAppProps };
