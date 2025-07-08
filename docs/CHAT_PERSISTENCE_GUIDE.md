# Chat Persistence and Intelligent Memory Guide

## Overview

This guide covers the comprehensive chat persistence and intelligent memory system implemented in ChatSG. The system uses PostgreSQL for reliable storage, Mem0 for intelligent memory extraction, Qdrant for vector search, and optionally Neo4j for graph relationships. This provides agents with rich contextual understanding and semantic memory capabilities.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Chat Storage System](#chat-storage-system)
3. [Intelligent Memory System](#intelligent-memory-system)
4. [Agent Tracking Features](#agent-tracking-features)
5. [Semantic Memory and Context](#semantic-memory-and-context)
5. [User Preferences and Toggles](#user-preferences-and-toggles)
6. [API Endpoints](#api-endpoints)
7. [Frontend Integration](#frontend-integration)
8. [Testing and Troubleshooting](#testing-and-troubleshooting)
9. [Deployment Guide](#deployment-guide)

## Architecture Overview

### Modern Storage Architecture

The system implements a modern, scalable architecture combining:

- **Frontend**: React with optimistic updates and real-time synchronization
- **Backend**: PostgreSQL for reliable, ACID-compliant data storage
- **Memory Layer**: Mem0 for intelligent semantic memory extraction
- **Vector Search**: Qdrant for fast similarity search and contextual retrieval
- **Graph Relations**: Neo4j for understanding entity relationships (optional)

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   PostgreSQL    │    │     Qdrant      │
│   React Chat    │◄──►│  Chat Storage   │◄──►│  Vector Store   │
│   Manager       │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                               │                        │
                    ┌─────────────────┐    ┌─────────────────┐
                    │   Mem0 Service  │    │     Neo4j       │
                    │ Memory Manager  │◄──►│ Graph Relations │
                    └─────────────────┘    └─────────────────┘
```

### Key Components

- **StorageManager**: Unified interface for all storage operations with Mem0 integration
- **PostgresSessionStorage**: Reliable chat message storage in PostgreSQL
- **PostgresSessionIndex**: Fast session lookups and metadata management
- **Mem0Service**: Intelligent memory extraction and semantic understanding
- **AgentOrchestrator**: Enhanced agent selection with memory-aware context
- **ChatManager**: Frontend chat management with real-time updates

## Chat Storage System

### PostgreSQL Storage

The backend stores chat data in PostgreSQL tables with the following structure:

```json
{
  "sessionId": "chat-uuid",
  "title": "Chat Title",
  "messages": [
    {
      "id": 1,
      "content": "Message content",
      "sender": "user|bot",
      "timestamp": "2023-01-01T00:00:00.000Z",
      "agent": "analytical",
      "synced": true
    }
  ],
  "metadata": {
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z",
    "messageCount": 1,
    "agentHistory": ["analytical", "creative"],
    "toolsUsed": [
      {
        "toolName": "DataAnalyzer",
        "timestamp": "2023-01-01T00:00:00.000Z",
        "parameters": {},
        "result": {},
        "success": true,
        "executionTime": 1250,
        "agentName": "analytical"
      }
    ],
    "userPreferences": {
      "crossSessionMemory": false,
      "agentLock": false,
      "preferredAgent": "analytical"
    },
    "analytics": {
      "messageCount": 1,
      "averageResponseTime": 1500,
      "totalTokensUsed": 150,
      "errorCount": 0
    }
  }
}
```

### Database Schema

The system uses several PostgreSQL tables:

1. **chat_sessions**: Session metadata and status tracking
2. **chat_messages**: Individual chat messages with full content
3. **tool_executions**: Tool execution logs with performance metrics
4. **users**: User management and authentication

Real-time synchronization ensures frontend and backend stay in sync with optimistic updates and rollback capabilities.

## Intelligent Memory System

### Mem0 Integration

The system automatically extracts and stores semantic memories from conversations:

```typescript
// Example: 3 simple messages become 14+ intelligent memories
Input: "My name is Sean and I work at OpenAI"
Memories Created:
- "Name is Sean"
- "Works at OpenAI"
- "Professional background in AI/technology"
- ... (and more contextual inferences)
```

### Memory Flow

1. **Message Capture**: User sends message → stored in PostgreSQL
2. **Memory Extraction**: Mem0 analyzes message for key information
3. **Vector Storage**: Semantic embeddings stored in Qdrant with metadata
4. **Context Building**: Relevant memories retrieved for agent context
5. **Response Generation**: Agent responds with full memory context

### Vector Search

Qdrant provides fast semantic search across all memories:
- **Sub-second search** across thousands of memories
- **Metadata filtering** by user, session, or custom attributes
- **Semantic similarity** finds relevant content regardless of exact wording
- **Scalable storage** handles enterprise-level memory volumes

## Agent Tracking Features

### Agent History Tracking

The system tracks detailed agent interaction history:

```typescript
interface AgentInteraction {
  agentName: string;
  timestamp: Date;
  confidence: number;
  reason: string;
  handoffFrom?: string;
}
```

### Tool Usage Tracking

Comprehensive tool usage analytics:

```typescript
interface ToolUsage {
  toolName: string;
  timestamp: Date;
  parameters: any;
  result: any;
  success: boolean;
  executionTime: number;
  agentName: string;
}
```

### Agent Selection Logic

Enhanced agent selection with:

- **User Preferences**: Preferred agent selection
- **Agent Lock**: Lock to specific agent for duration
- **Continuity Logic**: Maintain agent continuity for related tasks
- **Confidence Scoring**: Agent selection based on capability matching

## Semantic Memory and Context

### Intelligent Context Retrieval

The system provides agents with intelligent context from all user interactions:

1. **Semantic Search**: Finds relevant memories regardless of exact wording
2. **Session Awareness**: Memories are properly isolated by user and session
3. **Relevance Scoring**: Memories are ranked by semantic similarity (0-1)
4. **Context Assembly**: Most relevant memories assembled into LLM context
5. **Privacy Control**: Complete user isolation ensures data security

### Memory Storage Structure

```typescript
interface QdrantMemory {
  id: string;
  memory: string;              // Extracted semantic memory
  hash: string;               // Content hash for deduplication
  createdAt: string;          // Timestamp
  score?: number;             // Relevance score (search results)
  metadata: {
    sessionId: string;        // Session context
    timestamp: string;        // Original timestamp
    userDatabaseId?: number;  // User isolation
  };
  userId: string;             // User identifier
}

interface Mem0SearchOptions {
  userId?: string;
  sessionId?: string;
  limit?: number;
  filters?: Record<string, any>;
}
```

## User Preferences and Toggles

### Available Settings

```typescript
interface UserPreferences {
  crossSessionMemory: boolean;     // Enable cross-session memory access
  agentLock: boolean;             // Lock to preferred agent
  preferredAgent?: string;        // Default agent preference
  agentLockTimestamp?: Date;      // When agent lock was activated
  lastAgentUsed?: string;         // Last agent that responded
}
```

### Settings UI Components

- **ChatSettingsToggles**: Main settings component
- **CrossSessionMemoryIndicator**: Shows when cross-session memory is active
- **AgentLockIndicator**: Shows when agent is locked
- **AgentAvatarSystem**: Dynamic agent avatars based on active agent

## API Endpoints

### Chat Management

```
GET    /api/chat/:sessionId          # Get chat history
POST   /api/chat/:sessionId/message  # Send message
PUT    /api/chat/:sessionId          # Update chat metadata
DELETE /api/chat/:sessionId          # Delete chat
```

### Agent Tracking

```
GET    /api/agent/history/:sessionId # Get agent interaction history
POST   /api/agent/track              # Track agent interaction
GET    /api/agent/analytics          # Get agent usage analytics
```

### Cross-Session Memory

```
GET    /api/memory/cross-session     # Query cross-session memory
POST   /api/memory/store             # Store memory entry
DELETE /api/memory/:key              # Delete memory entry
```

### User Preferences

```
GET    /api/preferences              # Get user preferences
PUT    /api/preferences              # Update user preferences
POST   /api/preferences/reset        # Reset to defaults
```

## Frontend Integration

### ChatManager Hook

The `useChatManager` hook provides comprehensive chat management:

```typescript
const {
  chats,                    // All chat sessions
  activeChatId,            // Current active chat
  createChat,              // Create new chat
  deleteChat,              // Delete chat
  switchChat,              // Switch active chat
  saveChatMessage,         // Save message to chat
  syncChatWithBackend,     // Sync with backend
  trackAgentUsage,         // Track agent usage
  updateChatMetadata,      // Update chat metadata
  setChatLoading,          // Set loading state
  markChatNewMessage       // Mark new message
} = useChatManager();
```

### Chat Settings Hook

The `useChatSettings` hook manages user preferences:

```typescript
const {
  settings,                // Current settings
  updateSetting,           // Update single setting
  resetSettings            // Reset to defaults
} = useChatSettings();
```

### Agent Avatar System

Dynamic agent avatars with theme integration:

```typescript
import { AgentAvatarService } from '../services/AgentAvatarService';

// Get agent configuration
const config = AgentAvatarService.getAgentConfig('analytical');
const colors = AgentAvatarService.getAgentThemeColors('analytical');
const displayName = AgentAvatarService.getAgentDisplayName('analytical');
```

## Testing and Troubleshooting

### Running Tests

```bash
# Backend tests
cd backend
npm test

# Memory system tests
node tests/test-memory-quick.js          # Quick memory pipeline test
node tests/test-memory-pipeline.js      # Comprehensive memory test
node tests/test-mem0-final.js           # Real usage simulation

# Storage tests
node tests/test-postgres-storage.js     # PostgreSQL storage test

# Frontend tests
cd frontend
npm test

# Specific test files
npm test -- useChatManager.test.tsx
```

### Common Issues

#### Chat Sync Issues

**Problem**: Chats not syncing between frontend and backend
**Solution**: 
1. Check backend server is running
2. Verify API endpoints are accessible
3. Check browser console for sync errors
4. Clear localStorage and retry

#### Agent Tracking Not Working

**Problem**: Agent history not being tracked
**Solution**:
1. Verify StateManager is properly initialized
2. Check agent interactions are being logged
3. Verify session context is correctly passed

#### Memory Not Being Created

**Problem**: Memories not being generated from conversations
**Solution**:
1. Check `MEM0_ENABLED=true` in environment variables
2. Verify Qdrant is running: `curl http://localhost:6333`
3. Check OpenAI API key is valid for embeddings
4. Run memory test: `node tests/test-memory-quick.js`

#### Search Returning No Results

**Problem**: Memory search not finding relevant information
**Solution**:
1. Verify sessionId metadata is being stored correctly
2. Check user isolation is working (userDatabaseId)
3. Allow 1-2 seconds for Qdrant indexing
4. Test with broader search terms
5. Check memory creation logs in backend

### Debug Mode

Enable debug logging:

```javascript
// Backend
process.env.DEBUG_CHAT_PERSISTENCE = 'true';
process.env.DEBUG_AGENT_TRACKING = 'true';

// Frontend
localStorage.setItem('debug_chat_manager', 'true');
```

## Deployment Guide

### Environment Setup

Required environment variables:

```bash
# PostgreSQL Database (Required)
DATABASE_URL=postgresql://user:password@localhost:5432/chatsg
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_DB=chatsg

# Memory System (Required)
MEM0_ENABLED=true
MEM0_PROVIDER=qdrant
MEM0_EMBEDDING_MODEL=text-embedding-3-small
MEM0_LLM_MODEL=gpt-4o-mini

# Qdrant Vector Database (Required)
QDRANT_URL=http://localhost:6333

# Neo4j Graph Database (Optional)
MEM0_GRAPH_ENABLED=true
NEO4J_URL=neo4j://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_password

# OpenAI (Required for embeddings)
OPENAI_API_KEY=your_openai_api_key
```

### Infrastructure Requirements

```bash
# PostgreSQL Setup
# Ensure PostgreSQL is running with proper configuration
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Qdrant Setup (Docker)
docker run -d -p 6333:6333 -p 6334:6334 \
    -v qdrant_storage:/qdrant/storage:z \
    --name chatsg-qdrant \
    qdrant/qdrant:latest

# Neo4j Setup (Docker, Optional)
docker run -d -p 7474:7474 -p 7687:7687 \
    -e NEO4J_AUTH=neo4j/your_password \
    -v neo4j_data:/data \
    --name chatsg-neo4j \
    neo4j:latest

# Create log directories
mkdir -p /var/log/chatsg
chown -R chatsg:chatsg /var/log/chatsg
```

### Production Deployment

1. **Build Frontend**:
   ```bash
   cd frontend
   npm run build
   ```

2. **Compile Backend**:
   ```bash
   cd backend
   npm run build
   ```

3. **Start Services**:
   ```bash
   # Backend
   npm start

   # Frontend (served by backend in production)
   # Static files served from frontend/build
   ```

### Monitoring and Maintenance

#### Log Files

- **Chat Persistence**: `/var/log/chatsg/persistence.log`
- **Agent Tracking**: `/var/log/chatsg/agents.log`
- **Memory System**: `/var/log/chatsg/memory.log`

#### Cleanup Tasks

```bash
# Clean old chat files (run daily)
find /var/chatsg/data/chats -name "*.json" -mtime +30 -delete

# Clean memory entries (run weekly)
find /var/chatsg/data/memory -name "*.json" -mtime +7 -delete

# Compress old logs (run weekly)
gzip /var/log/chatsg/*.log.1
```

#### Health Checks

```bash
# Check backend health
curl http://localhost:3001/api/health

# Check persistence system
curl http://localhost:3001/api/health/persistence

# Check memory system
curl http://localhost:3001/api/health/memory
```

### Performance Optimization

#### Backend Optimizations

- **File Caching**: Implement LRU cache for frequently accessed chats
- **Batch Operations**: Batch multiple state updates
- **Compression**: Compress large chat files
- **Indexing**: Create indexes for fast chat lookup

#### Frontend Optimizations

- **Message Pagination**: Load messages progressively
- **Virtual Scrolling**: Handle large message lists efficiently
- **Debounced Sync**: Reduce sync frequency during active typing
- **Cache Management**: Implement intelligent cache eviction

### Security Considerations

#### Data Protection

- **Encryption**: Encrypt sensitive chat data at rest
- **Access Control**: Implement proper user isolation
- **Audit Logging**: Log all data access and modifications
- **Backup Strategy**: Regular encrypted backups

#### Privacy Features

- **Data Retention**: Configurable data retention periods
- **Right to Deletion**: Complete data removal on request
- **Cross-Session Controls**: User control over memory sharing
- **Export Functionality**: Allow users to export their data

## Conclusion

The chat persistence and agent tracking system provides a robust foundation for maintaining conversation history, tracking agent interactions, and enabling cross-session memory access. The hybrid architecture ensures both performance and reliability while giving users control over their data and privacy preferences.

For additional support or questions, refer to the troubleshooting section or contact the development team. 