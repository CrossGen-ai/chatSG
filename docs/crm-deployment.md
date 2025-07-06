# CRM Deployment and Operations Guide

This guide covers deployment, configuration, monitoring, and operational procedures for the ChatSG CRM integration in production environments.

## Table of Contents

- [Production Deployment](#production-deployment)
- [Environment Configuration](#environment-configuration)
- [Monitoring and Alerting](#monitoring-and-alerting)
- [Performance Optimization](#performance-optimization)
- [Backup and Recovery](#backup-and-recovery)
- [Troubleshooting](#troubleshooting)
- [Operational Procedures](#operational-procedures)

## Production Deployment

### Prerequisites

1. **Server Requirements**
   - Node.js 18+ (LTS recommended)
   - RAM: 4GB minimum, 8GB recommended
   - Storage: 20GB minimum for logs and data
   - Network: Outbound HTTPS access to Insightly and LLM APIs

2. **API Access**
   - Insightly CRM API key with appropriate permissions
   - OpenAI API key or Azure OpenAI credentials
   - Rate limit considerations (see [Performance](#performance-optimization))

3. **Security Requirements**
   - SSL/TLS certificates for HTTPS
   - Firewall configuration
   - API key management system

### Deployment Steps

#### 1. Environment Setup

```bash
# Create production user
sudo useradd -m -s /bin/bash chatsg
sudo su - chatsg

# Clone repository
git clone <repository-url> chatsg-prod
cd chatsg-prod

# Install dependencies
npm ci --production
```

#### 2. Configuration

```bash
# Create production environment file
cp backend/.env.example backend/.env.production

# Configure production settings
nano backend/.env.production
```

**Production Environment Variables:**

```bash
# Application Environment
CHATSG_ENVIRONMENT=production
NODE_ENV=production

# Server Configuration
PORT=3000
HOST=0.0.0.0

# LLM Provider
OPENAI_API_KEY=your_production_openai_key
OPENAI_MODEL=gpt-4o

# CRM Configuration
INSIGHTLY_API_KEY=your_production_insightly_key
INSIGHTLY_API_URL=https://api.insightly.com/v3.1

# Rate Limiting (Production Values)
CRM_MAX_PAGE_SIZE=20
CRM_REQUEST_TIMEOUT=15000
CRM_RATE_LIMIT_MAX_REQUESTS=5
CRM_RATE_LIMIT_WINDOW_MS=2000

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/chatsg/application.log

# Memory Management
MEM0_ENABLED=true
MEM0_TIMEOUT=5000

# Security
CSRF_SECRET=your_csrf_secret_key
SESSION_SECRET=your_session_secret_key
```

#### 3. System Service Setup

Create systemd service for production management:

```bash
sudo nano /etc/systemd/system/chatsg.service
```

```ini
[Unit]
Description=ChatSG Multi-Agent Platform
After=network.target

[Service]
Type=simple
User=chatsg
Group=chatsg
WorkingDirectory=/home/chatsg/chatsg-prod
Environment=NODE_ENV=production
EnvironmentFile=/home/chatsg/chatsg-prod/backend/.env.production
ExecStart=/usr/bin/node backend/server.js
Restart=on-failure
RestartSec=10

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/home/chatsg/chatsg-prod/backend/data
ReadWritePaths=/var/log/chatsg

# Resource limits
LimitNOFILE=65536
MemoryMax=2G

[Install]
WantedBy=multi-user.target
```

#### 4. Start and Enable Service

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service
sudo systemctl enable chatsg

# Start service
sudo systemctl start chatsg

# Check status
sudo systemctl status chatsg
```

### Reverse Proxy Configuration

#### Nginx Configuration

```nginx
upstream chatsg_backend {
    server 127.0.0.1:3000;
    keepalive 32;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

    # Rate limiting for CRM endpoints
    location /api/chat {
        limit_req zone=chat_limit burst=10 nodelay;
        proxy_pass http://chatsg_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # SSE streaming support
    location /api/chat/stream {
        proxy_pass http://chatsg_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # SSE specific headers
        proxy_set_header Connection '';
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # Static files (if serving frontend)
    location / {
        root /home/chatsg/chatsg-prod/frontend/dist;
        try_files $uri $uri/ /index.html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# Rate limiting zone
http {
    limit_req_zone $binary_remote_addr zone=chat_limit:10m rate=10r/m;
}
```

## Environment Configuration

### Development vs Production

| Setting | Development | Production |
|---------|-------------|------------|
| Rate Limits | Relaxed (10 req/sec) | Strict (5 req/2sec) |
| Timeouts | Short (10s) | Extended (15s) |
| Logging | Debug | Info/Warn/Error |
| Memory Timeouts | 2s | 5s |
| Page Size | 50 items | 20 items |
| SSL | Optional | Required |

### Multi-Environment Setup

```bash
# Environment-specific configs
backend/
├── .env.development
├── .env.staging
├── .env.production
└── config/
    ├── development.json
    ├── staging.json
    └── production.json
```

### Configuration Validation

```bash
# Validate configuration before deployment
npm run config:validate

# Test CRM connectivity
npm run test:crm:connectivity

# Verify agent initialization
npm run test:agents:init
```

## Monitoring and Alerting

### Health Check Endpoints

```bash
# Application health
curl https://your-domain.com/api/health

# CRM agent health  
curl https://your-domain.com/api/agents/crm/health

# Database connectivity
curl https://your-domain.com/api/health/database
```

### Logging Configuration

#### Application Logs

```javascript
// Production logging setup
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: '/var/log/chatsg/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: '/var/log/chatsg/application.log' 
    })
  ]
});
```

#### CRM-Specific Logging

```bash
# Monitor CRM operations
tail -f /var/log/chatsg/application.log | grep "CRMAgent"

# Monitor API errors
tail -f /var/log/chatsg/error.log | grep "Insightly\|CRM"

# Performance monitoring
tail -f /var/log/chatsg/application.log | grep "processingTime"
```

### Monitoring Tools

#### Prometheus Metrics

```javascript
// Custom metrics for CRM operations
const prometheus = require('prom-client');

const crmRequestDuration = new prometheus.Histogram({
  name: 'crm_request_duration_seconds',
  help: 'Duration of CRM requests',
  labelNames: ['operation', 'status']
});

const crmRequestCount = new prometheus.Counter({
  name: 'crm_requests_total',
  help: 'Total CRM requests',
  labelNames: ['operation', 'status']
});
```

#### Alert Rules

```yaml
# Example Prometheus alert rules
groups:
  - name: chatsg.crm
    rules:
      - alert: CRMHighErrorRate
        expr: rate(crm_requests_total{status="error"}[5m]) > 0.1
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High CRM error rate detected"
          
      - alert: CRMSlowResponse
        expr: histogram_quantile(0.95, crm_request_duration_seconds) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "CRM responses are slow"
```

## Performance Optimization

### Database Optimization

```bash
# Index optimization for session storage
# Ensure indexes on frequently queried fields

# Session index optimization
{
  "sessionId": 1,
  "timestamp": -1,
  "status": 1
}

# Message index optimization  
{
  "sessionId": 1,
  "timestamp": -1,
  "type": 1
}
```

### CRM API Optimization

#### Connection Pooling

```javascript
// Optimize HTTP connections to Insightly
const axios = require('axios');
const https = require('https');

const agent = new https.Agent({
  keepAlive: true,
  maxSockets: 10,
  maxFreeSockets: 5,
  timeout: 60000,
  freeSocketTimeout: 30000
});

const crmClient = axios.create({
  httpsAgent: agent,
  timeout: 15000
});
```

#### Caching Strategy

```javascript
// Redis caching for CRM data
const redis = require('redis');
const client = redis.createClient();

// Cache contact lookups for 5 minutes
const cacheKey = `contact:${contactId}`;
const cachedData = await client.get(cacheKey);

if (!cachedData) {
  const contactData = await insightlyAPI.getContact(contactId);
  await client.setex(cacheKey, 300, JSON.stringify(contactData));
  return contactData;
}
```

### Performance Benchmarks

| Metric | Target | Alert Threshold |
|--------|--------|----------------|
| CRM Query Response | < 2s | > 5s |
| Contact Search | < 1s | > 3s |
| Pipeline Analysis | < 3s | > 8s |
| Memory Usage | < 1GB | > 2GB |
| CPU Usage | < 50% | > 80% |

## Backup and Recovery

### Data Backup

```bash
#!/bin/bash
# Daily backup script

BACKUP_DIR="/backup/chatsg"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup session data
tar -czf "$BACKUP_DIR/sessions_$DATE.tar.gz" \
  /home/chatsg/chatsg-prod/backend/data/sessions/

# Backup configuration
cp /home/chatsg/chatsg-prod/backend/.env.production \
   "$BACKUP_DIR/config_$DATE.env"

# Cleanup old backups (keep 30 days)
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete
find "$BACKUP_DIR" -name "*.env" -mtime +30 -delete
```

### Recovery Procedures

#### Session Data Recovery

```bash
# Stop service
sudo systemctl stop chatsg

# Restore session data
cd /home/chatsg/chatsg-prod/backend/data/
tar -xzf /backup/chatsg/sessions_YYYYMMDD_HHMMSS.tar.gz

# Fix permissions
chown -R chatsg:chatsg sessions/

# Start service
sudo systemctl start chatsg
```

#### Configuration Recovery

```bash
# Restore configuration
cp /backup/chatsg/config_YYYYMMDD_HHMMSS.env \
   /home/chatsg/chatsg-prod/backend/.env.production

# Restart service
sudo systemctl restart chatsg
```

## Troubleshooting

### Common Issues

#### 1. CRM Agent Initialization Failures

**Symptoms:**
- "CRM Agent LLM understanding failed" errors
- Slash commands falling back to other agents

**Diagnosis:**
```bash
# Check agent status
curl http://localhost:3000/api/agents/crm/health

# Review initialization logs
sudo journalctl -u chatsg | grep "CRMAgent.*Initializing"
```

**Solutions:**
1. Verify API keys are correctly set
2. Check network connectivity to LLM provider
3. Validate environment variable format

#### 2. API Rate Limiting

**Symptoms:**
- "Rate limit exceeded" errors
- Slow CRM responses

**Diagnosis:**
```bash
# Monitor rate limiting
grep "Rate limit" /var/log/chatsg/application.log

# Check current request rate
grep "CRMAgent.*Executing" /var/log/chatsg/application.log | tail -20
```

**Solutions:**
1. Adjust rate limiting parameters
2. Implement request queuing
3. Add caching layer

#### 3. Memory Leaks

**Symptoms:**
- Gradually increasing memory usage
- Performance degradation over time

**Diagnosis:**
```bash
# Monitor memory usage
ps aux | grep node

# Check for unclosed connections
netstat -an | grep ESTABLISHED | wc -l
```

**Solutions:**
1. Restart service during maintenance window
2. Implement connection pooling
3. Add memory monitoring alerts

### Debug Mode

```bash
# Enable debug logging
sudo systemctl edit chatsg
```

```ini
[Service]
Environment=DEBUG=crm:*
Environment=LOG_LEVEL=debug
```

```bash
# Apply changes
sudo systemctl daemon-reload
sudo systemctl restart chatsg
```

## Operational Procedures

### Deployment Updates

#### Zero-Downtime Deployment

```bash
#!/bin/bash
# Blue-green deployment script

# Pull latest code
git pull origin main

# Install dependencies
npm ci --production

# Build application
npm run build

# Test configuration
npm run config:validate

# Graceful restart
sudo systemctl reload chatsg

# Health check
sleep 10
curl -f http://localhost:3000/api/health || exit 1

echo "Deployment successful"
```

### Maintenance Procedures

#### Weekly Maintenance

```bash
#!/bin/bash
# Weekly maintenance script

# Restart service for memory cleanup
sudo systemctl restart chatsg

# Clean old logs
find /var/log/chatsg -name "*.log.*" -mtime +7 -delete

# Clean old session data (if configured)
find /home/chatsg/chatsg-prod/backend/data/sessions \
  -name "*.jsonl" -mtime +90 -delete

# Update dependencies (if scheduled)
npm audit fix --production

# Performance check
npm run test:performance
```

#### Emergency Procedures

```bash
# Emergency shutdown
sudo systemctl stop chatsg

# Emergency restart with safe mode
sudo systemctl start chatsg

# Check for critical errors
sudo journalctl -u chatsg --since "1 hour ago" | grep -E "ERROR|FATAL"

# Validate service health
curl -f http://localhost:3000/api/health
```

### Scaling Considerations

#### Horizontal Scaling

1. **Load Balancer Configuration**
   - Session affinity for streaming connections
   - Health check configuration
   - SSL termination

2. **Database Clustering**
   - Session data replication
   - Read/write separation
   - Backup coordination

3. **API Rate Limiting**
   - Distributed rate limiting
   - Shared cache for limits
   - Circuit breaker patterns

#### Vertical Scaling

1. **Memory Optimization**
   - Increase heap size: `--max-old-space-size=4096`
   - Monitor memory usage patterns
   - Implement memory-efficient data structures

2. **CPU Optimization**
   - Enable clustering mode
   - Use PM2 for process management
   - Optimize LLM request batching

## Security Considerations

### API Key Management

```bash
# Use secret management service
export INSIGHTLY_API_KEY=$(vault kv get -field=api_key secret/crm/insightly)
export OPENAI_API_KEY=$(vault kv get -field=api_key secret/llm/openai)
```

### Network Security

```bash
# Firewall configuration
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP (redirect to HTTPS)
sudo ufw allow 443/tcp  # HTTPS
sudo ufw deny 3000/tcp  # Block direct backend access
sudo ufw enable
```

### Audit Logging

```javascript
// Audit log configuration
const auditLogger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: '/var/log/chatsg/audit.log' 
    })
  ]
});

// Log CRM access
auditLogger.info('CRM_ACCESS', {
  userId: req.user?.id,
  sessionId: req.sessionId,
  operation: 'contact_search',
  query: sanitizedQuery,
  ip: req.ip,
  userAgent: req.get('User-Agent')
});
```

This deployment guide provides comprehensive coverage of production deployment, monitoring, and operational procedures for the ChatSG CRM integration. Adjust configurations based on your specific infrastructure and requirements.