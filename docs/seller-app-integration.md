# 商家端与用户端集成方案

**文档版本：** v1.0  
**创建时间：** 2026-04-18

---

## 一、集成架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                         IndexedDB 存储层                         │
├─────────────────────────┬───────────────────────────────────────┤
│   takeout (用户端)       │      seller (商家端)                   │
│                         │                                       │
│  📱 用户功能             │  🏪 商家功能                           │
│  - 浏览商家              │  - 店铺管理                            │
│  - 选择商品              │  - 商品管理                            │
│  - 下单支付              │  - 订单处理                            │
│  - 订单追踪              │  - 数据统计                            │
│  - 评价                  │  - 营销配置                            │
│                         │                                       │
│  📦 数据视图             │  📦 数据视图                           │
│  - 订单（用户视角）       │  - 订单（商家视角）                     │
│  - 地址                  │  - 店铺配置                            │
│  - 优惠券                │  - 商品库存                            │
│                         │                                       │
└───────────┬─────────────┴────────────────┬──────────────────────┘
            │                              │
            │    🔄 双向同步机制            │
            │                              │
            ▼                              ▼
    ┌────────────────────────────────────────────┐
    │         事件总线 (Event Bus)                │
    │                                            │
    │  - ORDER_STATUS_CHANGED_EVENT              │
    │  - PRODUCT_STOCK_CHANGED_EVENT             │
    │  - SHOP_STATUS_CHANGED_EVENT               │
    │  - NEW_ORDER_NOTIFICATION_EVENT            │
    └────────────────────────────────────────────┘
```

---

## 二、共享类型定义

### 2.1 类型位置

在 `src/appsrc/shared/business/commerce/domain/` 下创建共享类型文件：

```
src/appsrc/shared/business/commerce/domain/
├── types.ts              # 现有文件（已有 CommerceStore, Order 等）
├── deliveryTypes.ts      # 🆕 新建：外卖共享类型
├── deliveryConstants.ts  # 🆕 新建：常量定义
└── deliveryUtils.ts      # 🆕 新建：工具函数
```

### 2.2 deliveryTypes.ts 内容

```typescript
// src/appsrc/shared/business/commerce/domain/deliveryTypes.ts

/**
 * 配送品类
 */
export type DeliveryBizType = 
  | 'fastfood'    // 快餐
  | 'drink'       // 饮品
  | 'snack'       // 小吃
  | 'dessert'     // 甜品
  | 'fruit';      // 水果

/**
 * 商家/店铺信息（用户端和商家端共享）
 */
export interface DeliveryMerchant {
  id: string;
  name: string;
  logo?: string;
  cover?: string;
  bizType: DeliveryBizType;
  rating: number;
  monthlySales: number;
  minOrderAmount: number;
  deliveryFee: number;
  avgDeliveryMinutes: number;
  distanceKm: number;
  promotions: string[];
  tags: string[];
  announcement: string;
  notice: string;
  serviceTags: string[];
  isOpen: boolean;
  visible: boolean;
  createdAt: number;
  updatedAt: number;
}

/**
 * 商品分类
 */
export interface DeliveryDishCategory {
  id: string;
  merchantId: string;
  name: string;
  sort: number;
}

/**
 * 商品规格选项
 */
export interface DeliveryDishOption {
  id: string;
  name: string;
  priceDelta: number;
}

/**
 * 商品规格组
 */
export interface DeliveryDishSku {
  id: string;
  name: string;
  options: DeliveryDishOption[];
  required?: boolean;
}

/**
 * 商品
 */
export interface DeliveryDish {
  id: string;
  merchantId: string;
  categoryId: string;
  name: string;
  desc: string;
  image?: string;
  price: number;
  originalPrice?: number;
  monthlySales: number;
  stock: number;
  skus: DeliveryDishSku[];
  status: 'on' | 'off';
}

/**
 * 购物车商品行
 */
export interface DeliveryCartLine {
  id: string;
  merchantId: string;
  dishId: string;
  dishName: string;
  unitPrice: number;
  qty: number;
  selectedOptions: DeliveryCartLineSelectedOption[];
  note?: string;
}

/**
 * 购物车选中规格
 */
