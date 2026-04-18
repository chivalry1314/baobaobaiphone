# 商家端 App 开发执行计划

**创建时间：** 2026-04-18  
**项目位置：** `/home/admin/openclaw/workspace/baobaobaiphone/src/appsrc/apps/seller/`

---

## 总体概览

| 阶段 | 目标 | 工时 | 状态 |
|------|------|------|------|
| M1 | 基础框架 | 13.5h | ⏳ 待开始 |
| M2 | 核心功能 | 33h | ⏳ 待开始 |
| M3 | 增强功能 | 15h | ⏳ 待开始 |
| M4 | 联动测试 | 10h | ⏳ 待开始 |

---

## M1 - 基础框架 (13.5h)

### Phase 1.1: 应用入口和容器 (3h)

- [ ] **index.ts** - App manifest 配置 (0.5h)
  ```typescript
  // 参考 takeout/index.ts
  // 配置 id: 'seller', name: '开店吧', icon, color 等
  ```

- [ ] **SellerApp.tsx** - 主容器框架 (1.5h)
  ```tsx
  // 基础结构：
  // - 顶部导航栏
  // - 底部 Tab 导航（home, orders, products, shop, stats, marketing）
  // - 内容区域（根据 route 渲染）
  ```

- [ ] **SellerTopBar.tsx** - 顶部导航组件 (1h)
  ```tsx
  // 显示：
  // - 返回按钮
  // - 页面标题
  // - 店铺状态切换按钮（营业/休息）
  ```

### Phase 1.2: 状态管理框架 (5.5h)

- [ ] **store/store.ts** - 主 Store 配置 (2h)
  ```typescript
  // 使用 Zustand 创建 store
  // 整合所有 slices
  // 配置持久化中间件
  ```

- [ ] **store/slices/routeSlice.ts** - 路由状态 (1h)
  ```typescript
  // 管理当前 tab 和 screen
  // Actions: setRoute, switchTab, navigateTo
  ```

- [ ] **store/slices/shopSlice.ts** - 店铺状态框架 (1h)
  ```typescript
  // 空框架，M2 实现具体逻辑
  // State: shop, shopLoading, shopError
  ```

- [ ] **store/slices/productSlice.ts** - 商品状态框架 (0.5h)
  ```typescript
  // 空框架，M2 实现具体逻辑
  ```

- [ ] **store/slices/orderSlice.ts** - 订单状态框架 (0.5h)
  ```typescript
  // 空框架，M2 实现具体逻辑
  ```

- [ ] **store/slices/statsSlice.ts** - 统计状态框架 (0.25h)
  ```typescript
  // 空框架，M3 实现具体逻辑
  ```

- [ ] **store/slices/marketingSlice.ts** - 营销状态框架 (0.25h)
  ```typescript
  // 空框架，M3 实现具体逻辑
  ```

### Phase 1.3: 持久化配置 (3h)

- [ ] **data/repositories/storePersistRepo.ts** - IndexedDB 持久化 (2h)
  ```typescript
  // 参考 takeout/data/repositories/storePersistRepo.ts
  // 配置 SELLER_STORAGE_KEY
  // 实现 saveToStorage, loadFromStorage
  ```

- [ ] **data/seed.ts** - 种子数据 (1h)
  ```typescript
  // 复用 takeout 的种子数据
  // 创建商家端特有的种子数据（如店铺配置）
  ```

### Phase 1.4: 类型定义 (2h)

- [ ] **types.ts** - 核心数据类型 (1h)
  ```typescript
  // 定义 SellerShop, SellerOrder, ShopStats 等
  // 复用 takeout 的类型（DeliveryDish 等）
  ```

- [ ] **uiTypes.ts** - UI 路由类型 (0.5h)
  ```typescript
  // 定义 SellerTab, SellerScreen, 筛选类型等
  ```

- [ ] **store/types.ts** - Store 类型 (0.5h)
  ```typescript
  // 定义 SellerState, SellerActions, SellerStore
  ```

### M1 交付物检查清单

- [ ] 可以运行一个空的 Seller App
- [ ] 底部 Tab 可以切换
- [ ] Store 可以正常读写
- [ ] 数据可以持久化到 IndexedDB
- [ ] TypeScript 编译无错误

---

## M2 - 核心功能 (33h)

### Phase 2.1: 商品管理 (12h)

- [ ] **components/ProductList.tsx** - 商品列表 (3h)
  ```tsx
  // 功能：
  // - 商品列表展示（图片、名称、价格、销量、状态）
  // - 搜索筛选
  // - 分类筛选
  // - 状态筛选（上架/下架/库存预警）
  // - 快速上下架切换
  // - 点击进入编辑
  ```

- [ ] **components/ProductForm.tsx** - 商品编辑表单 (4h)
  ```tsx
  // 功能：
  // - 基本信息（名称、描述、价格、图片）
  // - 分类选择
  // - 规格管理（SKU）
  // - 库存设置
  // - 表单验证
  // - 保存/取消
  ```

