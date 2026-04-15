# MimisPhone 开发者入门（当前框架版）

本文是基于当前仓库结构的入门说明，重点回答「代码应该写在哪里、怎么接入、怎么避免破坏边界」。

---

## 1. 项目结构速览

- `src/App.tsx`：手机壳层、桌面编排、App 打开/关闭主流程。
- `src/core/**`：系统内核（注册、SDK、存储、核心 store、memory center）。
- `src/components/**`：系统通用组件。
- `src/appsrc/apps/**`：业务 App 主目录（团队主要开发区）。
- `src/appsrc/shared/business/**`：跨 app 共享业务域。
- `skills/miniphone-dev/**`：本仓库内的 App 开发技能文档和脚手架脚本。

注意：历史文档中的 `src/apps/**` 路径已废弃，当前统一使用 `src/appsrc/apps/**`。

---

## 2. 新建 App 的标准流程

### 2.1 使用脚手架（推荐）

```powershell
powershell -ExecutionPolicy Bypass -File skills/miniphone-dev/scripts/new-mimiphone-app.ps1 -AppId my-app -Name "My App" -IncludeStore
```

可选参数：
- `-IncludeMemoryModule`
- `-Force`
- `-Icon` `-Color` `-Description` `-MarketIcon`

### 2.2 生成后会得到

```text
src/appsrc/apps/<appId>/
  index.ts
  <AppName>App.tsx
  types.ts
  store.ts              # 如果使用 -IncludeStore
  memoryModule.ts       # 如果使用 -IncludeMemoryModule
```

### 2.3 注册机制（重要）

- 本地 app 由 `src/core/registry.tsx` 自动扫描 `src/appsrc/apps/*/index.ts`。
- 不需要手动维护“应用注册表”。
- 是否系统应用由 manifest `isSystem` 和 `src/core/systemApps.ts` 协同控制。

---

## 3. 状态与持久化

1. 每个 app 独立维护自己的 `store.ts`（可拆 `store/slices/*`）。
2. 持久化优先使用 `createAppPersistOptions({ appId })`（`src/core/persistOptions.ts`）。
3. role-scoped app（如 WeChat、WarmTrack）优先采用独立 object store（例如 `role_states`），并以 `roleId` 作为 key。
4. role-scoped app 的当前身份应从 contacts active role 同步，不把 app 本地 `activeRoleId` 作为长期事实来源。
5. 禁止新增无参 `createIdbJSONStorage()` 旧写法。
6. 临时 UI 状态默认不落盘。

---

## 4. 跨 App 协作边界

1. 禁止新增跨 app 深层 UI 引用。
2. 跨 app 可复用业务逻辑应放入 `src/appsrc/shared/business/**`。
3. `src/core/**` 与 `src/appsrc/shared/business/**` 不得依赖 `src/appsrc/apps/**`。
4. 运行 `npm run lint` 会执行边界检查（`scripts/check-boundaries.mjs`）。

---

## 5. 记忆中心接入

1. 使用 `createAppMemoryApi('<appId>')` 记录/查询/删除记忆。
2. 需要自定义来源标签或联系人解析时，新增 `memoryModule.ts`。
3. 记忆模块扫描路径是 `src/appsrc/apps/*/memoryModule.ts`。
4. `manifest.id`、memory API `appId`、`memoryModule.appId` 必须一致。

---

## 6. 提交前检查

1. `npm run lint` 通过（包含类型与边界检查）。
2. 若涉及构建交付，执行 `npm run build`，确认 `dist/` 仅有 `index.html`。
3. 文案无乱码，编码为 UTF-8。
4. 新增组件已通过 `components/index.ts` 对外导出（如有 `components` 目录）。

---

## 7. 常见误区

1. 把代码写到 `src/apps/**`。
2. 手动改 registry 注册本地 app。
3. 在 app 中直接耦合另一个 app 的 store 细节。
4. 为了兼容旧数据引入常驻 `legacy/compat/migrate` 流程。

---

建议与 `design/code/template.md`、`design/code/memory.md`、`skills/miniphone-dev/SKILL.md` 配套阅读。

