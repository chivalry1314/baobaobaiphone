# 构建与部署

本文档介绍 BaobaobaiPhone 的构建产物说明、部署注意事项以及当前使用的 EdgeOne Pages 工作流。

## 构建产物

执行 `npm run build` 后，静态资源输出到 `dist/` 目录：

```text
dist/
  index.html
  service-worker.js
  assets/          # JS、CSS、图片等资源
  fonts/           # 字体文件
```

## 部署前提

- `dist/index.html` 与 `dist/service-worker.js` 可由同源根路径访问。
- Web Push 依赖 HTTPS（或 localhost）与 Service Worker。
- 若站点部署在子路径（非 `/`），需要同步评估并调整 SW 注册路径与路由行为。

## 当前部署方式

项目使用 **EdgeOne Pages** 进行部署，相关配置位于：

- `.github/workflows/edgeone-pages-production.yml`：生产环境手动部署
- `.github/workflows/edgeone-pages-preview.yml`：PR 预览自动部署
- `.github/EDGEONE_PAGES_SETUP.md`：部署配置说明

### 所需 Secrets

在 GitHub 仓库 Settings → Secrets and variables → Actions 中配置：

| Secret | 说明 |
|--------|------|
| `EDGEONE_API_TOKEN` | EdgeOne Pages API Token（优先） |
| `EDGEONE_TOKEN` | 兼容回退名称 |

可选 Variables：

| Variable | 说明 |
|----------|------|
| `EDGEONE_PROJECT_NAME` | EdgeOne 生产项目名称 |
| `EDGEONE_PREVIEW_PROJECT_NAME` | EdgeOne 预览项目名称 |

## 操作手册独立部署

操作手册站点位于 `docs/`，构建输出到 `docs/.vitepress/dist/`。

推荐部署方式有以下两种，选择其一即可：

### 方式一：EdgeOne Pages 原生 Git 触发（推荐，与主站保持一致）

在 EdgeOne Pages 控制台新建独立项目（如 `baobaobaiphone-docs`），连接同一仓库并指定：

| 配置项 | 值 |
|--------|-----|
| 生产分支 | `main` |
| 框架预设 | `Vite` |
| 根目录 | `./` |
| 输出目录 | `docs/.vitepress/dist` |
| 构建命令 | `npm run docs:deploy` |
| 安装命令 | `npm install` |

保存后，只要 `main` 分支有提交，EdgeOne Pages 就会自动构建并部署文档站。

> `npm run docs:deploy` 会先执行 `vitepress build docs` 构建站点，再执行 `pagefind` 生成搜索索引。

### 方式二：GitHub Actions 部署

如果希望精确控制触发条件（例如只在 `docs/` 变更时部署），可使用 `.github/workflows/edgeone-pages-docs.yml`。该工作流已预置在仓库中，默认通过手动触发，避免与原生 Git 触发冲突。

构建命令：

```bash
npm run docs:deploy
```

## 绑定自定义域名

1. 在 EdgeOne Pages 控制台找到对应项目。
2. 进入「域名管理」，添加自定义域名（如 `docs.baobaobai.com`）。
3. 在域名服务商处按提示添加 DNS 记录（通常为 CNAME）。
4. EdgeOne 会自动申请并部署 HTTPS 证书。

## 私有化部署

如需部署到自己的服务器：

1. 运行 `npm run build` 生成 `dist/`。
2. 将 `dist/` 作为静态站点托管（Nginx、Caddy、对象存储 + CDN 等）。
3. 确保 HTTPS 已启用。
4. 如需 Web Push，需自行部署后端服务并配置 `VITE_PUSH_SERVER_BASE_URL`。
