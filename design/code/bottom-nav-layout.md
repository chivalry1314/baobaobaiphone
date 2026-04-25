# 应用底部导航与底部操作栏规范

版本：`v2.0`
更新时间：`2026-04-19`
适用范围：`src/appsrc/apps/**`
目标：统一主导航、Dock、底部操作栏、输入栏在 iOS 安全区与键盘场景下的落点，并与当前仓库真实实现保持一致。

---

## 1. 规范分层

### 1.1 标准底部导航基线
- 适用：主 Tab 栏、首页 Dock、底部切换栏。
- 目标：与微信主导航、微信聊天输入栏收起时的落点一致。
- 默认做法：只吃一层安全区，不额外上抬。
- 当前仓库推荐基线：`pb-safe`。

### 1.2 轻上抬型底部操作栏
- 适用：保存/取消、发布商品、编辑商品、编辑布局工具栏、双按钮操作栏。
- 目标：比标准底部导航略高一点，但不要像旧版 `+32px` 那样抬得过高。
- 默认做法：`calc(env(safe-area-inset-bottom, 0px) + 12px)`。

### 1.3 输入型编辑页
- 适用：新建日记、发布商品、编辑商品、新增步骤、API 设置等表单页。
- 目标：输入时页面不抖动，标题不乱跳，底部按钮不和键盘抢空间。
- 默认做法：页面根容器只允许中间内容区滚动；必要时关闭 `visualViewport` 跟随；文本输入聚焦时，可临时隐藏底部操作栏。

### 1.4 聊天 / Composer
- 适用：微信聊天栏、消息发送栏、底部输入 composer。
- 目标：键盘收起时与标准底部导航一致，键盘弹起时输入栏紧贴键盘。
- 默认做法：收起时 `pb-safe`，弹起时 `pb-0`。

### 1.5 旧 helper 类
- `safe-area-bottom-nav` 仍存在，含义是：`env(...) + var(--app-bottom-nav-lift)`。
- `safe-area-bottom-action` 仍存在，含义是：`env(...) + var(--app-bottom-action-lift)`。
- 当前项目里它们属于“旧的上抬 helper”，不是新的默认基线。

---

## 2. 标准底部导航写法

### 2.1 Tailwind / JSX

```tsx
<footer className="w-full shrink-0 border-t border-gray-200 bg-white px-4 py-2 pb-safe">
  ...
</footer>
```

### 2.2 CSS Modules

```tsx
<nav className={`${styles.tabBar} pb-safe`}>
  ...
</nav>
```

```css
.tabBar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: var(--tab-h);
  padding: 5px 10px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
}

.content {
  padding-bottom: calc(var(--tab-h) + env(safe-area-inset-bottom, 0px));
}
```

### 2.3 强制规则
- 新底栏默认优先使用 `pb-safe`，不要默认套 `safe-area-bottom-nav`。
- 如果底栏本身已经 `bottom: 0`，再用 `pb-safe` 把内容抬起来，不要写成 `bottom: env(...)` 再叠一层安全区。
- 内容区必须预留“可见底栏高度 + 安全区”。
- 用户明确说“和微信主导航一致”“和聊天输入栏收起时一致”，就回到这一档。

### 2.4 何时还能用 `safe-area-bottom-nav`
- 仅在以下场景使用：
- 旧页面保持兼容，不想整体回收高度。
- 用户明确要求“底栏再往上挪一点”。
- 页面视觉稿要求比微信主导航更高的停靠位。

---

## 3. 轻上抬型底部操作栏写法

### 3.1 Tailwind / JSX

```tsx
<footer
  className="border-t bg-white px-4 pt-2"
  style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
>
  ...
</footer>
```

### 3.2 CSS Modules

```css
.publishFooter {
  border-top: 1px solid #e5e7eb;
  background: #fff;
  padding: 10px 12px calc(env(safe-area-inset-bottom, 0px) + 12px);
}
```

### 3.3 适用判断
- 用户说“按钮稍微高一点”“别太贴底”“和这些编辑页一致”，默认用这一档。
- 用户说“和微信底部导航一致”，不要再加 `12px`。
- 除非明确要求老的高抬升视觉，否则不要回到 `+32px`。

### 3.4 旧 `+32px` 的定位
- `safe-area-bottom-action` / `+32px` 现在视为旧版高抬升方案。
- 只有显式要求“再高一点”或必须兼容老页面时才保留。

---

## 4. 输入型编辑页稳定规则

### 4.1 页面结构

```tsx
<div className="absolute inset-0 flex min-h-0 flex-col overflow-hidden">
  <header className="shrink-0">...</header>
  <main className="flex-1 min-h-0 overflow-y-auto">...</main>
  <footer className="shrink-0">...</footer>
</div>
```

编辑页默认必须遵循这套标准结构：
- 固定 `header`
- 中间唯一滚动区 `main`
- 固定 `footer`
- 不能让整页成为滚动容器

