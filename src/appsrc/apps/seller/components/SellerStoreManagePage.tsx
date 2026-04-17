import React from 'react';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  CircleHelp,
  FileText,
  GripVertical,
  Home,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Smile,
  UserRound,
} from 'lucide-react';
import type { CommerceStore, Order, ProductItem } from '../../../shared/business/commerce/domain/types';
import { resolveOrderStoreId } from '../../../shared/business/commerce/domain/utils';
import {
  createStoreDraft,
  deleteCommerceStoreWithRecycle,
  readDessertProductsFromStorage,
  readFlowerProductsFromStorage,
  saveCommerceStores,
  topUpSellerFinance,
} from '../../../shared/business/commerce/domain/store';
import {
  resolveShoppingHomeStoreTypeTabs,
} from '../../../shared/business/commerce/domain/storeTypeTabs';
import { fallbackStoreMeta } from '../utils';
import {
  appendSellerInboxChatMessage,
  clearSellerInboxMessages,
  deleteSellerInboxMessagesBySenderName,
  markSellerInboxMessagesReadBySenderName,
  readSellerInboxMessages,
  SELLER_MESSAGE_UPDATED_EVENT,
  type SellerInboxMessage,
} from '../../../shared/business/commerce/messageBridge';
import { getGlobalSettingsSnapshot } from '@baobaobaiOS/sdk';
import styles from '../SellerApp.module.css';

type SellerStoreManagePageProps = {
  stores: CommerceStore[];
  orders: Order[];
  assetBalance: number;
  onAssetBalanceChange: (balance: number) => void;
  onClose: () => void;
  onEnterDashboard: (storeId: string) => void;
  onStoresChange: (stores: CommerceStore[]) => void;
};

type DropPosition = 'before' | 'after';

type StoreRevenue = {
  id: string;
  name: string;
  revenue: number;
  visible: boolean;
};

type CreateStoreForm = {
  templateKind: 'dessert' | 'movie';
  shopName: string;
  storeType: string;
  shopLogo: string;
  ownerName: string;
  phone: string;
  verifyCode: string;
  businessAddress: string;
};

type CreateStoreErrors = Partial<Record<keyof CreateStoreForm, string>>;

type FinanceExpenseItem = {
  id: string;
  label: string;
  amount: number;
  color: string;
};

const STORE_OPEN_COST = 200000;
const STORE_DAILY_PLATFORM_FEE = 10;
const STORE_DELETE_DEPRECIATION_DAILY = 50;
const PRODUCT_COST_RATIO = 0.6;
const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_CHAT_BASE_URL = 'https://api.openai.com/v1';
const SYSTEM_SENDER_NAMES = new Set(['system', 'System', '系统']);

const EMPTY_CREATE_STORE_FORM: CreateStoreForm = {
  templateKind: 'dessert',
  shopName: '',
  storeType: '',
  shopLogo: '',
  ownerName: '',
  phone: '',
  verifyCode: '',
  businessAddress: '',
};

const CREATE_NOTICE_LINES = [
  '划重点：开店前必看小须知！',
  '1. 本次开店将产生一次性费用 200000 元，费用将在开店流程中一次性扣除。',
  '2. 店铺展示后将产生每日平台费 10 元，按天持续计费。',
  '3. 删除店铺时会按 50 元/天折损，从返还金额中扣除。',
  '以上内容已了解，确认开启店铺吗？',
];

const STORE_TEMPLATE_OPTIONS: Array<{
  kind: 'dessert' | 'movie';
  label: string;
  title: string;
  desc: string;
}> = [
  {
    kind: 'dessert',
    label: '模板1',
    title: '购物类场景',
    desc: '适合购物类场景，支持商品上架和店铺装修。',
  },
  {
    kind: 'movie',
    label: '模板2',
    title: '出票类场景',
    desc: '适合票务类店铺，使用票务展示样式。',
  },
];

const formatMoney = (value: number) =>
  new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const formatReportMoney = (value: number) => {
  if (Math.abs(value) >= 10000) return `￥${(value / 10000).toFixed(1)}万`;
  return formatMoney(value);
};

const formatChatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  const hh = `${date.getHours()}`.padStart(2, '0');
  const mm = `${date.getMinutes()}`.padStart(2, '0');
  return `${hh}:${mm}`;
};

const formatRelativeTime = (timestamp: number) => {
  const delta = Date.now() - timestamp;
  if (delta < 60 * 1000) return '刚刚';
  if (delta < 60 * 60 * 1000) {
    return `${Math.max(1, Math.floor(delta / (60 * 1000)))}分钟前`;
  }
  return formatChatTime(timestamp);
};

const isSystemInboxMessage = (message: SellerInboxMessage) =>
  SYSTEM_SENDER_NAMES.has(message.senderName.trim());

const getOpenDays = (createdAt: number) => Math.max(1, Math.floor((Date.now() - createdAt) / DAY_MS) + 1);

const getProductQuantity = (product: ProductItem): number => {
  const raw = (product as ProductItem & { quantity?: unknown; stock?: unknown; count?: unknown }).quantity
    ?? (product as ProductItem & { stock?: unknown }).stock
    ?? (product as ProductItem & { count?: unknown }).count;
  const qty = Number(raw);
  return Number.isFinite(qty) && qty > 0 ? Math.floor(qty) : 1;
};

const reorderStoresByPosition = (
  source: CommerceStore[],
  sourceId: string,
  targetId: string,
  position: DropPosition
) => {
  if (sourceId === targetId) return source;
  const fromIndex = source.findIndex((item) => item.id === sourceId);
  const targetIndex = source.findIndex((item) => item.id === targetId);
  if (fromIndex < 0 || targetIndex < 0) return source;
  const next = [...source];
  const [moved] = next.splice(fromIndex, 1);
  if (!moved) return source;
  let insertIndex = position === 'before' ? targetIndex : targetIndex + 1;
  if (fromIndex < targetIndex) insertIndex -= 1;
  next.splice(insertIndex, 0, moved);
  return next;
};

