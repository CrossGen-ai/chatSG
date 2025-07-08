# Mem0 PostgreSQL/pgvector Migration Guide

## Overview

This guide documents the migration of Mem0 from SQLite to PostgreSQL with pgvector for the ChatSG application. The migration provides:

- **Scalable vector storage** using PostgreSQL's pgvector extension
- **User isolation** - memories are properly segregated by user ID
- **Better performance** for large-scale deployments
- **Integration with existing user system** - uses the same PostgreSQL database

## What Changed

### 1. Database Schema

Created new tables in PostgreSQL:
- `mem0_memories` - Stores memory embeddings with user association
- `mem0_history` - Tracks memory changes over time
- `mem0_metadata` - Collection-level statistics per user

### 2. Code Updates

- **Mem0Service.ts** - Updated to support pgvector provider with user awareness
- **storage.config.ts** - Added PostgreSQL configuration for Mem0
- **StorageManager.ts** - Enhanced to pass user database IDs to Mem0
- **server.js** - Updated to include user database ID in metadata

### 3. Key Features

- All memories are associated with the authenticated user's database ID
- Vector similarity search using IVFFlat index
- Automatic pgvector extension installation
- Fallback to SQLite if pgvector is unavailable

## Setup Instructions

### 1. Configure Environment Variables

Add to your `backend/.env` file:

```bash
# Enable Mem0 with pgvector
MEM0_ENABLED=true
MEM0_PROVIDER=pgvector

# PostgreSQL settings (uses same as main database by default)
# Override only if using a different database:
# POSTGRES_HOST=localhost
# POSTGRES_PORT=5432
# POSTGRES_USER=postgres
# POSTGRES_PASSWORD=your_password
# POSTGRES_DB=chatsg
```

### 2. Run Database Migration

```bash
cd backend/src/database
node run-migration.js 002_create_mem0_tables.sql
```

This will:
- Install pgvector extension
- Create Mem0 tables with proper indexes
- Set up triggers for metadata tracking

### 3. Restart Backend Server

```bash
npm run stop
npm run dev
```

### 4. Verify Installation

Run the test script:

```bash
cd backend/tests/memory
node test-mem0-pgvector.js
```

### 5. Clean Up Old SQLite Files (After Verification)

```bash
rm backend/memory.db
rm backend/vector_store.db
rm backend/data/sessions/memory.db
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