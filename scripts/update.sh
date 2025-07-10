#!/bin/bash
# Quick update script for ChatSG
# Use this for quick updates without full rebuild

set -e

APP_DIR="/opt/chatsg"
PM2_APP_NAME="chatsg-backend"

echo "🔄 Quick update for ChatSG..."

cd $APP_DIR

# Pull latest changes
git pull origin main

# Restart backend if server.js changed
if git diff HEAD~ --name-only | grep -q "backend/server.js"; then
    echo "🚀 Restarting backend..."
    cd backend
    pm2 restart $PM2_APP_NAME
fi

# Rebuild frontend if needed
if git diff HEAD~ --name-only | grep -q "frontend/"; then
    echo "🔨 Rebuilding frontend..."
    cd $APP_DIR/frontend
    npm run build
    sudo rm -rf /var/www/chatsg/*
    sudo cp -r dist/* /var/www/chatsg/
    sudo chown -R www-data:www-data /var/www/chatsg
fi

echo "✅ Update complete!"