# 外卖商家端 App 需求分析与设计方案

**文档版本：** v1.0  
**创建时间：** 2026-04-18  
**项目位置：** `/home/admin/openclaw/workspace/baobaobaiphone/src/appsrc/apps/seller/`

---

## 一、背景与目标

### 1.1 背景

已完成的外卖应用（`takeout`）是**用户端**，实现了完整的 C 端交易链路：浏览商家 → 选择商品 → 规格选择 → 加入购物车 → 结算下单 → 订单详情。

现在需要开发**商家端** App，让商家能够：
- 管理店铺信息和营业状态
- 管理商品（增删改查、上下架、库存）
- 处理订单（接单、制作、配送、完成）
- 查看经营数据统计
- 配置营销活动

### 1.2 目标用户

- 小型餐饮店老板（夫妻店、个体户）
- 连锁店铺店长
- 外卖运营人员

### 1.3 核心场景

| 场景 | 用户故事 |
|------|----------|
| 开店营业 | 早上开门，打开 App 点击"开始营业"，店铺对用户可见 |
| 处理新订单 | 听到订单提醒音，查看订单详情，点击"接单"，开始制作 |
| 商品管理 | 某菜品售罄，快速下架或调整库存 |
| 查看收入 | 晚上打烊前，查看今日营业额和订单数 |
| 活动配置 | 午市时段设置满减活动吸引订单 |

---

## 二、功能需求分析

### 2.1 店铺管理模块

#### 2.1.1 店铺信息配置

| 功能点 | 描述 | 优先级 |
|--------|------|--------|
| 店铺名称 | 修改店铺展示名称 | P0 |
| 店铺公告 | 设置营业公告（如"高峰期可能延迟"） | P1 |
| 营业时间 | 设置每日营业时段（如 9:00-21:00） | P0 |
| 配送范围 | 设置配送距离上限（如 3km） | P1 |
| 起送价 | 设置最低起送金额 | P0 |
| 配送费 | 设置基础配送费 | P0 |

#### 2.1.2 店铺状态管理

| 功能点 | 描述 | 优先级 |
|--------|------|--------|
| 营业/休息切换 | 一键切换店铺营业状态 | P0 |
| 自动打烊 | 到达营业时间终点自动设为休息 | P2 |
| 临时歇业 | 设置临时歇业原因和预计恢复时间 | P2 |

#### 2.1.3 店铺装修

| 功能点 | 描述 | 优先级 |
|--------|------|--------|
| 头图上传 | 设置店铺封面图 | P1 |
| 招牌菜设置 | 选择 3-5 个招牌菜品置顶展示 | P2 |
| 店铺标签 | 设置"出餐快"、"可开发票"等服务标签 | P2 |

### 2.2 商品管理模块

#### 2.2.1 商品列表

| 功能点 | 描述 | 优先级 |
|--------|------|--------|
| 商品列表 | 展示所有商品，支持搜索筛选 | P0 |
| 商品状态 | 显示上架/下架、库存状态 | P0 |
| 批量操作 | 批量上架/下架/删除 | P2 |

#### 2.2.2 商品 CRUD

| 功能点 | 描述 | 优先级 |
|--------|------|--------|
| 新增商品 | 填写名称、描述、价格、图片等 | P0 |
| 编辑商品 | 修改商品信息 | P0 |
| 删除商品 | 删除商品（有订单关联则软删除） | P1 |
| 商品分类 | 关联到商品分类 | P0 |

#### 2.2.3 商品分类管理

| 功能点 | 描述 | 优先级 |
|--------|------|--------|
| 分类列表 | 展示所有分类，支持排序 | P0 |
| 新增分类 | 创建新分类（如"热销"、"主食"） | P0 |
| 编辑分类 | 修改分类名称和排序 | P0 |
| 删除分类 | 删除空分类 | P1 |

#### 2.2.4 商品规格管理

| 功能点 | 描述 | 优先级 |
|--------|------|--------|
| 规格组管理 | 创建规格组（如"口味"、"份量"） | P0 |
| 规格选项 | 添加规格选项（如"微辣"、"加饭"） | P0 |
| 价格浮动 | 设置规格选项的价格增量 | P0 |
| 必填设置 | 设置规格是否必选 | P0 |

#### 2.2.5 库存管理

| 功能点 | 描述 | 优先级 |
|--------|------|--------|
| 库存设置 | 设置商品总库存 | P0 |
| 库存预警 | 库存低于阈值时提醒 | P2 |
| 售罄自动下架 | 库存为 0 时自动下架 | P1 |

