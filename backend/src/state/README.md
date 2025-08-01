# ChatSG State Management & Memory System

## Overview

The ChatSG backend implements a sophisticated state management and memory system that combines:
- **Real-time state management** via StateManager for active sessions
- **Persistent storage** via JSONL files for complete chat history
- **Intelligent memory layer** via Mem0 for compressed, searchable memories
- **Graph relationships** via Neo4j for entity connections and multi-hop reasoning
- **Agent orchestration** with intelligent routing and history tracking

## Architecture Components

### 1. StateManager (Real-time State)
Manages in-memory state for active sessions with optional persistence.

```typescript
// Core state management for active sessions
const stateManager = StateManager.getInstance();
const context = createStateContext(sessionId, 'system', userId);

// Session state includes:
- agentHistory: Track which agents handled requests
- userPreferences: Settings like crossSessionMemory, agentLock
- toolsUsed: Execution history and metrics
- analytics: Performance and usage data
```

### 2. StorageManager (Persistent Storage)
Handles JSONL-based storage for chat history and delegates to Mem0 for intelligent memory.

```typescript
// Unified interface for all storage operations
const storageManager = getStorageManager();

// Manages:
- SessionStorage: JSONL chat messages (complete history)
- Mem0Service: Intelligent memory extraction and retrieval
- SessionIndex: Fast lookups and metadata
- ToolLogger: Tool execution tracking
- ContextManager: LLM context preparation
```

### 3. Memory System Integration

#### Triple Storage Architecture
```
User Message → API Endpoint → StorageManager
                                    ↓
          ┌─────────────────┴─────────────────┴─────────────────┐
          ↓                         ↓                           ↓
    JSONL Storage            Mem0 Vector Store            Neo4j Graph
 (Complete History)        (Semantic Memories)         (Relationships)
          ↓                         ↓                           ↓
  - Full messages           - "User likes Python"      - User→[WORKS_WITH]→Bob
  - Timestamps              - "Lives in NYC"           - Bob→[MANAGES]→Team
  - Metadata                - Embedding vectors        - User→[KNOWS]→Python
  - Audit trail             - 90% compression          - Multi-hop queries
```

#### Hybrid Retrieval Flow
```
Query: "What does my colleague think about Python?"
                            ↓
         ┌──────────────────┴──────────────────┐
         ↓                                     ↓
   Vector Search                         Graph Search
 "colleague" → similar                User→[WORKS_WITH]→Bob
 "Python" → programming                Bob→[OPINION_ON]→Python
         ↓                                     ↓
         └──────────────────┬──────────────────┘
                            ↓
                    Combined Results
                   (Relevant memories +
                    Relationship context)
```

## File Structure

```
backend/
   src/
      state/                    # State management system
         StateManager.ts       # Core state management
         interfaces.ts         # Type definitions
         persistence/          # Persistence strategies
            FilePersistence.ts
            MemoryPersistence.ts
         utils.ts             # Helper functions
   
      storage/                 # Persistent storage system
          StorageManager.ts    # Unified storage interface
          SessionStorage.ts    # JSONL message storage
          SessionIndex.ts      # Fast session lookups
          ToolLogger.ts        # Tool execution logs
          ContextManager.ts    # LLM context management

   data/
       sessions/                # Runtime data directory
           index.json           # Session index
           session_xxx.jsonl    # Chat messages
           session_xxx_tools.jsonl # Tool logs
```

## Storage Architecture

### JSONL Message Format
Each line is a self-contained JSON object for append-only operations:

```json
{"timestamp":"2025-06-26T10:00:00Z","type":"user","content":"Hello","metadata":{"sessionId":"xxx","userId":"user123"}}
{"timestamp":"2025-06-26T10:00:01Z","type":"assistant","content":"Hi!","metadata":{"agent":"AnalyticalAgent","confidence":0.9}}
```

### Session Index Structure
Fast lookups without loading full chat history:

