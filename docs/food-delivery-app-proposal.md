# 仿美团外卖 App 方案（基于 baobaobaiphone）

## 1. 现有项目分析

### 1.1 目录结构与分层

当前项目是“手机桌面容器 + 多应用”的组织方式，核心目录如下：

```text
baobaobaiphone/
├─ src/
│  ├─ App.tsx                         # 系统桌面与应用生命周期（打开/关闭应用、桌面图标、分页）
│  ├─ main.tsx                        # 系统初始化（widget/scheduler/push）
│  ├─ core/                           # 系统层能力（registry、sdk、stores、idb、push）
│  ├─ components/                     # 宿主级组件（状态栏、桌面组件等）
│  ├─ appsrc/
│  │  ├─ apps/                        # 业务应用目录（每个 app 一个子目录）
│  │  └─ shared/business/             # 跨 app 复用领域能力（如 commerce 领域）
├─ scripts/check-boundaries.mjs       # 架构边界检查（禁止随意跨 app 依赖）
├─ docs/
└─ package.json
```

关键结论：
- 业务功能不应直接放在 `core/`；应放在 `src/appsrc/apps/<appId>`。
- 跨应用共享逻辑必须进入 `src/appsrc/shared/business/*`，避免 app 之间直接 import。
- 桌面应用通过 manifest 自动注册，不需要手动维护全局清单。

### 1.2 技术栈

项目技术栈（结合 `README.md` 与 `package.json`）：
- React 19 + TypeScript 5
- Vite 6（主构建）
- Zustand（状态管理）
- Zustand persist + IndexedDB（持久化）
- Tailwind CSS 4 + CSS Modules（样式混用）
- motion（动画）
- idb-keyval（二次封装在 `src/core/idb`）

### 1.3 应用组织方式（manifest / 注册机制）

#### manifest 约定
每个 app 在 `src/appsrc/apps/<appId>/index.ts` 导出 `AppManifest`，典型字段：
- `id/name/icon/color/component`
- `isSystem`（系统应用常驻）
- `market`（应用市场展示信息）
- `description`

#### 自动注册
`src/core/registry.tsx` 使用：
- `import.meta.glob('../appsrc/apps/*/index.ts', { eager: true })`

即：只要新增 app 目录并导出默认 manifest，就会被系统自动发现。

#### 桌面展示与安装逻辑
`src/App.tsx` 中：
- 系统应用（`SYSTEM_APP_IDS`）会自动确保在桌面。
- 非系统本地应用受应用市场安装状态控制（`installedAppIds`）。
- 因此新外卖 app 若 `isSystem: false`，默认需要在 AppMarket 安装后显示。

### 1.4 Store 组织方式

项目存在两类 store 模式：

#### A. 通用 persist 模式（多数 app）
- `create(...) + persist(...)`
- 通过 `createAppPersistOptions/createCorePersistOptions` 或自定义 storage 接入 IndexedDB。

#### B. 自定义 hydration 模式（如 appmarket/warmtrack）
- store 内维护 `isHydrated`
- 提供 `hasXHydrated/onXHydrated/hydrateXStore` 接口
- 用于异步初始化和复杂状态恢复。

#### 典型参考：shopping
`shopping` 使用了“主 store + slices”结构：
- `store.ts`：初始化状态 + 挂载 actions
- `store/actions.ts`：聚合多个 slice
- `store/slices/*`：按职责拆分（catalog/cart/hydration/state）
- `data/repositories/storePersistRepo.ts`：角色隔离持久化（按 roleId 存储）

这套结构非常适合外卖 app 复用。

### 1.5 组件组织方式

典型 app 组织（以 `shopping` 为例）：

```text
apps/shopping/
├─ index.ts                # manifest
├─ ShoppingApp.tsx         # 应用容器/路由状态机
├─ types.ts / uiTypes.ts   # 领域类型 + UI 路由类型
├─ store.ts + store/*      # Zustand 状态
├─ components/*            # 页面与复用组件
└─ data/repositories/*     # 持久化与存储适配
```

模式总结：
- `*App.tsx` 做页面路由编排和业务流程。
- `components/` 放页面段与可复用 UI。
- 数据定义集中在 `types.ts`，防止组件层散落类型。

---

## 2. 仿美团外卖 App 设计

### 2.1 产品定位

目标是在现有“手机桌面生态”中新增一个“外卖”应用，满足核心链路：
- 浏览商家
- 选购商品
- 购物车结算
- 订单跟踪
- 个人中心管理

建议应用信息：
- `appId`: `takeout`
- `name`: `外卖`
- `icon`: `UtensilsCrossed`（lucide）
- `isSystem`: `false`（通过应用市场安装）

