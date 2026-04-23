import type {
  Address,
  Favorite,
  Order,
  ProductItem,
} from '../../shared/business/commerce/domain/types';
import type { AppContext } from '../../../core/sdk/types';

export type {
  Address,
  CommerceStore,
  Favorite,
  Order,
  OrderKind,
  OrderLine,
  ProductItem,
  StoreKind,
} from '../../shared/business/commerce/domain/types';

export interface ShoppingSettings {
  notify: boolean;
  faceId: boolean;
}

export interface ShoppingState {
  products: ProductItem[];
  cart: ProductItem[];
  flowerProducts: ProductItem[];
  flowerCart: ProductItem[];
  orders: Order[];
  favorites: Favorite[];
  addresses: Address[];
  settings: ShoppingSettings;
  isLoading: boolean;
  error: string | null;
}

export interface ShoppingAppProps {
  onClose: () => void;
  context?: AppContext;
}

