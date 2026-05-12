#!/bin/bash
set -e

echo "🚀 Starting server setup..."

# Update system
apt update && apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PostgreSQL
apt install -y postgresql postgresql-contrib

# Install Nginx
apt install -y nginx

# Install PM2
npm install -g pm2

# Start PostgreSQL
systemctl start postgresql
systemctl enable postgresql

# Configure PostgreSQL
su - postgres -c "psql -c \"CREATE USER geoadmin WITH PASSWORD 'geo_password' CREATEDB;\""
su - postgres -c "psql -c \"CREATE DATABASE geohotnews OWNER geoadmin;\""
su - postgres -c "psql -c \"ALTER USER geoadmin CREATEDB;\""

# Create deployment directory
mkdir -p /www/geo-hotnews

# SSL Certificate setup placeholder
mkdir -p /etc/nginx/ssl

echo "✅ Server setup complete!"
echo "📝 Please configure your SSL certificates in /etc/nginx/ssl/"
echo "📝 PostgreSQL connection: postgresql://geoadmin:geo_password@localhost:5432/geohotnews"