#### 2.2.6 上下架管理

| 功能点 | 描述 | 优先级 |
|--------|------|--------|
| 单品上下架 | 单个商品快速上下架 | P0 |
| 定时上下架 | 设置定时任务（如早餐 8 点上架） | P3 |

### 2.3 订单管理模块

#### 2.3.1 新订单提醒

| 功能点 | 描述 | 优先级 |
|--------|------|--------|
| 声音提醒 | 新订单播放提示音 | P0 |
| 弹窗提醒 | 前台弹窗展示新订单摘要 | P0 |
| 角标提醒 | App 图标显示未处理订单数 | P1 |

#### 2.3.2 订单状态流转

```
待接单 → 已接单 → 制作中 → 待配送 → 配送中 → 已完成
   ↓          ↓
  已拒单    已取消
```

| 状态 | 描述 | 可执行操作 |
|------|------|------------|
| 待接单 | 用户已下单，等待商家确认 | 接单、拒单 |
| 已接单 | 商家已确认订单 | 开始制作 |
| 制作中 | 订单正在制作 | 完成制作、呼叫骑手 |
| 待配送 | 制作完成，等待骑手取货 | 呼叫骑手 |
| 配送中 | 骑手已取货正在配送 | 联系骑手、联系用户 |
| 已完成 | 订单完成 | 评价回复 |
| 已取消 | 订单被取消 | 查看原因 |
| 已拒单 | 商家拒绝接单 | - |
| 退款中 | 用户申请退款 | 同意、拒绝 |

#### 2.3.3 订单详情

| 信息项 | 描述 |
|--------|------|
| 订单编号 | 唯一标识 |
| 下单时间 | 用户下单时间 |
| 商品信息 | 商品名称、规格、数量、备注 |
| 配送信息 | 收货地址、联系电话、配送方式 |
| 费用明细 | 商品总价、打包费、配送费、优惠、实付 |
| 用户信息 | 用户名、会员等级（脱敏） |

#### 2.3.4 订单操作

| 功能点 | 描述 | 优先级 |
|--------|------|--------|
| 接单 | 确认接受订单 | P0 |
| 拒单 | 拒绝订单（需选择原因） | P0 |
| 开始制作 | 标记订单进入制作状态 | P0 |
| 完成制作 | 标记制作完成，等待配送 | P0 |
| 呼叫骑手 | 通知骑手取货 | P1 |
| 打印小票 | 连接打印机打印订单小票 | P2 |
| 联系用户 | 拨打用户电话（虚拟号码） | P1 |
| 处理退款 | 审核退款申请 | P1 |

### 2.4 数据统计模块

#### 2.4.1 经营概览

| 指标 | 描述 | 时间维度 |
|------|------|----------|
| 今日营业额 | 当日已完成订单的总实付金额 | 今日 |
| 本月营业额 | 当月已完成订单的总实付金额 | 本月 |
| 订单数量 | 各状态订单数量统计 | 今日/本周/本月 |
| 客单价 | 平均每个订单的金额 | 今日/本周/本月 |

#### 2.4.2 商品分析

| 指标 | 描述 |
|------|------|
| 热销排行 | 按销量排序的商品 TOP10 |
| 销售额排行 | 按销售额排序的商品 TOP10 |
| 库存预警 | 库存低于阈值的商品列表 |

#### 2.4.3 用户评价

| 功能点 | 描述 | 优先级 |
|--------|------|--------|
| 评价列表 | 展示所有用户评价 | P1 |
| 评分统计 | 平均分、各星级分布 | P1 |
| 评价回复 | 回复用户评价 | P2 |
| 差评提醒 | 低分评价特别标记 | P2 |

### 2.5 营销活动模块

#### 2.5.1 满减活动

| 功能点 | 描述 | 优先级 |
|--------|------|--------|
| 创建满减 | 设置满 X 减 Y | P1 |
| 多档满减 | 支持多档位（满 30-5，满 50-10） | P2 |
| 活动时间 | 设置活动开始和结束时间 | P1 |
| 活动开关 | 快速启用/暂停活动 | P1 |

#### 2.5.2 折扣商品

| 功能点 | 描述 | 优先级 |
|--------|------|--------|
| 设置折扣 | 选择商品设置折扣价 | P1 |
| 折扣标签 | 显示"X 折"标签 | P1 |
| 折扣库存 | 设置折扣商品限量 | P2 |

#### 2.5.3 优惠券

