import React from 'react';
import {
  ArrowLeft,
  Bike,
  ChevronRight,
  Clock3,
  Download,
  House,
  MoreHorizontal,
  Package2,
  Pencil,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  Store,
  Bot,
  Upload,
  UserRound,
  X,
  UtensilsCrossed,
  Circle,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { useGlobalSettingsStore } from '@baobaobaiOS/sdk';
import { PUSH_OPEN_APP_MESSAGE_TYPE } from '../../../core/push/webPush';
import type { AppProps } from '../../../core/sdk/types';
import { DELIVERY_ORDERS_CHANGED_EVENT, updatePersistedDeliveryOrders } from './paymentBridge';
import {
  DELIVERY_CATEGORIES,
  DELIVERY_MERCHANT,
  DELIVERY_PRODUCTS,
  DELIVERY_STORAGE_KEY,
  PRIVATE_KITCHEN_RECIPES,
  DELIVERY_STORES,
  type PrivateKitchenRecipe,
} from './data';
import styles from './DeliveryApp.module.css';
import { useContactsSnapshot } from '../contacts/selectors';
import type { Contact } from '../contacts/types';
import { useWeChatStore } from '../WeChat/store';
import type { WeChatMessage } from '../WeChat/types';
import type {
  DeliveryAppPage,
  DeliveryCartEntry,
  DeliveryDeliveryView,
  DeliveryMenuProduct,
  DeliveryOrderItem,
  DeliveryOrderRecord,
  DeliveryStore,
  DeliveryStoreSection,
  DeliveryTrackingRecord,
} from './types';

type ToastItem = {
  id: string;
  title: string;
  text: string;
};

type StoreDraft = {
  name: string;
  icon: string;
  categoryId: string;
  subtitle: string;
  notice: string;
  deliveryFee: string;
  minOrderAmount: string;
  avgDeliveryMinutes: string;
  sections: string;
  productName: string;
  productPrice: string;
  productSection: string;
  productDescription: string;
  productTag: string;
};

type ProductDraft = {
  storeId: string;
  name: string;
  price: string;
  section: string;
  description: string;
  tag: string;
};

type RecipeIngredientDraft = {
  productId: string;
  name: string;
  amount: string;
  qty: string;
  price: string;
};

type RecipeDraft = {
  id: string;
  name: string;
  subtitle: string;
  accent: string;
  time: string;
  servings: string;
  shareText: string;
  steps: string;
  ingredients: RecipeIngredientDraft[];
};

type GeneratedKitchenRecipePayload = {
  name: string;
  subtitle: string;
  accent?: string;
  time?: string;
  servings?: string;
  shareText?: string;
  steps?: unknown;
  ingredients?: unknown;
};

type PersistedState = {
  favorites: string[];
  orders: DeliveryOrderRecord[];
  stores: DeliveryStore[];
  products: DeliveryMenuProduct[];
  kitchenRecipes: PrivateKitchenRecipe[];
  cart: DeliveryCartEntry[];
  profile: DeliveryProfileRecord;
  address: DeliveryAddressRecord;
};

type DeliveryCheckoutSnapshot = {
  title: string;
  merchantName: string;
  amount: number;
  items: Array<{ product: DeliveryMenuProduct; qty: number }>;
  orderPreview: {
    storeNames: string[];
    items: Array<{ name: string; qty: number }>;
    totalItemCount: number;
  };
};

type DeliveryProfileRecord = {
  avatar: string;
  username: string;
};

type DeliveryAddressRecord = {
  title: string;
  recipient: string;
  phone: string;
};

const formatMoney = (value: number): string => `￥${value.toFixed(2)}`;

const formatDistance = (value: number | undefined): string => `${(Number.isFinite(value) ? value : 0).toFixed(1)}km`;

const getOrderStatusLabel = (order: DeliveryOrderRecord, snapshot?: DeliveryTrackingRecord | null): string => {
  if (order.type === '发起代付') {
    if (order.paymentStatus === 'rejected' || order.status === '已取消') return '代付失败';
    if (order.paymentStatus === 'pending' || order.status === '待支付') return '待代付';
  }
  const stage = snapshot?.stage ?? order.delivery?.stage;
  if (stage === '送达' || order.status === '已送达') return '已送达';
  if (stage === '配送' || order.status === '配送中') return '配送中';
  if (stage === '出餐' || stage === '接单') return '取餐中';
  return '取餐中';
};

const formatClock = (value: number): string =>
  new Date(value).toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });

const formatOrderCode = (value: number): string => {
  const digits = Math.abs(Math.trunc(value)).toString();
  return `ORD${digits}`;
};

const normalizeOrderItems = (
  items: Array<{ product: DeliveryMenuProduct; qty: number }>,
): DeliveryOrderItem[] =>
  items
    .filter((item) => item.qty > 0)
    .map((item) => ({
      productId: item.product.id,
      qty: Math.max(1, Math.floor(item.qty)),
      name: item.product.name,
      price: item.product.price,
      description: item.product.description,
      tag: item.product.tag,
      storeId: item.product.storeId,
      categoryId: item.product.categoryId,
      sectionId: item.product.sectionId,
    }));

const mergeCartEntries = (current: DeliveryCartEntry[], additions: DeliveryCartEntry[]): DeliveryCartEntry[] => {
  let nextCart = [...current];
  additions.forEach((entry) => {
    const qty = Math.max(1, Math.floor(entry.qty));
    const existing = nextCart.find((item) => item.productId === entry.productId);
    if (existing) {
      nextCart = nextCart.map((item) => (
        item.productId === entry.productId
          ? { ...item, ...entry, qty: item.qty + qty }
          : item
      ));
      return;
    }
    nextCart = [{ ...entry, qty }, ...nextCart];
  });
  return nextCart;
};

const makeId = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const splitLines = (value: string): string[] =>
  value
    .split(/[，,、\n]/)
    .map((item) => item.trim())
    .filter(Boolean);

const buildInitialStoreDraft = (): StoreDraft => ({
  name: '',
  icon: '🍽️',
  categoryId: 'food',
  subtitle: '',
  notice: '',
  deliveryFee: '3',
  minOrderAmount: '20',
  avgDeliveryMinutes: '30',
  sections: '招牌,推荐',
  productName: '',
  productPrice: '',
  productSection: '',
  productDescription: '',
  productTag: '新品',
});

const DEFAULT_DELIVERY_ADDRESS: DeliveryAddressRecord = {
  title: '杭州余杭区·默认地址',
  recipient: '用户',
  phone: '138****0000',
};

const DEFAULT_PROFILE: DeliveryProfileRecord = {
  avatar: '😊',
  username: '用户',
};

const isLegacySeedOrder = (order: unknown): boolean => {
  if (!order || typeof order !== 'object') return false;
  const record = order as Partial<DeliveryOrderRecord>;
  return record.id === 'o1' || record.id === 'o2';
};

const isLegacySeedCart = (cart: unknown): boolean => {
  if (!Array.isArray(cart) || cart.length !== 3) return false;
  return cart.every((item) => {
    if (!item || typeof item !== 'object') return false;
    const entry = item as Partial<DeliveryCartEntry>;
    if (entry.productId === 'p1') return entry.qty === 1;
    if (entry.productId === 'p2') return entry.qty === 2;
    if (entry.productId === 'p8') return entry.qty === 1;
    return false;
  });
};

const normalizePersistedOrders = (orders: unknown): DeliveryOrderRecord[] => {
  if (!Array.isArray(orders)) return [];
  const normalized = orders.filter((item): item is DeliveryOrderRecord => {
    return Boolean(
      item &&
        typeof item === 'object' &&
        typeof (item as DeliveryOrderRecord).id === 'string' &&
        typeof (item as DeliveryOrderRecord).title === 'string' &&
        typeof (item as DeliveryOrderRecord).merchantName === 'string'
    );
  });
  return normalized.length > 0 && normalized.every(isLegacySeedOrder) ? [] : normalized;
};

const normalizePersistedCart = (cart: unknown): DeliveryCartEntry[] => {
  if (!Array.isArray(cart)) return [];
  if (isLegacySeedCart(cart)) return [];
  return cart.filter(isCartEntry).map((entry) => ({ ...entry, qty: Math.floor(entry.qty) }));
};

const isCartEntry = (value: unknown): value is DeliveryCartEntry => {
  if (!value || typeof value !== 'object') return false;
  const entry = value as DeliveryCartEntry;
  return typeof entry.productId === 'string' && Number.isFinite(entry.qty) && entry.qty > 0;
};

const normalizeAddress = (value: unknown): DeliveryAddressRecord => {
  if (!value || typeof value !== 'object') return DEFAULT_DELIVERY_ADDRESS;
  const record = value as Partial<DeliveryAddressRecord> & { detail?: unknown };
  const legacyDetail = typeof record.detail === 'string' ? record.detail.trim() : '';
  const [legacyRecipient, legacyPhone] = legacyDetail
    ? legacyDetail
        .replace(/^收货人[:：]\s*/u, '')
        .split(/[\s，,、]+/u)
        .filter(Boolean)
    : ['', ''];

  return {
    title: typeof record.title === 'string' ? record.title : DEFAULT_DELIVERY_ADDRESS.title,
    recipient: typeof record.recipient === 'string' && record.recipient.trim()
      ? record.recipient.trim()
      : (legacyRecipient || DEFAULT_DELIVERY_ADDRESS.recipient),
    phone: typeof record.phone === 'string' && record.phone.trim()
      ? record.phone.trim()
      : (legacyPhone || DEFAULT_DELIVERY_ADDRESS.phone),
  };
};

const createDeliveryTracking = (
  createdAt: number,
  destination: DeliveryAddressRecord,
  now = Date.now(),
): DeliveryTrackingRecord => {
  const elapsedMinutes = Math.max(0, (now - createdAt) / 60000);
  const progress = Math.min(100, Math.round(14 + elapsedMinutes * 4.8));
  const stage = progress < 25 ? '接单' : progress < 55 ? '出餐' : progress < 90 ? '配送' : '送达';
  const driverDistanceKm = Math.max(0.1, Number((2.3 - elapsedMinutes * 0.12).toFixed(1)));
  const etaMinutes = Math.max(0, Math.round(18 - elapsedMinutes * 1.2));

  return {
    stage,
    progress,
    driverName: '骑手阿泽',
    driverDistanceKm,
    etaMinutes,
    destination: destination.title,
    updatedAt: now,
  };
};

const seedStoreMap = new Map(DELIVERY_STORES.map((store) => [store.id, store] as const));

const normalizeStore = (store: Partial<DeliveryStore> & { id: string }): DeliveryStore => {
  const fallback = seedStoreMap.get(store.id);
  const sections = Array.isArray(store.sections) && store.sections.length
    ? store.sections.filter((section): section is DeliveryStoreSection => Boolean(section && typeof section.id === 'string' && typeof section.name === 'string'))
    : (fallback?.sections ?? []);

  return {
    id: store.id,
    categoryId: store.categoryId ?? fallback?.categoryId ?? 'food',
    name: store.name ?? fallback?.name ?? '新店铺',
    icon: store.icon ?? fallback?.icon ?? '🍽️',
    accent: store.accent ?? fallback?.accent ?? '#ff6a3d',
    subtitle: store.subtitle ?? fallback?.subtitle ?? '',
    rating: Number.isFinite(store.rating) ? store.rating : (fallback?.rating ?? 4.8),
    monthlySales: Number.isFinite(store.monthlySales) ? store.monthlySales : (fallback?.monthlySales ?? 0),
    distanceKm: Number.isFinite(store.distanceKm) ? store.distanceKm : (fallback?.distanceKm ?? 0),
    deliveryFee: Number.isFinite(store.deliveryFee) ? store.deliveryFee : (fallback?.deliveryFee ?? 0),
    minOrderAmount: Number.isFinite(store.minOrderAmount) ? store.minOrderAmount : (fallback?.minOrderAmount ?? 0),
    avgDeliveryMinutes: Number.isFinite(store.avgDeliveryMinutes) ? store.avgDeliveryMinutes : (fallback?.avgDeliveryMinutes ?? 30),
    notice: store.notice ?? fallback?.notice ?? '',
    isOpen: typeof store.isOpen === 'boolean' ? store.isOpen : (fallback?.isOpen ?? true),
    sections,
  };
};

const loadPersistedState = (): PersistedState => {
  if (typeof window === 'undefined') {
    return {
      favorites: [],
      orders: [],
      stores: DELIVERY_STORES.map(normalizeStore),
      products: [...DELIVERY_PRODUCTS],
      kitchenRecipes: normalizeKitchenRecipes(PRIVATE_KITCHEN_RECIPES),
      cart: [],
      profile: DEFAULT_PROFILE,
      address: DEFAULT_DELIVERY_ADDRESS,
    };
  }

  try {
    const raw = window.localStorage.getItem(DELIVERY_STORAGE_KEY);
    if (!raw) {
      return {
        favorites: [],
        orders: [],
        stores: DELIVERY_STORES.map(normalizeStore),
        products: [...DELIVERY_PRODUCTS],
        kitchenRecipes: normalizeKitchenRecipes(PRIVATE_KITCHEN_RECIPES),
        cart: [],
        profile: DEFAULT_PROFILE,
        address: DEFAULT_DELIVERY_ADDRESS,
      };
    }

    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return {
      favorites: Array.isArray(parsed.favorites)
        ? parsed.favorites.filter((item): item is string => typeof item === 'string')
        : [],
      orders: normalizePersistedOrders(parsed.orders),
      stores: Array.isArray(parsed.stores)
        ? (parsed.stores
            .filter((item) => Boolean(item && typeof item === 'object' && typeof (item as { id?: unknown }).id === 'string'))
            .map((item) => normalizeStore(item as Partial<DeliveryStore> & { id: string })))
        : DELIVERY_STORES.map(normalizeStore),
      products: Array.isArray(parsed.products) ? parsed.products : [...DELIVERY_PRODUCTS],
      kitchenRecipes: normalizeKitchenRecipes(parsed.kitchenRecipes),
      cart: normalizePersistedCart(parsed.cart),
      profile: parsed.profile && typeof parsed.profile === 'object' && typeof (parsed.profile as DeliveryProfileRecord).username === 'string'
        ? {
            username: (parsed.profile as DeliveryProfileRecord).username,
            avatar: typeof (parsed.profile as DeliveryProfileRecord).avatar === 'string' ? (parsed.profile as DeliveryProfileRecord).avatar : DEFAULT_PROFILE.avatar,
          }
        : DEFAULT_PROFILE,
      address: normalizeAddress(parsed.address),
    };
  } catch {
    return {
      favorites: [],
      orders: [],
      stores: DELIVERY_STORES.map(normalizeStore),
      products: [...DELIVERY_PRODUCTS],
      kitchenRecipes: normalizeKitchenRecipes(PRIVATE_KITCHEN_RECIPES),
      cart: [],
      profile: DEFAULT_PROFILE,
      address: DEFAULT_DELIVERY_ADDRESS,
    };
  }
};

const readProductInitial = (product: DeliveryMenuProduct): string => product.name.trim().slice(0, 1) || '外';

const readStoreInitial = (store: DeliveryStore): string => store.name.trim().slice(0, 1) || '店';

const getStoreSections = (store: DeliveryStore | null): DeliveryStoreSection[] => store?.sections ?? [];

const isAvatarImage = (value: string): boolean => value.startsWith('data:image/') || /^https?:\/\//.test(value);

const KITCHEN_RECIPE_ACCENTS = ['#fb7185', '#f97316', '#d97706', '#22c55e', '#38bdf8', '#8b5cf6', '#ec4899', '#ef4444'];

const extractContentFromChatCompletion = (rawContent: unknown): string => {
  if (typeof rawContent === 'string') return rawContent.trim();
  if (!Array.isArray(rawContent)) return '';

  return rawContent
    .map((item) => {
      if (!item || typeof item !== 'object') return '';
      const text = (item as { text?: unknown }).text;
      return typeof text === 'string' ? text : '';
    })
    .filter(Boolean)
    .join('\n')
    .trim();
};

const parseModelJsonPayload = (rawText: string): unknown => {
  const trimmed = rawText.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    // continue
  }

  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch?.[1]) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch {
      // continue
    }
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const maybeObject = trimmed.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(maybeObject);
    } catch {
      // continue
    }
  }

  const firstBracket = trimmed.indexOf('[');
  const lastBracket = trimmed.lastIndexOf(']');
  if (firstBracket >= 0 && lastBracket > firstBracket) {
    const maybeArray = trimmed.slice(firstBracket, lastBracket + 1);
    try {
      return JSON.parse(maybeArray);
    } catch {
      // continue
    }
  }

  return null;
};

const normalizeGeneratedKitchenRecipe = (recipe: GeneratedKitchenRecipePayload, index: number): PrivateKitchenRecipe => {
  const ingredients = Array.isArray(recipe.ingredients)
    ? recipe.ingredients
        .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
        .map((item, ingredientIndex) => {
          const name = typeof item.name === 'string' && item.name.trim() ? item.name.trim() : '食材';
          const amount = typeof item.amount === 'string' && item.amount.trim() ? item.amount.trim() : '1 份';
          const qty = Math.max(1, Math.floor(Number(item.qty) || 1));
          const price = Math.max(0, Number(item.price) || 0);
          return {
            productId: `${makeId('recipe-ing')}-${index}-${ingredientIndex}`,
            name,
            amount,
            qty,
            price,
          };
        })
    : [];

  return {
    id: makeId(`recipe-ai-${index}`),
    name: recipe.name.trim() || '随机菜谱',
    subtitle: recipe.subtitle.trim() || '大模型自动生成的家常菜谱',
    accent: recipe.accent?.trim() || KITCHEN_RECIPE_ACCENTS[index % KITCHEN_RECIPE_ACCENTS.length],
    time: recipe.time?.trim() || '20 分钟',
    servings: recipe.servings?.trim() || '2 人份',
    ingredients: ingredients.length ? ingredients : [
      {
        productId: makeId('recipe-ing'),
        name: '基础食材',
        amount: '1 份',
        qty: 1,
        price: 0,
      },
    ],
    steps: Array.isArray(recipe.steps)
      ? recipe.steps.map((step) => (typeof step === 'string' ? step.trim() : '')).filter(Boolean)
      : [],
    shareText: recipe.shareText?.trim() || `${recipe.name.trim() || '随机菜谱'}，欢迎试试。`,
  };
};

