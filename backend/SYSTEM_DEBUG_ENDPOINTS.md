# System Debug Endpoints

Comprehensive system testing endpoints for ChatSG. All endpoints require authentication (you must be logged in).

## Base URL
- Production: `https://51.54.96.228`
- Local: `http://localhost:3000`

## Available Endpoints

### 1. Database Testing
**GET** `/api/system/test-database`

Tests PostgreSQL connection and provides database statistics:
- Connection pool status
- Table list and record counts
- Session table schema
- Current database time

```bash
curl -k https://51.54.96.228/api/system/test-database | jq
```

### 2. Storage System Testing
**GET** `/api/system/test-storage`

Tests the storage manager and session/message operations:
- Lists recent sessions
- Creates, writes to, and deletes a test session
- Verifies message storage and retrieval

```bash
curl -k https://51.54.96.228/api/system/test-storage | jq
```

### 3. Memory System Testing
**GET** `/api/system/test-memory?testMemory=true`

Tests Mem0, Qdrant, and Neo4j integration:
- Mem0 Python service health
- Qdrant vector database connection
- Neo4j graph database status
- Optional: Create test memory (add `?testMemory=true`)

```bash
# Check status only
curl -k https://51.54.96.228/api/system/test-memory | jq

# Also create test memory
curl -k "https://51.54.96.228/api/system/test-memory?testMemory=true" | jq
```

### 4. Chat System Testing
**GET** `/api/system/test-chat`

Tests chat orchestration and LLM configuration:
- Orchestrator status
- Agent availability
- LLM provider configuration (OpenAI/Azure)

```bash
curl -k https://51.54.96.228/api/system/test-chat | jq
```

### 5. Current User Info
**GET** `/api/system/current-user`

Shows authenticated user information:
- Session details
- User profile from database
- Authentication status

```bash
curl -k https://51.54.96.228/api/system/current-user | jq
```

### 6. System Health Check
**GET** `/api/system/health`

Quick health check of all services:
- Database connectivity
- Storage system status
- Mem0 Python service
- Qdrant vector database

```bash
curl -k https://51.54.96.228/api/system/health | jq
```

## Testing from Browser

Since you're logged in via browser, you can test these directly:

1. Open your browser where you're logged into ChatSG
2. Open developer tools (F12)
3. In the console, run:

```javascript
// Test database
fetch('/api/system/test-database')
  .then(r => r.json())
  .then(console.log);

// Test storage
fetch('/api/system/test-storage')
  .then(r => r.json())
  .then(console.log);

// Test memory systems
fetch('/api/system/test-memory')
  .then(r => r.json())
  .then(console.log);

// Get your user info
fetch('/api/system/current-user')
  .then(r => r.json())
  .then(console.log);

// Check system health
fetch('/api/system/health')
  .then(r => r.json())
  .then(console.log);
```

## Troubleshooting Specific Issues

### PostgreSQL SSL Errors
Run the database test to see connection details:
```bash
curl -k https://51.54.96.228/api/system/test-database | jq '.pool'
```

### Session Storage Issues
Test full storage operations:
```bash
curl -k https://51.54.96.228/api/system/test-storage | jq '.sessionOperations'
```

### Memory Service Offline
Check all memory services:
```bash
curl -k https://51.54.96.228/api/system/test-memory | jq '.mem0.pythonService'
```

### Chat Not Working
Verify orchestrator and LLM config:
```bash
curl -k https://51.54.96.228/api/system/test-chat | jq
```

## Expected Healthy Response

A healthy system should show:
```json
{
  "timestamp": "2025-07-12T...",
  "status": "healthy",
  "services": {
    "database": { "status": "healthy" },
    "storage": { "status": "healthy" },
    "mem0_python": { "status": "healthy" },
    "qdrant": { "status": "healthy" }
  },
  "unhealthyServices": []
}
```