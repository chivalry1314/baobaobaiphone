import { getDefaultStoreIdByKind } from '../../shared/business/commerce/domain/store';
import type { CommerceStore, Order, ProductItem, StoreKind } from '../../shared/business/commerce/domain/types';
import {
  readSellerStoreTypeRecords,
  writeSellerStoreTypeRecords,
  type SellerStoreTypeRecord,
} from './data/repositories/storeTypeRepo';
import type { ProductForm, ProductKind, StoreForm, StoreTypeOption } from './types';

export const emptyProductForm: ProductForm = { name: '', price: '', desc: '', img: '' };
export const STORE_TYPE_STORAGE_KEY = 'seller.store.types.v1';

export const storeKindLabel: Record<StoreKind, string> = {
  dessert: '甜品',
  flower: '鲜花',
  movie: '电影票',
};

export const fallbackStoreMeta: Record<StoreKind, Omit<StoreForm, 'kind' | 'cover'>> = {
  dessert: {
    categoryLabel: storeKindLabel.dessert,
    typeName: '甜品站',
    name: '甜品站',
    slogan: '甜品小食 · 加入购物车',
    theme: 'linear-gradient(135deg, #fb7185, #f59e0b)',
    signboard: 'Baobaobai 甜品站',
    decoration: '*',
    visible: true,
  },
  flower: {
    categoryLabel: storeKindLabel.flower,
    typeName: '鲜花坊',
    name: '鲜花坊',
    slogan: '花束心意 · 同城配送',
    theme: 'linear-gradient(135deg, #60a5fa, #34d399)',
    signboard: 'Baobaobai 鲜花坊',
    decoration: '*',
    visible: true,
  },
  movie: {
    categoryLabel: storeKindLabel.movie,
    typeName: '淘票票',
    name: '淘票票',
    slogan: '选片购票 · 电子票券',
    theme: 'linear-gradient(135deg, #a78bfa, #fb7185)',
    signboard: 'Baobaobai 淘票票',
    decoration: '*',
    visible: true,
  },
};

export const createStoreId = () =>
  `store-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const parseStoreKind = (value: unknown): StoreKind => {
  if (value === 'dessert' || value === 'flower' || value === 'movie') return value;
  return 'dessert';
};

export const parseStoreKindFromLabel = (value: string): StoreKind => {
  const v = value.trim().toLowerCase();
  if (v === 'dessert' || v === '甜品') return 'dessert';
  if (v === 'flower' || v === '鲜花') return 'flower';
  if (v === 'movie' || v === '电影' || v === '电影票') return 'movie';
  return 'dessert';
};

export const repairText = (value?: string) => value?.trim() || '';

export const resolveTypeCategoryLabel = (item: StoreTypeOption) => {
  const label = repairText(item.categoryLabel);
  if (!label) return storeKindLabel[item.kind];
  return label;
};

export const loadCustomStoreTypes = async (): Promise<StoreTypeOption[]> => {
  const records = await readSellerStoreTypeRecords();
  return records
    .map((item, index) => {
      const typeName = repairText(item.typeName);
      if (!typeName) return null;
      return {
        id: String(item.id || `type-${index}`),
        typeName,
        kind: parseStoreKind(item.kind),
        categoryLabel: repairText(item.categoryLabel) || undefined,
        custom: true,
      } as StoreTypeOption;
    })
    .filter((item): item is StoreTypeOption => Boolean(item));
};

export const saveCustomStoreTypes = async (types: StoreTypeOption[]): Promise<void> => {
  const records: SellerStoreTypeRecord[] = types.map((item) => ({
    id: item.id,
    typeName: item.typeName,
    kind: parseStoreKind(item.kind),
    categoryLabel: item.categoryLabel,
  }));
  await writeSellerStoreTypeRecords(records);
};

export const toStoreId = (product: ProductItem, kind: ProductKind) => {
  return product.storeId || getDefaultStoreIdByKind(kind);
};

export const sanitizeStore = (store: CommerceStore): CommerceStore => {
  const fallback = fallbackStoreMeta[store.kind];
  return {
    ...store,
    code: repairText(store.code) || store.code,
    categoryLabel: repairText(store.categoryLabel) || fallback.categoryLabel,
    name: repairText(store.name) || fallback.name,
    typeName: repairText(store.typeName) || repairText(store.name) || fallback.typeName,
    slogan: repairText(store.slogan) || fallback.slogan,
    signboard: repairText(store.signboard) || fallback.signboard,
    decoration: repairText(store.decoration) || fallback.decoration,
  };
};

export const normalizeStores = (stores: CommerceStore[]) => stores.map(sanitizeStore);

export const createInitialStoreForm = (kind: StoreKind): StoreForm => {
  const fallback = fallbackStoreMeta[kind];
  return {
    kind,
    categoryLabel: fallback.categoryLabel,
    typeName: fallback.typeName,
    name: fallback.name,
    slogan: fallback.slogan,
    theme: fallback.theme,
    cover: '',
    signboard: fallback.signboard,
    decoration: fallback.decoration,
    visible: fallback.visible,
  };
};

export const getBuyerName = (order: Order) => {
  const nameFromMeta = typeof order.meta?.buyerName === 'string' ? order.meta.buyerName.trim() : '';
  const nameFromAddress = order.address?.name?.trim() || '';
  return nameFromAddress || nameFromMeta || '匿名买家';
};

export const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.readAsDataURL(file);
  });
