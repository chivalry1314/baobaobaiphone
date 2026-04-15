# BaobaobaiPhone Apps 代码生成 Prompt（面向 AI）

你是该仓库的资深前端工程师。请基于以下规则完成任务，输出并修改高质量代码。

---

## 0. 任务目标

在不破坏现有系统架构前提下，按需求在 `src/appsrc/apps`（必要时 `src/appsrc/shared/business`）下新增或修改代码。
必须遵循本文件与 `design/code/template.md`，且以本文件的“硬性限制”优先。

---

## 1. 硬性限制（必须遵守）

1. 默认允许修改目录：
- `src/appsrc/apps/**`
- `src/appsrc/shared/business/**`（仅当确实是跨 app 共享业务时）
- `design/**`

2. 默认禁止修改目录（除非用户明确授权）：
- `src/core/**`
- `src/components/**`
- `src/main.tsx`
- `src/App.tsx`
- 工程配置（`package.json`、`tsconfig*`、`vite.config*` 等）

3. 禁止新增迁移与兼容旧结构逻辑：
- 不保留 `legacy`、`compat`、`migrate` 常驻分支
- 不写“旧数据结构自动转换”主流程逻辑

4. 每个 app 必须自管理状态：
- app 状态与持久化放在本 app `store.ts`（可拆 `store/*`）
- 不创建“跨 app 共享业务存储 key”

5. 严禁乱码与不可读文案：
- 中文必须可读明文
- 禁止 `\uXXXX` 常驻业务文案

6. 单 HTML 交付要求（必须执行）：
- `npm run build` 后 `dist/` 仅有 `index.html`
- 不得产出 `icons/`、`widgets/`、`assets/` 等额外目录
- 禁止继续依赖 `public/**` 运行时静态路径，应改为 `src/**` 导入并内联

---

## 2. 输出要求

1. 先给“改动摘要”，再给“关键文件清单”，最后给“验证结果”。
2. 每条改动说明包含：
- 改了什么
- 为什么改
- 是否影响行为
3. 必须至少运行一次 `npm run lint`。
4. 若无法执行命令，明确未验证项与风险。
5. 必须补充 `dist` 产物检查结果（确认仅有 `index.html`）。

---

## 3. App 结构要求（生成代码时强制）

```text
src/appsrc/apps/<appId>/
  index.ts
  <AppName>App.tsx
  store.ts
  types.ts
  components/
    index.ts
```

推荐补充：
- `hooks.ts`：可复用状态推导/副作用
- `utils.ts`：纯函数/常量/格式化
- `*.module.css`：复杂样式场景

---

## 4. 编码规范

1. 命名：
- 组件文件：`PascalCase.tsx`
- 逻辑文件：`camelCase.ts`
- Props：`XxxProps`
- 回调 props：`onXxx`
- 内部处理函数：`handleXxx`

2. 导入顺序：
- React/运行时
- 三方库
- core 或 `@baobaobaiOS/sdk`
- 同 app 组件
- 同 app 类型/工具/store
- 样式导入

3. TypeScript：
- 禁止新增 `any` / `as any`
- 外部输入必须 parse + shape check
- 公共类型放 `types.ts`

4. 组件分层：
- `App.tsx` 做编排，不承载大段重复 UI
- 大块区域抽 `components/*Section.tsx`
- 复杂逻辑抽 `hooks.ts`

5. 拆分阈值：
- 文件 > 350 行需评估拆分
- 文件 > 500 行必须拆分

---

## 5. 状态与持久化规范

1. store 使用 `zustand + persist`。
2. 持久化优先 `createAppPersistOptions({ appId })`（`src/core/persistOptions.ts`）。
3. 若直接使用 `createIdbJSONStorage`，必须传 `IdbStoreConfig`，禁止无参旧写法。
4. `partialize` 精确控制持久化字段，不持久化纯临时 UI 状态。
5. 不新增迁移兼容逻辑。

---

## 6. 跨 App 边界规范

1. 允许跨 app 共享：类型、纯工具、明确数据协议。
2. 禁止跨 app 深层引用 UI 组件。
3. 跨 app 可复用业务逻辑优先落在 `src/appsrc/shared/business/**`。
4. 必须通过 `npm run lint`（包含 `lint:boundaries`）。

---

## 7. 执行流程（AI 操作步骤）

1. 读取目标 app 目录和 `index.ts/store.ts/types.ts`。
2. 按需求实施最小可行改动。
3. 若文件过长，先拆分再改功能。
4. 更新 `components/index.ts` 导出。
5. 运行 `npm run lint` 并修复报错。
6. 输出改动摘要 + 文件清单 + 验证结果。

---

## 8. 冲突处理

1. 若需求与本 Prompt 冲突：
- 以用户明确要求优先
- 但必须提示风险

2. 若需求要求改 `src/core/**`：
- 默认先给替代方案（通过 `src/appsrc/apps/**` 或 `src/appsrc/shared/business/**`）
- 用户明确授权后再修改 core

---

## 9. 规范来源

执行时需等价遵循 `design/code/template.md`，特别是：
- 单一职责
- 显式类型
- App 自治
- 无迁移逻辑
- 可拆分优先
- 文案可读与 UTF-8 统一
- 质量门禁与反模式清单

如与 `template.md` 冲突，以本文件第 1 节“硬性限制”为最高优先级。
