#!/bin/bash
# ChatSG VM Setup Script
# This script sets up a fresh VM with all required dependencies

set -e  # Exit on error

echo "=== ChatSG VM Setup Script ==="
echo "This script will install all required dependencies for ChatSG"
echo ""

# Update system packages
echo "📦 Updating system packages..."
sudo apt-get update -y
sudo apt-get upgrade -y

# Install essential tools
echo "🔧 Installing essential tools..."
sudo apt-get install -y curl wget git build-essential

# Install Node.js 18.x
echo "📗 Installing Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify Node.js installation
node_version=$(node -v)
npm_version=$(npm -v)
echo "✅ Node.js installed: $node_version"
echo "✅ npm installed: $npm_version"

# Install PM2 globally
echo "🚀 Installing PM2..."
sudo npm install -g pm2

# Install PostgreSQL
echo "🐘 Installing PostgreSQL..."
sudo apt-get install -y postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Install Redis (optional, for production sessions)
echo "🔴 Installing Redis..."
sudo apt-get install -y redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Install nginx
echo "🌐 Installing nginx..."
sudo apt-get install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Install certbot for SSL certificates
echo "🔒 Installing certbot for SSL..."
sudo apt-get install -y certbot python3-certbot-nginx

# Create application directory
echo "📁 Creating application directory..."
sudo mkdir -p /opt/chatsg
sudo chown $USER:$USER /opt/chatsg

# Create log directory
echo "📝 Creating log directory..."
sudo mkdir -p /var/log/chatsg
sudo chown $USER:$USER /var/log/chatsg

# Setup firewall (ufw)
echo "🔥 Configuring firewall..."
sudo apt-get install -y ufw
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 3000/tcp  # Backend (for initial testing)
sudo ufw --force enable

# Create PostgreSQL database and user
echo "🗄️ Setting up PostgreSQL database..."
sudo -u postgres psql <<EOF
CREATE USER chatsguser WITH PASSWORD 'changeme';
CREATE DATABASE chatsg OWNER chatsguser;
GRANT ALL PRIVILEGES ON DATABASE chatsg TO chatsguser;
EOF

echo ""
echo "✅ VM setup complete!"
echo ""
echo "Next steps:"
echo "1. Clone your repository to /opt/chatsg"
echo "2. Update PostgreSQL password in the script above and in your .env"
echo "3. Configure nginx reverse proxy"
echo "4. Set up SSL certificates with certbot"
echo "5. Run the deploy.sh script to deploy the application"
echo ""
echo "PostgreSQL connection string:"
echo "postgresql://chatsguser:changeme@localhost:5432/chatsg"
echo ""
echo "⚠️  IMPORTANT: Change the default PostgreSQL password!"