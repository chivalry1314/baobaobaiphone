# Store Decoupling Target Architecture

## Goal

当前仓库已完成一部分解耦（如 `core/stores/settings`、`core/stores/desktop`、`worldbook` 的 app 适配层），但仍有明显耦合点：

- 多个 app 仍有历史 cross-app 依赖（通过 allowlist 放行）。
- `WeChat / seller / settings` 存在超大文件，状态、业务、UI 混杂。
- 一些业务域（尤其 commerce）虽然已抽到 `shared/business`，但 app 层仍存在重复聚合逻辑。

目标是继续推进：
1. Domain-first 边界。
2. Slice-level 组合。
3. Role-scoped 状态复用。
4. Repository 层隔离持久化。
5. 降低 app 之间直接依赖。

## 现状（已落地）

1. `settings` 与 `desktop` 已在 `src/core/stores/*` 独立。
2. `worldbook` 通过 `registerGlobalWorldBookStoreHook` 暴露 SDK 适配。
3. `appmarket` 已拆为 `store/actions/types` 与 `data/repositories`。
4. lint 已包含边界检查（`scripts/check-boundaries.mjs`）。

## 目标目录布局

```text
src/
  core/
    stores/
      settings/
      desktop/
    persistOptions.ts
    storage.ts
  appsrc/
    shared/
      business/
        commerce/
          domain/
          messageBridge.ts
    apps/
      WeChat/
        store/
          slices/
        data/repositories/
      warmtrack/
        store/
          slices/
        data/repositories/
      lovespace/
        store/
          slices/
        data/repositories/
      contacts/
        store/
          slices/
      appmarket/
        store/
          slices/
        data/repositories/
```

## 设计原则

1. 一个 app 可以有一个 root store，但 root store 只负责组合 slices。
2. 一个 slice 只管理一个有界域状态和动作。
3. store 层做状态迁移，repository 层做持久化格式。
4. 跨域读取优先 query/service，避免直接跨 app 读 store。
5. 新增共享域能力优先进入 `src/appsrc/shared/business/**`。

## 目标契约（建议）

### Base Slice

```ts
export interface SliceMeta {
  isHydrated?: boolean;
}

export interface SliceActionContext<TState> {
  set: (updater: (state: TState) => Partial<TState> | TState) => void;
  get: () => TState;
}
```

### Role Scoped

```ts
export interface RoleScopedEnvelope<TRoleState> {
  activeRoleId: string;
  stateByRoleId: Record<string, TRoleState>;
}

export interface RoleScopedActions {
  syncRoleContext: (preferredRoleId?: string) => void;
}
```

## Refactor Sequence

1. 先拆超大文件：`WeChatChatView.tsx`、`SellerApp.tsx`、`DesktopEditModeView.tsx`。
2. 将 app store 内持久化解析下沉到 `data/repositories/*`。
3. 用 query/service 代替新增 cross-app store 直连。
4. 将可复用业务逻辑统一迁移到 `src/appsrc/shared/business/**`。
5. 清理 boundary allowlist 中已可替代的历史依赖。

## Done Criteria

1. 新增功能不引入新的 cross-app 直连依赖。
2. 核心 app 的 root store 以 slice 组合为主。
3. 持久化逻辑集中在 repository 模块。
4. `npm run lint` 中 boundary 检查长期保持通过。