### 4.2 强制规则
- 外层必须是 `flex-col + overflow-hidden`。
- 只有中间 `main` 可滚动，禁止整页跟着输入一起滚。
- 标题区和底部区必须是 `shrink-0`。
- 编辑页滚动容器必须接入 `useKeyboardViewportStabilizer(...)`。
- 文本输入聚焦与键盘视口变化时，必须稳定窗口滚动，并把当前焦点输入维持在中间滚动区可见范围内。
- 目标不是“输入框刚好露出来”，而是避免标题区被顶上去、避免 header/footer 跳动、避免整页跟着键盘抖动。
- 推荐把滚动定位能力抽到底层工具（当前仓库为 `src/core/mobileViewport.ts`）。
- 页面侧推荐在中间滚动容器上增加 `onFocusCapture`，输入框一聚焦时连续补几次定位，覆盖键盘动画尚未稳定的阶段。

推荐写法：

```tsx
const contentScrollRef = useRef<HTMLElement | null>(null);
useKeyboardViewportStabilizer(isEditorOpen, contentScrollRef);
const handleFieldFocusCapture = (event: React.FocusEvent<HTMLElement>) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const scrollContainer = contentScrollRef.current;
  if (!scrollContainer) return;
  const alignField = () => scrollFieldIntoViewInContainer(scrollContainer, target);
  alignField();
  window.setTimeout(alignField, 80);
  window.setTimeout(alignField, 180);
  window.setTimeout(alignField, 320);
};

<main
  ref={contentScrollRef}
  onFocusCapture={handleFieldFocusCapture}
  className="flex-1 min-h-0 overflow-y-auto"
>
  ...
</main>
```

### 4.3 iOS 输入时页面抖动
- 如果输入聚焦时整页跟着 `visualViewport` 上下跳，关闭该页面的 `visualViewport` 跟随。

```tsx
const viewportPageStyle = useMobileViewportPageStyle(false);
```

- 若只在编辑态需要冻结，按状态切换：

```tsx
const viewportPageStyle = useMobileViewportPageStyle(!isEditorOpen);
```

### 4.4 输入时隐藏底部按钮区
- 当底部操作栏会和键盘抢空间时，文本输入聚焦后可直接隐藏底部按钮区。

```tsx
const shouldHideFooter = useKeyboardTextEntryActive(isEditorOpen);
```

```tsx
{!shouldHideFooter ? <footer>...</footer> : null}
```

### 4.5 适用场景
- 新建日记
- 新增步骤
- 发布商品 / 编辑商品
- API 设置
- 编辑联系人 / 新增联系人
- 其他“标题固定 + 中间表单滚动 + 底部保存按钮”的编辑页

---

## 5. 聊天 / Composer 写法

### 5.1 键盘收起
- 使用 `pb-safe`。
- 位置与微信主导航基线一致。

### 5.2 键盘弹起
- 输入栏改为 `pb-0`。
- 不再保留额外底部安全区，输入栏直接贴键盘。

### 5.3 典型模式

```tsx
const bottomPaddingClass = isKeyboardVisible ? 'pb-0' : 'pb-safe';
```

### 5.4 强制规则
- 键盘弹起时不要保留 `pb-safe`，否则输入框和键盘之间会出现空隙。
- 聊天消息区必须是唯一滚动区，不能让整页一起滚。
- 标题、消息区、输入栏必须稳定分层。

---

## 6. 禁止写法

### 6.1 重复安全区
- 同一个底栏同时叠 `pb-safe` 和 `safe-area-bottom-*`。
- `bottom: env(...)` 后又在同一元素上加 `padding-bottom: calc(... + env(...))`。

### 6.2 只改底栏，不补内容区
- 只抬高底栏，不同步补内容区 `padding-bottom`，最后一屏内容会被挡住。

### 6.3 输入时保留无效底栏
- 表单页输入时底部按钮栏仍然显示，导致输入框空间被压缩。

### 6.4 整页跟着输入跳
- 根容器跟随 `visualViewport` 位移，但页面又是表单编辑态，导致标题、内容、底栏整体抖动。

---

## 7. 当前仓库基线参考

- 微信主导航：
  `src/appsrc/apps/WeChat/components/WeChatTabBar.tsx`
- 梦音乐底部 Dock：
  `src/appsrc/apps/dreammusic/components/AppDock.tsx`
- 去逛街底部导航：
  `src/appsrc/apps/shopping/components/ShoppingTabBar.tsx`
  `src/appsrc/apps/shopping/ShoppingApp.module.css`
- 微信聊天输入栏：
  `src/appsrc/apps/WeChat/components/WeChatChatInputBar.tsx`
- 暖迹底部操作栏：
  `src/appsrc/apps/warmtrack/WarmTrackApp.tsx`
- 日记心语新建日记：
  `src/appsrc/apps/dailywords/DailyWordsApp.tsx`
- 每日剧本新增步骤：
  `src/appsrc/apps/dailyscript/components/StepEditorOverlay.tsx`
- 开店吧发布/编辑商品：
  `src/appsrc/apps/seller/SellerApp.tsx`
  `src/appsrc/apps/seller/SellerApp.module.css`
- 视口与输入聚焦辅助：
  `src/core/mobileViewport.ts`

---

## 8. 提交前检查清单

1. 当前底栏属于“标准底部导航”“轻上抬操作栏”还是“聊天输入栏”。
2. 是否只吃了一层安全区。
3. 内容区是否预留了底栏可见高度和安全区。
4. iOS 输入时页面有没有整体抖动。
5. 需要时是否隐藏了底部操作栏，而不是让它和键盘同时出现。
6. 若用户要求“和微信一致”，是否误用了 `+12px` 或旧版 `+32px`。