```json
{
  "session_abc123": {
    "file": "session_abc123.jsonl",
    "toolsFile": "session_abc123_tools.jsonl",
    "status": "active",
    "createdAt": "2025-06-26T10:00:00Z",
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

## API Integration

### Chat Endpoints

#### POST /api/chat
- Saves messages to JSONL storage
- Updates orchestration state
- Triggers agent selection
- Returns AI response

#### GET /api/chats/:id/history
- Retrieves messages from JSONL storage
- Supports pagination
- Includes agent metadata

#### GET /api/chats/:id/messages
- Alternative endpoint for message retrieval
- Direct StorageManager access
- Better performance for large histories

### State Management Endpoints

#### GET /api/chats/:id/settings
- Retrieves user preferences
- Returns cross-session memory status
- Shows agent lock state

#### POST /api/chats/:id/settings
- Updates session preferences
- Enables/disables features
- Persists to StateManager

#### GET /api/chats/:id/agents
- Returns agent interaction history
- Shows confidence scores
- Includes handoff tracking

## Memory System Features

### 1. Session-Level Memory
- **Message History**: Complete conversation stored in JSONL
- **Agent History**: Which agents handled each request
- **Tool Usage**: All tool executions with results
- **User Preferences**: Settings specific to the session

### 2. Cross-Session Memory
When enabled, shares context across sessions:
- Agent selection patterns
- User preferences
- Key tool results
- Conversation summaries

### 3. Context Management
Intelligent context preparation for LLM calls using dual approach:

#### With Mem0 Enabled:
- **Query-based retrieval**: Finds relevant memories based on current question
- **Semantic search**: Uses embeddings to find contextually similar information
- **Graph traversal**: Follows entity relationships for connected information
- **Hybrid approach**: Combines vector similarity with graph relationships
- **Compressed format**: 90% reduction in tokens while maintaining relevance
- **Cross-session aware**: Automatically includes memories from all user sessions

#### Without Mem0 (Fallback):
- **Sliding window**: Last 100 messages from JSONL
- **Chronological order**: Maintains conversation flow
- **Full message content**: Complete user/assistant exchanges

#### Context Injection Implementation
All agents use the same buildContextMessages method that automatically selects the best approach:

```typescript
// In AbstractBaseAgent:
protected async buildContextMessages(
    sessionId: string, 
    currentInput: string,
    systemPrompt: string
): Promise<ContextMessage[]>

// When Mem0 is enabled:
if (STORAGE_CONFIG.mem0.enabled) {
    // Uses getContextForQuery() for intelligent retrieval
    const context = await storageManager.getContextForQuery(
        currentInput,  // Query to search for relevant memories
        sessionId,
        systemPrompt
    );
}

// Fallback to traditional JSONL approach if Mem0 disabled/fails
```

This dual approach ensures:
- **Reliability**: Always have context available
- **Intelligence**: Use smart retrieval when possible
- **Performance**: Reduced tokens with Mem0
- **Compatibility**: Works with existing JSONL storage

## Session Lifecycle

```
1. Creation (POST /api/chats)
   � Initialize in StorageManager
   � Create index entry
   � Set status: "active"

2. Active Use (POST /api/chat)
   � Append messages to JSONL
   � Update StateManager
   � Reset activity timer

3. Inactivity (30 minutes)
   � Auto-transition to "inactive"
   � Preserve in storage
   � Clear from active memory

4. Archival (Manual/Auto)
   � Status: "archived"
   � Compress if needed
   � Long-term storage

5. Deletion (DELETE /api/chats/:id)
   � Soft delete (status: "deleted")
   � Hidden from UI
   � Data preserved for audit
