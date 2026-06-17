# 开发规范

本文档列出项目中的关键开发约定，遵守这些约定可保证架构清晰并避免边界检查失败。

## 目录边界

项目通过 `scripts/check-boundaries.mjs` 校验以下导入规则：

| 规则 | 说明 |
|------|------|
| `src/core` 不应直接依赖 `src/appsrc/apps` | 核心层保持对具体应用无感知 |
| `src/appsrc/shared/business` 不应依赖具体 app 实现 | 共享业务桥接只暴露抽象能力 |
| 应用内可自由依赖 `src/core` 与 `src/appsrc/shared/business` | — |

## 应用结构

每个应用目录建议按以下结构组织：

```text
src/appsrc/apps/<appId>/
  index.ts          # 导出 AppManifest
  <AppId>App.tsx    # 应用主组件
  store.ts          # Zustand store（可选）
  types.ts          # 应用内类型（可选）
  components/       # 应用内组件（可选）
```

## Manifest 约定

`AppManifest` 至少包含：

```ts
const manifest: AppManifest = {
  id: 'appId',        // 唯一标识，建议使用小写驼峰或 kebab-case
  name: '应用名称',
  icon: 'IconName',   // lucide-react 图标名
  color: '#3B82F6',   // 应用主题色
  component: AppComponent,
};
```

系统应用建议设置 `isSystem: true`。

## 状态管理

- 系统级状态：放在 `src/core/stores`
- 跨应用共享状态：通过 `src/appsrc/shared/business` 下的桥接暴露
- 应用内状态：应用自己的 Zustand store

## 样式

- 优先使用 Tailwind CSS 工具类
- 复杂样式可放在组件同级 `.module.css` 或 `.css` 文件中
- 避免在 `src/core` 中引用具体应用的样式文件

## 代码检查

提交前建议运行：

```bash
npm run lint
```

CI 中也会执行该命令，检查失败会阻止合并。

## 命名建议

| 类型 | 约定 |
|------|------|
| 组件文件 | PascalCase，如 `SettingsApp.tsx` |
| store 文件 | `store.ts` 或 `<name>Store.ts` |
| 工具函数 | camelCase |
| 常量 | SCREAMING_SNAKE_CASE |