const normalizeRecipeIngredient = (
  ingredient: Partial<PrivateKitchenRecipe['ingredients'][number]>,
  fallbackId: string,
): PrivateKitchenRecipe['ingredients'][number] => ({
  productId: typeof ingredient.productId === 'string' && ingredient.productId.trim() ? ingredient.productId.trim() : fallbackId,
  name: typeof ingredient.name === 'string' && ingredient.name.trim() ? ingredient.name.trim() : '食材',
  amount: typeof ingredient.amount === 'string' && ingredient.amount.trim() ? ingredient.amount.trim() : '1 份',
  qty: Number.isFinite(Number(ingredient.qty)) ? Math.max(1, Math.floor(Number(ingredient.qty))) : 1,
  price: Number.isFinite(Number(ingredient.price)) ? Math.max(0, Number(ingredient.price)) : 0,
});

const normalizeKitchenRecipe = (recipe: Partial<PrivateKitchenRecipe> & { id: string }): PrivateKitchenRecipe => {
  const fallback = PRIVATE_KITCHEN_RECIPES.find((item) => item.id === recipe.id);
  const fallbackId = fallback?.id ?? recipe.id;
  const ingredients = Array.isArray(recipe.ingredients) && recipe.ingredients.length
    ? recipe.ingredients.map((ingredient, index) => normalizeRecipeIngredient(ingredient, `${recipe.id}-ingredient-${index + 1}`))
    : (fallback?.ingredients ?? []).map((ingredient, index) => normalizeRecipeIngredient(ingredient, `${fallbackId}-ingredient-${index + 1}`));

  return {
    id: recipe.id,
    name: typeof recipe.name === 'string' && recipe.name.trim() ? recipe.name.trim() : (fallback?.name ?? '新菜谱'),
    subtitle: typeof recipe.subtitle === 'string' ? recipe.subtitle : (fallback?.subtitle ?? ''),
    accent: typeof recipe.accent === 'string' && recipe.accent.trim() ? recipe.accent.trim() : (fallback?.accent ?? '#fb7185'),
    time: typeof recipe.time === 'string' && recipe.time.trim() ? recipe.time.trim() : (fallback?.time ?? '20 分钟'),
    servings: typeof recipe.servings === 'string' && recipe.servings.trim() ? recipe.servings.trim() : (fallback?.servings ?? '2 人份'),
    ingredients,
    steps: Array.isArray(recipe.steps) && recipe.steps.length
      ? recipe.steps.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim())
      : (fallback?.steps ?? []),
    shareText: typeof recipe.shareText === 'string' && recipe.shareText.trim() ? recipe.shareText.trim() : (fallback?.shareText ?? ''),
  };
};

const normalizeKitchenRecipes = (recipes: unknown): PrivateKitchenRecipe[] => {
  if (!Array.isArray(recipes)) return PRIVATE_KITCHEN_RECIPES.map((recipe) => normalizeKitchenRecipe(recipe));
  return recipes
    .filter((item): item is Partial<PrivateKitchenRecipe> & { id: string } => Boolean(item && typeof item === 'object' && typeof (item as { id?: unknown }).id === 'string'))
    .map((item) => normalizeKitchenRecipe(item));
};

const buildRecipeDraft = (recipe?: PrivateKitchenRecipe): RecipeDraft => ({
  id: recipe?.id ?? makeId('recipe'),
  name: recipe?.name ?? '',
  subtitle: recipe?.subtitle ?? '',
  accent: recipe?.accent ?? '#fb7185',
  time: recipe?.time ?? '20 分钟',
  servings: recipe?.servings ?? '2 人份',
  shareText: recipe?.shareText ?? '',
  steps: recipe?.steps?.join('\n') ?? '',
  ingredients: recipe?.ingredients?.length
    ? recipe.ingredients.map((ingredient) => ({
        productId: ingredient.productId,
        name: ingredient.name ?? '',
        amount: ingredient.amount ?? '',
        qty: String(ingredient.qty ?? 1),
        price: String(ingredient.price ?? 0),
      }))
    : [
        {
          productId: makeId('ingredient'),
          name: '',
          amount: '',
          qty: '1',
          price: '0',
        },
      ],
});

const draftToKitchenRecipe = (draft: RecipeDraft): PrivateKitchenRecipe => ({
  id: draft.id.trim() || makeId('recipe'),
  name: draft.name.trim() || '新菜谱',
  subtitle: draft.subtitle.trim(),
  accent: draft.accent.trim() || '#fb7185',
  time: draft.time.trim() || '20 分钟',
  servings: draft.servings.trim() || '2 人份',
  ingredients: draft.ingredients
    .map((ingredient, index) => ({
      productId: ingredient.productId.trim() || `${draft.id}-ingredient-${index + 1}`,
      name: ingredient.name.trim() || '食材',
      amount: ingredient.amount.trim() || '1 份',
      qty: Math.max(1, Math.floor(Number(ingredient.qty) || 1)),
      price: Math.max(0, Number(ingredient.price) || 0),
    }))
    .filter((ingredient) => Boolean(ingredient.name || ingredient.amount)),
  steps: splitLines(draft.steps),
  shareText: draft.shareText.trim() || `${draft.name.trim() || '新菜谱'}，欢迎试试。`,
});

const normalizeDeliveryReturnOrderIds = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : [];

const resolveDeliveryReturnRoute = (
  orders: DeliveryOrderRecord[],
  orderIds: string[],
): 'progress' | 'history' | null => {
  const idSet = new Set(orderIds);
  const matchedOrders = orders.filter((order) => idSet.has(order.id));
  if (matchedOrders.some((order) => order.paymentStatus === 'accepted' || order.status === '配送中' || order.status === '已送达')) {
    return 'progress';
  }
  if (matchedOrders.some((order) => order.paymentStatus === 'rejected' || order.status === '已取消')) {
    return 'history';
  }
  return null;
};

