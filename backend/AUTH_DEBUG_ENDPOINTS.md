# Auth Debug Endpoints

These endpoints help troubleshoot authentication and session issues.

## Available Endpoints

### 1. `/api/auth/check-env`
Shows all environment variables related to auth, sessions, and cookies.

### 2. `/api/auth/test-store`
Tests the PostgreSQL session store:
- Checks if session table exists
- Shows session count
- Verifies current session is in database

### 3. `/api/auth/test-flow`
Tests the complete session flow:
- Creates a session
- Saves to database
- Reloads from database
- Verifies data persistence

### 4. `/api/auth/test-oauth-state?action=[set|get|clear]`
Tests OAuth state persistence:
- `?action=set` - Sets a test OAuth state
- `?action=get` - Retrieves the OAuth state
- `?action=clear` - Clears the OAuth state

### 5. `/api/auth/test-cookies`
Tests cookie behavior:
- Shows received cookies
- Sets a test cookie
- Verifies cookie round-trip

## Testing Scripts

### Quick Test (curl)
```bash
# Test production
./test-auth-curl.sh

# Test local
./test-auth-curl.sh local
```

### Comprehensive Test (Node.js)
```bash
# Test production
node test-auth-comprehensive.js

# Test local
USE_LOCAL=true node test-auth-comprehensive.js
```

## What to Look For

1. **Environment**: `TRUST_PROXY=true` must be set
2. **Session Store**: Database connection must work
3. **OAuth State**: State must persist between set and get
4. **Cookies**: Must see Set-Cookie headers

## Troubleshooting

If OAuth state doesn't persist:
1. Check session saves successfully
2. Verify cookies are sent back
3. Ensure session IDs match between requests