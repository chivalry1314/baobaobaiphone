# 应用底部导航与底部操作栏规范

版本：`v1.0`
适用范围：`src/appsrc/apps/**`
目标：统一底部导航、底部操作栏、输入栏在 iOS 安全区与键盘场景下的落点，默认与微信底部导航位置对齐。

---

## 1. 规范分层

### 1.1 标准底部导航
- 适用：主 Tab 栏、首页 Dock、底部切换栏。
- 目标：与微信底部导航位置一致，贴近物理底部，但保留系统安全区。
- 默认做法：只吃一层安全区，不额外再抬高。

### 1.2 上抬型底部操作栏
- 适用：发布商品、编辑商品、新增步骤、保存/取消、桌面编辑工具栏。
- 目标：按钮比标准底部导航再往上抬一点，避免过贴底部。
- 默认做法：安全区基础上再加 `24px`。

### 1.3 输入栏 / 聊天栏
- 适用：聊天输入框、消息发送栏、底部 composer。
- 目标：键盘弹起时输入栏贴住键盘顶部；键盘收起后恢复安全区。

---

## 2. 标准底部导航写法

### 2.1 Tailwind / JSX

```tsx
<footer className="w-full shrink-0 border-t border-gray-200 bg-white px-4 pt-2 safe-area-bottom">
  ...
</footer>
```

### 2.2 CSS Modules

```css
.footer {
  position: absolute;
  left: 0;
  right: 0;
  bottom: env(safe-area-inset-bottom, 0px);
  height: 66px;
  padding: 6px 18px 10px;
  border-top: 1px solid #e8edf4;
  background: #fff;
}

.content {
  padding-bottom: calc(86px + env(safe-area-inset-bottom, 0px));
}
```

### 2.3 强制规则
- 标准底部导航优先使用 `safe-area-bottom` 或 `bottom: env(safe-area-inset-bottom, 0px)`。
- 导航自身只能吃一层安全区，禁止重复叠加。
- 内容滚动区域必须预留“导航高度 + 安全区”。

---

## 3. 上抬型底部操作栏写法

### 3.1 Tailwind / JSX

```tsx
<footer className="border-t bg-white px-4 pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+24px)]">
  ...
</footer>
```

### 3.2 CSS Modules

```css
.publishFooter {
  border-top: 1px solid #e5e7eb;
  background: #fff;
  padding: 10px 12px calc(env(safe-area-inset-bottom, 0px) + 24px);
}
```

### 3.3 适用判断
- 用户说“往上挪一点”“按钮不要太贴底”“和编辑页一致”，默认用这一档。
- 如果用户说“和微信底部导航一致”，优先回到标准底部导航，不额外加 `24px`。

---

## 4. 输入栏 / Composer 写法

### 4.1 键盘收起
- 保留 `safe-area-bottom` 或 `env(safe-area-inset-bottom, 0px)`。

### 4.2 键盘弹起
- 移除输入栏自身底部安全区，让输入栏直接贴住键盘顶部。
- 不要再保留 `pb-safe`，否则会在输入栏和键盘之间露缝。

### 4.3 典型模式

```tsx
const bottomPaddingClass = isKeyboardVisible ? 'pb-0' : 'pb-safe';
```

```css
.composer {
  position: absolute;
  left: 0;
  right: 0;
  bottom: env(safe-area-inset-bottom, 0px);
  height: 62px;
  padding: 8px 10px 8px;
}

.content {
  padding-bottom: calc(86px + env(safe-area-inset-bottom, 0px));
}
```

---

## 5. 禁止写法

### 5.1 重复安全区
- `safe-area-bottom` 和 `pb-safe` 同时加在同一个底栏上。
- `bottom: env(...)` 后又在同一底栏 `padding-bottom: calc(... + env(...))`，导致整体抬过头。

### 5.2 内容未预留底部空间
- 只改底栏位置，不同步补 content 的 `padding-bottom`，会造成列表被遮挡。

### 5.3 键盘场景保留底部安全区
- 聊天输入栏键盘弹起时仍保留 `pb-safe`，会导致输入框和键盘之间出现空隙。

---

## 6. 现有对齐基线

以下实现可以作为当前仓库基线参考：
- 微信标准底部导航：
  `src/appsrc/apps/WeChat/components/WeChatTabBar.tsx`
- 梦音乐底部 Dock：
  `src/appsrc/apps/dreammusic/components/AppDock.tsx`
- 暖迹首页底部切换栏：
  `src/appsrc/apps/warmtrack/WarmTrackApp.tsx`
- 开店吧发布/编辑商品底部操作栏：
  `src/appsrc/apps/seller/SellerApp.module.css`

---

## 7. 提交前检查清单

1. 当前底栏属于“标准导航”还是“上抬型操作栏”。
2. 是否只吃了一层安全区。
3. 内容区是否补足了底部预留。
4. iOS 键盘弹起时输入栏是否贴住键盘。
5. 用户若要求“和微信一致”，是否错误套用了 `+24px` 的上抬规则。