| 功能点 | 描述 | 优先级 |
|--------|------|--------|
| 创建优惠券 | 设置面额、使用门槛、有效期 | P2 |
| 发放方式 | 自动发放/用户领取 | P2 |
| 使用统计 | 查看优惠券使用率 | P3 |

#### 2.5.4 新客立减

| 功能点 | 描述 | 优先级 |
|--------|------|--------|
| 开启新客优惠 | 首次下单用户立减 | P2 |
| 设置金额 | 设置立减金额 | P2 |

---

## 三、技术架构设计

### 3.1 应用结构

```
src/appsrc/apps/seller/
├── index.ts                          # App manifest 入口
├── SellerApp.tsx                     # 主容器组件
├── types.ts                          # 数据类型定义
├── uiTypes.ts                        # UI 路由和状态类型
├── store/
│   ├── store.ts                      # 主 store 配置
│   └── slices/
│       ├── shopSlice.ts              # 店铺管理状态
│       ├── productSlice.ts           # 商品管理状态
│       ├── orderSlice.ts             # 订单管理状态
│       ├── statsSlice.ts             # 数据统计状态
│       └── marketingSlice.ts         # 营销活动状态
├── components/
│   ├── SellerHome.tsx                # 首页（数据概览）
│   ├── SellerTopBar.tsx              # 顶部导航栏
│   ├── ShopManage.tsx                # 店铺管理页面
│   ├── ProductList.tsx               # 商品列表
│   ├── ProductForm.tsx               # 商品编辑表单
│   ├── CategoryManage.tsx            # 分类管理
│   ├── OrderList.tsx                 # 订单列表
│   ├── OrderDetail.tsx               # 订单详情
│   ├── OrderTimeline.tsx             # 订单时间线
│   ├── StatsView.tsx                 # 数据统计
│   └── MarketingManage.tsx           # 营销管理
├── data/
│   ├── seed.ts                       # 种子数据
│   └── repositories/
│       └── storePersistRepo.ts       # IndexedDB 持久化配置
└── utils/
    ├── formatters.ts                 # 格式化工具
    └── validators.ts                 # 表单验证
```

### 3.2 与用户端 (takeout) 的关系

```
┌─────────────────────────────────────────────────────────┐
│                    IndexedDB (共享存储)                  │
├──────────────────────────┬──────────────────────────────┤
│      takeout (用户端)     │       seller (商家端)         │
│  ┌────────────────────┐  │  ┌────────────────────────┐  │
│  │  - 浏览商家         │  │  │  - 店铺管理             │  │
│  │  - 下单支付         │◄─┼─┤  - 订单处理             │  │
│  │  - 订单追踪         │  │  │  - 商品管理             │  │
│  │  - 评价             │  │  │  - 数据统计             │  │
│  └────────────────────┘  │  └────────────────────────┘  │
└──────────────────────────┴──────────────────────────────┘
         ▲                            ▲
         │                            │
         └────────────┬───────────────┘
                      │
              订单状态双向同步
```

#### 3.2.1 共享类型定义

部分类型可从 `takeout/types.ts` 复用：
- `DeliveryMerchant` → 扩展为 `SellerShop`
- `DeliveryDish` → 复用
- `DeliveryDishCategory` → 复用
- `DeliveryDishSku` → 复用
- `DeliveryOrder` → 扩展商家视角字段
- `DeliveryOrderStatus` → 复用

#### 3.2.2 共享数据存储

使用 IndexedDB 共享存储，通过 `roleContext` 区分用户端和商家端数据：

```typescript
// 用户端存储键
const USER_STORAGE_KEY = 'takeout:user:role_states';

// 商家端存储键
const SELLER_STORAGE_KEY = 'seller:shop:role_states';
```

#### 3.2.3 订单状态同步

用户端和商家端操作同一订单时，状态需双向同步：

```typescript
// 订单状态变更事件
const ORDER_STATUS_CHANGED_EVENT = 'commerce:order:status:changed';

// 监听事件
window.addEventListener(ORDER_STATUS_CHANGED_EVENT, (e) => {
  const { orderId, newStatus } = e.detail;
  // 更新本地状态
});
```

### 3.3 状态管理设计

#### 3.3.1 Store 结构

```typescript
interface SellerState {
  // 路由
  route: SellerRoute;
  
  // 店铺
  shop: SellerShop | null;
  shopLoading: boolean;
  shopError: string | null;
  
  // 商品
  products: SellerProduct[];
  categories: SellerCategory[];
  productLoading: boolean;
  
  // 订单
  orders: SellerOrder[];
  orderFilters: OrderFilters;
  orderLoading: boolean;
  newOrderCount: number;
  
  // 统计
  stats: ShopStats;
  statsLoading: boolean;
  
  // 营销
  marketing: MarketingConfig;
  
  // 全局
  isHydrated: boolean;
  error: string | null;
}
```

