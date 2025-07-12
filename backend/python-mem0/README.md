# ChatSG Mem0 Python Service

A FastAPI-based service that provides memory management capabilities using Mem0, with support for both OpenAI and Azure OpenAI providers.

## Overview

This service acts as a bridge between the ChatSG TypeScript backend and the Mem0 memory management system. It was created to work around limitations in the TypeScript Mem0 SDK when using Azure OpenAI in GCC High environments.

## Features

- **Dual Provider Support**: Works with both OpenAI and Azure OpenAI
- **Memory Management**: Add, search, and retrieve memories
- **Session-based Storage**: Organize memories by user and session
- **Context Building**: Automatically build relevant context for queries
- **Health Monitoring**: Built-in health check endpoints
- **Configuration API**: Expose current configuration for debugging
- **UV Package Manager**: Fast dependency installation and management

## Installation

### Using UV (Recommended)

```bash
# Install UV if not already installed
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install dependencies
uv sync

# Install with development dependencies
uv sync --dev
```

### Using pip

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -e .

# Install with development dependencies
pip install -e ".[dev]"
```

## Configuration

The service reads configuration from environment variables:

### OpenAI Configuration
```bash
MEM0_MODELS=openai
OPENAI_API_KEY=your-api-key
MEM0_LLM_MODEL=gpt-4o-mini
MEM0_EMBEDDING_MODEL=text-embedding-3-small
```

### Azure OpenAI Configuration
```bash
MEM0_MODELS=azure
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=your-llm-deployment
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=your-embedding-deployment
AZURE_OPENAI_API_VERSION=2024-02-15-preview  # Optional
```

### Optional Configuration
```bash
# Qdrant Vector Database
QDRANT_URL=http://localhost:6333  # Default

# Neo4j Graph Database (if using graph features)
MEM0_GRAPH_ENABLED=true
NEO4J_URL=neo4j://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your-password

# Service Configuration
MEM0_PYTHON_SERVICE_PORT=8001  # Default
```

## Running the Service

### Development Mode

```bash
# Using the start script
./scripts/start.sh

# Or directly with uvicorn
uvicorn src.main:app --reload --host 0.0.0.0 --port 8001
```

### Production Mode

```bash
# Using PM2 (recommended)
pm2 start ecosystem.config.js

# Or with uvicorn
uvicorn src.main:app --host 0.0.0.0 --port 8001 --workers 4
```

## API Endpoints

### Health Check
```http
GET /health
```

### Configuration Info
```http
GET /config
```

### Add Messages to Memory
```http
POST /add
{
  "messages": [...],
  "session_id": "session-123",
  "user_id": 1
}
```

### Search Memories
```http
POST /search
{
  "query": "search text",
  "session_id": "session-123",  // optional
  "user_id": 1,                 // optional
  "limit": 10                   // optional
}
```

### Get Session Memories
```http
POST /get-session-memories
{
  "session_id": "session-123",
  "user_id": 1,
  "limit": 100  // optional
}
```

### Get All User Memories
```http
POST /get-all-user-memories
{
  "user_id": 1,
  "limit": 1000  // optional
}
```

### Get Context for Query
```http
POST /get-context
{
  "query": "user question",
  "session_id": "session-123",
  "user_id": 1,
  "max_messages": 50  // optional
}
```

### Delete Session Memories
```http
POST /delete-session-memories
{
  "session_id": "session-123",
  "user_id": 1
}
```

## Development

### Running Tests
```bash
# Run all tests
uv run pytest

# Run with coverage
uv run pytest --cov=src

# Run specific test file
uv run pytest tests/test_mem0_service.py
```

### Code Formatting
```bash
# Format with black
uv run black src tests

# Lint with ruff
uv run ruff check src tests

# Type check with mypy
uv run mypy src
```

## Project Structure
```
python-mem0/
├── src/
│   ├── __init__.py
│   ├── main.py           # FastAPI application
│   ├── config.py         # Configuration management
│   ├── mem0_service.py   # Mem0 service implementation
│   └── models.py         # Pydantic models
├── tests/
│   ├── __init__.py
│   └── test_mem0_service.py
├── scripts/
│   └── start.sh          # Startup script
├── pyproject.toml        # Project configuration
├── uv.lock              # Dependency lock file
└── README.md            # This file
```

## Troubleshooting

### Service Won't Start
1. Check if port 8001 is already in use: `lsof -i :8001`
2. Verify environment variables are set correctly
3. Check logs for specific error messages

### Memory Operations Failing
1. Ensure Qdrant is running: `curl http://localhost:6333/collections`
2. Verify API keys are valid
3. Check if the collection exists in Qdrant

### Azure OpenAI Errors
1. Verify endpoint URL includes `https://`
2. Check deployment names match your Azure resources
3. Ensure API version is compatible

## License

MIT License - see the parent project's LICENSE file for details.