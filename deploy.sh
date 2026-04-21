#!/bin/bash

# YP-Monitor 自动化部署脚本
# 适用于 Ubuntu 20.04+

set -e

echo "===================================="
echo "  🚀 YP-Monitor 部署脚本"
echo "===================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 项目配置
PROJECT_DIR="/var/www/yupi-hot-monitor"
GITHUB_REPO="https://github.com/MFCR7788/YP-monitor.git"
DOMAIN="ai.zjsifan.com"
BACKEND_PORT=3001

echo "${YELLOW}步骤 1: 更新系统...${NC}"
sudo apt update && sudo apt upgrade -y

echo "${YELLOW}步骤 2: 安装 Node.js...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi
node -v
npm -v

echo "${YELLOW}步骤 3: 安装 PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi
pm2 -v

echo "${YELLOW}步骤 4: 安装 Nginx...${NC}"
if ! command -v nginx &> /dev/null; then
    sudo apt install -y nginx
fi
nginx -v

echo "${YELLOW}步骤 5: 安装 Git...${NC}"
if ! command -v git &> /dev/null; then
    sudo apt install -y git
fi
git --version

echo "${YELLOW}步骤 6: 克隆/更新项目...${NC}"
sudo mkdir -p $PROJECT_DIR
cd $PROJECT_DIR

if [ -d ".git" ]; then
    echo "${GREEN}项目已存在，拉取最新代码...${NC}"
    sudo git pull origin master
else
    echo "${GREEN}克隆项目...${NC}"
    sudo git clone $GITHUB_REPO .
fi

echo "${YELLOW}步骤 7: 安装后端依赖...${NC}"
cd $PROJECT_DIR/server
sudo npm install
sudo npx prisma generate
sudo npx prisma migrate deploy

echo "${YELLOW}步骤 8: 配置后端环境变量...${NC}"
if [ ! -f ".env" ]; then
    sudo cp .env.example .env
    echo "${YELLOW}请编辑 .env 文件配置您的环境变量！${NC}"
fi

echo "${YELLOW}步骤 9: 安装前端依赖并构建...${NC}"
cd "$PROJECT_DIR/client 2"
sudo npm install
sudo npm run build

echo "${YELLOW}步骤 10: 启动后端服务...${NC}"
cd $PROJECT_DIR/server
pm2 delete yupi-backend 2>/dev/null || true
pm2 start src/index.ts --name yupi-backend
pm2 save

echo "${YELLOW}步骤 11: 配置 Nginx...${NC}"
NGINX_CONF="/etc/nginx/sites-available/yupi-hot-monitor"
sudo bash -c "cat > $NGINX_CONF << 'EOF'
server {
    listen 80;
    server_name $DOMAIN;
    
    client_max_body_size 50M;
    
    location / {
        root $PROJECT_DIR/client 2/dist;
        try_files \$uri \$uri/ /index.html;
        index index.html;
        
        # 缓存设置
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control \"public, immutable\";
        }
    }
    
    location /api/ {
        proxy_pass http://localhost:$BACKEND_PORT/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    location /socket.io/ {
        proxy_pass http://localhost:$BACKEND_PORT/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \"upgrade\";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF"

sudo ln -sf $NGINX_CONF /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

echo ""
echo "${GREEN}===================================="
echo "  ✅ 部署完成！"
echo "===================================="
echo ""
echo "访问您的网站：http://$DOMAIN"
echo ""
echo "后续步骤："
echo "1. 编辑 $PROJECT_DIR/server/.env 配置环境变量"
echo "2. 配置 SSL: sudo certbot --nginx -d $DOMAIN"
echo "3. 检查 PM2 状态: pm2 status"
echo ""
