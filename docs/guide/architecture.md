# 项目架构

本文档介绍 BaobaobaiPhone 的整体架构与核心模块职责。

## 技术栈

- **React 19**：UI 框架
- **TypeScript 5**：类型系统
- **Vite 6**：构建工具
- **Zustand**：状态管理
- **Tailwind CSS 4**：样式方案
- **motion**：动画库
- **IndexedDB**：本地持久化（通过项目内封装）

## 目录结构

```text
src/
  App.tsx                          # 系统主界面与应用生命周期
  main.tsx                         # 系统初始化（widgets / scheduler / push SW）
  core/
    registry.tsx                   # 自动扫描并注册 appsrc/apps/*/index.ts
    systemScheduler.ts             # 系统任务调度器
    push/webPush.ts                # Web Push 能力与服务端同步
    storage.ts                     # IndexedDB 存储封装
    stores/                        # core settings / desktop store
  components/
    HtmlRuntimeApp.tsx             # 运行时 HTML 应用容器（iframe srcDoc）
  appsrc/
    apps/                          # 各业务应用（manifest + UI + store）
    shared/business/               # 跨应用共享业务桥接与领域能力
public/
  service-worker.js                # Push / notification click 处理
scripts/
  check-boundaries.mjs             # 代码边界检查
```

## 核心模块说明

### 1. 应用注册（`src/core/registry.tsx`）

自动扫描 `src/appsrc/apps/<appId>/index.ts` 导出的 manifest，完成应用注册。新增应用只需按约定创建目录，无需修改全局清单。

### 2. 系统调度器（`src/core/systemScheduler.ts`）

负责周期任务的注册、触发与执行日志记录。任务配置通常保存在全局设置中。

### 3. Web Push（`src/core/push/webPush.ts`）

- 浏览器订阅管理
- 订阅信息与服务端同步
- 测试推送
- 通知点击唤起应用

### 4. 存储封装（`src/core/storage.ts`）

基于 IndexedDB 的存储封装，分为：

- `core store`：系统级数据
- `app store`：应用级数据

### 5. 运行时 HTML 应用容器（`src/components/HtmlRuntimeApp.tsx`）

应用市场下载/上传的 HTML 应用通过 `iframe srcDoc` 方式运行，与本地应用隔离。

## 内置应用

当前应用位于 `src/appsrc/apps`，详见[应用说明](/apps/appmarket)。

## 数据流

```text
用户操作 -> App 组件 -> Zustand Store -> IndexedDB / 内存状态
                      -> 共享业务桥接 -> 其他应用 / AI 服务
```

## 扩展点

- 新增应用：参考[新增应用](./add-app.md)
- 新增共享业务桥接：在 `src/appsrc/shared/business` 下创建
- 新增系统级能力：在 `src/core` 下扩展
