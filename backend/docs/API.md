# ChatSG Backend API Documentation

## Overview

ChatSG backend provides a comprehensive RESTful API for managing conversations, user sessions, memory storage, and agent interactions. The API is built with Node.js/Express and includes advanced features like real-time streaming, intelligent memory management, and security middleware.

## Table of Contents

1. [Authentication](#authentication)
2. [Chat Management](#chat-management)
3. [Memory System](#memory-system)
4. [Slash Commands](#slash-commands)
5. [Agent Management](#agent-management)
6. [Performance Monitoring](#performance-monitoring)
7. [Configuration](#configuration)
8. [Security](#security)
9. [Health Checks](#health-checks)
10. [Error Handling](#error-handling)

## Base URL

- **Development**: `http://localhost:3000`
- **Production**: `https://your-domain.com`

## Authentication

### Login
```http
GET /api/auth/login
```
Initiates OAuth login flow.

**Response:**
- Redirects to OAuth provider

### OAuth Callback
```http
GET /api/auth/callback
```
Handles OAuth callback and establishes session.

**Query Parameters:**
- `code` - OAuth authorization code
- `state` - OAuth state parameter

### Logout
```http
POST /api/auth/logout
```
Terminates user session.

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Get Current User
```http
GET /api/auth/user
```
Returns current authenticated user information.

**Response:**
```json
{
  "user": {
    "id": "user-123",
    "name": "John Doe",
    "email": "john@example.com",
    "databaseId": 42
  },
  "authenticated": true
}
```

## Chat Management

### Create New Chat
```http
POST /api/chats
```
Creates a new chat session.

**Request Body:**
```json
{
  "title": "New Chat Session",
  "initialMessage": "Hello, how can you help me today?"
}
```

**Response:**
```json
{
  "sessionId": "chat-uuid-123",
  "title": "New Chat Session",
  "createdAt": "2023-01-01T00:00:00.000Z",
  "messageCount": 1
}
```

### Get All Chats
```http
GET /api/chats
```
Retrieves all chat sessions for the authenticated user.

**Query Parameters:**
- `limit` (optional) - Maximum number of chats to return (default: 50)
- `offset` (optional) - Number of chats to skip (default: 0)
- `status` (optional) - Filter by status: active, inactive, archived

**Response:**
```json
{
  "chats": [
    {
      "sessionId": "chat-uuid-123",
      "title": "Chat Session 1",
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T01:00:00.000Z",
      "messageCount": 15,
      "status": "active",
      "lastAgent": "analytical",
      "preview": "Last message preview..."
    }
  ],
  "total": 42,
  "hasMore": true
}
```

### Get Chat History
```http
GET /api/chats/{sessionId}/history
```
Retrieves complete chat history for a specific session.

**Path Parameters:**
- `sessionId` - Unique chat session identifier

**Query Parameters:**
- `limit` (optional) - Maximum number of messages (default: 100)
- `offset` (optional) - Message offset for pagination
- `includeMemory` (optional) - Include memory context (default: false)

**Response:**
```json
{
  "sessionId": "chat-uuid-123",
  "title": "Chat Session",
  "messages": [
    {
      "id": 1,
      "content": "Hello!",
      "sender": "user",
      "timestamp": "2023-01-01T00:00:00.000Z",
      "agent": null,
      "synced": true
    },
    {
      "id": 2,
      "content": "Hello! How can I help you today?",
      "sender": "bot",
      "timestamp": "2023-01-01T00:01:00.000Z",
      "agent": "analytical",
      "synced": true,
      "toolsUsed": [
        {
          "toolName": "ContextRetriever",
          "executionTime": 150,
          "success": true
        }
      ]
    }
  ],
  "metadata": {
    "messageCount": 2,
    "agentHistory": ["analytical"],
    "totalTokensUsed": 245
  }
}
```

### Send Message (Streaming)
```http
POST /api/chat/stream
Content-Type: application/json
```
Sends a message and streams the response in real-time using Server-Sent Events.

**Request Body:**
```json
{
  "message": "What is machine learning?",
  "sessionId": "chat-uuid-123",
  "includeMemory": true,
  "agentPreference": "analytical"
}
```

**Response Headers:**
- `Content-Type: text/event-stream`
- `Cache-Control: no-cache`
- `Connection: keep-alive`

**Event Types:**
- `start` - Response generation started
- `token` - Content token received
- `tool_start` - Tool execution began
- `tool_result` - Tool execution completed
- `status` - Status update
- `end` - Response completed
- `error` - Error occurred

**Example Events:**
```
data: {"type": "start", "agent": "analytical", "sessionId": "chat-uuid-123"}

data: {"type": "token", "content": "Machine"}

data: {"type": "tool_start", "toolId": "tool-123", "toolName": "DataAnalyzer"}

data: {"type": "tool_result", "toolId": "tool-123", "result": {...}}

data: {"type": "token", "content": " learning"}

data: {"type": "end", "message": "Complete response", "metadata": {...}}
```

### Send Message (Non-Streaming)
```http
POST /api/chat
Content-Type: application/json
```
Sends a message and returns complete response.

**Request Body:**
```json
{
  "message": "What is machine learning?",
  "sessionId": "chat-uuid-123"
}
```

**Response:**
```json
{
  "response": "Machine learning is a subset of artificial intelligence...",
  "agent": "analytical",
  "sessionId": "chat-uuid-123",
  "messageId": 42,
  "metadata": {
    "tokensUsed": 150,
    "executionTime": 2500,
    "toolsUsed": ["DataAnalyzer"],
    "memoryContext": 5
  }
}
```

### Add Message to Chat
```http
POST /api/chats/{sessionId}/messages
```
Adds a message to an existing chat session.

**Path Parameters:**
- `sessionId` - Chat session identifier

**Request Body:**
```json
{
  "content": "This is a user message",
  "type": "user",
  "metadata": {
    "timestamp": "2023-01-01T00:00:00.000Z"
  }
}
```

### Get Messages
```http
GET /api/chats/{sessionId}/messages
```
Retrieves messages from a chat session with pagination.

**Path Parameters:**
- `sessionId` - Chat session identifier

**Query Parameters:**
- `limit` - Number of messages to retrieve
- `offset` - Message offset for pagination
- `order` - Sort order: 'asc' or 'desc' (default: 'asc')

### Delete Chat
```http
DELETE /api/chats/{sessionId}
```
Deletes a chat session and all associated data.

**Path Parameters:**
- `sessionId` - Chat session identifier

**Response:**
```json
{
  "success": true,
  "message": "Chat deleted successfully"
}
```

### Mark Chat as Read
```http
PATCH /api/chats/{sessionId}/read
```
Marks a chat session as read.

**Path Parameters:**
- `sessionId` - Chat session identifier

## Memory System

### Cross-Session Memory Query
```http
POST /api/memory/cross-session
```
Searches for relevant memories across all user sessions.

**Request Body:**
```json
{
  "query": "What are my preferences?",
  "limit": 10,
  "sessionId": "current-session-id",
  "includeCurrentSession": false
}
```

**Response:**
```json
{
  "memories": [
    {
      "id": "mem-123",
      "memory": "User prefers analytical responses",
      "score": 0.92,
      "metadata": {
        "sessionId": "previous-session",
        "timestamp": "2023-01-01T00:00:00.000Z"
      }
    }
  ],
  "total": 5,
  "query": "What are my preferences?"
}
```

### Debug Memory Status
```http
GET /api/debug/mem0-status
```
Returns detailed memory system status for debugging.

**Response:**
```json
{
  "enabled": true,
  "provider": "qdrant",
  "qdrantConnected": true,
  "neo4jConnected": false,
  "collectionsCount": 3,
  "totalMemories": 1247
}
```

## Slash Commands

### Get Available Commands
```http
GET /api/slash-commands
```
Returns list of available slash commands.

**Response:**
```json
{
  "commands": [
    {
      "name": "analyze",
      "description": "Route to analytical agent",
      "usage": "/analyze <query>",
      "category": "routing",
      "agentType": "analytical"
    },
    {
      "name": "create",
      "description": "Route to creative agent", 
      "usage": "/create <prompt>",
      "category": "routing",
      "agentType": "creative"
    }
  ]
}
```

### Validate Command
```http
GET /api/slash-commands/validate/{command}
```
Validates a slash command syntax.

**Path Parameters:**
- `command` - Command name to validate

**Response:**
```json
{
  "valid": true,
  "command": "analyze",
  "agentType": "analytical",
  "description": "Routes to analytical agent"
}
```

### Slash Commands Health Check
```http
GET /api/slash-commands/health
```
Returns health status of slash command system.

**Response:**
```json
{
  "healthy": true,
  "commandsLoaded": 8,
  "processorReady": true
}
```

## Agent Management

### Get Chat Settings
```http
GET /api/chats/{sessionId}/settings
```
Retrieves agent settings and preferences for a chat session.

**Response:**
```json
{
  "agentPreference": "analytical",
  "agentLock": false,
  "crossSessionMemory": true,
  "lastAgent": "analytical"
}
```

### Update Chat Settings
```http
POST /api/chats/{sessionId}/settings
```
Updates agent settings for a chat session.

**Request Body:**
```json
{
  "agentPreference": "creative",
  "agentLock": true,
  "crossSessionMemory": false
}
```

### Get Available Agents
```http
GET /api/chats/{sessionId}/agents
```
Returns list of available agents and their capabilities.

**Response:**
```json
{
  "agents": [
    {
      "name": "analytical",
      "displayName": "📊 Analytical Agent",
      "description": "Specialized in data analysis and logical reasoning",
      "capabilities": ["data_analysis", "research", "problem_solving"],
      "active": true
    },
    {
      "name": "creative",
      "displayName": "🎨 Creative Agent", 
      "description": "Specialized in creative writing and brainstorming",
      "capabilities": ["writing", "brainstorming", "design"],
      "active": true
    }
  ],
  "currentAgent": "analytical"
}
```

## Performance Monitoring

### Performance Dashboard
```http
GET /api/performance/dashboard
```
Returns comprehensive performance metrics and analytics.

**Response:**
```json
{
  "overview": {
    "totalRequests": 1247,
    "averageResponseTime": 850,
    "errorRate": 0.02
  },
  "agents": {
    "analytical": {
      "requests": 645,
      "averageTime": 750,
      "successRate": 0.98
    }
  },
  "database": {
    "averageQueryTime": 45,
    "totalQueries": 3421,
    "connectionPool": {
      "active": 5,
      "idle": 15,
      "waiting": 0
    }
  },
  "memory": {
    "memoriesCreated": 2847,
    "averageSearchTime": 120,
    "qdrantHealth": "healthy"
  }
}
```

### Clear Performance Stats
```http
POST /api/performance/clear
```
Clears all performance monitoring data.

**Response:**
```json
{
  "success": true,
  "message": "Performance statistics cleared"
}
```

### Connection Diagnostics
```http
GET /api/diagnostics
```
Returns detailed system diagnostics.

**Response:**
```json
{
  "database": {
    "connected": true,
    "responseTime": 25,
    "poolStatus": "healthy"
  },
  "qdrant": {
    "connected": true,
    "responseTime": 45,
    "collections": ["chatsg-memories"]
  },
  "neo4j": {
    "connected": false,
    "error": "Connection refused"
  },
  "agents": {
    "loaded": 4,
    "healthy": 4,
    "errors": []
  }
}
```

## Configuration

### Markdown Configuration
```http
GET /api/config/markdown
```
Returns markdown processing configuration.

**Response:**
```json
{
  "allowedTags": ["p", "br", "strong", "em", "code", "pre"],
  "allowedAttributes": {
    "a": ["href", "title"],
    "code": ["class"]
  },
  "sanitize": true,
  "breaks": true
}
```

### Security Configuration  
```http
GET /api/config/security
```
Returns current security configuration (sanitized).

**Response:**
```json
{
  "csrfEnabled": true,
  "rateLimiting": {
    "enabled": true,
    "windowMs": 900000,
    "maxRequests": 100
  },
  "sessionTimeout": 86400,
  "encryptionEnabled": true
}
```

## Security

### Get CSRF Token
```http
GET /api/security/csrf-token
```
Returns CSRF token for protected requests.

**Response:**
```json
{
  "csrfToken": "abc123def456ghi789",
  "expiresIn": 3600
}
```

**Headers for Protected Requests:**
```
X-CSRF-Token: abc123def456ghi789
```

## Health Checks

### Basic Health Check
```http
GET /health
```
Basic health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2023-01-01T00:00:00.000Z",
  "uptime": 86400,
  "version": "1.0.0"
}
```

### Webhook Test
```http
POST /webhook-test/chat
```
Internal webhook endpoint for testing integrations.

## Error Handling

### Standard Error Response Format

All API endpoints return errors in a consistent format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "field": "sessionId",
      "reason": "Required field missing"
    },
    "timestamp": "2023-01-01T00:00:00.000Z",
    "requestId": "req-123-456"
  }
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden (CSRF token required)
- `404` - Not Found
- `429` - Too Many Requests (Rate Limited)
- `500` - Internal Server Error
- `503` - Service Unavailable

### Common Error Codes

- `AUTHENTICATION_REQUIRED` - User not authenticated
- `VALIDATION_ERROR` - Request validation failed
- `SESSION_NOT_FOUND` - Chat session doesn't exist
- `RATE_LIMITED` - Too many requests
- `CSRF_TOKEN_REQUIRED` - CSRF token missing or invalid
- `AGENT_UNAVAILABLE` - Requested agent not available
- `MEMORY_SERVICE_ERROR` - Memory system error
- `DATABASE_ERROR` - Database operation failed

## Rate Limiting

API endpoints are rate limited per IP address:

- **Default**: 100 requests per 15 minutes
- **Streaming**: 10 concurrent connections
- **Authentication**: 5 attempts per minute

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Request/Response Examples

### Complete Chat Flow Example

1. **Create Chat:**
```bash
curl -X POST http://localhost:3000/api/chats \
  -H "Content-Type: application/json" \
  -d '{"title": "ML Discussion"}'
```

2. **Send Streaming Message:**
```bash
curl -X POST http://localhost:3000/api/chat/stream \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "message": "Explain machine learning",
    "sessionId": "chat-uuid-123"
  }'
```

3. **Get Chat History:**
```bash
curl http://localhost:3000/api/chats/chat-uuid-123/history
```

### Memory Query Example

```bash
curl -X POST http://localhost:3000/api/memory/cross-session \
  -H "Content-Type: application/json" \
  -d '{
    "query": "machine learning preferences",
    "limit": 5
  }'
```

## SDK Integration

The API is designed to work with various client implementations:

- **JavaScript/TypeScript**: Native fetch API support
- **React**: Hooks provided for state management
- **Mobile**: Standard HTTP client libraries
- **Python**: Requests library compatible
- **curl**: Direct command-line access

## Changelog

### Version 1.0.0
- Initial API release
- Chat management endpoints
- Memory system integration
- Agent orchestration
- Streaming responses
- Security middleware
- Performance monitoring

### Future Enhancements
- WebSocket support for real-time bidirectional communication
- Bulk operations for chat management
- Advanced memory analytics
- Multi-modal message support (images, files)
- Plugin system for custom agents
- GraphQL endpoint as alternative to REST