```

## Performance Optimizations

### Storage Layer
- **Append-only writes**: No file rewrites needed
- **Write stream pooling**: Reuse file handles
- **Index debouncing**: Batch updates (100ms)
- **Read caching**: TTL-based message cache

### State Layer
- **In-memory operations**: Fast state access
- **Lazy loading**: Load only needed data
- **Event-driven updates**: Efficient change propagation
- **Mutex locks**: Prevent race conditions

## Configuration

Located in `src/config/storage.config.ts`:

```typescript
export const STORAGE_CONFIG = {
  // Session management
  sessionPath: './data/sessions',
  sessionTimeout: 30 * 60 * 1000,     // 30 minutes
  maxSessions: 10000,
  
  // Context limits
  maxContextMessages: 100,
  maxMessagesPerRead: 1000,
  
  // Performance
  indexDebounceMs: 100,
  writeStreamPoolSize: 10,
  
  // Retention
  toolLogRetention: 30,               // days
  archiveAfterDays: 90,
  
  // Context management
  context: {
    includeSystemMessages: true,
    maxTokens: 8000,
    overflowStrategy: 'sliding-window'
  },
  
  // Mem0 configuration
  mem0: {
    enabled: true,                    // Enable intelligent memory
    embeddingModel: 'text-embedding-3-small',
    llmModel: 'gpt-4o-mini',
    historyDbPath: './data/sessions/memory.db',
    maxSearchResults: 10,
    maxMemoriesPerSession: 1000,
    graph: {
      enabled: true,                  // Enable Neo4j graph store
      url: 'neo4j://localhost:7687',
      username: 'neo4j',
      password: 'your_password'
    }
  }
};
```

## Usage Examples

### Creating a Session
```typescript
// Frontend creates session implicitly on first message
const response = await fetch('/api/chat', {
  method: 'POST',
  body: JSON.stringify({
    message: 'Hello',
    sessionId: 'new-session-id'
  })
});
```

### Retrieving Chat History
```typescript
// Get full history (uses StorageManager)
const history = await fetch('/api/chats/session-id/history');

// Get paginated messages
const messages = await fetch('/api/chats/session-id/messages?limit=50&offset=0');
```

### Managing Cross-Session Memory
```typescript
// Enable for a session
await fetch('/api/chats/session-id/settings', {
  method: 'POST',
  body: JSON.stringify({
    settings: { crossSessionMemory: true }
  })
});

// Share session context
await fetch('/api/memory/cross-session', {
  method: 'POST',
  body: JSON.stringify({
    action: 'share',
    sessionId: 'current-session',
    userId: 'user123'
  })
});
```

## Security Considerations

1. **Session IDs**: Cryptographically random UUIDs
2. **Soft Deletes**: Preserve audit trail
3. **Access Control**: File permissions restrict access
4. **No Sensitive Data**: Index contains only metadata
5. **User Isolation**: Sessions scoped by userId

## Troubleshooting

### Common Issues

1. **Messages not persisting**
   - Check `data/sessions/` directory permissions
   - Verify StorageManager initialization
   - Look for errors in session index

2. **Slow message loading**
   - Check message count in index
   - Consider pagination for large histories
   - Verify read cache is working

3. **State inconsistencies**
   - Check StateManager persistence settings
   - Verify mutex locks are working
   - Look for concurrent access issues

4. **Agents not remembering conversation history**
   - Check if Mem0 is enabled in config (`mem0.enabled: true`)
   - Verify OPENAI_API_KEY is set (required for Mem0 embeddings)
   - Check logs for "Using Mem0 for context retrieval" vs fallback messages
   - If using Mem0, verify memories are being extracted (check memory.db)
   - For graph store: Check Neo4j is running and credentials are correct
   - Look for "[Mem0Service] Graph store enabled with Neo4j" in logs
   - For fallback mode, ensure JSONL files contain messages

### Debug Endpoints

- `GET /api/debug/storage` - Storage system status
- `GET /api/debug/state/:sessionId` - Session state dump
- `GET /api/debug/memory/:userId` - Cross-session memory

## Future Enhancements

1. **Mem0-Only Storage**: Transition away from JSONL once Mem0 proves reliable
2. **Custom Memory Extractors**: Domain-specific memory extraction rules
3. **Real-Time Sync**: WebSocket updates for live memory updates
4. **Advanced Cross-Session**: Mem0's built-in cross-session capabilities
5. **Distributed Memory**: Shared Mem0 instance across servers
6. **Memory Analytics**: Insights from extracted memories

## Migration Guide

From old localStorage to new system:
1. Export localStorage data
2. Convert to JSONL format
3. Import via StorageManager
4. Update frontend to use new endpoints

## Related Documentation

- [Agent Development Guide](../agents/README.md)
- [Orchestration System](../routing/README.md)
- [API Documentation](../../../docs/API.md)
- [Frontend Integration](../../../frontend/README.md)