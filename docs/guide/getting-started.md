# 快速开始

本页介绍如何在本地运行 BaobaobaiPhone 项目，以及构建与预览的基本操作。

## 环境要求

- Node.js：`^20.19.0 || ^22.13.0 || >=24`
- npm：`>=10`

建议使用 [nvm](https://github.com/nvm-sh/nvm) 或 [fnm](https://github.com/Schniz/fnm) 管理 Node 版本。

## 安装依赖

```bash
npm install
```

## 配置环境变量

复制 `.env.example` 为 `.env`，并按需设置以下变量：

| 变量 | 说明 |
|------|------|
| `VITE_PUSH_SERVER_BASE_URL` | Web Push 服务端地址 |
| `VITE_DREAM_MUSIC_API_BASE` | DreamMusic 可选网关地址（未设置时走默认相对路径/公开接口） |
| `GEMINI_API_KEY` | 构建时会注入到 `process.env.GEMINI_API_KEY`，用于 AI Studio 兼容场景 |

## 本地开发

```bash
npm run dev
```

默认监听 `0.0.0.0:3000`，可通过浏览器访问 `http://localhost:3000`。

## 构建与预览

```bash
npm run build
npm run preview
```

构建产物输出到 `dist/` 目录。

## 常用脚本

| 脚本 | 说明 |
|------|------|
| `npm run dev` | 本地开发（`0.0.0.0:3000`） |
| `npm run build` | Vite 生产构建 |
| `npm run preview` | 预览构建产物 |
| `npm run lint` | 类型检查 + 边界检查 |
| `npm run lint:types` | TypeScript 检查 |
| `npm run lint:boundaries` | 架构边界检查 |
| `npm run docs:dev` | 本地预览操作手册 |
| `npm run docs:build` | 构建操作手册 |

## 下一步

- 了解[项目架构](./architecture.md)
- 阅读[开发规范](./development.md)
- 查看[应用说明](/apps/appmarket)
