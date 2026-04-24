# 🚀 GEO星擎 - 部署到阿里云服务器指南

## 📋 准备工作

### 1. 服务器要求
- ✅ Ubuntu 20.04+ 或 CentOS 7+
- ✅ Node.js 18+
- ✅ Nginx (用于反向代理和 SSL)
- ✅ Git
- ✅ PM2 (用于进程管理)

### 2. 需要的信息
- 服务器 IP：42.121.219.223
- SSH 用户名
- SSH 密码
- 域名：ai.zjsifan.com

---

## 🛠️ 快速开始

### 步骤 1：连接到服务器

```bash
# 连接到服务器
ssh your_username@42.121.219.223
```

### 步骤 2：安装基础环境

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 PM2
sudo npm install -g pm2

# 安装 Nginx
sudo apt install -y nginx

# 安装 Git
sudo apt install -y git
```

### 步骤 3：克隆项目

```bash
# 进入项目目录
cd /var/www
sudo mkdir -p yupi-hot-monitor
cd yupi-hot-monitor

# 克隆代码（或者从本地上传）
git clone https://github.com/MFCR7788/YP-monitor.git .
```

### 步骤 4：安装依赖和构建

```bash
# 安装后端依赖
cd server
npm install

# 生成 Prisma Client
npx prisma generate

# 运行数据库迁移
npx prisma migrate deploy

# 安装前端依赖
cd ../client\ 2
npm install

# 构建前端
npm run build
```

### 步骤 5：配置环境变量

```bash
cd /var/www/yupi-hot-monitor/server
cp .env.example .env
# 编辑 .env 文件，设置正确的配置
nano .env
```

### 步骤 6：使用 PM2 启动服务

```bash
# 启动后端
cd /var/www/yupi-hot-monitor/server
pm2 start src/index.ts --name yupi-backend

# 保存 PM2 配置
pm2 save
pm2 startup
```

### 步骤 7：配置 Nginx

创建 Nginx 配置文件：

```bash
sudo nano /etc/nginx/sites-available/yupi-hot-monitor
```

添加以下内容：

```nginx
server {
    listen 80;
    server_name ai.zjsifan.com;
    
    # 前端静态文件
    location / {
        root /var/www/yupi-hot-monitor/client 2/dist;
        try_files $uri $uri/ /index.html;
        index index.html;
    }
    
    # API 代理
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # WebSocket 代理
    location /socket.io/ {
        proxy_pass http://localhost:3001/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/yupi-hot-monitor /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 步骤 8：配置 SSL (Let's Encrypt)

```bash
# 安装 Certbot
sudo apt install -y certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d ai.zjsifan.com

# 自动续期
sudo certbot renew --dry-run
```

---

## 📦 自动化部署脚本

我也为您准备了一个自动化部署脚本，复制到服务器上运行即可！

将以下内容保存为 `deploy.sh`：

```bash
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
```

---

## 📝 常用命令

```bash
# 查看 PM2 服务状态
pm2 status

# 查看后端日志
pm2 logs yupi-backend

# 重启后端
pm2 restart yupi-backend

# 停止后端
pm2 stop yupi-backend

# Nginx 相关
sudo nginx -t  # 测试配置
sudo systemctl restart nginx  # 重启 Nginx
sudo systemctl status nginx   # 查看状态
```

---

## 🔍 故障排查

### 如果无法访问网站
1. 检查防火墙：`sudo ufw status`
2. 检查 Nginx：`sudo systemctl status nginx`
3. 检查后端服务：`pm2 status`
4. 查看日志：`pm2 logs yupi-backend`

---

## 📞 获取帮助

如有问题，请查看项目文档或提交 Issue！
