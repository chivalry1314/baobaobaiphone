# BaobaobaiPhone

baobaobaiphone 是一个基于 React + Vite 的移动端桌面式 Web 应用容器。
它通过“系统桌面 + 多应用”的方式组织功能，支持本地应用自动注册、应用市场运行时 HTML 应用、系统级定时任务、Memory Center、Web Push 与多种 AI 能力接入。


## 功能概览

### 核心系统能力

- 桌面式应用容器：支持图标布局、分页、组件化桌面 widget。
- 多应用生态：应用通过 `src/appsrc/apps/<appId>/index.ts` manifest 自动注册，无需手动维护全局清单。
- 应用市场：支持在线/离线（上传 HTML）运行时应用安装与启动。
- 角色与身份系统：支持多身份切换、通讯录角色、`我的名片`，并在运行时为应用提供统一的角色上下文。
- 每日剧本：按日期编排角色流程，支持跨应用动作触发（如自动发微信、写日记、完成打卡等）。
- 系统任务调度：支持可配置的周期任务与执行日志。
- 数据持久化：基于 IndexedDB（含 core store 与 app store）。
- AI 能力接入：OpenAI 兼容接口、Google Gemini、图片生成、语音能力、记忆总结与 AI 交互记录。
- Web Push：支持浏览器订阅、服务端同步、测试推送和通知唤起应用。

### 应用层能力

- 通讯录、查手机、记忆中心、微信、情侣空间、日记心语、暖迹、梦音乐、天气、去逛街、开店吧、外卖、人设生成器、纸间魔法等应用，覆盖社交、生活、电商、AI 工具等场景。

## 技术栈

- React 19
- TypeScript 5
- Vite 6
- Zustand
- Tailwind CSS 4
- motion
- IndexedDB（通过项目内封装）

## 项目结构

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

## 内置应用目录

当前应用位于 `src/appsrc/apps`（按目录名），共 21 个：

### 系统应用

- `appmarket`：应用市场 — 线上/离线应用安装与开发者上传平台。
- `contacts`：通讯录 — 联系人与通话记录管理，支持多身份名片。
- `dailyscript`：每日剧本 — 先选通讯录角色，再按日期设置当天要执行的剧本流程。
- `memorycenter`：记忆中心 — 统一管理各个应用的 AI 交互记忆记录。
- `phoneinspector`：查手机 — 选择通讯录角色后查看其手机视角。
- `scheduler`：定时任务 — 配置系统自动任务，控制扫描频率与执行状态。
- `settings`：设置 — 系统设置。
- `storage`：文件管理 — 本地文件与存储管理。
- `worldbook`：备忘录 — 笔记与知识库管理。

### 市场应用

- `dailywords`：日记心语 — 记录每天的心情和想法，支持按身份隔离与手动同步记忆中心。
- `delivery`：外卖 — 外卖首页、店铺列表、店铺详情、下单页和店铺管理页。
- `dreammusic`：梦音乐 — 支持网易云歌单分享导入，并尝试直链播放。
- `lovespace`：情侣空间 — 从通讯录添加多位关系，在首页查看绑定天数与心动值。
- `papermagic`：纸间魔法 — 定制化提示词管理。
- `personagenerator`：人设生成器 — 从聊天记录或文件生成通讯录、备忘录和记忆中心。
- `seller`：开店吧 — 店铺数据、订单与商品管理。
- `shopping`：去逛街 — 商品浏览、下单和订单管理。
- `template`：模板 — 组件样式和交互模板示例。
- `warmtrack`：暖迹 — 记录经期状态、症状和每日健康信息。
- `weather`：天气 — 查看实时天气和未来预报。
- `WeChat`：微信（manifest id 为 `wechat`）— 即时通讯应用，可进行聊天、通讯录管理、朋友圈与个人资料操作。

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`，至少按需设置以下变量：

- `VITE_PUSH_SERVER_BASE_URL`：Web Push 服务端地址。
- `VITE_DREAM_MUSIC_API_BASE`：DreamMusic 可选网关地址（未设置时走默认相对路径/公开接口）。
- `GEMINI_API_KEY`：构建时会注入到 `process.env.GEMINI_API_KEY`（用于 AI Studio 兼容场景）。

### 3. 本地开发

```bash
npm run dev
```

### 4. 构建与预览

```bash
npm run build
npm run preview
```


## 常用脚本

- `npm run dev`：本地开发（`0.0.0.0:3000`）。
- `npm run build`：Vite 生产构建。
- `npm run preview`：预览构建产物。
- `npm run lint`：类型检查 + 边界检查。
- `npm run lint:types`：TypeScript 检查。
- `npm run lint:boundaries`：架构边界检查（禁止不符合约束的跨层导入）。

## 构建与部署说明

- 构建产物目录为 `dist`。
- 项目启用了 `vite-plugin-singlefile`，主站会尽量内联资源。
- `service-worker.js` 通过 Vite 插件在构建时额外写入产物。
- Web Push 依赖 HTTPS（或 localhost）与 Service Worker。

部署时请确保：

- `dist/index.html` 与 `dist/service-worker.js` 可由同源根路径访问。
- 若站点部署在子路径（非 `/`），需要同步评估并调整 SW 注册路径与路由行为。

## Web Push 服务端接口约定

前端默认依赖以下接口（见 `src/core/push/webPush.ts`）：

- `GET /api/push/vapid-public-key`：返回 `{ publicKey }`
- `POST /api/push/subscriptions`：上报订阅（`userId`、`deviceId`、`appId`、`subscription`）
- `DELETE /api/push/subscriptions`：按 `endpoint` 删除订阅
- `POST /api/push/test`：发送测试推送，返回 `{ eventId }`

说明：

- 本仓库不包含上述 Push 服务端实现，需要单独部署。
- `public/service-worker.js` 负责 `push` 和 `notificationclick` 处理。

## 开发约定（重要）

- 新应用通过 `src/appsrc/apps/<appId>/index.ts` 导出 manifest 后会被自动扫描注册。
- `src/core` 不应直接依赖 `src/appsrc/apps`。
- `src/appsrc/shared/business` 不应依赖具体 app 实现。
- 使用 `npm run lint:boundaries` 可在 CI 中强制校验以上约束。

## 相关文件

- 应用自动注册：`src/core/registry.tsx`
- 系统调度初始化：`src/main.tsx` + `src/core/systemScheduler.ts`
- 应用市场运行时：`src/components/HtmlRuntimeApp.tsx` + `src/appsrc/apps/appmarket/runtime.ts`
- 存储封装：`src/core/storage.ts`
- Push 能力：`src/core/push/webPush.ts` + `public/service-worker.js`
