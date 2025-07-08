# Mem0 Memory System Architecture Guide

## Overview

This guide documents the current memory system architecture using Mem0 with Qdrant vector storage for the ChatSG application. The system provides:

- **Intelligent Memory Extraction** - Mem0 automatically creates semantic memories from conversations
- **Scalable Vector Storage** - Qdrant provides fast, production-ready vector search
- **User Isolation** - Complete separation of user memories for privacy and security
- **Graph Relationships** - Optional Neo4j integration for understanding entity connections
- **PostgreSQL Integration** - Seamless integration with existing chat storage

## What's Implemented

### 1. Current Architecture

The system now uses:
- **PostgreSQL** - Chat message storage and user management
- **Qdrant** - Vector embeddings storage for semantic search
- **Mem0** - Intelligent memory extraction and management
- **Neo4j** - Optional graph relationships for entity connections

### 2. Code Implementation

- **Mem0Service.ts** - Full Qdrant integration with proper metadata handling
- **storage.config.ts** - Complete memory system configuration
- **StorageManager.ts** - Automatic memory creation from chat messages
- **server.js** - Integrated user context passing for memory isolation

### 3. Key Features

- **Automatic Memory Creation** - Memories generated from every conversation
- **Semantic Search** - Find relevant context regardless of exact wording
- **Complete User Isolation** - Each user's memories are completely private
- **Fast Performance** - Sub-second search across thousands of memories
- **Intelligent Context** - Agents receive relevant memory context automatically

## Setup Instructions

### 1. Configure Environment Variables

Add to your `backend/.env` file:

```bash
# Enable Mem0 with Qdrant
MEM0_ENABLED=true
MEM0_PROVIDER=qdrant
MEM0_EMBEDDING_MODEL=text-embedding-3-small
MEM0_LLM_MODEL=gpt-4o-mini

# Qdrant vector database
QDRANT_URL=http://localhost:6333
# Optional: QDRANT_API_KEY=your_api_key

# Neo4j graph database (optional)
MEM0_GRAPH_ENABLED=true
NEO4J_URL=neo4j://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_password

# OpenAI for embeddings (required)
OPENAI_API_KEY=your_openai_api_key

# PostgreSQL (main database)
DATABASE_URL=postgresql://user:password@localhost:5432/chatsg
```

### 2. Start Required Services

```bash
# Start Qdrant (Docker)
docker run -d -p 6333:6333 -p 6334:6334 \
    -v qdrant_storage:/qdrant/storage:z \
    --name chatsg-qdrant \
    qdrant/qdrant:latest

# Start Neo4j (Docker, Optional)
docker run -d -p 7474:7474 -p 7687:7687 \
    -e NEO4J_AUTH=neo4j/your_password \
    -v neo4j_data:/data \
    --name chatsg-neo4j \
    neo4j:latest

# Ensure PostgreSQL is running
sudo systemctl start postgresql
```

### 3. Restart Backend Server

```bash
npm run stop
npm run dev
```

### 4. Verify Installation

Run the memory test scripts:

```bash
cd backend

# Quick verification
node tests/test-memory-quick.js

# Comprehensive test
node tests/test-memory-pipeline.js

# Real usage simulation
node tests/test-mem0-final.js
```

### 5. Check Service Status

```bash
# Verify Qdrant is running
curl http://localhost:6333/health

# Verify Neo4j is running (if enabled)
curl http://localhost:7474

# Check backend logs for memory system initialization
tail -f /var/log/chatsg/backend.log
```

## How It Works

### User Isolation

1. When a user logs in, their database ID is stored in the session
2. All memory operations include the user's database ID
3. Searches are filtered to only return memories for the authenticated user
4. Each user's memories are completely isolated from other users

### Memory Flow

1. User sends a message → Message saved with `userDatabaseId`
2. Mem0 extracts key information → Stored in `mem0_memories` table
3. Vector embeddings created → Indexed for similarity search
4. Context retrieval → Filters by user ID and session

### Example Usage

```typescript
// Adding memories (happens automatically)
await mem0Service.addMessages(
    messages,
    sessionId,
    userId,        // String user ID
    userDatabaseId // Database integer ID
);

// Searching memories (user-aware)
const results = await mem0Service.search(
    "What movies do I like?",
    { sessionId, userId },
    userDatabaseId
);

// Getting context (filtered by user)
const context = await mem0Service.getContextForQuery(
    query,
    sessionId,
    userId,
    userDatabaseId
);
```

## Benefits

1. **Security** - User memories are completely isolated
2. **Scalability** - PostgreSQL handles large datasets better than SQLite
3. **Performance** - pgvector provides efficient similarity search
4. **Integration** - Uses existing user authentication system
5. **Maintenance** - Single database to backup and maintain

## Troubleshooting

### pgvector Extension Not Found

If you get an error about pgvector not being installed:

```sql
-- Connect to your database and run:
CREATE EXTENSION IF NOT EXISTS vector;
```

### Permission Issues

Ensure your database user has permission to create extensions:

```sql
GRANT CREATE ON DATABASE chatsg TO your_user;
```

### Memory Not Being Stored

Check that:
1. `MEM0_ENABLED=true` in your .env file
2. `MEM0_PROVIDER=pgvector` is set
3. Database migration has been run
4. User is properly authenticated

## Rollback Instructions

If you need to rollback to SQLite:

1. Set `MEM0_PROVIDER=memory` in .env (or remove it)
2. Restart the backend server
3. The system will automatically use SQLite

The PostgreSQL tables can remain in place for future use.