### 2.2 功能模块设计（按你的要求）

#### 1) 首页
- 定位栏（当前位置、切换地址）
- 搜索框（商家/商品）
- 营销位（满减、红包、限时）
- 分类快捷入口（快餐、奶茶、烧烤、甜品等）
- 推荐商家流（算法/默认排序）

#### 2) 商家列表
- 筛选：品类、配送时长、起送价、评分、优惠
- 排序：综合、销量、距离、配送费
- 商家卡片：评分、月售、起送、配送费、预计送达
- 支持进入商家详情页

#### 3) 商品（商家详情）
- 店铺头图 + 公告 + 活动标签
- 左侧分类（热销/主食/小吃/饮品）
- 右侧商品列表（规格、月售、加购）
- 规格弹层（口味、份量、加料）
- 底部悬浮购物车（数量、总价、去结算）

#### 4) 购物车
- 按店铺分组展示商品行
- 加减数量、删除、清空店铺
- 选择配送地址
- 配送方式（立即送达/预约送达）
- 费用明细（商品、打包费、配送费、优惠）
- 提交订单

#### 5) 订单
- 订单列表：全部/进行中/已完成/退款
- 订单详情：商品明细、费用、配送状态时间线
- 操作：再来一单、催单、申请售后、评价

#### 6) 个人中心
- 个人信息（头像昵称、会员等级）
- 地址管理
- 优惠券/红包
- 常用功能（客服、设置、发票、隐私）

---

## 3. 页面结构设计

### 3.1 页面路由建议

```ts
type TakeoutTabKey = 'home' | 'orders' | 'me';

type TakeoutScreen =
  | 'home'                // 首页
  | 'merchant-list'       // 商家列表
  | 'merchant-detail'     // 商家详情+商品
  | 'cart'                // 购物车
  | 'checkout'            // 提交订单
  | 'orders'              // 订单列表
  | 'order-detail'        // 订单详情
  | 'me'                  // 个人中心
  | 'addresses'           // 地址管理
  | 'coupons';            // 优惠券
```

### 3.2 页面与组件映射（建议）

- `TakeoutHome`
  - `TakeoutLocationBar`
  - `TakeoutSearchBar`
  - `TakeoutCategoryGrid`
  - `TakeoutMerchantFeed`

- `TakeoutMerchantList`
  - `TakeoutFilterBar`
  - `TakeoutMerchantCard`

- `TakeoutMerchantDetail`
  - `TakeoutMerchantHeader`
  - `TakeoutCategorySidebar`
  - `TakeoutDishList`
  - `TakeoutDishSpecSheet`
  - `TakeoutFloatingCartBar`

- `TakeoutCart`
  - `TakeoutAddressCard`
  - `TakeoutCartGroup`
  - `TakeoutPriceSummary`

- `TakeoutOrders`
  - `TakeoutOrderTabs`
  - `TakeoutOrderCard`

- `TakeoutOrderDetail`
  - `TakeoutOrderTimeline`
  - `TakeoutOrderLines`

- `TakeoutMe`
  - `TakeoutProfileHeader`
  - `TakeoutMenuList`

---

## 4. 数据模型设计

以下模型与现有项目 TypeScript 风格保持一致，可直接落地。

```ts
export type DeliveryBizType = 'fastfood' | 'drink' | 'snack' | 'dessert' | 'fruit';

export interface DeliveryMerchant {
  id: string;
  name: string;
  logo?: string;
  cover?: string;
  bizType: DeliveryBizType;
  rating: number;          // 0-5
  monthlySales: number;
  minOrderAmount: number;  // 起送价
  deliveryFee: number;     // 配送费
  avgDeliveryMinutes: number;
  distanceKm: number;
  promotions: string[];    // 满减/折扣
  tags: string[];          // 品类标签
  isOpen: boolean;
  visible: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface DeliveryDishOption {
  id: string;
  name: string;
  priceDelta: number;
}

export interface DeliveryDishSku {
  id: string;
  name: string;
  options: DeliveryDishOption[];
  required?: boolean;
}

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

export interface DeliveryCartLine {
  id: string;              // line id
  merchantId: string;
  dishId: string;
  dishName: string;
  unitPrice: number;
  qty: number;
  selectedOptions: Array<{ skuId: string; optionId: string; optionName: string; priceDelta: number }>;
  note?: string;
}

export type DeliveryOrderStatus =
  | 'pending-payment'
  | 'paid'
  | 'accepted'
  | 'preparing'
  | 'delivering'
  | 'completed'
  | 'cancelled'
  | 'refunding';

export interface DeliveryAddress {
  id: string;
  name: string;
  phone: string;
  detail: string;
  lat?: number;
  lng?: number;
  isDefault: boolean;
}

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
  createdAt: number;
  paidAt?: number;
  finishedAt?: number;
}
```

