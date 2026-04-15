import { DEFAULT_STORE_ID_BY_KIND } from './constants';
import { initialDessertProducts, initialFlowerProducts, initialMovieProducts } from './seedProducts';
import {
  DEFAULT_STORE_FILTER_LABELS,
  DEFAULT_STORE_HERO_RATING_LABELS,
  DEFAULT_STORE_HERO_TAG_LABELS,
  DEFAULT_STORE_MOVIE_CHECKOUT_LABELS,
  DEFAULT_STORE_MOVIE_SESSION_OPTIONS,
  DEFAULT_STORE_MOVIE_TEXT_LABELS,
  DEFAULT_STORE_TAB_LABELS,
  normalizeStoreDecorationConfig,
} from './storeDecoration';
import type { CommerceStore, ProductItem, StoreKind } from './types';
import { INITIAL_ASSET_BALANCE } from './storeConstants';

export type SellerFinanceState = {
  assetBalance: number;
  chargedStoreIds: string[];
  chargedProductIds: string[];
  accountedOrderIds: string[];
  platformFeePaidDaysByStore: Record<string, number>;
};

export type SellerStorageState = {
  stores: unknown[];
  dessertProducts: ProductItem[];
  flowerProducts: ProductItem[];
  movieProducts: ProductItem[];
  finance: SellerFinanceState;
};

const now = Date.now();

export const defaultStores: CommerceStore[] = [
  {
    id: 'store-1',
    code: '店铺1',
    kind: 'dessert',
    categoryLabel: '甜品',
    typeName: '甜品店',
    name: '甜品店',
    slogan: '甜品小食 · 加入购物车',
    theme: 'linear-gradient(135deg, #fb7185, #f59e0b)',
    signboard: 'Baobaobai 甜品店',
    decoration: '?',
    decorationConfig: {
      productOrder: [],
      tabLabels: DEFAULT_STORE_TAB_LABELS,
      filterLabels: DEFAULT_STORE_FILTER_LABELS,
      heroRatingLabels: DEFAULT_STORE_HERO_RATING_LABELS,
      heroTagLabels: DEFAULT_STORE_HERO_TAG_LABELS,
      movieTextLabels: DEFAULT_STORE_MOVIE_TEXT_LABELS,
      movieCheckoutLabels: DEFAULT_STORE_MOVIE_CHECKOUT_LABELS,
      movieSessionOptions: DEFAULT_STORE_MOVIE_SESSION_OPTIONS,
      updatedAt: now - 3000,
    },
    visible: true,
    createdAt: now - 3000,
    updatedAt: now - 3000,
  },
  {
    id: 'store-2',
    code: '店铺2',
    kind: 'flower',
    categoryLabel: '鲜花',
    typeName: '鲜花坊',
    name: '鲜花坊',
    slogan: '花束心意 · 同城配送',
    theme: 'linear-gradient(135deg, #60a5fa, #34d399)',
    signboard: 'Baobaobai 鲜花坊',
    decoration: '?',
    decorationConfig: {
      productOrder: [],
      tabLabels: DEFAULT_STORE_TAB_LABELS,
      filterLabels: DEFAULT_STORE_FILTER_LABELS,
      heroRatingLabels: DEFAULT_STORE_HERO_RATING_LABELS,
      heroTagLabels: DEFAULT_STORE_HERO_TAG_LABELS,
      movieTextLabels: DEFAULT_STORE_MOVIE_TEXT_LABELS,
      movieCheckoutLabels: DEFAULT_STORE_MOVIE_CHECKOUT_LABELS,
      movieSessionOptions: DEFAULT_STORE_MOVIE_SESSION_OPTIONS,
      updatedAt: now - 2000,
    },
    visible: true,
    createdAt: now - 2000,
    updatedAt: now - 2000,
  },
  {
    id: 'store-3',
    code: '店铺3',
    kind: 'movie',
    categoryLabel: '电影票',
    typeName: '淘票票',
    name: '淘票票',
    slogan: '选片购票 · 电子票券',
    theme: 'linear-gradient(135deg, #a78bfa, #fb7185)',
    signboard: 'Baobaobai 淘票票',
    decoration: '?',
    decorationConfig: {
      productOrder: [],
      tabLabels: DEFAULT_STORE_TAB_LABELS,
      filterLabels: DEFAULT_STORE_FILTER_LABELS,
      heroRatingLabels: DEFAULT_STORE_HERO_RATING_LABELS,
      heroTagLabels: DEFAULT_STORE_HERO_TAG_LABELS,
      movieTextLabels: DEFAULT_STORE_MOVIE_TEXT_LABELS,
      movieCheckoutLabels: DEFAULT_STORE_MOVIE_CHECKOUT_LABELS,
      movieSessionOptions: DEFAULT_STORE_MOVIE_SESSION_OPTIONS,
      updatedAt: now - 1000,
    },
    visible: true,
    createdAt: now - 1000,
    updatedAt: now - 1000,
  },
];

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const toStoreKind = (value: unknown): StoreKind => {
  if (value === 'dessert' || value === 'flower' || value === 'movie') return value;
  return 'dessert';
};

