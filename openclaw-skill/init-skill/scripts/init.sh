#!/bin/bash

# init-skill - GitHub 项目初始化与部署脚本
# 自动化完成 Clone、配置、构建和部署到 GitHub Pages

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印函数
print_step() {
    echo -e "${BLUE}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# 默认配置
GITHUB_USER=""
GITHUB_EMAIL=""
GITHUB_REPO_URL=""
GITHUB_TOKEN=""
INSTALL_CODEX=true
DEPLOY_PAGES=true

# 脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

# 显示帮助
show_help() {
    cat << EOF
用法：$0 [选项]

选项:
    -u, --github-user     GitHub 用户名
    -e, --github-email    GitHub 邮箱
    -r, --repo-url        GitHub 仓库 URL
    -t, --github-token    GitHub Token (用于推送)
    --no-codex            不安装 codex-cli
    --no-deploy           不部署到 GitHub Pages
    -h, --help            显示帮助信息

示例:
    $0 -u chivalry1314 -e chivalry1314@github.com -r https://github.com/chivalry1314/baobaobaiphone.git
    $0 --github-user yourname --github-email your@email.com --github-token ghp_xxx

EOF
}

# 解析参数
while [[ $# -gt 0 ]]; do
    case $1 in
        -u|--github-user)
            GITHUB_USER="$2"
            shift 2
            ;;
        -e|--github-email)
            GITHUB_EMAIL="$2"
            shift 2
            ;;
        -r|--repo-url)
            GITHUB_REPO_URL="$2"
            shift 2
            ;;
        -t|--github-token)
            GITHUB_TOKEN="$2"
            shift 2
            ;;
        --no-codex)
            INSTALL_CODEX=false
            shift
            ;;
        --no-deploy)
            DEPLOY_PAGES=false
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            print_error "未知选项：$1"
            show_help
            exit 1
            ;;
    esac
done

# 交互式输入（如果未提供参数）
interactive_input() {
    echo ""
    echo "========================================"
    echo "  GitHub 项目初始化与部署"
    echo "========================================"
    echo ""

    if [ -z "$GITHUB_USER" ]; then
        read -p "请输入 GitHub 用户名：" GITHUB_USER
    fi

    if [ -z "$GITHUB_EMAIL" ]; then
        read -p "请输入 GitHub 邮箱：" GITHUB_EMAIL
    fi

    if [ -z "$GITHUB_REPO_URL" ]; then
        read -p "请输入 GitHub 仓库 URL：" GITHUB_REPO_URL
    fi

    if [ -z "$GITHUB_TOKEN" ]; then
        echo ""
        print_warning "GitHub Token 用于推送代码到 GitHub"
        echo "获取 Token: https://github.com/settings/tokens"
        read -p "请输入 GitHub Token (可选，如不需要推送可跳过)：" GITHUB_TOKEN
    fi

    echo ""
    read -p "是否安装 codex-cli? (Y/n): " install_codex
    if [[ $install_codex =~ ^[Nn]$ ]]; then
        INSTALL_CODEX=false
    fi

    read -p "是否部署到 GitHub Pages? (Y/n): " deploy_pages
    if [[ $deploy_pages =~ ^[Nn]$ ]]; then
        DEPLOY_PAGES=false
    fi
}

# 检查 Node.js
check_node() {
    print_step "检查 Node.js 环境..."
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v)
        print_success "Node.js 已安装：$NODE_VERSION"
    else
        print_error "Node.js 未安装，请先安装 Node.js 16+"
        exit 1
    fi
}

# Clone 项目
clone_repo() {
    print_step "Clone GitHub 项目..."
    if [ -d "$PROJECT_ROOT/.git" ]; then
        print_success "项目已存在，跳过 Clone"
    else
        git clone "$GITHUB_REPO_URL" "$PROJECT_ROOT"
        print_success "项目 Clone 完成"
    fi
}

# 配置 Git
configure_git() {
    print_step "配置 Git 用户信息..."
    git config --global user.name "$GITHUB_USER"
    git config --global user.email "$GITHUB_EMAIL"
    print_success "Git 配置完成：$GITHUB_USER <$GITHUB_EMAIL>"
}

# 安装依赖
install_deps() {
    print_step "安装项目依赖..."
    cd "$PROJECT_ROOT"
    npm install
    print_success "依赖安装完成"
}

# 构建项目
build_project() {
    print_step "构建项目..."
    cd "$PROJECT_ROOT"
    npm run build
    print_success "项目构建完成"
}

# 部署到 GitHub Pages
deploy_to_pages() {
    print_step "部署到 GitHub Pages..."
    cd "$PROJECT_ROOT"

    # 配置远程 URL（包含 Token）
    if [ -n "$GITHUB_TOKEN" ]; then
        REMOTE_URL=$(echo "$GITHUB_REPO_URL" | sed 's|https://|https://'"$GITHUB_TOKEN"'@|')
        git remote set-url origin "$REMOTE_URL"
    fi

    # 推送到 gh-pages
    git subtree push --prefix dist origin gh-pages
    print_success "已部署到 GitHub Pages"

    # 显示访问地址
    REPO_NAME=$(basename "$GITHUB_REPO_URL" .git)
    echo ""
    print_success "访问地址：https://$GITHUB_USER.github.io/$REPO_NAME/"
}

# 安装 codex-cli
install_codex() {
    print_step "安装 codex-cli..."
    npm install -g @openai/codex
    print_success "codex-cli 安装完成"
}

# 配置 codex
configure_codex() {
    print_step "配置 codex..."
    mkdir -p ~/.codex
    cat > ~/.codex/config.toml << EOF
[profile.default]
model = "gpt-5.3-codex"
cwd = "$PROJECT_ROOT"
EOF
    print_success "codex 配置完成"
}

# 主流程
main() {
    echo ""

    # 交互式输入
    interactive_input

    echo ""
    echo "========================================"
    echo "  开始执行..."
    echo "========================================"
    echo ""

    # 执行步骤
    check_node
    echo ""

    clone_repo
    echo ""

    configure_git
    echo ""

    install_deps
    echo ""

    build_project
    echo ""

    if [ "$DEPLOY_PAGES" = true ]; then
        deploy_to_pages
        echo ""
    fi

    if [ "$INSTALL_CODEX" = true ]; then
        install_codex
        echo ""
        configure_codex
        echo ""
    fi

    echo "========================================"
    echo "  完成！"
    echo "========================================"
    echo ""
    print_success "所有步骤执行完成！"
    echo ""
}

# 运行
main
