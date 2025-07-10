#!/bin/bash
# ChatSG Deployment Script
# Run this script to deploy updates to the application

set -e  # Exit on error

# Configuration
APP_DIR="/opt/chatsg"
BRANCH="main"
PM2_APP_NAME="chatsg-backend"

echo "=== ChatSG Deployment Script ==="
echo "Deploying from branch: $BRANCH"
echo ""

# Navigate to application directory
cd $APP_DIR

# Pull latest changes
echo "📥 Pulling latest changes..."
git fetch origin
git checkout $BRANCH
git pull origin $BRANCH

# Install/update backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install --production

# Build TypeScript files
echo "🔨 Building backend..."
npm run build

# Install/update frontend dependencies
echo "📦 Installing frontend dependencies..."
cd ../frontend
npm install --legacy-peer-deps

# Build frontend
echo "🔨 Building frontend..."
npm run build

# Copy frontend build to nginx directory
echo "📋 Copying frontend build to nginx..."
sudo rm -rf /var/www/chatsg
sudo mkdir -p /var/www/chatsg
sudo cp -r dist/* /var/www/chatsg/
sudo chown -R www-data:www-data /var/www/chatsg

# Go back to backend directory
cd ../backend

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found!"
    echo "Creating .env from template..."
    cp env.production.sample .env
    echo "Please edit .env with your configuration values"
    exit 1
fi

# Run database migrations if needed
# echo "🗄️ Running database migrations..."
# node scripts/migrate.js  # Uncomment if you have migrations

# Restart backend with PM2
echo "🚀 Restarting backend server..."
pm2 restart $PM2_APP_NAME || pm2 start server.js --name $PM2_APP_NAME

# Save PM2 configuration
pm2 save

# Reload nginx
echo "🌐 Reloading nginx..."
sudo nginx -t && sudo systemctl reload nginx

# Show status
echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Application status:"
pm2 status
echo ""
echo "🌐 Frontend: https://your-domain.gov"
echo "🔧 Backend: http://localhost:3000"
echo ""
echo "📝 View logs with: pm2 logs $PM2_APP_NAME"