#### 3.3.2 Slice 划分

| Slice | 职责 | 主要 Actions |
|-------|------|--------------|
| `shopSlice` | 店铺信息管理 | `updateShop`, `toggleShopStatus`, `updateShopHours` |
| `productSlice` | 商品和分类管理 | `addProduct`, `updateProduct`, `deleteProduct`, `toggleProductStatus`, `addCategory` |
| `orderSlice` | 订单处理 | `acceptOrder`, `rejectOrder`, `startPreparing`, `completePreparation`, `callRider`, `completeOrder` |
| `statsSlice` | 数据统计 | `loadStats`, `loadProductStats`, `loadReviewStats` |
| `marketingSlice` | 营销活动 | `createPromotion`, `updatePromotion`, `togglePromotion` |

### 3.4 数据类型定义

#### 3.4.1 店铺类型

```typescript
// 店铺类型（扩展自 DeliveryMerchant）
export interface SellerShop {
  id: string;
  name: string;
  logo?: string;
  cover?: string;
  announcement: string;
  notice: string;
  
  // 营业配置
  isOpen: boolean;
  businessHours: BusinessHours;
  deliveryRange: number; // km
  minOrderAmount: number;
  deliveryFee: number;
  avgDeliveryMinutes: number;
  
  // 服务标签
  serviceTags: string[];
  
  // 统计
  rating: number;
  monthlySales: number;
  
  // 时间戳
  createdAt: number;
  updatedAt: number;
}

export interface BusinessHours {
  monday: TimeRange[];
  tuesday: TimeRange[];
  wednesday: TimeRange[];
  thursday: TimeRange[];
  friday: TimeRange[];
  saturday: TimeRange[];
  sunday: TimeRange[];
}

export interface TimeRange {
  start: string; // "09:00"
  end: string;   // "21:00"
}
```

#### 3.4.2 商品类型（复用 takeout）

```typescript
// 直接复用 takeout 的类型
export type SellerProduct = DeliveryDish;
export type SellerCategory = DeliveryDishCategory;
export type SellerProductSku = DeliveryDishSku;
export type SellerProductOption = DeliveryDishOption;
```

#### 3.4.3 订单类型（扩展）

```typescript
// 商家视角的订单（扩展自 DeliveryOrder）
export interface SellerOrder extends DeliveryOrder {
  // 商家操作记录
  acceptedAt?: number;
  preparingAt?: number;
  readyForDeliveryAt?: number;
  
  // 骑手信息
  riderName?: string;
  riderPhone?: string;
  
  // 打印状态
  printed: boolean;
  
  // 备注
  merchantNote?: string;
}

// 订单筛选
export interface OrderFilters {
  status: DeliveryOrderStatus | 'all';
  dateRange: {
    start: number;
    end: number;
  };
  keyword: string;
}
```

#### 3.4.4 统计类型

```typescript
export interface ShopStats {
  // 今日数据
  today: DailyStats;
  
  // 本月数据
  month: MonthlyStats;
  
  // 商品排行
  topProducts: ProductStats[];
  
  // 评价统计
  reviews: ReviewStats;
}

export interface DailyStats {
  revenue: number;        // 营业额
  orderCount: number;     // 订单数
  avgOrderValue: number;  // 客单价
  customerCount: number;  // 顾客数
}

export interface MonthlyStats {
  revenue: number;
  orderCount: number;
  dayByDay: DailyStats[]; // 每日数据
}

export interface ProductStats {
  productId: string;
  productName: string;
  salesCount: number;
  revenue: number;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  recentReviews: Review[];
}

export interface Review {
  id: string;
  orderId: string;
  rating: number;
  comment?: string;
  createdAt: number;
  reply?: string;
}
```

#### 3.4.5 营销类型

```typescript
export interface MarketingConfig {
  promotions: Promotion[];
  coupons: Coupon[];
  newCustomerDiscount: NewCustomerDiscount | null;
}

export interface Promotion {
  id: string;
  type: 'full-reduction' | 'discount' | 'new-customer';
  name: string;
  rules: PromotionRule[];
  startTime: number;
  endTime: number;
  active: boolean;
}

export interface PromotionRule {
  threshold: number; // 满 X
  discount: number;  // 减 Y
}

export interface Coupon {
  id: string;
  title: string;
  thresholdAmount: number;
  discountAmount: number;
  totalQuantity: number;
  usedQuantity: number;
  expiresAt: number;
  active: boolean;
}

export interface NewCustomerDiscount {
  active: boolean;
  discountAmount: number;
}
```