export interface DeliveryCartLineSelectedOption {
  skuId: string;
  optionId: string;
  optionName: string;
  priceDelta: number;
}

/**
 * 订单状态
 */
export type DeliveryOrderStatus =
  | 'pending-payment'  // 待支付
  | 'paid'             // 已支付
  | 'accepted'         // 已接单
  | 'preparing'        // 制作中
  | 'delivering'       // 配送中
  | 'completed'        // 已完成
  | 'cancelled'        // 已取消
  | 'refunding';       // 退款中

/**
 * 售后状态
 */
export type DeliveryAfterSaleStatus = 'none' | 'requested' | 'processing' | 'done';

/**
 * 订单项时间线
 */
export type DeliveryOrderTimelineKind = DeliveryOrderStatus | 'urge' | 'after-sale' | 'rated';

export interface DeliveryOrderTimelineItem {
  id: string;
  kind: DeliveryOrderTimelineKind;
  label: string;
  at: number;
  note?: string;
}

/**
 * 配送地址
 */
export interface DeliveryAddress {
  id: string;
  name: string;
  phone: string;
  detail: string;
  lat?: number;
  lng?: number;
  isDefault: boolean;
}

/**
 * 订单
 */
export interface DeliveryOrder {
  id: string;
  merchantId: string;
  merchantName: string;
  lines: DeliveryCartLine[];
  itemTotal: number;
  packageFee: number;
  deliveryFee: number;
  discountFee: number;
  payableAmount: number;
  status: DeliveryOrderStatus;
  address: DeliveryAddress;
  deliveryTimeMode: 'instant' | 'schedule';
  scheduleAt?: number;
  estimatedDeliveredAt?: number;
  createdAt: number;
  paidAt?: number;
  finishedAt?: number;
  couponId?: string | null;
  urgeCount: number;
  afterSaleStatus: DeliveryAfterSaleStatus;
  rated: boolean;
  ratingScore?: number;
  timeline: DeliveryOrderTimelineItem[];
}

/**
 * 优惠券
 */
export interface DeliveryCoupon {
  id: string;
  title: string;
  thresholdAmount: number;
  discountAmount: number;
  expiresAt: number;
  used: boolean;
}

/**
 * 用户资料
 */
export interface DeliveryUserProfile {
  id: string;
  name: string;
  avatar?: string;
  membershipLevel: 'normal' | 'silver' | 'gold';
}
```

### 2.3 类型复用关系

```typescript
// takeout/types.ts - 导出共享类型
export type {
  DeliveryBizType,
  DeliveryMerchant,
  DeliveryDishCategory,
  DeliveryDishOption,
  DeliveryDishSku,
  DeliveryDish,
  DeliveryCartLine,
  DeliveryCartLineSelectedOption,
  DeliveryOrderStatus,
  DeliveryAfterSaleStatus,
  DeliveryOrderTimelineKind,
  DeliveryOrderTimelineItem,
  DeliveryAddress,
  DeliveryOrder,
  DeliveryCoupon,
  DeliveryUserProfile,
} from '../shared/business/commerce/domain/deliveryTypes';

// seller/types.ts - 导入并扩展
import type {
  DeliveryDish,
  DeliveryDishCategory,
  DeliveryOrder,
  DeliveryMerchant,
} from '../takeout/types';

// 直接复用
export type SellerProduct = DeliveryDish;
export type SellerCategory = DeliveryDishCategory;

// 扩展商家特有字段
export interface SellerShop extends DeliveryMerchant {
  businessHours: WeeklyBusinessHours;
  deliveryRange: number;
  totalOrders: number;
}

