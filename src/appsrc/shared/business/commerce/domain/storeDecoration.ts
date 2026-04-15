import type { CommerceStore, ProductItem, StoreDecorationConfig } from './types';

export const DEFAULT_STORE_TAB_LABELS = ['综合', '销量', '新品', '价格'];
export const DEFAULT_STORE_FILTER_LABELS = ['看上新', '限时立减'];
export const DEFAULT_STORE_HERO_RATING_LABELS = ['★★★★★', '4.7', '已售 12.4万'];
export const DEFAULT_STORE_HERO_TAG_LABELS = ['7天无理由退货', '好评率 95.7%', '平均 29 小时发货'];
export const DEFAULT_STORE_MOVIE_TEXT_LABELS = [
  '正在热映',
  '选择影片，填写日期与数量，生成电子电影票',
  '搜索影片',
  '例如：流浪地球',
];
export const DEFAULT_STORE_MOVIE_CHECKOUT_LABELS = [
  '请选择影片后再继续。',
  '返回淘票票',
  '影院',
  '日期',
  '场次',
  '数量',
  '生成电影票',
  '选择场次',
  '星影影城 IMAX',
  '',
  '2',
];
export const DEFAULT_STORE_MOVIE_SESSION_OPTIONS = ['10:30', '13:40', '16:20', '19:30'];

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const normalizeStringList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    ),
  ];
};

const normalizeLabelList = (value: unknown, fallback: string[]): string[] => {
  const normalized = normalizeStringList(value);
  return fallback.map((label, index) => normalized[index] || label);
};

export const normalizeStoreDecorationConfig = (value: unknown): StoreDecorationConfig => {
  const raw = isPlainObject(value) ? value : {};
  const updatedAt = Number(raw.updatedAt);
  return {
    productOrder: normalizeStringList(raw.productOrder),
    tabLabels: normalizeLabelList(raw.tabLabels, DEFAULT_STORE_TAB_LABELS),
    filterLabels: normalizeLabelList(raw.filterLabels, DEFAULT_STORE_FILTER_LABELS),
    heroRatingLabels: normalizeLabelList(raw.heroRatingLabels, DEFAULT_STORE_HERO_RATING_LABELS),
    heroTagLabels: normalizeLabelList(raw.heroTagLabels, DEFAULT_STORE_HERO_TAG_LABELS),
    movieTextLabels: normalizeLabelList(raw.movieTextLabels, DEFAULT_STORE_MOVIE_TEXT_LABELS),
    movieCheckoutLabels: normalizeLabelList(raw.movieCheckoutLabels, DEFAULT_STORE_MOVIE_CHECKOUT_LABELS),
    movieSessionOptions: normalizeLabelList(raw.movieSessionOptions, DEFAULT_STORE_MOVIE_SESSION_OPTIONS),
    updatedAt: Number.isFinite(updatedAt) ? updatedAt : 0,
  };
};

export const syncDecorationProductOrder = (
  productOrder: string[] | undefined,
  products: Array<Pick<ProductItem, 'id'>>
): string[] => {
  const validIds = new Set(products.map((item) => item.id));
  const normalizedOrder = normalizeStringList(productOrder).filter((id) => validIds.has(id));
  const orderedSet = new Set(normalizedOrder);
  const missingIds = products.map((item) => item.id).filter((id) => !orderedSet.has(id));
  return [...normalizedOrder, ...missingIds];
};

export const sortProductsByDecorationOrder = <T extends Pick<ProductItem, 'id'>>(
  products: T[],
  productOrder: string[] | undefined
): T[] => {
  const syncedOrder = syncDecorationProductOrder(productOrder, products);
  const orderIndex = new Map(syncedOrder.map((id, index) => [id, index]));
  return [...products].sort((left, right) => {
    const leftIndex = orderIndex.get(left.id) ?? Number.MAX_SAFE_INTEGER;
    const rightIndex = orderIndex.get(right.id) ?? Number.MAX_SAFE_INTEGER;
    if (leftIndex !== rightIndex) return leftIndex - rightIndex;
    return left.id.localeCompare(right.id);
  });
};

export const toStoreBackgroundImage = (value: string | undefined, fallback = ''): string => {
  const trimmed = (value || '').trim();
  if (!trimmed) return fallback;
  if (trimmed.startsWith('data:') || /^https?:\/\//.test(trimmed)) return `url(${trimmed})`;
  return trimmed;
};

export const resolveStoreHeroBackground = (
  store: Pick<CommerceStore, 'cover' | 'theme'>,
  fallback = ''
): string => {
  const cover = (store.cover || '').trim();
  if (cover) return toStoreBackgroundImage(cover, fallback);
  return toStoreBackgroundImage(store.theme, fallback);
};