const getDefaultStoreIdByProductKind = (kind: 'dessert' | 'flower') => {
  return DEFAULT_STORE_ID_BY_KIND[kind];
};

const getDefaultMovieStoreId = () => {
  return DEFAULT_STORE_ID_BY_KIND.movie;
};

const normalizeText = (value: string | undefined): string => (value || '').trim();

const normalizeProductStoreId = (
  product: ProductItem,
  fallbackKind: 'dessert' | 'flower'
): ProductItem => {
  const fallbackStoreId = getDefaultStoreIdByProductKind(fallbackKind);
  return {
    ...product,
    name: normalizeText(product.name) || product.name,
    desc: normalizeText(product.desc) || product.desc,
    isSelected: typeof product.isSelected === 'boolean' ? product.isSelected : true,
    storeId: product.storeId || fallbackStoreId,
  };
};

export const normalizeDessertProducts = (products: ProductItem[]): ProductItem[] => {
  return products.map((item) => normalizeProductStoreId(item, 'dessert'));
};

export const normalizeFlowerProducts = (products: ProductItem[]): ProductItem[] => {
  return products.map((item) => normalizeProductStoreId(item, 'flower'));
};

export const normalizeMovieProducts = (products: ProductItem[]): ProductItem[] => {
  return products.map((item) => ({
    ...item,
    name: normalizeText(item.name) || item.name,
    desc: normalizeText(item.desc) || item.desc,
    isSelected: typeof item.isSelected === 'boolean' ? item.isSelected : true,
    storeId: item.storeId || getDefaultMovieStoreId(),
    stock: Math.max(1, Math.floor(Number(item.stock) || 1)),
  }));
};

export const normalizeFinanceState = (value: unknown): SellerFinanceState => {
  const raw = isPlainObject(value) ? value : {};
  const toStringList = (input: unknown) =>
    Array.isArray(input)
      ? [
          ...new Set(
            input.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
          ),
        ]
      : [];
  const rawMap = isPlainObject(raw.platformFeePaidDaysByStore) ? raw.platformFeePaidDaysByStore : {};
  const platformFeePaidDaysByStore = Object.fromEntries(
    Object.entries(rawMap)
      .filter(([key, days]) => typeof key === 'string' && Number.isFinite(Number(days)))
      .map(([key, days]) => [key, Math.max(0, Math.floor(Number(days)))])
  );
  const asset = Number(raw.assetBalance);
  return {
    assetBalance: Number.isFinite(asset) ? asset : INITIAL_ASSET_BALANCE,
    chargedStoreIds: toStringList(raw.chargedStoreIds),
    chargedProductIds: toStringList(raw.chargedProductIds),
    accountedOrderIds: toStringList(raw.accountedOrderIds),
    platformFeePaidDaysByStore,
  };
};

export const defaultSellerStorageState = (): SellerStorageState => ({
  stores: [],
  dessertProducts: normalizeDessertProducts(initialDessertProducts),
  flowerProducts: normalizeFlowerProducts(initialFlowerProducts),
  movieProducts: normalizeMovieProducts(initialMovieProducts),
  finance: normalizeFinanceState(undefined),
});

export const normalizeSellerStorageState = (state: unknown): SellerStorageState => {
  const value = isPlainObject(state) ? state : {};
  const defaults = defaultSellerStorageState();
  return {
    stores: Array.isArray(value.stores) ? (value.stores as unknown[]) : [],
    dessertProducts: Array.isArray(value.dessertProducts)
      ? normalizeDessertProducts(value.dessertProducts as ProductItem[])
      : defaults.dessertProducts,
    flowerProducts: Array.isArray(value.flowerProducts)
      ? normalizeFlowerProducts(value.flowerProducts as ProductItem[])
      : defaults.flowerProducts,
    movieProducts: Array.isArray(value.movieProducts)
      ? normalizeMovieProducts(value.movieProducts as ProductItem[])
      : defaults.movieProducts,
    finance: normalizeFinanceState(value.finance),
  };
};

const nextStoreCode = (stores: CommerceStore[]) => {
  const max = stores.reduce((acc, store) => {
    const matched = store.code.match(/\d+/);
    if (!matched) return acc;
    const value = Number(matched[0]);
    return Number.isFinite(value) ? Math.max(acc, value) : acc;
  }, 0);
  return `店铺${max + 1}`;
};

