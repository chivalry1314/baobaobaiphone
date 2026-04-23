import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type {
  Address,
  CommerceStore,
  Favorite,
  Order,
  ProductItem,
  ShoppingAppProps,
  StoreKind,
} from './types';
import type { GoodsKind, Movie, Route, Screen, ShippingMode, TabKey } from './uiTypes';
import { useShoppingStore } from './store';
import { useWeChatFriendCharactersFromContacts } from '../WeChat/contactAdapter';
import { useWeChatStore } from '../WeChat/store';
import type { WeChatOrderPreview } from '../WeChat/types';
import { PUSH_OPEN_APP_MESSAGE_TYPE } from '../../../core/push/webPush';
import styles from './ShoppingApp.module.css';
import { toMovie, toMovieStoreProducts } from './movies';
import { addDays, formatDate, formatMoney, groupCartLines } from './utils';
import {
  COMMERCE_ROLE_CHANGED_EVENT,
  defaultStores,
  getDefaultStoreIdByKind,
  loadCommerceStores,
  readMovieProductsFromStorage,
  resolveStoreByKind,
  STORES_UPDATED_EVENT,
} from '../../shared/business/commerce/domain/store';
import {
  DEFAULT_STORE_MOVIE_CHECKOUT_LABELS,
  DEFAULT_STORE_MOVIE_SESSION_OPTIONS,
  sortProductsByDecorationOrder,
} from '../../shared/business/commerce/domain/storeDecoration';
import {
  DEFAULT_SHOPPING_HOME_TAB,
  resolveShoppingHomeTabs,
} from '../../shared/business/commerce/domain/storeTypeTabs';
import {
  initializeSellerMessageScheduler,
  triggerFavoriteInquiryMessage,
} from '../../shared/business/commerce/messageBridge';
import {
  ShoppingAddressAdd,
  ShoppingAddresses,
  ShoppingCart,
  ShoppingFavorites,
  ShoppingGoodsCheckout,
  ShoppingHeader,
  ShoppingHome,
  ShoppingLogistics,
  ShoppingMe,
  ShoppingMovieCheckout,
  ShoppingMovies,
  ShoppingOrderDetail,
  ShoppingOrders,
  ShoppingProductList,
  ShoppingSettings,
  ShoppingTabBar,
} from './components';
import type { ShoppingCartGroup, ShoppingCartLine } from './components/ShoppingCart';

const getTabRoot = (tab: TabKey): Screen => {
  if (tab === 'home') return 'home';
  if (tab === 'cart') return 'cart';
  if (tab === 'orders') return 'orders';
  return 'me';
};

const staticHeaderTitleMap: Record<Screen, string> = {
  home: '首页',
  dessert: '甜品店',
  flowers: '鲜花店',
  movies: '电影票',
  cart: '购物车',
  'movie-checkout': '选择场次',
  'goods-checkout': '确认订单',
  orders: '订单',
  'order-detail': '订单详情',
  logistics: '物流详情',
  me: '我的',
  favorites: '我的收藏',
  addresses: '地址管理',
  'address-add': '新增地址',
  settings: '设置',
};

const pickStore = (stores: CommerceStore[], kind: StoreKind, storeId?: string): CommerceStore => {
  return (
    resolveStoreByKind(stores, kind, storeId) ||
    defaultStores.find((item) => item.kind === kind) ||
    defaultStores[0]
  );
};

const resolveProductStoreId = (item: ProductItem, kind: GoodsKind) => {
  return item.storeId || getDefaultStoreIdByKind(kind);
};

const filterProductsByStore = (items: ProductItem[], kind: GoodsKind, storeId: string) => {
  return items.filter((item) => resolveProductStoreId(item, kind) === storeId);
};

const mergeCartToLines = (items: ProductItem[]): ShoppingCartLine[] => {
  const lineMap = new Map<string, ShoppingCartLine>();
  items.forEach((item) => {
    const key = item.id;
    const found = lineMap.get(key);
    if (found) {
      found.qty += 1;
      found.subtotal = found.qty * found.unitPrice;
      return;
    }
    lineMap.set(key, {
      id: item.id,
      name: item.name,
      desc: item.desc,
      qty: 1,
      unitPrice: item.price,
      subtotal: item.price,
    });
  });
  return Array.from(lineMap.values());
};

const buildCartLineKey = (kind: GoodsKind, storeId: string, lineId: string) => `${kind}-${storeId}-${lineId}`;

const dropPurchasedItemsFromCart = (
  items: ProductItem[],
  kind: GoodsKind,
  purchasedGroups: ShoppingCartGroup[]
) => {
  const removePlan = new Map<string, number>();
  purchasedGroups
    .filter((group) => group.kind === kind)
    .forEach((group) => {
      group.lines.forEach((line) => {
        const key = `${group.storeId}::${line.id}`;
        removePlan.set(key, (removePlan.get(key) || 0) + line.qty);
      });
    });
  if (removePlan.size === 0) return items;
  return items.filter((item) => {
    const storeId = resolveProductStoreId(item, kind);
    const key = `${storeId}::${item.id}`;
    const remain = removePlan.get(key) || 0;
    if (remain <= 0) return true;
    removePlan.set(key, remain - 1);
    return false;
  });
};

const resolveMovieCinemaDefault = (store: CommerceStore) => {
  const value = (store.decorationConfig?.movieCheckoutLabels?.[8] || '').trim();
  return value || DEFAULT_STORE_MOVIE_CHECKOUT_LABELS[8];
};

const resolveMovieDateDefault = (store: CommerceStore) => {
  const configured = (store.decorationConfig?.movieCheckoutLabels?.[9] || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(configured)) return configured;
  return formatDate(addDays(new Date(), 1));
};

const resolveMovieQtyDefault = (store: CommerceStore) => {
  const configured = Number((store.decorationConfig?.movieCheckoutLabels?.[10] || '').trim());
  if (Number.isFinite(configured) && configured >= 1 && configured <= 6) return Math.floor(configured);
  return 2;
};

const toMoney2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const ORDER_PREVIEW_ITEM_LIMIT = 3;

type MergedPaymentMethod = 'wechat' | 'delegate';
type PaymentSheetTarget = 'merged-cart' | 'movie' | 'order-detail' | 'movie-share';
type PayeeContact = {
  id: string;
  name: string;
  avatar?: string;
};

const getContactInitials = (name: string) => {
  const normalized = name.trim();
  if (!normalized) return '?';
  return normalized.slice(0, 2).toUpperCase();
};

const buildOrderPreview = (
  orders: Array<Pick<Order, 'lines' | 'meta'>>
): WeChatOrderPreview => {
  const storeNames = Array.from(
    new Set(
      orders
        .map((order) => String(order.meta?.storeName ?? '').trim())
        .filter(Boolean)
    )
  );
  const itemMap = new Map<string, { name: string; qty: number }>();
  let totalItemCount = 0;

  orders.forEach((order) => {
    order.lines.forEach((line) => {
      const name = String(line.name ?? '').trim();
      if (!name) return;
      const qty = Number.isFinite(line.qty) && line.qty > 0 ? Math.round(line.qty) : 1;
      totalItemCount += qty;
      const found = itemMap.get(name);
      if (found) {
        found.qty += qty;
        return;
      }
      itemMap.set(name, { name, qty });
    });
  });

  return {
    storeNames: storeNames.length > 0 ? storeNames : undefined,
    items: Array.from(itemMap.values()).slice(0, ORDER_PREVIEW_ITEM_LIMIT),
    totalItemCount,
  };
};

type ShoppingLaunchState = {
  tab: TabKey;
  route: Route;
  history: Route[];
};

const resolveShoppingLaunchState = (context?: ShoppingAppProps['context']): ShoppingLaunchState => {
  const defaultState: ShoppingLaunchState = {
    tab: 'home',
    route: { tab: 'home', screen: 'home' },
    history: [],
  };
  const params = context?.params;
  const rawState = params?.shoppingState;
  if (!rawState || typeof rawState !== 'object' || Array.isArray(rawState)) return defaultState;
  const state = rawState as Partial<ShoppingLaunchState> & { route?: Partial<Route> };
  const tab = state.tab === 'cart' || state.tab === 'orders' || state.tab === 'me' ? state.tab : 'home';
  const routeTab = state.route?.tab;
  const routeScreen = state.route?.screen;
  const route =
    routeTab && routeScreen
      ? {
          tab: routeTab as TabKey,
          screen: routeScreen as Screen,
          params: state.route?.params && typeof state.route.params === 'object' ? state.route.params : undefined,
        }
      : { tab, screen: getTabRoot(tab) };
  const history = Array.isArray(state.history)
    ? state.history
        .filter((item): item is Route => Boolean(item && typeof item === 'object'))
        .map((item) => ({
          tab: (item as Route).tab,
          screen: (item as Route).screen,
          params: (item as Route).params,
        }))
    : [];
  return { tab, route, history };
};

