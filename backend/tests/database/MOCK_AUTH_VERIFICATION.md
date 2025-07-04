# Mock Authentication Database Verification

## Summary

The mock authentication user is now properly connected to the PostgreSQL database. When someone logs in with mock auth (`ENVIRONMENT=dev` and `USE_MOCK_AUTH=true`), they get a consistent user record that persists across sessions.

## Key Findings

### 1. Database User Details
- **Database ID**: 2 (persistent across sessions)
- **Email**: dev@example.com
- **Name**: Development User
- **Groups**: ['developers']
- **Azure ID**: mock-azure-id

### 2. Authentication Flow

When mock auth is enabled:

1. **On Authentication** (`authenticate` middleware):
   - Checks if mock user exists in database by Azure ID
   - If not found, checks by email and updates the Azure ID if needed
   - Creates new user if neither exists
   - Updates last login timestamp
   - Returns the actual database user ID (not a hardcoded value)

2. **On Login** (`/api/auth/login`):
   - Same database sync logic as authentication
   - Stores the real database user in session
   - User gets database ID `2` instead of hardcoded 'dev-user-id'

### 3. Changes Made

Updated files:
- `/backend/middleware/security/auth.js`:
  - Modified `authenticate()` to sync with database
  - Modified `login()` to sync with database
  - Now returns real database ID instead of hardcoded values

### 4. Test Results

✅ Database connection working
✅ Mock user exists in database (ID: 2)
✅ Authentication returns real database ID
✅ Last login timestamp updates on each authentication
✅ User data persists across server restarts

### 5. How to Verify

Run the test script:
```bash
cd backend
node tests/database/test-mock-user.js
# or
node tests/database/test-mock-auth-flow.js
```

The mock user will have a consistent database ID (currently `2`) that persists across all sessions and server restarts.

## Important Notes

1. If there's an existing user with email `dev@example.com` but different Azure ID, the system will update that user to use the mock Azure ID
2. The last login timestamp is updated on every authentication
3. The user ID in `req.user` now matches the actual database record
4. This ensures consistent user tracking across sessions for development/testing