- [ ] **components/CategoryManage.tsx** - 分类管理 (2h)
  ```tsx
  // 功能：
  // - 分类列表（可拖拽排序）
  // - 新增分类
  // - 编辑分类
  // - 删除分类
  ```

- [ ] **store/slices/productSlice.ts** - 商品逻辑完善 (3h)
  ```typescript
  // 实现所有 CRUD actions
  // 与 IndexedDB 集成
  ```

### Phase 2.2: 订单管理 (13h)

- [ ] **components/OrderList.tsx** - 订单列表 (3h)
  ```tsx
  // 功能：
  // - 订单卡片（订单号、时间、商品摘要、总价、状态）
  // - 状态筛选（待处理/进行中/已完成/已取消）
  // - 日期筛选
  // - 搜索
  // - 新订单高亮
  ```

- [ ] **components/OrderDetail.tsx** - 订单详情 (3h)
  ```tsx
  // 功能：
  // - 订单信息（订单号、下单时间、用户信息）
  // - 商品明细
  // - 费用明细
  // - 配送信息
  // - 操作按钮（根据状态动态显示）
  ```

- [ ] **components/OrderTimeline.tsx** - 订单时间线 (2h)
  ```tsx
  // 功能：
  // - 可视化展示订单状态流转
  // - 显示每个状态的时间点
  ```

- [ ] **store/slices/orderSlice.ts** - 订单逻辑完善 (4h)
  ```typescript
  // 实现所有订单操作：
  // - acceptOrder, rejectOrder
  // - startPreparing, completePreparation
  // - callRider, completeOrder
  // 状态流转验证
  ```

- [ ] **SellerApp.tsx** - 新订单提醒 (1h)
  ```tsx
  // 功能：
  // - 监听新订单事件
  // - 播放提示音
  // - 显示弹窗通知
  // - Tab 角标显示未处理数量
  ```

### Phase 2.3: 店铺管理 (8h)

- [ ] **components/ShopManage.tsx** - 店铺管理页面 (3h)
  ```tsx
  // 功能：
  // - 店铺信息编辑（名称、公告、起送价、配送费）
  // - 营业状态切换
  // - 服务标签选择
  // - 保存
  ```

- [ ] **components/ShopHours.tsx** - 营业时间设置 (2h)
  ```tsx
  // 功能：
  // - 每周营业时间设置
  // - 多时段支持（如午市 + 晚市）
  // - 快捷设置（全天营业、自定义）
  ```

- [ ] **store/slices/shopSlice.ts** - 店铺逻辑完善 (3h)
  ```typescript
  // 实现店铺管理 actions
  // 营业时间验证
  // 状态切换逻辑
  ```

### M2 交付物检查清单

- [ ] 可以完整管理商品（增删改查、上下架）
- [ ] 可以处理订单（接单→制作→完成全流程）
- [ ] 可以配置店铺信息和营业时间
- [ ] 新订单有声音和弹窗提醒
- [ ] 数据正确持久化

---

## M3 - 增强功能 (15h)

### Phase 3.1: 数据统计 (8h)

- [ ] **components/SellerHome.tsx** - 首页数据概览 (3h)
  ```tsx
  // 功能：
  // - 今日数据卡片（营业额、订单数、客单价）
  // - 待处理订单数
  // - 快捷入口（接单、商品管理）
  // - 新订单通知
  ```

- [ ] **components/StatsView.tsx** - 统计详情页面 (3h)
  ```tsx
  // 功能：
  // - 趋势图表（营业额、订单数）
  // - 商品排行
  // - 评价统计
  // - 时间维度切换（今日/本周/本月）
  ```

- [ ] **store/slices/statsSlice.ts** - 统计逻辑 (2h)
  ```typescript
  // 从订单数据计算统计指标
  // 支持时间范围筛选
  ```

### Phase 3.2: 营销活动 (7h)

- [ ] **components/MarketingManage.tsx** - 营销管理页面 (3h)
  ```tsx
  // 功能：
  // - 活动列表（满减、折扣、新客立减）
  // - 活动开关
  // - 创建新活动入口
  ```

- [ ] **components/PromotionForm.tsx** - 活动编辑表单 (2h)
  ```tsx
  // 功能：
  // - 活动类型选择
  // - 规则配置（满 X 减 Y）
  // - 时间设置
  // - 活动描述
  ```

- [ ] **store/slices/marketingSlice.ts** - 营销逻辑 (2h)
  ```typescript
  // 实现营销活动 CRUD
  // 活动有效性验证
  ```

### M3 交付物检查清单

- [ ] 首页显示今日经营数据
- [ ] 可以查看统计图表和排行
- [ ] 可以创建和管理营销活动
- [ ] 活动正确应用到订单计算

---

## M4 - 与用户端联动 (10h)

### Phase 4.1: 数据同步 (4h)

- [ ] **shared/business/commerce/messageBridge.ts** - 消息桥接 (2h)
  ```typescript
  // 定义事件：
  // - ORDER_STATUS_CHANGED_EVENT
  // - PRODUCT_STOCK_CHANGED_EVENT
  // - SHOP_STATUS_CHANGED_EVENT
  ```

