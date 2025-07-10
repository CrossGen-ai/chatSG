# ChatSG Deployment Guide

This guide provides step-by-step instructions for deploying ChatSG to a production environment, specifically for GCC High compliance.

## Prerequisites

- Ubuntu 20.04+ or RHEL 8+ VM
- Minimum 4GB RAM, 2 vCPUs
- 20GB+ disk space
- SSH access with sudo privileges
- Domain name with SSL certificate
- GitHub account with repository access

## Pre-Deployment Checklist

1. **Clean your local repository:**
   ```bash
   # Remove all logs and temporary files
   rm -rf backend/logs/* frontend/logs/* logs/*
   rm -f backend/*.db backend/tests/integration/*.db
   
   # Ensure .env files are not committed
   git status  # Check no .env files are staged
   ```

2. **Commit your changes:**
   ```bash
   git add .
   git commit -m "Prepare for production deployment"
   git push origin main
   ```

## Step 1: Initial VM Setup

1. **SSH into your VM:**
   ```bash
   ssh user@your-server.gov
   ```

2. **Clone the repository:**
   ```bash
   cd /home/your-user
   git clone https://github.com/your-org/chatsg.git
   cd chatsg
   ```

3. **Run the setup script:**
   ```bash
   chmod +x scripts/setup-vm.sh
   sudo ./scripts/setup-vm.sh
   ```

   This script installs:
   - Node.js 18.x
   - PostgreSQL
   - Redis
   - nginx
   - PM2
   - SSL tools (certbot)

## Step 2: Configure PostgreSQL

1. **Update PostgreSQL password:**
   ```bash
   sudo -u postgres psql
   ALTER USER chatsguser WITH PASSWORD 'your-secure-password';
   \q
   ```

2. **Test connection:**
   ```bash
   psql -U chatsguser -d chatsg -h localhost
   ```

## Step 3: Configure the Application

1. **Move application to /opt:**
   ```bash
   sudo mv ~/chatsg /opt/
   sudo chown -R $USER:$USER /opt/chatsg
   cd /opt/chatsg
   ```

2. **Create environment file:**
   ```bash
   cd backend
   cp env.production.sample .env
   nano .env  # Edit with your values
   ```

   **Critical GCC High settings:**
   ```
   # Azure AD for GCC High
   AZURE_CLIENT_ID=your-client-id
   AZURE_CLIENT_SECRET=your-secret
   AZURE_TENANT_ID=your-tenant-id
   AZURE_REDIRECT_URI=https://your-domain.gov/api/auth/callback
   
   # Update authority URL in the code (see Step 6)
   ```

## Step 4: Configure nginx

1. **Create nginx configuration:**
   ```bash
   sudo nano /etc/nginx/sites-available/chatsg
   ```

2. **Add configuration:**
   ```nginx
   server {
       listen 80;
       server_name your-domain.gov;
       return 301 https://$server_name$request_uri;
   }
   
   server {
       listen 443 ssl http2;
       server_name your-domain.gov;
       
       # SSL configuration
       ssl_certificate /etc/letsencrypt/live/your-domain.gov/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/your-domain.gov/privkey.pem;
       
       # Security headers
       add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
       add_header X-Frame-Options "DENY" always;
       add_header X-Content-Type-Options "nosniff" always;
       add_header X-XSS-Protection "1; mode=block" always;
       
       # Frontend
       location / {
           root /var/www/chatsg;
           try_files $uri $uri/ /index.html;
       }
       
       # Backend API
       location /api {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
           
           # SSE specific settings
           proxy_buffering off;
           proxy_read_timeout 86400;
       }
   }
   ```

3. **Enable the site:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/chatsg /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

## Step 5: SSL Certificate Setup

1. **For GCC High (with existing certificates):**
   ```bash
   sudo mkdir -p /etc/ssl/chatsg
   # Copy your .crt and .key files
   sudo cp your-cert.crt /etc/ssl/chatsg/
   sudo cp your-key.key /etc/ssl/chatsg/
   ```

2. **For testing (Let's Encrypt):**
   ```bash
   sudo certbot --nginx -d your-domain.gov
   ```

## Step 6: Update Code for GCC High

**IMPORTANT:** Update the Azure AD authority URL:

```bash
cd /opt/chatsg/backend
nano middleware/security/auth.js
```

Change line 11:
```javascript
// From:
authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,

// To:
authority: `https://login.microsoftonline.us/${process.env.AZURE_TENANT_ID}`,
```

## Step 7: Deploy the Application

1. **Run the deployment script:**
   ```bash
   cd /opt/chatsg
   chmod +x scripts/deploy.sh
   ./scripts/deploy.sh
   ```

2. **Start the application with PM2:**
   ```bash
   cd /opt/chatsg
   pm2 start ecosystem.config.js --env production
   pm2 save
   pm2 startup  # Follow the instructions
   ```

## Step 8: Verify Deployment

1. **Check backend status:**
   ```bash
   pm2 status
   pm2 logs chatsg-backend
   curl http://localhost:3000/api/health
   ```

2. **Check frontend:**
   - Navigate to https://your-domain.gov
   - Verify the UI loads correctly

3. **Test authentication:**
   - Click login
   - Should redirect to Azure AD GCC High
   - After login, should return to your app

## Step 9: Security Hardening

1. **Configure firewall:**
   ```bash
   sudo ufw status
   # Should show only 22, 80, 443 open
   ```

2. **Set up fail2ban:**
   ```bash
   sudo apt-get install fail2ban
   sudo systemctl enable fail2ban
   ```

3. **Enable audit logging:**
   ```bash
   sudo mkdir -p /var/log/chatsg
   sudo chown $USER:$USER /var/log/chatsg
   ```

## Maintenance

### Updating the Application

```bash
cd /opt/chatsg
./scripts/update.sh
```

### Viewing Logs

```bash
# Application logs
pm2 logs chatsg-backend

# nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# System logs
sudo journalctl -u nginx
sudo journalctl -u postgresql
```

### Backup Database

```bash
pg_dump -U chatsguser chatsg > backup_$(date +%Y%m%d).sql
```

## Troubleshooting

### Backend won't start
- Check logs: `pm2 logs chatsg-backend`
- Verify .env file exists and has correct values
- Check PostgreSQL connection

### Authentication fails
- Verify Azure AD configuration
- Check redirect URI matches exactly
- Ensure authority URL uses .us domain for GCC High

### Frontend shows blank page
- Check nginx error logs
- Verify frontend build completed
- Check browser console for errors

## Security Considerations

1. **Never commit .env files**
2. **Use strong passwords for all services**
3. **Keep all packages updated**
4. **Monitor logs regularly**
5. **Set up automated backups**
6. **Use FIPS 140-2 compliant crypto (for GCC High)**

## Support

For issues:
1. Check PM2 logs
2. Review nginx error logs
3. Verify all environment variables are set
4. Ensure all services are running