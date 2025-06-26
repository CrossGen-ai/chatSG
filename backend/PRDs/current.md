# Backend Chat History Storage System - PRD

## Overview
Implement a robust file-based storage system using JSONL format for append-only chat histories, with a comprehensive index for fast lookups and proper separation between routing logic and memory storage.

## Architecture

### 1. File Structure
```
backend/
├── data/
│   └── sessions/
│       ├── index.json                  # Fast lookup index
│       ├── session_abc123.jsonl        # Chat history (append-only)
│       └── session_abc123_tools.jsonl  # Tool execution log (separate)
```

### 2. JSONL Message Format
Each line in `session_xxx.jsonl` will be a JSON object:
```json
{"timestamp":"2025-06-26T10:00:00Z","type":"user","content":"Hello","metadata":{}}
{"timestamp":"2025-06-26T10:00:01Z","type":"assistant","content":"Hi there!","metadata":{"agent":"AnalyticalAgent","confidence":0.9,"processingTime":150}}
```

### 3. Enhanced Index Structure
```json
{
  "session_abc123": {
    "file": "session_abc123.jsonl",
    "toolsFile": "session_abc123_tools.jsonl",
    "status": "active",
    "createdAt": "2025-06-26T10:00:00Z",
    "startedAt": "2025-06-26T10:00:00Z",
    "lastActivityAt": "2025-06-26T10:15:00Z",
    "messageCount": 42,
    "title": "Chat about AI",
    "metadata": {
      "lastAgent": "AnalyticalAgent",
      "userId": "user123"
    }
  }
}
```

## Implementation Plan

### Phase 1: Core Storage Classes

1. **Create SessionStorage Class** (`backend/src/storage/SessionStorage.ts`)
   - Manages JSONL file operations
   - Handles append-only writes
   - Implements message retrieval with pagination
   - Manages session lifecycle (create, update status, soft delete)

2. **Create SessionIndex Class** (`backend/src/storage/SessionIndex.ts`)
   - Manages index.json operations
   - Provides fast lookups
   - Handles atomic updates
   - Implements session listing with filters

3. **Create ToolLogger Class** (`backend/src/storage/ToolLogger.ts`)
   - Separate JSONL file for tool executions
   - Records all tool calls (success or failure)
   - Links to main session via sessionId

### Phase 2: Integration Layer

4. **Create StorageManager** (`backend/src/storage/StorageManager.ts`)
   - Unified interface for all storage operations
   - Coordinates between SessionStorage, SessionIndex, and ToolLogger
   - Implements context loading with configurable limits
   - Handles message sync from frontend

5. **Update Server.js Endpoints**
   - `/api/chat` - Record both user message and AI response
   - `/api/chats/{id}/messages` POST - Save messages with proper format
   - `/api/chats/{id}/messages` GET - Load with context limits
   - `/api/chats` GET - Use index for fast listing
   - `/api/chats/{id}` DELETE - Soft delete (status: "deleted")

### Phase 3: Context Management

6. **Create ContextManager** (`backend/src/storage/ContextManager.ts`)
   - Load full session history (up to 100 messages config)
   - Format messages for LLM context injection
   - Handle context window limits
   - Implement sliding window when exceeding limits

7. **Configuration** (`backend/src/config/storage.config.ts`)
   ```typescript
   export const STORAGE_CONFIG = {
     maxContextMessages: 100,  // User + AI messages combined
     sessionPath: './data/sessions',
     indexUpdateDebounce: 100,  // ms
     toolLogRetention: 30,  // days
   };
   ```

### Phase 4: Migration & Compatibility

8. **Create Migration Script** (`backend/scripts/migrate-storage.ts`)
   - Convert existing JSON sessions to JSONL format
   - Build initial index from existing data
   - Preserve all historical data

## Key Features

1. **Append-Only Operations**
   - New messages simply appended to JSONL
   - No file rewrites needed
   - Efficient for streaming

2. **Fast Index Lookups**
   - Session status filtering
   - Sort by lastActivityAt
   - Quick metadata access

3. **Separation of Concerns**
   - Storage layer completely separate from routing
   - Clean interfaces for reusability
   - Tool logs separate from chat logs

4. **Soft Delete**
   - Sessions marked as "deleted" but preserved
   - Can be "undeleted" if needed
   - Cleanup script for permanent deletion

5. **Context Management**
   - Full session loaded by default
   - Configurable message limit
   - Server-side context injection

## Requirements

### Message Storage Format
- **User Messages**: 
  ```json
  {
    "timestamp": "ISO-8601",
    "type": "user",
    "content": "message text",
    "metadata": {
      "userId": "optional",
      "sessionId": "required"
    }
  }
  ```

- **Assistant Messages**:
  ```json
  {
    "timestamp": "ISO-8601", 
    "type": "assistant",
    "content": "response text",
    "metadata": {
      "agent": "AgentName",
      "confidence": 0.95,
      "processingTime": 150,
      "toolsUsed": []
    }
  }
  ```

### Tool Execution Format
```json
{
  "timestamp": "ISO-8601",
  "sessionId": "abc123",
  "toolName": "WebSearch",
  "parameters": {},
  "result": {},
  "success": true,
  "executionTime": 250,
  "error": null
}
```

### Session Status Values
- `active` - Currently in use
- `inactive` - Not currently in use but available
- `archived` - Archived for long-term storage
- `deleted` - Soft deleted, not shown in UI

### API Contracts

#### POST /api/chat
Records both user message and AI response. Updates session index.

#### GET /api/chats
Returns list of chats from index with status filtering.

#### POST /api/chats/{id}/messages
Saves messages from frontend to JSONL file.

#### GET /api/chats/{id}/messages
Returns messages with context limit applied.

#### DELETE /api/chats/{id}
Soft deletes by updating status to "deleted" in index.

### Context Rules
1. Load up to 100 messages (configurable)
2. Include system prompts in context
3. Preserve message order
4. Handle context overflow gracefully
5. Inject context server-side before LLM call

This storage system provides the foundation for future RAG implementation and long-term memory features while maintaining clean separation of concerns and efficient operations.