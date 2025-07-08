# Mem0 + Qdrant + Neo4j Memory Architecture

## Overview

ChatSG implements a sophisticated memory system using Mem0 as the intelligent memory layer, Qdrant for vector storage, and optionally Neo4j for graph relationships. This architecture provides semantic understanding, contextual recall, and intelligent memory management for all conversations.

## Architecture Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │     Qdrant      │    │     Neo4j       │
│  Chat Storage   │    │  Vector Store   │    │ Graph Relations │
│                 │    │                 │    │   (Optional)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         └────────────────────────┼────────────────────────┘
                                  │
                    ┌─────────────────┐
                    │   Mem0 Service  │
                    │ Memory Manager  │
                    └─────────────────┘
                              │
                    ┌─────────────────┐
                    │ Storage Manager │
                    │   Integration   │
                    └─────────────────┘
```

## What's Implemented

### 1. Mem0 Intelligent Memory
- **Semantic Extraction**: Automatically extracts key information from conversations
- **Memory Synthesis**: Creates intelligent memories from raw chat messages
- **Context Awareness**: Understands relationships between different conversation elements
- **User Isolation**: Each user's memories are completely separate

### 2. Qdrant Vector Storage
- **High-Performance Search**: Fast similarity search across millions of memories
- **Scalable Storage**: Production-ready vector database
- **Metadata Filtering**: Search by user, session, or custom filters
- **Persistent Storage**: Memories survive server restarts

### 3. Neo4j Graph Relationships (Optional)
- **Entity Relationships**: Tracks connections between people, topics, and concepts
- **Graph Queries**: Complex relationship queries across memory space
- **Contextual Understanding**: Enhanced understanding through relationship mapping

### 4. PostgreSQL Chat Storage
- **Reliable Storage**: ACID-compliant message storage
- **Session Management**: Complete session lifecycle management
- **Tool Logging**: Comprehensive tool execution tracking
- **User Management**: Integrated with authentication system

## Memory Flow

### 1. Message Processing
```typescript
User Message → PostgreSQL Storage → Mem0 Processing → Qdrant Vector Storage → Neo4j Relations
```

1. **Chat Message Saved**: User message stored in PostgreSQL with session context
2. **Memory Extraction**: Mem0 analyzes message for key information and insights
3. **Vector Storage**: Semantic embeddings stored in Qdrant with metadata
4. **Graph Updates**: Entities and relationships updated in Neo4j (if enabled)

### 2. Context Retrieval
```typescript
Query → Qdrant Search → Relevant Memories → Context Building → LLM Input
```

1. **Query Processing**: User query analyzed for semantic meaning
2. **Vector Search**: Qdrant finds semantically similar memories
3. **Filtering**: Results filtered by user, session, and relevance
4. **Context Assembly**: Relevant memories assembled into LLM context

## Configuration

### Environment Variables

```bash
# Enable Memory System
MEM0_ENABLED=true
MEM0_PROVIDER=qdrant

# Embedding Configuration
MEM0_EMBEDDING_MODEL=text-embedding-3-small
MEM0_LLM_MODEL=gpt-4o-mini

# Qdrant Vector Database
QDRANT_URL=http://localhost:6333
# Optional: QDRANT_API_KEY=your_api_key

# Neo4j Graph Database (Optional)
MEM0_GRAPH_ENABLED=true
NEO4J_URL=neo4j://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_password

# PostgreSQL (Main Database)
DATABASE_URL=postgresql://user:password@localhost:5432/chatsg
```

### Docker Setup

#### Qdrant Setup
```bash
# Create Qdrant container with persistent storage
docker run -p 6333:6333 -p 6334:6334 \
    -v qdrant_storage:/qdrant/storage:z \
    qdrant/qdrant:latest
```

#### Neo4j Setup (Optional)
```bash
# Create Neo4j container
docker run -p 7474:7474 -p 7687:7687 \
    -e NEO4J_AUTH=neo4j/your_password \
    -v neo4j_data:/data \
    neo4j:latest
```

## API Usage

### Mem0Service Integration

```typescript
import { getMem0Service } from '../memory/Mem0Service';

// Initialize service
const mem0Service = getMem0Service();
await mem0Service.initialize();

// Add memories (happens automatically)
await mem0Service.addMessage(message, sessionId, userId, userDatabaseId);

// Search memories
const results = await mem0Service.search(
    "What are my preferences?",
    { sessionId, userId, limit: 10 },
    userDatabaseId
);

