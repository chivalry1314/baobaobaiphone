export type TabKey = 'home' | 'cart' | 'orders' | 'me';

export type Screen =
  | 'home'
  | 'dessert'
  | 'flowers'
  | 'movies'
  | 'cart'
  | 'movie-checkout'
  | 'goods-checkout'
  | 'orders'
  | 'order-detail'
  | 'logistics'
  | 'me'
  | 'favorites'
  | 'addresses'
  | 'address-add'
  | 'settings';

export type GoodsKind = 'dessert' | 'flower';

export type ShippingMode = 'now' | 'schedule';

export type RouteParams = Record<string, unknown>;

export interface Route {
  tab: TabKey;
  screen: Screen;
  params?: RouteParams;
}

export interface Movie {
  id: string;
  title: string;
  tagline: string;
  price: number;
  poster: string;
}