export interface SellerOrder extends DeliveryOrder {
  acceptedAt?: number;
  preparingAt?: number;
  readyForDeliveryAt?: number;
  printed: boolean;
  merchantNote?: string;
}
```

---

## 三、数据存储集成

### 3.1 IndexedDB 结构

```
IndexedDB
├── openclaw-db
│   ├── stores                  # 店铺信息
│   │   └── key: 'commerce:stores'
│   │       └── CommerceStore[]
│   │
│   ├── role_states             # 角色状态（按 role 隔离）
│   │   ├── key: 'user-xxx'     # 用户端数据
│   │   │   └── {
│   │   │       orders: DeliveryOrder[],
│   │   │       addresses: DeliveryAddress[],
│   │   │       coupons: DeliveryCoupon[],
│   │   │       ...
│   │   │     }
│   │   └── key: 'seller-xxx'   # 商家端数据
│   │       └── {
│   │           shop: SellerShop,
│   │           products: SellerProduct[],
│   │           orders: SellerOrder[],
│   │           ...
│   │         }
│   │
│   ├── products_dessert        # 甜品商品
│   ├── products_flower         # 鲜花商品
│   └── products_movie          # 电影票商品
```

### 3.2 存储键定义

```typescript
// src/appsrc/shared/business/commerce/domain/storageKeys.ts

// 通用键
export const COMMERCE_STORES_KEY = 'commerce:stores';

// 角色相关键
export const createRoleStateKey = (roleId: string) => `role_states:${roleId}`;

// 用户端键
export const TAKEOUT_ROLE_PREFIX = 'user:';
export const createTakeoutRoleKey = (userId: string) => 
  createRoleStateKey(`${TAKEOUT_ROLE_PREFIX}${userId}`);

// 商家端键
export const SELLER_ROLE_PREFIX = 'seller:';
export const createSellerRoleKey = (sellerId: string) => 
  createRoleStateKey(`${SELLER_ROLE_PREFIX}${sellerId}`);

// 商品键
export const PRODUCTS_DESSERT_KEY = 'products_dessert';
export const PRODUCTS_FLOWER_KEY = 'products_flower';
export const PRODUCTS_MOVIE_KEY = 'products_movie';
```

### 3.3 持久化仓库

```typescript
// src/appsrc/shared/business/commerce/domain/deliveryStorage.ts

import { getRecord, updateRecord, createIdbStore } from '../../../../core/idb';
import { createAppStoreConfig } from '../../../../core/storage';
import { getCommerceActiveRoleId } from '../roleContext';
import type { DeliveryOrder, DeliveryMerchant } from './deliveryTypes';

const DELIVERY_STORE = 'delivery_data';

const deliveryStore = createIdbStore(
  createAppStoreConfig('delivery', DELIVERY_STORE)
);

/**
 * 获取当前角色 ID
 */
const getCurrentRoleId = (): string => {
  return getCommerceActiveRoleId() || 'default';
};

/**
 * 读取商家店铺
 */
export const readSellerShop = async (): Promise<DeliveryMerchant | null> => {
  const roleId = getCurrentRoleId();
  const key = `seller_shop:${roleId}`;
  return await getRecord<DeliveryMerchant>(deliveryStore, key);
};

/**
 * 保存商家店铺
 */
export const writeSellerShop = async (shop: DeliveryMerchant): Promise<void> => {
  const roleId = getCurrentRoleId();
  const key = `seller_shop:${roleId}`;
  await updateRecord<DeliveryMerchant, DeliveryMerchant>(
    deliveryStore,
    key,
    () => shop
  );
};

/**
 * 读取商家订单
 */
export const readSellerOrders = async (): Promise<DeliveryOrder[]> => {
  const roleId = getCurrentRoleId();
  const key = `seller_orders:${roleId}`;
  const raw = await getRecord<unknown>(deliveryStore, key);
  return Array.isArray(raw) ? raw : [];
};

/**
 * 追加商家订单
 */
export const appendSellerOrder = async (order: DeliveryOrder): Promise<DeliveryOrder[]> => {
  const roleId = getCurrentRoleId();
  const key = `seller_orders:${roleId}`;
  let nextOrders: DeliveryOrder[] = [];

  await updateRecord<unknown, DeliveryOrder[]>(
    deliveryStore,
    key,
    (current) => {
      const currentOrders = Array.isArray(current) ? current : [];
      nextOrders = [order, ...currentOrders];
      return nextOrders;
    }
  );

  return nextOrders;
};

/**
 * 更新订单状态
 */