export const ShoppingApp: React.FC<ShoppingAppProps> = ({ onClose, context }) => {
  const launchState = React.useMemo(() => resolveShoppingLaunchState(context), [context]);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [tab, setTab] = React.useState<TabKey>(launchState.tab);
  const [route, setRoute] = React.useState<Route>(launchState.route);
  const [history, setHistory] = React.useState<Route[]>(launchState.history);
  const [stores, setStores] = React.useState<CommerceStore[]>([]);
  const [homeTopTab, setHomeTopTab] = React.useState<string>(DEFAULT_SHOPPING_HOME_TAB);

  const {
    products: dessertProducts,
    cart: dessertCart,
    setDessertCart,
    hydrateCommerceData,
    addToCart: addDessertToCart,
    setLoading: setDessertLoading,
    flowerProducts,
    flowerCart,
    setFlowerProducts,
    setFlowerCart,
    orders,
    setOrders,
    favorites,
    setFavorites,
    addresses,
    setAddresses,
    settings,
    setSettingNotify,
    setSettingFaceId,
  } = useShoppingStore();

  const [movieQuery, setMovieQuery] = React.useState('');
  const [selectedMovie, setSelectedMovie] = React.useState<Movie | null>(null);
  const [movieProducts, setMovieProducts] = React.useState<ProductItem[]>([]);
  const [movieDate, setMovieDate] = React.useState(resolveMovieDateDefault(defaultStores[2]));
  const [movieQty, setMovieQty] = React.useState(resolveMovieQtyDefault(defaultStores[2]));
  const [movieCinema, setMovieCinema] = React.useState(DEFAULT_STORE_MOVIE_CHECKOUT_LABELS[8]);
  const [movieSession, setMovieSession] = React.useState(DEFAULT_STORE_MOVIE_SESSION_OPTIONS[0]);
  const wechatCharacters = useWeChatFriendCharactersFromContacts();
  const wechatSessions = useWeChatStore((state) => state.wechatSessions);
  const syncWeChatRoleContext = useWeChatStore((state) => state.syncWeChatRoleContext);
  const [selectedPayeeContactId, setSelectedPayeeContactId] = React.useState('');
  const [mergedPaymentSheetStage, setMergedPaymentSheetStage] = React.useState<'method' | 'payee'>('method');

  const [newAddrName, setNewAddrName] = React.useState('');
  const [newAddrPhone, setNewAddrPhone] = React.useState('');
  const [newAddrAddress, setNewAddrAddress] = React.useState('');

  const [shippingMode, setShippingMode] = React.useState<ShippingMode>('now');
  const [scheduleDate, setScheduleDate] = React.useState(formatDate(addDays(new Date(), 1)));
  const [scheduleTime, setScheduleTime] = React.useState('10:00');
  const [selectedCartAddressId, setSelectedCartAddressId] = React.useState<string | null>(null);
  const [selectedCartLineKeys, setSelectedCartLineKeys] = React.useState<Record<string, boolean>>({});
  const [paymentSheetTarget, setPaymentSheetTarget] = React.useState<PaymentSheetTarget | null>(null);
  const [pendingMovieStoreId, setPendingMovieStoreId] = React.useState<string | null>(null);
  const [pendingOrderPaymentId, setPendingOrderPaymentId] = React.useState<string | null>(null);
  const [pendingMovieShareOrderId, setPendingMovieShareOrderId] = React.useState<string | null>(null);
  const homeTopTabs = React.useMemo(() => resolveShoppingHomeTabs(stores), [stores]);
  const payeeContacts = React.useMemo(
    () => {
      const characterById = new Map(
        wechatCharacters.map((character) => [character.id.trim(), character] as const)
      );
      const seen = new Set<string>();
      return wechatSessions
        .map((session) => {
          const characterId = session.characterId.trim();
          if (!characterId) return null;
          if (seen.has(characterId)) return null;
          if (!Array.isArray(session.messages) || session.messages.length === 0) return null;
          const character = characterById.get(characterId);
          if (!character) return null;
          const name = character.name.trim();
          if (!name) return null;
          seen.add(characterId);
          return {
            id: characterId,
            name,
            avatar: character.avatar?.trim() || '',
          };
        })
        .filter((contact): contact is PayeeContact => Boolean(contact));
    },
    [wechatCharacters, wechatSessions]
  );
  const selectedPayeeContact = React.useMemo(
    () => payeeContacts.find((contact) => contact.id === selectedPayeeContactId),
    [payeeContacts, selectedPayeeContactId]
  );


  React.useEffect(() => {
    syncWeChatRoleContext();
  }, [syncWeChatRoleContext]);

  React.useEffect(() => {
    if (homeTopTabs.includes(homeTopTab)) return;
    setHomeTopTab(DEFAULT_SHOPPING_HOME_TAB);
  }, [homeTopTab, homeTopTabs]);

  React.useEffect(() => {
    if (payeeContacts.length === 0) {
      if (selectedPayeeContactId !== '') setSelectedPayeeContactId('');
      return;
    }
    if (selectedPayeeContactId && payeeContacts.some((contact) => contact.id === selectedPayeeContactId)) return;
    setSelectedPayeeContactId(payeeContacts[0].id);
  }, [payeeContacts, selectedPayeeContactId]);


  const refreshStores = React.useCallback(async () => {
    await hydrateCommerceData();
    const [next, nextMovieProducts] = await Promise.all([
      loadCommerceStores(),
      readMovieProductsFromStorage(),
    ]);
    setStores(next);
    setMovieProducts(nextMovieProducts);
  }, [hydrateCommerceData]);

  React.useEffect(() => {
    initializeSellerMessageScheduler();
  }, []);

  React.useEffect(() => {
    const handleStoresUpdated = () => {
      void refreshStores();
    };
    window.addEventListener(STORES_UPDATED_EVENT, handleStoresUpdated);
    return () => window.removeEventListener(STORES_UPDATED_EVENT, handleStoresUpdated);
  }, [refreshStores]);

  React.useEffect(() => {
    let cancelled = false;
    const syncRoleScopedShoppingState = async () => {
      await useShoppingStore.persist.rehydrate();
      if (cancelled) return;
      await refreshStores();
    };

    const handleCommerceRoleChanged = () => {
      void syncRoleScopedShoppingState();
    };

    void syncRoleScopedShoppingState();

    window.addEventListener(COMMERCE_ROLE_CHANGED_EVENT, handleCommerceRoleChanged);

    return () => {
      cancelled = true;
      window.removeEventListener(COMMERCE_ROLE_CHANGED_EVENT, handleCommerceRoleChanged);
    };
  }, [refreshStores]);

  const hasDock = route.screen === 'dessert' || route.screen === 'flowers';
  const isRoot = route.screen === getTabRoot(tab) && history.length === 0;
  const settingNotify = settings.notify;
  const settingFaceId = settings.faceId;

  const defaultAddress = React.useMemo(
    () => addresses.find((addr) => addr.isDefault) ?? addresses[0],
    [addresses]
  );
  const selectedCartAddress = React.useMemo(() => {
    if (addresses.length === 0) return undefined;
    return addresses.find((addr) => addr.id === selectedCartAddressId) ?? defaultAddress ?? addresses[0];
  }, [addresses, defaultAddress, selectedCartAddressId]);

  React.useEffect(() => {
    if (addresses.length === 0) {
      if (selectedCartAddressId !== null) setSelectedCartAddressId(null);
      return;
    }
    if (selectedCartAddressId && addresses.some((addr) => addr.id === selectedCartAddressId)) return;
    const fallbackId = (defaultAddress ?? addresses[0])?.id;
    if (fallbackId && fallbackId !== selectedCartAddressId) {
      setSelectedCartAddressId(fallbackId);
    }
  }, [addresses, defaultAddress, selectedCartAddressId]);

  const editingAddressId = route.screen === 'address-add' ? (route.params?.editId as string | undefined) : undefined;
  React.useEffect(() => {
    if (route.screen !== 'address-add') return;
    if (editingAddressId) {
      const target = addresses.find((addr) => addr.id === editingAddressId);
      if (!target) return;
      setNewAddrName(target.name);
      setNewAddrPhone(target.phone);
      setNewAddrAddress(target.address);
      return;
    }
    setNewAddrName('');
    setNewAddrPhone('');
    setNewAddrAddress('');
  }, [addresses, editingAddressId, route.screen, setNewAddrAddress, setNewAddrName, setNewAddrPhone]);

  const routeStoreId = route.params?.storeId as string | undefined;
  const activeDessertStore = pickStore(stores, 'dessert', routeStoreId);
  const activeFlowerStore = pickStore(stores, 'flower', routeStoreId);
  const activeMovieStore = pickStore(stores, 'movie', routeStoreId);
  const mergedCartGroups = React.useMemo<ShoppingCartGroup[]>(() => {
    const groupedRaw = new Map<
      string,
      {
        kind: GoodsKind;
        storeId: string;
        storeName: string;
        storeTypeName?: string;
        storeSignboard?: string;
        storeDecoration?: string;
        items: ProductItem[];
      }
    >();
    const appendGroupItems = (kind: GoodsKind, items: ProductItem[]) => {
      items.forEach((item) => {
        const storeId = resolveProductStoreId(item, kind);
        const key = `${kind}-${storeId}`;
        const store = pickStore(stores, kind, storeId);
        const found = groupedRaw.get(key);
        if (found) {
          found.items.push(item);
          return;
        }
        groupedRaw.set(key, {
          kind,
          storeId,
          storeName: store.name,
          storeTypeName: store.typeName,
          storeSignboard: store.signboard,
          storeDecoration: store.decoration,
          items: [item],
        });
      });
    };
    appendGroupItems('dessert', dessertCart);
    appendGroupItems('flower', flowerCart);
    return Array.from(groupedRaw.values())
      .map((group) => {
        const lines = mergeCartToLines(group.items);
        const count = group.items.length;
        const total = lines.reduce((sum, line) => sum + line.subtotal, 0);
        return {
          kind: group.kind,
          storeId: group.storeId,
          storeName: group.storeName,
          storeTypeName: group.storeTypeName,
          storeSignboard: group.storeSignboard,
          storeDecoration: group.storeDecoration,
          lines,
          count,
          total,
        };
      })
      .sort((left, right) => left.storeName.localeCompare(right.storeName));
  }, [dessertCart, flowerCart, stores]);
  const mergedCartTotalCount = React.useMemo(
    () => mergedCartGroups.reduce((sum, group) => sum + group.count, 0),
    [mergedCartGroups]
  );
  React.useEffect(() => {
    const availableKeys = new Set<string>();
    mergedCartGroups.forEach((group) => {
      group.lines.forEach((line) => {
        availableKeys.add(buildCartLineKey(group.kind, group.storeId, line.id));
      });
    });
    setSelectedCartLineKeys((prev) => {
      const next: Record<string, boolean> = {};
      let changed = false;
      availableKeys.forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(prev, key)) {
          next[key] = prev[key];
        } else {
          next[key] = true;
          changed = true;
        }
      });
      Object.keys(prev).forEach((key) => {
        if (!availableKeys.has(key)) changed = true;
      });
      if (!changed && Object.keys(prev).length === Object.keys(next).length) return prev;
      return next;
    });
  }, [mergedCartGroups]);
  const mergedSelectedCartGroups = React.useMemo<ShoppingCartGroup[]>(() => {
    return mergedCartGroups
      .map((group) => {
        const selectedLines = group.lines.filter((line) => {
          const key = buildCartLineKey(group.kind, group.storeId, line.id);
          return selectedCartLineKeys[key] !== false;
        });
        if (selectedLines.length === 0) return null;
        const selectedCount = selectedLines.reduce((sum, line) => sum + line.qty, 0);
        const selectedTotal = selectedLines.reduce((sum, line) => sum + line.subtotal, 0);
        return {
          ...group,
          lines: selectedLines,
          count: selectedCount,
          total: selectedTotal,
        };
      })
      .filter((group): group is ShoppingCartGroup => Boolean(group));
  }, [mergedCartGroups, selectedCartLineKeys]);
  const mergedSelectedCartTotalCount = React.useMemo(
    () => mergedSelectedCartGroups.reduce((sum, group) => sum + group.count, 0),
    [mergedSelectedCartGroups]
  );
  const mergedSelectedCartTotalAmount = React.useMemo(
    () => mergedSelectedCartGroups.reduce((sum, group) => sum + group.total, 0),
    [mergedSelectedCartGroups]
  );
  const globalGoodsCart = React.useMemo(() => [...dessertCart, ...flowerCart], [dessertCart, flowerCart]);
  const globalGoodsCartTotal = React.useMemo(
    () => globalGoodsCart.reduce((sum, item) => sum + item.price, 0),
    [globalGoodsCart]
  );
  const activeMovieCheckoutLabels = React.useMemo(
    () =>
      DEFAULT_STORE_MOVIE_CHECKOUT_LABELS.map(
        (label, index) => (activeMovieStore.decorationConfig?.movieCheckoutLabels?.[index] || '').trim() || label
      ),
    [activeMovieStore]
  );
  const activeMovieSessionOptions = React.useMemo(
    () =>
      DEFAULT_STORE_MOVIE_SESSION_OPTIONS.map(
        (label, index) => (activeMovieStore.decorationConfig?.movieSessionOptions?.[index] || '').trim() || label
      ),
    [activeMovieStore]
  );

  React.useEffect(() => {
    if (activeMovieSessionOptions.includes(movieSession)) return;
    setMovieSession(activeMovieSessionOptions[0] || DEFAULT_STORE_MOVIE_SESSION_OPTIONS[0]);
  }, [activeMovieSessionOptions, movieSession]);

  const headerTitle = React.useMemo(() => {
    if (route.screen === 'dessert') return activeDessertStore.signboard || activeDessertStore.name;
    if (route.screen === 'flowers') return activeFlowerStore.signboard || activeFlowerStore.name;
    if (route.screen === 'movies') return activeMovieStore.signboard || activeMovieStore.name;
    if (route.screen === 'movie-checkout') return activeMovieCheckoutLabels[7];
    if (route.screen === 'address-add' && route.params?.editId) return '编辑地址';
    return staticHeaderTitleMap[route.screen] ?? '购物';
  }, [route.screen, route.params?.editId, activeDessertStore, activeFlowerStore, activeMovieStore, activeMovieCheckoutLabels]);

  const navigate = (next: Route) => {
    setHistory((prev) => [...prev, route]);
    setRoute(next);
  };

  const go = (screen: Screen, params?: Route['params']) => {
    navigate({ tab, screen, params });
  };

  const switchTab = (nextTab: TabKey) => {
    setTab(nextTab);
    setHistory([]);
    setRoute({ tab: nextTab, screen: getTabRoot(nextTab) });
  };

  const goBack = () => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setHistory((prevHistory) => prevHistory.slice(0, -1));
      setTab(prev.tab);
      setRoute(prev);
      return;
    }

    if (tab !== 'home') {
      switchTab('home');
      return;
    }

    onClose();
  };

  const resetShippingSchedule = () => {
    setShippingMode('now');
    setScheduleDate(formatDate(addDays(new Date(), 1)));
    setScheduleTime('10:00');
  };

  const addFlowerToCart = (id: string) => {
    const product = flowerProducts.find((item) => item.id === id);
    if (!product) return;
    setFlowerCart((prev) => [...prev, product]);
  };

  const clearDessertCartByStore = (storeId: string) => {
    setDessertCart((prev) => prev.filter((item) => resolveProductStoreId(item, 'dessert') !== storeId));
  };

  const clearFlowerCartByStore = (storeId: string) => {
    setFlowerCart((prev) => prev.filter((item) => resolveProductStoreId(item, 'flower') !== storeId));
  };

  const removeOneDessertCartItem = React.useCallback((storeId: string, productId: string) => {
    setDessertCart((prev) => {
      const targetIndex = prev.findIndex(
        (item) => item.id === productId && resolveProductStoreId(item, 'dessert') === storeId
      );
      if (targetIndex < 0) return prev;
      const next = [...prev];
      next.splice(targetIndex, 1);
      return next;
    });
  }, [setDessertCart]);

  const removeOneFlowerCartItem = React.useCallback((storeId: string, productId: string) => {
    setFlowerCart((prev) => {
      const targetIndex = prev.findIndex(
        (item) => item.id === productId && resolveProductStoreId(item, 'flower') === storeId
      );
      if (targetIndex < 0) return prev;
      const next = [...prev];
      next.splice(targetIndex, 1);
      return next;
    });
  }, [setFlowerCart]);

  const addOneDessertCartItem = React.useCallback((storeId: string, productId: string) => {
    const product =
      dessertProducts.find(
        (item) => item.id === productId && resolveProductStoreId(item, 'dessert') === storeId
      ) ||
      dessertCart.find(
        (item) => item.id === productId && resolveProductStoreId(item, 'dessert') === storeId
      );
    if (!product) return;
    setDessertCart((prev) => [...prev, product]);
  }, [dessertCart, dessertProducts, setDessertCart]);

  const addOneFlowerCartItem = React.useCallback((storeId: string, productId: string) => {
    const product =
      flowerProducts.find(
        (item) => item.id === productId && resolveProductStoreId(item, 'flower') === storeId
      ) ||
      flowerCart.find(
        (item) => item.id === productId && resolveProductStoreId(item, 'flower') === storeId
      );
    if (!product) return;
    setFlowerCart((prev) => [...prev, product]);
  }, [flowerCart, flowerProducts, setFlowerCart]);

  const handleDessertAddToCart = (id: string) => {
    setDessertLoading(true);
    setTimeout(() => {
      addDessertToCart(id);
      setDessertLoading(false);
    }, 300);
  };

  const isFavorited = (kind: Favorite['kind'], id: string, storeId: string) =>
    favorites.some(
      (fav) => fav.kind === kind && fav.id === id && (fav.storeId || getDefaultStoreIdByKind(kind)) === storeId
    );

  const toggleFavorite = (kind: Favorite['kind'], product: ProductItem, storeId: string) => {
    const existsNow = favorites.some(
      (fav) => fav.kind === kind && fav.id === product.id && (fav.storeId || getDefaultStoreIdByKind(kind)) === storeId
    );
    setFavorites((prev) => {
      const exists = prev.some(
        (fav) => fav.kind === kind && fav.id === product.id && (fav.storeId || getDefaultStoreIdByKind(kind)) === storeId
      );
      if (exists) {
        return prev.filter(
          (fav) =>
            !(fav.kind === kind && fav.id === product.id && (fav.storeId || getDefaultStoreIdByKind(kind)) === storeId)
        );
      }
      return [
        {
          id: product.id,
          kind,
          storeId,
          name: product.name,
          desc: product.desc,
          price: product.price,
        },
        ...prev,
      ];
    });
    if (!existsNow) {
      const storeName = stores.find((item) => item.id === storeId)?.signboard
        || stores.find((item) => item.id === storeId)?.name
        || '店铺';
      void triggerFavoriteInquiryMessage({ kind, product, storeName });
    }
  };

  const ensureAddressOrGoAdd = (after: Route) => {
    if (selectedCartAddress || defaultAddress) return true;
    go('address-add', {
      returnTo: after.screen,
      returnTab: after.tab,
      returnParams: after.params ?? {},
    });
    return false;
  };

  const openOrderDetail = (orderId: string) => {
    navigate({ tab: 'orders', screen: 'order-detail', params: { orderId } });
  };

  const placeGoodsOrder = (kind: GoodsKind, store: CommerceStore) => {
    const fullCart = kind === 'dessert' ? dessertCart : flowerCart;
    const cart = filterProductsByStore(fullCart, kind, store.id);
    if (cart.length === 0) return;

    const nextRoute: Route = { tab: 'orders', screen: 'orders' };
    if (!ensureAddressOrGoAdd(nextRoute)) return;

    const lines = groupCartLines(cart);
    const total = lines.reduce((sum, line) => sum + line.qty * line.unitPrice, 0);
    const now = Date.now();
    const orderId = `OD${now.toString().slice(-10)}`;

    const scheduleAt =
      shippingMode === 'schedule' ? new Date(`${scheduleDate}T${scheduleTime}:00`).getTime() : now;
    const shipAt = Number.isFinite(scheduleAt) ? scheduleAt : now;
    const trackingId = `SF${Math.floor(100000000 + Math.random() * 900000000)}`;
    const isDelegatePayment = Boolean(selectedPayeeContact);

    const newOrder: Order = {
      id: orderId,
      kind,
      title: `${store.name}订单`,
      lines,
      total,
      createdAt: now,
      address: defaultAddress,
      meta: {
        shipMode: shippingMode,
        shipAt,
        trackingId,
        storeId: store.id,
        storeName: store.name,
        storeCode: store.code,
        paymentStatus: isDelegatePayment ? 'pending-pay' : 'paid',
        payStatus: isDelegatePayment ? 'pending-pay' : 'paid',
        status: isDelegatePayment ? '待付款' : '已付款',
        payeeContactId: selectedPayeeContact?.id || '',
        payeeName: selectedPayeeContact?.name || '',
      },
    };

    setOrders((prev) => [newOrder, ...prev]);
    if (kind === 'dessert') clearDessertCartByStore(store.id);
    else clearFlowerCartByStore(store.id);

    setTab('orders');
    setHistory([{ tab: 'orders', screen: 'orders' }]);
    setRoute({ tab: 'orders', screen: 'order-detail', params: { orderId } });

    if (selectedPayeeContact) {
      const addressText = [(selectedCartAddress ?? defaultAddress)]
        .filter(Boolean)
        .map((item) => `${item.name} ${item.phone} ${item.address}`)
        .join(' · ');
      const shareText = [
        `麻烦你帮我代付这笔${kind === 'dessert' ? '甜品' : '鲜花'}订单`,
        `订单号：${orderId}`,
        `店铺：${store.name}`,
        `商品：${lines.map((line) => `${line.name} x${line.qty}`).join('，')}`,
        `金额：${formatMoney(total)}`,
        `配送：${shippingMode === 'schedule' ? `预约 ${scheduleDate} ${scheduleTime}` : '立即发货'}`,
        addressText ? `收货地址：${addressText}` : '',
      ]
        .filter(Boolean)
        .join('\n');
      shareWechatOrder(shareText);
    }
  };

  const payByWechatBalance = React.useCallback((amount: number, title: string) => {
    const wechatStore = useWeChatStore.getState();
    if (typeof wechatStore.syncWeChatRoleContext === 'function') {
      wechatStore.syncWeChatRoleContext();
    }
    const amountToPay = toMoney2(amount);
    const balance = toMoney2(Number(wechatStore.wechatUserProfile.balance || 0));
    if (balance < amountToPay) {
      window.alert(`余额不足，当前微信钱包余额 ${formatMoney(balance)}，需支付 ${formatMoney(amountToPay)}`);
      return false;
    }
    wechatStore.withdrawWeChatBalance(amountToPay, { title });
    return true;
  }, []);

  const openApp = React.useCallback((appId: string, params?: Record<string, unknown>) => {
    window.dispatchEvent(
      new CustomEvent(PUSH_OPEN_APP_MESSAGE_TYPE, {
        detail: {
          appId,
          params,
        },
      })
    );
  }, []);

  const shareWechatMessage = React.useCallback((message: {
    content: string;
    type?: 'text' | 'order_request' | 'movie_ticket';
    amount?: number;
    orderRequestStatus?: 'pending' | 'accepted' | 'rejected';
    orderIds?: string[];
    orderPreview?: WeChatOrderPreview;
    movieTicket?: {
      orderId: string;
      movieTitle: string;
      cinema: string;
      date: string;
      time: string;
      hall: string;
      seat: string;
      qty: number;
      pickupCode: string;
    };
  }, targetContact?: PayeeContact) => {
    const contact = targetContact ?? selectedPayeeContact;
    if (!contact) return false;
    const wechatStore = useWeChatStore.getState();
    if (typeof wechatStore.syncWeChatRoleContext === 'function') {
      wechatStore.syncWeChatRoleContext();
    }
    const sessionId = wechatStore.ensureWeChatSession(contact.id, { switchCurrent: true });
    if (!sessionId) return false;
    wechatStore.addWeChatMessage(sessionId, {
      role: 'user',
      content: message.content,
      assistantReplyPending: true,
      type: message.type || 'text',
      amount: message.amount,
      orderRequestStatus: message.orderRequestStatus,
      orderIds: message.orderIds,
      orderPreview: message.orderPreview,
      movieTicket: message.movieTicket,
    });
    return true;
  }, [selectedPayeeContact]);
  const shareWechatOrder = React.useCallback((content: string, targetContact?: PayeeContact) => {
    return shareWechatMessage({ content, type: 'text' }, targetContact);
  }, [shareWechatMessage]);
  const placeMergedGoodsOrders = React.useCallback((paymentMethod: MergedPaymentMethod, targetContact?: PayeeContact) => {
    if (mergedSelectedCartGroups.length === 0) {
      window.alert('请先勾选要结算的商品');
      return false;
    }

    const nextRoute: Route = { tab: 'cart', screen: 'cart' };
    if (!ensureAddressOrGoAdd(nextRoute)) return false;

    if (paymentMethod === 'wechat') {
      const uniqueStoreNames = Array.from(
        new Set(
          mergedSelectedCartGroups
            .map((group) => (group.storeName || '').trim())
            .filter((value) => value.length > 0)
        )
      );
      const billTitle =
        uniqueStoreNames.length === 0
          ? '购物支出'
          : uniqueStoreNames.length === 1
            ? `${uniqueStoreNames[0]}支出`
            : `${uniqueStoreNames[0]}等${uniqueStoreNames.length}家店铺支出`;
      if (!payByWechatBalance(mergedSelectedCartTotalAmount, billTitle)) return false;
    }

    const now = Date.now();
    const scheduleAt =
      shippingMode === 'schedule' ? new Date(`${scheduleDate}T${scheduleTime}:00`).getTime() : now;
    const shipAt = Number.isFinite(scheduleAt) ? scheduleAt : now;

    const nextOrders: Order[] = mergedSelectedCartGroups.map((group, index) => {
      const store = pickStore(stores, group.kind, group.storeId);
      const trackingId = `SF${Math.floor(100000000 + Math.random() * 900000000)}`;
      const orderId = `OD${(now + index).toString().slice(-10)}`;
      const isDelegatePayment = paymentMethod === 'delegate';
      return {
        id: orderId,
        kind: group.kind,
        title: `${store.name}订单`,
        lines: group.lines.map((line) => ({
          name: line.name,
          qty: line.qty,
          unitPrice: line.unitPrice,
        })),
        total: group.total,
        createdAt: now + index,
        address: (selectedCartAddress ?? defaultAddress),
        meta: {
          shipMode: shippingMode,
          shipAt,
          trackingId,
          storeId: store.id,
          storeName: store.name,
          storeCode: store.code,
          paymentStatus: isDelegatePayment ? 'pending-pay' : 'paid',
          payStatus: isDelegatePayment ? 'pending-pay' : 'paid',
          status: isDelegatePayment ? '待付款' : '已付款',
          delegateStatus: isDelegatePayment ? 'pending' : '',
          payeeContactId: (targetContact ?? selectedPayeeContact)?.id || '',
          payeeName: (targetContact ?? selectedPayeeContact)?.name || '',
        },
      };
    });

    setOrders((prev) => [...nextOrders, ...prev]);
    setDessertCart((prev) => dropPurchasedItemsFromCart(prev, 'dessert', mergedSelectedCartGroups));
    setFlowerCart((prev) => dropPurchasedItemsFromCart(prev, 'flower', mergedSelectedCartGroups));
    setTab('orders');
    setHistory([]);
    setRoute({ tab: 'orders', screen: 'orders' });

    const payeeContact = targetContact ?? selectedPayeeContact;
    if (payeeContact) {
      if (paymentMethod === 'delegate') {
        shareWechatMessage(
          {
            content: '有一笔订单等你支付~',
            type: 'order_request',
            amount: mergedSelectedCartTotalAmount,
            orderRequestStatus: 'pending',
            orderIds: nextOrders.map((order) => order.id),
            orderPreview: buildOrderPreview(nextOrders),
          },
          payeeContact
        );
        openApp('wechat', {
          openChatCharacterId: payeeContact.id,
          returnAppId: 'shopping',
          returnParams: {
            shoppingState: {
              tab: 'cart',
              route: { tab: 'cart', screen: 'cart' },
              history: [],
            },
          },
        });
      } else {
        const shareText = [
          '麻烦你帮我代付这次购物结算',
          `共 ${nextOrders.length} 笔订单，合计 ${formatMoney(mergedSelectedCartTotalAmount)}`,
          ...nextOrders.map((order) => {
            const lineText = order.lines.map((line) => `${line.name} x${line.qty}`).join('，');
            return `${order.title}：${lineText}，${formatMoney(order.total)}`;
          }),
          (selectedCartAddress ?? defaultAddress)
            ? `收货地址：${((selectedCartAddress ?? defaultAddress))?.name} ${((selectedCartAddress ?? defaultAddress))?.phone} ${((selectedCartAddress ?? defaultAddress))?.address}`
            : '',
        ]
          .filter(Boolean)
          .join('\n');
        shareWechatOrder(shareText, payeeContact);
      }
    }
    return true;
  }, [
    selectedCartAddress,
    defaultAddress,
    ensureAddressOrGoAdd,
    mergedSelectedCartGroups,
    mergedSelectedCartTotalAmount,
    scheduleDate,
    scheduleTime,
    setDessertCart,
    setFlowerCart,
    shippingMode,
    stores,
    payByWechatBalance,
    selectedPayeeContact,
    openApp,
    shareWechatMessage,
    shareWechatOrder,
  ]);

  const openOrderDetailPaymentSheet = React.useCallback((orderId: string) => {
    const targetOrder = orders.find((item) => item.id === orderId);
    if (!targetOrder) return;
    setPendingMovieStoreId(null);
    setPendingOrderPaymentId(orderId);
    setPendingMovieShareOrderId(null);
    setMergedPaymentSheetStage('method');
    setPaymentSheetTarget('order-detail');
  }, [orders]);

  const openMovieShareSheet = React.useCallback((orderId: string) => {
    const targetOrder = orders.find((item) => item.id === orderId && item.kind === 'movie');
    if (!targetOrder) return;
    setPendingMovieStoreId(null);
    setPendingOrderPaymentId(null);
    setPendingMovieShareOrderId(orderId);
    setMergedPaymentSheetStage('payee');
    setPaymentSheetTarget('movie-share');
  }, [orders]);

  const openMergedPaymentSheet = React.useCallback(() => {
    if (mergedCartGroups.length === 0) return;
    if (mergedSelectedCartGroups.length === 0) {
      window.alert('请先勾选要结算的商品');
      return;
    }
    const nextRoute: Route = { tab: 'cart', screen: 'cart' };
    if (!ensureAddressOrGoAdd(nextRoute)) return;
    setPendingMovieStoreId(null);
    setPendingOrderPaymentId(null);
    setPendingMovieShareOrderId(null);
    setMergedPaymentSheetStage('method');
    setPaymentSheetTarget('merged-cart');
  }, [ensureAddressOrGoAdd, mergedCartGroups.length, mergedSelectedCartGroups.length]);

  const openMoviePaymentSheet = React.useCallback((store: CommerceStore) => {
    if (!selectedMovie) return;
    setPendingMovieStoreId(store.id);
    setPendingOrderPaymentId(null);
    setPendingMovieShareOrderId(null);
    setPaymentSheetTarget('movie');
  }, [selectedMovie]);

  const placeMovieOrder = React.useCallback((store: CommerceStore, paymentMethod: MergedPaymentMethod) => {
    if (!selectedMovie) return;
    if (paymentMethod === 'wechat') {
      const totalAmount = selectedMovie.price * movieQty;
      if (!payByWechatBalance(totalAmount, `${store.name}支出`)) return;
    }

    const now = Date.now();
    const orderId = `TP${now.toString().slice(-10)}`;

    const total = selectedMovie.price * movieQty;
    const seatStart = 10;
    const seatEnd = seatStart + Math.max(1, movieQty) - 1;

    const newOrder: Order = {
      id: orderId,
      kind: 'movie',
      title: `${store.name}票据`,
      lines: [{ name: selectedMovie.title, qty: movieQty, unitPrice: selectedMovie.price }],
      total,
      createdAt: now,
      meta: {
        movieTitle: selectedMovie.title,
        cinema: movieCinema,
        date: movieDate,
        time: movieSession,
        hall: '3号厅',
        seat: `F${seatStart}-F${seatEnd}`,
        storeId: store.id,
        storeName: store.name,
        storeCode: store.code,
      },
    };

    setOrders((prev) => [newOrder, ...prev]);

    setTab('orders');
    setHistory([{ tab: 'orders', screen: 'orders' }]);
    setRoute({ tab: 'orders', screen: 'order-detail', params: { orderId } });
  }, [
    movieCinema,
    movieDate,
    movieQty,
    movieSession,
    payByWechatBalance,
    selectedMovie,
  ]);

  const placeOrderDetailPayment = React.useCallback((orderId: string, paymentMethod: MergedPaymentMethod, targetContact?: PayeeContact) => {
    const targetOrder = orders.find((item) => item.id === orderId);
    if (!targetOrder) return false;

    const payeeContact = targetContact ?? selectedPayeeContact;
    const storeName =
      String(targetOrder.meta?.storeName ?? '').trim() ||
      targetOrder.title.replace(/订单$|票据$/, '').trim() ||
      '购物';

    if (paymentMethod === 'wechat') {
      if (!payByWechatBalance(targetOrder.total, `${storeName}支出`)) return false;
      const now = Date.now();
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? {
                ...order,
                meta: {
                  ...order.meta,
                  paymentStatus: 'paid',
                  payStatus: 'paid',
                  status: '已付款',
                  delegateStatus: 'accepted',
                  shipAt: now,
                },
              }
            : order
        )
      );

      setTab('orders');
      if (targetOrder.kind === 'movie') {
        setHistory([{ tab: 'orders', screen: 'orders' }]);
        setRoute({ tab: 'orders', screen: 'order-detail', params: { orderId } });
      } else {
        setHistory([
          { tab: 'orders', screen: 'orders' },
          { tab: 'orders', screen: 'order-detail', params: { orderId } },
        ]);
        setRoute({ tab: 'orders', screen: 'logistics', params: { orderId } });
      }
      return true;
    }

    if (!payeeContact) {
      window.alert('微信聊天列表里还没有可用于代付的人');
      return false;
    }

    setSelectedPayeeContactId(payeeContact.id);
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId
          ? {
              ...order,
              meta: {
                ...order.meta,
                paymentStatus: 'pending-pay',
                payStatus: 'pending-pay',
                status: '待付款',
                delegateStatus: 'pending',
                payeeContactId: payeeContact.id,
                payeeName: payeeContact.name,
              },
            }
          : order
      )
    );

    const shared = shareWechatMessage(
      {
        content: '有一笔订单等你支付~',
        type: 'order_request',
        amount: targetOrder.total,
        orderRequestStatus: 'pending',
        orderIds: [orderId],
        orderPreview: buildOrderPreview([targetOrder]),
      },
      payeeContact
    );
    if (!shared) return false;

    openApp('wechat', {
      openChatCharacterId: payeeContact.id,
      returnAppId: 'shopping',
      returnParams: {
        shoppingState: {
          tab: 'orders',
          route: { tab: 'orders', screen: 'order-detail', params: { orderId } },
          history: [{ tab: 'orders', screen: 'orders' }],
        },
      },
    });
    return true;
  }, [openApp, orders, payByWechatBalance, selectedPayeeContact, setOrders, shareWechatMessage]);

  const shareMovieTicketOrder = React.useCallback((orderId: string, targetContact?: PayeeContact) => {
    const targetOrder = orders.find((item) => item.id === orderId && item.kind === 'movie');
    if (!targetOrder) return false;
    const contact = targetContact ?? selectedPayeeContact;
    if (!contact) {
      window.alert('微信聊天列表里还没有可分享的人');
      return false;
    }

    const pickupCode = (() => {
      const storedCode = String(targetOrder.meta?.pickupCode ?? '').trim();
      if (/^\d{6}$/.test(storedCode)) return storedCode;
      const digits = targetOrder.id.replace(/\D/g, '');
      if (digits.length >= 6) return digits.slice(-6);
      return digits.padStart(6, '0').slice(-6) || '462800';
    })();

    setSelectedPayeeContactId(contact.id);
    const shared = shareWechatMessage(
      {
        content: '电影票票据',
        type: 'movie_ticket',
        amount: targetOrder.total,
        movieTicket: {
          orderId: targetOrder.id,
          movieTitle: String(targetOrder.meta?.movieTitle ?? ''),
          cinema: String(targetOrder.meta?.cinema ?? ''),
          date: String(targetOrder.meta?.date ?? ''),
          time: String(targetOrder.meta?.time ?? ''),
          hall: String(targetOrder.meta?.hall ?? ''),
          seat: String(targetOrder.meta?.seat ?? ''),
          qty: targetOrder.lines[0]?.qty ?? 1,
          pickupCode,
        },
      },
      contact
    );
    if (!shared) return false;

    openApp('wechat', {
      openChatCharacterId: contact.id,
      returnAppId: 'shopping',
      returnParams: {
        shoppingState: {
          tab: 'orders',
          route: { tab: 'orders', screen: 'order-detail', params: { orderId } },
          history: [{ tab: 'orders', screen: 'orders' }],
        },
      },
    });
    return true;
  }, [openApp, orders, selectedPayeeContact, shareWechatOrder]);

  const closePaymentSheet = React.useCallback(() => {
    setPaymentSheetTarget(null);
    setPendingMovieStoreId(null);
    setPendingOrderPaymentId(null);
    setPendingMovieShareOrderId(null);
    setMergedPaymentSheetStage('method');
  }, []);

  const activeMovieProducts = React.useMemo(() => {
    const scopedProducts = movieProducts.filter(
      (item) => (item.storeId || getDefaultStoreIdByKind('movie')) === activeMovieStore.id
    );
    const source = scopedProducts.length ? scopedProducts : toMovieStoreProducts(activeMovieStore.id);
    return sortProductsByDecorationOrder(source, activeMovieStore.decorationConfig?.productOrder);
  }, [activeMovieStore, movieProducts]);

  const filteredMovies = React.useMemo(() => {
    const source = activeMovieProducts.map(toMovie);
    if (!movieQuery.trim()) return source;
    const query = movieQuery.trim().toLowerCase();
    return source.filter((movie) => movie.title.toLowerCase().includes(query));
  }, [activeMovieProducts, movieQuery]);

  const setDefaultAddress = (id: string) => {
    setAddresses((prev) => prev.map((addr) => ({ ...addr, isDefault: addr.id === id })));
  };

  const selectAddressForCart = (id: string) => {
    setSelectedCartAddressId(id);
    if (route.screen !== 'addresses') return;
    const returnTo = route.params?.returnTo as Screen | undefined;
    const returnTab = (route.params?.returnTab as TabKey | undefined) ?? tab;
    const returnParams =
      (route.params?.returnParams as Record<string, unknown> | undefined) ?? {};
    if (!returnTo) return;
    setTab(returnTab);
    setHistory([]);
    setRoute({ tab: returnTab, screen: returnTo, params: returnParams });
  };

  const removeAddress = (id: string) => {
    setAddresses((prev) => {
      const next = prev.filter((addr) => addr.id !== id);
      if (next.length > 0 && !next.some((addr) => addr.isDefault)) {
        next[0] = { ...next[0], isDefault: true };
      }
      return next;
    });
  };

  const addAddress = () => {
    const editingId = route.screen === 'address-add' ? (route.params?.editId as string | undefined) : undefined;
    const name = newAddrName.trim();
    const phone = newAddrPhone.trim();
    const address = newAddrAddress.trim();
    if (!name || !phone || !address) return;

    if (editingId) {
      setAddresses((prev) =>
        prev.map((addr) => (addr.id === editingId ? { ...addr, name, phone, address } : addr))
      );
    } else {
      const id = `addr-${Date.now().toString().slice(-8)}`;
      const next: Address = {
        id,
        name,
        phone,
        address,
        isDefault: addresses.length === 0,
      };
      setAddresses((prev) => {
        if (prev.length === 0) return [next];
        return [...prev, next];
      });
    }

    setNewAddrName('');
    setNewAddrPhone('');
    setNewAddrAddress('');

    const returnTo = (route.params?.returnTo as string | undefined) ?? 'addresses';
    const returnTab = (route.params?.returnTab as TabKey | undefined) ?? tab;
    const returnParams =
      (route.params?.returnParams as Record<string, unknown> | undefined) ?? {};
    setTab(returnTab);
    setHistory([]);
    setRoute({ tab: returnTab, screen: returnTo as Screen, params: returnParams });
  };

  const toggleMergedCartLineSelected = React.useCallback(
    (kind: GoodsKind, storeId: string, productId: string, selected: boolean) => {
      const key = buildCartLineKey(kind, storeId, productId);
      setSelectedCartLineKeys((prev) => {
        if (prev[key] === selected) return prev;
        return { ...prev, [key]: selected };
      });
    },
    []
  );

  const isMergedCartLineSelected = React.useCallback(
    (kind: GoodsKind, storeId: string, productId: string) => {
      const key = buildCartLineKey(kind, storeId, productId);
      return selectedCartLineKeys[key] !== false;
    },
    [selectedCartLineKeys]
  );

  const renderContent = () => {
    switch (route.screen) {
      case 'home':
        return (
          <ShoppingHome
            ordersCount={orders.length}
            cartCount={mergedCartTotalCount}
            favoritesCount={favorites.length}
            addressesCount={addresses.length}
            stores={stores}
            topTabs={homeTopTabs}
            activeTopTab={homeTopTab}
            onSwitchTopTab={setHomeTopTab}
            onGoOrders={() => switchTab('orders')}
            onGoCart={() => switchTab('cart')}
            onGoStore={(store) => {
              if (store.kind === 'dessert') go('dessert', { storeId: store.id });
              else if (store.kind === 'flower') go('flowers', { storeId: store.id });
              else go('movies', { storeId: store.id });
            }}
          />
        );
      case 'cart':
        return (
          <ShoppingCart
            groups={mergedCartGroups}
            totalCount={mergedSelectedCartTotalCount}
            totalAmount={mergedSelectedCartTotalAmount}
            shippingMode={shippingMode}
            scheduleDate={scheduleDate}
            scheduleTime={scheduleTime}
            defaultAddress={selectedCartAddress}
            onSwitchAddress={() =>
              go('addresses', {
                returnTo: 'cart',
                returnTab: 'cart',
                returnParams: {},
                selectMode: 'cart',
              })
            }
            onManageAddress={() => go('addresses')}
            onShippingModeChange={(mode) => setShippingMode(mode)}
            onScheduleDateChange={(value) => setScheduleDate(value)}
            onScheduleTimeChange={(value) => setScheduleTime(value)}
            onCheckoutAll={openMergedPaymentSheet}
            onGoHome={() => switchTab('home')}
            isLineSelected={isMergedCartLineSelected}
            onToggleLineSelected={toggleMergedCartLineSelected}
            onAddOne={(kind, storeId, productId) => {
              if (kind === 'dessert') addOneDessertCartItem(storeId, productId);
              else addOneFlowerCartItem(storeId, productId);
            }}
            onRemoveOne={(kind, storeId, productId) => {
              if (kind === 'dessert') removeOneDessertCartItem(storeId, productId);
              else removeOneFlowerCartItem(storeId, productId);
            }}
            onClearStore={(kind, storeId) => {
              if (kind === 'dessert') clearDessertCartByStore(storeId);
              else clearFlowerCartByStore(storeId);
            }}
          />
        );
      case 'dessert': {
        const store = pickStore(stores, 'dessert', routeStoreId);
        const products = sortProductsByDecorationOrder(
          filterProductsByStore(dessertProducts, 'dessert', store.id),
          store.decorationConfig?.productOrder
        );
        return (
          <ShoppingProductList
            kind="dessert"
            storeName={store.name}
            storeTypeName={store.typeName}
            storeDescription={store.description}
            storeSignboard={store.signboard}
            storeDecoration={store.decoration}
            storeLogo={store.logo}
            storeCover={store.cover}
            storeTheme={store.theme}
            tabLabels={store.decorationConfig?.tabLabels}
            filterLabels={store.decorationConfig?.filterLabels}
            heroRatingLabels={store.decorationConfig?.heroRatingLabels}
            heroTagLabels={store.decorationConfig?.heroTagLabels}
            products={products}
            cart={globalGoodsCart}
            cartTotal={globalGoodsCartTotal}
            isFavorited={(id) => isFavorited('dessert', id, store.id)}
            onToggleFavorite={(product) => toggleFavorite('dessert', product, store.id)}
            onAddToCart={handleDessertAddToCart}
            onClearCart={() => clearDessertCartByStore(store.id)}
            onOpenCart={() => switchTab('cart')}
            onCheckout={() => {
              resetShippingSchedule();
              go('goods-checkout', { kind: 'dessert', storeId: store.id });
            }}
          />
        );
      }
      case 'flowers': {
        const store = pickStore(stores, 'flower', routeStoreId);
        const products = sortProductsByDecorationOrder(
          filterProductsByStore(flowerProducts, 'flower', store.id),
          store.decorationConfig?.productOrder
        );
        return (
          <ShoppingProductList
            kind="flower"
            storeName={store.name}
            storeTypeName={store.typeName}
            storeDescription={store.description}
            storeSignboard={store.signboard}
            storeDecoration={store.decoration}
            storeLogo={store.logo}
            storeCover={store.cover}
            storeTheme={store.theme}
            tabLabels={store.decorationConfig?.tabLabels}
            filterLabels={store.decorationConfig?.filterLabels}
            heroRatingLabels={store.decorationConfig?.heroRatingLabels}
            heroTagLabels={store.decorationConfig?.heroTagLabels}
            products={products}
            cart={globalGoodsCart}
            cartTotal={globalGoodsCartTotal}
            isFavorited={(id) => isFavorited('flower', id, store.id)}
            onToggleFavorite={(product) => toggleFavorite('flower', product, store.id)}
            onAddToCart={addFlowerToCart}
            onClearCart={() => clearFlowerCartByStore(store.id)}
            onOpenCart={() => switchTab('cart')}
            onCheckout={() => {
              resetShippingSchedule();
              go('goods-checkout', { kind: 'flower', storeId: store.id });
            }}
          />
        );
      }
      case 'goods-checkout': {
        const kind = (route.params?.kind as GoodsKind | undefined) ?? 'dessert';
        const storeId = (route.params?.storeId as string | undefined) ?? getDefaultStoreIdByKind(kind);
        const store = pickStore(stores, kind, storeId);
        const cart =
          kind === 'dessert'
            ? filterProductsByStore(dessertCart, 'dessert', store.id)
            : filterProductsByStore(flowerCart, 'flower', store.id);
        return (
          <ShoppingGoodsCheckout
            kind={kind}
            storeName={store.name}
            storeTypeName={store.typeName}
            storeSignboard={store.signboard}
            storeDecoration={store.decoration}
            cart={cart}
            shippingMode={shippingMode}
            scheduleDate={scheduleDate}
            scheduleTime={scheduleTime}
            defaultAddress={defaultAddress}
            payeeContacts={payeeContacts}
            selectedPayeeContactId={selectedPayeeContactId}
            onPayeeContactChange={(value) => setSelectedPayeeContactId(value)}
            onShippingModeChange={(mode) => setShippingMode(mode)}
            onScheduleDateChange={(value) => setScheduleDate(value)}
            onScheduleTimeChange={(value) => setScheduleTime(value)}
            onManageAddress={() => go('addresses')}
            onPlaceOrder={() => placeGoodsOrder(kind, store)}
            onBackToList={() => go(kind === 'dessert' ? 'dessert' : 'flowers', { storeId: store.id })}
          />
        );
      }
      case 'movies': {
        const store = pickStore(stores, 'movie', routeStoreId);
        return (
          <ShoppingMovies
            query={movieQuery}
            movies={filteredMovies}
            scrollRef={contentRef}
            onQueryChange={(value) => setMovieQuery(value)}
            storeSignboard={store.signboard}
            storeTypeName={store.typeName}
            storeDescription={store.description}
            storeLogo={store.logo}
            storeCover={store.cover}
            storeTheme={store.theme}
            movieTextLabels={store.decorationConfig?.movieTextLabels}
            onSelectMovie={(movie) => {
              setSelectedMovie(movie);
              setMovieDate(resolveMovieDateDefault(store));
              setMovieQty(resolveMovieQtyDefault(store));
              setMovieCinema(resolveMovieCinemaDefault(store));
              setMovieSession(activeMovieSessionOptions[0] || DEFAULT_STORE_MOVIE_SESSION_OPTIONS[0]);
              go('movie-checkout', { movieId: movie.id, storeId: store.id });
            }}
          />
        );
      }
      case 'movie-checkout': {
        const storeId =
          (route.params?.storeId as string | undefined) ?? getDefaultStoreIdByKind('movie');
        const store = pickStore(stores, 'movie', storeId);
        return (
          <ShoppingMovieCheckout
            movie={selectedMovie}
            movieCinema={movieCinema}
            movieDate={movieDate}
            movieSession={movieSession}
            movieQty={movieQty}
            movieCheckoutLabels={store.decorationConfig?.movieCheckoutLabels}
            movieSessionOptions={store.decorationConfig?.movieSessionOptions}
            onCinemaChange={(value) => setMovieCinema(value)}
            onDateChange={(value) => setMovieDate(value)}
            onSessionChange={(value) => setMovieSession(value)}
            onQtyChange={(value) => setMovieQty(value)}
            onPlaceOrder={() => openMoviePaymentSheet(store)}
            onBackToMovies={() => go('movies', { storeId: store.id })}
          />
        );
      }
      case 'orders':
        return (
          <ShoppingOrders
            orders={orders}
            scrollRef={contentRef}
            onOpenOrder={openOrderDetail}
            onDeleteOrder={(orderId) => setOrders((prev) => prev.filter((item) => item.id !== orderId))}
            onGoHome={() => switchTab('home')}
          />
        );
      case 'order-detail': {
        const orderId = route.params?.orderId as string | undefined;
        const order = orders.find((item) => item.id === orderId);
        return (
          <ShoppingOrderDetail
            order={order}
            onBackOrders={() => switchTab('orders')}
            onViewLogistics={(id) => go('logistics', { orderId: id })}
            onOpenPaymentOptions={openOrderDetailPaymentSheet}
            onShareMovieTicket={openMovieShareSheet}
          />
        );
      }
      case 'logistics': {
        const orderId = route.params?.orderId as string | undefined;
        const order = orders.find((item) => item.id === orderId);
        return <ShoppingLogistics order={order} onBackOrders={() => switchTab('orders')} />;
      }
      case 'me':
        return (
          <ShoppingMe
            ordersCount={orders.length}
            favoritesCount={favorites.length}
            addressesCount={addresses.length}
            onGoOrders={() => switchTab('orders')}
            onGoFavorites={() => go('favorites')}
            onGoAddresses={() => go('addresses')}
            onGoSettings={() => go('settings')}
          />
        );
      case 'favorites':
        return (
          <ShoppingFavorites
            favorites={favorites}
            scrollRef={contentRef}
            onRemove={(favorite) =>
              setFavorites((prev) =>
                prev.filter(
                  (item) =>
                    !(
                      item.kind === favorite.kind &&
                      item.id === favorite.id &&
                      (item.storeId || getDefaultStoreIdByKind(item.kind)) ===
                        (favorite.storeId || getDefaultStoreIdByKind(favorite.kind))
                    )
                )
              )
            }
            onGoHome={() => switchTab('home')}
          />
        );
      case 'addresses':
        {
          const isCartAddressSelectMode = route.params?.selectMode === 'cart';
          const nextAddressAddParams = isCartAddressSelectMode
            ? {
                returnTo: 'addresses',
                returnTab: 'cart',
                returnParams: route.params ?? {},
              }
            : undefined;
          const openAddressEditor = (id: string) => {
            go('address-add', {
              editId: id,
              returnTo: 'addresses',
              returnTab: isCartAddressSelectMode ? 'cart' : tab,
              returnParams: isCartAddressSelectMode ? route.params ?? {} : {},
            });
          };
        return (
          <ShoppingAddresses
            addresses={addresses}
            scrollRef={contentRef}
            actionMode={isCartAddressSelectMode ? 'select' : 'default'}
            selectedAddressId={selectedCartAddress?.id}
            actionHint={
              isCartAddressSelectMode ? '选中后用于本次购物车结算' : '下单会优先使用默认地址'
            }
            showDelete={!isCartAddressSelectMode}
            onPrimaryAction={(id) => {
              if (isCartAddressSelectMode) selectAddressForCart(id);
              else setDefaultAddress(id);
            }}
            onEdit={openAddressEditor}
            onRemove={removeAddress}
            onAdd={() => {
              if (nextAddressAddParams) go('address-add', nextAddressAddParams);
              else go('address-add');
            }}
          />
        );
        }
      case 'address-add':
        return (
          <ShoppingAddressAdd
            name={newAddrName}
            phone={newAddrPhone}
            address={newAddrAddress}
            saveLabel={editingAddressId ? '保存修改' : '保存'}
            onNameChange={(value) => setNewAddrName(value)}
            onPhoneChange={(value) => setNewAddrPhone(value)}
            onAddressChange={(value) => setNewAddrAddress(value)}
            onSave={addAddress}
            canSave={Boolean(newAddrName.trim() && newAddrPhone.trim() && newAddrAddress.trim())}
          />
        );
      case 'settings':
        return (
          <ShoppingSettings
            notify={settingNotify}
            faceId={settingFaceId}
            onToggleNotify={() => setSettingNotify(!settingNotify)}
            onToggleFaceId={() => setSettingFaceId(!settingFaceId)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <motion.div
      className={styles.appRoot}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
    >
      <ShoppingHeader title={headerTitle} isRoot={isRoot} onBack={goBack} />

      <main ref={contentRef} className={`${styles.content} ${hasDock ? styles.contentDocked : ''}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={`${route.tab}-${route.screen}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {paymentSheetTarget ? (
        <div
          className={styles.paymentSheetOverlay}
          onClick={closePaymentSheet}
          role="presentation"
        >
          <div className={styles.paymentSheetPanel} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            {(paymentSheetTarget === 'merged-cart' || paymentSheetTarget === 'order-detail' || paymentSheetTarget === 'movie-share') &&
            mergedPaymentSheetStage === 'payee' ? (
              <div className={styles.paymentSheetStage}>
                <div className={styles.paymentSheetHeader}>
                  <strong className={styles.paymentSheetTitle}>
                    {paymentSheetTarget === 'movie-share' ? '选择微信联系人' : '选择代付联系人'}
                  </strong>
                  <span className={styles.paymentSheetSubtitle}>
                    {paymentSheetTarget === 'movie-share' ? '从微信聊天列表里选择一个聊天框分享票据信息' : '从微信聊天列表里选一个头像和人名'}
                  </span>
                </div>
                {payeeContacts.length > 0 ? (
                  <div className={styles.paymentSheetContactList}>
                    {payeeContacts.map((contact) => (
                      <button
                        key={contact.id}
                        type="button"
                        className={styles.paymentSheetContactItem}
                        onClick={() => {
                          setSelectedPayeeContactId(contact.id);
                          const succeeded =
                            paymentSheetTarget === 'merged-cart'
                              ? placeMergedGoodsOrders('delegate', contact)
                              : paymentSheetTarget === 'movie-share'
                                ? pendingMovieShareOrderId
                                  ? shareMovieTicketOrder(pendingMovieShareOrderId, contact)
                                  : false
                              : pendingOrderPaymentId
                                ? placeOrderDetailPayment(pendingOrderPaymentId, 'delegate', contact)
                                : false;
                          if (succeeded !== false) closePaymentSheet();
                        }}
                      >
                        <span className={styles.paymentSheetContactAvatar}>
                          {contact.avatar ? (
                            <img
                              src={contact.avatar}
                              alt={contact.name}
                              className={styles.paymentSheetContactAvatarImage}
                            />
                          ) : (
                            <span>{getContactInitials(contact.name)}</span>
                          )}
                        </span>
                        <span className={styles.paymentSheetContactName}>{contact.name}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className={styles.paymentSheetEmpty}>
                    {paymentSheetTarget === 'movie-share'
                      ? '微信聊天列表里还没有可分享的人。'
                      : '微信聊天列表里还没有可用于代付的人。'}
                  </div>
                )}
                <div className={styles.paymentSheetFooter}>
                  {paymentSheetTarget !== 'movie-share' ? (
                    <button
                      type="button"
                      className={styles.paymentSheetSecondaryAction}
                      onClick={() => setMergedPaymentSheetStage('method')}
                    >
                      返回支付方式
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={styles.paymentSheetSecondaryAction}
                      onClick={closePaymentSheet}
                    >
                      关闭
                    </button>
                  )}
                  <button type="button" className={styles.paymentSheetCancel} onClick={closePaymentSheet}>
                    取消
                  </button>
                </div>
              </div>
            ) : paymentSheetTarget === 'merged-cart' ? (
              <>
                <button
                  type="button"
                  className={styles.paymentSheetOption}
                  onClick={() => {
                    const succeeded = placeMergedGoodsOrders('wechat');
                    if (succeeded !== false) closePaymentSheet();
                  }}
                >
                  微信支付
                </button>
                <button
                  type="button"
                  className={styles.paymentSheetOption}
                  onClick={() => {
                    if (payeeContacts.length === 0) {
                      window.alert('微信聊天列表里还没有可用于代付的人');
                      return;
                    }
                    setMergedPaymentSheetStage('payee');
                  }}
                >
                  由他代付
                </button>
                <button type="button" className={styles.paymentSheetCancel} onClick={closePaymentSheet}>
                  取消
                </button>
              </>
            ) : paymentSheetTarget === 'order-detail' ? (
              <>
                <button
                  type="button"
                  className={styles.paymentSheetOption}
                  onClick={() => {
                    if (!pendingOrderPaymentId) return;
                    const succeeded = placeOrderDetailPayment(pendingOrderPaymentId, 'wechat');
                    if (succeeded !== false) closePaymentSheet();
                  }}
                >
                  微信支付
                </button>
                <button
                  type="button"
                  className={styles.paymentSheetOption}
                  onClick={() => {
                    if (payeeContacts.length === 0) {
                      window.alert('微信聊天列表里还没有可用于代付的人');
                      return;
                    }
                    setMergedPaymentSheetStage('payee');
                  }}
                >
                  由他代付
                </button>
                <button type="button" className={styles.paymentSheetCancel} onClick={closePaymentSheet}>
                  取消
                </button>
              </>
            ) : paymentSheetTarget === 'movie-share' ? (
              <>
                <button
                  type="button"
                  className={styles.paymentSheetOption}
                  onClick={() => {
                    if (payeeContacts.length === 0) {
                      window.alert('微信聊天列表里还没有可分享的人');
                      return;
                    }
                    setMergedPaymentSheetStage('payee');
                  }}
                >
                  选择微信联系人
                </button>
                <button type="button" className={styles.paymentSheetCancel} onClick={closePaymentSheet}>
                  取消
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className={styles.paymentSheetOption}
                  onClick={() => {
                    const movieStoreId = pendingMovieStoreId;
                    closePaymentSheet();
                    if (movieStoreId) {
                      const movieStore = pickStore(stores, 'movie', movieStoreId);
                      placeMovieOrder(movieStore, 'wechat');
                    }
                  }}
                >
                  微信支付
                </button>
                <button type="button" className={styles.paymentSheetCancel} onClick={closePaymentSheet}>
                  取消
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}

      <ShoppingTabBar tab={tab} onSwitch={switchTab} />
    </motion.div>
  );
};

export type { ShoppingAppProps };