### 3.5 UI 路由设计

```typescript
// uiTypes.ts
export type SellerTab = 'home' | 'orders' | 'products' | 'shop' | 'stats' | 'marketing';

export type SellerScreen =
  | 'home'
  | 'order-list'
  | 'order-detail'
  | 'product-list'
  | 'product-form'
  | 'category-manage'
  | 'shop-manage'
  | 'stats-overview'
  | 'marketing-manage';

export interface SellerRoute {
  tab: SellerTab;
  screen: SellerScreen;
  params?: Record<string, string>;
}
```

---

## 四、实现优先级和排期建议

### 4.1 Milestone 划分

#### M1 - 基础框架（预计 3 天）

**目标：** 完成应用骨架，可运行空壳 App

| 任务 | 文件 | 工时 |
|------|------|------|
| App manifest 配置 | `index.ts` | 0.5h |
| 主容器组件 | `SellerApp.tsx` | 2h |
| 底部 Tab 导航 | `SellerApp.tsx` | 2h |
| 顶部导航栏 | `SellerTopBar.tsx` | 1h |
| Store 结构搭建 | `store/store.ts` | 2h |
| 基础 Slice 框架 | `store/slices/*.ts` | 3h |
| 路由状态管理 | `store/slices/routeSlice.ts` | 1h |
| 持久化配置 | `data/repositories/storePersistRepo.ts` | 2h |
| **小计** | | **13.5h** |

#### M2 - 核心功能（预计 5 天）

**目标：** 实现商品管理和订单处理核心链路

| 任务 | 文件 | 工时 |
|------|------|------|
| **商品管理** | | |
| 商品列表页面 | `components/ProductList.tsx` | 3h |
| 商品编辑表单 | `components/ProductForm.tsx` | 4h |
| 分类管理 | `components/CategoryManage.tsx` | 2h |
| 商品 Slice | `store/slices/productSlice.ts` | 3h |
| **订单管理** | | |
| 订单列表页面 | `components/OrderList.tsx` | 3h |
| 订单详情页面 | `components/OrderDetail.tsx` | 3h |
| 订单时间线组件 | `components/OrderTimeline.tsx` | 2h |
| 订单 Slice | `store/slices/orderSlice.ts` | 4h |
| 新订单提醒 | `SellerApp.tsx` | 2h |
| **店铺管理** | | |
| 店铺管理页面 | `components/ShopManage.tsx` | 3h |
| 店铺 Slice | `store/slices/shopSlice.ts` | 2h |
| **小计** | | **33h** |

#### M3 - 增强功能（预计 3 天）

**目标：** 数据统计和营销活动

| 任务 | 文件 | 工时 |
|------|------|------|
| **数据统计** | | |
| 首页数据概览 | `components/SellerHome.tsx` | 3h |
| 统计页面 | `components/StatsView.tsx` | 3h |
| 统计 Slice | `store/slices/statsSlice.ts` | 3h |
| **营销活动** | | |
| 营销管理页面 | `components/MarketingManage.tsx` | 3h |
| 营销 Slice | `store/slices/marketingSlice.ts` | 3h |
| **小计** | | **15h** |

#### M4 - 与用户端联动（预计 2 天）

**目标：** 实现实时同步和通知

| 任务 | 文件 | 工时 |
|------|------|------|
| 订单状态同步事件 | `shared/business/commerce/` | 2h |
| 实时订单通知 | `SellerApp.tsx` | 2h |
| 库存同步 | `store/slices/productSlice.ts` | 2h |
| 联调测试 | - | 4h |
| **小计** | | **10h** |

### 4.2 总排期

| Milestone | 工时 | 日历天数 |
|-----------|------|----------|
| M1 - 基础框架 | 13.5h | 3 天 |
| M2 - 核心功能 | 33h | 5 天 |
| M3 - 增强功能 | 15h | 3 天 |
| M4 - 联动测试 | 10h | 2 天 |
| **总计** | **71.5h** | **13 天** |

---

## 五、与现有 takeout 应用的集成方案

### 5.1 类型共享

在 `src/appsrc/shared/business/commerce/domain/` 下创建共享类型：

