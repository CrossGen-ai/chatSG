# PostgreSQL Database Current State

## Overview
PostgreSQL is running in a Docker container (`postgres-db`) and is currently used for:
- User authentication (Azure AD integration)
- Session management (Express sessions)

## Connection Details
- **Container**: `postgres-db` (postgres:latest)
- **Status**: Running (Up 4 hours)
- **Port**: 5432 (exposed on localhost)
- **Database Name**: `chatsg`
- **Connection String**: `postgresql://postgres:password@localhost:5432/chatsg`

## Current Tables

### 1. users
Stores user information from Azure AD authentication:
```sql
id          | integer                  | NO  | Primary Key
azure_id    | character varying        | NO  | Unique identifier from Azure AD
email       | character varying        | NO  | User email address
name        | character varying        | YES | User display name
groups      | ARRAY                    | YES | Array of Azure AD groups
last_login  | timestamp with time zone | YES | Last login timestamp
created_at  | timestamp with time zone | YES | Record creation time
updated_at  | timestamp with time zone | YES | Last update time
```

### 2. session
Stores Express session data (managed by connect-pg-simple):
```sql
sid    | character varying | Primary Key | Session ID
sess   | json             | Session data (user info, CSRF tokens, etc.)
expire | timestamp        | Session expiration time
```

## Important Notes

1. **Limited PostgreSQL Usage**: PostgreSQL is only used for authentication and sessions. The main chat data is stored in:
   - **JSONL files**: `/backend/data/sessions/` for chat messages
   - **Neo4j**: Graph database for memory and context management

2. **Authentication Status**: The authentication system was added but caused issues with mem0ai due to peer dependency conflicts. The system has been rolled back to commit `0045cb4`.

3. **Environment Configuration**: The `.env` file contains all necessary PostgreSQL credentials and is properly configured.

4. **Database Health**: Connection test confirms PostgreSQL is accessible and both tables exist.

## File Locations
- **Migration**: `/backend/src/database/migrations/001_create_users.sql`
- **User Repository**: `/backend/src/database/userRepository.js`
- **Connection Pool**: `/backend/src/database/pool.js`
- **Test Script**: `/backend/tests/database/test-postgres-connection.js`

## Next Steps
- PostgreSQL is ready for expanded use if needed
- The authentication tables remain in place for when auth is re-enabled