export const normalizeStore = (input: Partial<CommerceStore>, index: number): CommerceStore => {
  const kind = toStoreKind(input.kind);
  const timestamp = Date.now();
  const fallback = defaultStores.find((item) => item.kind === kind) || defaultStores[0];
  const normalizedCode = normalizeText(input.code);
  const normalizedCategory = normalizeText(input.categoryLabel);
  const normalizedTypeName = normalizeText(input.typeName);
  const normalizedName = normalizeText(input.name);
  const normalizedSlogan = normalizeText(input.slogan);
  const normalizedSignboard = normalizeText(input.signboard);
  const normalizedDecoration = normalizeText(input.decoration);
  const normalizedDecorationConfig = normalizeStoreDecorationConfig(input.decorationConfig);
  return {
    id: input.id || `store-${timestamp.toString(36)}-${index}`,
    code: normalizedCode || `店铺${index + 1}`,
    kind,
    categoryLabel:
      normalizedCategory ||
      fallback.categoryLabel ||
      (kind === 'movie' ? '电影票' : kind === 'flower' ? '鲜花' : '甜品'),
    typeName: normalizedTypeName || fallback.name,
    name: normalizedName || fallback.name || '新店铺',
    slogan: normalizedSlogan || '欢迎光临',
    theme: input.theme?.trim() || fallback.theme || '',
    logo: input.logo?.trim() || '',
    cover: input.cover?.trim() || '',
    signboard: normalizedSignboard || `Baobaobai ${normalizedName || fallback.name}`,
    decoration: normalizedDecoration || fallback.decoration || '?',
    decorationConfig: normalizedDecorationConfig,
    visible: input.visible !== false,
    createdAt: typeof input.createdAt === 'number' ? input.createdAt : timestamp,
    updatedAt: typeof input.updatedAt === 'number' ? input.updatedAt : timestamp,
  };
};

const ensureUniqueStoreCodes = (stores: CommerceStore[]): CommerceStore[] => {
  return stores.map((store, index) => ({ ...store, code: `店铺${index + 1}` }));
};

export const parseStoresRaw = (raw: unknown): CommerceStore[] => {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, idx) => normalizeStore((item ?? {}) as Partial<CommerceStore>, idx));
};

export const mergeWithDefaults = (stores: CommerceStore[]): CommerceStore[] => {
  const seen = new Set<string>();
  const merged: CommerceStore[] = [];
  stores.forEach((store) => {
    if (seen.has(store.id)) return;
    seen.add(store.id);
    merged.push(store);
  });
  defaultStores.forEach((store) => {
    if (seen.has(store.id)) return;
    seen.add(store.id);
    merged.push(store);
  });
  return ensureUniqueStoreCodes(merged);
};

export const createStoreDraft = (
  stores: CommerceStore[],
  kind: StoreKind
): Pick<
  CommerceStore,
  | 'code'
  | 'kind'
  | 'categoryLabel'
  | 'name'
  | 'typeName'
  | 'slogan'
  | 'theme'
  | 'cover'
  | 'signboard'
  | 'decoration'
  | 'decorationConfig'
  | 'visible'
> => {
  const fallback = defaultStores.find((item) => item.kind === kind) || defaultStores[0];
  return {
    code: nextStoreCode(stores),
    kind,
    categoryLabel: fallback.categoryLabel,
    name: fallback.name,
    typeName: fallback.name,
    slogan: fallback.slogan,
    theme: fallback.theme,
    cover: '',
    signboard: fallback.signboard || `Baobaobai ${fallback.name}`,
    decoration: fallback.decoration || '?',
    decorationConfig: {
      productOrder: [],
      tabLabels: DEFAULT_STORE_TAB_LABELS,
      filterLabels: DEFAULT_STORE_FILTER_LABELS,
      heroRatingLabels: DEFAULT_STORE_HERO_RATING_LABELS,
      heroTagLabels: DEFAULT_STORE_HERO_TAG_LABELS,
      movieTextLabels: DEFAULT_STORE_MOVIE_TEXT_LABELS,
      movieCheckoutLabels: DEFAULT_STORE_MOVIE_CHECKOUT_LABELS,
      movieSessionOptions: DEFAULT_STORE_MOVIE_SESSION_OPTIONS,
      updatedAt: 0,
    },
    visible: true,
  };
};

export const resolveStoreCode = (storeId: string | undefined, stores: CommerceStore[]): string => {
  if (!storeId) return '';
  const found = stores.find((item) => item.id === storeId);
  return found?.code || '';
};

export const resolveStoreByKind = (
  stores: CommerceStore[],
  kind: StoreKind,
  storeId?: string
): CommerceStore | undefined => {
  const sameKind = stores.filter((item) => item.kind === kind);
  if (sameKind.length === 0) return undefined;
  if (storeId) {
    const matched = sameKind.find((item) => item.id === storeId && item.visible);
    if (matched) return matched;
  }
  const visible = sameKind.find((item) => item.visible);
  if (visible) return visible;
  return sameKind[0];
};

export const getDefaultStoreIdByKind = (kind: StoreKind): string => {
  return DEFAULT_STORE_ID_BY_KIND[kind];
};
