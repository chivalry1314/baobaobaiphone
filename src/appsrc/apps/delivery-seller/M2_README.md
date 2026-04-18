# delivery-seller M2 实现文档

## 概述

本文档说明了包包白小手机外卖商家 App (delivery-seller) M2 版本实现的核心功能。

## 目录结构

```
delivery-seller/
├── components/
│   ├── ui/                    # 通用 UI 组件
│   │   ├── Toast.tsx          # Toast 提示组件
│   │   ├── Loading.tsx        # 加载指示器
│   │   ├── EmptyState.tsx     # 空状态组件
│   │   ├── ConfirmDialog.tsx  # 确认对话框
│   │   └── index.ts
│   ├── ProductList.tsx        # 商品列表（增强版）
│   ├── ProductForm.tsx        # 商品表单
│   ├── OrderList.tsx          # 订单列表（增强版）
│   ├── OrderDetail.tsx        # 订单详情（增强版）
│   ├── SellerHome.tsx         # 商家首页（增强版）
│   ├── ShopManage.tsx         # 店铺管理（增强版）
│   ├── StatsView.tsx          # 数据统计
│   ├── MarketingManage.tsx    # 营销管理
│   └── index.ts
├── store/
│   ├── slices/
│   │   ├── productSlice.ts    # 商品状态（增强）
│   │   ├── orderSlice.ts      # 订单状态（增强）
│   │   ├── shopSlice.ts       # 店铺状态
│   │   ├── statsSlice.ts      # 统计状态
│   │   └── hydrationSlice.ts  # 数据持久化
│   ├── store.ts               # Store 配置
│   └── types.ts               # 类型定义（增强）
├── utils/
│   └── formatters.ts          # 格式化工具
├── data/
│   └── seed.ts                # 种子数据
├── styles.css                 # 样式文件
└── M2_PLAN.md                 # M2 实现计划
```

## 核心功能实现

### 1. 商品管理

**文件**: `components/ProductList.tsx`, `components/ProductForm.tsx`, `store/slices/productSlice.ts`

**功能**:
- ✅ 商品列表展示（名称、价格、销量、库存、上下架状态）
- ✅ 商品搜索（按名称或描述）
- ✅ 商品分类筛选
- ✅ 添加新商品（表单验证）
- ✅ 编辑商品（加载现有数据）
- ✅ 删除商品（确认对话框）
- ✅ 批量上下架（多选操作）
- ✅ 库存快速调整（低库存提醒 + 快速修改）

**新增 Actions**:
- `batchToggleProductStatus(productIds, status)` - 批量上下架
- `updateProductStock(productId, stock)` - 快速调整库存
- `setProductLoading(loading)` - 设置加载状态
- `setProductError(error)` - 设置错误状态
- `loadProducts()` - 异步加载商品（模拟 API）

### 2. 订单管理

**文件**: `components/OrderList.tsx`, `components/OrderDetail.tsx`, `store/slices/orderSlice.ts`

**功能**:
- ✅ 订单列表展示（订单号、用户、金额、状态、时间）
- ✅ 订单筛选（全部/待处理/制作中/配送中/已完成/已取消）
- ✅ 订单搜索（订单号、用户姓名、手机号）
- ✅ 新订单提醒（红点 badge + Toast 提示）
- ✅ 接单操作（paid → accepted）
- ✅ 开始制作（accepted → preparing）
- ✅ 完成制作/出餐（preparing → delivering）
- ✅ 完成订单（delivering → completed）
- ✅ 拒单操作（填写拒单原因）
- ✅ 订单详情查看（商品明细、配送信息、用户备注）
- ✅ 打印小票（模拟浏览器打印）

**新增 Actions**:
- `completeOrder(orderId)` - 完成订单
- `rejectOrder(orderId, reason)` - 拒单
- `setNewOrderCount(count)` - 设置新订单数量
- `clearNewOrderCount()` - 清除新订单计数
- `setOrderLoading(loading)` - 设置加载状态
- `setOrderError(error)` - 设置错误状态

### 3. 店铺管理

**文件**: `components/ShopManage.tsx`, `store/slices/shopSlice.ts`

**功能**:
- ✅ 店铺信息编辑（名称、描述、公告、温馨提示）
- ✅ 营业状态切换（营业/休息）
- ✅ 自动接单开关
- ✅ 忙碌模式开关
- ✅ 预计备餐时间配置
- ✅ 配送设置（起送价、配送费、打包费）
- ✅ 店铺 Logo 上传（模拟 URL 输入）
- ✅ 店铺头图上传（模拟 URL 输入）
- ⚠️ 配送范围配置（提示暂不支持，需接入地图服务）

### 4. 首页数据概览

**文件**: `components/SellerHome.tsx`

**功能**:
- ✅ 店铺状态卡片（显示营业状态 + 快捷切换）
- ✅ 今日数据卡片（营业额、订单数、店铺评分）
- ✅ 待处理订单提醒（待处理/制作中/配送中/全部）
- ✅ 热销商品 Top 5（按月销量排序）
- ✅ 快捷功能入口（商品管理/店铺设置/营销活动/数据统计）

### 5. 状态管理完善

**文件**: `store/slices/*.ts`, `store/types.ts`, `store/store.ts`

**改进**:
- ✅ 为 product slice 添加 loading 和 error 状态
- ✅ 为 order slice 添加 loading、error 和 newOrderCount 状态
- ✅ 实现模拟 API 调用的异步 actions
- ✅ 完善错误处理逻辑
- ✅ 更新 TypeScript 类型定义

