import type { CommerceStore } from './types';

export const SHOPPING_HOME_FIXED_TABS = ['推荐', '上新'] as const;
export const SHOPPING_HOME_BASE_STORE_TYPE_TABS = ['穿搭', '家居', '美护', '潮玩', '食饮'] as const;
export const DEFAULT_SHOPPING_HOME_TAB = SHOPPING_HOME_FIXED_TABS[0];
export const DEFAULT_SELLER_STORE_TYPE = SHOPPING_HOME_BASE_STORE_TYPE_TABS[0];

const fixedTabSet: Set<string> = new Set(SHOPPING_HOME_FIXED_TABS);
const baseStoreTypeTabSet: Set<string> = new Set(SHOPPING_HOME_BASE_STORE_TYPE_TABS);

const normalizeLabel = (value: string | undefined) => (value || '').trim();

export const resolveStoreTypeTabLabel = (store: CommerceStore): string => {
  const typeName = normalizeLabel(store.typeName);
  if (typeName) return typeName;
  return normalizeLabel(store.categoryLabel);
};

const shouldAppendStoreTypeTab = (store: CommerceStore, tabLabel: string): boolean => {
  if (!tabLabel || fixedTabSet.has(tabLabel)) return false;
  if (!store.visible || store.kind === 'movie') return false;
  if (baseStoreTypeTabSet.has(tabLabel)) return true;
  const categoryLabel = normalizeLabel(store.categoryLabel);
  return categoryLabel === tabLabel;
};

export const resolveShoppingHomeStoreTypeTabs = (stores: CommerceStore[]): string[] => {
  const tabs: string[] = [...SHOPPING_HOME_BASE_STORE_TYPE_TABS];
  const seen = new Set<string>(tabs);
  stores.forEach((store) => {
    const tabLabel = resolveStoreTypeTabLabel(store);
    if (!shouldAppendStoreTypeTab(store, tabLabel) || seen.has(tabLabel)) return;
    seen.add(tabLabel);
    tabs.push(tabLabel);
  });
  return tabs;
};

export const resolveShoppingHomeTabs = (stores: CommerceStore[]): string[] => {
  return [...SHOPPING_HOME_FIXED_TABS, ...resolveShoppingHomeStoreTypeTabs(stores)];
};

