# `/src` 代码规范（基于 2026-04-08 当前框架）

版本：`v1.1`
适用范围：`/src`、`/scripts/check-boundaries.mjs`
目标：统一 baobaobaiphone 的目录边界、App 接入方式、store 持久化、记忆系统接入和质量门禁。

---

## 1. 现状基线（2026-04-08）

### 1.1 规模
- 代码总量：约 `43256` 行（`.ts/.tsx/.css`）
- 文件数量：`198` 个 `.ts`、`135` 个 `.tsx`、`5` 个 `.css`

### 1.2 App 模块规模（`src/appsrc/apps/*`）
- `WeChat`: `56` files / `8520` lines
- `seller`: `14` files / `6226` lines
- `shopping`: `35` files / `4232` lines
- `warmtrack`: `44` files / `4102` lines
- `settings`: `17` files / `4089` lines
- `lovespace`: `31` files / `3875` lines
- `contacts`: `29` files / `2380` lines
- `appmarket`: `23` files / `1258` lines
- `storage`: `10` files / `1121` lines
- `memorycenter`: `3` files / `709` lines
- `worldbook`: `6` files / `391` lines
- `template`: `8` files / `371` lines
- `scheduler`: `2` files / `217` lines
- `weather`: `4` files / `143` lines

### 1.3 重点风险
- 超大文件仍较多（尤其是 `WeChat`、`seller`、`settings`）。
- 历史 cross-app 依赖存在，新增耦合需严格受控。
- 规范文档曾长期写 `src/apps/*`，与真实目录 `src/appsrc/apps/*` 不一致。

---

## 2. 总体架构规则（强制）

1. 本地 App 一律放在 `src/appsrc/apps/<appId>/`。
2. App 自动注册来源为 `src/core/registry.tsx` 的 `import.meta.glob('../appsrc/apps/*/index.ts', { eager: true })`。
3. 新增本地 App 不得手动改注册列表；仅维护该 App 的 `index.ts` manifest。
4. 跨 App 可复用业务逻辑优先放到 `src/appsrc/shared/business/**`，禁止新增深层 UI 互相引用。
5. `src/core/**` 与 `src/appsrc/shared/business/**` 不得依赖 `src/appsrc/apps/**`。
6. 所有源码和文档统一 UTF-8（建议无 BOM），禁止乱码和 `\uXXXX` 常驻业务文案。

---

## 3. 目录与职责边界

### 3.1 顶层目录
- `src/core`：系统内核能力（注册、SDK、存储、核心 store、widget、memory center）。
- `src/components`：系统通用组件（跨 app 复用）。
- `src/appsrc/apps`：业务 App。
- `src/appsrc/shared/business`：跨 app 共享业务域（例如 commerce）。
- `src/types`：全局共享类型（按需使用）。

### 3.2 App 目录最小结构

```text
src/appsrc/apps/<appId>/
  index.ts
  <AppName>App.tsx
  types.ts
  store.ts              # 可选，但有状态时建议提供
  components/
    index.ts            # 若存在 components 目录则必须提供
```

### 3.3 Manifest 规范
- `index.ts` 默认导出 `AppManifest`。
- 必填：`id`、`name`、`icon`、`component`。
- 可选：`description`、`version`、`market`、`permissions`、`isSystem`。
- `id` 必须全局唯一，且与存储 key 命名语义一致。

---

## 4. 命名与导入规范

1. 组件文件：`PascalCase.tsx`。
2. 逻辑文件：`camelCase.ts`。
3. 样式文件：`FeatureName.module.css`。
4. Hook 命名：`useXxx`。
5. 回调命名：props 用 `onXxx`，内部处理用 `handleXxx`。
6. 导入顺序：React/运行时 -> 第三方 -> core/sdk -> 同 app -> 样式。
7. App 代码访问系统能力优先通过 `@baobaobaiOS/sdk`（如 `useGlobalSettingsStore`、`useGlobalDesktopStore`、`useGlobalWorldBookStore`、`getGlobalSettingsSnapshot`）。

---

## 5. Store 与持久化规范（重点）

### 5.1 Store 设计
- 每个 app 保留一个主入口 `store.ts`（可在其下再切 `store/slices/*`）。
- 禁止把 A app 的业务状态写到 B app 的 store。

