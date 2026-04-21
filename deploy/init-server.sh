#!/bin/bash
#===============================================================================
# YP-Monitor 服务器一键部署脚本
# 用途：在阿里云服务器上初始化环境、安装依赖、配置 Nginx、启动项目
# 用法：bash <(curl -sL https://raw.githubusercontent.com/MFCR7788/YP-monitor/main/deploy/init-server.sh)
#       或: bash init-server.sh
#===============================================================================

set -e
echo "=========================================="
echo "   🚀 YP-Monitor 一键部署脚本"
echo "=========================================="

# === 颜色定义 ===
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()    { echo -e "${GREEN}[✓]${NC} $1"; }
warn()    { echo -e "${YELLOW}[!]${NC} $1"; }
error()   { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# === 检查 root 权限 ===
[[ $EUID -ne 0 ]] && error "请以 root 用户运行此脚本"

# === 项目路径 ===
PROJECT_DIR="/opt/apps/YP-monitor"
DOMAIN="ai.zjsifan.com"
SERVER_PORT=3001

# ============================================================
# Step 1: 系统基础工具安装
# ============================================================
echo ""
echo "--- [1/8] 安装系统基础工具 ---"
apt-get update -qq
apt-get install -y -qq curl wget git nginx certbot python3-certbot-nginx ufw > /dev/null 2>&1
info "系统工具已安装 (curl, git, nginx, certbot, ufw)"

# ============================================================
# Step 2: 安装 Node.js 20 LTS
# ============================================================
echo ""
echo "--- [2/8] 安装 Node.js ---"
if command -v node &>/dev/null && [[ $(node -v | cut -d'.' -f1 | tr -d 'v') -ge 20 ]]; then
    info "Node.js $(node -v) 已满足要求"
else
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
    apt-get install -y -qq nodejs > /dev/null 2>&1
    info "Node.js $(node --version) 安装完成"
fi

# ============================================================
# Step 3: 安装 PM2 全局进程管理器
# ============================================================
echo ""
echo "--- [3/8] 安装 PM2 ---"
npm install -g pm2 > /dev/null 2>&1
pm2 startup systemd -u root --hp /root > /dev/null 2>&1 || true
env PATH=$PATH:/usr/bin pm2 save > /dev/null 2>&1 || true
info "PM2 已安装并配置为开机自启"

# ============================================================
# Step 4: 克隆/更新项目代码
# ============================================================
echo ""
echo "--- [4/8] 准备项目代码 ---"
mkdir -p /opt/apps

if [ -d "$PROJECT_DIR/.git" ]; then
    cd "$PROJECT_DIR"
    git pull origin main
    info "项目代码已更新"
else
    rm -rf "$PROJECT_DIR"
    git clone https://github.com/MFCR7788/YP-monitor.git "$PROJECT_DIR"
    cd "$PROJECT_DIR"
    info "项目已克隆到 $PROJECT_DIR"
fi

# ============================================================
# Step 5: 后端部署（构建 + 启动）
# ============================================================
echo ""
echo "--- [5/8] 构建后端服务 ---"
cd "$PROJECT_DIR/server"

cp -n .env.example .env 2>/dev/null || true
npm install --production 2>&1 | tail -3
npx prisma generate > /dev/null 2>&1
npx prisma db push > /dev/null 2>&1
npm run build 2>&1 | tail -3
info "后端构建完成"

# 停止旧的进程（如果有）
pm2 stop yupi-server 2>/dev/null || true
pm2 delete yupi-server 2>/dev/null || true

# 启动后端服务
cd "$PROJECT_DIR/server"
pm2 start dist/index.js --name yupi-server \
    --interpreter node \
    -- \
    > /dev/null 2>&1
pm2 save > /dev/null 2>&1
info "后端服务已在 PM2 中启动 (端口 $SERVER_PORT)"

# ============================================================
# Step 6: 前端构建
# ============================================================
echo ""
echo "--- [6/8] 构建前端 ---"
cd "$PROJECT_DIR/client"
npm install 2>&1 | tail -3
npm run build 2>&1 | tail -5
info "前端构建完成 (输出目录: dist)"

# ============================================================
# Step 7: Nginx 反向代理配置
# ============================================================
echo ""
echo "--- [7/8] 配置 Nginx ---"

# 创建 Nginx 配置文件
cat > /etc/nginx/sites-available/$DOMAIN << 'NGINX_CONF'
server {
    listen 80;
    server_name ai.zjsifan.com www.ai.zjsifan.com;

    # 前端静态文件
    location / {
        alias /opt/apps/YP-monitor/client/dist/;
        try_files \$uri \$uri/ /index.html;

        # 静态资源缓存
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf)$ {
            expires 30d;
            add_header Cache-Control "public, immutable";
        }
    }

    # API 反向代理到后端
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
    }

    # Socket.io WebSocket 代理
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_read_timeout 3600s;
    }
}
NGINX_CONF

ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

nginx -t 2>&1
systemctl reload nginx
info "Nginx 配置完成"

# ============================================================
# Step 8: SSL 证书申请
# ============================================================
echo ""
echo "--- [8/8] 申请 SSL 证书 ---"
certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --redirect 2>&1 || {
    warn "SSL 证书自动申请失败，可稍后手动执行:"
    warn "  certbot --nginx -d ai.zjsifan.com -d www.ai.zjsifan.com"
}
info "SSL 配置完成（或已跳过）"

# ============================================================
# 防火墙配置
# ============================================================
echo ""
echo "--- [防火墙] 开放必要端口 ---"
ufw allow ssh > /dev/null 2>&1 || true
ufw allow 'Nginx Full' > /dev/null 2>&1 || true
ufw --force enable > /dev/null 2>&1 || true
info "防火墙已配置 (SSH + HTTP/HTTPS)"

# ============================================================
# 完成！
# ============================================================
echo ""
echo "=========================================="
echo "   ✅ 部署完成！"
echo "=========================================="
echo ""
echo "  🌐 访问地址: https://$DOMAIN"
echo "  📁 项目路径: $PROJECT_DIR"
echo "  🔧 后端管理: pm2 list / pm2 logs yupi-server"
echo "  🔄 后续更新: 由 GitHub Actions 自动部署"
echo ""
echo "  如需修改后端环境变量:"
echo "    vim $PROJECT_DIR/server/.env"
echo "    pm2 restart yupi-server"
echo ""