```typescript
// src/appsrc/shared/business/commerce/domain/deliveryTypes.ts
// 这些类型同时被 takeout 和 seller 使用

export interface DeliveryOrder { ... }
export interface DeliveryDish { ... }
export interface DeliveryDishCategory { ... }
export interface DeliveryOrderStatus { ... }
```

### 5.2 存储共享

使用 IndexedDB 共享存储，通过 role 区分：

```typescript
// src/appsrc/shared/business/commerce/domain/storePersistence.ts
export const SELLER_STORAGE_KEY = 'seller:shop:role_states';
export const TAKEOUT_STORAGE_KEY = 'takeout:user:role_states';

// 根据当前激活的 role 读写数据
export const getStorageKey = () => {
  const roleId = getCommerceActiveRoleId();
  return roleId === 'seller' ? SELLER_STORAGE_KEY : TAKEOUT_STORAGE_KEY;
};
```

### 5.3 订单状态同步

通过自定义事件实现两端同步：

```typescript
// src/appsrc/shared/business/commerce/messageBridge.ts

// 订单状态变更事件
export const ORDER_STATUS_CHANGED_EVENT = 'commerce:order:status:changed';

// 发布事件（当订单状态变更时）
export const publishOrderStatusChange = (orderId: string, newStatus: string) => {
  window.dispatchEvent(new CustomEvent(ORDER_STATUS_CHANGED_EVENT, {
    detail: { orderId, newStatus }
  }));
};

// 在 takeout 的 orderSlice 中
import { publishOrderStatusChange } from '../../shared/business/commerce/messageBridge';

updateOrderStatus: (orderId, status) => {
  // ... 更新状态
  publishOrderStatusChange(orderId, status);
}

// 在 seller 的 SellerApp.tsx 中
useEffect(() => {
  const handler = (e: CustomEvent) => {
    const { orderId, newStatus } = e.detail;
    // 更新本地订单状态
  };
  window.addEventListener(ORDER_STATUS_CHANGED_EVENT, handler);
  return () => window.removeEventListener(ORDER_STATUS_CHANGED_EVENT, handler);
}, []);
```

### 5.4 种子数据共享

```typescript
// src/appsrc/apps/seller/data/seed.ts
import { 
  takeoutSeedMerchants, 
  takeoutSeedDishes, 
  takeoutSeedCategories 
} from '../../takeout/data/seed';

// 商家端种子数据直接复用用户端
export const sellerSeedShops = takeoutSeedMerchants.map(merchant => ({
  ...merchant,
  // 扩展商家端特有字段
}));

export const sellerSeedProducts = takeoutSeedDishes;
export const sellerSeedCategories = takeoutSeedCategories;
```

---

## 六、风险与注意事项

### 6.1 数据一致性风险

**问题：** 用户端和商家端同时操作同一订单可能导致状态不一致

**解决方案：**
1. 使用 IndexedDB 事务确保原子性
2. 实现乐观更新 + 冲突检测
3. 关键操作（接单、完成）需要服务端确认（如有后端）

### 6.2 性能风险

**问题：** 订单量大时列表渲染卡顿

**解决方案：**
1. 虚拟列表（react-window）
2. 分页加载
3. 按日期范围筛选

### 6.3 通知可靠性

**问题：** 浏览器后台时可能收不到新订单通知

**解决方案：**
1. 使用 Web Push API
2. 页面可见性变化时主动拉取
3. 声音提醒 + 弹窗双重保障

---

## 七、后续迭代建议

### 7.1 二期功能

- 多店铺管理（连锁）
- 员工账号和权限
- 打印机集成（蓝牙/网络）
- 配送员管理（自配送场景）

### 7.2 三期功能

- 数据导出（Excel）
- 经营建议（AI 分析）
- 供应链对接（自动补货）

---

## 附录

### A. 参考竞品

- 美团商家版
- 饿了么商家版
- 抖音来客

### B. 相关文件索引

| 文件 | 路径 |
|------|------|
| 用户端类型 | `src/appsrc/apps/takeout/types.ts` |
| 用户端 Store | `src/appsrc/apps/takeout/store/` |
| 共享领域模型 | `src/appsrc/shared/business/commerce/domain/` |
| 现有 Seller 框架 | `src/appsrc/apps/seller/` |

### C. 命令参考

```bash
# 查看现有 takeout 实现
cd /home/admin/openclaw/workspace/baobaobaiphone
code src/appsrc/apps/takeout/

# 查看共享业务逻辑
code src/appsrc/shared/business/commerce/
```

---

**文档结束**
