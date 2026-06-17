# 新增应用

本文档介绍如何为 BaobaobaiPhone 新增一个内置应用。

## 步骤 1：创建应用目录

在 `src/appsrc/apps/` 下创建新目录，例如 `myapp`：

```bash
mkdir -p src/appsrc/apps/myapp
```

## 步骤 2：编写应用组件

创建 `src/appsrc/apps/myapp/MyApp.tsx`：

```tsx
export function MyApp() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">我的应用</h1>
      <p className="mt-2 text-gray-600">这是一个新应用。</p>
    </div>
  );
}
```

## 步骤 3：导出 Manifest

创建 `src/appsrc/apps/myapp/index.ts`：

```ts
import type { AppManifest } from '@baobaobaiOS/sdk';
import { MyApp } from './MyApp';

const myAppManifest: AppManifest = {
  id: 'myapp',
  name: '我的应用',
  icon: 'Sparkles',
  color: '#3B82F6',
  component: MyApp,
};

export default myAppManifest;
```

> `icon` 对应 [lucide-react](https://lucide.dev/icons/) 的图标名。

## 步骤 4：验证注册

应用注册器会自动扫描 `src/appsrc/apps/*/index.ts`，无需手动修改全局清单。

启动开发服务器后，新应用应出现在桌面上。

```bash
npm run dev
```

## 步骤 5：添加操作手册（可选）

在 `docs/apps/` 下创建 `myapp.md`，补充应用说明：

```md
# 我的应用

## 功能

## 使用方式

## 相关文件

- `src/appsrc/apps/myapp/MyApp.tsx`
- `src/appsrc/apps/myapp/index.ts`
```

并在 `docs/.vitepress/config.ts` 的 sidebar 中将该应用加入对应分组。

## 注意事项

- 不要从 `src/core` 反向导入 `src/appsrc/apps/myapp`。
- 如果应用需要跨应用共享能力，优先通过 `src/appsrc/shared/business` 桥接暴露。
