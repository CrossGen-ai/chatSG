# PostgreSQL Database Setup

## Overview
ChatSG uses PostgreSQL running in a Docker container named `postgres-db`.

## Environment Variables
The following variables are configured in `/backend/.env`:

```bash
# PostgreSQL Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/chatsg
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=chatsg
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

# Database Pool Configuration (optional)
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
DATABASE_CONNECTION_TIMEOUT=60000
```

## Docker Setup
Ensure your PostgreSQL container is running:

```bash
# Check if postgres-db is running
docker ps | grep postgres-db

# If not running, start it
docker start postgres-db

# Or create new container
docker run --name postgres-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=chatsg \
  -p 5432:5432 \
  -d postgres:15-alpine
```

## Test Connection
Run the connection test from the backend directory:

```bash
cd backend
npm run test:db
```

This will verify:
- PostgreSQL container is accessible
- Connection credentials work
- Database exists (creates if missing)

## Folder Structure
```
database/
├── README.md           # This file
├── config/            # Database configuration (future)
│   ├── database.js    # Connection config
│   └── knexfile.js    # Migration runner config
├── migrations/        # Database migrations (future)
│   └── YYYYMMDDHHMMSS_description.js
└── seeds/            # Seed data (future)
    └── 01_seed_name.js
```

## Current Tables
The database currently contains 2 tables from the authentication system:

1. **users** - Stores user information from Azure AD authentication
   - id (serial primary key)
   - azure_id (unique identifier from Azure AD)
   - email
   - name
   - groups (array of group names)
   - last_login
   - created_at
   - updated_at

2. **session** - Stores Express session data (via connect-pg-simple)
   - sid (session ID, primary key)
   - sess (JSON session data)
   - expire (session expiration timestamp)

## Notes
- Authentication tables were added as part of the Azure AD integration
- Chat data is currently stored in JSONL files (not PostgreSQL)
- Data is stored in Docker volume for persistence
- Default credentials are for development only
- Folders are created for future migration/seed organization