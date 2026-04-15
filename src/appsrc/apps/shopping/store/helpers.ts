import { DEFAULT_STORE_ID_BY_KIND } from '../../../shared/business/commerce/domain/constants';
import type { Favorite, ProductItem, ShoppingSettings } from '../types';

export const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
};

const normalizeText = (value: string | undefined): string => (value || '').trim();

const getDefaultStoreIdByKind = (kind: 'dessert' | 'flower'): string =>
  DEFAULT_STORE_ID_BY_KIND[kind];

export const normalizeProduct = (item: ProductItem, kind: 'dessert' | 'flower'): ProductItem => ({
  ...item,
  name: normalizeText(item.name) || item.name,
  desc: normalizeText(item.desc) || item.desc,
  isSelected: typeof item.isSelected === 'boolean' ? item.isSelected : true,
  storeId: item.storeId || getDefaultStoreIdByKind(kind),
});

export const normalizeProducts = (
  items: ProductItem[],
  kind: 'dessert' | 'flower'
): ProductItem[] => {
  return items.map((item) => normalizeProduct(item, kind));
};

export const normalizeFavorites = (favorites: Favorite[]): Favorite[] => {
  return favorites.map((item) => ({
    ...item,
    storeId: item.storeId,
  }));
};

export const defaultSettings: ShoppingSettings = {
  notify: true,
  faceId: false,
};