### 5.2 持久化 API（强制）
- 首选：`createAppPersistOptions({ appId })`（`src/core/persistOptions.ts`）。
- Core store 使用：`createCorePersistOptions(...)`。
- 对 role-scoped 状态（如 `wechat`、`warmtrack`），优先使用 app 内 repository + 独立 object store（建议 `role_states`），并以 `roleId` 作为记录 key。
- 不建议在同一 object store 通过 key 前缀（如 `role-state:<id>`）模拟分表。
- 若必须直接使用 `createIdbJSONStorage`，必须传入 `IdbStoreConfig`，不得使用无参旧写法。

### 5.3 持久化边界
- 通过 `partialize` 控制落盘字段。
- 临时 UI 状态（如浮层开关）默认不持久化。
- 对 role-scoped app，`activeRoleId` 不应作为长期持久化事实来源；应在运行时从角色主源（contacts active role）同步。
- 不新增 `legacy/compat/migrate` 常驻迁移分支。

---

## 6. 边界与依赖治理（强制）

### 6.1 Lint 门禁
- `npm run lint` 必须通过。
- 当前 lint 包含：
  - `lint:types` (`tsc --noEmit`)
  - `lint:boundaries` (`node scripts/check-boundaries.mjs`)

### 6.2 跨 App 依赖
- 新增跨 app import 默认禁止。
- 只有边界脚本 allowlist 中的历史依赖可暂存；新增例外必须先评审。
- 能抽象的能力统一下沉到 `src/appsrc/shared/business/**`。

---

## 7. 记忆系统接入规范

1. 记忆数据入口统一使用 `createAppMemoryApi('<appId>')`。
2. 若需要记忆中心展示来源名/联系人名，提供 `memoryModule.ts`。
3. 记忆模块自动发现路径是 `src/appsrc/apps/*/memoryModule.ts`。
4. `manifest.id`、`createAppMemoryApi('<appId>')`、`memoryModule.appId` 三者必须一致。
5. 支持删除消息的 app 必须同步调用 `removeBySessionSources`。

---

## 8. UI 与样式规范

1. 常规布局优先 Tailwind。
2. 复杂动效/伪元素优先 CSS Modules。
3. 不在多个文件重复硬编码同一批主题色；可复用值提到 `system.css` 或 app 级常量。
4. 组件超过复杂阈值时先拆分再迭代。
5. 编辑型页面默认采用“固定 header + 中间唯一滚动区 + 固定 footer”结构，外层使用 `flex-col + overflow-hidden`，只允许 `main` 滚动。
6. 表单编辑页在键盘场景下必须接入 `useKeyboardViewportStabilizer(...)`，并保证输入聚焦和键盘视口变化时，焦点输入保持在中间滚动区内，避免把标题区整体顶走。
7. iOS 表单页如果出现整页随键盘跳动，优先用 `useMobileViewportPageStyle(false)` 或按编辑态条件关闭 `visualViewport` 跟随。
8. 推荐把滚动定位抽到 `src/core/mobileViewport.ts` 等底层工具；页面侧在滚动容器上增加 `onFocusCapture`，输入框一聚焦就连续补几次定位，覆盖键盘动画过程中的延迟。

建议阈值：
- 逻辑文件 > `350` 行：评估拆分。
- 逻辑文件 > `500` 行：必须拆分。
- 单容器 JSX 体量过大：拆出 section 组件。

---

## 9. 单 HTML 交付约束（保留）

1. 构建命令：`npm run build`。
2. 构建后 `dist/` 仅允许 `index.html`。
3. 不允许输出 `icons/**`、`widgets/**`、`assets/**` 等额外目录。
4. 运行时静态资源应通过 `src/**` 导入并参与打包内联，避免依赖 `public/**` 直出。

---

## 10. 反模式清单（禁止）

1. 新增 `src/apps/*` 路径下代码（历史路径已废弃）。
2. App 手动接入全局注册清单（绕开 auto-discovery）。
3. 新增跨 app 深层 UI 引用。
4. 在 app 内直接实现第二套独立 memory 主存储。
5. 新增无参 `createIdbJSONStorage()` 旧写法。
6. 把乱码注释、乱码文案提交到主分支。

---

## 11. 新建 App 示例

```ts
import type { AppManifest } from '@baobaobaiOS/sdk';
import { DemoApp } from './DemoApp';

const demoManifest: AppManifest = {
  id: 'demo',
  name: '示例',
  icon: 'AppWindow',
  color: '#3B82F6',
  component: DemoApp,
};

export default demoManifest;
```

---

本规范自 `v1.1` 起执行。存量代码按“触碰即治理”原则逐步收敛。