// Get session context
const context = await mem0Service.getContextForQuery(
    query,
    sessionId,
    userId,
    userDatabaseId
);
```

### StorageManager Integration

```typescript
import { getStorageManager } from '../storage/StorageManager';

// Storage manager automatically integrates with Mem0
const storageManager = getStorageManager();
await storageManager.initialize();

// Save message (automatically creates memories)
await storageManager.saveMessage({
    sessionId,
    type: 'user',
    content: 'I love pizza and TypeScript',
    metadata: { userId, userDatabaseId }
});

// Get context (memory-aware)
const context = await storageManager.getContextForQuery(
    "What do I like?",
    sessionId
);
```

## Testing

### Quick Memory Test
```bash
cd backend
node tests/test-memory-quick.js
```

### Comprehensive Pipeline Test
```bash
cd backend
node tests/test-memory-pipeline.js
```

### Example Test Output
```
=== RESULTS ===
✓ PostgreSQL: 3 messages stored
✓ Qdrant: 14 memories created
✓ Search: Working (found relevant results)  
✓ Context: 1 messages ready for LLM
✓ Neo4j: ENABLED

✅ Memory pipeline is working correctly!
```

## Memory Examples

### Input Messages
```
1. "My name is Sean and I work at OpenAI"
2. "I love pizza and I'm learning TypeScript"  
3. "I'm working on a chat application"
```

### Generated Memories
```
1. "Name is Sean"
2. "Works at OpenAI"
3. "Loves pizza"
4. "Learning TypeScript"
5. "Working on chat application"
6. "Interested in TypeScript for professional development"
7. "Considering creating a TypeScript-based pizza ordering app"
8. "Wants to analyze pizza preferences using TypeScript"
... (and more intelligent inferences)
```

## Benefits

### 1. Intelligent Understanding
- **Semantic Memory**: Goes beyond keyword matching to understand meaning
- **Contextual Recall**: Finds relevant information even with different phrasing
- **Intelligent Inference**: Creates insights from conversation patterns

### 2. Scalable Performance  
- **Vector Search**: Millisecond search across large memory datasets
- **Efficient Storage**: Optimized for both speed and storage efficiency
- **Horizontal Scaling**: Qdrant scales to handle millions of memories

### 3. User Privacy & Security
- **Complete Isolation**: Each user's memories are completely separate
- **Secure Storage**: Encrypted connections and secure authentication
- **Data Control**: Users control their memory preferences

### 4. Development Experience
- **Automatic Integration**: Works transparently with existing chat system
- **Rich Context**: Agents receive intelligent context automatically
- **Easy Testing**: Comprehensive test suite for verification

## Troubleshooting

### Memory Not Being Created
1. Check `MEM0_ENABLED=true` in environment
2. Verify Qdrant is running: `curl http://localhost:6333`
3. Check OpenAI API key is valid
4. Run memory test: `node tests/test-memory-quick.js`

### Search Returning No Results
1. Verify sessionId metadata is being stored correctly
2. Check user isolation is working (userDatabaseId)
3. Allow time for Qdrant indexing (1-2 seconds)
4. Test with broader search terms

### Performance Issues
1. Check Qdrant container resources
2. Verify network connectivity to Qdrant
3. Monitor embedding API rate limits
4. Consider adjusting search parameters

### Neo4j Connection Issues
1. Verify Neo4j container is running
2. Check credentials in environment variables
3. Ensure Neo4j ports are accessible
4. Test with `MEM0_GRAPH_ENABLED=false` first

## Migration from Legacy Storage

If migrating from JSONL-based storage:

1. **Database Setup**: Ensure PostgreSQL is running with migrations applied
2. **Service Migration**: Old messages automatically work with new system
3. **Memory Backfill**: Run backfill script to create memories for existing chats
4. **Verification**: Run comprehensive tests to verify migration success

## Future Enhancements

### Planned Features
- **Memory Analytics**: Dashboard for memory insights and statistics
- **Advanced Filtering**: More sophisticated memory filtering options
- **Memory Export**: Allow users to export their memory data
- **Federated Search**: Search across multiple memory sources
- **Custom Embeddings**: Support for domain-specific embedding models

### Integration Opportunities
- **Multi-Modal Memory**: Support for image and audio memories
- **Real-Time Updates**: Live memory updates during conversations
- **Memory Sharing**: Controlled sharing of memories between users
- **Advanced Relationships**: More sophisticated graph relationship tracking

## Conclusion

The Mem0 + Qdrant + Neo4j architecture provides ChatSG with a state-of-the-art memory system that enhances conversation quality, provides intelligent context, and scales to handle enterprise workloads while maintaining complete user privacy and data security.