export const updateSellerOrderStatus = async (
  orderId: string,
  status: DeliveryOrder['status']
): Promise<DeliveryOrder[]> => {
  const roleId = getCurrentRoleId();
  const key = `seller_orders:${roleId}`;
  let nextOrders: DeliveryOrder[] = [];

  await updateRecord<unknown, DeliveryOrder[]>(
    deliveryStore,
    key,
    (current) => {
      const currentOrders = Array.isArray(current) ? current : [];
      nextOrders = currentOrders.map((order) => {
        if (order.id !== orderId) return order;
        return {
          ...order,
          status,
          timeline: [
            {
              id: `timeline-${Date.now()}`,
              kind: status,
              label: getStatusLabel(status),
              at: Date.now(),
            },
            ...order.timeline,
          ],
        };
      });
      return nextOrders;
    }
  );

  return nextOrders;
};

const getStatusLabel = (status: DeliveryOrder['status']): string => {
  const labels: Record<DeliveryOrder['status'], string> = {
    'pending-payment': '待支付',
    paid: '已支付',
    accepted: '已接单',
    preparing: '制作中',
    delivering: '配送中',
    completed: '已完成',
    cancelled: '已取消',
    refunding: '退款中',
  };
  return labels[status];
};
```

---

## 四、事件同步机制

### 4.1 事件定义

```typescript
// src/appsrc/shared/business/commerce/messageBridge.ts

// ==================== 事件类型 ====================

/**
 * 订单状态变更事件
 */
export const ORDER_STATUS_CHANGED_EVENT = 'commerce:order:status:changed';

export interface OrderStatusChangedEvent {
  orderId: string;
  oldStatus: string;
  newStatus: string;
  timestamp: number;
  source: 'takeout' | 'seller';
}

/**
 * 新订单通知事件（用户端 → 商家端）
 */
export const NEW_ORDER_NOTIFICATION_EVENT = 'commerce:order:new';

export interface NewOrderNotificationEvent {
  orderId: string;
  merchantId: string;
  totalAmount: number;
  itemCount: number;
  timestamp: number;
}

/**
 * 商品库存变更事件
 */
export const PRODUCT_STOCK_CHANGED_EVENT = 'commerce:product:stock:changed';

export interface ProductStockChangedEvent {
  productId: string;
  merchantId: string;
  oldStock: number;
  newStock: number;
  timestamp: number;
}

/**
 * 店铺状态变更事件
 */
export const SHOP_STATUS_CHANGED_EVENT = 'commerce:shop:status:changed';

export interface ShopStatusChangedEvent {
  shopId: string;
  isOpen: boolean;
  timestamp: number;
}

// ==================== 事件发布 ====================

/**
 * 发布订单状态变更事件
 */
export const publishOrderStatusChange = (
  orderId: string,
  oldStatus: string,
  newStatus: string,
  source: 'takeout' | 'seller'
): void => {
  const event: OrderStatusChangedEvent = {
    orderId,
    oldStatus,
    newStatus,
    timestamp: Date.now(),
    source,
  };

  window.dispatchEvent(
    new CustomEvent<OrderStatusChangedEvent>(ORDER_STATUS_CHANGED_EVENT, {
      detail: event,
    })
  );
};

/**
 * 发布新订单通知
 */
export const publishNewOrder = (
  orderId: string,
  merchantId: string,
  totalAmount: number,
  itemCount: number
): void => {
  const event: NewOrderNotificationEvent = {
    orderId,
    merchantId,
    totalAmount,
    itemCount,
    timestamp: Date.now(),
  };

  window.dispatchEvent(
    new CustomEvent<NewOrderNotificationEvent>(NEW_ORDER_NOTIFICATION_EVENT, {
      detail: event,
    })
  );
};

/**
 * 发布库存变更事件
 */
export const publishProductStockChange = (
  productId: string,
  merchantId: string,
  oldStock: number,
  newStock: number
): void => {
  const event: ProductStockChangedEvent = {
    productId,
    merchantId,
    oldStock,
    newStock,
    timestamp: Date.now(),
  };

  window.dispatchEvent(
    new CustomEvent<ProductStockChangedEvent>(PRODUCT_STOCK_CHANGED_EVENT, {
      detail: event,
    })
  );
};

/**
 * 发布店铺状态变更事件
 */
export const publishShopStatusChange = (
  shopId: string,
  isOpen: boolean
): void => {
  const event: ShopStatusChangedEvent = {
    shopId,
    isOpen,
    timestamp: Date.now(),
  };

  window.dispatchEvent(
    new CustomEvent<ShopStatusChangedEvent>(SHOP_STATUS_CHANGED_EVENT, {
      detail: event,
    })
  );
};

