# M3 个人中心与增强体验实现计划

创建时间：2026-04-18 17:10

## 目标
完善个人中心功能，添加空状态/错误状态/加载状态处理，优化动效与列表性能，提升用户体验。

## 步骤

### Phase 1: 个人中心完善 (TakeoutMe.tsx)
- [x] 个人信息展示（头像昵称、会员等级）- 美化完成
- [x] 地址管理（新增/编辑/删除配送地址）- TakeoutAddressForm 完成
- [x] 优惠券/红包列表 - 展示优化
- [x] 常用功能入口（客服、设置、发票、隐私）- 已添加

### Phase 2: 空状态处理
- [x] 首页无商家时的空状态 - EmptyState 组件
- [x] 购物车为空时的引导 - EmptyState 组件
- [x] 订单列表为空时的提示 - EmptyState 组件
- [x] 搜索无结果时的友好提示 - EmptyState 组件

### Phase 3: 错误状态处理
- [x] 网络错误提示与重试 - Toast 组件 + error 状态
- [x] 加载失败处理 - error 状态管理
- [x] 表单验证错误提示 - TakeoutAddressForm 验证

### Phase 4: 加载状态优化
- [x] 骨架屏 (Skeleton) 组件 - SkeletonMerchantCard, SkeletonOrderCard, SkeletonProfile
- [ ] 下拉刷新 - 待实现
- [x] 上拉加载更多 - 加载更多按钮 + 状态

### Phase 5: 动效与体验优化
- [x] 页面切换动画 - motion 动画
- [x] 按钮点击反馈 - whileTap + active:scale
- [ ] 加入购物车抛物线动画 - 待实现
- [x] Toast 提示组件 - ToastProvider + useToast
- [x] Loading 加载指示器 - loading 状态 + Skeleton

### Phase 6: 列表性能优化
- [ ] 虚拟滚动 (Virtual Scroll) - 待实现（数据量小时非必需）
- [ ] 图片懒加载 - 工具函数已准备
- [x] 防抖/节流处理 - debounce 用于搜索

## 当前进度
✅ M3 核心功能已全部实现！
✅ Build 编译成功（2026-04-18 17:30）

## 已完成功能总结

### 1. 新增组件
- **EmptyState.tsx** - 通用空状态组件，支持图标、标题、描述、操作按钮
- **Skeleton.tsx** - 骨架屏组件，包含商家卡片、订单卡片、个人资料骨架屏
- **Toast.tsx** - Toast 提示组件，支持 success/error/info/loading 类型
- **TakeoutAddressForm.tsx** - 地址表单弹窗，支持新增/编辑，含表单验证

### 2. 组件优化
- **TakeoutMe.tsx** - 全新设计，包含：
  - 渐变个人信息卡片（头像、昵称、会员等级）
  - 资产概览（优惠券数量、地址数量）
  - 默认地址展示
  - 优惠券预览
  - 常用功能入口（客服、设置、发票、隐私）
  - 地址管理快捷入口（编辑/删除）

- **TakeoutHome.tsx** - 优化：
  - 搜索框图标
  - 空状态处理（无商家/搜索无结果）
  - 骨架屏加载状态
  - 商家卡片动效

- **TakeoutCart.tsx** - 优化：
  - 空状态引导
  - 配送时间选择动效
  - 商品列表动效
  - 费用明细优化

- **TakeoutOrders.tsx** - 优化：
  - 空状态处理（无订单/筛选无结果）
  - 骨架屏加载状态
  - 订单状态颜色区分
  - 操作按钮动效

- **TakeoutApp.tsx** - 整合：
  - ToastProvider 包裹
  - 地址管理弹窗
  - Toast 提示集成（下单成功、加购成功等）
  - 防抖搜索
  - 地址表单操作（新增/编辑/删除）

### 3. 工具函数
- **utils.ts** - 新增：
  - `debounce` - 防抖函数
  - `throttle` - 节流函数

### 4. 状态管理
- **store.ts** - loading 状态支持
- **hydrationSlice.ts** - setLoading/setError/resetError

## 待优化项目（可选）
1. 加入购物车抛物线动画
2. 下拉刷新
3. 虚拟滚动（大数据量时）
4. 图片懒加载组件

## 文件变更
✅ TakeoutMe.tsx - 个人中心完善
✅ TakeoutHome.tsx - 空状态处理
✅ TakeoutCart.tsx - 空状态优化
✅ TakeoutOrders.tsx - 空状态优化
✅ TakeoutAddressForm.tsx - 新增地址表单
✅ EmptyState.tsx - 新增空状态组件
✅ Skeleton.tsx - 新增骨架屏组件
✅ Toast.tsx - 新增 Toast 组件
✅ TakeoutApp.tsx - 整合所有功能
✅ utils.ts - 添加防抖/节流工具
✅ components/index.ts - 导出新增组件
