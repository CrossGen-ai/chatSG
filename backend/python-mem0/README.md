# ChatSG Mem0 Python Service

A Python-based service for Mem0 memory management with Azure OpenAI support.

This service provides a FastAPI wrapper around the mem0ai library to handle both OpenAI and Azure OpenAI configurations, working around TypeScript SDK limitations.

## Features
- Azure OpenAI GCC High support
- OpenAI API support
- FastAPI endpoints for memory operations
- UV package manager for fast dependency installation

## Usage
Start the service with:
```bash
./scripts/start.sh
```

The service runs on port 8001 by default.