// ==================== 事件订阅 ====================

/**
 * 订阅订单状态变更
 */
export const subscribeOrderStatusChange = (
  handler: (event: OrderStatusChangedEvent) => void
): (() => void) => {
  const listener = (e: Event) => {
    const customEvent = e as CustomEvent<OrderStatusChangedEvent>;
    handler(customEvent.detail);
  };

  window.addEventListener(ORDER_STATUS_CHANGED_EVENT, listener);
  return () => window.removeEventListener(ORDER_STATUS_CHANGED_EVENT, listener);
};

/**
 * 订阅新订单通知
 */
export const subscribeNewOrder = (
  handler: (event: NewOrderNotificationEvent) => void
): (() => void) => {
  const listener = (e: Event) => {
    const customEvent = e as CustomEvent<NewOrderNotificationEvent>;
    handler(customEvent.detail);
  };

  window.addEventListener(NEW_ORDER_NOTIFICATION_EVENT, listener);
  return () => window.removeEventListener(NEW_ORDER_NOTIFICATION_EVENT, listener);
};

/**
 * 订阅库存变更
 */
export const subscribeProductStockChange = (
  handler: (event: ProductStockChangedEvent) => void
): (() => void) => {
  const listener = (e: Event) => {
    const customEvent = e as CustomEvent<ProductStockChangedEvent>;
    handler(customEvent.detail);
  };

  window.addEventListener(PRODUCT_STOCK_CHANGED_EVENT, listener);
  return () => window.removeEventListener(PRODUCT_STOCK_CHANGED_EVENT, listener);
};

/**
 * 订阅店铺状态变更
 */
export const subscribeShopStatusChange = (
  handler: (event: ShopStatusChangedEvent) => void
): (() => void) => {
  const listener = (e: Event) => {
    const customEvent = e as CustomEvent<ShopStatusChangedEvent>;
    handler(customEvent.detail);
  };

  window.addEventListener(SHOP_STATUS_CHANGED_EVENT, listener);
  return () => window.removeEventListener(SHOP_STATUS_CHANGED_EVENT, listener);
};
```

### 4.2 在 takeout 中集成

```typescript
// src/appsrc/apps/takeout/store/slices/orderSlice.ts

import { 
  publishOrderStatusChange, 
  publishNewOrder 
} from '../../../shared/business/commerce/messageBridge';

export const createTakeoutOrderSlice = (set, get) => ({
  // 提交订单时发布新订单通知
  submitCartAsOrder: (merchantId) => {
    let nextOrderId: string | null = null;

    set((state) => {
      // ... 现有逻辑 ...

      const order: DeliveryOrder = {
        // ... 订单数据 ...
      };

      nextOrderId = order.id;

      // 🆕 发布新订单通知（商家端会收到）
      publishNewOrder(
        order.id,
        order.merchantId,
        order.payableAmount,
        order.lines.length
      );

      return {
        orders: [order, ...state.orders],
        // ...
      };
    });

    return nextOrderId;
  },

  // 更新订单状态时发布事件
  updateOrderStatus: (orderId, status) => {
    set((state) => {
      const order = state.orders.find(o => o.id === orderId);
      const oldStatus = order?.status || 'unknown';

      const updatedOrders = state.orders.map((o) => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          status,
          timeline: [
            {
              id: `timeline-${Date.now()}`,
              kind: status,
              label: getStatusLabel(status),
              at: Date.now(),
            },
            ...o.timeline,
          ],
        };
      });

      // 🆕 发布订单状态变更事件
      publishOrderStatusChange(orderId, oldStatus, status, 'takeout');

      return {
        orders: updatedOrders,
      };
    });
  },
});
```

### 4.3 在 seller 中集成

```typescript
// src/appsrc/apps/seller/SellerApp.tsx

import { 
  subscribeNewOrder,
  subscribeOrderStatusChange,
  subscribeProductStockChange,
  subscribeShopStatusChange,
} from '../../shared/business/commerce/messageBridge';

