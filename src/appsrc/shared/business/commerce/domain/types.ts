export interface ProductItem {
  id: string;
  name: string;
  price: number;
  desc: string;
  img?: string;
  stock?: number;
  storeId?: string;
  isSelected: boolean;
}

export type OrderKind = 'dessert' | 'flower' | 'movie';
export type StoreKind = OrderKind;

export interface OrderLine {
  name: string;
  qty: number;
  unitPrice: number;
}

export interface Address {
  id: string;
  name: string;
  phone: string;
  address: string;
  isDefault: boolean;
}

export interface Order {
  id: string;
  kind: OrderKind;
  title: string;
  lines: OrderLine[];
  total: number;
  createdAt: number;
  address?: Address;
  meta?: Record<string, string | number>;
}

export interface Favorite {
  id: string;
  kind: Exclude<OrderKind, 'movie'>;
  storeId?: string;
  name: string;
  desc: string;
  price: number;
}

export interface StoreDecorationConfig {
  productOrder: string[];
  tabLabels: string[];
  filterLabels: string[];
  heroRatingLabels: string[];
  heroTagLabels: string[];
  movieTextLabels: string[];
  movieCheckoutLabels: string[];
  movieSessionOptions: string[];
  updatedAt: number;
}

export interface CommerceStore {
  id: string;
  code: string;
  kind: StoreKind;
  categoryLabel?: string;
  typeName?: string;
  name: string;
  slogan: string;
  theme: string;
  logo?: string;
  cover?: string;
  signboard?: string;
  decoration?: string;
  decorationConfig?: StoreDecorationConfig;
  visible: boolean;
  createdAt: number;
  updatedAt: number;
}
