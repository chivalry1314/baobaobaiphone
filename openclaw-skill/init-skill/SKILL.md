# init-skill - GitHub 项目初始化与部署 Skill

## 描述

自动化完成 GitHub 项目的 Clone、配置、构建和部署到 GitHub Pages 的完整流程。

## 功能

1. **Clone GitHub 项目** - 从指定 URL 克隆代码
2. **安装依赖** - 执行 `npm install`
3. **配置 Git** - 设置用户邮箱和用户名
4. **构建项目** - 执行 `npm run build`
5. **部署到 GitHub Pages** - 推送到 gh-pages 分支
6. **安装 codex-cli** - 安装 OpenAI Codex CLI
7. **配置 Codex** - 创建 config.toml 配置文件

## 使用方法

### 方式 1：交互式运行

```bash
cd /path/to/baobaobaiphone/openclaw-skill/init-skill
./scripts/init.sh
```

### 方式 2：传入参数运行

```bash
./scripts/init.sh \
  --github-user "your-username" \
  --github-email "your-email@example.com" \
  --repo-url "https://github.com/your-username/your-repo.git" \
  --github-token "ghp_xxxxxxxxxxxx"
```

### 方式 3：在 OpenClaw 中调用

```
使用 init-skill 技能
```

## 配置文件

### .env.example

```bash
GITHUB_USER=your-username
GITHUB_EMAIL=your-email@example.com
GITHUB_REPO_URL=https://github.com/your-username/your-repo.git
GITHUB_TOKEN=ghp_xxxxxxxxxxxx
```

## 输出

- ✅ 项目代码已 Clone
- ✅ 依赖已安装
- ✅ Git 已配置
- ✅ 项目已构建
- ✅ 已部署到 GitHub Pages
- ✅ codex-cli 已安装并配置

## 访问地址

部署完成后，访问：
```
https://your-username.github.io/your-repo/
```

## 注意事项

1. 需要有效的 GitHub Token（用于推送）
2. 需要 Node.js 16+ 环境
3. 首次运行可能需要较长时间安装依赖

## 作者

由 Codex (gpt-5.3-codex xhigh) 辅助创建
