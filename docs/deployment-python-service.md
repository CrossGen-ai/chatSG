# Deploying the Python Mem0 Service

The ChatSG application now includes a Python-based Mem0 service that must be deployed alongside the Node.js backend. Here are the deployment options:

## Option 1: PM2 (Recommended)

### Setup
```bash
# Install dependencies
cd backend/python-mem0
pip3 install -r requirements.txt

# Or with UV (faster)
uv pip sync requirements.txt
```

### Add to your main PM2 ecosystem file
```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'chatsg-backend',
      script: './backend/server.js',
      // ... your existing backend config
    },
    {
      name: 'chatsg-mem0',
      script: 'uvicorn',
      args: 'src.main:app --host 0.0.0.0 --port 8001',
      cwd: './backend/python-mem0',
      interpreter: 'python3',
      env_file: '../.env',  // Load from parent .env
      error_file: '../logs/mem0-error.log',
      out_file: '../logs/mem0-out.log',
      instances: 1,
      autorestart: true,
      max_memory_restart: '1G'
    }
  ]
};
```

### Start with PM2
```bash
# Start all services
pm2 start ecosystem.config.js

# Or start individually
pm2 start backend/python-mem0/ecosystem.config.js
```

## Option 2: Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - MEM0_PYTHON_SERVICE_URL=http://mem0:8001
    depends_on:
      - mem0
      - postgres
      - qdrant

  mem0:
    build: ./backend/python-mem0
    ports:
      - "8001:8001"
    env_file:
      - ./backend/.env
    depends_on:
      - qdrant
    restart: unless-stopped

  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
    volumes:
      - qdrant_data:/qdrant/storage

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: chatsg
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  qdrant_data:
  postgres_data:
```

Create a Dockerfile for the Python service:
```dockerfile
# backend/python-mem0/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install UV for faster dependency installation
RUN pip install uv

# Copy dependency files
COPY pyproject.toml requirements.txt ./

# Install dependencies
RUN uv pip sync requirements.txt

# Copy application code
COPY src ./src

# Expose port
EXPOSE 8001

# Start the service
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8001"]
```

## Option 3: Systemd Service (Linux)

```ini
# /etc/systemd/system/chatsg-mem0.service
[Unit]
Description=ChatSG Mem0 Python Service
After=network.target postgresql.service

[Service]
Type=exec
User=your-user
WorkingDirectory=/path/to/chatSG/backend/python-mem0
Environment="PATH=/usr/local/bin:/usr/bin:/bin"
EnvironmentFile=/path/to/chatSG/backend/.env
ExecStart=/usr/bin/python3 -m uvicorn src.main:app --host 0.0.0.0 --port 8001
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable chatsg-mem0
sudo systemctl start chatsg-mem0
```

## Option 4: Supervisor

```ini
# /etc/supervisor/conf.d/chatsg-mem0.conf
[program:chatsg-mem0]
command=/usr/bin/python3 -m uvicorn src.main:app --host 0.0.0.0 --port 8001
directory=/path/to/chatSG/backend/python-mem0
user=your-user
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/chatsg/mem0.log
environment=PATH="/usr/local/bin:/usr/bin:/bin"
```

## Environment Variables

Ensure these are set in your production environment:

```bash
# Memory System Configuration
MEM0_ENABLED=true
MEM0_PYTHON_SERVICE_URL=http://localhost:8001
MEM0_MODELS=openai  # or 'azure' for Azure OpenAI

# For OpenAI
OPENAI_API_KEY=your-key
MEM0_LLM_MODEL=gpt-4o-mini
MEM0_EMBEDDING_MODEL=text-embedding-3-small

# For Azure OpenAI (GCC High)
# AZURE_OPENAI_API_KEY=your-key
# AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
# AZURE_OPENAI_DEPLOYMENT=gpt-4o-deployment
# AZURE_OPENAI_EMBEDDING_DEPLOYMENT=embedding-deployment

# Vector Database
QDRANT_URL=http://localhost:6333

# Optional Graph Database
# MEM0_GRAPH_ENABLED=true
# NEO4J_URL=neo4j://localhost:7687
# NEO4J_USERNAME=neo4j
# NEO4J_PASSWORD=your-password
```

## Health Checks

Add health checks to ensure the service is running:

### PM2
```javascript
{
  name: 'chatsg-mem0',
  script: 'uvicorn',
  // ... other config
  min_uptime: '10s',
  max_restarts: 10,
  exec_mode: 'fork',
  listen_timeout: 3000,
}
```

### Docker
```yaml
mem0:
  # ... other config
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:8001/health"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 40s
```

## Production Considerations

1. **Dependencies**: Ensure Qdrant vector database is running and accessible
2. **Memory**: The Python service uses ~200-500MB RAM depending on load
3. **CPU**: Minimal CPU usage except during embedding generation
4. **Scaling**: Currently designed for single instance; for scaling, implement Redis-based session sharing
5. **Logging**: Configure proper log rotation for Python service logs
6. **Monitoring**: Add the `/health` endpoint to your monitoring system

## Startup Order

Ensure services start in this order:
1. PostgreSQL
2. Qdrant
3. Python Mem0 Service
4. Node.js Backend
5. Frontend (if applicable)

The Node.js backend will retry connections to the Python service, so exact timing isn't critical.