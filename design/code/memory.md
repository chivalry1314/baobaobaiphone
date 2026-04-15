# 新 App 接入记忆中心规范（Memory Center Integration Spec）

本文用于约束新 App 如何接入统一记忆中心。目标是让 App 的 AI 交互记忆可被统一存储、检索、压缩与管理。

## 1. 适用范围

- 适用于 `src/appsrc/apps/*` 下所有需要 AI 对话或可复用上下文记忆的 App。
- 系统应用与非系统应用一视同仁，只要产生 AI 交互都应接入。
- 核心参考：
  - `src/core/appMemory.ts`
  - `src/core/appMemoryCenter.ts`
  - `src/core/appMemoryRegistry.ts`
  - `src/appsrc/apps/WeChat/memory.ts`
  - `src/appsrc/apps/WeChat/memoryModule.ts`

## 2. 架构总览

- 记忆统一存放于 `useAppMemoryCenterStore().appMemoryRecords`（IndexedDB 持久化）。
- 各 App 通过 `createAppMemoryApi(appId)` 获取按 app + scope 隔离的 API。
- 记忆中心 UI 识别 App 的方式：
  - 优先发现 `src/appsrc/apps/*/memoryModule.ts` 导出的 `AppMemoryModule`。
  - 即使没有 `memoryModule.ts`，只要该 `appId` 已产生记忆记录，记忆中心也会显示。
- 自动总结由记忆中心统一执行，按 `appId + contactId (+ scope)` 分组压缩。

## 3. 强制规范（MUST）

### 3.1 `appId` 一致性

以下三处必须一致：
- App manifest：`src/appsrc/apps/<appId>/index.ts` 的 `id`
- 记忆 API：`createAppMemoryApi('<appId>')`
- 记忆模块：`memoryModule.ts` 的 `appId`

### 3.2 必须使用统一 API

- 新 App 记录/删除/查询记忆必须通过 `createAppMemoryApi` 返回的 API。
- 禁止在 app 内维护另一套“独立记忆主存储”作为事实来源。

### 3.3 记录最小字段

每条记录至少包含：
- `contactId: string`
- `role: 'user' | 'assistant'`
- `content: string`（会 `trim()`，空字符串不入库）

建议尽量传入：
- `sessionId`
- `sourceId`
- `sourceType`

### 3.4 删除同步必须实现

若 app 支持删除消息或批量撤回，必须调用：
- `removeBySessionSources(sessionId, sourceIds)`

### 3.5 Prompt 组装必须使用记忆引用

构建 AI 请求时，应使用：
- `buildReferenceLines(...)`

建议传 `excludeSessionId` 以避免当前会话重复喂给模型。

## 4. 推荐规范（SHOULD）

- 用 `shouldRecord` 过滤系统提示、空白、噪声文本。
- `sourceType` 维护稳定枚举，避免同义多拼写。
- 记忆引用条数控制在 `6~12`。
- `formatLine` 统一格式，例如 `- 我：...` / `- 你：...`。

## 5. 文件与命名约定

建议在 `src/appsrc/apps/<appId>/` 新增：
- `memory.ts`：创建并导出 app 记忆 API（建议）
- `memoryModule.ts`：导出 `AppMemoryModule`（强烈建议）

`memoryModule.ts` 发现规则：
- 扫描路径：`src/appsrc/apps/*/memoryModule.ts`
- 支持导出：
  - `default`（推荐）
  - 或命名导出 `appMemoryModule`

## 6. 标准接入模板

### 6.1 `memory.ts`

```ts
import { createAppMemoryApi } from '../../../core/appMemoryCenter';
import type { AppMemoryRecord } from '../../../core/appMemory';

export type MyAppMemoryRecord = AppMemoryRecord & {
  sourceType?: 'text' | 'image' | 'event' | 'memory-summary';
};

export const myAppMemory = createAppMemoryApi<'myapp', MyAppMemoryRecord>('myapp', {
  mapRecord: (record) => ({
    ...record,
    appId: 'myapp',
    sourceType: record.sourceType as MyAppMemoryRecord['sourceType'],
  }),
});
```

### 6.2 `memoryModule.ts`

```ts
import type { AppMemoryModule } from '../../../core/appMemoryRegistry';
import { useContactsStore } from '../contacts/store';
import type { MyAppMemoryRecord } from './memory';

export const myAppMemoryModule: AppMemoryModule<MyAppMemoryRecord> = {
  appId: 'myapp',
  resolveContactName: (contactId) => {
    const contact = useContactsStore.getState().contacts.find((item) => item.id === contactId);
    return contact?.name || contactId;
  },
  resolveSourceLabel: (record) => {
    if (record.sourceType === 'memory-summary') return '记忆摘要';
    if (record.sourceType === 'text') return '文本';
    if (record.sourceType === 'image') return '图片';
    if (record.sourceType === 'event') return '事件';
    return record.sourceType;
  },
};

export default myAppMemoryModule;
```

### 6.3 业务中写入/删除/引用

```ts
myAppMemory.record(
  {
    contactId,
    sessionId,
    sourceId: messageId,
    sourceType: 'text',
    role: senderRole === 'user' ? 'user' : 'assistant',
    content: messageText,
    timestamp: Date.now(),
  },
  {
    shouldRecord: (text) => Boolean(text.trim()) && !text.startsWith('[系统提示：'),
  }
);

myAppMemory.removeBySessionSources(sessionId, deletedMessageIds);

const memoryLines = myAppMemory.buildReferenceLines({
  contactId,
  excludeSessionId: sessionId,
  limit: 8,
  formatLine: (record) => `- ${record.role === 'user' ? '我' : '你'}：${record.content}`,
});
```

## 7. 自动总结机制

- 入口：`recordAppInteraction(...)`、`importAppMemoryRecords(...)`
- 单 app 并发限制：同一 `appId` 同时只允许一个任务
- 默认核心参数：
  - `memoryAutoSummaryThreshold`: `120`
  - `memoryAutoSummaryMaxRounds`: `2`
  - `memoryAutoSummaryMinBatch`: `8`
  - `memoryAutoSummaryMaxBatch`: `60`
  - `memoryAutoSummaryKeepRecentMin`: `6`
  - `memoryAutoSummaryKeepRecentRatio`: `0.5`

## 8. 验收清单

- 已创建 `memory.ts` 并使用 `createAppMemoryApi('<appId>')`
- `manifest.id`、memory API `appId`、`memoryModule.appId` 一致
- 用户/助手消息按规则入库
- 删除消息时已同步调用 `removeBySessionSources`
- Prompt 构建已调用 `buildReferenceLines`
- 记忆中心可正确显示该 app 记录与筛选结果
- 自动总结可看到进度与摘要结果

## 9. 角色上下文安全规范（查手机反向视角 vs 普通模式）

- `runtimeRoleId` 仅用于反向视角场景（如 inspector/read-only），属于临时覆盖上下文。
- 在普通模式下，角色解析必须以“当前激活我的名片”作为真实来源，不能被残留的 `runtimeRoleId` 固定。
- 当用户切换激活名片（`setActiveMyCard`）时，应立即清理 runtime 覆盖，避免跨 App 角色串用。
- 记忆中心与微信应保持一致的角色解析规则：
  - 反向视角模式：`effectiveRoleId = runtimeRoleId || storedActiveRoleId`
  - 普通模式：`effectiveRoleId = storedActiveRoleId`
- 回归验证要求：切换我的名片后，重新进入微信/记忆中心应立即切到对应角色数据，不需要强制刷新页面。
