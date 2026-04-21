import React from 'react';
import { motion } from 'motion/react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleHelp,
  ClipboardList,
  GripVertical,
  Megaphone,
  Package,
  PlaySquare,
  RotateCw,
  ScrollText,
  Sparkles,
  SquareMenu,
  UserRound,
  MoreHorizontal,
} from 'lucide-react';
import { APP_CLOSE_MOTION, APP_OPEN_MOTION } from '../../../core/appOpenMotion';
import { readShoppingOrdersFromStorage } from '../../shared/business/commerce/domain/ordersStorage';
import {
  COMMERCE_ROLE_CHANGED_EVENT,
  loadCommerceStores,
  readDessertProductsFromStorage,
  readFlowerProductsFromStorage,
  readMovieProductsFromStorage,
  readSellerFinanceSnapshot,
  saveCommerceStores,
  settleSellerFinance,
  writeDessertProductsToStorage,
  writeFlowerProductsToStorage,
  writeMovieProductsToStorage,
} from '../../shared/business/commerce/domain/store';
import type { CommerceStore, Order, ProductItem } from '../../shared/business/commerce/domain/types';
import {
  DEFAULT_STORE_FILTER_LABELS,
  DEFAULT_STORE_HERO_RATING_LABELS,
  DEFAULT_STORE_HERO_TAG_LABELS,
  DEFAULT_STORE_MOVIE_CHECKOUT_LABELS,
  DEFAULT_STORE_MOVIE_SESSION_OPTIONS,
  DEFAULT_STORE_MOVIE_TEXT_LABELS,
  DEFAULT_STORE_TAB_LABELS,
  resolveStoreHeroBackground,
  sortProductsByDecorationOrder,
  syncDecorationProductOrder,
  toStoreBackgroundImage,
} from '../../shared/business/commerce/domain/storeDecoration';
import { resolveOrderStoreId } from '../../shared/business/commerce/domain/utils';
import { SellerStoreManagePage } from './components/SellerStoreManagePage';
import { ShoppingProductList } from '../shopping/components/ShoppingProductList';
import { ShoppingMovies } from '../shopping/components/ShoppingMovies';
import { ShoppingMovieCheckout } from '../shopping/components/ShoppingMovieCheckout';
import { toMovie, toMovieStoreProducts } from '../shopping/movies';
import type { Movie } from '../shopping/uiTypes';
import { addDays, formatDate } from '../shopping/utils';
import {
  readSellerPublishDraftMap,
  writeSellerPublishDraftMap,
} from './data/repositories/publishDraftRepo';
import { initializeSellerMessageScheduler } from '../../shared/business/commerce/messageBridge';
import {
  useKeyboardTextEntryActive,
  useKeyboardViewportStabilizer,
  useMobileViewportPageStyle,
} from '../../../core/mobileViewport';
import { getGlobalSettingsSnapshot } from '@baobaobaiOS/sdk';
import styles from './SellerApp.module.css';
import type { SellerAppProps } from './types';
import {
  formatSellerProductGenerationError,
  generateSellerProducts,
} from './aiProductGenerator';

type DashboardStat = {
  id: string;
  label: string;
  value: string;
};

type SummaryPeriod = 'realtime' | 'day1' | 'day7' | 'day30';

type QuickTool = {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
};

type ActionCard = {
  id: string;
  title: string;
  desc: string;
  buttonText: string;
};

type SellerPage = 'store-management' | 'dashboard' | 'store-view' | 'product-publish';

type PublishForm = {
  images: string[];
  title: string;
  category: string;
  price: string;
  stock: string;
  desc: string;
};

type PublishDraftMap = Record<string, PublishForm>;

type StoreDecorationDraft = {
  backgroundKind: 'theme' | 'cover';
  backgroundValue: string;
  avatarValue: string;
  signboardValue: string;
  typeNameValue: string;
  productOrder: string[];
  tabLabels: string[];
  filterLabels: string[];
  heroRatingLabels: string[];
  heroTagLabels: string[];
  movieTextLabels: string[];
  movieCheckoutLabels: string[];
  movieSessionOptions: string[];
};

type DecorationBackgroundPreset = {
  id: string;
  label: string;
  value: string;
};

const formatMoney = (value: number) => `￥ ${value.toFixed(1)}`;

const resolveMovieCheckoutDateDefault = (labels: string[]) => {
  const configured = (labels[9] || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(configured)) return configured;
  return formatDate(addDays(new Date(), 1));
};

const resolveMovieCheckoutQtyDefault = (labels: string[]) => {
  const configured = Number((labels[10] || '').trim());
  if (Number.isFinite(configured) && configured >= 1 && configured <= 6) {
    return Math.floor(configured);
  }
  return 2;
};

const isNumberLike = (value: unknown): value is number => {
  return typeof value === 'number' && Number.isFinite(value);
};

const pickNumberFromMeta = (order: Order, key: string, fallback = 0) => {
  const value = order.meta?.[key];
  return isNumberLike(value) ? value : fallback;
};

const getPeriodStart = (period: SummaryPeriod) => {
  const now = Date.now();
  if (period === 'realtime') return now - 6 * 60 * 60 * 1000;
  if (period === 'day1') return now - 24 * 60 * 60 * 1000;
  if (period === 'day7') return now - 7 * 24 * 60 * 60 * 1000;
  return now - 30 * 24 * 60 * 60 * 1000;
};

const deriveDashboardStats = (orders: Order[]): DashboardStat[] => {
  const paidAmount = orders.reduce((sum, order) => sum + order.total, 0);
  const paidCount = orders.length;
  const refundAmount = orders.reduce((sum, order) => sum + pickNumberFromMeta(order, 'refundAmount'), 0);
  const visitorCount = orders.reduce((sum, order) => sum + pickNumberFromMeta(order, 'visitorCount'), 0);

  return [
    { id: 'paid-amount', label: '支付金额', value: formatMoney(paidAmount) },
    { id: 'paid-count', label: '支付订单数', value: String(paidCount) },
    { id: 'refund-amount', label: '退款金额', value: formatMoney(refundAmount) },
    { id: 'visitor-count', label: '商品访客数', value: String(visitorCount) },
  ];
};

const deriveExpandedStats = (orders: Order[]): DashboardStat[][] => {
  const paidAmount = orders.reduce((sum, order) => sum + order.total, 0);
  const refundAmount = orders.reduce((sum, order) => sum + pickNumberFromMeta(order, 'refundAmount'), 0);
  const visitVolume = orders.reduce((sum, order) => sum + pickNumberFromMeta(order, 'visitVolume'), 0);
  const addCartPeople = orders.reduce((sum, order) => sum + pickNumberFromMeta(order, 'addCartCount'), 0);
  const withdrawable = Math.max(0, paidAmount - refundAmount);
  const buyerPayAmount = orders.reduce((sum, order) => sum + pickNumberFromMeta(order, 'buyerPayAmount'), 0);
  const adPayAmount = orders.reduce((sum, order) => sum + pickNumberFromMeta(order, 'adPayAmount'), 0);

  const buyerSet = new Set<string>();
  orders.forEach((order) => {
    const name = order.address?.name?.trim();
    if (name) buyerSet.add(name);
  });
  const buyerCount = buyerSet.size;
  const conversion = visitVolume > 0 ? Math.round((buyerCount / visitVolume) * 100) : 0;

  return [
    deriveDashboardStats(orders),
    [
      { id: 'visit-volume', label: '商品访问量', value: String(visitVolume) },
      { id: 'paid-buyers', label: '支付买家数', value: String(buyerCount) },
      { id: 'add-cart', label: '加购人数', value: String(addCartPeople) },
      { id: 'withdrawable', label: '可提现余额', value: formatMoney(withdrawable) },
    ],
    [
      { id: 'conversion', label: '支付转化率', value: String(conversion) },
      { id: 'buyer-pay-amount', label: '买手支付金额', value: formatMoney(buyerPayAmount) },
      { id: 'ad-pay-amount', label: '广告支付金额', value: formatMoney(adPayAmount) },
    ],
  ];
};

const derivePanelStats = (orders: Order[]) => {
  const now = Date.now();
  const shipped = orders.filter((order) => {
    const shipAt = Number(order.meta?.shipAt ?? order.createdAt);
    return Number.isFinite(shipAt) && shipAt <= now;
  }).length;
  const afterSale = orders.filter((order) => {
    const status = typeof order.meta?.afterSaleStatus === 'string' ? order.meta.afterSaleStatus : '';
    return status === 'pending' || status === 'processing';
  }).length;
  const violation = orders.filter((order) => Number(order.meta?.violationCount ?? 0) > 0).length;

  return { shipped, afterSale, violation };
};

const periodOptions: Array<{ id: SummaryPeriod; label: string }> = [
  { id: 'realtime', label: '实时' },
  { id: 'day1', label: '近1日' },
  { id: 'day7', label: '近7日' },
  { id: 'day30', label: '近30日' },
];

const quickTools: QuickTool[] = [
  { id: 'all-products', label: '全部商品', icon: Package },
  { id: 'notes', label: '笔记中心', icon: Sparkles },
  { id: 'live', label: '店播中心', icon: PlaySquare },
  { id: 'campaign', label: '活动报名', icon: Megaphone },
  { id: 'orders', label: '全部订单', icon: ClipboardList },
  { id: 'ads', label: '广告推广', icon: RotateCw },
  { id: 'tools', label: '更多工具', icon: SquareMenu },
];

const actionCards: ActionCard[] = [
  { id: 'product', title: '上架第一个商品', desc: '生意第一步', buttonText: '去发布' },
  { id: 'note', title: '发布商品笔记', desc: '帮助商品持续获得社区流量和转化', buttonText: '去开启' },
];

const noop = () => {};
const FALLBACK_STORE_THEME = 'linear-gradient(130deg, #d45d73 0%, #b96d39 58%, #8c5a1b 100%)';
const decorationBackgroundPresets: DecorationBackgroundPreset[] = [
  {
    id: 'sunset',
    label: '暖调橱窗',
    value: 'linear-gradient(130deg, #d45d73 0%, #b96d39 58%, #8c5a1b 100%)',
  },
  {
    id: 'mint',
    label: '薄荷花园',
    value: 'linear-gradient(140deg, #74d4c0 0%, #56b7dd 48%, #3762b7 100%)',
  },
  {
    id: 'cream',
    label: '奶油陈列',
    value: 'linear-gradient(135deg, #f6d8b8 0%, #f7b8ab 52%, #ef8d7a 100%)',
  },
  {
    id: 'night',
    label: '夜幕霓虹',
    value: 'linear-gradient(135deg, #2b305f 0%, #4840a8 42%, #f06aa7 100%)',
  },
];
const EMPTY_PUBLISH_FORM: PublishForm = {
  images: [],
  title: '',
  category: '',
  price: '',
  stock: '',
  desc: '',
};

const isPublishInfoComplete = (form: PublishForm) => {
  const title = form.title.trim();
  const category = form.category.trim();
  const price = Number(form.price);
  const stock = Math.max(0, Math.floor(Number(form.stock)));
  return Boolean(
    form.images.length &&
      title &&
      category &&
      Number.isFinite(price) &&
      price > 0 &&
      Number.isFinite(stock) &&
      stock > 0
  );
};

const reorderDecorationProductIds = (source: string[], fromId: string, toId: string) => {
  if (fromId === toId) return source;
  const fromIndex = source.indexOf(fromId);
  const toIndex = source.indexOf(toId);
  if (fromIndex < 0 || toIndex < 0) return source;
  const next = [...source];
  const [moved] = next.splice(fromIndex, 1);
  if (!moved) return source;
  next.splice(toIndex, 0, moved);
  return next;
};