### 4.1 Store 结构建议（slice 化）

```ts
interface TakeoutState {
  route: { tab: TakeoutTabKey; screen: TakeoutScreen; params?: Record<string, unknown> };
  merchants: DeliveryMerchant[];
  dishes: DeliveryDish[];
  cartLines: DeliveryCartLine[];
  orders: DeliveryOrder[];
  addresses: DeliveryAddress[];
  activeMerchantId: string | null;
  selectedAddressId: string | null;
  loading: boolean;
  error: string | null;
}
```

建议拆分：
- `merchantSlice`：商家/商品加载、筛选、搜索
- `cartSlice`：加购、改数量、按店铺汇总、金额计算
- `orderSlice`：下单、状态流转、订单筛选
- `profileSlice`：地址、偏好、优惠券
- `routeSlice`：页面切换与参数
- `hydrationSlice`：初始化与恢复

---

## 5. 与现有项目集成方式

### 5.1 新增应用目录（推荐）

```text
src/appsrc/apps/takeout/
├─ index.ts
├─ TakeoutApp.tsx
├─ TakeoutApp.module.css
├─ types.ts
├─ uiTypes.ts
├─ data/
│  ├─ seed.ts
│  └─ repositories/storePersistRepo.ts
├─ store.ts
├─ store/
│  ├─ types.ts
│  ├─ actions.ts
│  └─ slices/
│     ├─ merchantSlice.ts
│     ├─ cartSlice.ts
│     ├─ orderSlice.ts
│     ├─ profileSlice.ts
│     ├─ routeSlice.ts
│     └─ hydrationSlice.ts
└─ components/
   ├─ index.ts
   ├─ TakeoutHome.tsx
   ├─ TakeoutMerchantList.tsx
   ├─ TakeoutMerchantDetail.tsx
   ├─ TakeoutCart.tsx
   ├─ TakeoutOrders.tsx
   └─ TakeoutMe.tsx
```

### 5.2 manifest 集成

在 `src/appsrc/apps/takeout/index.ts` 导出：
- `id: 'takeout'`
- `component: TakeoutApp`
- `market.tags: ['外卖', '配送', '餐饮']`

由于 registry 自动扫描，无需改 `core/registry.tsx`。

### 5.3 Store 与持久化集成

推荐沿用 `shopping` 思路：
- Zustand + persist
- 持久化到 `createAppStoreConfig('takeout', 'role_states')`
- 使用 `getCommerceActiveRoleId()` 做角色隔离（与 contacts/commerce 体系一致）

收益：
- 不破坏 core 存储体系
- 与现有 role 切换行为一致
- 可自然支持多角色“不同外卖数据”

### 5.4 与现有 commerce 域的关系

建议分两阶段：

#### 阶段 A（快速上线，推荐先做）
- 外卖 app 使用独立 `takeout` 数据模型与仓储，不改现有 `commerce/domain` 类型。
- 先完成用户端完整链路（首页到下单）。

#### 阶段 B（深度联动）
- 将外卖商家管理能力接入 `seller`（新增“外卖店铺”类型或店铺模板）。
- 打通商家端发布商品 -> 外卖端实时可见（可复用 `STORES_UPDATED_EVENT` 思路）。

### 5.5 边界约束与注意事项

- 不要从 `takeout` 直接 import 其他 app 的私有文件。
- 跨 app 能力统一放 `src/appsrc/shared/business/*`。
- 完成后需通过 `npm run lint:boundaries`。

---

## 6. 实施计划（建议）

### M1：基础框架（1 天）
- 建立 `takeout` app 骨架（manifest、app 容器、tab、基础路由）
- 完成 seed 数据与基础 store

### M2：核心交易链路（2-3 天）
- 首页/商家列表/商家详情/加购
- 购物车/结算/提交订单
- 订单列表/订单详情

### M3：个人中心与增强体验（1-2 天）
- 地址管理、优惠券、订单筛选
- 空状态、错误态、加载态
- 动效与列表性能优化

### M4：与 seller 生态联动（可选，2 天）
- 商家数据共享与事件刷新
- 统一商家侧发布与运营配置

---

## 7. 方案结论

本方案与 `baobaobaiphone` 当前架构完全兼容：
- 遵循现有 app manifest 自动注册机制
- 复用 Zustand + IndexedDB + slice 化 store 组织
- 保持架构边界（core / app / shared/business）
- 覆盖你要求的六大功能模块：`首页 / 商家列表 / 商品 / 购物车 / 订单 / 个人中心`

可以按 M1-M4 逐步落地，先小步上线 MVP，再扩展商家联动能力。