export const SellerApp: React.FC<SellerAppProps> = ({ onClose }) => {
  const { 
    orders, 
    addOrder, 
    updateOrderStatus,
    setNewOrderCount,
  } = useSellerStore();

  // 监听新订单
  useEffect(() => {
    const unsubscribe = subscribeNewOrder((event) => {
      const { orderId, merchantId, totalAmount, itemCount } = event;
      
      // 只处理自己店铺的订单
      if (merchantId !== currentShopId) return;

      // 从存储中读取完整订单数据
      const order = await readSellerOrder(orderId);
      if (order) {
        addOrder(order);
        // 播放提示音
        playNotificationSound();
        // 显示弹窗
        showNewOrderNotification(order);
        // 更新角标
        setNewOrderCount(prev => prev + 1);
      }
    });

    return unsubscribe;
  }, [currentShopId]);

  // 监听订单状态变更
  useEffect(() => {
    const unsubscribe = subscribeOrderStatusChange((event) => {
      const { orderId, newStatus, source } = event;
      
      // 如果是商家端发起的变更，不需要重复处理
      if (source === 'seller') return;

      // 更新本地订单状态
      updateOrderStatus(orderId, newStatus as SellerOrderStatus);
    });

    return unsubscribe;
  }, []);

  // 监听库存变更
  useEffect(() => {
    const unsubscribe = subscribeProductStockChange((event) => {
      const { productId, newStock } = event;
      // 更新本地商品库存
      updateProductStock(productId, newStock);
    });

    return unsubscribe;
  }, []);

  return (
    // ... App UI ...
  );
};
```

---

## 五、完整流程示例

### 5.1 用户下单 → 商家接单流程

```
┌──────────┐                    ┌──────────┐                    ┌──────────┐
│  takeout │                    │ Event Bus│                    │  seller  │
│ (用户端)  │                    │          │                    │ (商家端)  │
└────┬─────┘                    └────┬─────┘                    └────┬─────┘
     │                               │                               │
     │ 1. 用户选择商品、提交订单      │                               │
     │───────────────────────────────│                               │
     │                               │                               │
     │ 2. 保存订单到 IndexedDB        │                               │
     │    (role_states:user-xxx)     │                               │
     │                               │                               │
     │ 3. 发布 NEW_ORDER_EVENT       │                               │
     │──────────────────────────────>│                               │
     │                               │                               │
     │                               │ 4. 监听到新订单事件            │
     │                               │──────────────────────────────>│
     │                               │                               │
     │                               │ 5. 读取订单详情                │
     │                               │    (role_states:seller-xxx)   │
     │                               │                               │
     │                               │ 6. 播放提示音 + 显示弹窗       │
     │                               │                               │
     │                               │ 7. 商家点击"接单"              │
     │                               │<──────────────────────────────│
     │                               │                               │
     │                               │ 8. 更新订单状态为 accepted     │
     │                               │    发布 ORDER_STATUS_CHANGED  │
     │                               │──────────────────────────────>│
     │                               │                               │
     │ 9. 监听到状态变更事件          │                               │
     │<──────────────────────────────│                               │
     │                               │                               │
     │ 10. 更新用户端订单状态         │                               │
     │    显示"商家已接单"            │                               │
     │                               │                               │
```

### 5.2 代码实现

```typescript
// ========== 用户端：提交订单 ==========
// src/appsrc/apps/takeout/store/slices/orderSlice.ts

submitCartAsOrder: (merchantId) => {
  set((state) => {
    // ... 构建订单 ...
    
    const order: DeliveryOrder = {
      id: generateId('order'),
      merchantId,
      status: 'paid',
      // ...
    };

    // 保存到用户端存储
    const nextOrders = [order, ...state.orders];
    
    // 保存到共享存储（商家端可访问）
    await appendSellerOrder(order);

    // 发布新订单通知
    publishNewOrder(
      order.id,
      order.merchantId,
      order.payableAmount,
      order.lines.length
    );

    return { orders: nextOrders };
  });
}

// ========== 商家端：监听新订单 ==========
// src/appsrc/apps/seller/SellerApp.tsx