const createStoreDecorationDraft = (store: CommerceStore, products: ProductItem[]): StoreDecorationDraft => {
  const customCover = (store.cover || '').trim();
  return {
    backgroundKind: customCover ? 'cover' : 'theme',
    backgroundValue: customCover || store.theme || FALLBACK_STORE_THEME,
    avatarValue: (store.logo || '').trim(),
    signboardValue: (store.signboard || store.name || '我的店铺').trim(),
    typeNameValue: (store.typeName || '店铺').trim(),
    productOrder: syncDecorationProductOrder(store.decorationConfig?.productOrder, products),
    tabLabels: [...(store.decorationConfig?.tabLabels || DEFAULT_STORE_TAB_LABELS)],
    filterLabels: [...(store.decorationConfig?.filterLabels || DEFAULT_STORE_FILTER_LABELS)],
    heroRatingLabels: [...(store.decorationConfig?.heroRatingLabels || DEFAULT_STORE_HERO_RATING_LABELS)],
    heroTagLabels: [...(store.decorationConfig?.heroTagLabels || DEFAULT_STORE_HERO_TAG_LABELS)],
    movieTextLabels: [...(store.decorationConfig?.movieTextLabels || DEFAULT_STORE_MOVIE_TEXT_LABELS)],
    movieCheckoutLabels: [...(store.decorationConfig?.movieCheckoutLabels || DEFAULT_STORE_MOVIE_CHECKOUT_LABELS)],
    movieSessionOptions: [...(store.decorationConfig?.movieSessionOptions || DEFAULT_STORE_MOVIE_SESSION_OPTIONS)],
  };
};