export const SellerStoreManagePage: React.FC<SellerStoreManagePageProps> = ({
  stores,
  orders,
  assetBalance,
  onAssetBalanceChange,
  onClose,
  onEnterDashboard,
  onStoresChange,
}) => {
  const [isCreatePanelVisible, setIsCreatePanelVisible] = React.useState(false);
  const [isCreateNoticeVisible, setIsCreateNoticeVisible] = React.useState(false);
  const [isCreateFormVisible, setIsCreateFormVisible] = React.useState(false);
  const [isFinanceReportVisible, setIsFinanceReportVisible] = React.useState(false);
  const [createStoreForm, setCreateStoreForm] = React.useState<CreateStoreForm>(EMPTY_CREATE_STORE_FORM);
  const [createStoreErrors, setCreateStoreErrors] = React.useState<CreateStoreErrors>({});
  const [isSubmittingCreate, setIsSubmittingCreate] = React.useState(false);
  const [updatingStoreId, setUpdatingStoreId] = React.useState<string | null>(null);
  const [draggingStoreId, setDraggingStoreId] = React.useState<string | null>(null);
  const [dropTarget, setDropTarget] = React.useState<{ id: string; position: DropPosition } | null>(null);
  const [pendingDeleteStoreId, setPendingDeleteStoreId] = React.useState<string | null>(null);
  const [storeSearchKeyword, setStoreSearchKeyword] = React.useState('');
  const [storePage, setStorePage] = React.useState(1);
  const [verifyToastCode, setVerifyToastCode] = React.useState<string | null>(null);
  const [sentVerifyCode, setSentVerifyCode] = React.useState<string | null>(null);
  const [sentVerifyPhone, setSentVerifyPhone] = React.useState<string>('');
  const [verifyCodeCountdown, setVerifyCodeCountdown] = React.useState(0);
  const [reportPurchaseExpense, setReportPurchaseExpense] = React.useState(0);
  const [isRechargeVisible, setIsRechargeVisible] = React.useState(false);
  const [rechargeAmount, setRechargeAmount] = React.useState('');
  const [rechargeError, setRechargeError] = React.useState('');
  const [isSubmittingRecharge, setIsSubmittingRecharge] = React.useState(false);
  const [messageView, setMessageView] = React.useState<'none' | 'list' | 'chat'>('none');
  const [messageTopTab, setMessageTopTab] = React.useState<'reception' | 'notice'>('reception');
  const [inboxMessages, setInboxMessages] = React.useState<SellerInboxMessage[]>([]);
  const [hasUnreadMessage, setHasUnreadMessage] = React.useState(false);
  const [noticeModalMessage, setNoticeModalMessage] = React.useState<SellerInboxMessage | null>(null);
  const [activeChatSender, setActiveChatSender] = React.useState<string>('');
  const [chatInput, setChatInput] = React.useState('');
  const [isAutoReplying, setIsAutoReplying] = React.useState(false);
  const [previewTemplateKind, setPreviewTemplateKind] = React.useState<'dessert' | 'movie' | null>(null);
  const pointerIdRef = React.useRef<number | null>(null);
  const rechargeOpenedAtRef = React.useRef(0);
  const verifyToastTimeoutRef = React.useRef<number | null>(null);
  const verifyCountdownIntervalRef = React.useRef<number | null>(null);

  const openRechargeDialog = React.useCallback(() => {
    rechargeOpenedAtRef.current = Date.now();
    setRechargeAmount('');
    setRechargeError('');
    setIsRechargeVisible(true);
  }, []);

  const closeRechargeDialog = React.useCallback(() => {
    if (isSubmittingRecharge) return;
    setIsRechargeVisible(false);
    setRechargeError('');
    setRechargeAmount('');
  }, [isSubmittingRecharge]);

  const list = React.useMemo<StoreRevenue[]>(() => {
    const revenueMap = new Map<string, number>();
    stores.forEach((store) => revenueMap.set(store.id, 0));
    orders.forEach((order) => {
      const storeId = resolveOrderStoreId(order);
      if (!storeId || !revenueMap.has(storeId)) return;
      revenueMap.set(storeId, (revenueMap.get(storeId) || 0) + order.total);
    });
    return stores.map((store, idx) => ({
      id: store.id,
      name: store.signboard || store.name || `店铺${idx + 1}`,
      revenue: revenueMap.get(store.id) || 0,
      visible: store.visible,
    }));
  }, [orders, stores]);

  const createStoreTypeOptions = React.useMemo(
    () => resolveShoppingHomeStoreTypeTabs(stores),
    [stores]
  );

  React.useEffect(() => {
    let canceled = false;
    const loadPurchaseExpense = async () => {
      const [dessertProducts, flowerProducts] = await Promise.all([
        readDessertProductsFromStorage(),
        readFlowerProductsFromStorage(),
      ]);
      if (canceled) return;
      const total = [...dessertProducts, ...flowerProducts].reduce((sum, product) => {
        const price = Number(product.price);
        if (!Number.isFinite(price) || price <= 0) return sum;
        return sum + price * getProductQuantity(product) * PRODUCT_COST_RATIO;
      }, 0);
      setReportPurchaseExpense(Number(total.toFixed(2)));
    };
    void loadPurchaseExpense();
    return () => {
      canceled = true;
    };
  }, [stores]);

  const filteredList = React.useMemo(() => {
    const keyword = storeSearchKeyword.trim().toLowerCase();
    if (!keyword) return list;
    return list.filter((item) => item.name.toLowerCase().includes(keyword));
  }, [list, storeSearchKeyword]);

  const STORE_PAGE_SIZE = 7;
  const totalStorePages = Math.max(1, Math.ceil(filteredList.length / STORE_PAGE_SIZE));
  const pagedStoreList = React.useMemo(() => {
    const start = (storePage - 1) * STORE_PAGE_SIZE;
    return filteredList.slice(start, start + STORE_PAGE_SIZE);
  }, [filteredList, storePage]);
  const pagedStartIndex = (storePage - 1) * STORE_PAGE_SIZE;

  const reportRevenue = React.useMemo(() => list.reduce((sum, item) => sum + item.revenue, 0), [list]);
  const reportOpenExpense = React.useMemo(() => stores.length * STORE_OPEN_COST, [stores.length]);
  const reportPlatformExpense = React.useMemo(
    () => stores.reduce((sum, store) => sum + getOpenDays(store.createdAt) * STORE_DAILY_PLATFORM_FEE, 0),
    [stores]
  );
  const reportDecorationExpense = React.useMemo(() => stores.length * 500, [stores.length]);
  const reportTotalExpense = reportOpenExpense + reportPlatformExpense + reportDecorationExpense + reportPurchaseExpense;
  const reportProfit = reportRevenue - reportTotalExpense;

  const reportExpenseItems = React.useMemo<FinanceExpenseItem[]>(
    () => [
      { id: 'open', label: '开店成本（一次性）', amount: reportOpenExpense, color: '#FF8A5B' },
      { id: 'platform', label: '平台费用（10元/天）', amount: reportPlatformExpense, color: '#4E8CFF' },
      { id: 'decoration', label: '装修装饰支出', amount: reportDecorationExpense, color: '#FF5FA3' },
    ],
    [reportDecorationExpense, reportOpenExpense, reportPlatformExpense]
  );

  const reportExpenseItemsWithPurchase = React.useMemo<FinanceExpenseItem[]>(
    () => [
      ...reportExpenseItems,
      { id: 'purchase', label: '进货成本', amount: reportPurchaseExpense, color: '#20B486' },
    ],
    [reportExpenseItems, reportPurchaseExpense]
  );

  const reportDonutGradient = React.useMemo(() => {
    if (reportTotalExpense <= 0) return 'conic-gradient(#e6e9ef 0deg 360deg)';
    let current = 0;
    const stops = reportExpenseItemsWithPurchase.map((item) => {
      const ratio = item.amount / reportTotalExpense;
      const start = current;
      const end = current + ratio * 360;
      current = end;
      return `${item.color} ${start}deg ${end}deg`;
    });
    return `conic-gradient(${stops.join(',')})`;
  }, [reportExpenseItemsWithPurchase, reportTotalExpense]);

  const financeTrend = React.useMemo(() => {
    const DAY = 24 * 60 * 60 * 1000;
    const days = 7;
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    const dayStarts = Array.from({ length: days }, (_, idx) => end.getTime() - (days - 1 - idx) * DAY);
    const labels = dayStarts.map((ts) => {
      const d = new Date(ts);
      const mm = `${d.getMonth() + 1}`.padStart(2, '0');
      const dd = `${d.getDate()}`.padStart(2, '0');
      return `${mm}-${dd}`;
    });

    const income = Array.from({ length: days }, () => 0);
    const expense = Array.from({ length: days }, () => 0);
    const startTs = dayStarts[0] || end.getTime();

    const toIndex = (timestamp: number) => {
      const date = new Date(timestamp);
      date.setHours(0, 0, 0, 0);
      const idx = Math.floor((date.getTime() - startTs) / DAY);
      if (idx < 0 || idx >= days) return -1;
      return idx;
    };

    orders.forEach((order) => {
      const idx = toIndex(order.createdAt);
      if (idx < 0) return;
      income[idx] += order.total;
    });

    stores.forEach((store) => {
      const createdAt = Number.isFinite(store.createdAt) ? store.createdAt : Date.now();
      const createdDay = new Date(createdAt);
      createdDay.setHours(0, 0, 0, 0);
      const createdTs = createdDay.getTime();

      const openIdx = toIndex(createdTs);
      if (openIdx >= 0) {
        expense[openIdx] += STORE_OPEN_COST + 500;
      }

      dayStarts.forEach((dayTs, idx) => {
        if (dayTs >= createdTs) expense[idx] += STORE_DAILY_PLATFORM_FEE;
      });
    });

    const maxValue = Math.max(1, ...income, ...expense);
    const chartWidth = 320;
    const chartHeight = 120;
    const toPoints = (series: number[]) =>
      series
        .map((value, idx) => {
          const x = (idx / (days - 1)) * chartWidth;
          const y = chartHeight - (value / maxValue) * (chartHeight - 10) - 5;
          return `${x.toFixed(2)},${y.toFixed(2)}`;
        })
        .join(' ');

    return {
      labels,
      income,
      expense,
      incomePoints: toPoints(income),
      expensePoints: toPoints(expense),
    };
  }, [orders, stores]);

  const resolveDropTarget = React.useCallback(
    (clientX: number, clientY: number) => {
      if (!draggingStoreId) return;
      const hit = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
      const row = hit?.closest('[data-store-row-id]') as HTMLElement | null;
      if (!row) {
        setDropTarget(null);
        return;
      }
      const rowId = row.dataset.storeRowId;
      if (!rowId || rowId === draggingStoreId) {
        setDropTarget(null);
        return;
      }
      const rect = row.getBoundingClientRect();
      setDropTarget({ id: rowId, position: clientY < rect.top + rect.height / 2 ? 'before' : 'after' });
    },
    [draggingStoreId]
  );

  const commitDrag = React.useCallback(async () => {
    if (!draggingStoreId || !dropTarget) {
      setDraggingStoreId(null);
      setDropTarget(null);
      return;
    }
    const reordered = reorderStoresByPosition(stores, draggingStoreId, dropTarget.id, dropTarget.position);
    if (reordered !== stores) {
      const saved = await saveCommerceStores(reordered, { orders });
      onStoresChange(saved);
    }
    setDraggingStoreId(null);
    setDropTarget(null);
  }, [draggingStoreId, dropTarget, onStoresChange, orders, stores]);

  React.useEffect(() => {
    if (!draggingStoreId) return;
    const prev = document.body.style.userSelect;
    document.body.style.userSelect = 'none';
    const onMove = (event: PointerEvent) => {
      if (pointerIdRef.current != null && event.pointerId !== pointerIdRef.current) return;
      event.preventDefault();
      resolveDropTarget(event.clientX, event.clientY);
    };
    const onUp = (event: PointerEvent) => {
      if (pointerIdRef.current != null && event.pointerId !== pointerIdRef.current) return;
      void commitDrag();
      pointerIdRef.current = null;
    };
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      document.body.style.userSelect = prev;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [commitDrag, draggingStoreId, resolveDropTarget]);

  React.useEffect(
    () => () => {
      if (verifyToastTimeoutRef.current != null) window.clearTimeout(verifyToastTimeoutRef.current);
      if (verifyCountdownIntervalRef.current != null) window.clearInterval(verifyCountdownIntervalRef.current);
    },
    []
  );

  React.useEffect(() => {
    if (verifyCodeCountdown <= 0) {
      if (verifyCountdownIntervalRef.current != null) {
        window.clearInterval(verifyCountdownIntervalRef.current);
        verifyCountdownIntervalRef.current = null;
      }
      return;
    }
    if (verifyCountdownIntervalRef.current != null) window.clearInterval(verifyCountdownIntervalRef.current);
    verifyCountdownIntervalRef.current = window.setInterval(() => {
      setVerifyCodeCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => {
      if (verifyCountdownIntervalRef.current != null) {
        window.clearInterval(verifyCountdownIntervalRef.current);
        verifyCountdownIntervalRef.current = null;
      }
    };
  }, [verifyCodeCountdown]);

  React.useEffect(() => {
    setStorePage(1);
  }, [storeSearchKeyword]);

  React.useEffect(() => {
    setStorePage((prev) => Math.min(prev, totalStorePages));
  }, [totalStorePages]);

  const pendingDeleteDepreciation = React.useMemo(() => {
    if (!pendingDeleteStoreId) return 0;
    const target = stores.find((store) => store.id === pendingDeleteStoreId);
    if (!target) return 0;
    return getOpenDays(target.createdAt) * STORE_DELETE_DEPRECIATION_DAILY;
  }, [pendingDeleteStoreId, stores]);

  const deleteNoticeText = React.useMemo(
    () =>
      `一旦删除将无法恢复，确认删除吗？（折损费用 ${pendingDeleteDepreciation.toFixed(
        2
      )} 元，剩余开店费用将退回您的账户）`,
    [pendingDeleteDepreciation]
  );

  const validateCreateForm = React.useCallback((form: CreateStoreForm): CreateStoreErrors => {
    const errors: CreateStoreErrors = {};
    const phone = form.phone.trim();
    const verifyCode = form.verifyCode.trim();
    if (!form.shopName.trim()) errors.shopName = '请填写店铺名称';
    if (!form.storeType.trim()) errors.storeType = '请选择店铺类型';
    if (!form.shopLogo.trim()) errors.shopLogo = '请上传店铺 Logo';
    if (!form.ownerName.trim()) errors.ownerName = '请填写经营者姓名';
    if (!phone) errors.phone = '请填写手机号';
    else if (!/^1\d{10}$/.test(phone)) errors.phone = '请输入正确的手机号码';
    if (!verifyCode) errors.verifyCode = '请输入短信验证码';
    else if (!/^\d{6}$/.test(verifyCode)) errors.verifyCode = '请输入 6 位短信验证码';
    else if (!sentVerifyCode || !sentVerifyPhone) errors.verifyCode = '请先获取短信验证码';
    else if (phone !== sentVerifyPhone) errors.verifyCode = '手机号已变更，请重新获取验证码';
    else if (verifyCode !== sentVerifyCode) errors.verifyCode = '短信验证码不正确';
    if (!form.businessAddress.trim()) errors.businessAddress = '请填写经营地址';
    return errors;
  }, [sentVerifyCode, sentVerifyPhone]);

  const handleStoreLogoUpload = React.useCallback(async (file?: File) => {
    if (!file) return;
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('读取文件失败'));
      reader.readAsDataURL(file);
    });
    setCreateStoreForm((prev) => ({ ...prev, shopLogo: dataUrl }));
    setCreateStoreErrors((prev) => ({ ...prev, shopLogo: undefined }));
  }, []);

  const handleSelectStoreTemplate = React.useCallback((kind: 'dessert' | 'movie') => {
    setCreateStoreForm((prev) => ({
      ...prev,
      templateKind: kind,
    }));
  }, []);

  const previewTemplateMeta = React.useMemo(() => {
    if (!previewTemplateKind) return null;
    return fallbackStoreMeta[previewTemplateKind];
  }, [previewTemplateKind]);

  const handleSendVerifyCode = React.useCallback(() => {
    if (verifyCodeCountdown > 0) return;
    const phone = createStoreForm.phone.trim();
    if (!phone) {
      setCreateStoreErrors((prev) => ({ ...prev, phone: '请先填写手机号' }));
      return;
    }
    if (!/^1\d{10}$/.test(phone)) {
      setCreateStoreErrors((prev) => ({ ...prev, phone: '请输入正确的手机号码' }));
      return;
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setVerifyToastCode(code);
    setSentVerifyCode(code);
    setSentVerifyPhone(phone);
    setCreateStoreErrors((prev) => ({ ...prev, phone: undefined, verifyCode: undefined }));
    setVerifyCodeCountdown(60);
    if (verifyToastTimeoutRef.current != null) window.clearTimeout(verifyToastTimeoutRef.current);
    verifyToastTimeoutRef.current = window.setTimeout(() => {
      setVerifyToastCode(null);
      verifyToastTimeoutRef.current = null;
    }, 30000);
  }, [createStoreForm.phone, verifyCodeCountdown]);

  const resetVerifyState = React.useCallback(() => {
    setVerifyToastCode(null);
    setSentVerifyCode(null);
    setSentVerifyPhone('');
    setVerifyCodeCountdown(0);
    if (verifyToastTimeoutRef.current != null) {
      window.clearTimeout(verifyToastTimeoutRef.current);
      verifyToastTimeoutRef.current = null;
    }
    if (verifyCountdownIntervalRef.current != null) {
      window.clearInterval(verifyCountdownIntervalRef.current);
      verifyCountdownIntervalRef.current = null;
    }
  }, []);

  const handleSubmitCreateStore = React.useCallback(async () => {
    if (assetBalance < STORE_OPEN_COST) {
      if (typeof window !== 'undefined') {
        window.alert(`我的资产不足，开新店至少需要 ${formatMoney(STORE_OPEN_COST)}，请先充值。`);
      }
      setIsCreateFormVisible(false);
      openRechargeDialog();
      return;
    }
    const errors = validateCreateForm(createStoreForm);
    setCreateStoreErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setIsSubmittingCreate(true);
    try {
      const now = Date.now();
      const templateKind = createStoreForm.templateKind;
      const draft = createStoreDraft(stores, templateKind);
      const storeType = createStoreForm.storeType.trim();
      const newStore: CommerceStore = {
        id: `store-${now.toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        code: draft.code,
        kind: draft.kind,
        categoryLabel: storeType,
        typeName: storeType,
        name: createStoreForm.shopName.trim(),
        slogan: draft.slogan,
        theme: draft.theme,
        logo: createStoreForm.shopLogo.trim(),
        cover: draft.cover,
        signboard: createStoreForm.shopName.trim(),
        decoration: draft.decoration,
        visible: true,
        createdAt: now,
        updatedAt: now,
      };
      const saved = await saveCommerceStores([...stores, newStore], { orders });
      onStoresChange(saved);
      setIsCreateFormVisible(false);
      setCreateStoreForm(EMPTY_CREATE_STORE_FORM);
      setCreateStoreErrors({});
      resetVerifyState();
      if (typeof window !== 'undefined') window.alert('新店铺创建成功');
    } finally {
      setIsSubmittingCreate(false);
    }
  }, [
    assetBalance,
    createStoreForm,
    openRechargeDialog,
    onStoresChange,
    orders,
    resetVerifyState,
    stores,
    validateCreateForm,
  ]);

  const handleConfirmRecharge = React.useCallback(async () => {
    const amount = Number(rechargeAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setRechargeError('请输入正确的充值金额');
      return;
    }
    const normalizedAmount = Number(amount.toFixed(2));
    setIsSubmittingRecharge(true);
    try {
      const finance = await topUpSellerFinance(normalizedAmount);
      onAssetBalanceChange(finance.assetBalance);
      setRechargeAmount('');
      setRechargeError('');
      setIsRechargeVisible(false);
      if (typeof window !== 'undefined') window.alert(`充值成功，当前资产 ${formatMoney(finance.assetBalance)}`);
    } finally {
      setIsSubmittingRecharge(false);
    }
  }, [onAssetBalanceChange, rechargeAmount]);

  React.useEffect(() => {
    const syncInbox = async () => {
      const next = await readSellerInboxMessages();
      setInboxMessages(next);
      setHasUnreadMessage(next.some((item) => item.status === 'unread'));
    };
    void syncInbox();
    if (typeof window === 'undefined') return;
    const onSellerMessageUpdated: EventListener = () => {
      void syncInbox();
    };
    window.addEventListener(SELLER_MESSAGE_UPDATED_EVENT, onSellerMessageUpdated);
    return () => {
      window.removeEventListener(SELLER_MESSAGE_UPDATED_EVENT, onSellerMessageUpdated);
    };
  }, []);

  const systemSenderNames = React.useMemo(
    () =>
      Array.from(new Set(inboxMessages.filter((item) => isSystemInboxMessage(item)).map((item) => item.senderName))),
    [inboxMessages]
  );
  const receptionMessages = React.useMemo(
    () => inboxMessages.filter((item) => !isSystemInboxMessage(item)),
    [inboxMessages]
  );
  const noticeMessages = React.useMemo(
    () => inboxMessages.filter((item) => isSystemInboxMessage(item)),
    [inboxMessages]
  );
  const latestNoticeMessage = React.useMemo(() => noticeMessages[0] || null, [noticeMessages]);

  const unreadCount = React.useMemo(() => inboxMessages.filter((item) => item.status === 'unread').length, [inboxMessages]);
  const receptionUnreadCount = React.useMemo(
    () => receptionMessages.filter((item) => item.status === 'unread').length,
    [receptionMessages]
  );
  const noticeUnreadCount = React.useMemo(
    () => noticeMessages.filter((item) => item.status === 'unread').length,
    [noticeMessages]
  );
  const todayReceptionCount = React.useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const startAt = start.getTime();
    return new Set(receptionMessages.filter((item) => item.createdAt >= startAt).map((item) => item.senderName)).size;
  }, [receptionMessages]);

  const conversationSummaries = React.useMemo(() => {
    const grouped = new Map<string, { latest: SellerInboxMessage; unreadCount: number }>();
    receptionMessages.forEach((message) => {
      const hit = grouped.get(message.senderName);
      if (!hit) {
        grouped.set(message.senderName, {
          latest: message,
          unreadCount: message.status === 'unread' ? 1 : 0,
        });
        return;
      }
      if (message.createdAt > hit.latest.createdAt) hit.latest = message;
      if (message.status === 'unread') hit.unreadCount += 1;
    });
    return Array.from(grouped.entries())
      .map(([senderName, value]) => ({ senderName, ...value }))
      .sort((a, b) => b.latest.createdAt - a.latest.createdAt);
  }, [receptionMessages]);

  const resolvedActiveChatSender = activeChatSender || conversationSummaries[0]?.senderName || '';
  const activeInboxMessages = React.useMemo(
    () =>
      receptionMessages
        .filter((item) => item.senderName === resolvedActiveChatSender)
        .sort((a, b) => a.createdAt - b.createdAt),
    [receptionMessages, resolvedActiveChatSender]
  );

  const chatThreadMessages = React.useMemo(() => {
    const persisted = activeInboxMessages.map((item) => ({
      id: item.id,
      sender: item.sender === 'seller' ? ('seller' as const) : ('buyer' as const),
      content: item.content,
      time: formatChatTime(item.createdAt),
      createdAt: item.createdAt,
      peerName: item.senderName,
    }));
    return persisted.sort((a, b) => a.createdAt - b.createdAt);
  }, [activeInboxMessages]);

  React.useEffect(() => {
    if (activeChatSender && conversationSummaries.some((item) => item.senderName === activeChatSender)) return;
    setActiveChatSender(conversationSummaries[0]?.senderName || '');
  }, [activeChatSender, conversationSummaries]);

  const syncInboxSnapshot = React.useCallback(async () => {
    const next = await readSellerInboxMessages();
    setInboxMessages(next);
    setHasUnreadMessage(next.some((item) => item.status === 'unread'));
  }, []);

  const handleSwitchMessageTopTab = React.useCallback(
    (tab: 'reception' | 'notice') => {
      setMessageTopTab(tab);
      if (tab !== 'notice' || systemSenderNames.length === 0) return;
      void (async () => {
        for (const sender of systemSenderNames) {
          // eslint-disable-next-line no-await-in-loop
          await markSellerInboxMessagesReadBySenderName(sender);
        }
        await syncInboxSnapshot();
      })();
    },
    [syncInboxSnapshot, systemSenderNames]
  );

  const handleOpenChat = React.useCallback((senderName: string) => {
    setActiveChatSender(senderName);
    void (async () => {
      await markSellerInboxMessagesReadBySenderName(senderName);
      await syncInboxSnapshot();
    })();
    setMessageView('chat');
  }, [syncInboxSnapshot]);

  const handleDeleteLatestMessage = React.useCallback(async () => {
    if (!resolvedActiveChatSender) return;
    if (typeof window !== 'undefined' && !window.confirm(`确认删除与 ${resolvedActiveChatSender} 的会话吗？`)) return;
    await deleteSellerInboxMessagesBySenderName(resolvedActiveChatSender);
    await syncInboxSnapshot();
  }, [resolvedActiveChatSender, syncInboxSnapshot]);

  const handleClearAllMessages = React.useCallback(async () => {
    if (typeof window !== 'undefined' && !window.confirm('确认清空消息列表吗？')) return;
    await clearSellerInboxMessages();
    await syncInboxSnapshot();
    setActiveChatSender('');
  }, [syncInboxSnapshot]);

  const requestBuyerReply = React.useCallback(async (payload: {
    sellerMessage: string;
    recentConversation: string[];
  }): Promise<string | null> => {
    const settings = getGlobalSettingsSnapshot();
    const apiKey = settings.apiKey?.trim() || '';
    if (!apiKey) return null;

    const baseUrl = (settings.baseUrl || DEFAULT_CHAT_BASE_URL).trim();
    const model = settings.model?.trim() || 'gpt-4o-mini';
    const recentConversation = payload.recentConversation.slice(-12).join('\n');
    const sellerMessage = payload.sellerMessage.trim();
    if (!sellerMessage) return null;

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: settings.temperature ?? 0.6,
        max_tokens: Math.min(320, Math.max(120, settings.maxTokens || 220)),
        messages: [
          {
            role: 'system',
            content: 'You are a buyer in a shopping platform chat. Reply naturally and avoid repeated questions. If context contains order id, product name, or amount, mention them explicitly and avoid ambiguous pronouns like this/that/it. Keep within 80 Chinese characters.',
          },
          {
            role: 'user',
            content: `Recent conversation:\n${recentConversation}\n\nLatest seller message: ${sellerMessage}\n\nReply as the buyer with clear and unambiguous wording.`, 
          },        ],
      }),
    }).catch(() => null);
    if (!response || !response.ok) return null;
    const data = await response.json().catch(() => null);
    const content = data?.choices?.[0]?.message?.content;
    return typeof content === 'string' ? content.trim() : null;
  }, []);

  const handleSendChatMessage = React.useCallback(async () => {
    const content = chatInput.trim();
    if (!content || !resolvedActiveChatSender || isAutoReplying) return;
    const now = Date.now();
    const nextSellerMessage = {
      id: `seller-${now.toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      sender: 'seller',
      content,
      time: formatChatTime(now),
      createdAt: now,
      peerName: resolvedActiveChatSender,
    };
    await appendSellerInboxChatMessage({
      senderName: resolvedActiveChatSender,
      sender: 'seller',
      content,
      status: 'read',
    });
    await syncInboxSnapshot();
    setChatInput('');
    setIsAutoReplying(true);
    try {
      const recentConversation = [...chatThreadMessages, nextSellerMessage].map((item) => {
        const role = item.sender === 'seller' ? '卖家' : '买家';
        return `${role}: ${item.content}`;
      });
      const aiReply =
        (await requestBuyerReply({
          sellerMessage: content,
          recentConversation,
        })) || '收到，麻烦再详细说一下商品情况，我这边确认后下单。';
      await appendSellerInboxChatMessage({
        senderName: resolvedActiveChatSender,
        sender: 'buyer',
        content: aiReply,
        status: 'read',
      });
      await syncInboxSnapshot();
    } finally {
      setIsAutoReplying(false);
    }
  }, [chatInput, chatThreadMessages, isAutoReplying, requestBuyerReply, resolvedActiveChatSender, syncInboxSnapshot]);

  if (messageView === 'list') {
    return (
      <div className={`${styles.storeManageRoot} ${styles.storeMessageFont16}`}>
        <header className={styles.storeMessageHeader}>
          <div className={styles.storeMessageTopTabs}>
            <button
              type="button"
              className={`${styles.storeMessageTopTab} ${messageTopTab === 'reception' ? styles.storeMessageTopTabActive : ''}`}
              onClick={() => handleSwitchMessageTopTab('reception')}
            >
              {'客服接待'}
              {receptionUnreadCount > 0 ? <span className={styles.storeMessageTopBadge}>{receptionUnreadCount}</span> : null}
            </button>
            <button
              type="button"
              className={`${styles.storeMessageTopTab} ${messageTopTab === 'notice' ? styles.storeMessageTopTabActive : ''}`}
              onClick={() => handleSwitchMessageTopTab('notice')}
            >
              {'通知'}
              {noticeUnreadCount > 0 ? <span className={styles.storeMessageTopBadge}>{noticeUnreadCount}</span> : null}
            </button>
          </div>
        </header>
        <main className={styles.storeMessageContent}>
          {messageTopTab === 'reception' ? (
            <>
              <section className={styles.storeMessagePanel}>
                <div className={styles.storeMessageStatusRow}>
                  <div className={styles.storeMessageStatusOnline}>
                    <CheckCircle2 size={16} />
                    <span>{'在线'}</span>
                  </div>
                  <span>{`排队数 ${receptionUnreadCount}`}</span>
                  <span>{`今日接待 ${todayReceptionCount}`}</span>
                  <button type="button" className={styles.storeMessageStatusIconBtn} aria-label="stats">
                    <BarChart3 size={18} />
                  </button>
                  <button type="button" className={styles.storeMessageStatusIconBtn} aria-label="search">
                    <Search size={18} />
                  </button>
                  <button type="button" className={styles.storeMessageStatusIconBtn} aria-label="settings">
                    <Settings size={18} />
                    {hasUnreadMessage ? <i className={styles.storeMessageStatusIconDot} /> : null}
                  </button>
                </div>
                <div className={styles.storeMessageManageRow}>
                  <button type="button" onClick={() => void handleDeleteLatestMessage()} disabled={!resolvedActiveChatSender}>
                    {'删除当前'}
                  </button>
                  <button type="button" onClick={() => void handleClearAllMessages()} disabled={inboxMessages.length === 0}>
                    {'清空全部'}
                  </button>
                </div>
              </section>
              <div className={styles.storeMessageTipsBar}>
                <AlertTriangle size={14} />
                <span>{'左滑会话可显示删除按钮。'}</span>
                <button type="button">{'防骗提示'}</button>
              </div>
              {conversationSummaries.map((summary) => {
                return (
                  <div
                    key={`session-${summary.senderName}`}
                    className={styles.storeMessageSessionSwipe}
                  >
                    <button
                      type="button"
                      className={styles.storeMessageSession}
                      onClick={() => handleOpenChat(summary.senderName)}
                    >
                      <div className={styles.storeMessageAvatarWrap}>
                        <div className={styles.storeMessageAvatar}>{summary.senderName.slice(0, 1)}</div>
                        {summary.unreadCount > 0 ? (
                          <span className={styles.storeMessageAvatarBadge}>{summary.unreadCount}</span>
                        ) : null}
                      </div>
                      <div className={styles.storeMessageMeta}>
                        <div className={styles.storeMessageMetaTop}>
                          <strong>{summary.senderName}</strong>
                          <span>{formatRelativeTime(summary.latest.createdAt)}</span>
                        </div>
                        <div className={styles.storeMessageMetaBottom}>
                          <p>{summary.latest.content || '[image]'}</p>
                          <em
                            className={
                              summary.unreadCount > 0 ? styles.storeMessageStatusUnread : styles.storeMessageStatusRead
                            }
                          >
                            {summary.unreadCount > 0 ? '未读' : '已读'}
                          </em>
                        </div>
                      </div>
                    </button>
                  </div>
                );
              })}
            </>
          ) : (
            <>
              <section className={styles.storeMessagePanel}>
                <div className={styles.storeMessageStatusRow}>
                  <div className={styles.storeMessageStatusOnline}>
                    <CheckCircle2 size={16} />
                    <span>{'系统通知'}</span>
                  </div>
                  <span>{`未读 ${noticeUnreadCount}`}</span>
                  <span>{`总数 ${noticeMessages.length}`}</span>
                </div>
                <div className={styles.storeMessageManageRow}>
                  <button
                    type="button"
                    onClick={() => {
                      void (async () => {
                        for (const sender of systemSenderNames) {
                          // eslint-disable-next-line no-await-in-loop
                          await markSellerInboxMessagesReadBySenderName(sender);
                        }
                        await syncInboxSnapshot();
                      })();
                    }}
                    disabled={noticeUnreadCount === 0}
                  >
                    {'全部已读'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined' && !window.confirm('Clear all notifications?')) return;
                      void (async () => {
                        for (const sender of systemSenderNames) {
                          // eslint-disable-next-line no-await-in-loop
                          await deleteSellerInboxMessagesBySenderName(sender);
                        }
                        await syncInboxSnapshot();
                      })();
                    }}
                    disabled={noticeMessages.length === 0}
                  >
                    {'清空通知'}
                  </button>
                </div>
              </section>
              {latestNoticeMessage ? (
                <div className={styles.storeMessageNoticeItem}>
                  <button
                    type="button"
                    className={styles.storeMessageSession}
                    onClick={() => setNoticeModalMessage(latestNoticeMessage)}
                  >
                    <div className={styles.storeMessageAvatarWrap}>
                      <div className={styles.storeMessageAvatar}>{'系'}</div>
                    </div>
                    <div className={styles.storeMessageMeta}>
                      <div className={styles.storeMessageMetaTop}>
                        <strong>{'系统通知'}</strong>
                        <span>{formatRelativeTime(latestNoticeMessage.createdAt)}</span>
                      </div>
                      <div className={styles.storeMessageMetaBottom}>
                        <p>{latestNoticeMessage.content}</p>
                        <em
                          className={
                            latestNoticeMessage.status === 'unread'
                              ? styles.storeMessageStatusUnread
                              : styles.storeMessageStatusRead
                          }
                        >
                          {latestNoticeMessage.status === 'unread' ? '未读' : '已读'}
                        </em>
                      </div>
                    </div>
                  </button>
                </div>
              ) : null}
            </>
          )}
        </main>
        <footer className={styles.storeMessageFooter}>
          <button type="button" className={styles.storeMessageFooterItem} onClick={() => setMessageView('none')}>
            <Home size={16} />
            <span>{'首页'}</span>
          </button>
          <button type="button" className={`${styles.storeMessageFooterItem} ${styles.storeMessageFooterItemActive}`}>
            <MessageCircle size={16} />
            <span>{'消息'}</span>
          </button>
          <button type="button" className={styles.storeMessageFooterItem}>
            <UserRound size={16} />
            <span>{'我的'}</span>
          </button>
        </footer>
        {noticeModalMessage ? (
          <div className={styles.storeMessageDetailMask} onClick={() => setNoticeModalMessage(null)}>
            <div
              className={styles.storeMessageDetailDialog}
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              <div className={styles.storeMessageMetaTop}>
                <strong>{'通知详情'}</strong>
                <span>{formatRelativeTime(noticeModalMessage.createdAt)}</span>
              </div>
              <div className={styles.storeMessageDetailBody}>
                <p className={styles.storeMessageDetailText}>{noticeModalMessage.content}</p>
              </div>
              <div className={styles.storeMessageDetailActions}>
                <button type="button" onClick={() => setNoticeModalMessage(null)}>
                  {'我知道了'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }
  if (messageView === 'chat') {
    return (
      <div className={styles.storeManageRoot}>
        <header className={styles.storeChatHeader}>
          <button type="button" className={styles.iconButton} onClick={() => setMessageView('list')} aria-label="返回">
            <ChevronLeft size={22} />
          </button>
          <h1>{resolvedActiveChatSender || '聊天对象'}</h1>
          <button type="button" className={styles.iconButton} aria-label="更多">
            <MoreHorizontal size={18} />
          </button>
        </header>
        <main className={styles.storeChatContent}>
          <div className={styles.storeChatNotice}>
            <AlertTriangle size={14} />
            <span>请勿在聊天中透露手机号、验证码等敏感信息。</span>
          </div>
          {chatThreadMessages.map((message) => (
            <div
              key={message.id}
              className={`${styles.storeChatBubbleRow} ${
                message.sender === 'seller' ? styles.storeChatBubbleRowMine : styles.storeChatBubbleRowPeer
              }`}
            >
              <div className={styles.storeChatBubble}>
                <p>{message.content}</p>
                <span>{message.time}</span>
              </div>
            </div>
          ))}
          {isAutoReplying ? (
            <div className={`${styles.storeChatBubbleRow} ${styles.storeChatBubbleRowPeer}`}>
              <div className={styles.storeChatBubble}>
                <p>正在输入中...</p>
              </div>
            </div>
          ) : null}
        </main>
        <footer className={styles.storeChatComposer}>
          <button type="button" className={styles.storeChatEmojiButton} aria-label="表情">
            <Smile size={18} />
          </button>
          <input
            value={chatInput}
            onChange={(event) => setChatInput(event.target.value)}
            placeholder="请输入消息内容"
            onKeyDown={(event) => {
              if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
              event.preventDefault();
              void handleSendChatMessage();
            }}
          />
          <button type="button" onClick={() => void handleSendChatMessage()} disabled={!chatInput.trim() || isAutoReplying}>
            发送
          </button>
        </footer>
      </div>
    );
  }

  return (
    <div className={`${styles.storeManageRoot} ${styles.storeManageFont13}`}>
      <header className={styles.storeManageHeader}>
        <button className={styles.iconButton} onClick={onClose} aria-label="返回">
          <ChevronLeft size={24} />
        </button>
        <h1>店铺管理</h1>
        <span className={styles.storeManageHeaderPlaceholder} />
      </header>

      <main className={styles.storeManageContent}>
        <section className={styles.storeManageCard}>
          <h2>
            资产情况 <CircleHelp size={14} />
          </h2>
          <div className={styles.storeManageFinanceGrid}>
            <article className={styles.storeManageFinanceMain}>
              <p>
                <span aria-hidden="true">💵</span>我的资产
              </p>
              <strong>{formatMoney(assetBalance)}</strong>
              <button
                type="button"
                className={styles.storeRechargeButton}
                onClick={openRechargeDialog}
              >
                充值
              </button>
            </article>
            <article className={styles.storeManageFinanceSub}>
              <p>
                <FileText size={14} strokeWidth={2} />
                财务情况
              </p>
              <span>总收入: {formatReportMoney(reportRevenue)}</span>
              <button type="button" onClick={() => setIsFinanceReportVisible(true)}>
                查看财务报告
              </button>
            </article>
          </div>
        </section>

        <section className={`${styles.storeManageCard} ${styles.storeManageListCard}`}>
          <h2>
            店铺列表 <CircleHelp size={14} />
          </h2>
          <div className={styles.storeManageTableHead}>
            <span>店铺名称</span>
            <span className={styles.storeManageTableRevenueHead}>营业额</span>
            <span className={styles.storeManageTableActionHead}>操作</span>
          </div>
          <div className={styles.storeManageSearchRow}>
            <input
              value={storeSearchKeyword}
              onChange={(event) => setStoreSearchKeyword(event.target.value)}
              placeholder="搜索店铺名称"
            />
            <span>共 {filteredList.length} 条</span>
          </div>
          <div className={styles.storeManageList}>
            {pagedStoreList.map((item, index) => {
              const dropBefore = dropTarget?.id === item.id && dropTarget.position === 'before';
              const dropAfter = dropTarget?.id === item.id && dropTarget.position === 'after';
              return (
                <div
                  key={item.id}
                  data-store-row-id={item.id}
                  className={[
                    styles.storeManageRow,
                    styles.storeManageRowDraggable,
                    draggingStoreId === item.id ? styles.storeManageRowDragging : '',
                    dropBefore ? styles.storeManageRowDropBefore : '',
                    dropAfter ? styles.storeManageRowDropAfter : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <div className={styles.storeManageNameCell}>
                    <button
                      type="button"
                      className={styles.storeDragHandle}
                      aria-label="拖动排序"
                      onPointerDown={(event) => {
                        if (event.button !== 0) return;
                        pointerIdRef.current = event.pointerId;
                        setDraggingStoreId(item.id);
                        setDropTarget(null);
                      }}
                    >
                      <GripVertical size={14} />
                    </button>
                    <span>{pagedStartIndex + index + 1}</span>
                    <strong>{item.name}</strong>
                  </div>
                  <strong className={styles.storeManageRevenue}>{formatMoney(item.revenue)}</strong>
                  <div className={styles.storeManageActions}>
                    <button type="button" onClick={() => onEnterDashboard(item.id)}>
                      进入
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        setUpdatingStoreId(item.id);
                        try {
                          const saved = await saveCommerceStores(
                            stores.map((store) =>
                              store.id === item.id ? { ...store, visible: !store.visible, updatedAt: Date.now() } : store
                            ),
                            { orders }
                          );
                          onStoresChange(saved);
                        } finally {
                          setUpdatingStoreId(null);
                        }
                      }}
                      disabled={updatingStoreId === item.id}
                    >
                      {updatingStoreId === item.id ? '处理中...' : item.visible ? '隐藏' : '显示'}
                    </button>
                    <button type="button" onClick={() => setPendingDeleteStoreId(item.id)} disabled={updatingStoreId === item.id}>
                      删除
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className={styles.storeManagePagination}>
            <button type="button" onClick={() => setStorePage((prev) => Math.max(1, prev - 1))} disabled={storePage <= 1}>
              上一页
            </button>
            <span>
              {storePage} / {totalStorePages}
            </span>
            <button
              type="button"
              onClick={() => setStorePage((prev) => Math.min(totalStorePages, prev + 1))}
              disabled={storePage >= totalStorePages}
            >
              下一页
            </button>
          </div>
        </section>
      </main>

      <footer className={styles.storeManageFooter}>
        <button type="button" className={styles.storeManageNavItem} aria-label="home">
          <span className={styles.storeManageNavLabel}>首页</span>
        </button>
        <button className={styles.storeManageAddButton} aria-label="新建店铺" onClick={() => setIsCreatePanelVisible(true)}>
          <Plus size={32} strokeWidth={2.6} />
        </button>
        <button type="button" className={styles.storeManageNavItem} aria-label="消息" onClick={() => setMessageView('list')}>
          <span className={styles.storeManageNavLabel}>
            消息
            {hasUnreadMessage ? <i className={styles.storeManageNavBadge} /> : null}
          </span>
        </button>
      </footer>

      {isCreatePanelVisible && (
        <div className={styles.storeCreateOverlay} aria-modal="true" role="dialog">
          <button type="button" className={styles.storeCreateBackdrop} onClick={() => setIsCreatePanelVisible(false)} />
          <div className={styles.storeCreateSheet}>
            <button
              type="button"
              className={styles.storeCreateActionButton}
              onClick={() => {
                if (assetBalance < STORE_OPEN_COST) {
                  setIsCreatePanelVisible(false);
                  if (typeof window !== 'undefined') {
                    window.alert(`我的资产不足，开新店至少需要 ${formatMoney(STORE_OPEN_COST)}，请先充值。`);
                  }
                  openRechargeDialog();
                  return;
                }
                setIsCreatePanelVisible(false);
                setIsCreateNoticeVisible(true);
              }}
            >
              开新店
            </button>
            <button type="button" className={styles.storeCreateCancelButton} onClick={() => setIsCreatePanelVisible(false)}>
              取消
            </button>
          </div>
        </div>
      )}

      {isCreateNoticeVisible && (
        <div className={styles.storeCreateNoticeOverlay} aria-modal="true" role="dialog">
          <button type="button" className={styles.storeCreateNoticeBackdrop} onClick={() => setIsCreateNoticeVisible(false)} />
          <div className={styles.storeCreateNoticeDialog}>
            <h3>开店小须知</h3>
            <div className={styles.storeCreateNoticeText}>
              {CREATE_NOTICE_LINES.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
            <div className={styles.storeCreateNoticeActions}>
              <button type="button" onClick={() => setIsCreateNoticeVisible(false)}>
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCreateNoticeVisible(false);
                  setCreateStoreForm(EMPTY_CREATE_STORE_FORM);
                  setCreateStoreErrors({});
                  resetVerifyState();
                  setIsCreateFormVisible(true);
                }}
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {isRechargeVisible && (
        <div className={styles.storeRechargeOverlay} aria-modal="true" role="dialog">
          <button
            type="button"
            className={styles.storeRechargeBackdrop}
            onClick={() => {
              // Prevent delayed mobile click-through from immediately closing the dialog.
              if (Date.now() - rechargeOpenedAtRef.current < 320) return;
              closeRechargeDialog();
            }}
          />
          <div
            className={styles.storeRechargeDialog}
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <h3>资产充值</h3>
            <label className={styles.storeRechargeInput}>
              充值金额
              <input
                value={rechargeAmount}
                onChange={(event) => {
                  const next = event.target.value.replace(/[^\d.]/g, '');
                  setRechargeAmount(next);
                  setRechargeError('');
                }}
                placeholder="请输入充值金额"
                inputMode="decimal"
              />
            </label>
            {rechargeError ? <em className={styles.storeRechargeError}>{rechargeError}</em> : null}
            <div className={styles.storeRechargeActions}>
              <button
                type="button"
                onClick={closeRechargeDialog}
              >
                取消
              </button>
              <button type="button" onClick={() => void handleConfirmRecharge()} disabled={isSubmittingRecharge}>
                {isSubmittingRecharge ? '处理中...' : '确定'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isCreateFormVisible && (
        <div className={styles.storeCreateFormOverlay} aria-modal="true" role="dialog">
          <div className={styles.storeCreateFormPanel}>
            <header className={styles.storeCreateFormHeader}>
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => {
                  setIsCreateFormVisible(false);
                  setCreateStoreForm(EMPTY_CREATE_STORE_FORM);
                  setCreateStoreErrors({});
                  resetVerifyState();
                }}
                aria-label="返回"
              >
                <ChevronLeft size={20} />
              </button>
              <h3>创建店铺信息</h3>
              <span />
              {verifyToastCode ? (
                <div className={styles.storeCreateVerifyToast} role="status" aria-live="polite">
                  验证码：{verifyToastCode}
                </div>
              ) : null}
            </header>
            <div className={styles.storeCreateFormBody}>
              <section className={styles.storeCreateFormCard}>
                <h4>店铺基本信息（必填）</h4>
                <div className={styles.storeCreateField}>
                  <span>店铺模板 *</span>
                  <div className={styles.storeTemplateGrid}>
                    {STORE_TEMPLATE_OPTIONS.map((option) => (
                      <div
                        key={option.kind}
                        className={`${styles.storeTemplateCard} ${
                          createStoreForm.templateKind === option.kind ? styles.storeTemplateCardActive : ''
                        }`}
                        role="button"
                        tabIndex={0}
                        aria-pressed={createStoreForm.templateKind === option.kind}
                        onClick={() => handleSelectStoreTemplate(option.kind)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            handleSelectStoreTemplate(option.kind);
                          }
                        }}
                      >
                        <strong>{option.label}</strong>
                        <span>{option.title}</span>
                        <p>{option.desc}</p>
                        <div className={styles.storeTemplateActions}>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setPreviewTemplateKind(option.kind);
                            }}
                          >
                            预览
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <label className={styles.storeCreateField}>
                  店铺名称 *
                  <input
                    value={createStoreForm.shopName}
                    maxLength={100}
                    onChange={(e) => {
                      setCreateStoreForm((prev) => ({ ...prev, shopName: e.target.value }));
                      setCreateStoreErrors((prev) => ({ ...prev, shopName: undefined }));
                    }}
                    placeholder="请输入店铺名称"
                  />
                  {createStoreErrors.shopName ? <em>{createStoreErrors.shopName}</em> : null}
                </label>
                <label className={styles.storeCreateField}>
                  店铺类型 *
                  <select
                    value={createStoreForm.storeType}
                    onChange={(e) => {
                      setCreateStoreForm((prev) => ({ ...prev, storeType: e.target.value }));
                      setCreateStoreErrors((prev) => ({ ...prev, storeType: undefined }));
                    }}
                  >
                    <option value="">请选择店铺类型</option>
                    {createStoreTypeOptions.map((typeName) => (
                      <option key={typeName} value={typeName}>
                        {typeName}
                      </option>
                    ))}
                  </select>
                  {createStoreErrors.storeType ? <em>{createStoreErrors.storeType}</em> : null}
                </label>
                <label className={styles.storeCreateField}>
                  店铺 Logo *
                  <div className={styles.storeCreateLogoRow}>
                    <label className={styles.storeCreateLogoUpload}>
                      上传图片
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => void handleStoreLogoUpload(e.target.files?.[0])}
                      />
                    </label>
                    {createStoreForm.shopLogo ? (
                      <img src={createStoreForm.shopLogo} alt="logo" className={styles.storeCreateLogoPreview} />
                    ) : (
                      <span className={styles.storeCreateLogoPlaceholder}>未上传</span>
                    )}
                  </div>
                  {createStoreErrors.shopLogo ? <em>{createStoreErrors.shopLogo}</em> : null}
                </label>
              </section>

              <section className={styles.storeCreateFormCard}>
                <h4>经营者信息（必填）</h4>
                <label className={styles.storeCreateField}>
                  经营者姓名 *
                  <input
                    value={createStoreForm.ownerName}
                    onChange={(e) => {
                      setCreateStoreForm((prev) => ({ ...prev, ownerName: e.target.value }));
                      setCreateStoreErrors((prev) => ({ ...prev, ownerName: undefined }));
                    }}
                    placeholder="请输入经营者姓名"
                  />
                  {createStoreErrors.ownerName ? <em>{createStoreErrors.ownerName}</em> : null}
                </label>
                <label className={styles.storeCreateField}>
                  手机号 *
                  <input
                    value={createStoreForm.phone}
                    maxLength={11}
                    onChange={(e) => {
                      const nextPhone = e.target.value.replace(/[^\d]/g, '');
                      setCreateStoreForm((prev) => ({ ...prev, phone: nextPhone }));
                      if (sentVerifyPhone && nextPhone !== sentVerifyPhone) {
                        setSentVerifyCode(null);
                        setSentVerifyPhone('');
                      }
                      setCreateStoreErrors((prev) => ({ ...prev, phone: undefined }));
                    }}
                    placeholder="请输入 11 位手机号"
                  />
                  {createStoreErrors.phone ? <em>{createStoreErrors.phone}</em> : null}
                </label>
                <label className={styles.storeCreateField}>
                  验证码 *
                  <div className={styles.storeCreateVerifyRow}>
                    <input
                      value={createStoreForm.verifyCode}
                      onChange={(e) => {
                        setCreateStoreForm((prev) => ({
                          ...prev,
                          verifyCode: e.target.value.replace(/[^\d]/g, '').slice(0, 6),
                        }));
                        setCreateStoreErrors((prev) => ({ ...prev, verifyCode: undefined }));
                      }}
                      placeholder="请输入短信验证码"
                    />
                    <button type="button" onClick={handleSendVerifyCode} disabled={verifyCodeCountdown > 0}>
                      {verifyCodeCountdown > 0 ? `倒计时${verifyCodeCountdown}s` : '获取验证码'}
                    </button>
                  </div>
                  {createStoreErrors.verifyCode ? <em>{createStoreErrors.verifyCode}</em> : null}
                </label>
                <label className={styles.storeCreateField}>
                  经营地址 *
                  <input
                    value={createStoreForm.businessAddress}
                    onChange={(e) => {
                      setCreateStoreForm((prev) => ({ ...prev, businessAddress: e.target.value }));
                      setCreateStoreErrors((prev) => ({ ...prev, businessAddress: undefined }));
                    }}
                    placeholder="请输入详细经营地址"
                  />
                  {createStoreErrors.businessAddress ? <em>{createStoreErrors.businessAddress}</em> : null}
                </label>
              </section>
            </div>
            <footer className={styles.storeCreateFormFooter}>
              <button type="button" onClick={() => void handleSubmitCreateStore()} disabled={isSubmittingCreate}>
                {isSubmittingCreate ? '提交中...' : '确认提交'}
              </button>
            </footer>
          </div>
        </div>
      )}

      {previewTemplateMeta ? (
        <div className={styles.storeTemplatePreviewOverlay} aria-modal="true" role="dialog">
          <button
            type="button"
            className={styles.storeCreateNoticeBackdrop}
            onClick={() => setPreviewTemplateKind(null)}
          />
          <div className={styles.storeTemplatePreviewDialog}>
            <header className={styles.storeTemplatePreviewHeader}>
              <div>
                <strong>
                  {previewTemplateKind === 'dessert' ? '模板1预览' : '模板2预览'}
                </strong>
                <span>{previewTemplateKind === 'dessert' ? '购物类场景' : '出票类场景'}</span>
              </div>
              <button type="button" className={styles.iconButton} onClick={() => setPreviewTemplateKind(null)} aria-label="关闭">
                <ChevronLeft size={20} />
              </button>
            </header>
            <div className={styles.storeTemplatePreviewBody}>
              <section
                className={styles.storeTemplatePreviewHero}
                style={{ backgroundImage: previewTemplateMeta.theme }}
              >
                <div className={styles.storeTemplatePreviewMask} />
                <div className={styles.storeTemplatePreviewContent}>
                  <div className={styles.storeTemplatePreviewProfile}>
                    <div className={styles.storeTemplatePreviewAvatar}>
                      {previewTemplateKind === 'dessert' ? '模版' : '票务'}
                    </div>
                    <div>
                      <h4>模板店铺</h4>
                      <p>{previewTemplateKind === 'dessert' ? '购物类场景示意' : '出票类场景示意'}</p>
                    </div>
                  </div>
                </div>
              </section>
              {previewTemplateKind === 'dessert' ? (
                <>
                  <div className={styles.storeTemplatePreviewTabs}>
                    <span>综合</span>
                    <span>销量</span>
                    <span>新品</span>
                    <span>价格</span>
                  </div>
                  <div className={styles.storeTemplatePreviewFilters}>
                    <span>看上新</span>
                    <span>限时立减</span>
                  </div>
                  <div className={styles.storeTemplatePreviewGoods}>
                    <article>
                      <div />
                      <strong>商品展示卡 1</strong>
                      <p>用于购物类商品展示</p>
                    </article>
                    <article>
                      <div />
                      <strong>商品展示卡 2</strong>
                      <p>支持加购与商品装修</p>
                    </article>
                  </div>
                </>
              ) : (
                <div className={styles.storeTemplatePreviewMovieLayout}>
                  <section className={styles.storeTemplatePreviewMovieHeader}>
                    <h4>正在热映</h4>
                    <p>选择影片，填写日期与数量，生成电子电影票</p>
                  </section>
                  <section className={styles.storeTemplatePreviewMovieSearch}>
                    <label>搜索影片</label>
                    <div className={styles.storeTemplatePreviewMovieSearchInput}>例如：流浪地球</div>
                  </section>
                  <article className={styles.storeTemplatePreviewMovieCard}>
                    <div className={styles.storeTemplatePreviewMoviePoster}>
                      <span>🎞️</span>
                    </div>
                    <strong>流浪地球 3</strong>
                    <p>科幻 · 史诗 · IMAX</p>
                    <em>￥69.00 起</em>
                  </article>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {isFinanceReportVisible && (
        <div className={styles.financeReportRoot}>
          <header className={styles.financeReportHeader}>
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => setIsFinanceReportVisible(false)}
              aria-label="返回"
            >
              <ChevronLeft size={22} />
            </button>
            <h1>财务报告</h1>
            <span />
          </header>
          <main className={styles.financeReportContent}>
            <section className={styles.financeReportCard}>
              <div className={styles.financeReportCardHead}>
                <strong>近 7 日收支趋势</strong>
                <span>收入 / 支出</span>
              </div>
              <div className={styles.financeTrendChart}>
                <svg viewBox="0 0 320 120" width="100%" height="120" preserveAspectRatio="none" aria-label="收支趋势图">
                  <polyline
                    points={financeTrend.incomePoints}
                    fill="none"
                    stroke="#4E8CFF"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <polyline
                    points={financeTrend.expensePoints}
                    fill="none"
                    stroke="#FF7A59"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className={styles.financeTrendLegend}>
                <span>
                  <i style={{ background: '#4E8CFF' }} />
                  收入
                </span>
                <span>
                  <i style={{ background: '#FF7A59' }} />
                  支出
                </span>
              </div>
              <div className={styles.financeTrendAxis}>
                {financeTrend.labels.map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>
            </section>

            <section className={styles.financeReportCard}>
              <div className={styles.financeReportCardHead}>
                <strong>店铺收益明细</strong>
                <span>共 {stores.length} 家店铺</span>
              </div>
              <table className={styles.financeTable}>
                <thead>
                  <tr>
                    <th>项目</th>
                    <th>金额</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>本期总收入</td>
                    <td>{formatMoney(reportRevenue)}</td>
                  </tr>
                  <tr>
                    <td>总支出</td>
                    <td>{formatMoney(reportTotalExpense)}</td>
                  </tr>
                  <tr className={styles.financeTableTotal}>
                    <td>净利润</td>
                    <td>{formatMoney(reportProfit)}</td>
                  </tr>
                </tbody>
              </table>
            </section>

            <section className={styles.financeReportCard}>
              <h2>支出结构分析</h2>
              <div className={styles.financeDonutWrap}>
                <div className={styles.financeDonut} style={{ background: reportDonutGradient }} />
                <div className={styles.financeDonutList}>
                  {reportExpenseItemsWithPurchase.map((item) => {
                    const ratio = reportTotalExpense > 0 ? `${((item.amount / reportTotalExpense) * 100).toFixed(1)}%` : '0%';
                    return (
                      <div key={item.id} className={styles.financeDonutItem}>
                        <span>
                          <i style={{ background: item.color }} />
                          {item.label}
                        </span>
                        <em>{ratio}</em>
                        <b>{formatReportMoney(item.amount)}</b>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </main>
        </div>
      )}

      {pendingDeleteStoreId && (
        <div className={styles.storeDeleteOverlay} aria-modal="true" role="dialog">
          <button type="button" className={styles.storeDeleteBackdrop} onClick={() => setPendingDeleteStoreId(null)} />
          <div className={styles.storeDeleteDialog}>
            <h3>确认删除店铺？</h3>
            <p>{deleteNoticeText}</p>
            <div className={styles.storeDeleteActions}>
              <button type="button" onClick={() => setPendingDeleteStoreId(null)}>
                取消
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!pendingDeleteStoreId) return;
                  const { stores: saved, recycledAmount } = await deleteCommerceStoreWithRecycle(pendingDeleteStoreId, {
                    orders,
                  });
                  onStoresChange(saved);
                  setPendingDeleteStoreId(null);
                  if (typeof window !== "undefined") window.alert(`已删除店铺，回收金额 ${recycledAmount.toFixed(2)} 元`);
                }}
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
