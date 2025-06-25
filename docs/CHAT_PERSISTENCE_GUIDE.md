# Chat Persistence and Agent Tracking Guide

## Overview

This guide covers the comprehensive chat persistence and agent tracking system implemented in ChatSG. The system transforms the previous localStorage-only approach into a hybrid file-based persistence system with enhanced agent tracking, cross-session memory access, and user preference toggles.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Chat Persistence System](#chat-persistence-system)
3. [Agent Tracking Features](#agent-tracking-features)
4. [Cross-Session Memory](#cross-session-memory)
5. [User Preferences and Toggles](#user-preferences-and-toggles)
6. [API Endpoints](#api-endpoints)
7. [Frontend Integration](#frontend-integration)
8. [Testing and Troubleshooting](#testing-and-troubleshooting)
9. [Deployment Guide](#deployment-guide)

## Architecture Overview

### Hybrid Storage Architecture

The system implements a hybrid storage approach combining:

- **Frontend**: localStorage for immediate access and offline capability
- **Backend**: File-based persistence for long-term storage and cross-session access
- **State Management**: Centralized state management with session isolation
- **Memory Factory**: Enhanced memory system with cross-session capabilities

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   File System   │
│   localStorage  │◄──►│   StateManager  │◄──►│   JSON Files    │
│   ChatManager   │    │   MemoryFactory │    │   Data Storage  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Key Components

- **StateManager**: Centralized state management with persistence
- **FilePersistence**: File-based storage implementation
- **ChatManager**: Frontend chat management with hybrid storage
- **AgentOrchestrator**: Enhanced agent selection with tracking
- **MemoryFactory**: Cross-session memory access

## Chat Persistence System

### File-Based Storage

The backend stores chat data in JSON files with the following structure:

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

### Hybrid Synchronization

The system maintains synchronization between frontend and backend:

1. **Immediate Storage**: Messages are immediately stored in localStorage
2. **Background Sync**: Periodic synchronization with backend file storage
3. **Conflict Resolution**: Last-write-wins with timestamp comparison
4. **Offline Support**: Full functionality when backend is unavailable

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

## Cross-Session Memory

### Memory Context Injection

When cross-session memory is enabled:

1. **Memory Query**: System queries previous sessions for relevant context
2. **Relevance Scoring**: Context is scored for relevance (0-1)
3. **Context Injection**: Relevant memories are injected into agent prompts
4. **Privacy Control**: User can disable cross-session memory

### Memory Storage Structure

```typescript
interface CrossSessionMemory {
  sessionId: string;
  agentId: string;
  userId: string;
  data: {
    type: 'conversation' | 'tool_result' | 'user_preference';
    content: string;
    context: string;
  };
  metadata: {
    timestamp: Date;
    relevance: number;
  };
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

# Specific test suites
node tests/test-chat-persistence.js
node tests/test-agent-tracking.js

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

#### Cross-Session Memory Not Loading

**Problem**: Previous conversation context not available
**Solution**:
1. Ensure cross-session memory toggle is enabled
2. Check user ID consistency across sessions
3. Verify memory storage permissions

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
# Backend
CHAT_PERSISTENCE_PATH=/path/to/chat/data
CHAT_CLEANUP_INTERVAL=300000
MEMORY_RETENTION_DAYS=30
ENABLE_CROSS_SESSION_MEMORY=true

# Database (optional)
DATABASE_URL=postgresql://...
ENABLE_DATABASE_PERSISTENCE=false
```

### File System Requirements

```bash
# Create data directories
mkdir -p /var/chatsg/data/chats
mkdir -p /var/chatsg/data/memory
mkdir -p /var/chatsg/data/state

# Set permissions
chown -R chatsg:chatsg /var/chatsg/data
chmod -R 755 /var/chatsg/data
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