export const SellerApp: React.FC<SellerAppProps> = ({ onClose }) => {
  const [dessertProducts, setDessertProducts] = React.useState<ProductItem[]>([]);
  const [flowerProducts, setFlowerProducts] = React.useState<ProductItem[]>([]);
  const [movieProducts, setMovieProducts] = React.useState<ProductItem[]>([]);
  const [stores, setStores] = React.useState<CommerceStore[]>([]);
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [page, setPage] = React.useState<SellerPage>('store-management');
  const [selectedStoreId, setSelectedStoreId] = React.useState<string | null>(null);
  const [skipDashboardEnterMotion, setSkipDashboardEnterMotion] = React.useState(false);
  const [expandedByStoreId, setExpandedByStoreId] = React.useState<Record<string, boolean>>({});
  const [summaryPeriod, setSummaryPeriod] = React.useState<SummaryPeriod>('day30');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [assetBalance, setAssetBalance] = React.useState(0);
  const [publishForm, setPublishForm] = React.useState<PublishForm>(EMPTY_PUBLISH_FORM);
  const [publishCategories, setPublishCategories] = React.useState<string[]>([
    '甜品',
    '鲜花',
    '电影票',
    '零食',
    '饮品',
  ]);
  const [customCategory, setCustomCategory] = React.useState('');
  const [storeDraft, setStoreDraft] = React.useState<PublishForm | null>(null);
  const [editingProductId, setEditingProductId] = React.useState<string | null>(null);
  const [editingDraft, setEditingDraft] = React.useState(false);
  const [publishReturnPage, setPublishReturnPage] = React.useState<SellerPage>('dashboard');
  const viewportPageStyle = useMobileViewportPageStyle(page !== 'product-publish');
  const shouldHidePublishFooter = useKeyboardTextEntryActive(page === 'product-publish');
  const [stockEditProductId, setStockEditProductId] = React.useState<string | null>(null);
  const [stockEditValue, setStockEditValue] = React.useState('');
  const [isStoreDecorationEditing, setIsStoreDecorationEditing] = React.useState(false);
  const [isStoreDecorationPanelVisible, setIsStoreDecorationPanelVisible] = React.useState(false);
  const [isStoreDecorationPreviewVisible, setIsStoreDecorationPreviewVisible] = React.useState(false);
  const [isMovieSessionEditorOpen, setIsMovieSessionEditorOpen] = React.useState(false);
  const [previewSelectedMovie, setPreviewSelectedMovie] = React.useState<Movie | null>(null);
  const [previewMovieCinema, setPreviewMovieCinema] = React.useState(DEFAULT_STORE_MOVIE_CHECKOUT_LABELS[8]);
  const [previewMovieDate, setPreviewMovieDate] = React.useState(formatDate(addDays(new Date(), 1)));
  const [previewMovieSession, setPreviewMovieSession] = React.useState(DEFAULT_STORE_MOVIE_SESSION_OPTIONS[0]);
  const [previewMovieQty, setPreviewMovieQty] = React.useState(2);
  const [storeDecorationDraft, setStoreDecorationDraft] = React.useState<StoreDecorationDraft | null>(null);
  const [draggingDecorationProductId, setDraggingDecorationProductId] = React.useState<string | null>(null);
  const [decorationDropTargetId, setDecorationDropTargetId] = React.useState<string | null>(null);
  const [movieStoreQuery, setMovieStoreQuery] = React.useState('');
  const [isAiGeneratingProducts, setIsAiGeneratingProducts] = React.useState(false);
  const [isAiProductCountDialogVisible, setIsAiProductCountDialogVisible] = React.useState(false);
  const [aiProductCount, setAiProductCount] = React.useState(6);
  const publishImageInputRef = React.useRef<HTMLInputElement | null>(null);
  const publishContentScrollRef = React.useRef<HTMLElement | null>(null);
  const storeDecorationImageInputRef = React.useRef<HTMLInputElement | null>(null);
  const storeDecorationAvatarInputRef = React.useRef<HTMLInputElement | null>(null);
  const decorationPointerIdRef = React.useRef<number | null>(null);
  const storeDecorationPreviewScrollRef = React.useRef<HTMLDivElement | null>(null);
  const storeViewContentRef = React.useRef<HTMLDivElement | null>(null);
  useKeyboardViewportStabilizer(page === 'product-publish', publishContentScrollRef);

  const refreshData = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [loadedStores, loadedOrders, loadedDessertProducts, loadedFlowerProducts, loadedMovieProducts] =
        await Promise.all([
        loadCommerceStores(),
        readShoppingOrdersFromStorage(),
        readDessertProductsFromStorage(),
        readFlowerProductsFromStorage(),
        readMovieProductsFromStorage(),
      ]);
      const finance = await settleSellerFinance({
        stores: loadedStores,
        orders: loadedOrders,
      });
      setStores(loadedStores);
      setOrders(loadedOrders);
      setDessertProducts(loadedDessertProducts);
      setFlowerProducts(loadedFlowerProducts);
      setMovieProducts(loadedMovieProducts);
      setAssetBalance(finance.assetBalance);
    } catch {
      setError('数据刷新失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    initializeSellerMessageScheduler();
  }, []);

  React.useEffect(() => {
    let canceled = false;
    const readFinance = async () => {
      const snapshot = await readSellerFinanceSnapshot();
      if (!canceled) setAssetBalance(snapshot.assetBalance);
    };
    void readFinance();
    return () => {
      canceled = true;
    };
  }, [stores]);

  React.useEffect(() => {
    void refreshData();
  }, [refreshData]);

  React.useEffect(() => {
    const handleCommerceRoleChanged = () => {
      void refreshData();
    };
    window.addEventListener(COMMERCE_ROLE_CHANGED_EVENT, handleCommerceRoleChanged);
    return () => {
      window.removeEventListener(COMMERCE_ROLE_CHANGED_EVENT, handleCommerceRoleChanged);
    };
  }, [refreshData]);

  React.useEffect(() => {
    if (!selectedStoreId) return;
    if (stores.some((store) => store.id === selectedStoreId)) return;
    setSelectedStoreId(null);
  }, [selectedStoreId, stores]);

  const activeStore = React.useMemo(() => {
    if (selectedStoreId) {
      const selected = stores.find((store) => store.id === selectedStoreId);
      if (selected) return selected;
    }
    return stores.find((store) => store.visible) ?? stores[0];
  }, [selectedStoreId, stores]);
  const storeScopedOrders = React.useMemo(() => {
    if (!activeStore) return [];
    return orders.filter((order) => resolveOrderStoreId(order) === activeStore.id);
  }, [activeStore, orders]);
  const filteredOrders = React.useMemo(() => {
    const startAt = getPeriodStart(summaryPeriod);
    return storeScopedOrders.filter((order) => order.createdAt >= startAt);
  }, [storeScopedOrders, summaryPeriod]);
  const isExpanded = React.useMemo(() => {
    if (!activeStore) return false;
    return expandedByStoreId[activeStore.id] ?? false;
  }, [activeStore, expandedByStoreId]);
  const dashboardStats = React.useMemo(() => deriveDashboardStats(filteredOrders), [filteredOrders]);
  const expandedStats = React.useMemo(() => deriveExpandedStats(filteredOrders), [filteredOrders]);
  const panelStats = React.useMemo(() => derivePanelStats(storeScopedOrders), [storeScopedOrders]);
  const handleBackToStoreManagement = React.useCallback(() => {
    setPage('store-management');
  }, []);

  const openPublishPage = React.useCallback(() => {
    setPublishReturnPage(page);
    setEditingProductId(null);
    setEditingDraft(false);
    setPublishForm(EMPTY_PUBLISH_FORM);
    setPage('product-publish');
  }, [page]);

  const readPublishDraftMap = React.useCallback(async (): Promise<PublishDraftMap> => {
    return readSellerPublishDraftMap<PublishForm>();
  }, []);

  const writePublishDraftMap = React.useCallback(async (draftMap: PublishDraftMap) => {
    await writeSellerPublishDraftMap<PublishForm>(draftMap);
  }, []);

  React.useEffect(() => {
    if (page !== 'product-publish' || !activeStore?.id || editingProductId || editingDraft) return;
    let canceled = false;
    const loadPublishDraft = async () => {
      const draftMap = await readPublishDraftMap();
      if (canceled) return;
      setPublishForm({ ...EMPTY_PUBLISH_FORM, ...(draftMap[activeStore.id] || {}) });
    };
    void loadPublishDraft();
    return () => {
      canceled = true;
    };
  }, [activeStore?.id, editingDraft, editingProductId, page, readPublishDraftMap]);

  const handleAddPublishImage = React.useCallback((file?: File) => {
    if (!file) return;
    setPublishForm((prev) => {
      if (prev.images.length >= 5) return prev;
      return prev;
    });
    const reader = new FileReader();
    reader.onload = () => {
      setPublishForm((prev) => {
        if (prev.images.length >= 5) return prev;
        return { ...prev, images: [...prev.images, String(reader.result || '')].slice(0, 5) };
      });
    };
    reader.readAsDataURL(file);
  }, []);

  const loadStoreDraft = React.useCallback(async () => {
    if (!activeStore?.id) {
      setStoreDraft(null);
      return;
    }
    const draftMap = await readPublishDraftMap();
    const draft = draftMap[activeStore.id];
    if (!draft) {
      setStoreDraft(null);
      return;
    }
    const normalizedDraft = { ...EMPTY_PUBLISH_FORM, ...draft };
    const hasContent = Boolean(
      normalizedDraft.images.length ||
        normalizedDraft.title.trim() ||
        normalizedDraft.category.trim() ||
        normalizedDraft.price.trim() ||
        normalizedDraft.stock.trim() ||
        normalizedDraft.desc.trim()
    );
    setStoreDraft(hasContent ? normalizedDraft : null);
  }, [activeStore?.id, readPublishDraftMap]);

  React.useEffect(() => {
    void loadStoreDraft();
  }, [loadStoreDraft, page]);

  const openDraftEditor = React.useCallback(() => {
    const currentDraft = storeDraft;
    if (!currentDraft) return;
    setPublishReturnPage('store-view');
    setEditingProductId(null);
    setEditingDraft(true);
    setPublishForm({ ...EMPTY_PUBLISH_FORM, ...currentDraft });
    setPage('product-publish');
  }, [storeDraft]);

  const activeStoreProducts = React.useMemo(() => {
    if (!activeStore) return [];
    if (activeStore.kind === 'movie') {
      const source = movieProducts.length ? movieProducts : toMovieStoreProducts(activeStore.id);
      return source.filter((item) => item.storeId === activeStore.id);
    }
    const source = activeStore.kind === 'flower' ? flowerProducts : dessertProducts;
    return source.filter((item) => item.storeId === activeStore.id);
  }, [activeStore, dessertProducts, flowerProducts, movieProducts]);

  const publishedStoreProducts = React.useMemo(() => {
    return sortProductsByDecorationOrder(activeStoreProducts, activeStore?.decorationConfig?.productOrder);
  }, [activeStore?.decorationConfig?.productOrder, activeStoreProducts]);

  const decorationEditingProducts = React.useMemo(() => {
    return sortProductsByDecorationOrder(activeStoreProducts, storeDecorationDraft?.productOrder);
  }, [activeStoreProducts, storeDecorationDraft?.productOrder]);

  const storeViewProducts = isStoreDecorationEditing ? decorationEditingProducts : publishedStoreProducts;

  const publishedStoreHeroBackground = React.useMemo(() => {
    if (!activeStore) return FALLBACK_STORE_THEME;
    return resolveStoreHeroBackground(activeStore, FALLBACK_STORE_THEME);
  }, [activeStore]);

  const draftStoreTheme = React.useMemo(() => {
    if (!activeStore || !storeDecorationDraft) return activeStore?.theme || FALLBACK_STORE_THEME;
    if (storeDecorationDraft.backgroundKind === 'theme') return storeDecorationDraft.backgroundValue;
    return activeStore.theme || FALLBACK_STORE_THEME;
  }, [activeStore, storeDecorationDraft]);

  const draftStoreCover = React.useMemo(() => {
    if (!storeDecorationDraft || storeDecorationDraft.backgroundKind !== 'cover') return '';
    return storeDecorationDraft.backgroundValue;
  }, [storeDecorationDraft]);

  const draftStoreLogo = React.useMemo(() => {
    if (!storeDecorationDraft) return (activeStore?.logo || '').trim();
    return storeDecorationDraft.avatarValue.trim();
  }, [activeStore?.logo, storeDecorationDraft]);

  const draftStoreHeroBackground = React.useMemo(() => {
    if (!storeDecorationDraft) return publishedStoreHeroBackground;
    return toStoreBackgroundImage(storeDecorationDraft.backgroundValue, FALLBACK_STORE_THEME);
  }, [publishedStoreHeroBackground, storeDecorationDraft]);

  const filteredMovieStoreMovies = React.useMemo(() => {
    const source = activeStoreProducts.map(toMovie);
    if (!movieStoreQuery.trim()) return source;
    const query = movieStoreQuery.trim().toLowerCase();
    return source.filter((movie) => movie.title.toLowerCase().includes(query));
  }, [activeStoreProducts, movieStoreQuery]);

  const startStoreDecorationEditing = React.useCallback(() => {
    if (!activeStore) return;
    setStoreDecorationDraft(createStoreDecorationDraft(activeStore, activeStoreProducts));
    setIsStoreDecorationEditing(true);
    setIsStoreDecorationPanelVisible(false);
    setIsStoreDecorationPreviewVisible(false);
    setPreviewSelectedMovie(null);
    setDraggingDecorationProductId(null);
    setDecorationDropTargetId(null);
    setPage('store-view');
  }, [activeStore, activeStoreProducts]);

  const cancelStoreDecorationEditing = React.useCallback(() => {
    setIsStoreDecorationEditing(false);
    setIsStoreDecorationPanelVisible(false);
    setIsStoreDecorationPreviewVisible(false);
    setPreviewSelectedMovie(null);
    setStoreDecorationDraft(null);
    setDraggingDecorationProductId(null);
    setDecorationDropTargetId(null);
  }, []);

  const handleStoreViewBack = React.useCallback(() => {
    if (isStoreDecorationPreviewVisible) {
      if (previewSelectedMovie) {
        setPreviewSelectedMovie(null);
        return;
      }
      setIsStoreDecorationPreviewVisible(false);
      return;
    }
    if (isStoreDecorationPanelVisible) {
      setIsStoreDecorationPanelVisible(false);
      return;
    }
    if (isStoreDecorationEditing) {
      cancelStoreDecorationEditing();
      return;
    }
    setPage('dashboard');
  }, [
    cancelStoreDecorationEditing,
    isStoreDecorationEditing,
    isStoreDecorationPanelVisible,
    isStoreDecorationPreviewVisible,
    previewSelectedMovie,
  ]);

  const handleStoreDecorationBackgroundUpload = React.useCallback((file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const nextValue = String(reader.result || '');
      if (!nextValue) return;
      setStoreDecorationDraft((prev) =>
        prev
          ? {
              ...prev,
              backgroundKind: 'cover',
              backgroundValue: nextValue,
            }
          : prev
      );
    };
    reader.readAsDataURL(file);
  }, []);

  const handleStoreDecorationAvatarUpload = React.useCallback((file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const nextValue = String(reader.result || '');
      if (!nextValue) return;
      setStoreDecorationDraft((prev) =>
        prev
          ? {
              ...prev,
              avatarValue: nextValue,
            }
          : prev
      );
    };
    reader.readAsDataURL(file);
  }, []);

  const resolveDecorationDropTarget = React.useCallback(
    (clientX: number, clientY: number) => {
      if (!draggingDecorationProductId) return;
      const hit = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
      const card = hit?.closest('[data-decoration-product-id]') as HTMLElement | null;
      const targetId = card?.dataset.decorationProductId;
      if (!targetId || targetId === draggingDecorationProductId) {
        setDecorationDropTargetId(null);
        return;
      }
      setDecorationDropTargetId(targetId);
    },
    [draggingDecorationProductId]
  );

  const commitDecorationDrag = React.useCallback(() => {
    if (!draggingDecorationProductId || !decorationDropTargetId) {
      setDraggingDecorationProductId(null);
      setDecorationDropTargetId(null);
      return;
    }
    setStoreDecorationDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        productOrder: reorderDecorationProductIds(prev.productOrder, draggingDecorationProductId, decorationDropTargetId),
      };
    });
    setDraggingDecorationProductId(null);
    setDecorationDropTargetId(null);
  }, [decorationDropTargetId, draggingDecorationProductId]);

  React.useEffect(() => {
    if (!draggingDecorationProductId) return;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = 'none';
    const onMove = (event: PointerEvent) => {
      if (decorationPointerIdRef.current != null && event.pointerId !== decorationPointerIdRef.current) return;
      event.preventDefault();
      resolveDecorationDropTarget(event.clientX, event.clientY);
    };
    const onUp = (event: PointerEvent) => {
      if (decorationPointerIdRef.current != null && event.pointerId !== decorationPointerIdRef.current) return;
      decorationPointerIdRef.current = null;
      void commitDecorationDrag();
    };
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [commitDecorationDrag, draggingDecorationProductId, resolveDecorationDropTarget]);

  const handlePublishStoreDecoration = React.useCallback(async () => {
    if (!activeStore || !storeDecorationDraft) return;
    const nextProductOrder = syncDecorationProductOrder(storeDecorationDraft.productOrder, activeStoreProducts);
    const nextTheme =
      storeDecorationDraft.backgroundKind === 'theme'
        ? storeDecorationDraft.backgroundValue
        : activeStore.theme || FALLBACK_STORE_THEME;
    const nextCover = storeDecorationDraft.backgroundKind === 'cover' ? storeDecorationDraft.backgroundValue : '';
    const nextLogo = storeDecorationDraft.avatarValue.trim();
    const nextSignboard = storeDecorationDraft.signboardValue.trim() || activeStore.signboard || activeStore.name;
    const nextTypeName = storeDecorationDraft.typeNameValue.trim() || activeStore.typeName || '店铺';
    const nextTabLabels = storeDecorationDraft.tabLabels.map((label, index) => label.trim() || DEFAULT_STORE_TAB_LABELS[index]);
    const nextFilterLabels = storeDecorationDraft.filterLabels.map(
      (label, index) => label.trim() || DEFAULT_STORE_FILTER_LABELS[index]
    );
    const nextHeroRatingLabels = storeDecorationDraft.heroRatingLabels.map(
      (label, index) => label.trim() || DEFAULT_STORE_HERO_RATING_LABELS[index]
    );
    const nextHeroTagLabels = storeDecorationDraft.heroTagLabels.map(
      (label, index) => label.trim() || DEFAULT_STORE_HERO_TAG_LABELS[index]
    );
    const nextMovieTextLabels = storeDecorationDraft.movieTextLabels.map(
      (label, index) => label.trim() || DEFAULT_STORE_MOVIE_TEXT_LABELS[index]
    );
    const nextMovieCheckoutLabels = storeDecorationDraft.movieCheckoutLabels.map(
      (label, index) => label.trim() || DEFAULT_STORE_MOVIE_CHECKOUT_LABELS[index]
    );
    const nextMovieSessionOptions = storeDecorationDraft.movieSessionOptions.map(
      (label, index) => label.trim() || DEFAULT_STORE_MOVIE_SESSION_OPTIONS[index]
    );

    try {
      const savedStores = await saveCommerceStores(
        stores.map((store) =>
          store.id === activeStore.id
            ? {
                ...store,
                theme: nextTheme,
                cover: nextCover,
                logo: nextLogo,
                signboard: nextSignboard,
                typeName: nextTypeName,
                decorationConfig: {
                  productOrder: nextProductOrder,
                  tabLabels: nextTabLabels,
                  filterLabels: nextFilterLabels,
                  heroRatingLabels: nextHeroRatingLabels,
                  heroTagLabels: nextHeroTagLabels,
                  movieTextLabels: nextMovieTextLabels,
                  movieCheckoutLabels: nextMovieCheckoutLabels,
                  movieSessionOptions: nextMovieSessionOptions,
                  updatedAt: Date.now(),
                },
                updatedAt: Date.now(),
              }
            : store
        ),
        { orders }
      );
      setStores(savedStores);
      cancelStoreDecorationEditing();
      window.alert('店铺装修已发布');
    } catch {
      window.alert('发布装修失败，请稍后重试');
    }
  }, [activeStore, activeStoreProducts, cancelStoreDecorationEditing, orders, storeDecorationDraft, stores]);

  const openProductEditor = React.useCallback((product: ProductItem) => {
    const categoryGuess =
      typeof product.desc === 'string' && product.desc.endsWith('商品')
        ? product.desc.slice(0, -2)
        : '';
    setPublishReturnPage('store-view');
    setEditingProductId(product.id);
    setPublishForm({
      images: product.img ? [product.img] : [],
      title: product.name || '',
      category: categoryGuess,
      price: String(Number(product.price) || ''),
      stock: String(Math.max(0, Math.floor(Number(product.stock) || 0))),
      desc: typeof product.desc === 'string' ? product.desc : '',
    });
    setPage('product-publish');
  }, []);

  const updateActiveStoreProducts = React.useCallback(
    async (updater: (items: ProductItem[]) => ProductItem[]) => {
      if (!activeStore) return;
      if (activeStore.kind === 'movie') {
        const current = await readMovieProductsFromStorage();
        await writeMovieProductsToStorage(updater(current));
        setMovieProducts(await readMovieProductsFromStorage());
      } else if (activeStore.kind === 'flower') {
        const current = await readFlowerProductsFromStorage();
        await writeFlowerProductsToStorage(updater(current));
        setFlowerProducts(await readFlowerProductsFromStorage());
      } else {
        const current = await readDessertProductsFromStorage();
        await writeDessertProductsToStorage(updater(current));
        setDessertProducts(await readDessertProductsFromStorage());
      }
    },
    [activeStore]
  );

  const openStockEditor = React.useCallback((productId: string, currentStock: number) => {
    setStockEditProductId(productId);
    setStockEditValue(String(Math.max(0, Math.floor(Number(currentStock) || 0))));
  }, []);

  const handleSaveStock = React.useCallback(async () => {
    if (!stockEditProductId) return;
    const nextStock = Math.max(0, Math.floor(Number(stockEditValue)));
    if (!Number.isFinite(nextStock)) {
      window.alert('请输入正确库存');
      return;
    }
    await updateActiveStoreProducts((items) =>
      items.map((item) => (item.id === stockEditProductId ? { ...item, stock: nextStock } : item))
    );
    setStockEditProductId(null);
    setStockEditValue('');
  }, [stockEditProductId, stockEditValue, updateActiveStoreProducts]);

  const handleIncreaseStock = React.useCallback(
    (productId: string) => {
      const target = activeStoreProducts.find((item) => item.id === productId);
      if (!target) return;
      openStockEditor(productId, Math.max(0, Math.floor(Number(target.stock) || 0)));
    },
    [activeStoreProducts, openStockEditor]
  );

  const handleUnlistProduct = React.useCallback(
    async (productId: string) => {
      await updateActiveStoreProducts((items) =>
        items.map((item) => (item.id === productId ? { ...item, isSelected: false } : item))
      );
    },
    [updateActiveStoreProducts]
  );

  const handleRelistProduct = React.useCallback(
    async (productId: string) => {
      await updateActiveStoreProducts((items) =>
        items.map((item) => (item.id === productId ? { ...item, isSelected: true } : item))
      );
    },
    [updateActiveStoreProducts]
  );

  const handleGenerateAiProducts = React.useCallback(async (count: number) => {
    if (!activeStore || isAiGeneratingProducts) return;
    setIsAiProductCountDialogVisible(false);
    setIsAiGeneratingProducts(true);
    try {
      const settings = getGlobalSettingsSnapshot();
      const drafts = await generateSellerProducts({
        settings,
        store: activeStore,
        categoryOptions: publishCategories,
        count,
      });

      const now = Date.now();
      const createdProducts: ProductItem[] = drafts.map((draft, index) => ({
        id: `sp-ai-${(now + index).toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        name: draft.title,
        price: draft.price,
        desc:
          draft.desc.trim() ||
          (activeStore.kind === 'movie' ? draft.category || '影片介绍' : `${draft.category || '商品'}商品`),
        img:
          draft.imageDataUrl ||
          activeStore.logo?.trim() ||
          activeStore.cover?.trim() ||
          activeStore.theme ||
          '',
        stock: Math.max(1, Math.floor(Number(draft.stock) || 0)),
        storeId: activeStore.id,
        isSelected: true,
      }));

      await updateActiveStoreProducts((items) => [...items, ...createdProducts]);

      const nextCategories = [
        ...new Set([
          ...publishCategories,
          ...drafts.map((item) => item.category.trim()).filter(Boolean),
        ]),
      ];
      setPublishCategories(nextCategories);

      const generatedImageCount = drafts.filter((item) => Boolean(item.imageDataUrl)).length;
      window.alert(
        `已为${activeStore.signboard || activeStore.name || '店铺'}生成 ${createdProducts.length} 个商品${
          generatedImageCount > 0 ? `，其中 ${generatedImageCount} 个带有 AI 主图` : ''
        }`
      );
    } catch (error) {
      window.alert(formatSellerProductGenerationError(error));
    } finally {
      setIsAiGeneratingProducts(false);
    }
  }, [activeStore, isAiGeneratingProducts, publishCategories, updateActiveStoreProducts]);

  const handlePublishNow = React.useCallback(async () => {
    if (!activeStore) return;
    if (!isPublishInfoComplete(publishForm)) {
      window.alert('请完善商品完整信息后再上架');
      return;
    }
    const title = publishForm.title.trim();
    const category = publishForm.category.trim();
    const price = Number(publishForm.price);
    const stock = Math.max(0, Math.floor(Number(publishForm.stock)));
    const desc = publishForm.desc.trim();
    if (!publishForm.images.length) return window.alert('请至少上传1张商品图片');
    if (!title) return window.alert('请填写宝贝标题');
    if (!category) return window.alert('请选择或添加类目');
    if (!Number.isFinite(price) || price <= 0) return window.alert('请填写正确价格');
    if (!Number.isFinite(stock) || stock <= 0) return window.alert('请填写正确库存');

    const now = Date.now();
    const newProduct: ProductItem = {
      id: `sp-${now.toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      name: title,
      price,
      desc: activeStore.kind === 'movie' ? desc || category || '影片介绍' : `${category}商品`,
      img: publishForm.images[0],
      stock,
      storeId: activeStore.id,
      isSelected: true,
    };
    newProduct.desc = desc || newProduct.desc;

    try {
      if (activeStore.kind === 'movie') {
        const current = await readMovieProductsFromStorage();
        await writeMovieProductsToStorage(
          editingProductId
            ? current.map((item) => (item.id === editingProductId ? { ...item, ...newProduct, id: item.id } : item))
            : [...current, newProduct]
        );
      } else if (activeStore.kind === 'flower') {
        const current = await readFlowerProductsFromStorage();
        await writeFlowerProductsToStorage(
          editingProductId
            ? current.map((item) => (item.id === editingProductId ? { ...item, ...newProduct, id: item.id } : item))
            : [...current, newProduct]
        );
      } else {
        const current = await readDessertProductsFromStorage();
        await writeDessertProductsToStorage(
          editingProductId
            ? current.map((item) => (item.id === editingProductId ? { ...item, ...newProduct, id: item.id } : item))
            : [...current, newProduct]
        );
      }
      await refreshData();
      const draftMap = await readPublishDraftMap();
      if (editingProductId) draftMap[activeStore.id] = publishForm;
      else delete draftMap[activeStore.id];
      await writePublishDraftMap(draftMap);
      setPublishForm(EMPTY_PUBLISH_FORM);
      setEditingProductId(null);
      setEditingDraft(false);
      window.alert('商品已上架');
      setPage('store-view');
    } catch {
      window.alert('上架失败，请稍后重试');
    }
  }, [
    activeStore,
    editingDraft,
    editingProductId,
    publishForm,
    readPublishDraftMap,
    refreshData,
    writePublishDraftMap,
  ]);

  const handleSavePublishDraft = React.useCallback(async () => {
    if (!activeStore?.id) return;
    const draftMap = await readPublishDraftMap();
    draftMap[activeStore.id] = publishForm;
    await writePublishDraftMap(draftMap);
    window.alert('已保存临时信息');
    setEditingProductId(null);
    setEditingDraft(false);
    setPage(editingDraft ? 'store-view' : publishReturnPage);
  }, [activeStore?.id, editingDraft, publishForm, publishReturnPage, readPublishDraftMap, writePublishDraftMap]);

  const handlePublishStoreDraft = React.useCallback(async () => {
    const currentDraft = storeDraft;
    if (!activeStore || !currentDraft) return;
    if (!isPublishInfoComplete(currentDraft)) {
      window.alert('请完善商品完整信息后再上架');
      return;
    }
    const title = currentDraft.title.trim();
    const category = currentDraft.category.trim();
    const price = Number(currentDraft.price);
    const stock = Math.max(0, Math.floor(Number(currentDraft.stock)));
    const desc = currentDraft.desc.trim();
    if (!currentDraft.images.length) return window.alert('请至少上传1张商品图片');
    if (!title) return window.alert('请填写宝贝标题');
    if (!category) return window.alert('请选择或添加类目');
    if (!Number.isFinite(price) || price <= 0) return window.alert('请填写正确价格');
    if (!Number.isFinite(stock) || stock <= 0) return window.alert('请填写正确库存');

    const now = Date.now();
    const newProduct: ProductItem = {
      id: `sp-${now.toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      name: title,
      price,
      desc: activeStore.kind === 'movie' ? desc || category || '影片介绍' : desc || `${category}商品`,
      img: currentDraft.images[0],
      stock,
      storeId: activeStore.id,
      isSelected: true,
    };

    try {
      if (activeStore.kind === 'movie') {
        const current = await readMovieProductsFromStorage();
        await writeMovieProductsToStorage([...current, newProduct]);
      } else if (activeStore.kind === 'flower') {
        const current = await readFlowerProductsFromStorage();
        await writeFlowerProductsToStorage([...current, newProduct]);
      } else {
        const current = await readDessertProductsFromStorage();
        await writeDessertProductsToStorage([...current, newProduct]);
      }
      await refreshData();
      const draftMap = await readPublishDraftMap();
      delete draftMap[activeStore.id];
      await writePublishDraftMap(draftMap);
      setStoreDraft(null);
      setEditingProductId(null);
      setEditingDraft(false);
      setPublishForm(EMPTY_PUBLISH_FORM);
      window.alert('商品已上架');
      setPage('store-view');
    } catch {
      window.alert('上架失败，请稍后重试');
    }
  }, [
    activeStore,
    refreshData,
    readPublishDraftMap,
    storeDraft,
    writePublishDraftMap,
  ]);

  const handleSaveEditedProduct = React.useCallback(async () => {
    if (!activeStore || !editingProductId) return;
    const title = publishForm.title.trim();
    const category = publishForm.category.trim();
    const price = Number(publishForm.price);
    const stock = Math.max(0, Math.floor(Number(publishForm.stock)));
    const desc = publishForm.desc.trim();
    if (!publishForm.images.length) return window.alert('请至少上传1张商品图片');
    if (!title) return window.alert('请填写宝贝标题');
    if (!category) return window.alert('请选择或添加类目');
    if (!Number.isFinite(price) || price <= 0) return window.alert('请填写正确价格');
    if (!Number.isFinite(stock) || stock <= 0) return window.alert('请填写正确库存');

    try {
      await updateActiveStoreProducts((items) =>
        items.map((item) =>
          item.id === editingProductId
            ? {
                ...item,
              name: title,
              price,
              stock,
              img: publishForm.images[0],
              desc: activeStore.kind === 'movie' ? desc || category || '影片介绍' : desc || `${category}商品`,
            }
            : item
        )
      );
      setPublishForm(EMPTY_PUBLISH_FORM);
      setEditingProductId(null);
      setEditingDraft(false);
      window.alert('商品信息已保存');
      setPage('store-view');
    } catch {
      window.alert('保存失败，请稍后重试');
    }
  }, [activeStore, editingProductId, publishForm, updateActiveStoreProducts]);

  const handleDeleteEditedProduct = React.useCallback(async () => {
    if (!activeStore || !editingProductId) return;
    try {
      await updateActiveStoreProducts((items) => items.filter((item) => item.id !== editingProductId));
      setPublishForm(EMPTY_PUBLISH_FORM);
      setEditingProductId(null);
      setEditingDraft(false);
      window.alert('商品已删除');
      setPage('store-view');
    } catch {
      window.alert('删除失败，请稍后重试');
    }
  }, [activeStore, editingProductId, updateActiveStoreProducts]);

  if (page === 'store-management') {
    return (
      <SellerStoreManagePage
        stores={stores}
        orders={orders}
        assetBalance={assetBalance}
        onAssetBalanceChange={(nextBalance) => setAssetBalance(nextBalance)}
        onClose={onClose}
        onStoresChange={setStores}
        onEnterDashboard={(storeId) => {
          setSelectedStoreId(storeId);
          setSummaryPeriod('day30');
          setSkipDashboardEnterMotion(true);
          setPage('dashboard');
        }}
      />
    );
  }

  if (page === 'product-publish') {
    return (
      <motion.div
        initial={APP_OPEN_MOTION.initial}
        animate={APP_OPEN_MOTION.animate}
        exit={APP_CLOSE_MOTION}
        transition={{ type: 'spring', damping: 21, stiffness: 210 }}
        className={styles.publishRoot}
        style={viewportPageStyle}
      >
        <header
          className={styles.publishHeader}
          onClickCapture={(event) => {
            const target = event.target as HTMLElement;
            const clickedButton = target.closest('button');
            if (!clickedButton) return;
            const firstButton = event.currentTarget.querySelector('button');
            if (firstButton && clickedButton === firstButton) {
              event.preventDefault();
              event.stopPropagation();
              setPage(publishReturnPage);
            }
          }}
        >
          <button type="button" className={styles.iconButton} onClick={() => setPage('dashboard')} aria-label="返回">
            <ChevronLeft size={24} />
          </button>
          <h1>{editingProductId ? '编辑商品' : '发布商品'}</h1>
          <button type="button" className={styles.iconButton} aria-label="更多">
            <MoreHorizontal size={22} />
          </button>
        </header>

        <main ref={publishContentScrollRef} className={styles.publishContent}>
          <section className={styles.publishCard}>
            <h3 className={styles.publishFieldTitle}>
              商品图片 <em>*</em>
            </h3>
            <div className={styles.publishImageHintTop}>
              <strong>5张主图尺寸一致</strong>
              <p>上传图片，系统自动识别并帮你填充相关信息</p>
            </div>
            <div className={styles.publishImageRow}>
              <div className={styles.publishImageGrid}>
                {publishForm.images.map((src, index) => (
                  <div key={`${src.slice(0, 20)}-${index}`} className={styles.publishImageThumb}>
                    <img src={src} alt={`商品图${index + 1}`} />
                  </div>
                ))}
                {publishForm.images.length < 5 ? (
                  <button
                    type="button"
                    className={styles.publishImageAdd}
                    onClick={() => publishImageInputRef.current?.click()}
                  >
                    <span>+</span>
                    <small>{publishForm.images.length}/5</small>
                  </button>
                ) : null}
              </div>
              <input
                ref={publishImageInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(event) => {
                  handleAddPublishImage(event.target.files?.[0]);
                  event.currentTarget.value = '';
                }}
              />
            </div>

            <h3 className={styles.publishFieldTitle}>
              宝贝标题 <em>*</em>
            </h3>
            <div className={styles.publishTitleWrap}>
              <textarea
                value={publishForm.title}
                maxLength={60}
                onChange={(event) => setPublishForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="最多输入60个字符（30个汉字）"
              />
              <span>{publishForm.title.length}/60</span>
            </div>
            <div className={styles.publishTitleDivider} />
            <div className={styles.publishDescBlock}>
              <h3>宝贝描述</h3>
              <textarea
                value={publishForm.desc}
                onChange={(event) => setPublishForm((prev) => ({ ...prev, desc: event.target.value }))}
                placeholder="输入宝贝描述..."
                maxLength={120}
              />
            </div>
          </section>

          <section className={styles.publishCard}>
            <label className={styles.publishRow}>
              <strong>
                类目 <em>*</em>
              </strong>
              <div className={styles.publishCategoryWrap}>
                <div className={styles.publishCategorySelect}>
                  <select
                    value={publishForm.category}
                    onChange={(event) => setPublishForm((prev) => ({ ...prev, category: event.target.value }))}
                  >
                    <option value="">选择类目，确认商品信息</option>
                    {publishCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={18} />
                </div>
                <div className={styles.publishCategoryAddRow}>
                  <input
                    value={customCategory}
                    onChange={(event) => setCustomCategory(event.target.value)}
                    placeholder="自定义新增类目"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const next = customCategory.trim();
                      if (!next) return;
                      if (!publishCategories.includes(next)) {
                        setPublishCategories((prev) => [...prev, next]);
                      }
                      setPublishForm((prev) => ({ ...prev, category: next }));
                      setCustomCategory('');
                    }}
                  >
                    添加
                  </button>
                </div>
              </div>
            </label>
            <label className={styles.publishRow}>
              <strong>
                价格 <em>*</em>
              </strong>
              <div>
                <input
                  value={publishForm.price}
                  onChange={(event) => setPublishForm((prev) => ({ ...prev, price: event.target.value }))}
                  placeholder="￥ 0.0"
                />
              </div>
            </label>
            <label className={styles.publishRow}>
              <strong>
                库存 <em>*</em>
              </strong>
              <div>
                <input
                  value={publishForm.stock}
                  onChange={(event) => setPublishForm((prev) => ({ ...prev, stock: event.target.value }))}
                  placeholder="0"
                />
              </div>
            </label>
            <label className={styles.publishRow}>
              <strong>宝贝描述</strong>
              <div>
                <textarea
                  value={publishForm.desc}
                  onChange={(event) => setPublishForm((prev) => ({ ...prev, desc: event.target.value }))}
                  placeholder="输入宝贝描述..."
                  maxLength={120}
                />
              </div>
            </label>
          </section>
        </main>

        <footer
          className={`${styles.publishFooter} ${
            shouldHidePublishFooter ? styles.publishFooterHidden : ''
          } ${
            editingProductId && !editingDraft && activeStore?.kind === 'movie' ? styles.publishFooterWithDelete : ''
          }`}
        >
          {!shouldHidePublishFooter ? (
            editingProductId && !editingDraft ? (
              <>
                {activeStore?.kind === 'movie' ? (
                  <button
                    type="button"
                    className={styles.publishDeleteBtn}
                    onClick={() => {
                      void handleDeleteEditedProduct();
                    }}
                  >
                    删除
                  </button>
                ) : null}
                <button
                  type="button"
                  className={`${styles.publishSaveBtn} ${styles.publishSaveBtnEdit}`}
                  onClick={() => {
                    setEditingProductId(null);
                    setEditingDraft(false);
                    setPage('store-view');
                  }}
                >
                  取消
                </button>
                <button
                  type="button"
                  className={`${styles.publishSubmitBtn} ${styles.publishSubmitBtnEdit}`}
                  onClick={() => {
                    void handleSaveEditedProduct();
                  }}
                >
                  保存
                </button>
              </>
            ) : editingDraft ? (
              <>
                <button
                  type="button"
                  className={`${styles.publishSaveBtn} ${styles.publishSaveBtnEdit}`}
                  onClick={() => {
                    setEditingProductId(null);
                    setEditingDraft(false);
                    setPage('store-view');
                  }}
                >
                  取消
                </button>
                <button
                  type="button"
                  className={`${styles.publishSubmitBtn} ${styles.publishSubmitBtnEdit}`}
                  onClick={() => {
                    void handleSavePublishDraft();
                  }}
                >
                  保存
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className={`${styles.publishSaveBtn} ${editingDraft ? styles.publishSaveBtnEdit : ''}`}
                  onClick={() => {
                    void handleSavePublishDraft();
                  }}
                >
                  保存
                </button>
                <button
                  type="button"
                  className={`${styles.publishSubmitBtn} ${editingDraft ? styles.publishSubmitBtnEdit : ''}`}
                  onClick={() => {
                    void handlePublishNow();
                  }}
                >
                  立即上架
                </button>
              </>
            )
          ) : null}
        </footer>
      </motion.div>
    );
  }

  if (page === 'store-view') {
    const storeTitle = isStoreDecorationEditing
      ? storeDecorationDraft?.signboardValue.trim() || activeStore?.signboard || activeStore?.name || '我的店铺'
      : activeStore?.signboard || activeStore?.name || '我的店铺';
    const storeTypeLabel = isStoreDecorationEditing
      ? storeDecorationDraft?.typeNameValue.trim() || activeStore?.typeName || '店铺'
      : activeStore?.typeName || '店铺';
    const storeDescription = (activeStore?.description || '').trim();
    const storeAvatarText = storeTitle.slice(0, 2).toUpperCase();
    const visibleStoreDraft = !isStoreDecorationEditing ? storeDraft : null;
    const storeHeroBackground = isStoreDecorationEditing ? draftStoreHeroBackground : publishedStoreHeroBackground;
    const storeAvatarImage = isStoreDecorationEditing ? draftStoreLogo : activeStore?.logo;
    const storeTabLabels = isStoreDecorationEditing
      ? storeDecorationDraft?.tabLabels || DEFAULT_STORE_TAB_LABELS
      : activeStore?.decorationConfig?.tabLabels || DEFAULT_STORE_TAB_LABELS;
    const storeFilterLabels = isStoreDecorationEditing
      ? storeDecorationDraft?.filterLabels || DEFAULT_STORE_FILTER_LABELS
      : activeStore?.decorationConfig?.filterLabels || DEFAULT_STORE_FILTER_LABELS;
    const storeHeroRatingLabels = isStoreDecorationEditing
      ? storeDecorationDraft?.heroRatingLabels || DEFAULT_STORE_HERO_RATING_LABELS
      : activeStore?.decorationConfig?.heroRatingLabels || DEFAULT_STORE_HERO_RATING_LABELS;
    const storeHeroTagLabels = isStoreDecorationEditing
      ? storeDecorationDraft?.heroTagLabels || DEFAULT_STORE_HERO_TAG_LABELS
      : activeStore?.decorationConfig?.heroTagLabels || DEFAULT_STORE_HERO_TAG_LABELS;
    const storeMovieTextLabels = isStoreDecorationEditing
      ? storeDecorationDraft?.movieTextLabels || DEFAULT_STORE_MOVIE_TEXT_LABELS
      : activeStore?.decorationConfig?.movieTextLabels || DEFAULT_STORE_MOVIE_TEXT_LABELS;
    const storeMovieCheckoutLabels = isStoreDecorationEditing
      ? storeDecorationDraft?.movieCheckoutLabels || DEFAULT_STORE_MOVIE_CHECKOUT_LABELS
      : activeStore?.decorationConfig?.movieCheckoutLabels || DEFAULT_STORE_MOVIE_CHECKOUT_LABELS;
    const storeMovieSessionOptions = isStoreDecorationEditing
      ? storeDecorationDraft?.movieSessionOptions || DEFAULT_STORE_MOVIE_SESSION_OPTIONS
      : activeStore?.decorationConfig?.movieSessionOptions || DEFAULT_STORE_MOVIE_SESSION_OPTIONS;
    const updateMovieCheckoutLabel = (index: number, value: string) =>
      setStoreDecorationDraft((prev) =>
        prev
          ? {
              ...prev,
              movieCheckoutLabels: prev.movieCheckoutLabels.map((item, itemIndex) =>
                itemIndex === index ? value : item
              ),
            }
          : prev
      );
    const updateMovieSessionOption = (index: number, value: string) =>
      setStoreDecorationDraft((prev) =>
        prev
          ? {
              ...prev,
              movieSessionOptions: prev.movieSessionOptions.map((item, itemIndex) =>
                itemIndex === index ? value : item
              ),
            }
          : prev
      );
    const movieCheckoutDateValue = /^\d{4}-\d{2}-\d{2}$/.test(storeMovieCheckoutLabels[9] || '')
      ? storeMovieCheckoutLabels[9]
      : '';
    const isMovieStore = activeStore?.kind === 'movie';
    return (
      <motion.div
        initial={APP_OPEN_MOTION.initial}
        animate={APP_OPEN_MOTION.animate}
        exit={APP_CLOSE_MOTION}
        transition={{ type: 'spring', damping: 21, stiffness: 210 }}
        className={styles.appRoot}
      >
        <header className={styles.header}>
          <button className={styles.iconButton} onClick={handleStoreViewBack} aria-label="返回">
            <ChevronLeft size={24} />
          </button>
          <button className={styles.iconButton} onClick={() => void refreshData()} aria-label="刷新">
            <RotateCw size={18} />
          </button>
        </header>

        <main ref={storeViewContentRef} className={styles.content}>
          <div className={styles.storeViewHeroToolbar}>
            {isStoreDecorationEditing ? (
              <>
                <button type="button" className={styles.ghostPill} onClick={cancelStoreDecorationEditing}>
                  取消编辑
                </button>
                <button
                  type="button"
                  className={styles.ghostPill}
                  onClick={() => {
                    setPreviewSelectedMovie(null);
                    setPreviewMovieCinema((storeMovieCheckoutLabels[8] || '').trim() || DEFAULT_STORE_MOVIE_CHECKOUT_LABELS[8]);
                    setPreviewMovieDate(resolveMovieCheckoutDateDefault(storeMovieCheckoutLabels));
                    setPreviewMovieSession(
                      (storeMovieSessionOptions[0] || '').trim() || DEFAULT_STORE_MOVIE_SESSION_OPTIONS[0]
                    );
                    setPreviewMovieQty(resolveMovieCheckoutQtyDefault(storeMovieCheckoutLabels));
                    setIsStoreDecorationPreviewVisible(true);
                  }}
                >
                  预览效果
                </button>
                <button
                  type="button"
                  className={styles.storeViewDecorateButton}
                  onClick={() => void handlePublishStoreDecoration()}
                >
                  发布装修
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className={styles.storeViewAiGenerateButton}
                  onClick={() => setIsAiProductCountDialogVisible(true)}
                  disabled={isAiGeneratingProducts}
                >
                  {isAiGeneratingProducts ? '生成中...' : 'AI生成商品'}
                </button>
                {!isMovieStore ? (
                  <button type="button" className={styles.ghostPill} onClick={openPublishPage}>
                    发布商品
                  </button>
                ) : (
                  <button type="button" className={styles.ghostPill} onClick={openPublishPage}>
                    上新
                  </button>
                )}
                <button
                  type="button"
                  className={styles.storeViewDecorateEntryButton}
                  onClick={startStoreDecorationEditing}
                >
                  <Sparkles size={16} />
                  装饰我的店铺
                </button>
              </>
            )}
          </div>
          {isMovieStore && !isStoreDecorationEditing ? (
            <>
              <ShoppingMovies
                query={movieStoreQuery}
                movies={filteredMovieStoreMovies}
                scrollRef={storeViewContentRef}
                onQueryChange={setMovieStoreQuery}
                storeSignboard={storeTitle}
                storeTypeName={storeTypeLabel}
                storeDescription={storeDescription}
                storeLogo={storeAvatarImage}
                storeCover={activeStore?.cover}
                storeTheme={activeStore?.theme}
                movieTextLabels={storeMovieTextLabels}
                disableVirtualization
                onSelectMovie={(movie) => {
                  const target = activeStoreProducts.find((item) => item.id === movie.id);
                  if (!target) return;
                  openProductEditor(target);
                }}
              />
            </>
          ) : isMovieStore ? (
            <>
              <section
                className={`${styles.storeTemplatePreviewHero} ${styles.movieDecorationHero} ${
                  isStoreDecorationEditing ? styles.storeViewHeroEditable : ''
                }`}
                style={{ backgroundImage: storeHeroBackground }}
                onClick={(event) => {
                  const target = event.target as HTMLElement | null;
                  if (target?.closest('[data-decoration-interactive="true"]')) return;
                  setIsStoreDecorationPanelVisible(true);
                }}
              >
                <div className={styles.storeTemplatePreviewMask} />
                <div className={styles.storeTemplatePreviewContent}>
                  <div className={styles.storeTemplatePreviewProfile}>
                    <div
                      data-decoration-interactive="true"
                      className={`${styles.storeTemplatePreviewAvatar} ${styles.storeEditableAvatar}`}
                      onClick={() => storeDecorationAvatarInputRef.current?.click()}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          storeDecorationAvatarInputRef.current?.click();
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label="上传店铺头像"
                    >
                      {storeAvatarImage ? (
                        <img src={storeAvatarImage} alt={storeTitle} className={styles.avatarImage} />
                      ) : (
                        storeAvatarText
                      )}
                    </div>
                    <div className={styles.movieDecorationHeroFields}>
                      <input
                        data-decoration-interactive="true"
                        value={storeDecorationDraft?.signboardValue || ''}
                        onChange={(event) =>
                          setStoreDecorationDraft((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  signboardValue: event.target.value,
                                }
                              : prev
                          )
                        }
                        className={styles.movieDecorationHeroTitleInput}
                        placeholder="输入店铺名称"
                      />
                      <input
                        data-decoration-interactive="true"
                        value={storeDecorationDraft?.typeNameValue || ''}
                        onChange={(event) =>
                          setStoreDecorationDraft((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  typeNameValue: event.target.value,
                                }
                              : prev
                          )
                        }
                        className={styles.movieDecorationHeroSubtitleInput}
                        placeholder="输入店铺副标题"
                      />
                    </div>
                  </div>
                </div>
              </section>
              <input
                ref={storeDecorationImageInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(event) => {
                  handleStoreDecorationBackgroundUpload(event.target.files?.[0]);
                  event.currentTarget.value = '';
                }}
              />
              <input
                ref={storeDecorationAvatarInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(event) => {
                  handleStoreDecorationAvatarUpload(event.target.files?.[0]);
                  event.currentTarget.value = '';
                }}
              />
              <div className={styles.storeTemplatePreviewMovieLayout}>
                <section className={styles.storeTemplatePreviewMovieHeader}>
                  <input
                    value={storeMovieTextLabels[0]}
                    onChange={(event) =>
                      setStoreDecorationDraft((prev) =>
                        prev
                          ? {
                              ...prev,
                              movieTextLabels: prev.movieTextLabels.map((item, index) =>
                                index === 0 ? event.target.value : item
                              ),
                            }
                          : prev
                      )
                    }
                    className={styles.movieDecorationCardTitleInput}
                    placeholder={DEFAULT_STORE_MOVIE_TEXT_LABELS[0]}
                  />
                  <textarea
                    value={storeMovieTextLabels[1]}
                    onChange={(event) =>
                      setStoreDecorationDraft((prev) =>
                        prev
                          ? {
                              ...prev,
                              movieTextLabels: prev.movieTextLabels.map((item, index) =>
                                index === 1 ? event.target.value : item
                              ),
                            }
                          : prev
                      )
                    }
                    className={styles.movieDecorationCardTextarea}
                    placeholder={DEFAULT_STORE_MOVIE_TEXT_LABELS[1]}
                    rows={2}
                  />
                </section>
                <section className={styles.storeTemplatePreviewMovieSearch}>
                  <input
                    value={storeMovieTextLabels[2]}
                    onChange={(event) =>
                      setStoreDecorationDraft((prev) =>
                        prev
                          ? {
                              ...prev,
                              movieTextLabels: prev.movieTextLabels.map((item, index) =>
                                index === 2 ? event.target.value : item
                              ),
                            }
                          : prev
                      )
                    }
                    className={styles.movieDecorationSearchLabelInput}
                    placeholder={DEFAULT_STORE_MOVIE_TEXT_LABELS[2]}
                  />
                  <input
                    value={storeMovieTextLabels[3]}
                    onChange={(event) =>
                      setStoreDecorationDraft((prev) =>
                        prev
                          ? {
                              ...prev,
                              movieTextLabels: prev.movieTextLabels.map((item, index) =>
                                index === 3 ? event.target.value : item
                              ),
                            }
                          : prev
                      )
                    }
                    className={styles.movieDecorationSearchInput}
                    placeholder={DEFAULT_STORE_MOVIE_TEXT_LABELS[3]}
                  />
                </section>
                <section className={styles.movieDecorationCheckoutSection}>
                  <p className={styles.movieDecorationCheckoutTitle}>选择场次页文案</p>
                  <div className={styles.movieDecorationCheckoutPhoneCard}>
                    <div className={styles.movieDecorationCheckoutFormRow}>
                      <input
                        className={styles.movieDecorationCheckoutFormLabelInput}
                        value={storeMovieCheckoutLabels[2]}
                        onChange={(event) => updateMovieCheckoutLabel(2, event.target.value)}
                        placeholder={DEFAULT_STORE_MOVIE_CHECKOUT_LABELS[2]}
                      />
                      <input
                        className={styles.movieDecorationCheckoutFormInput}
                        value={storeMovieCheckoutLabels[8]}
                        onChange={(event) => updateMovieCheckoutLabel(8, event.target.value)}
                        placeholder={DEFAULT_STORE_MOVIE_CHECKOUT_LABELS[8]}
                      />
                    </div>
                    <div className={styles.movieDecorationCheckoutFormRow}>
                      <input
                        className={styles.movieDecorationCheckoutFormLabelInput}
                        value={storeMovieCheckoutLabels[3]}
                        onChange={(event) => updateMovieCheckoutLabel(3, event.target.value)}
                        placeholder={DEFAULT_STORE_MOVIE_CHECKOUT_LABELS[3]}
                      />
                      <input
                        type="date"
                        className={styles.movieDecorationCheckoutFormInput}
                        value={movieCheckoutDateValue}
                        onChange={(event) => updateMovieCheckoutLabel(9, event.target.value)}
                      />
                    </div>
                    <div className={styles.movieDecorationCheckoutFormRow}>
                      <input
                        className={styles.movieDecorationCheckoutFormLabelInput}
                        value={storeMovieCheckoutLabels[4]}
                        onChange={(event) => updateMovieCheckoutLabel(4, event.target.value)}
                        placeholder={DEFAULT_STORE_MOVIE_CHECKOUT_LABELS[4]}
                      />
                      <div className={styles.movieDecorationSessionPicker}>
                        <button
                          type="button"
                          className={styles.movieDecorationSessionTrigger}
                          onClick={() => setIsMovieSessionEditorOpen((prev) => !prev)}
                        >
                          <span>{storeMovieSessionOptions[0] || DEFAULT_STORE_MOVIE_SESSION_OPTIONS[0]}</span>
                          <ChevronDown
                            size={16}
                            className={`${styles.movieDecorationSessionChevron} ${
                              isMovieSessionEditorOpen ? styles.movieDecorationSessionChevronOpen : ''
                            }`}
                          />
                        </button>
                        {isMovieSessionEditorOpen ? (
                          <div className={styles.movieDecorationSessionDropdown}>
                            {storeMovieSessionOptions.map((option, index) => (
                              <label key={`movie-preview-session-edit-${index}`}>
                                <span>场次 {index + 1}</span>
                                <input
                                  value={option}
                                  onChange={(event) => updateMovieSessionOption(index, event.target.value)}
                                  placeholder={DEFAULT_STORE_MOVIE_SESSION_OPTIONS[index]}
                                />
                              </label>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div className={styles.movieDecorationCheckoutFormRow}>
                      <input
                        className={styles.movieDecorationCheckoutFormLabelInput}
                        value={storeMovieCheckoutLabels[5]}
                        onChange={(event) => updateMovieCheckoutLabel(5, event.target.value)}
                        placeholder={DEFAULT_STORE_MOVIE_CHECKOUT_LABELS[5]}
                      />
                      <input
                        type="number"
                        min={1}
                        max={6}
                        className={styles.movieDecorationCheckoutFormInput}
                        value={storeMovieCheckoutLabels[10]}
                        onChange={(event) => updateMovieCheckoutLabel(10, event.target.value)}
                        placeholder={DEFAULT_STORE_MOVIE_CHECKOUT_LABELS[10]}
                      />
                    </div>
                    <input
                      className={styles.movieDecorationCheckoutSubmitInput}
                      value={storeMovieCheckoutLabels[6]}
                      onChange={(event) => updateMovieCheckoutLabel(6, event.target.value)}
                      placeholder={DEFAULT_STORE_MOVIE_CHECKOUT_LABELS[6]}
                    />
                  </div>
                </section>
                {storeViewProducts.map((product) => (
                  <article
                    key={product.id}
                    data-decoration-product-id={product.id}
                    className={`${styles.storeTemplatePreviewMovieCard} ${styles.movieDecorationEditableCard} ${
                      draggingDecorationProductId === product.id ? styles.storeDecorationDraggingCard : ''
                    } ${decorationDropTargetId === product.id ? styles.storeDecorationDropTargetCard : ''}`}
                  >
                    <button
                      type="button"
                      className={styles.storeDecorationDragHandle}
                      onPointerDown={(event) => {
                        if (event.button !== 0) return;
                        event.preventDefault();
                        event.stopPropagation();
                        decorationPointerIdRef.current = event.pointerId;
                        setDraggingDecorationProductId(product.id);
                        setDecorationDropTargetId(null);
                      }}
                    >
                      <GripVertical size={14} />
                      拖动排序
                    </button>
                    <div
                      className={styles.storeTemplatePreviewMoviePoster}
                      style={{ backgroundImage: product.img ? `url(${product.img})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}
                      onClick={() => openProductEditor(product)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          openProductEditor(product);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    />
                    <strong>{product.name}</strong>
                    <p>{product.desc}</p>
                    <em>￥{product.price.toFixed(2)} 起</em>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <>
          <section
            className={`${styles.storeViewHero} ${isStoreDecorationEditing ? styles.storeViewHeroEditable : ''}`}
            style={{ backgroundImage: storeHeroBackground, backgroundSize: 'cover', backgroundPosition: 'center' }}
            onClick={(event) => {
              if (!isStoreDecorationEditing) return;
              const target = event.target as HTMLElement | null;
              if (target?.closest('[data-decoration-interactive="true"]')) return;
              setIsStoreDecorationPanelVisible(true);
            }}
          >
            <div className={styles.storeViewHeroMask} />
            <div className={styles.storeViewHeroContent}>
              <div className={styles.storeViewHeroMain}>
                <div className={styles.storeViewHeroTop}>
                  <div className={styles.storeProfile}>
                    <div
                      data-decoration-interactive="true"
                      className={`${styles.avatarWrap} ${isStoreDecorationEditing ? styles.storeEditableAvatar : ''}`}
                      onClick={() => {
                        if (!isStoreDecorationEditing) return;
                        storeDecorationAvatarInputRef.current?.click();
                      }}
                      onKeyDown={(event) => {
                        if (!isStoreDecorationEditing) return;
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          storeDecorationAvatarInputRef.current?.click();
                        }
                      }}
                      role={isStoreDecorationEditing ? 'button' : undefined}
                      tabIndex={isStoreDecorationEditing ? 0 : -1}
                      aria-label={isStoreDecorationEditing ? '上传店铺头像' : undefined}
                    >
                      {storeAvatarImage ? (
                        <img src={storeAvatarImage} alt={storeTitle} className={styles.avatarImage} />
                      ) : (
                        <span>{storeAvatarText}</span>
                      )}
                    </div>
                    <div>
                      {isStoreDecorationEditing ? (
                        <input
                          data-decoration-interactive="true"
                          value={storeDecorationDraft?.signboardValue || ''}
                          onChange={(event) =>
                            setStoreDecorationDraft((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    signboardValue: event.target.value,
                                  }
                                : prev
                            )
                          }
                          className={`${styles.storeHeroEditableInput} ${styles.storeHeroEditableTitle}`}
                          placeholder="输入店铺名称"
                        />
                      ) : (
                        <h1 className={styles.storeName}>{storeTitle}</h1>
                      )}
                      <div className={styles.storeViewHeroRating}>
                        {storeHeroRatingLabels.map((label, index) =>
                          isStoreDecorationEditing ? (
                            <input
                              key={`hero-rating-${index}`}
                              data-decoration-interactive="true"
                              value={label}
                              onChange={(event) =>
                                setStoreDecorationDraft((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        heroRatingLabels: prev.heroRatingLabels.map((item, itemIndex) =>
                                          itemIndex === index ? event.target.value : item
                                        ),
                                      }
                                    : prev
                                )
                              }
                              className={`${styles.storeHeroEditableInline} ${
                                index === 0 ? styles.storeHeroEditableStars : ''
                              }`}
                              placeholder={DEFAULT_STORE_HERO_RATING_LABELS[index]}
                            />
                          ) : (
                            <span
                              key={`hero-rating-${index}`}
                              className={index === 0 ? styles.storeViewHeroStars : ''}
                            >
                              {label}
                            </span>
                          )
                        )}
                      </div>
                      {isStoreDecorationEditing ? (
                        <input
                          data-decoration-interactive="true"
                          value={storeDecorationDraft?.typeNameValue || ''}
                          onChange={(event) =>
                            setStoreDecorationDraft((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    typeNameValue: event.target.value,
                                  }
                                : prev
                            )
                          }
                          className={styles.storeHeroEditableInput}
                          placeholder="输入副标题"
                        />
                      ) : (
                        <p className={styles.storeHeroMetaLine}>
                          <span>{storeTypeLabel}</span>
                          {storeDescription ? (
                            <span className={styles.storeHeroMetaDescription}> · {storeDescription}</span>
                          ) : null}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className={styles.storeViewHeroTags}>
                  {storeHeroTagLabels.map((label, index) =>
                    isStoreDecorationEditing ? (
                      <input
                        key={`hero-tag-${index}`}
                        data-decoration-interactive="true"
                        value={label}
                        onChange={(event) =>
                          setStoreDecorationDraft((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  heroTagLabels: prev.heroTagLabels.map((item, itemIndex) =>
                                    itemIndex === index ? event.target.value : item
                                  ),
                                }
                              : prev
                          )
                        }
                        className={styles.storeHeroEditableTag}
                        placeholder={DEFAULT_STORE_HERO_TAG_LABELS[index]}
                      />
                    ) : (
                      <span key={`hero-tag-${index}`}>{label}</span>
                    )
                  )}
                </div>
              </div>
            </div>
          </section>
          <input
            ref={storeDecorationImageInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(event) => {
              handleStoreDecorationBackgroundUpload(event.target.files?.[0]);
              event.currentTarget.value = '';
            }}
          />
          <input
            ref={storeDecorationAvatarInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(event) => {
              handleStoreDecorationAvatarUpload(event.target.files?.[0]);
              event.currentTarget.value = '';
            }}
          />

          <div className={styles.storeViewTabs}>
            {storeTabLabels.map((label, index) =>
              isStoreDecorationEditing ? (
                <input
                  key={`tab-${index}`}
                  value={label}
                  onChange={(event) =>
                    setStoreDecorationDraft((prev) =>
                      prev
                        ? {
                            ...prev,
                            tabLabels: prev.tabLabels.map((item, itemIndex) =>
                              itemIndex === index ? event.target.value : item
                            ),
                          }
                        : prev
                    )
                  }
                  className={`${styles.storeViewTabInput} ${index === 0 ? styles.storeViewTabInputActive : ''}`}
                  placeholder={DEFAULT_STORE_TAB_LABELS[index]}
                />
              ) : (
                <button
                  key={`tab-${index}`}
                  type="button"
                  className={`${styles.storeViewTab} ${index === 0 ? styles.storeViewTabActive : ''}`}
                >
                  {label}
                </button>
              )
            )}
          </div>

          <div className={styles.storeViewFilters}>
            {storeFilterLabels.map((label, index) =>
              isStoreDecorationEditing ? (
                <input
                  key={`filter-${index}`}
                  value={label}
                  onChange={(event) =>
                    setStoreDecorationDraft((prev) =>
                      prev
                        ? {
                            ...prev,
                            filterLabels: prev.filterLabels.map((item, itemIndex) =>
                              itemIndex === index ? event.target.value : item
                            ),
                          }
                        : prev
                    )
                  }
                  className={`${styles.storeViewFilterInput} ${
                    index === 0 ? styles.storeViewFilterInputActive : ''
                  }`}
                  placeholder={DEFAULT_STORE_FILTER_LABELS[index]}
                />
              ) : (
                <button
                  key={`filter-${index}`}
                  type="button"
                  className={`${styles.storeViewFilter} ${index === 0 ? styles.storeViewFilterActive : ''}`}
                >
                  {label}
                </button>
              )
            )}
          </div>

          <section className={styles.card}>
            {storeViewProducts.length === 0 ? (
              <p className={styles.storeDraftEmpty}>
                {isStoreDecorationEditing ? '当前暂无已上架商品，可先发布宝贝后再调整排序' : '暂无已上架商品'}
              </p>
            ) : (
              <div className={styles.storeSellerGoodsGrid}>
                {storeViewProducts.map((product) => (
                  <article
                    key={product.id}
                    data-decoration-product-id={isStoreDecorationEditing ? product.id : undefined}
                    className={[
                      styles.storeSellerGoodsCard,
                      isStoreDecorationEditing && draggingDecorationProductId === product.id
                        ? styles.storeDecorationDraggingCard
                        : '',
                      isStoreDecorationEditing && decorationDropTargetId === product.id
                        ? styles.storeDecorationDropTargetCard
                        : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <div
                      className={`${styles.storeSellerGoodsImage} ${isMovieStore ? styles.storeSellerGoodsImageStatic : ''}`}
                      style={{ backgroundImage: product.img ? `url(${product.img})` : undefined }}
                      onClick={() => {
                        if (isMovieStore) return;
                        openProductEditor(product);
                      }}
                      onKeyDown={(event) => {
                        if (isMovieStore) return;
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          openProductEditor(product);
                        }
                      }}
                      role={isMovieStore ? undefined : 'button'}
                      tabIndex={isMovieStore ? -1 : 0}
                    >
                      {isStoreDecorationEditing ? (
                        <button
                          type="button"
                          className={styles.storeDecorationDragHandle}
                          onPointerDown={(event) => {
                            if (event.button !== 0) return;
                            event.preventDefault();
                            event.stopPropagation();
                            decorationPointerIdRef.current = event.pointerId;
                            setDraggingDecorationProductId(product.id);
                            setDecorationDropTargetId(null);
                          }}
                        >
                          <GripVertical size={14} />
                          拖动排序
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className={styles.storeHiddenAction}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          void handlePublishStoreDraft();
                        }}
                      >
                        上架商品
                      </button>
                      <button
                        type="button"
                        className={styles.storeHiddenAction}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          void handlePublishStoreDraft();
                        }}
                      >
                        上架
                      </button>
                      <button
                        type="button"
                        className={styles.storeHiddenAction}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          void handlePublishStoreDraft();
                        }}
                      >
                        上架商品
                      </button>
                      {!isMovieStore && product.isSelected === false ? (
                        <div className={styles.storeSellerStatusMask}>已下架</div>
                      ) : null}
                      {!isMovieStore &&
                      product.isSelected !== false &&
                      Math.max(0, Math.floor(Number(product.stock) || 0)) === 0 ? (
                        <div className={styles.storeSellerSoldOutMask}>该商品已售罄</div>
                      ) : null}
                    </div>
                    <div className={styles.storeSellerGoodsBody}>
                      <em>{isMovieStore ? '在线选座购票' : `限时立减${Math.max(6, Math.round(product.price * 0.2))}元`}</em>
                      <h3>{product.name}</h3>
                      <p>{product.desc}</p>
                      <div
                        className={styles.storeSellerGoodsMeta}
                        onClick={() => {
                          if (isMovieStore) return;
                          openStockEditor(product.id, Math.max(0, Math.floor(Number(product.stock) || 0)));
                        }}
                        onKeyDown={(event) => {
                          if (isMovieStore) return;
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            openStockEditor(product.id, Math.max(0, Math.floor(Number(product.stock) || 0)));
                          }
                        }}
                        role={isMovieStore ? undefined : 'button'}
                        tabIndex={isMovieStore ? -1 : 0}
                        style={{ cursor: isMovieStore ? 'default' : undefined }}
                      >
                        <strong>￥ {product.price.toFixed(1)}</strong>
                        <span>{isMovieStore ? '立即购票' : `库存 ${Math.max(0, Math.floor(Number(product.stock) || 0))}`}</span>
                      </div>
                      {stockEditProductId === product.id && !isStoreDecorationEditing && !isMovieStore ? (
                        <div className={styles.storeStockEditor}>
                          <input
                            value={stockEditValue}
                            className={styles.storeStockEditorInputFix}
                            onChange={(event) => setStockEditValue(event.target.value)}
                            placeholder="输入库存量"
                          />
                          <button type="button" onClick={() => void handleSaveStock()}>
            {editingProductId || editingDraft ? '取消' : '保存'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setStockEditProductId(null);
                              setStockEditValue('');
                            }}
                          >
                            取消
                          </button>
                        </div>
                      ) : null}
                      {isStoreDecorationEditing ? (
                        <div className={styles.storeDecorationCardHint}>
                          <strong>第 {storeViewProducts.findIndex((item) => item.id === product.id) + 1} 位</strong>
                        </div>
                      ) : isMovieStore ? (
                        <div className={styles.storeMovieCardNote}>购票入口预览</div>
                      ) : (
                        <div className={styles.storeSellerGoodsActions}>
                          <button type="button" onClick={() => void handleIncreaseStock(product.id)}>
                            增加库存
                          </button>
                          <button
                            type="button"
                            className={product.isSelected === false ? styles.storeRelistButton : styles.storeHiddenAction}
                            onClick={() => void handleRelistProduct(product.id)}
                          >
                            重新上架
                          </button>
                          <button
                            type="button"
                            className={product.isSelected === false ? styles.storeHiddenAction : ''}
                            onClick={() => void handleUnlistProduct(product.id)}
                          >
                            下架商品
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
                {!isMovieStore && visibleStoreDraft ? (
                  <article className={styles.storeSellerGoodsCard}>
                      <div
                        className={styles.storeSellerGoodsImage}
                        style={{
                          backgroundImage: visibleStoreDraft.images[0]
                            ? `url(${visibleStoreDraft.images[0]})`
                            : undefined,
                        }}
                        onClick={openDraftEditor}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            openDraftEditor();
                          }
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        <button
                          type="button"
                          className={styles.storeHiddenAction}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            void handlePublishStoreDraft();
                          }}
                        >
                          上架商品
                        </button>
                        <div className={styles.storeSellerPendingMask}>待上架</div>
                      </div>
                      <div className={`${styles.storeSellerGoodsBody} ${styles.storeDraftGoodsBody}`}>
                        <h3>{visibleStoreDraft.title || '未命名草稿'}</h3>
                        <p>{visibleStoreDraft.category || '待完善类目'}</p>
                        <div className={`${styles.storeSellerGoodsMeta} ${styles.storeDraftMetaPlaceholder}`}>
                          <strong>￥ 0.0</strong>
                          <span>库存 0</span>
                        </div>
                        <div className={`${styles.storeSellerGoodsActions} ${styles.storeDraftGoodsActions}`}>
                          <button type="button" className={styles.storeHiddenAction}>
                            增加库存
                          </button>
                          <button
                            type="button"
                            className={styles.storeDraftPublishAction}
                            onClick={() => void handlePublishStoreDraft()}
                          >
                            上架商品
                          </button>
                        </div>
                      </div>
                  </article>
                ) : null}
              </div>
            )}
          </section>
            </>
          )}
        </main>
        {isAiProductCountDialogVisible ? (
          <div className={styles.storeAiCountOverlay} aria-modal="true" role="dialog">
            <button
              type="button"
              className={styles.storeAiCountBackdrop}
              onClick={() => setIsAiProductCountDialogVisible(false)}
              aria-label="关闭数量选择"
            />
            <div className={styles.storeAiCountDialog}>
              <h3>选择生成数量</h3>
              <p>根据当前店铺信息生成商品与主图，建议 5-10 个。</p>
              <div className={styles.storeAiCountGrid}>
                {[5, 6, 7, 8, 9, 10].map((count) => (
                  <button
                    key={`ai-product-count-${count}`}
                    type="button"
                    className={`${styles.storeAiCountOption} ${
                      aiProductCount === count ? styles.storeAiCountOptionActive : ''
                    }`}
                    onClick={() => setAiProductCount(count)}
                  >
                    {count}个
                  </button>
                ))}
              </div>
              <div className={styles.storeAiCountActions}>
                <button type="button" onClick={() => setIsAiProductCountDialogVisible(false)}>
                  取消
                </button>
                <button type="button" onClick={() => void handleGenerateAiProducts(aiProductCount)}>
                  开始生成
                </button>
              </div>
            </div>
          </div>
        ) : null}
        {isStoreDecorationEditing && isStoreDecorationPanelVisible ? (
          <div className={styles.storeDecorationConfigOverlay} aria-modal="true" role="dialog">
            <div className={styles.storeDecorationConfigPanel}>
              <header className={styles.storeDecorationConfigHeader}>
                <div>
                  <strong>背景装修</strong>
                  <p>点击背景进入这里，选择预设或上传背景图。</p>
                </div>
                <button
                  type="button"
                  className={styles.ghostPill}
                  onClick={() => setIsStoreDecorationPanelVisible(false)}
                >
                  关闭
                </button>
              </header>
              <div className={styles.storeDecorationConfigBody}>
                <div className={styles.storeDecorationPresetGrid}>
                  {decorationBackgroundPresets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      className={`${styles.storeDecorationPreset} ${
                        storeDecorationDraft?.backgroundKind === 'theme' &&
                        storeDecorationDraft.backgroundValue === preset.value
                          ? styles.storeDecorationPresetActive
                          : ''
                      }`}
                      style={{ backgroundImage: preset.value }}
                      onClick={() =>
                        setStoreDecorationDraft((prev) =>
                          prev
                            ? {
                                ...prev,
                                backgroundKind: 'theme',
                                backgroundValue: preset.value,
                              }
                            : prev
                        )
                      }
                    >
                      <span>{preset.label}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`${styles.storeDecorationPreset} ${styles.storeDecorationUploadButton} ${
                      storeDecorationDraft?.backgroundKind === 'cover' ? styles.storeDecorationPresetActive : ''
                    }`}
                    onClick={() => storeDecorationImageInputRef.current?.click()}
                  >
                    <span>{storeDecorationDraft?.backgroundKind === 'cover' ? '已上传背景' : '上传背景图'}</span>
                  </button>
                </div>
                <div className={styles.storeDecorationEditorTips}>
                  <span>提示：发布后购物模块会同步展示当前装修效果。</span>
                  <span>点击背景里的头像可更换图片，按住商品图右上角把手拖动即可调整排序。</span>
                </div>
              </div>
            </div>
          </div>
        ) : null}
        {isStoreDecorationPreviewVisible && activeStore ? (
          <div className={styles.storeDecorationPreviewOverlay} aria-modal="true" role="dialog">
            <div className={styles.storeDecorationPreviewPanel}>
              <header className={styles.storeDecorationPreviewHeader}>
                <div className={styles.storeDecorationPreviewHeaderLeft}>
                  {activeStore.kind === 'movie' && previewSelectedMovie ? (
                    <button
                      type="button"
                      className={styles.ghostPill}
                      onClick={() => setPreviewSelectedMovie(null)}
                    >
                      <ChevronLeft size={14} />
                      返回列表
                    </button>
                  ) : null}
                  <strong>
                    {activeStore.kind === 'movie' && previewSelectedMovie
                      ? storeMovieCheckoutLabels[7] || DEFAULT_STORE_MOVIE_CHECKOUT_LABELS[7]
                      : '店铺预览'}
                  </strong>
                </div>
                <button
                  type="button"
                  className={styles.ghostPill}
                  onClick={() => {
                    setPreviewSelectedMovie(null);
                    setIsStoreDecorationPreviewVisible(false);
                  }}
                >
                  关闭
                </button>
              </header>
              <div
                ref={activeStore.kind === 'movie' ? storeDecorationPreviewScrollRef : undefined}
                className={styles.storeDecorationPreviewBody}
              >
                {activeStore.kind === 'movie' ? (
                  previewSelectedMovie ? (
                    <ShoppingMovieCheckout
                      movie={previewSelectedMovie}
                      movieCinema={previewMovieCinema}
                      movieDate={previewMovieDate}
                      movieSession={previewMovieSession}
                      movieQty={previewMovieQty}
                      movieCheckoutLabels={storeMovieCheckoutLabels}
                      movieSessionOptions={storeMovieSessionOptions}
                      onCinemaChange={setPreviewMovieCinema}
                      onDateChange={setPreviewMovieDate}
                      onSessionChange={setPreviewMovieSession}
                      onQtyChange={(value) => setPreviewMovieQty(Math.min(6, Math.max(1, Math.floor(value || 1))))}
                      onPlaceOrder={noop}
                      onBackToMovies={() => setPreviewSelectedMovie(null)}
                    />
                  ) : (
                    <ShoppingMovies
                      query=""
                      movies={storeViewProducts.map(toMovie)}
                      scrollRef={storeDecorationPreviewScrollRef}
                      onQueryChange={noop}
                      storeSignboard={storeTitle}
                      storeTypeName={storeTypeLabel}
                      storeDescription={storeDescription}
                      storeLogo={draftStoreLogo}
                      storeCover={draftStoreCover}
                      storeTheme={draftStoreTheme}
                      movieTextLabels={storeDecorationDraft?.movieTextLabels}
                      disableVirtualization
                      onSelectMovie={(movie) => {
                        setPreviewSelectedMovie(movie);
                        setPreviewMovieCinema(
                          (storeMovieCheckoutLabels[8] || '').trim() || DEFAULT_STORE_MOVIE_CHECKOUT_LABELS[8]
                        );
                        setPreviewMovieDate(resolveMovieCheckoutDateDefault(storeMovieCheckoutLabels));
                        setPreviewMovieSession(
                          (storeMovieSessionOptions[0] || '').trim() || DEFAULT_STORE_MOVIE_SESSION_OPTIONS[0]
                        );
                        setPreviewMovieQty(resolveMovieCheckoutQtyDefault(storeMovieCheckoutLabels));
                      }}
                    />
                  )
                ) : (
                  <ShoppingProductList
                    kind={activeStore.kind === 'flower' ? 'flower' : 'dessert'}
                    storeName={activeStore.name}
                    storeTypeName={storeTypeLabel}
                    storeDescription={storeDescription}
                    storeSignboard={storeTitle}
                    storeDecoration={activeStore.decoration}
                    storeLogo={draftStoreLogo}
                    storeCover={draftStoreCover}
                    storeTheme={draftStoreTheme}
                    tabLabels={storeTabLabels}
                    filterLabels={storeFilterLabels}
                    heroRatingLabels={storeHeroRatingLabels}
                    heroTagLabels={storeHeroTagLabels}
                    products={storeViewProducts}
                    cart={[]}
                    cartTotal={0}
                    isFavorited={() => false}
                    onToggleFavorite={noop}
                    onAddToCart={noop}
                    onClearCart={noop}
                    onOpenCart={noop}
                    onCheckout={noop}
                  />
                )}
              </div>
            </div>
          </div>
        ) : null}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={skipDashboardEnterMotion ? false : APP_OPEN_MOTION.initial}
      animate={APP_OPEN_MOTION.animate}
      exit={APP_CLOSE_MOTION}
      transition={{ type: 'spring', damping: 21, stiffness: 210 }}
      className={styles.appRoot}
    >
      <header className={styles.header}>
        <button className={styles.iconButton} onClick={handleBackToStoreManagement} aria-label="返回">
          <ChevronLeft size={24} />
        </button>
        <button className={styles.iconButton} onClick={() => void refreshData()} aria-label="刷新">
          <RotateCw size={18} />
        </button>
      </header>

      <main className={styles.content}>
        <section className={styles.storeHeader}>
          <div className={styles.storeProfile}>
            <div className={styles.avatarWrap}>
              {activeStore?.logo ? (
                <img
                  src={activeStore.logo}
                  alt={activeStore.signboard || activeStore.name}
                  className={styles.avatarImage}
                />
              ) : (
                <UserRound size={22} strokeWidth={1.8} />
              )}
            </div>
            <div>
              <h1 className={styles.storeName}>{activeStore?.signboard || activeStore?.name || '我的店铺'}</h1>
              <p className={styles.storeMeta}>店铺分 暂无</p>
            </div>
          </div>
          <button className={styles.ghostPill} onClick={() => setPage('store-view')}>
            去店铺 <ChevronRight size={18} />
          </button>
        </section>

        <section className={styles.metricsPanel}>
          <div className={styles.timeTabs}>
            {periodOptions.map((option) => (
              <button
                key={option.id}
                className={`${styles.timeTab} ${summaryPeriod === option.id ? styles.timeTabActive : ''}`}
                onClick={() => setSummaryPeriod(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>

          {isExpanded
            ? expandedStats.map((row, rowIndex) => (
                <div
                  key={`row-${rowIndex}`}
                  className={`${styles.summaryGrid} ${row.length === 3 ? styles.summaryGridThree : ''}`}
                >
                  {row.map((item) => (
                    <article key={item.id} className={styles.summaryItem}>
                      <p className={styles.summaryLabel}>{item.label}</p>
                      <p className={styles.summaryValue}>{item.value}</p>
                    </article>
                  ))}
                </div>
              ))
            : (
              <div className={styles.summaryGrid}>
                {dashboardStats.map((item) => (
                  <article key={item.id} className={styles.summaryItem}>
                    <p className={styles.summaryLabel}>{item.label}</p>
                    <p className={styles.summaryValue}>{item.value}</p>
                  </article>
                ))}
              </div>
              )}
        </section>

        <button
          className={styles.expandButton}
          onClick={() => {
            if (!activeStore) return;
            setExpandedByStoreId((prev) => ({
              ...prev,
              [activeStore.id]: !(prev[activeStore.id] ?? false),
            }));
          }}
          aria-label={isExpanded ? '收起统计面板' : '展开统计面板'}
        >
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        <section className={styles.card}>
          <div className={styles.statusRow}>
            <p>
              已发货 <strong>{panelStats.shipped}</strong>
            </p>
            <p>
              待售后 <strong>{panelStats.afterSale}</strong>
            </p>
            <p>
              违规项 <strong>{panelStats.violation}</strong>
            </p>
          </div>
          <div className={styles.notice}>
            <span className={styles.noticeTag}>重要</span>
            <p>保证金不足限制货款提现，请及时充值</p>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.toolsGrid}>
            {quickTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.id}
                  className={styles.toolButton}
                  onClick={tool.id === 'publish' ? openPublishPage : noop}
                >
                  <Icon size={27} strokeWidth={1.8} />
                  <span>{tool.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className={`${styles.card} ${styles.bannerCard}`}>
          <div className={styles.bannerText}>
            <strong>百万免佣激励</strong>
            <p>政策期可享佣金减免，无需报名即可参加</p>
          </div>
          <ChevronRight size={20} />
        </section>

        <section className={styles.card}>
          <div className={styles.actionList}>
            {actionCards.map((item) => (
              <article key={item.id} className={styles.actionItem}>
                <div className={styles.actionThumb}>
                  {item.id === 'product' ? <Package size={24} /> : <ScrollText size={24} />}
                </div>
                <div className={styles.actionBody}>
                  <h2>{item.title}</h2>
                  <p>{item.desc}</p>
                </div>
                <button className={styles.actionButton} onClick={item.id === 'product' ? openPublishPage : noop}>
                  {item.buttonText}
                </button>
              </article>
            ))}
          </div>
        </section>

        {(isLoading || error) && (
          <section className={styles.statusCard}>
            {isLoading ? <p>数据加载中...</p> : null}
            {error ? (
              <p>
                <CircleHelp size={14} />
                {error}
              </p>
            ) : null}
          </section>
        )}
      </main>

      <footer className={styles.footer}>
        <button className={styles.primaryButton} onClick={startStoreDecorationEditing}>
          装饰我的店铺
        </button>
      </footer>
    </motion.div>
  );
};

