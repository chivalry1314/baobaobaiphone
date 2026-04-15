export interface SellerAppProps {
  onClose: () => void;
}

export type SellerTab = 'messages' | 'products' | 'stores' | 'stats';
import type { StoreKind } from '../../shared/business/commerce/domain/types';

export type ProductKind = 'dessert' | 'flower';

export interface ProductForm {
  name: string;
  price: string;
  desc: string;
  img: string;
}

export interface StoreForm {
  kind: StoreKind;
  categoryLabel: string;
  typeName: string;
  name: string;
  slogan: string;
  theme: string;
  cover: string;
  signboard: string;
  decoration: string;
  visible: boolean;
}

export interface StoreTypeOption {
  id: string;
  typeName: string;
  kind: StoreKind;
  categoryLabel?: string;
  custom?: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'buyer' | 'seller';
  text: string;
  createdAt: number;
}

export interface ChatThread {
  id: string;
  storeId: string;
  storeName: string;
  buyerName: string;
  messages: ChatMessage[];
  latestAt: number;
}