useEffect(() => {
  const unsubscribe = subscribeNewOrder(async (event) => {
    const { orderId, merchantId } = event;
    
    // 验证是自己店铺的订单
    if (merchantId !== shop.id) return;

    // 从共享存储读取
    const order = await readSellerOrder(orderId);
    if (!order) return;

    // 添加到本地状态
    addOrder(order);

    // 通知用户
    playNotificationSound();
    showToast(`新订单！${order.merchantName}`);
    setNewOrderCount(prev => prev + 1);
  });

  return unsubscribe;
}, [shop.id]);

// ========== 商家端：接单 ==========
// src/appsrc/apps/seller/store/slices/orderSlice.ts

acceptOrder: async (orderId) => {
  const order = get().orders.find(o => o.id === orderId);
  if (!order) return;

  const oldStatus = order.status;
  const newStatus = 'accepted';

  // 更新订单
  const updatedOrder = {
    ...order,
    status: newStatus,
    acceptedAt: Date.now(),
    timeline: [
      {
        id: `timeline-${Date.now()}`,
        kind: newStatus,
        label: '商家已接单',
        at: Date.now(),
      },
      ...order.timeline,
    ],
  };

  // 保存到存储
  await updateSellerOrderStatus(orderId, newStatus);

  // 更新本地状态
  set((state) => ({
    orders: state.orders.map(o => o.id === orderId ? updatedOrder : o),
  }));

  // 发布状态变更事件（用户端会收到）
  publishOrderStatusChange(orderId, oldStatus, newStatus, 'seller');
}
```

---

## 六、数据一致性保障

### 6.1 乐观更新 + 冲突检测

```typescript
// 更新订单时检查版本号
updateOrderStatus: async (orderId, newStatus) => {
  const order = await readSellerOrder(orderId);
  if (!order) throw new Error('订单不存在');

  // 检查是否有冲突（订单已被其他端更新）
  if (order.version !== localVersion) {
    // 冲突处理：重新加载或提示用户
    throw new Error('数据已变更，请刷新后重试');
  }

  // 更新并增加版本号
  const updatedOrder = {
    ...order,
    status: newStatus,
    version: order.version + 1,
  };

  await writeSellerOrder(updatedOrder);
}
```

### 6.2 事务处理

```typescript
// 使用 IndexedDB 事务确保原子性
const db = await getDB();
const tx = db.transaction(['role_states', 'delivery_data'], 'readwrite');

try {
  // 1. 更新用户端订单
  await tx.objectStore('role_states').put(userOrder);
  
  // 2. 更新商家端订单
  await tx.objectStore('delivery_data').put(sellerOrder);
  
  // 3. 提交事务
  await tx.done;
  
  // 4. 发布事件
  publishNewOrder(...);
} catch (error) {
  // 事务失败，回滚
  console.error('订单创建失败', error);
  throw error;
}
```

---

## 七、性能优化

### 7.1 数据分页

```typescript
// 订单列表分页加载
loadOrders: async (page: number, pageSize: number = 20) => {
  const allOrders = await readSellerOrders();
  
  // 按时间排序
  const sorted = allOrders.sort((a, b) => b.createdAt - a.createdAt);
  
  // 分页
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const pagedOrders = sorted.slice(start, end);
  
  set({ orders: pagedOrders });
}
```

### 7.2 增量更新

```typescript
// 只更新变更的订单，而不是全量替换
updateSingleOrder: (orderId: string, updater: (order) => DeliveryOrder) => {
  set((state) => ({
    orders: state.orders.map((order) => 
      order.id === orderId ? updater(order) : order
    ),
  }));
}
```

---

## 八、测试清单

### 8.1 功能测试

- [ ] 用户下单后商家端收到通知
- [ ] 商家接单后用户端状态更新
- [ ] 商家拒单后用户端看到拒单状态
- [ ] 库存变更后两端同步
- [ ] 店铺营业状态变更后用户端可见

### 8.2 边界测试

- [ ] 商家休息时用户下单（应阻止或提示）
- [ ] 商品售罄时用户下单（应阻止或提示）
- [ ] 同时处理多个订单
- [ ] 网络中断后恢复同步

### 8.3 性能测试

- [ ] 100+ 订单时列表性能
- [ ] 50+ 商品时管理性能
- [ ] 频繁状态切换的响应速度

---

**文档结束**