- [ ] **订单状态同步** (1h)
  ```typescript
  // 用户端下单 → 商家端收到新订单
  // 商家端接单 → 用户端订单状态更新
  ```

- [ ] **库存同步** (1h)
  ```typescript
  // 商家端调整库存 → 用户端实时更新
  ```

### Phase 4.2: 联调测试 (6h)

- [ ] **完整流程测试** (3h)
  ```
  1. 商家端上架商品
  2. 用户端浏览并下单
  3. 商家端收到通知并接单
  4. 商家端更新订单状态
  5. 用户端看到状态变化
  6. 订单完成
  ```

- [ ] **边界情况测试** (2h)
  ```
  - 商家休息时用户下单
  - 商品售罄时用户下单
  - 同时处理多个订单
  - 网络中断恢复
  ```

- [ ] **性能测试** (1h)
  ```
  - 大量订单时列表性能
  - 大量商品时管理性能
  ```

### M4 交付物检查清单

- [ ] 用户端和商家端数据实时同步
- [ ] 新订单及时通知
- [ ] 状态变更双向同步
- [ ] 无明显性能问题

---

## 文件创建清单

### 需要新建的文件

```
src/appsrc/apps/seller/
├── types.ts                          ✅ 已规划
├── uiTypes.ts                        ✅ 已规划
├── store/
│   ├── store.ts                      ⏳ 待创建
│   ├── types.ts                      ⏳ 待创建
│   └── slices/
│       ├── routeSlice.ts             ⏳ 待创建
│       ├── shopSlice.ts              ⏳ 待创建
│       ├── productSlice.ts           ⏳ 待创建
│       ├── orderSlice.ts             ⏳ 待创建
│       ├── statsSlice.ts             ⏳ 待创建
│       └── marketingSlice.ts         ⏳ 待创建
├── components/
│   ├── SellerHome.tsx                ⏳ 待创建
│   ├── SellerTopBar.tsx              ✅ 已存在（需完善）
│   ├── ShopManage.tsx                ⏳ 待创建
│   ├── ShopHours.tsx                 ⏳ 待创建
│   ├── ProductList.tsx               ⏳ 待创建
│   ├── ProductForm.tsx               ⏳ 待创建
│   ├── CategoryManage.tsx            ⏳ 待创建
│   ├── OrderList.tsx                 ⏳ 待创建
│   ├── OrderDetail.tsx               ⏳ 待创建
│   ├── OrderTimeline.tsx             ⏳ 待创建
│   ├── StatsView.tsx                 ⏳ 待创建
│   ├── MarketingManage.tsx           ⏳ 待创建
│   └── PromotionForm.tsx             ⏳ 待创建
├── data/
│   ├── seed.ts                       ⏳ 待创建
│   └── repositories/
│       └── storePersistRepo.ts       ⏳ 待创建
└── utils/
    ├── formatters.ts                 ⏳ 待创建
    └── validators.ts                 ⏳ 待创建
```

### 需要修改的文件

```
src/appsrc/apps/seller/
├── index.ts                          ⚠️ 需完善 manifest
├── SellerApp.tsx                     ⚠️ 需重构为完整 App
└── types.ts                          ⚠️ 需扩展类型定义

src/appsrc/shared/business/commerce/
├── messageBridge.ts                  ⏳ 需新建（事件总线）
└── domain/
    └── deliveryTypes.ts              ⏳ 需新建（共享类型）
```

---

## 开发注意事项

### 1. 类型安全

- 所有组件使用 TypeScript
- 避免使用 `any`，使用明确的类型
- 复用 takeout 的类型，避免重复定义

### 2. 状态管理

- 使用 Zustand 管理状态
- 每个 slice 职责单一
- 异步操作使用 async/await

### 3. 持久化

- 使用 IndexedDB 存储
- 关键操作后立即保存
- 处理存储失败情况

### 4. 性能优化

- 列表使用虚拟滚动（如 react-window）
- 图片懒加载
- 避免不必要的重渲染

### 5. 用户体验

- 加载状态明确
- 错误提示友好
- 操作有确认（删除、拒单等）
- 新订单提醒明显

---

## 进度追踪

### 每日站会模板

```markdown
## YYYY-MM-DD

### 完成
- [ ] 任务 1
- [ ] 任务 2

### 进行中
- [ ] 任务 3

### 阻塞
- [ ] 问题描述

### 明日计划
- [ ] 任务 4
- [ ] 任务 5
```

### Milestone 完成标记

- [ ] **M1** - 基础框架完成
- [ ] **M2** - 核心功能完成
- [ ] **M3** - 增强功能完成
- [ ] **M4** - 联动测试完成

---

## 参考文档

- [需求分析文档](./seller-app-analysis.md)
- [类型定义文档](./seller-app-types.md)
- [takeout 实现参考](../src/appsrc/apps/takeout/)

---

**最后更新：** 2026-04-18
