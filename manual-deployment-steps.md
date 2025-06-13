# Manual Deployment Steps

## 1. SSH to the Server
```bash
ssh -i C:\Users\SeanPatterson\Downloads\vm-poc-dev-001.ppk itops_admin@10.2.0.54
```

## 2. Navigate to the Application Directory
```bash
cd /home/itops_admin/chatSG
ls -la  # Verify files are there
```

## 3. Install Node.js (if not already installed)
```bash
# Check if Node.js is installed
node --version
npm --version

# If not installed, install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

## 4. Install Dependencies
```bash
npm install
```

## 5. Check Environment Configuration
```bash
cat .env  # Should show ENVIRONMENT=dev
```

## 6. Start the Application
```bash
# Start in foreground (for testing)
npm start

# Or start in background (for production)
nohup npm start > app.log 2>&1 &
```

## 7. Test the Application
- Open browser to: `http://10.2.0.54:3000`
- You should see the ChatSG interface with StartGuides logo
- Test sending a message - should get dev mode simulated responses

## 8. For Production Mode
If you want to switch to production mode:
```bash
# Edit the .env file
nano .env
# Change ENVIRONMENT=dev to ENVIRONMENT=production
# Save and restart the server
```

## 9. Firewall (if needed)
If you can't access the app from outside the server:
```bash
# Allow port 3000 through firewall
sudo ufw allow 3000
# Or for specific IP ranges
sudo ufw allow from 10.0.0.0/8 to any port 3000
```

## 10. Process Management (Optional)
For production, consider using PM2:
```bash
# Install PM2
sudo npm install -g pm2

# Start with PM2
pm2 start server.js --name chatsg

# Save PM2 configuration
pm2 save
pm2 startup
```

## Troubleshooting
- Check logs: `tail -f app.log` (if using nohup)
- Check if port is listening: `netstat -tlnp | grep 3000`
- Check process: `ps aux | grep node` 