### 6. 通用 UI 组件

**目录**: `components/ui/`

**组件**:

#### Toast 提示组件
- 支持 success、error、warning、info 四种类型
- 自动消失（可配置 duration）
- 手动关闭
- Hook API: `useToast()`
  - `success(message, duration?)`
  - `error(message, duration?)`
  - `warning(message, duration?)`
  - `info(message, duration?)`

#### Loading 加载指示器
- 支持三种尺寸：small、medium、large
- 支持全屏模式（fullScreen）
- 支持覆盖层模式（overlay）
- 自定义加载文本

#### EmptyState 空状态组件
- 自定义图标或图片
- 标题和描述
- 可配置操作按钮

#### ConfirmDialog 确认对话框
- 自定义标题和内容
- 可配置确认/取消按钮文本
- 支持危险操作（红色确认按钮）
- 加载状态显示

## 样式系统

**文件**: `styles.css`

包含以下样式模块:
- 通用样式（页面标题、区块）
- 按钮样式（primary、secondary、success、warning、danger）
- 表单样式（输入框、文本域、选择器）
- 筛选栏样式
- 状态徽章
- 空状态
- Toast 组件动画
- Loading 组件动画
- ConfirmDialog 模态框
- 商品列表（含批量操作栏）
- 订单列表（含状态颜色区分）
- 订单详情（时间线、费用明细）
- 首页（店铺卡片、数据统计、快捷入口）
- 热销商品排行榜
- 店铺管理（开关、图片上传）

## 使用示例

### 在组件中使用 Toast

```tsx
import { useToast } from './ui';

const MyComponent = () => {
  const { success, error } = useToast();
  
  const handleSave = () => {
    try {
      // 保存逻辑
      success('保存成功！');
    } catch (e) {
      error('保存失败，请重试');
    }
  };
  
  return <button onClick={handleSave}>保存</button>;
};
```

### 使用确认对话框

```tsx
import { ConfirmDialog } from './ui';

const MyComponent = () => {
  const [showConfirm, setShowConfirm] = useState(false);
  
  return (
    <>
      <button onClick={() => setShowConfirm(true)}>删除</button>
      <ConfirmDialog
        visible={showConfirm}
        title="确认删除"
        message="确定要删除此项吗？此操作不可恢复。"
        confirmText="删除"
        confirmType="danger"
        onConfirm={() => {
          // 删除逻辑
          setShowConfirm(false);
        }}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
};
```

### 批量操作商品

```tsx
import { useDeliverySellerStore } from '../store/store';

const ProductList = () => {
  const { batchToggleProductStatus, selectedProducts } = useDeliverySellerStore();
  
  const handleBatchDisable = () => {
    batchToggleProductStatus(
      Array.from(selectedProducts),
      'off'
    );
  };
  
  // ...
};
```

## 模拟 API 调用

当前实现使用 `setTimeout` 模拟异步 API 调用：

```tsx
// 在 slice 中
loadProducts: async () => {
  const state = get();
  state.setProductLoading(true);
  state.setProductError(null);

  try {
    await new Promise((resolve) => setTimeout(resolve, 500));
    // 实际项目中这里会调用 API
    // const products = await api.getProducts();
    state.setProductLoading(false);
  } catch (error) {
    state.setProductError(error instanceof Error ? error.message : '加载失败');
    state.setProductLoading(false);
  }
},
```

## 后续优化建议

### Phase 3 (M3) 建议功能:
1. **真实 API 集成** - 替换模拟数据为真实后端调用
2. **图片上传** - 实现真实的图片上传功能（接入 OSS）
3. **WebSocket 推送** - 新订单实时推送（替代轮询）
4. **打印集成** - 接入蓝牙打印机或云打印服务
5. **地图服务** - 接入地图 API 实现配送范围配置
6. **数据导出** - 订单数据导出为 Excel
7. **多店铺管理** - 支持一个商家管理多个店铺
8. **员工权限** - 添加员工账号和权限管理

## 测试建议

1. **单元测试**: 测试各 slice 的 actions 和 reducers
2. **组件测试**: 测试 UI 组件的交互逻辑
3. **E2E 测试**: 测试完整的业务流程（接单→制作→配送→完成）
4. **性能测试**: 测试大量商品/订单时的渲染性能

## 已知限制

1. 图片上传目前仅支持 URL 输入，未实现文件上传
2. 打印功能使用浏览器原生打印，未接入专业打印服务
3. 配送范围配置需要地图服务支持，当前版本未实现
4. 新订单提醒使用轮询方式，实时性依赖轮询频率
5. 所有数据存储在本地（localStorage），刷新页面会保留但未同步到服务器

## 更新日志

### M2 (2026-04-18)
- ✨ 新增商品批量上下架功能
- ✨ 新增商品库存快速调整
- ✨ 新增订单完成操作
- ✨ 新增订单拒单操作
- ✨ 新增打印小票功能
- ✨ 新增热销商品 Top 5
- ✨ 新增通用 UI 组件库（Toast、Loading、EmptyState、ConfirmDialog）
- 🎨 优化商品列表交互体验
- 🎨 优化订单列表状态展示
- 🎨 优化店铺管理编辑功能
- 🐛 修复状态管理类型定义
- 📝 添加完整样式文件
- 📝 添加 M2 实现文档