export const DeliveryApp: React.FC<AppProps> = ({ onClose, context }) => {
  const persisted = React.useMemo(() => loadPersistedState(), []);
  const apiSettings = useGlobalSettingsStore((state) => state.settings);
  const contacts = useContactsSnapshot();
  const wechatBalance = useWeChatStore((state) => state.wechatUserProfile.balance || 0);
  const withdrawWeChatBalance = useWeChatStore((state) => state.withdrawWeChatBalance);
  const ensureWeChatSession = useWeChatStore((state) => state.ensureWeChatSession);
  const addWeChatMessage = useWeChatStore((state) => state.addWeChatMessage);
  const [page, setPage] = React.useState<DeliveryAppPage>('home');
  const [deliveryView, setDeliveryView] = React.useState<DeliveryDeliveryView>('category');
  const [search, setSearch] = React.useState('');
  const [activeCategoryId, setActiveCategoryId] = React.useState('food');
  const [activeStoreId, setActiveStoreId] = React.useState<string | null>(null);
  const [cartOriginStoreId, setCartOriginStoreId] = React.useState<string | null>(null);
  const [cartOriginCategoryId, setCartOriginCategoryId] = React.useState<string | null>(null);
  const [showContactPicker, setShowContactPicker] = React.useState(false);
  const [pendingContactMode, setPendingContactMode] = React.useState<'delegate' | 'gift' | 'recipe' | null>(null);
  const [pendingCheckoutSnapshot, setPendingCheckoutSnapshot] = React.useState<DeliveryCheckoutSnapshot | null>(null);
  const [pendingCheckoutShouldClearCart, setPendingCheckoutShouldClearCart] = React.useState(false);
  const [pendingRecipeShare, setPendingRecipeShare] = React.useState<PrivateKitchenRecipe | null>(null);
  const [showGiftPaymentSheet, setShowGiftPaymentSheet] = React.useState(false);
  const [favorites, setFavorites] = React.useState<string[]>(persisted.favorites);
  const [orders, setOrders] = React.useState<DeliveryOrderRecord[]>(persisted.orders);
  const [stores, setStores] = React.useState<DeliveryStore[]>(persisted.stores);
  const [products, setProducts] = React.useState<DeliveryMenuProduct[]>(persisted.products);
  const [kitchenRecipes, setKitchenRecipes] = React.useState<PrivateKitchenRecipe[]>(persisted.kitchenRecipes);
  const [cart, setCart] = React.useState<DeliveryCartEntry[]>(persisted.cart);
  const [profile, setProfile] = React.useState<DeliveryProfileRecord>(persisted.profile);
  const [deliveryAddress, setDeliveryAddress] = React.useState<DeliveryAddressRecord>(persisted.address);
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);
  const [selectedProduct, setSelectedProduct] = React.useState<DeliveryMenuProduct | null>(null);
  const [selectedKitchenRecipe, setSelectedKitchenRecipe] = React.useState<PrivateKitchenRecipe | null>(null);
  const [selectedOrder, setSelectedOrder] = React.useState<DeliveryOrderRecord | null>(null);
  const [showStoreModal, setShowStoreModal] = React.useState(false);
  const [showRecipeModal, setShowRecipeModal] = React.useState(false);
  const [showRecipePromptModal, setShowRecipePromptModal] = React.useState(false);
  const [generatingRecipes, setGeneratingRecipes] = React.useState(false);
  const [showCheckoutActions, setShowCheckoutActions] = React.useState(false);
  const [addressDraft, setAddressDraft] = React.useState<DeliveryAddressRecord>(persisted.address);
  const [checkoutPanel, setCheckoutPanel] = React.useState<'place' | 'history'>('place');
  const [mePanel, setMePanel] = React.useState<'overview' | 'account' | 'orders' | 'management' | 'address' | 'recipe'>('account');
  const [addressOriginPage, setAddressOriginPage] = React.useState<'checkout' | 'me' | null>(null);
  const [profileDraft, setProfileDraft] = React.useState<DeliveryProfileRecord>(persisted.profile);
  const [isProfileEditing, setIsProfileEditing] = React.useState(false);
  const [storeDraft, setStoreDraft] = React.useState<StoreDraft>(buildInitialStoreDraft);
  const [recipeDraft, setRecipeDraft] = React.useState<RecipeDraft>(buildRecipeDraft());
  const [recipeGenerationPrompt, setRecipeGenerationPrompt] = React.useState('请生成一些适合家庭晚餐的家常菜，偏清淡、下饭、做法简单。');
  const [editingRecipeId, setEditingRecipeId] = React.useState<string | null>(null);
  const [productDraft, setProductDraft] = React.useState<ProductDraft>({
    storeId: '',
    name: '',
    price: '',
    section: '',
    description: '',
    tag: '新品',
  });
  const [showProductModal, setShowProductModal] = React.useState(false);
  const [managementSearch, setManagementSearch] = React.useState('');
  const [importError, setImportError] = React.useState<string | null>(null);
  const [clockTick, setClockTick] = React.useState(Date.now());
  const returnOrderIds = React.useMemo(
    () => normalizeDeliveryReturnOrderIds(context?.params?.deliveryReturnOrderIds),
    [context?.params?.deliveryReturnOrderIds],
  );
  const returnOrderIdsKey = returnOrderIds.join('|');
  const importInputRef = React.useRef<HTMLInputElement | null>(null);
  const profileAvatarInputRef = React.useRef<HTMLInputElement | null>(null);
  const storeDraftIconInputRef = React.useRef<HTMLInputElement | null>(null);
  const storeMap = React.useMemo(() => new Map(stores.map((store) => [store.id, store])), [stores]);
  const productMap = React.useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const activeStore = activeStoreId ? storeMap.get(activeStoreId) ?? null : null;
  const activeStoreSections = React.useMemo(() => getStoreSections(activeStore), [activeStore]);
  const activeCategoryStores = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    return stores.filter((store) => {
      if (store.categoryId !== activeCategoryId) return false;
      if (store.categoryId === 'kitchen') return false;
      if (!query) return true;
      return [store.name, store.subtitle, store.notice].some((value) => value.toLowerCase().includes(query));
    });
  }, [activeCategoryId, search, stores]);
  const activeStoreProducts = React.useMemo(
    () => products.filter((product) => product.storeId === activeStoreId),
    [activeStoreId, products],
  );
  const activeStoreAvailableProducts = React.useMemo(
    () => activeStoreProducts.filter((product) => product.status === '上架'),
    [activeStoreProducts],
  );
  const deliveryProgressOrders = React.useMemo(
    () => orders.filter((order) => order.status === '配送中' || order.status === '已送达' || Boolean(order.delivery)),
    [orders],
  );
  const cartProducts = React.useMemo(
    () => cart
      .map((entry) => {
        const product = productMap.get(entry.productId);
        if (product) return { product, qty: entry.qty };
        return {
          product: {
            id: entry.productId,
            storeId: entry.storeId ?? 'store-kitchen',
            categoryId: entry.categoryId ?? 'kitchen',
            sectionId: entry.sectionId ?? 'recipe',
            name: entry.name ?? '食材',
            price: Number.isFinite(entry.price) ? (entry.price as number) : 0,
            stock: 0,
            sales: 0,
            description: entry.description ?? '私家厨房食材',
            tag: entry.tag ?? '食材',
            status: '上架' as const,
          } as DeliveryMenuProduct,
          qty: entry.qty,
        };
      })
      .filter((item): item is { product: DeliveryMenuProduct; qty: number } => Boolean(item)),
    [cart, productMap],
  );
  const cartStoreGroups = React.useMemo(() => {
    const groups = new Map<string, { store: DeliveryStore | null; items: { product: DeliveryMenuProduct; qty: number }[] }>();
    cartProducts.forEach((item) => {
      const storeId = item.product.storeId || 'delivery-main';
      if (!groups.has(storeId)) {
        groups.set(storeId, {
          store: storeMap.get(storeId) ?? null,
          items: [],
        });
      }
      groups.get(storeId)?.items.push(item);
    });
    return Array.from(groups.entries()).map(([storeId, group]) => ({
      storeId,
      store: group.store,
      items: group.items,
    }));
  }, [cartProducts, storeMap]);
  const cartTotal = cartProducts.reduce((sum, item) => sum + item.product.price * item.qty, 0);
  const activeStoreCartProducts = React.useMemo(
    () => (activeStoreId ? cartProducts.filter((item) => item.product.storeId === activeStoreId) : []),
    [activeStoreId, cartProducts],
  );
  const activeStoreCartCount = React.useMemo(
    () => activeStoreCartProducts.reduce((sum, item) => sum + item.qty, 0),
    [activeStoreCartProducts],
  );
  const activeStoreCartTotal = React.useMemo(
    () => activeStoreCartProducts.reduce((sum, item) => sum + item.product.price * item.qty, 0),
    [activeStoreCartProducts],
  );
  const wechatContacts = React.useMemo(
    () => contacts.filter((contact) => contact.wechatRelation === 'friend'),
    [contacts],
  );
  const activeTab = page === 'management' ? 'me' : page;

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const nextState: PersistedState = {
      favorites,
      orders,
      stores,
      products,
      kitchenRecipes,
      cart,
      profile,
      address: deliveryAddress,
    };
    window.localStorage.setItem(DELIVERY_STORAGE_KEY, JSON.stringify(nextState));
  }, [cart, deliveryAddress, favorites, kitchenRecipes, orders, products, profile, stores]);

  React.useEffect(() => {
    if (!toasts.length) return;
    const timer = window.setTimeout(() => {
      setToasts((current) => current.slice(1));
    }, 2200);
    return () => window.clearTimeout(timer);
  }, [toasts]);

  React.useEffect(() => {
    const deliveredOrders = deliveryProgressOrders
      .map((order) => ({
        order,
        snapshot: createDeliveryTracking(order.createdAt, order.deliveryAddress ?? deliveryAddress, clockTick),
      }))
      .filter((item) => item.order.status === '配送中' && item.snapshot.stage === '送达');
    if (!deliveredOrders.length) return;
    const deliveredSnapshots = new Map(deliveredOrders.map((item) => [item.order.id, item.snapshot]));
    setOrders((current) =>
      current.map((order) => {
        const snapshot = deliveredSnapshots.get(order.id);
        return snapshot ? { ...order, status: '已送达', delivery: snapshot } : order;
      }),
    );
  }, [clockTick, deliveryAddress, deliveryProgressOrders]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncOrders = (event: Event) => {
      const detail = event instanceof CustomEvent ? event.detail : null;
      const persistedState = loadPersistedState();
      const nextOrders = Array.isArray(detail?.orders) ? normalizePersistedOrders(detail.orders) : persistedState.orders;
      setOrders(nextOrders);
      setCart(persistedState.cart);
      if (Array.isArray(detail?.orderIds) && detail.orderIds.length > 0) {
        const returnRoute = resolveDeliveryReturnRoute(nextOrders, normalizeDeliveryReturnOrderIds(detail.orderIds));
        if (returnRoute === 'progress') {
          setCheckoutPanel('history');
          setPage('home');
        } else if (returnRoute === 'history') {
          setCheckoutPanel('history');
          setPage('checkout');
        }
      }
    };
    const syncStorageOrders = (event: StorageEvent) => {
      if (event.key && event.key !== DELIVERY_STORAGE_KEY) return;
      const persistedState = loadPersistedState();
      setOrders(persistedState.orders);
      setCart(persistedState.cart);
    };
    window.addEventListener(DELIVERY_ORDERS_CHANGED_EVENT, syncOrders);
    window.addEventListener('storage', syncStorageOrders);
    return () => {
      window.removeEventListener(DELIVERY_ORDERS_CHANGED_EVENT, syncOrders);
      window.removeEventListener('storage', syncStorageOrders);
    };
  }, []);

  React.useEffect(() => {
    const orderIds = returnOrderIdsKey.split('|').filter(Boolean);
    if (!orderIds.length) return;
    const persistedState = loadPersistedState();
    const persistedOrders = persistedState.orders;
    const returnRoute = resolveDeliveryReturnRoute(persistedOrders, orderIds);
    if (!returnRoute) return;
    setOrders(persistedOrders);
    setCart(persistedState.cart);
    if (returnRoute === 'progress') {
      setCheckoutPanel('history');
      setPage('home');
      return;
    }
    setCheckoutPanel('history');
    setPage('checkout');
  }, [returnOrderIdsKey]);

  React.useEffect(() => {
    const timer = window.setInterval(() => {
      setClockTick(Date.now());
    }, 15000);
    return () => window.clearInterval(timer);
  }, []);

  React.useEffect(() => {
    if (activeStoreId && !storeMap.has(activeStoreId)) {
      setActiveStoreId(null);
      setDeliveryView('category');
    }
  }, [activeStoreId, storeMap]);

  const pushToast = React.useCallback((title: string, text: string) => {
    setToasts((current) => [...current, { id: makeId('toast'), title, text }]);
  }, []);

  const handleCategorySelect = React.useCallback((categoryId: string) => {
    setSelectedKitchenRecipe(null);
    if (categoryId === 'custom') {
      setCartOriginCategoryId(activeCategoryId);
      setDeliveryView('cart');
      setActiveStoreId(null);
      setCartOriginStoreId(null);
      setActiveCategoryId(categoryId);
      setPage('delivery');
      return;
    }
    if (categoryId === 'kitchen') {
      setCartOriginCategoryId(null);
      setDeliveryView('kitchen');
      setActiveStoreId(null);
      setCartOriginStoreId(null);
      setPage('delivery');
      return;
    }
    setCartOriginCategoryId(null);
    setActiveCategoryId(categoryId);
    setDeliveryView('category');
    setActiveStoreId(null);
    setCartOriginStoreId(null);
    setPage('delivery');
  }, [activeCategoryId]);

  const handleOpenStore = React.useCallback((storeId: string) => {
    const store = storeMap.get(storeId);
    if (store) {
      setActiveCategoryId(store.categoryId);
    }
    setActiveStoreId(storeId);
    setDeliveryView('store');
    setPage('delivery');
  }, [storeMap]);

  const handleCloseStore = React.useCallback(() => {
    setActiveStoreId(null);
    setDeliveryView('category');
    setCartOriginStoreId(null);
    setCartOriginCategoryId(null);
    setSelectedKitchenRecipe(null);
  }, []);

  const handleOpenCartFromStore = React.useCallback((storeId: string) => {
    setCartOriginStoreId(storeId);
    setCartOriginCategoryId(storeMap.get(storeId)?.categoryId ?? null);
    setDeliveryView('cart');
    setActiveStoreId(null);
    setActiveCategoryId('custom');
    setPage('delivery');
    setSelectedKitchenRecipe(null);
  }, [storeMap]);

  const openAddressPanel = React.useCallback((origin: 'checkout' | 'me') => {
    setAddressDraft(deliveryAddress);
    setAddressOriginPage(origin);
    setMePanel('address');
    setPage('me');
  }, [deliveryAddress]);

  const handleStoreIconChange = React.useCallback((storeId: string, file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      pushToast('文件格式不支持', '请选择图片文件');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') return;
      setStores((current) => current.map((store) => (store.id === storeId ? { ...store, icon: result } : store)));
    };
    reader.readAsDataURL(file);
  }, [pushToast]);

  const handleSaveProfile = React.useCallback(() => {
    const username = profileDraft.username.trim();
    const avatar = profileDraft.avatar.trim();
    if (!username) {
      pushToast('用户名不完整', '请填写用户名');
      return;
    }
    const nextProfile = {
      username,
      avatar: avatar || DEFAULT_PROFILE.avatar,
    };
    setProfile(nextProfile);
    setProfileDraft(nextProfile);
    setIsProfileEditing(false);
    pushToast('资料已更新', '头像和用户名已保存');
  }, [profileDraft, pushToast]);

  const handleProfileAvatarChange = React.useCallback((file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      pushToast('文件格式不支持', '请选择图片文件');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') return;
      setProfileDraft((current) => ({ ...current, avatar: result }));
    };
    reader.readAsDataURL(file);
  }, [pushToast]);

  const handleStoreDraftIconChange = React.useCallback((file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      pushToast('文件格式不支持', '请选择图片文件');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') return;
      setStoreDraft((current) => ({ ...current, icon: result }));
    };
    reader.readAsDataURL(file);
  }, [pushToast]);

  const handleSaveAddress = React.useCallback(() => {
    const title = addressDraft.title.trim();
    const recipient = addressDraft.recipient.trim();
    const phone = addressDraft.phone.trim();
    if (!title) {
      pushToast('地址不完整', '请填写地址名称');
      return;
    }
    setDeliveryAddress({
      title,
      recipient: recipient || DEFAULT_DELIVERY_ADDRESS.recipient,
      phone: phone || DEFAULT_DELIVERY_ADDRESS.phone,
    });
    setAddressDraft({
      title,
      recipient: recipient || DEFAULT_DELIVERY_ADDRESS.recipient,
      phone: phone || DEFAULT_DELIVERY_ADDRESS.phone,
    });
    pushToast('地址已更新', '地址管理已保存');
  }, [addressDraft, pushToast]);

  const handleAddToCart = React.useCallback((product: DeliveryMenuProduct) => {
    if (product.status !== '上架') {
      pushToast('暂不可购买', '该商品已下架');
      return;
    }
    setCart((current) => mergeCartEntries(current, [{ productId: product.id, qty: 1 }]));
  }, []);

  const handleAddRecipeToCart = React.useCallback((recipe: PrivateKitchenRecipe) => {
    setCart((current) => {
      const additions = recipe.ingredients.map((ingredient) => ({
        productId: ingredient.productId,
        qty: ingredient.qty,
        name: ingredient.name ?? ingredient.productId,
        price: ingredient.price,
        description: `${recipe.name} · 需要 ${ingredient.amount}`,
        tag: '食材',
        storeId: 'store-kitchen',
        categoryId: 'kitchen',
        sectionId: 'recipe',
      }));
      return mergeCartEntries(current, additions);
    });
    setSelectedKitchenRecipe(null);
  }, []);

  const handleShareRecipe = React.useCallback((recipe: PrivateKitchenRecipe) => {
    if (!wechatContacts.length) {
      pushToast('暂无微信好友', '请先在通讯录添加好友');
      return;
    }
    setPendingRecipeShare(recipe);
    setPendingContactMode('recipe');
    setPendingCheckoutSnapshot(null);
    setPendingCheckoutShouldClearCart(false);
    setShowCheckoutActions(false);
    setShowGiftPaymentSheet(false);
    setSelectedKitchenRecipe(null);
    setShowContactPicker(true);
  }, [pushToast, wechatContacts.length]);

  const adjustCartQty = React.useCallback((productId: string, delta: number) => {
    setCart((current) => {
      const existing = current.find((item) => item.productId === productId);
      const nextQty = (existing?.qty ?? 0) + delta;
      if (nextQty <= 0) {
        return current.filter((item) => item.productId !== productId);
      }
      return current.map((item) => (item.productId === productId ? { ...item, qty: nextQty } : item));
    });
  }, []);

  const removeCartItem = React.useCallback((productId: string) => {
    setCart((current) => current.filter((item) => item.productId !== productId));
  }, []);

  const handleRestockFailedOrder = React.useCallback((order: DeliveryOrderRecord) => {
    const items = order.items ?? [];
    if (!items.length) {
      pushToast('无法加购', '这笔订单没有可恢复的商品明细');
      return;
    }
    setCart((current) => mergeCartEntries(current, items));
    setSelectedOrder(null);
    setPage('delivery');
    setDeliveryView('cart');
    setActiveStoreId(null);
    setActiveCategoryId('custom');
    pushToast('已重新加购', '商品已放回购物车');
  }, [pushToast]);

  const toggleFavorite = React.useCallback((productId: string) => {
    setFavorites((current) => {
      if (current.includes(productId)) {
        pushToast('已取消收藏', '商品已从收藏中移除');
        return current.filter((id) => id !== productId);
      }
      pushToast('收藏成功', '商品已加入收藏');
      return [...current, productId];
    });
  }, [pushToast]);

  const buildCheckoutSnapshot = React.useCallback(
    (items: Array<{ product: DeliveryMenuProduct; qty: number }>): DeliveryCheckoutSnapshot | null => {
      const normalizedItems = items.filter((item) => item.qty > 0);
      if (!normalizedItems.length) return null;
      const amount = normalizedItems.reduce((sum, item) => sum + item.product.price * item.qty, 0);
      const title = normalizedItems.slice(0, 2).map((item) => item.product.name).join('、') || '外卖订单';
      const storeNames = Array.from(
        new Set(
          normalizedItems.map((item) => storeMap.get(item.product.storeId)?.name ?? DELIVERY_MERCHANT.name),
        ),
      );
      return {
        title: normalizedItems.length > 2 ? `${title} 等` : title,
        merchantName: storeNames.length > 1 ? `${storeNames[0]}等${storeNames.length}家店铺` : storeNames[0] ?? '外卖订单',
        amount,
        items: normalizedItems,
        orderPreview: {
          storeNames,
          items: normalizedItems.slice(0, 4).map((item) => ({ name: item.product.name, qty: item.qty })),
          totalItemCount: normalizedItems.reduce((sum, item) => sum + item.qty, 0),
        },
      };
    },
    [storeMap],
  );

  const openWeChatChat = React.useCallback((contactId: string, orderIds?: string[]) => {
    if (typeof window === 'undefined') return;
    const normalizedOrderIds = normalizeDeliveryReturnOrderIds(orderIds);
    const params: Record<string, unknown> = {
      openChatCharacterId: contactId,
      returnAppId: 'delivery',
    };
    if (normalizedOrderIds.length > 0) {
      params.returnParams = { deliveryReturnOrderIds: normalizedOrderIds };
    }
    window.dispatchEvent(
      new CustomEvent(PUSH_OPEN_APP_MESSAGE_TYPE, {
        detail: {
          appId: 'wechat',
          params,
        },
      }),
    );
  }, []);

  const assertWalletBalance = React.useCallback((amount: number): boolean => {
    if (amount <= wechatBalance) return true;
    pushToast('微信余额不足', '请先前往微信钱包充值');
    setShowCheckoutActions(false);
    setShowContactPicker(false);
    setShowGiftPaymentSheet(false);
    return false;
  }, [pushToast, wechatBalance]);

  const commitCheckoutOrder = React.useCallback((
    snapshot: DeliveryCheckoutSnapshot,
    type: DeliveryOrderRecord['type'],
    options?: {
      contact?: Contact;
      clearCart?: boolean;
      paymentStatus?: DeliveryOrderRecord['paymentStatus'];
      status?: DeliveryOrderRecord['status'];
      withDelivery?: boolean;
    },
  ): DeliveryOrderRecord => {
    const createdAt = Date.now();
    const contact = options?.contact;
    const order: DeliveryOrderRecord = {
      id: makeId('order'),
      type,
      title: snapshot.title,
      merchantName: snapshot.merchantName,
      amount: snapshot.amount,
      status: options?.status ?? '配送中',
      createdAt,
      paymentMode: type === '购买' ? 'wechat' : type === '发起代付' ? 'delegate' : 'gift',
      paymentStatus: options?.paymentStatus ?? 'paid',
      paymentContactId: contact?.id,
      paymentContactName: contact?.name,
      paymentContactAvatar: contact?.avatar,
      items: normalizeOrderItems(snapshot.items),
      delivery: options?.withDelivery === false ? undefined : createDeliveryTracking(createdAt, deliveryAddress, createdAt),
      deliveryAddress,
    };
    const nextOrders = updatePersistedDeliveryOrders((current) => [
      order,
      ...current.filter((item) => item.id !== order.id),
    ], { clearCart: Boolean(options?.clearCart) });
    setOrders(nextOrders.length ? nextOrders : [order]);
    if (options?.clearCart) setCart([]);
    setCheckoutPanel('history');
    setPage('checkout');
    return order;
  }, [deliveryAddress]);

  const handleWechatPayment = React.useCallback((snapshot: DeliveryCheckoutSnapshot, clearCart: boolean) => {
    if (!assertWalletBalance(snapshot.amount)) return;
    const order = commitCheckoutOrder(snapshot, '购买', {
      clearCart,
      paymentStatus: 'paid',
      status: '配送中',
      withDelivery: true,
    });
    withdrawWeChatBalance(snapshot.amount, {
      title: '外卖订单',
      counterparty: snapshot.merchantName,
      statusText: '支付成功',
    });
    setShowCheckoutActions(false);
    setSelectedProduct(null);
    pushToast('微信支付成功', `${formatOrderCode(order.createdAt)} 已进入配送流程`);
  }, [assertWalletBalance, commitCheckoutOrder, pushToast, withdrawWeChatBalance]);

  const sendDeliveryCardToContact = React.useCallback((
    contact: Contact,
    message: Omit<WeChatMessage, 'id' | 'timestamp'>,
  ) => {
    const sessionId = ensureWeChatSession(contact.id, { switchCurrent: true });
    if (!sessionId) {
      pushToast('发送失败', '没有找到对应的微信聊天');
      return;
    }
    addWeChatMessage(sessionId, message);
    openWeChatChat(contact.id, message.orderIds);
  }, [addWeChatMessage, ensureWeChatSession, openWeChatChat, pushToast]);

  const openContactPaymentPicker = React.useCallback((mode: 'delegate' | 'gift', snapshot: DeliveryCheckoutSnapshot, clearCart: boolean) => {
    setPendingCheckoutSnapshot(snapshot);
    setPendingCheckoutShouldClearCart(clearCart);
    setPendingContactMode(mode);
    setPendingRecipeShare(null);
    setShowCheckoutActions(false);
    setShowGiftPaymentSheet(false);
    setShowContactPicker(true);
  }, []);

  const openGiftPaymentSheet = React.useCallback((snapshot: DeliveryCheckoutSnapshot, clearCart: boolean) => {
    setPendingCheckoutSnapshot(snapshot);
    setPendingCheckoutShouldClearCart(clearCart);
    setPendingContactMode('gift');
    setPendingRecipeShare(null);
    setShowCheckoutActions(false);
    setShowContactPicker(false);
    setShowGiftPaymentSheet(true);
  }, []);

  const handleGiftWechatPaymentConfirm = React.useCallback(() => {
    if (!pendingCheckoutSnapshot) return;
    if (!assertWalletBalance(pendingCheckoutSnapshot.amount)) return;
    setShowGiftPaymentSheet(false);
    setShowContactPicker(true);
  }, [assertWalletBalance, pendingCheckoutSnapshot]);

  const handleSheetAction = React.useCallback((type: DeliveryOrderRecord['type']) => {
    if (!selectedProduct) return;
    const snapshot = buildCheckoutSnapshot([{ product: selectedProduct, qty: 1 }]);
    if (!snapshot) return;
    if (type === '购买') {
      handleWechatPayment(snapshot, false);
      return;
    }
    setSelectedProduct(null);
    if (type === '为TA买单') {
      openGiftPaymentSheet(snapshot, false);
      return;
    }
    openContactPaymentPicker('delegate', snapshot, false);
  }, [buildCheckoutSnapshot, handleWechatPayment, openContactPaymentPicker, openGiftPaymentSheet, selectedProduct]);

  const handlePlaceOrder = React.useCallback((type: DeliveryOrderRecord['type']) => {
    const snapshot = buildCheckoutSnapshot(cartProducts);
    if (!snapshot) {
      pushToast('购物车为空', '请先加入商品');
      return;
    }

    if (type === '购买') {
      handleWechatPayment(snapshot, true);
      return;
    }

    if (type === '为TA买单') {
      openGiftPaymentSheet(snapshot, true);
      return;
    }

    openContactPaymentPicker('delegate', snapshot, true);
  }, [buildCheckoutSnapshot, cartProducts, handleWechatPayment, openContactPaymentPicker, openGiftPaymentSheet, pushToast]);

  const handleContactPaymentSelect = React.useCallback((contact: Contact) => {
    if (!pendingContactMode) return;

    if (pendingContactMode === 'recipe') {
      if (!pendingRecipeShare) return;
      const recipe = pendingRecipeShare;
      sendDeliveryCardToContact(contact, {
        role: 'user',
        type: 'recipe_card',
        appSource: 'delivery',
        content: `分享菜谱：${recipe.name}`,
        recipeCard: {
          recipeId: recipe.id,
          title: recipe.name,
          subtitle: recipe.subtitle,
          accent: recipe.accent,
          time: recipe.time,
          servings: recipe.servings,
          shareText: recipe.shareText,
          ingredients: recipe.ingredients.map((ingredient) => ({
            name: ingredient.name ?? productMap.get(ingredient.productId)?.name ?? ingredient.productId,
            amount: ingredient.amount,
          })),
          steps: recipe.steps,
        },
      });
      pushToast('菜谱已发送', `已分享给 ${contact.name}`);
      setShowContactPicker(false);
      setPendingContactMode(null);
      setPendingRecipeShare(null);
      return;
    }

    if (!pendingCheckoutSnapshot) return;
    const snapshot = pendingCheckoutSnapshot;

    if (pendingContactMode === 'delegate') {
      const order = commitCheckoutOrder(snapshot, '发起代付', {
        contact,
        clearCart: pendingCheckoutShouldClearCart,
        paymentStatus: 'pending',
        status: '待支付',
        withDelivery: false,
      });
      sendDeliveryCardToContact(contact, {
        role: 'user',
        type: 'order_request',
        appSource: 'delivery',
        content: '帮我支付这笔外卖订单',
        amount: snapshot.amount,
        orderIds: [order.id],
        orderPreview: snapshot.orderPreview,
        deliveryOrderItems: normalizeOrderItems(snapshot.items),
        deliveryAddress: {
          title: deliveryAddress.title,
          recipient: deliveryAddress.recipient,
          phone: deliveryAddress.phone,
        },
        assistantReplyPending: true,
        orderRequestStatus: 'pending',
      });
      pushToast('代付已发送', `已发送给 ${contact.name}`);
    } else {
      if (!assertWalletBalance(snapshot.amount)) return;
      const order = commitCheckoutOrder(snapshot, '为TA买单', {
        contact,
        clearCart: pendingCheckoutShouldClearCart,
        paymentStatus: 'paid',
        status: '配送中',
        withDelivery: true,
      });
      withdrawWeChatBalance(snapshot.amount, {
        title: '外卖买单',
        counterparty: contact.name,
        avatar: contact.avatar,
        statusText: '支付成功',
      });
      sendDeliveryCardToContact(contact, {
        role: 'user',
        type: 'gift_delivery',
        appSource: 'delivery',
        content: `我为你点了一份外卖，正在配送中`,
        amount: snapshot.amount,
        orderIds: [order.id],
        orderPreview: snapshot.orderPreview,
        giftDelivery: {
          orderId: formatOrderCode(order.createdAt),
          title: '为你点了一份外卖',
          productName: snapshot.title,
          coverEmoji: '🍱',
          deliveryStage: order.delivery?.stage,
          deliveryEtaMinutes: order.delivery?.etaMinutes,
          recipientName: contact.name,
          addressTitle: deliveryAddress.title,
        },
      });
      pushToast('买单成功', `配送卡片已发送给 ${contact.name}`);
    }

    setShowContactPicker(false);
    setPendingContactMode(null);
    setPendingCheckoutSnapshot(null);
    setPendingCheckoutShouldClearCart(false);
    setPendingRecipeShare(null);
  }, [
    assertWalletBalance,
    commitCheckoutOrder,
    deliveryAddress.title,
    pendingCheckoutSnapshot,
    pendingCheckoutShouldClearCart,
    pendingContactMode,
    pendingRecipeShare,
    productMap,
    pushToast,
    sendDeliveryCardToContact,
    withdrawWeChatBalance,
  ]);

  const handleCreateStore = React.useCallback(() => {
    const name = storeDraft.name.trim();
    const subtitle = storeDraft.subtitle.trim();
    const icon = storeDraft.icon.trim() || '🍽️';
    const notice = storeDraft.notice.trim() || '新店上线，欢迎光临。';
    const deliveryFee = Number(storeDraft.deliveryFee);
    const minOrderAmount = Number(storeDraft.minOrderAmount);
    const avgDeliveryMinutes = Number(storeDraft.avgDeliveryMinutes);
    const productName = storeDraft.productName.trim();
    const productPrice = Number(storeDraft.productPrice);
    if (!name || !Number.isFinite(deliveryFee) || !Number.isFinite(minOrderAmount) || !Number.isFinite(avgDeliveryMinutes) || !productName || !Number.isFinite(productPrice) || productPrice <= 0) {
      pushToast('信息不完整', '请把店铺和首个商品信息补齐');
      return;
    }

    const sectionNames = splitLines(storeDraft.sections);
    const sections = (sectionNames.length ? sectionNames : ['招牌', '推荐']).map((item) => ({
      id: makeId('section'),
      name: item,
    }));
    const productSectionLabel = storeDraft.productSection.trim() || sections[0]?.name || '招牌';
    const productSection = sections.find((item) => item.name === productSectionLabel) ?? sections[0];
    const storeId = makeId('store');
    const productId = makeId('product');
    const category = DELIVERY_CATEGORIES.find((item) => item.id === storeDraft.categoryId) ?? DELIVERY_CATEGORIES[0];

    const nextStore: DeliveryStore = {
      id: storeId,
      categoryId: category?.id ?? 'food',
      name,
      icon,
      accent: category?.accent ?? '#ff6a3d',
      subtitle: subtitle || `${name} · 新店`,
      rating: 4.8,
      monthlySales: 0,
      distanceKm: 2.0,
      deliveryFee: Math.max(0, Math.floor(deliveryFee)),
      minOrderAmount: Math.max(0, Math.floor(minOrderAmount)),
      avgDeliveryMinutes: Math.max(10, Math.floor(avgDeliveryMinutes)),
      notice,
      isOpen: true,
      sections,
    };

    const nextProduct: DeliveryMenuProduct = {
      id: productId,
      storeId,
      categoryId: nextStore.categoryId,
      sectionId: productSection?.id ?? sections[0]?.id ?? makeId('section'),
      name: productName,
      price: Math.max(1, productPrice),
      stock: 99,
      sales: 0,
      description: storeDraft.productDescription.trim() || '新上架商品。',
      tag: storeDraft.productTag.trim() || '新品',
      status: '上架',
    };

    setStores((current) => [nextStore, ...current]);
    setProducts((current) => [nextProduct, ...current]);
    setStoreDraft(buildInitialStoreDraft());
    setShowStoreModal(false);
    pushToast('店铺已创建', `${name} 已加入店铺管理`);
  }, [pushToast, storeDraft]);

  const handleToggleStoreField = React.useCallback((storeId: string, patch: Partial<DeliveryStore>) => {
    setStores((current) => current.map((store) => (store.id === storeId ? { ...store, ...patch } : store)));
  }, []);

  const handleToggleProductStatus = React.useCallback((productId: string) => {
    setProducts((current) =>
      current.map((product) => (
        product.id === productId
          ? { ...product, status: product.status === '上架' ? '下架' : '上架' }
          : product
      )),
    );
  }, []);

  const handleCreateProduct = React.useCallback(() => {
    const storeId = productDraft.storeId || stores[0]?.id || '';
    const store = stores.find((item) => item.id === storeId);
    const name = productDraft.name.trim();
    const price = Number(productDraft.price);
    const sectionName = productDraft.section.trim();
    if (!store || !name || !Number.isFinite(price) || price <= 0) {
      pushToast('信息不完整', '请填写店铺、名称和价格');
      return;
    }
    const section = store.sections.find((item) => item.name === sectionName) ?? store.sections[0];
    const nextProduct: DeliveryMenuProduct = {
      id: makeId('product'),
      storeId: store.id,
      categoryId: store.categoryId,
      sectionId: section?.id ?? makeId('section'),
      name,
      price: Math.max(1, price),
      stock: 99,
      sales: 0,
      description: productDraft.description.trim() || '新上架商品。',
      tag: productDraft.tag.trim() || '新品',
      status: '上架',
    };

    setProducts((current) => [nextProduct, ...current]);
    setProductDraft({
      storeId,
      name: '',
      price: '',
      section: '',
      description: '',
      tag: '新品',
    });
    setShowProductModal(false);
    pushToast('商品已新增', `${name} 已加入店铺`);
  }, [productDraft, pushToast, stores]);

  const openRecipeEditor = React.useCallback((recipe?: PrivateKitchenRecipe) => {
    setEditingRecipeId(recipe?.id ?? null);
    setRecipeDraft(buildRecipeDraft(recipe));
    setShowRecipeModal(true);
  }, []);

  const updateRecipeDraftField = React.useCallback((patch: Partial<RecipeDraft>) => {
    setRecipeDraft((current) => ({ ...current, ...patch }));
  }, []);

  const updateRecipeIngredientDraft = React.useCallback((index: number, patch: Partial<RecipeIngredientDraft>) => {
    setRecipeDraft((current) => ({
      ...current,
      ingredients: current.ingredients.map((ingredient, ingredientIndex) => (
        ingredientIndex === index ? { ...ingredient, ...patch } : ingredient
      )),
    }));
  }, []);

  const addRecipeIngredientRow = React.useCallback(() => {
    setRecipeDraft((current) => ({
      ...current,
      ingredients: [
        ...current.ingredients,
        {
          productId: makeId('ingredient'),
          name: '',
          amount: '',
          qty: '1',
          price: '0',
        },
      ],
    }));
  }, []);

  const removeRecipeIngredientRow = React.useCallback((index: number) => {
    setRecipeDraft((current) => {
      const next = current.ingredients.filter((_, ingredientIndex) => ingredientIndex !== index);
      return {
        ...current,
        ingredients: next.length ? next : [{
          productId: makeId('ingredient'),
          name: '',
          amount: '',
          qty: '1',
          price: '0',
        }],
      };
    });
  }, []);

  const handleSaveRecipe = React.useCallback(() => {
    const nextRecipe = draftToKitchenRecipe(recipeDraft);
    if (!nextRecipe.name.trim()) {
      pushToast('信息不完整', '请填写菜谱名称');
      return;
    }
    if (!nextRecipe.ingredients.length) {
      pushToast('信息不完整', '请至少填写一个食材');
      return;
    }

    setKitchenRecipes((current) => {
      const exists = current.some((item) => item.id === nextRecipe.id || item.id === editingRecipeId);
      const savedRecipe = { ...nextRecipe, id: editingRecipeId ?? nextRecipe.id };
      return exists
        ? current.map((item) => (item.id === savedRecipe.id ? savedRecipe : item))
        : [savedRecipe, ...current];
    });
    setSelectedKitchenRecipe((current) => (
      current && (current.id === recipeDraft.id || current.id === editingRecipeId)
        ? draftToKitchenRecipe({ ...recipeDraft, id: editingRecipeId ?? recipeDraft.id })
        : current
    ));
    setShowRecipeModal(false);
    setEditingRecipeId(null);
    pushToast(editingRecipeId ? '菜谱已保存' : '菜谱已新增', `${nextRecipe.name} 已更新`);
  }, [editingRecipeId, pushToast, recipeDraft]);

  const handleGenerateRecipes = React.useCallback(async (userPrompt: string) => {
    const apiKey = (apiSettings.apiKey || '').trim();
    const baseUrl = (apiSettings.baseUrl || '').trim().replace(/\/+$/, '');
    const model = (apiSettings.model || '').trim();

    if (!apiKey || !baseUrl || !model) {
      pushToast('模型未配置', '请先在设置 APP 里填写 API Key、Base URL 和主模型');
      return;
    }

    if (generatingRecipes) return;

    setGeneratingRecipes(true);
    pushToast('正在生成', '机器人正在生成 3 个随机菜谱');

    const existingNames = kitchenRecipes.slice(0, 12).map((recipe) => recipe.name).join('、');
    const promptText = userPrompt.trim();
    const prompt = [
      '你是一个资深家常菜谱编辑，请严格只输出 JSON 数组，不要输出任何解释、标题、markdown 或代码块。',
      '请生成 3 个全新的、随机的、适合外卖App私家厨房的中文家常菜谱。',
      promptText ? `用户补充要求：${promptText}` : '用户没有额外要求，请自由发挥。',
      `菜谱名称不要与这些重复：${existingNames || '无'}`,
      '每个菜谱对象必须包含以下字段：',
      '{',
      '  "name": "菜谱名",',
      '  "subtitle": "一句话简介",',
      '  "accent": "#fb7185",',
      '  "time": "15 分钟",',
      '  "servings": "2 人份",',
      '  "shareText": "分享文案",',
      '  "steps": ["步骤1", "步骤2", "步骤3"],',
      '  "ingredients": [',
      '    { "name": "食材名", "amount": "2 个", "qty": 2, "price": 3.5 }',
      '  ]',
      '}',
      '要求：',
      '1. ingredients 至少 3 个，最多 6 个。',
      '2. qty 必须是正整数，price 必须是正数单价。',
      '3. 菜谱要随机，风格尽量不同。',
      '4. 食材和做法都要用中文。',
    ].join('\n');

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          temperature: 1,
          max_tokens: 1800,
          messages: [
            { role: 'system', content: '你只返回符合要求的 JSON。' },
            { role: 'user', content: prompt },
          ],
        }),
      });

      const responseData = await response.json().catch(() => null);
      if (!response.ok) {
        const errorMessage = responseData?.error?.message || responseData?.message || `HTTP ${response.status}`;
        throw new Error(errorMessage);
      }

      const content = extractContentFromChatCompletion(responseData?.choices?.[0]?.message?.content);
      const parsed = parseModelJsonPayload(content);
      if (!Array.isArray(parsed)) {
        throw new Error('模型未返回菜谱数组');
      }

      const generatedRecipes = parsed
        .filter((item): item is GeneratedKitchenRecipePayload => Boolean(item && typeof item === 'object'))
        .slice(0, 3)
        .map((item, index) => normalizeGeneratedKitchenRecipe(item, index));

      if (!generatedRecipes.length) {
        throw new Error('未生成有效菜谱');
      }

      setKitchenRecipes((current) => [...generatedRecipes, ...current]);
      pushToast('生成成功', `已新增 ${generatedRecipes.length} 个随机菜谱`);
    } catch (error) {
      const message = error instanceof Error ? error.message : '生成失败';
      pushToast('生成失败', message);
    } finally {
      setGeneratingRecipes(false);
    }
  }, [apiSettings.apiKey, apiSettings.baseUrl, apiSettings.model, generatingRecipes, kitchenRecipes, pushToast]);

  const handleDeleteRecipe = React.useCallback((recipeId: string) => {
    const recipe = kitchenRecipes.find((item) => item.id === recipeId);
    const confirmed = typeof window === 'undefined'
      ? true
      : window.confirm(`确定删除菜谱「${recipe?.name ?? '该菜谱'}」吗？删除后无法恢复。`);
    if (!confirmed) return;

    setKitchenRecipes((current) => current.filter((item) => item.id !== recipeId));
    setSelectedKitchenRecipe((current) => (current?.id === recipeId ? null : current));
    if (editingRecipeId === recipeId) {
      setShowRecipeModal(false);
      setEditingRecipeId(null);
    }
    pushToast('菜谱已删除', '菜谱已从管理列表移除');
  }, [editingRecipeId, kitchenRecipes, pushToast]);

  const handleExport = React.useCallback(() => {
    const payload: PersistedState = { favorites, orders, stores, products, kitchenRecipes, cart, profile, address: deliveryAddress };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'delivery-catalog.json';
    anchor.click();
    URL.revokeObjectURL(url);
    pushToast('导出完成', '店铺数据已导出');
  }, [cart, deliveryAddress, favorites, kitchenRecipes, orders, products, profile, pushToast, stores]);

  const handleImportClick = React.useCallback(() => {
    importInputRef.current?.click();
  }, []);

  const handleImportFile = React.useCallback(async (file: File | null) => {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Partial<PersistedState>;
      if (!Array.isArray(parsed.stores) || !Array.isArray(parsed.products)) {
        throw new Error('格式不正确');
      }
      setStores(
        parsed.stores
          .filter((item) => Boolean(item && typeof item === 'object' && typeof (item as { id?: unknown }).id === 'string'))
          .map((item) => normalizeStore(item as Partial<DeliveryStore> & { id: string })),
      );
      setProducts(parsed.products);
      setKitchenRecipes(normalizeKitchenRecipes(parsed.kitchenRecipes));
      setFavorites(Array.isArray(parsed.favorites) ? parsed.favorites.filter((item): item is string => typeof item === 'string') : []);
      setOrders(Array.isArray(parsed.orders) ? parsed.orders : []);
      setCart(Array.isArray(parsed.cart) ? parsed.cart.filter(isCartEntry).map((entry) => ({ ...entry, qty: Math.floor(entry.qty) })) : []);
      const nextProfile = parsed.profile && typeof parsed.profile === 'object' && typeof (parsed.profile as DeliveryProfileRecord).username === 'string'
        ? {
            username: (parsed.profile as DeliveryProfileRecord).username,
            avatar: typeof (parsed.profile as DeliveryProfileRecord).avatar === 'string' ? (parsed.profile as DeliveryProfileRecord).avatar : DEFAULT_PROFILE.avatar,
          }
        : DEFAULT_PROFILE;
      setProfile(nextProfile);
      setProfileDraft(nextProfile);
      const nextAddress = normalizeAddress(parsed.address);
      setDeliveryAddress(nextAddress);
      setAddressDraft(nextAddress);
      setImportError(null);
      pushToast('导入成功', '店铺数据已更新');
    } catch {
      setImportError('导入失败，请选择正确的 JSON 文件');
      pushToast('导入失败', '文件内容格式不正确');
    }
  }, [pushToast]);

  const navButton = (nextPage: DeliveryAppPage, label: string, icon: React.ReactNode) => (
    <button
      type="button"
      className={`${styles.navButton} ${activeTab === nextPage ? styles.navButtonActive : ''}`}
      onClick={() => {
        if (nextPage === 'me') {
          setProfileDraft(profile);
          setIsProfileEditing(false);
          setMePanel('account');
        }
        if (nextPage === 'checkout') {
          setCheckoutPanel('place');
        }
        if (nextPage === 'delivery') {
          setDeliveryView('category');
          setActiveStoreId(null);
        }
        setPage(nextPage);
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  const renderHome = () => {
    const deliveryCards = deliveryProgressOrders
      .map((order) => ({
        order,
        snapshot: createDeliveryTracking(order.createdAt, order.deliveryAddress ?? deliveryAddress, clockTick),
      }))
      .filter((item) => {
        const isDelivered = item.order.status === '已送达' || item.snapshot.stage === '送达';
        return !(isDelivered && item.order.deliveryProgressDismissed);
      });

    return (
      <>
        {deliveryCards.length > 0 ? (
          <section className={`${styles.section} ${styles.homeDeliverySection}`}>
            <div className={styles.deliveryProgressCarousel} aria-label="配送进度">
              {deliveryCards.map(({ order, snapshot }) => (
                <div key={order.id} className={styles.deliveryProgressCard}>
                  {order.status === '已送达' || snapshot.stage === '送达' ? (
                    <div className={styles.deliveryDeliveredSummary}>
                      <p className={styles.deliveryProgressKicker}>配送进度</p>
                      <h2 className={styles.deliveryProgressTitle}>{formatOrderCode(order.createdAt)}</h2>
                      <p className={styles.deliveryDeliveredText}>骑手已送达</p>
                      <button
                        type="button"
                        className={styles.deliveryDeliveredButton}
                        onClick={() => {
                          setOrders((current) =>
                            current.map((item) => (
                              item.id === order.id ? { ...item, deliveryProgressDismissed: true } : item
                            )),
                          );
                        }}
                      >
                        确定
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className={styles.deliveryProgressHeader}>
                        <div>
                          <p className={styles.deliveryProgressKicker}>配送进度</p>
                          <h2 className={styles.deliveryProgressTitle}>{order.title}</h2>
                        </div>
                        <div className={styles.deliveryProgressDistance}>
                          距您 {formatDistance(snapshot.driverDistanceKm)}
                        </div>
                      </div>
                      <div className={styles.deliveryProgressTime}>
                        预计还有 {snapshot.etaMinutes} 分钟送达
                      </div>
                      <div className={styles.deliveryTimeline}>
                        <div className={styles.deliveryTimelineRail} />
                        <div className={styles.deliveryTimelineFill} style={{ width: `${snapshot.progress}%` }} />
                        {[
                          { label: '接单', at: 12 },
                          { label: '出餐', at: 38 },
                          { label: '配送', at: 68 },
                          { label: '送达', at: 100 },
                        ].map((step) => (
                          <div key={step.label} className={styles.deliveryTimelineStep}>
                            <span className={`${styles.deliveryTimelineDot} ${snapshot.progress >= step.at ? styles.deliveryTimelineDotActive : ''}`} />
                            <span>{step.label}</span>
                          </div>
                        ))}
                        <div className={styles.deliveryTimelineBubble} style={{ left: `${snapshot.progress}%` }}>
                          <Bike size={14} />
                          <span>{formatDistance(snapshot.driverDistanceKm)}</span>
                        </div>
                      </div>
                      <p className={styles.deliveryProgressCaption}>
                        {snapshot.stage === '送达'
                          ? '骑手已送达目的地'
                          : '骑手已取餐，正在快马加鞭赶往目的地'}
                      </p>
                    </>
                  )}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className={styles.section}>
        <div className={styles.sectionTitleRow}>
          <div>
            <h2 className={styles.sectionTitle}>快捷入口</h2>
            <p className={styles.sectionHint}>直接进入店铺分类页。</p>
          </div>
        </div>
        <div className={styles.searchBar}>
          <Search size={18} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索店铺或分类"
          />
        </div>
        <div style={{ height: 12 }} />
        <div className={styles.gridTiles}>
          {DELIVERY_CATEGORIES.filter((item) => {
            const query = search.trim().toLowerCase();
            if (!query) return true;
            return item.name.toLowerCase().includes(query) || item.id.includes(query);
          }).map((item) => (
            <button
              key={item.id}
              type="button"
              className={styles.tileButton}
              onClick={() => handleCategorySelect(item.id)}
            >
              <div>
                <strong>{item.name}</strong>
                <span>
                  {item.id === 'kitchen'
                    ? '今天想吃什么'
                    : item.id === 'custom'
                      ? '查看购物车'
                      : '查看店铺列表'}
                </span>
              </div>
              <div className={styles.tileIcon} style={{ background: item.accent }}>
                {item.icon}
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionTitleRow}>
          <div>
            <h2 className={styles.sectionTitle}>推荐店铺</h2>
            <p className={styles.sectionHint}>选一家店，先看店铺再看商品。</p>
          </div>
        </div>
        <div className={styles.homeStorePreview}>
          {stores.map((store) => (
            <button key={store.id} type="button" className={styles.homeStoreCard} onClick={() => handleOpenStore(store.id)}>
              <div className={styles.homeStoreIcon} style={{ background: store.accent }}>
                {isAvatarImage(store.icon.trim()) ? (
                  <img className={styles.homeStoreIconImage} src={store.icon.trim()} alt={store.name} />
                ) : (
                  <span>{store.icon}</span>
                )}
              </div>
              <div className={styles.homeStoreBody}>
                <strong>{store.name}</strong>
                <span>{store.subtitle}</span>
                <div className={styles.homeStoreMeta}>
                  <span className={styles.homeStoreScore}>评分 {store.rating}</span>
                  <span className={styles.homeStoreDistance}>{formatDistance(store.distanceKm)} {store.avgDeliveryMinutes}分钟</span>
                </div>
              </div>
              <ChevronRight size={18} />
            </button>
          ))}
        </div>
      </section>
      </>
    );
  };

  const renderKitchenView = () => (
    <div className={styles.storePage}>
      <aside className={styles.storeSidebar}>
        <p className={styles.sidebarTitle}>菜谱</p>
        <button
          type="button"
          className={`${styles.categoryItem} ${!selectedKitchenRecipe ? styles.categoryItemActive : ''}`}
          onClick={() => setSelectedKitchenRecipe(null)}
        >
          <span>全部菜谱</span>
        </button>
        <button type="button" className={styles.storeSectionBack} onClick={() => handleCategorySelect('custom')}>
          去购物车
        </button>
      </aside>

      <main className={styles.storeMain}>
        <div className={styles.kitchenPage}>
          <section className={styles.kitchenSection}>
            <div className={styles.sectionTitleRow}>
              <div>
                <h2 className={styles.sectionTitle}>家常菜谱</h2>
                <p className={styles.sectionHint}>点开就能看到食材清单和做法。</p>
              </div>
            </div>

            <div className={styles.kitchenRecipeGrid}>
              {kitchenRecipes.map((recipe) => (
                <button
                  key={recipe.id}
                  type="button"
                  data-recipe-id={recipe.id}
                  className={styles.kitchenRecipeCard}
                  onClick={() => setSelectedKitchenRecipe(recipe)}
                >
                  <div className={styles.kitchenRecipeTop}>
                    <strong>{recipe.name}</strong>
                  </div>
                  <p className={styles.kitchenRecipeSub}>{recipe.subtitle}</p>
                  <div className={styles.kitchenRecipeMeta}>
                    <span>{recipe.servings}</span>
                    <span>{recipe.ingredients.length} 种食材</span>
                  </div>
                  <div className={styles.kitchenRecipeFooter}>
                    <span>查看菜谱</span>
                    <ChevronRight size={16} />
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>

      </main>
      {selectedKitchenRecipe ? (
        <div className={styles.sheetBackdrop} onClick={() => setSelectedKitchenRecipe(null)}>
          <div className={`${styles.sheet} ${styles.sheetTall}`} onClick={(event) => event.stopPropagation()}>
            <div className={styles.sheetHeader}>
              <div className={styles.sheetIcon}>
                <UtensilsCrossed size={18} />
              </div>
              <h3 className={styles.sheetTitle}>{selectedKitchenRecipe.name}</h3>
              <p className={styles.sheetDesc}>
                {selectedKitchenRecipe.subtitle} · {selectedKitchenRecipe.time} · {selectedKitchenRecipe.servings}
              </p>
            </div>
            <div className={styles.sheetScrollBody}>
              <div className={styles.kitchenIngredientBlock}>
                <p className={styles.kitchenIngredientTitle}>所需食材</p>
                <div className={styles.kitchenIngredientList}>
                  {selectedKitchenRecipe.ingredients.map((ingredient) => {
                    const product = productMap.get(ingredient.productId);
                    return (
                      <span key={ingredient.productId} className={styles.kitchenIngredientPill}>
                        {ingredient.name ?? product?.name ?? ingredient.productId} {ingredient.amount} · ￥{ingredient.price.toFixed(2)}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className={styles.kitchenIngredientBlock}>
                <p className={styles.kitchenIngredientTitle}>做法</p>
                <ol className={styles.kitchenStepList}>
                  {selectedKitchenRecipe.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </div>

              <div className={styles.sheetActions}>
                <button
                  className={styles.sheetActionPrimary}
                  type="button"
                  onClick={() => handleAddRecipeToCart(selectedKitchenRecipe)}
                >
                  一键加购
                </button>
                <button className={styles.sheetAction} type="button" onClick={() => void handleShareRecipe(selectedKitchenRecipe)}>
                  分享菜谱
                </button>
                <button className={styles.sheetActionGhost} type="button" onClick={() => setSelectedKitchenRecipe(null)}>
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );

  const renderDeliveryCategory = () => (
    <div className={styles.storePage}>
      <aside className={styles.storeSidebar}>
        <p className={styles.sidebarTitle}>分类</p>
        {DELIVERY_CATEGORIES.map((category) => (
          <button
            key={category.id}
            type="button"
            className={`${styles.categoryItem} ${activeCategoryId === category.id ? styles.categoryItemActive : ''}`}
            onClick={() => handleCategorySelect(category.id)}
          >
            <span>{category.name}</span>
          </button>
        ))}
      </aside>

      <main className={styles.storeMain}>
        <div className={styles.searchBar}>
          <Search size={18} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索店铺名称"
          />
        </div>

        <div className={styles.deliveryStoreList}>
          {activeCategoryStores.length ? activeCategoryStores.map((store) => (
            <button
              key={store.id}
              type="button"
              className={styles.deliveryStoreCard}
              onClick={() => handleOpenStore(store.id)}
            >
              <div className={styles.deliveryStoreIcon} style={{ background: store.accent }}>
                {isAvatarImage(store.icon.trim()) ? (
                  <img className={styles.deliveryStoreIconImage} src={store.icon.trim()} alt={store.name} />
                ) : (
                  <span>{store.icon}</span>
                )}
              </div>
              <div className={styles.deliveryStoreBody}>
                <h3 className={styles.deliveryStoreName}>{store.name}</h3>
                <p className={styles.deliveryStoreText}>{store.subtitle}</p>
                <div className={styles.deliveryStoreMeta}>
                  <span>评分 {store.rating}</span>
                  <span>配送费 {formatMoney(store.deliveryFee)}</span>
                  <span>{store.isOpen ? '营业中' : '休息中'}</span>
                </div>
              </div>
              <ChevronRight size={18} />
            </button>
          )) : (
            <div className={styles.emptyState}>当前分类下还没有店铺。</div>
          )}
        </div>
      </main>
    </div>
  );

  const renderStoreDetail = () => {
    if (!activeStore) {
      return renderDeliveryCategory();
    }

    const sectionGroups = activeStoreSections.map((section) => ({
      section,
      products: activeStoreAvailableProducts.filter((product) => product.sectionId === section.id),
    }));

    return (
      <div className={styles.storeDetailLayout}>
        <aside className={styles.storeSectionRail}>
          <p className={styles.sidebarTitle}>店铺分类</p>
          {activeStoreSections.map((section) => (
            <button
              key={section.id}
              type="button"
              className={styles.storeSectionItem}
              onClick={() => {
                const node = document.querySelector(`[data-section-id="${section.id}"]`) as HTMLElement | null;
                node?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              <span>{section.name}</span>
            </button>
          ))}
          <button type="button" className={styles.storeSectionBack} onClick={handleCloseStore}>
            返回店铺列表
          </button>
        </aside>

        <main className={styles.storeDetailMain}>
          <section className={styles.storeHeroCard}>
            <div className={styles.storeHeroTop}>
              <div className={styles.storeHeroIcon} style={{ background: activeStore.accent }}>
                {isAvatarImage(activeStore.icon.trim()) ? (
                  <img className={styles.storeHeroIconImage} src={activeStore.icon.trim()} alt={activeStore.name} />
                ) : (
                  <span>{activeStore.icon}</span>
                )}
              </div>
              <div className={styles.storeHeroInfo}>
                <h2 className={styles.storeHeroName}>{activeStore.name}</h2>
                <p className={styles.storeHeroSub}>{activeStore.subtitle}</p>
              </div>
            </div>
            <div className={styles.storeHeroMetaRow}>
              <span>评分 {activeStore.rating}</span>
              <span>配送费 {formatMoney(activeStore.deliveryFee)}</span>
              <span>起送 {formatMoney(activeStore.minOrderAmount)}</span>
              <span>{activeStore.avgDeliveryMinutes} 分钟送达</span>
            </div>
            <p className={styles.storeHeroNotice}>{activeStore.notice}</p>
          </section>

          <div className={styles.storeSectionList}>
            {sectionGroups.map(({ section, products: sectionProducts }) => (
              <section key={section.id} className={styles.storeSectionBlock} data-section-id={section.id}>
                <div className={styles.storeSectionHeader}>
                  <h3>{section.name}</h3>
                  <span>{sectionProducts.length} 款</span>
                </div>
                <div className={styles.storeProductList}>
                  {sectionProducts.length ? sectionProducts.map((product) => {
                    const qty = cart.find((item) => item.productId === product.id)?.qty ?? 0;
                    return (
                      <article key={product.id} className={`${styles.storeProductCard} ${product.status === '下架' ? styles.storeProductDisabled : ''}`}>
                        <button type="button" className={styles.storeProductInfo} onClick={() => setSelectedProduct(product)}>
                          <div className={styles.storeProductTitleRow}>
                            <h4 className={styles.storeProductTitle}>{product.name}</h4>
                          </div>
                          <p className={styles.storeProductDesc}>{product.description}</p>
                          <div className={styles.storeProductMeta}>
                            <span className={styles.storeProductPrice}>{formatMoney(product.price)}</span>
                            <span className={styles.tag}>{product.tag}</span>
                            {qty > 0 ? <span className={styles.productCount}>已加 x{qty}</span> : null}
                          </div>
                        </button>
                        <button
                          className={styles.storeProductAdd}
                          type="button"
                          onClick={() => handleAddToCart(product)}
                          disabled={product.status === '下架'}
                        >
                          <Plus size={16} />
                        </button>
                      </article>
                    );
                  }) : (
                    <div className={styles.emptyState}>这一栏暂时还没有商品。</div>
                  )}
                </div>
              </section>
            ))}
          </div>

        </main>
      </div>
    );
  };

  const renderCartView = () => (
    <div className={styles.storePage}>
      <aside className={styles.storeSidebar}>
        <p className={styles.sidebarTitle}>分类</p>
        {DELIVERY_CATEGORIES.map((category) => (
          <button
            key={category.id}
            type="button"
            className={`${styles.categoryItem} ${activeCategoryId === category.id ? styles.categoryItemActive : ''}`}
            onClick={() => handleCategorySelect(category.id)}
          >
            <span>{category.name}</span>
          </button>
        ))}
      </aside>

      <main className={`${styles.storeMain} ${styles.cartMain}`}>
        <div className={styles.cartList}>
          {cartStoreGroups.length ? cartStoreGroups.map(({ storeId, store, items }) => (
            <section key={storeId} className={styles.cartStoreGroup}>
              <button
                type="button"
                className={styles.cartStoreHeader}
                onClick={() => {
                  if (store) {
                    handleOpenStore(store.id);
                    return;
                  }
                  handleCategorySelect('food');
                }}
              >
                <div className={styles.cartStoreIcon} style={{ background: store?.accent ?? '#ff6a3d' }}>
                  {store ? (
                    isAvatarImage(store.icon.trim()) ? (
                      <img className={styles.cartStoreIconImage} src={store.icon.trim()} alt={store.name} />
                    ) : (
                      <span>{store.icon}</span>
                    )
                  ) : (
                    <Store size={16} />
                  )}
                </div>
                <div className={styles.cartStoreInfo}>
                  <strong className={styles.cartStoreName}>{store?.name ?? DELIVERY_MERCHANT.name}</strong>
                  <span className={styles.cartStoreMeta}>{items.length} 件商品</span>
                </div>
                <ChevronRight size={16} className={styles.cartStoreArrow} />
              </button>

              <div className={styles.cartStoreList}>
                {items.map(({ product, qty }) => (
                  <article key={product.id} className={styles.cartCard}>
                    <div className={styles.cartThumb}>{readProductInitial(product)}</div>
                    <div className={styles.cartBody}>
                      <div className={styles.cartTitleRow}>
                        <h3 className={styles.cartName}>
                          {product.name} <span className={styles.cartQtyLabel}>x{qty}</span>
                        </h3>
                        <button
                          className={styles.cartDeleteButton}
                          type="button"
                          onClick={() => removeCartItem(product.id)}
                          aria-label={`删除 ${product.name}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <p className={styles.cartDesc}>{product.description}</p>
                      <div className={styles.cartPriceRow}>
                        <p className={styles.cartPrice}>{formatMoney(product.price)}</p>
                        <div className={styles.qtyStepper}>
                          <button type="button" onClick={() => adjustCartQty(product.id, -1)} aria-label="减少数量">
                            -
                          </button>
                          <span>{qty}</span>
                          <button type="button" onClick={() => adjustCartQty(product.id, 1)} aria-label="增加数量">
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )) : (
            <div className={styles.emptyState}>购物车里还没有商品。</div>
          )}
        </div>

        <div className={styles.cartFooter}>
          <div className={styles.cartFooterTotal}>
            <span className={styles.cartFooterAmount}>总计 <strong>{formatMoney(cartTotal)}</strong></span>
          </div>
          <button
            className={styles.checkoutButton}
            type="button"
            onClick={() => {
              if (!cartProducts.length) {
                pushToast('购物车为空', '请先加入商品');
                return;
              }
              setCheckoutPanel('place');
              setPage('checkout');
            }}
            disabled={!cartProducts.length}
          >
            结算
          </button>
        </div>
      </main>
    </div>
  );

  const renderDelivery = () => (
    deliveryView === 'store'
      ? renderStoreDetail()
      : deliveryView === 'cart'
        ? renderCartView()
        : deliveryView === 'kitchen'
          ? renderKitchenView()
          : renderDeliveryCategory()
  );

  const renderOrderHistoryList = () => (
    <div className={styles.historyList}>
      {orders.length ? orders.map((order) => {
        const snapshot = order.status === '配送中' || order.status === '已送达' || Boolean(order.delivery) ? getLiveOrderSnapshot(order) : null;
        return (
          <article key={order.id} className={styles.historyCard}>
            <button type="button" className={styles.historyCardButton} onClick={() => setSelectedOrder(order)}>
              <div className={styles.historyRow}>
                <strong>{order.title}</strong>
                <span>{formatMoney(order.amount)}</span>
              </div>
              <div className={styles.historyCode}>订单编码 {formatOrderCode(order.createdAt)}</div>
              <div className={styles.historyMeta}>
                <span>{order.merchantName}</span>
                <span>{new Date(order.createdAt).toLocaleString('zh-CN', { hour12: false })}</span>
                <span className={styles.historyStatusPill}>{getOrderStatusLabel(order, snapshot)}</span>
              </div>
            </button>
          </article>
        );
      }) : <div className={styles.emptyState}>还没有历史订单。</div>}
    </div>
  );

  const managementStores = React.useMemo(() => {
    const query = managementSearch.trim().toLowerCase();
    return stores.filter((store) => {
      if (store.categoryId === 'kitchen') return false;
      if (!query) return true;
      return [store.name, store.subtitle, store.notice].some((value) => value.toLowerCase().includes(query));
    });
  }, [managementSearch, stores]);

  const recipeManagementRecipes = React.useMemo(() => {
    const query = managementSearch.trim().toLowerCase();
    if (!query) return kitchenRecipes;
    return kitchenRecipes.filter((recipe) => [
      recipe.name,
      recipe.subtitle,
      recipe.shareText,
      ...recipe.ingredients.map((ingredient) => `${ingredient.name} ${ingredient.amount} ${ingredient.price}`),
    ].some((value) => value.toLowerCase().includes(query)));
  }, [kitchenRecipes, managementSearch]);

  const openProductModal = React.useCallback((storeId: string) => {
    const store = stores.find((item) => item.id === storeId) ?? stores[0];
    setProductDraft({
      storeId: store?.id ?? '',
      name: '',
      price: '',
      section: store?.sections[0]?.name ?? '',
      description: '',
      tag: '新品',
    });
    setShowProductModal(true);
  }, [stores]);

  const renderCheckout = () => (
    <div className={styles.storePage}>
      <aside className={styles.checkoutSidebar}>
        <p className={styles.sidebarTitle}>下单</p>
        {[
          { key: 'place' as const, label: '下单' },
          { key: 'history' as const, label: '历史订单' },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            className={`${styles.checkoutSideItem} ${checkoutPanel === item.key ? styles.checkoutSideItemActive : ''}`}
            onClick={() => setCheckoutPanel(item.key)}
          >
            <span>{item.label}</span>
          </button>
        ))}
      </aside>

      <main className={styles.checkoutMain}>
        {checkoutPanel === 'place' ? (
          cartProducts.length === 0 ? (
            <section className={styles.checkoutSection}>
              <h2 className={styles.checkoutSectionTitle}>订单清单</h2>
              <div className={styles.emptyState}>购物车里还没有商品。</div>
            </section>
          ) : (
          <>
            <section className={styles.checkoutSection}>
              <h2 className={styles.checkoutSectionTitle}>配送地址</h2>
              <button type="button" className={styles.checkoutAddressCard} onClick={() => openAddressPanel('checkout')}>
                <div>
                  <p className={styles.checkoutAddressTitle}>{deliveryAddress.title}</p>
                  <p className={styles.checkoutAddressHint}>{deliveryAddress.recipient}  {deliveryAddress.phone}</p>
                </div>
                <ChevronRight size={18} />
              </button>
            </section>

            <section className={styles.checkoutSection}>
              <h2 className={styles.checkoutSectionTitle}>订单清单</h2>
              {cartProducts.length ? cartProducts.map(({ product, qty }) => (
                <div key={product.id} className={styles.checkoutRuleRow}>
                  <span>{product.name} x{qty}</span>
                  <strong>{formatMoney(product.price * qty)}</strong>
                </div>
              )) : <div className={styles.emptyState}>购物车里还没有商品。</div>}
              <div className={styles.checkoutRuleRow}>
                <span>配送费</span>
                <strong>{formatMoney(0)}</strong>
              </div>
              <div className={styles.checkoutRuleRow}>
                <span>优惠</span>
                <strong className={styles.checkoutDiscount}>-{formatMoney(0)}</strong>
              </div>
            </section>

            <section className={styles.checkoutTotalSection}>
              <div className={styles.checkoutTotalRow}>
                <span>总计</span>
                <strong>{formatMoney(cartTotal)}</strong>
              </div>
              <button
                className={styles.checkoutSubmitButton}
                type="button"
                onClick={() => setShowCheckoutActions(true)}
                disabled={!cartProducts.length}
              >
                下单
              </button>
            </section>
          </>
          )
        ) : (
          <section className={styles.checkoutSection}>
            <h2 className={styles.checkoutSectionTitle}>历史订单</h2>
            {renderOrderHistoryList()}
          </section>
        )}
      </main>

    </div>
  );

  const renderMe = () => (
    <div className={styles.sideLayout}>
      <aside className={styles.sideRail}>
        <h2 className={styles.sideTitle}>我的</h2>
        <nav className={styles.sideMenu}>
          {[
            { key: 'account', label: '账户信息' },
            { key: 'orders', label: '订单历史' },
            { key: 'address', label: '地址管理' },
            { key: 'product', label: '商品管理' },
            { key: 'recipe', label: '菜谱管理' },
            { key: 'help', label: '帮助' },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              className={`${styles.sideMenuItem} ${
                (item.key === 'account' && mePanel === 'account')
                || (item.key === 'orders' && mePanel === 'orders')
                || (item.key === 'product' && mePanel === 'management')
                || (item.key === 'address' && mePanel === 'address')
                || (item.key === 'recipe' && mePanel === 'recipe')
                  ? styles.sideMenuItemActive
                  : ''
              }`}
              onClick={() => {
                if (item.key === 'account') {
                  setProfileDraft(profile);
                  setIsProfileEditing(false);
                  setMePanel('account');
                  return;
                }
                if (item.key === 'orders') {
                  setMePanel('orders');
                  return;
                }
                if (item.key === 'address') {
                  openAddressPanel('me');
                  return;
                }
                if (item.key === 'product') {
                  setMePanel('management');
                  return;
                }
                if (item.key === 'recipe') {
                  setMePanel('recipe');
                  return;
                }
                setMePanel('overview');
              }}
            >
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <section className={styles.sideContent}>
        {mePanel === 'account' ? (
          <div className={styles.managementGrid}>
            <div className={styles.managementHeader}>
              <div className={styles.headerSpacer} />
              <h3 className={styles.managementTitle}>账户信息</h3>
              <div className={styles.headerSpacer} />
            </div>

            <section className={styles.quickPanel}>
              <div className={`${styles.profileEditorHeader} ${!isProfileEditing ? styles.profileEditorHeaderView : ''}`}>
                {isProfileEditing ? (
                  <button
                    type="button"
                    className={`${styles.profileAvatarPreview} ${styles.profileAvatarButton}`}
                    onClick={() => profileAvatarInputRef.current?.click()}
                    aria-label="上传头像"
                  >
                    {isAvatarImage(profileDraft.avatar.trim()) ? (
                      <img className={styles.profileAvatarImage} src={profileDraft.avatar.trim()} alt="头像预览" />
                    ) : (
                      <span>{profileDraft.avatar.trim() || DEFAULT_PROFILE.avatar}</span>
                    )}
                  </button>
                ) : (
                  <div className={styles.profileAvatarPreview}>
                    {isAvatarImage(profile.avatar.trim()) ? (
                      <img className={styles.profileAvatarImage} src={profile.avatar.trim()} alt="头像" />
                    ) : (
                      <span>{profile.avatar.trim() || DEFAULT_PROFILE.avatar}</span>
                    )}
                  </div>
                )}
                <div className={styles.profileEditorMeta}>
                  <h4 className={styles.addressPanelTitle}>
                    {(isProfileEditing ? profileDraft.username : profile.username).trim() || DEFAULT_PROFILE.username}
                  </h4>
                </div>
                {!isProfileEditing ? (
                  <button
                    type="button"
                    className={styles.profileEditButton}
                    onClick={() => {
                      setProfileDraft(profile);
                      setIsProfileEditing(true);
                    }}
                  >
                    <Pencil size={15} />
                    <span>编辑</span>
                  </button>
                ) : null}
              </div>

              {isProfileEditing ? (
                <>
                  <input
                    ref={profileAvatarInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(event) => {
                      handleProfileAvatarChange(event.target.files?.[0] ?? null);
                      event.target.value = '';
                    }}
                  />

                  <div className={styles.modalForm}>
                    <div className={styles.modalField}>
                      <label>用户名</label>
                      <input
                        value={profileDraft.username}
                        onChange={(event) => setProfileDraft((current) => ({ ...current, username: event.target.value }))}
                        placeholder="请输入用户名"
                      />
                    </div>
                  </div>

                  <div className={styles.addressActions}>
                    <button className={styles.sheetActionPrimary} type="button" onClick={handleSaveProfile}>
                      保存资料
                    </button>
                    <button
                      className={styles.sheetActionGhost}
                      type="button"
                      onClick={() => {
                        setProfileDraft(profile);
                        setIsProfileEditing(false);
                      }}
                    >
                      取消
                    </button>
                  </div>
                </>
              ) : null}
            </section>
          </div>
        ) : mePanel === 'orders' ? (
          <div className={styles.managementGrid}>
            <div className={styles.managementHeader}>
              <div className={styles.headerSpacer} />
              <h3 className={styles.managementTitle}>订单历史</h3>
              <div className={styles.headerSpacer} />
            </div>

            <section className={styles.quickPanel}>
              <p className={styles.ordersHint}>这里展示的就是下单页里的历史订单。</p>
              {renderOrderHistoryList()}
            </section>
          </div>
        ) : mePanel === 'address' ? (
          <div className={styles.managementGrid}>
            <div className={styles.managementHeader}>
              <div className={styles.headerSpacer} />
              <h3 className={styles.managementTitle}>地址管理</h3>
              <div className={styles.headerSpacer} />
            </div>

            <section className={styles.quickPanel}>
              <div className={styles.addressPanelHeader}>
                <div>
                  <p className={styles.addressPanelLabel}>当前收货地址</p>
                  <h4 className={styles.addressPanelTitle}>{deliveryAddress.title}</h4>
                  <p className={styles.addressPanelHint}>修改后会同步到下单页。</p>
                </div>
                <span className={styles.addressPanelBadge}>同步中</span>
              </div>

              <div className={styles.addressPreview}>
                <strong>{addressDraft.title.trim() || '未设置地址名称'}</strong>
                <span>{addressDraft.recipient.trim() || '请填写收货人'}  {addressDraft.phone.trim() || '请填写电话号码'}</span>
              </div>

              <div className={styles.modalForm}>
                <div className={styles.modalField}>
                  <label>地址名称</label>
                  <input
                    value={addressDraft.title}
                    onChange={(event) => setAddressDraft((current) => ({ ...current, title: event.target.value }))}
                    placeholder="例如：杭州余杭区·默认地址"
                  />
                </div>
                <div className={styles.modalField}>
                  <label>收货人</label>
                  <input
                    value={addressDraft.recipient}
                    onChange={(event) => setAddressDraft((current) => ({ ...current, recipient: event.target.value }))}
                    placeholder="请输入收货人姓名"
                  />
                </div>
                <div className={styles.modalField}>
                  <label>电话号码</label>
                  <input
                    value={addressDraft.phone}
                    onChange={(event) => setAddressDraft((current) => ({ ...current, phone: event.target.value }))}
                    placeholder="请输入手机号"
                  />
                </div>
              </div>

              <div className={styles.addressActions}>
                <button className={styles.sheetActionPrimary} type="button" onClick={handleSaveAddress}>
                  保存地址
                </button>
                <button
                  className={styles.sheetActionGhost}
                  type="button"
                  onClick={() => {
                    setAddressDraft(deliveryAddress);
                    if (addressOriginPage === 'checkout') {
                      setPage('checkout');
                    } else {
                      setMePanel('overview');
                    }
                    setAddressOriginPage(null);
                  }}
                >
                  返回
                </button>
              </div>
            </section>
          </div>
        ) : mePanel === 'management' ? (
          <>
            <div className={styles.managementToolbar}>
              <div className={styles.managementSearchBar}>
                <Search size={16} />
                <input
                  value={managementSearch}
                  onChange={(event) => setManagementSearch(event.target.value)}
                  placeholder="搜索店铺名称、简介、提示"
                />
              </div>
              <button className={`${styles.quickButton} ${styles.quickButtonPrimary}`} type="button" onClick={() => setShowStoreModal(true)}>
                <Plus size={16} />
                新增店铺
              </button>
              <button className={styles.quickButton} type="button" onClick={handleExport}>
                <Download size={16} />
                导出底库
              </button>
              <button className={styles.quickButton} type="button" onClick={handleImportClick}>
                <Upload size={16} />
                导入底库
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept="application/json"
                hidden
                onChange={(event) => {
                  void handleImportFile(event.target.files?.[0] ?? null);
                  event.target.value = '';
                }}
              />
            </div>

            {importError ? <p className={styles.sectionHint} style={{ marginTop: 10, color: '#ef4444' }}>{importError}</p> : null}

            <div className={styles.managementStoreList}>
              {managementStores.map((store) => {
                const category = DELIVERY_CATEGORIES.find((item) => item.id === store.categoryId);
                const storeProducts = products.filter((product) => product.storeId === store.id);
                return (
                  <article key={store.id} className={styles.managementStoreCard}>
                    <div className={styles.managementStoreHeader}>
                      <button
                        type="button"
                        className={styles.managementStoreIconButton}
                        onClick={(event) => {
                          const input = event.currentTarget.parentElement?.querySelector<HTMLInputElement>(`input[data-store-id="${store.id}"]`);
                          input?.click();
                          setActiveStoreId(store.id);
                        }}
                        aria-label={`${store.name} 图标`}
                      >
                        {store.icon.startsWith('data:image/') || /^https?:\/\//.test(store.icon) ? (
                          <img className={styles.managementStoreIconImage} src={store.icon} alt={store.name} />
                        ) : (
                          <span>{store.icon}</span>
                        )}
                      </button>
                      <input
                        className={styles.managementStoreIconInputHidden}
                        type="file"
                        accept="image/*"
                        hidden
                        data-store-id={store.id}
                        onChange={(event) => {
                          void handleStoreIconChange(store.id, event.target.files?.[0] ?? null);
                          event.target.value = '';
                        }}
                      />
                      <div className={styles.managementStoreBody}>
                        <input
                          className={styles.managementStoreNameInput}
                          value={store.name}
                          onChange={(event) => handleToggleStoreField(store.id, { name: event.target.value })}
                          aria-label={`${store.name} 名称`}
                        />
                        <input
                          className={styles.managementStoreSubInput}
                          value={store.subtitle}
                          onChange={(event) => handleToggleStoreField(store.id, { subtitle: event.target.value })}
                          aria-label={`${store.name} 简介`}
                        />
                        <div className={styles.managementStoreMeta}>
                          <span>{category?.name ?? '未分类'}</span>
                          <span>评分 {store.rating}</span>
                          <span>{store.isOpen ? '营业中' : '休息中'}</span>
                        </div>
                      </div>
                      <button
                        className={styles.managementStoreToggle}
                        type="button"
                        onClick={() => handleToggleStoreField(store.id, { isOpen: !store.isOpen })}
                      >
                        {store.isOpen ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                      </button>
                    </div>

                    <div className={styles.managementStoreNoticeRow}>
                      <span>提示</span>
                      <input
                        className={styles.managementStoreNoticeInput}
                        value={store.notice}
                        onChange={(event) => handleToggleStoreField(store.id, { notice: event.target.value })}
                      />
                    </div>

                    <div className={styles.managementSectionList}>
                      {store.sections.map((section) => (
                        <div key={section.id} className={styles.managementSectionPill}>
                          {section.name}
                        </div>
                      ))}
                    </div>

                    <div className={styles.managementStoreAddRow}>
                      <button
                        type="button"
                        className={styles.managementStoreAddButton}
                        onClick={() => openProductModal(store.id)}
                      >
                        <Plus size={16} />
                        新增商品
                      </button>
                    </div>

                    <div className={styles.managementProductList}>
                      {storeProducts.map((product) => (
                        <article key={product.id} className={styles.managementProductRow}>
                          <button
                            className={`${styles.managementProductToggle} ${product.status === '上架' ? styles.managementProductOn : styles.managementProductOff}`}
                            type="button"
                            onClick={() => handleToggleProductStatus(product.id)}
                          >
                            {product.status}
                          </button>
                          <div className={styles.managementProductBody}>
                            <h4>{product.name}</h4>
                            <p>{product.description}</p>
                            <div className={styles.managementProductMeta}>
                              <span>{formatMoney(product.price)}</span>
                              <span>{product.tag}</span>
                              <span>库存 {product.stock}</span>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        ) : mePanel === 'recipe' ? (
          <>
            <div className={styles.managementToolbar}>
              <div className={styles.managementSearchBar}>
                <Search size={16} />
                <input
                  value={managementSearch}
                  onChange={(event) => setManagementSearch(event.target.value)}
                  placeholder="搜索菜谱、食材、做法"
                />
              </div>
              <button className={`${styles.quickButton} ${styles.quickButtonPrimary}`} type="button" onClick={() => openRecipeEditor()}>
                <Plus size={16} />
                新增菜谱
              </button>
              <button
                className={styles.quickButton}
                type="button"
                onClick={() => setShowRecipePromptModal(true)}
                disabled={generatingRecipes}
              >
                <Bot size={16} />
                {generatingRecipes ? '生成中' : '机器人生成'}
              </button>
            </div>

            <div className={styles.managementStoreList}>
              {recipeManagementRecipes.map((recipe) => (
                <article key={recipe.id} className={styles.managementStoreCard}>
                  <div className={styles.managementStoreHeader}>
                    <div className={styles.managementStoreIconButton} style={{ background: recipe.accent, border: 'none', color: '#fff' }}>
                      <span>{recipe.name.slice(0, 1) || '菜'}</span>
                    </div>
                    <div className={styles.managementStoreBody}>
                      <input
                        className={styles.managementStoreNameInput}
                        value={recipe.name}
                        readOnly
                      />
                      <input
                        className={styles.managementStoreSubInput}
                        value={recipe.subtitle}
                        readOnly
                      />
                      <div className={styles.managementStoreMeta}>
                        <span>{recipe.time}</span>
                        <span>{recipe.servings}</span>
                        <span>{recipe.ingredients.length} 种食材</span>
                      </div>
                    </div>
                    <button
                      className={styles.managementStoreToggle}
                      type="button"
                      onClick={() => openRecipeEditor(recipe)}
                      aria-label={`编辑 ${recipe.name}`}
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>

                  <div className={styles.managementSectionList}>
                    {recipe.ingredients.slice(0, 4).map((ingredient) => (
                      <div key={`${recipe.id}-${ingredient.productId}`} className={styles.managementSectionPill}>
                        {ingredient.name} ￥{ingredient.price.toFixed(2)}
                      </div>
                    ))}
                  </div>

                  <div className={styles.managementStoreAddRow}>
                    <button
                      type="button"
                      className={styles.managementStoreAddButton}
                      onClick={() => openRecipeEditor(recipe)}
                    >
                      <Plus size={16} />
                      编辑菜谱
                    </button>
                    <button
                      type="button"
                      className={`${styles.managementStoreAddButton} ${styles.managementStoreAddButtonDanger}`}
                      onClick={() => handleDeleteRecipe(recipe.id)}
                    >
                      删除
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className={styles.meTopActions}>
              <button className={styles.iconBubble} type="button" aria-label="更多">
                <MoreHorizontal size={18} />
              </button>
              <button className={styles.iconBubble} type="button" aria-label="功能">
                <Circle size={16} />
              </button>
            </div>

            <div className={styles.meProfile}>
              <div className={styles.meAvatar}>
                {isAvatarImage(profile.avatar.trim()) ? (
                  <img className={styles.meAvatarImage} src={profile.avatar.trim()} alt="头像" />
                ) : (
                  <span className={styles.meAvatarText}>{profile.avatar.trim() || DEFAULT_PROFILE.avatar}</span>
                )}
              </div>
              <div className={styles.meName}>{profile.username.trim() || DEFAULT_PROFILE.username}</div>
            </div>

            <div className={styles.quickButtons}>
              <button className={styles.quickButton} type="button" onClick={() => {
                setProfileDraft(profile);
                setIsProfileEditing(false);
                setMePanel('account');
              }}>
                账户信息
              </button>
              <button className={styles.quickButton} type="button" onClick={() => setMePanel('orders')}>
                订单历史
              </button>
            </div>

            <button className={styles.meManageLink} type="button" onClick={() => setMePanel('management')}>
              <span className={styles.meManageIcon}>
                <ShoppingCart size={18} />
              </span>
              <span className={styles.meManageText}>商品管理</span>
              <ChevronRight size={18} />
            </button>
          </>
        )}
      </section>
    </div>
  );

  const topTitle =
    page === 'home'
      ? '首页'
      : page === 'delivery'
        ? deliveryView === 'store' && activeStore
          ? activeStore.name
          : deliveryView === 'kitchen'
            ? '私家厨房'
            : '外卖'
        : page === 'checkout'
          ? '下单'
          : page === 'me' && mePanel === 'account'
            ? '账户信息'
          : page === 'me' && mePanel === 'orders'
              ? '订单历史'
              : page === 'me' && mePanel === 'management'
            ? '商品管理'
            : page === 'me' && mePanel === 'recipe'
              ? '菜谱管理'
            : page === 'me' && mePanel === 'address'
              ? '地址管理'
              : '我的';

  const selectedOrderIsFailedDelegate = Boolean(
    selectedOrder &&
      selectedOrder.type === '发起代付' &&
      (selectedOrder.paymentStatus === 'rejected' || selectedOrder.status === '已取消'),
  );
  const selectedOrderDeliverySnapshot = React.useMemo(
    () => {
      if (!selectedOrder || selectedOrderIsFailedDelegate) return null;
      return createDeliveryTracking(selectedOrder.createdAt, selectedOrder.deliveryAddress ?? deliveryAddress, clockTick);
    },
    [clockTick, deliveryAddress, selectedOrder, selectedOrderIsFailedDelegate],
  );
  const selectedOrderDeliveryAddress = selectedOrder?.deliveryAddress ?? deliveryAddress;
  const getLiveOrderSnapshot = React.useCallback(
    (order: DeliveryOrderRecord) =>
      createDeliveryTracking(order.createdAt, order.deliveryAddress ?? deliveryAddress, clockTick),
    [clockTick, deliveryAddress],
  );

  return (
    <div className={styles.appRoot}>
      <div className={styles.shell}>
        <div className={styles.topBar}>
          <button
            className={styles.iconButton}
            type="button"
            onClick={() => {
              if (selectedKitchenRecipe) {
                setSelectedKitchenRecipe(null);
                return;
              }
              if (page === 'checkout') {
                setPage('delivery');
                return;
              }
              if (page === 'delivery' && deliveryView === 'cart') {
                if (cartOriginStoreId) {
                  const originStore = storeMap.get(cartOriginStoreId);
                  setActiveStoreId(cartOriginStoreId);
                  setActiveCategoryId(originStore?.categoryId ?? cartOriginCategoryId ?? 'food');
                  setDeliveryView('store');
                  setCartOriginStoreId(null);
                  setCartOriginCategoryId(null);
                  return;
                }
                if (cartOriginCategoryId) {
                  setActiveCategoryId(cartOriginCategoryId);
                  setDeliveryView('category');
                  setCartOriginStoreId(null);
                  setCartOriginCategoryId(null);
                  return;
                }
                setDeliveryView('category');
                setActiveCategoryId('food');
                setCartOriginStoreId(null);
                setCartOriginCategoryId(null);
                return;
              }
              if (page === 'delivery' && deliveryView === 'store') {
                handleCloseStore();
                return;
              }
              if (page === 'delivery' && deliveryView === 'kitchen') {
                setDeliveryView('category');
                return;
              }
              if (page === 'delivery') {
                setPage('home');
                return;
              }
              if (page === 'me' && mePanel === 'address') {
                if (addressOriginPage === 'checkout') {
                  setPage('checkout');
                } else {
                  setPage('me');
                }
                setMePanel('overview');
                setAddressOriginPage(null);
                return;
              }
              if (page === 'me' && (mePanel === 'account' || mePanel === 'orders' || mePanel === 'management' || mePanel === 'recipe')) {
                setMePanel('overview');
                return;
              }
              onClose();
            }}
            aria-label="返回"
          >
            <ArrowLeft size={18} />
          </button>
          <div className={styles.topBarCenter}>
            <h1 className={styles.topBarTitle}>{topTitle}</h1>
          </div>
          {page === 'checkout' || (page === 'me' && (mePanel === 'management' || mePanel === 'recipe' || mePanel === 'address')) ? (
            <div className={styles.headerSpacer} />
          ) : (
            <button
              className={styles.iconButton}
              type="button"
              onClick={() => {
                if (page === 'delivery' && deliveryView === 'store') {
                  setCheckoutPanel('place');
                  setPage('checkout');
                  return;
                }
                if (page === 'delivery') {
                  setMePanel('management');
                  setPage('me');
                  return;
                }
                setPage('delivery');
                setDeliveryView('category');
              }}
              aria-label={page === 'delivery' ? (deliveryView === 'store' ? '去结算' : '进入商品管理') : '进入外卖'}
            >
              {page === 'delivery' ? (deliveryView === 'store' ? <ShoppingCart size={18} /> : <Package2 size={18} />) : <ChevronRight size={18} />}
            </button>
          )}
        </div>

        <div
          className={`${styles.main} ${page === 'home' ? styles.mainHome : ''} ${page === 'delivery' ? styles.mainDelivery : ''} ${page === 'me' || page === 'checkout' || (page === 'delivery' && deliveryView === 'store') ? styles.mainSplit : ''}`}
        >
          {page === 'home' ? renderHome() : null}
          {page === 'delivery' ? renderDelivery() : null}
          {page === 'checkout' ? renderCheckout() : null}
          {page === 'me' ? renderMe() : null}
        </div>

        <div className={styles.navBar}>
          {navButton('home', '首页', <House size={18} />)}
          {navButton('delivery', '外卖', <UtensilsCrossed size={18} />)}
          {navButton('checkout', '下单', <Package2 size={18} />)}
          {navButton('me', '我的', <UserRound size={18} />)}
        </div>

        {page === 'delivery' && deliveryView === 'store' && activeStoreCartCount > 0 ? (
          <button
            type="button"
            className={styles.storeCartBar}
            onClick={() => activeStoreId ? handleOpenCartFromStore(activeStoreId) : handleCategorySelect('custom')}
            aria-label="进入购物车"
          >
            <div className={styles.storeCartIcon}>
              <ShoppingCart size={16} />
            </div>
            <div className={styles.storeCartInfo}>
              <span className={styles.storeCartQty}>已加 {activeStoreCartCount} 件</span>
              <span className={styles.storeCartAmount}><strong>{formatMoney(activeStoreCartTotal)}</strong></span>
            </div>
            <ChevronRight size={16} className={styles.storeCartArrow} />
          </button>
        ) : null}
      </div>

      {selectedProduct ? (
        <div className={styles.sheetBackdrop} onClick={() => setSelectedProduct(null)}>
          <div className={styles.sheet} onClick={(event) => event.stopPropagation()}>
            <div className={styles.sheetHeader}>
              <div className={styles.sheetIcon}>{readProductInitial(selectedProduct)}</div>
              <h3 className={styles.sheetTitle}>{selectedProduct.name}</h3>
              <p className={styles.sheetPrice}>{formatMoney(selectedProduct.price)}</p>
              <p className={styles.sheetDesc}>{selectedProduct.description}</p>
            </div>
            <div className={styles.sheetActions}>
              <button
                className={styles.sheetActionPrimary}
                type="button"
                onClick={() => {
                  handleAddToCart(selectedProduct);
                  setSelectedProduct(null);
                }}
              >
                加入购物车
              </button>
              <button className={styles.sheetAction} type="button" onClick={() => handleSheetAction('发起代付')}>
                发起代付
              </button>
              <button className={styles.sheetAction} type="button" onClick={() => handleSheetAction('为TA买单')}>
                为TA买单
              </button>
              <button
                className={styles.sheetAction}
                type="button"
                onClick={() => {
                  toggleFavorite(selectedProduct.id);
                  setSelectedProduct(null);
                }}
              >
                收藏商品
              </button>
              <button className={styles.sheetActionGhost} type="button" onClick={() => setSelectedProduct(null)}>
                取消
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showStoreModal ? (
        <div className={styles.sheetBackdrop} onClick={() => setShowStoreModal(false)}>
          <div className={`${styles.sheet} ${styles.sheetTall}`} onClick={(event) => event.stopPropagation()}>
            <div className={styles.sheetHeader}>
              <div className={styles.sheetIcon}>
                <Store size={18} />
              </div>
              <h3 className={styles.sheetTitle}>新增店铺</h3>
              <p className={styles.sheetDesc}>顺手把店铺图标和首个商品一起建好。</p>
            </div>
            <div className={styles.sheetScrollBody}>
              <div className={styles.modalForm}>
                <div className={styles.modalField}>
                  <label>店铺名</label>
                  <input
                    value={storeDraft.name}
                    onChange={(event) => setStoreDraft((current) => ({ ...current, name: event.target.value }))}
                    placeholder="例如：山野烤物"
                  />
                </div>
                <div className={styles.modalField}>
                  <label>店铺图片</label>
                  <button
                    type="button"
                    className={`${styles.profileAvatarPreview} ${styles.profileAvatarButton} ${styles.storeDraftIconButton}`}
                    onClick={() => storeDraftIconInputRef.current?.click()}
                    aria-label="上传店铺图片"
                  >
                    {isAvatarImage(storeDraft.icon.trim()) ? (
                      <img className={styles.profileAvatarImage} src={storeDraft.icon.trim()} alt="店铺图片预览" />
                    ) : (
                      <span className={styles.storeDraftIconText}>{storeDraft.icon.trim() || '🍽️'}</span>
                    )}
                  </button>
                  <input
                    ref={storeDraftIconInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(event) => {
                      handleStoreDraftIconChange(event.target.files?.[0] ?? null);
                      event.target.value = '';
                    }}
                  />
                </div>
                <div className={styles.modalField}>
                  <label>分类</label>
                  <select
                    value={storeDraft.categoryId}
                    onChange={(event) => setStoreDraft((current) => ({ ...current, categoryId: event.target.value }))}
                  >
                    {DELIVERY_CATEGORIES.filter((item) => item.id !== 'custom').map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.modalField}>
                  <label>简介</label>
                  <input
                    value={storeDraft.subtitle}
                    onChange={(event) => setStoreDraft((current) => ({ ...current, subtitle: event.target.value }))}
                    placeholder="一句话介绍店铺"
                  />
                </div>
                <div className={styles.modalField}>
                  <label>分类栏</label>
                  <input
                    value={storeDraft.sections}
                    onChange={(event) => setStoreDraft((current) => ({ ...current, sections: event.target.value }))}
                    placeholder="招牌,推荐,热卖"
                  />
                </div>
                <div className={styles.modalField}>
                  <label>店铺提示</label>
                  <input
                    value={storeDraft.notice}
                    onChange={(event) => setStoreDraft((current) => ({ ...current, notice: event.target.value }))}
                    placeholder="店铺公告"
                  />
                </div>
                <div className={styles.modalField}>
                  <label>配送费</label>
                  <input
                    value={storeDraft.deliveryFee}
                    onChange={(event) => setStoreDraft((current) => ({ ...current, deliveryFee: event.target.value }))}
                    placeholder="3"
                    inputMode="decimal"
                  />
                </div>
                <div className={styles.modalField}>
                  <label>起送价</label>
                  <input
                    value={storeDraft.minOrderAmount}
                    onChange={(event) => setStoreDraft((current) => ({ ...current, minOrderAmount: event.target.value }))}
                    placeholder="20"
                    inputMode="decimal"
                  />
                </div>
                <div className={styles.modalField}>
                  <label>首个商品名</label>
                  <input
                    value={storeDraft.productName}
                    onChange={(event) => setStoreDraft((current) => ({ ...current, productName: event.target.value }))}
                    placeholder="例如：烤鸡翅中"
                  />
                </div>
                <div className={styles.modalField}>
                  <label>首个商品价格</label>
                  <input
                    value={storeDraft.productPrice}
                    onChange={(event) => setStoreDraft((current) => ({ ...current, productPrice: event.target.value }))}
                    placeholder="18"
                    inputMode="decimal"
                  />
                </div>
                <div className={styles.modalField}>
                  <label>首个商品分类</label>
                  <input
                    value={storeDraft.productSection}
                    onChange={(event) => setStoreDraft((current) => ({ ...current, productSection: event.target.value }))}
                    placeholder="招牌"
                  />
                </div>
                <div className={styles.modalField}>
                  <label>首个商品标签</label>
                  <input
                    value={storeDraft.productTag}
                    onChange={(event) => setStoreDraft((current) => ({ ...current, productTag: event.target.value }))}
                    placeholder="新品"
                  />
                </div>
                <div className={styles.modalField}>
                  <label>首个商品描述</label>
                  <textarea
                    value={storeDraft.productDescription}
                    onChange={(event) => setStoreDraft((current) => ({ ...current, productDescription: event.target.value }))}
                    placeholder="简单介绍一下商品"
                  />
                </div>
              </div>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.sheetActionPrimary} type="button" onClick={handleCreateStore}>
                保存
              </button>
              <button className={styles.sheetActionGhost} type="button" onClick={() => setShowStoreModal(false)}>
                取消
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showProductModal ? (
        <div className={styles.sheetBackdrop} onClick={() => setShowProductModal(false)}>
          <div className={`${styles.sheet} ${styles.sheetTall}`} onClick={(event) => event.stopPropagation()}>
            <div className={styles.sheetHeader}>
              <div className={styles.sheetIcon}>
                <Plus size={18} />
              </div>
              <h3 className={styles.sheetTitle}>新增商品</h3>
              <p className={styles.sheetDesc}>
                {stores.find((item) => item.id === productDraft.storeId)?.name ?? '当前店铺'} 的商品编辑窗口。
              </p>
            </div>
            <div className={styles.sheetScrollBody}>
              <div className={styles.modalForm}>
                <div className={styles.modalField}>
                  <label>所属店铺</label>
                  <input
                    value={stores.find((item) => item.id === productDraft.storeId)?.name ?? ''}
                    readOnly
                  />
                </div>
                <div className={styles.modalField}>
                  <label>商品名</label>
                  <input
                    value={productDraft.name}
                    onChange={(event) => setProductDraft((current) => ({ ...current, name: event.target.value }))}
                    placeholder="请输入商品名"
                  />
                </div>
                <div className={styles.modalField}>
                  <label>价格</label>
                  <input
                    value={productDraft.price}
                    onChange={(event) => setProductDraft((current) => ({ ...current, price: event.target.value }))}
                    placeholder="请输入价格"
                    inputMode="decimal"
                  />
                </div>
                <div className={styles.modalField}>
                  <label>分类</label>
                  <input
                    value={productDraft.section}
                    onChange={(event) => setProductDraft((current) => ({ ...current, section: event.target.value }))}
                    placeholder="例如：招牌 / 推荐"
                  />
                </div>
                <div className={styles.modalField}>
                  <label>标签</label>
                  <input
                    value={productDraft.tag}
                    onChange={(event) => setProductDraft((current) => ({ ...current, tag: event.target.value }))}
                    placeholder="新品"
                  />
                </div>
                <div className={styles.modalField}>
                  <label>描述</label>
                  <textarea
                    value={productDraft.description}
                    onChange={(event) => setProductDraft((current) => ({ ...current, description: event.target.value }))}
                    placeholder="商品简单介绍"
                  />
                </div>
              </div>
              <div className={styles.modalActions}>
                <button className={styles.sheetActionPrimary} type="button" onClick={handleCreateProduct}>
                  保存商品
                </button>
                <button className={styles.sheetActionGhost} type="button" onClick={() => setShowProductModal(false)}>
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showRecipeModal ? (
        <div className={styles.sheetBackdrop} onClick={() => setShowRecipeModal(false)}>
          <div className={`${styles.sheet} ${styles.sheetTall}`} onClick={(event) => event.stopPropagation()}>
            <div className={styles.sheetHeader}>
              <div className={styles.sheetIcon}>
                <UtensilsCrossed size={18} />
              </div>
              <h3 className={styles.sheetTitle}>{editingRecipeId ? '编辑菜谱' : '新增菜谱'}</h3>
              <p className={styles.sheetDesc}>可以修改现有菜谱，也可以新建一份家常菜谱。</p>
            </div>
            <div className={styles.sheetScrollBody}>
              <div className={styles.modalForm}>
                <div className={styles.modalField}>
                  <label>菜谱名</label>
                  <input
                    value={recipeDraft.name}
                    onChange={(event) => updateRecipeDraftField({ name: event.target.value })}
                    placeholder="例如：西红柿炒鸡蛋"
                  />
                </div>
                <div className={styles.modalField}>
                  <label>副标题</label>
                  <input
                    value={recipeDraft.subtitle}
                    onChange={(event) => updateRecipeDraftField({ subtitle: event.target.value })}
                    placeholder="一句话介绍菜谱"
                  />
                </div>
                <div className={styles.modalField}>
                  <label>背景色</label>
                  <input
                    value={recipeDraft.accent}
                    onChange={(event) => updateRecipeDraftField({ accent: event.target.value })}
                    placeholder="#fb7185"
                  />
                </div>
                <div className={styles.modalField}>
                  <label>时长</label>
                  <input
                    value={recipeDraft.time}
                    onChange={(event) => updateRecipeDraftField({ time: event.target.value })}
                    placeholder="20 分钟"
                  />
                </div>
                <div className={styles.modalField}>
                  <label>份量</label>
                  <input
                    value={recipeDraft.servings}
                    onChange={(event) => updateRecipeDraftField({ servings: event.target.value })}
                    placeholder="2 人份"
                  />
                </div>
                <div className={styles.modalField}>
                  <label>分享文案</label>
                  <textarea
                    value={recipeDraft.shareText}
                    onChange={(event) => updateRecipeDraftField({ shareText: event.target.value })}
                    placeholder="分享这道菜时显示的文案"
                  />
                </div>
                <div className={styles.modalField}>
                  <label>做法</label>
                  <textarea
                    value={recipeDraft.steps}
                    onChange={(event) => updateRecipeDraftField({ steps: event.target.value })}
                    placeholder="每行写一步做法"
                  />
                </div>
              </div>

              <div className={styles.recipeIngredientBlock}>
                <div className={styles.sectionTitleRow}>
                  <div>
                    <h4 className={styles.sectionTitle}>食材</h4>
                    <p className={styles.sectionHint}>数量按菜谱默认值加购，单价会同步到购物车。</p>
                  </div>
                  <button className={styles.quickButton} type="button" onClick={addRecipeIngredientRow}>
                    <Plus size={16} />
                    新增食材
                  </button>
                </div>

                <div className={styles.recipeIngredientList}>
                  {recipeDraft.ingredients.map((ingredient, index) => (
                    <div key={`${ingredient.productId}-${index}`} className={styles.recipeIngredientRow}>
                      <div className={styles.modalField}>
                        <label>食材名</label>
                        <input
                          value={ingredient.name}
                          onChange={(event) => updateRecipeIngredientDraft(index, { name: event.target.value })}
                          placeholder="例如：鸡蛋"
                        />
                      </div>
                      <div className={styles.modalField}>
                        <label>数量</label>
                        <input
                          value={ingredient.qty}
                          onChange={(event) => updateRecipeIngredientDraft(index, { qty: event.target.value })}
                          placeholder="3"
                          inputMode="decimal"
                        />
                      </div>
                      <div className={styles.modalField}>
                        <label>单价</label>
                        <input
                          value={ingredient.price}
                          onChange={(event) => updateRecipeIngredientDraft(index, { price: event.target.value })}
                          placeholder="1.2"
                          inputMode="decimal"
                        />
                      </div>
                      <div className={styles.modalField}>
                        <label>说明</label>
                        <input
                          value={ingredient.amount}
                          onChange={(event) => updateRecipeIngredientDraft(index, { amount: event.target.value })}
                          placeholder="3 个 / 300g"
                        />
                      </div>
                      <button
                        className={styles.sheetActionGhost}
                        type="button"
                        onClick={() => removeRecipeIngredientRow(index)}
                      >
                        删除
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.sheetActionPrimary} type="button" onClick={handleSaveRecipe}>
                {editingRecipeId ? '保存菜谱' : '新增菜谱'}
              </button>
              {editingRecipeId ? (
                <button className={styles.sheetAction} type="button" onClick={() => handleDeleteRecipe(editingRecipeId)}>
                  删除菜谱
                </button>
              ) : null}
              <button
                className={styles.sheetActionGhost}
                type="button"
                onClick={() => {
                  setShowRecipeModal(false);
                  setEditingRecipeId(null);
                }}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showRecipePromptModal ? (
        <div className={styles.sheetBackdrop} onClick={() => setShowRecipePromptModal(false)}>
          <div className={styles.sheet} onClick={(event) => event.stopPropagation()}>
            <div className={styles.sheetHeader}>
              <div className={styles.sheetIcon}>
                <Bot size={18} />
              </div>
              <h3 className={styles.sheetTitle}>机器人生成菜谱</h3>
              <p className={styles.sheetDesc}>先输入一点想法，大模型会按你的描述生成 3 个随机菜谱。</p>
            </div>
            <div className={styles.sheetScrollBody}>
              <div className={styles.modalForm}>
                <div className={styles.modalField}>
                  <label>提示词</label>
                  <textarea
                    value={recipeGenerationPrompt}
                    onChange={(event) => setRecipeGenerationPrompt(event.target.value)}
                    placeholder="例如：生成 3 个适合夏天吃的家常菜，要求清爽、少油、简单好做。"
                  />
                </div>
              </div>
            </div>
            <div className={styles.modalActions}>
              <button
                className={styles.sheetActionPrimary}
                type="button"
                onClick={() => {
                  const prompt = recipeGenerationPrompt.trim();
                  setShowRecipePromptModal(false);
                  void handleGenerateRecipes(prompt);
                }}
                disabled={generatingRecipes}
              >
                开始生成
              </button>
              <button className={styles.sheetActionGhost} type="button" onClick={() => setShowRecipePromptModal(false)}>
                取消
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showCheckoutActions ? (
        <div className={styles.sheetBackdrop} onClick={() => setShowCheckoutActions(false)}>
          <div className={styles.sheet} onClick={(event) => event.stopPropagation()}>
            <div className={styles.sheetHeader}>
              <div className={styles.sheetIcon}>
                <Package2 size={18} />
              </div>
              <h3 className={styles.sheetTitle}>选择下单方式</h3>
              <p className={styles.sheetDesc}>请选择微信支付、由他代付、为TA买单，或直接取消。</p>
            </div>
            <div className={styles.sheetActions}>
              <button className={styles.sheetActionPrimary} type="button" onClick={() => handlePlaceOrder('购买')}>
                微信支付
              </button>
              <button className={styles.sheetAction} type="button" onClick={() => handlePlaceOrder('发起代付')}>
                由他代付
              </button>
              <button className={styles.sheetAction} type="button" onClick={() => handlePlaceOrder('为TA买单')}>
                为TA买单
              </button>
              <button className={styles.sheetActionGhost} type="button" onClick={() => setShowCheckoutActions(false)}>
                取消
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showGiftPaymentSheet ? (
        <div
          className={styles.sheetBackdrop}
          onClick={() => {
            setShowGiftPaymentSheet(false);
            setPendingContactMode(null);
            setPendingCheckoutSnapshot(null);
            setPendingCheckoutShouldClearCart(false);
            setPendingRecipeShare(null);
          }}
        >
          <div className={styles.sheet} onClick={(event) => event.stopPropagation()}>
            <div className={styles.sheetHeader}>
              <div className={`${styles.sheetIcon} ${styles.paymentBadgeWeChat}`}>微</div>
              <h3 className={styles.sheetTitle}>选择微信支付</h3>
              <p className={styles.sheetDesc}>
                为 TA 买单需先完成支付，当前微信余额 {formatMoney(wechatBalance)}。
              </p>
            </div>
            <div className={styles.sheetActions}>
              <button className={styles.sheetActionPrimary} type="button" onClick={handleGiftWechatPaymentConfirm}>
                微信支付 {formatMoney(pendingCheckoutSnapshot?.amount ?? 0)}
              </button>
              <button
                className={styles.sheetActionGhost}
                type="button"
                onClick={() => {
                  setShowGiftPaymentSheet(false);
                  setPendingContactMode(null);
                  setPendingCheckoutSnapshot(null);
                  setPendingCheckoutShouldClearCart(false);
                  setPendingRecipeShare(null);
                }}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showContactPicker ? (
        <div
          className={styles.sheetBackdrop}
          onClick={() => {
            setShowContactPicker(false);
            setShowGiftPaymentSheet(false);
            setPendingContactMode(null);
            setPendingCheckoutSnapshot(null);
            setPendingCheckoutShouldClearCart(false);
            setPendingRecipeShare(null);
          }}
        >
          <div className={`${styles.sheet} ${styles.contactPickerSheet}`} onClick={(event) => event.stopPropagation()}>
            <div className={styles.sheetHeader}>
              <div className={styles.sheetIcon}>
                <UserRound size={18} />
              </div>
              <h3 className={styles.sheetTitle}>
                {pendingContactMode === 'delegate'
                  ? '选择代付联系人'
                  : pendingContactMode === 'recipe'
                    ? '选择分享联系人'
                    : '选择收餐联系人'}
              </h3>
              <p className={styles.sheetDesc}>
                {pendingContactMode === 'delegate'
                  ? `将发送 ${formatMoney(pendingCheckoutSnapshot?.amount ?? 0)} 的外卖代付卡片。`
                  : pendingContactMode === 'recipe'
                    ? `将把「${pendingRecipeShare?.name ?? '菜谱'}」作为微信菜谱卡片发送。`
                    : `微信支付 ${formatMoney(pendingCheckoutSnapshot?.amount ?? 0)} 后，发送配送流程卡片。`}
              </p>
            </div>
            <div className={styles.contactPickerList}>
              {wechatContacts.length ? wechatContacts.map((contact) => (
                <button
                  key={contact.id}
                  type="button"
                  className={styles.contactPickerItem}
                  onClick={() => handleContactPaymentSelect(contact)}
                >
                  <span className={styles.contactPickerAvatar}>
                    {isAvatarImage(contact.avatar || '') ? (
                      <img className={styles.contactPickerAvatarImage} src={contact.avatar} alt="" />
                    ) : (
                      contact.avatar || contact.name.slice(0, 1) || '友'
                    )}
                  </span>
                  <span className={styles.contactPickerMeta}>
                    <strong>{contact.name}</strong>
                    <small>{contact.phone || '微信好友'}</small>
                  </span>
                  <ChevronRight size={18} />
                </button>
              )) : (
                <div className={styles.contactPickerEmpty}>暂无微信好友，请先在通讯录添加好友。</div>
              )}
            </div>
            <div className={styles.sheetActions}>
              <button
                className={styles.sheetActionGhost}
                type="button"
                onClick={() => {
                  setShowContactPicker(false);
                  setShowGiftPaymentSheet(false);
                  setPendingContactMode(null);
                  setPendingCheckoutSnapshot(null);
                  setPendingCheckoutShouldClearCart(false);
                  setPendingRecipeShare(null);
                }}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedOrder ? (
        <div className={styles.sheetBackdrop} onClick={() => setSelectedOrder(null)}>
          <div className={styles.sheet} onClick={(event) => event.stopPropagation()}>
            <div className={styles.sheetHeader}>
              <div className={styles.sheetIcon}>
                <Clock3 size={18} />
              </div>
              <button
                type="button"
                className={styles.sheetCloseButton}
                onClick={() => setSelectedOrder(null)}
                aria-label="关闭订单详情"
              >
                <X size={18} />
              </button>
              <h3 className={styles.sheetTitle}>订单详情</h3>
              <p className={styles.sheetDesc}>{selectedOrder.title}</p>
            </div>
            <div className={styles.orderDetailList}>
              <div className={styles.orderDetailRow}>
                <span>订单号</span>
                <strong>{formatOrderCode(selectedOrder.createdAt)}</strong>
              </div>
              <div className={styles.orderDetailRow}>
                <span>类型</span>
                <strong>{selectedOrder.type}</strong>
              </div>
              <div className={styles.orderDetailRow}>
                <span>店铺</span>
                <strong>{selectedOrder.merchantName}</strong>
              </div>
              {selectedOrder.type === '发起代付' ? (
                <div className={styles.orderDetailRow}>
                  <span>代付人</span>
                  <strong>{selectedOrder.paymentContactName || selectedOrder.paymentContactId || '未记录'}</strong>
                </div>
              ) : null}
              <div className={styles.orderDetailRow}>
                <span>金额</span>
                <strong>{formatMoney(selectedOrder.amount)}</strong>
              </div>
              <div className={styles.orderDetailRow}>
                <span>状态</span>
                <strong>{getOrderStatusLabel(selectedOrder, selectedOrderDeliverySnapshot)}</strong>
              </div>
              <div className={styles.orderDetailRow}>
                <span>时间</span>
                <strong>{new Date(selectedOrder.createdAt).toLocaleString('zh-CN', { hour12: false })}</strong>
              </div>
              {!selectedOrderIsFailedDelegate ? (
                <>
                  <div className={styles.orderDetailRow}>
                    <span>配送地址</span>
                    <strong>{selectedOrderDeliveryAddress.title}</strong>
                  </div>
                  <div className={styles.orderDetailRow}>
                    <span>收件信息</span>
                    <strong>{selectedOrderDeliveryAddress.recipient}  {selectedOrderDeliveryAddress.phone}</strong>
                  </div>
                </>
              ) : null}
            </div>

            {selectedOrderDeliverySnapshot ? (
              <div className={styles.orderMapCard}>
                <div className={styles.orderMapHeader}>
                  <div>
                    <p className={styles.orderMapKicker}>地图</p>
                    <h4 className={styles.orderMapTitle}>
                      骑手距离目的地 {formatDistance(selectedOrderDeliverySnapshot.driverDistanceKm)}
                    </h4>
                  </div>
                  <span className={styles.orderMapBadge}>{selectedOrderDeliverySnapshot.etaMinutes} 分钟</span>
                </div>
                <div className={styles.orderMapCanvas}>
                  <div className={styles.orderMapGrid} />
                  <div className={styles.orderMapMerchantNode}>店</div>
                  <div className={styles.orderMapDestinationNode}>家</div>
                  <div
                    className={styles.orderMapRider}
                    style={{ left: `${Math.min(82, Math.max(18, 18 + selectedOrderDeliverySnapshot.progress * 0.64))}%` }}
                  >
                    <Bike size={14} />
                  </div>
                  <div className={styles.orderMapPath} />
                </div>
                <p className={styles.orderMapHint}>
                  骑手{selectedOrderDeliverySnapshot.driverName}正在前往 {selectedOrderDeliverySnapshot.destination}
                </p>
              </div>
            ) : null}

            <div className={styles.sheetActions}>
              {selectedOrderIsFailedDelegate && selectedOrder.items?.length ? (
                <button
                  className={styles.sheetAction}
                  type="button"
                  onClick={() => handleRestockFailedOrder(selectedOrder)}
                >
                  重新加购
                </button>
              ) : null}
              <button className={styles.sheetActionGhost} type="button" onClick={() => setSelectedOrder(null)}>
                关闭
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className={styles.toastStack}>
        {toasts.map((toast) => (
          <div key={toast.id} className={styles.toast}>
            <strong>{toast.title}</strong>
            <span>{toast.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DeliveryApp;
