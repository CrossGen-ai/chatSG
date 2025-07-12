# ChatSG Authentication Deployment Guide

## Production Architecture

### Network Configuration
- **Public Endpoint**: https://51.54.96.228 (SSL)
- **Azure Gateway**: Performs SSL termination
- **Internal VM**: http://10.2.0.54:3000 (no SSL)
- **Gateway Headers**: Adds `X-Forwarded-Proto: https` and `X-Forwarded-For: <client-ip>`

### Current Deployment Status (as of 2025-07-12)
✅ **Authentication is fully working with Azure AD in GCC High environment**

## Environment Configuration

### Required Environment Variables
```bash
# Node Environment
NODE_ENV=production
CHATSG_ENVIRONMENT=dev

# Authentication
USE_MOCK_AUTH=false

# Trust Proxy (REQUIRED for Azure Gateway)
TRUST_PROXY=true

# Session Configuration
SESSION_SECRET=<your-32-char-secret>
SESSION_NAME=chatsg_session
SESSION_MAX_AGE=86400000
SESSION_SECURE=true

# Cookie Configuration
COOKIE_DOMAIN=51.54.96.228

# Frontend URL
FRONTEND_URL=https://51.54.96.228

# Azure AD Configuration
AZURE_CLIENT_ID=<your-client-id>
AZURE_TENANT_ID=<your-tenant-id>
AZURE_CLIENT_SECRET=<your-client-secret>
AZURE_REDIRECT_URI=https://51.54.96.228/api/auth/callback

# Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@localhost:5432/chatsg
PGSSL=false
DATABASE_SSL=false
```

## How It Works

### SSL Termination Flow
1. Client connects to https://51.54.96.228 (Azure Gateway)
2. Gateway terminates SSL and forwards to http://10.2.0.54:3000
3. Gateway adds headers:
   - `X-Forwarded-Proto: https`
   - `X-Forwarded-For: <client-ip>`
4. Node.js app detects HTTPS via headers (when `TRUST_PROXY=true`)
5. Secure cookies work properly

### OAuth Flow
1. User visits app → Redirected to `/api/auth/login`
2. Session created with OAuth state and saved to PostgreSQL
3. User redirected to Microsoft login (login.microsoftonline.us for GCC High)
4. After auth, Microsoft redirects to `/api/auth/callback` with code and state
5. Session loaded from cookie, state verified
6. User authenticated and redirected to app

## Debug Endpoints

All endpoints are available in production for troubleshooting:

### 1. Environment Check
```bash
curl -k https://51.54.96.228/api/auth/check-env | jq
```
Shows all environment variables, proxy detection, and request headers.

### 2. Session Store Test
```bash
curl -k https://51.54.96.228/api/auth/test-store | jq
```
Verifies PostgreSQL session storage is working.

### 3. Auth Flow Test
```bash
curl -k https://51.54.96.228/api/auth/test-flow | jq
```
Tests complete session save/reload cycle.

### 4. OAuth State Test
```bash
# Set state
curl -k -c cookies.txt "https://51.54.96.228/api/auth/test-oauth-state?action=set" | jq

# Get state (with cookies)
curl -k -b cookies.txt "https://51.54.96.228/api/auth/test-oauth-state?action=get" | jq
```
Tests OAuth state persistence across requests.

### 5. Cookie Test
```bash
curl -k https://51.54.96.228/api/auth/test-cookies | jq
```
Verifies cookie behavior.

### 6. Session Debug
```bash
curl -k https://51.54.96.228/api/auth/session-debug | jq
```
Shows current session details.

### 7. Test Config
```bash
curl -k https://51.54.96.228/api/auth/test-config | jq
```
Comprehensive configuration and proxy information.

## Troubleshooting

### Common Issues and Solutions

#### "Invalid state parameter" Error
**Cause**: Session not persisting between login and callback.
**Solution**: Already fixed by removing session ID override in http-adapter.js

#### No cookies being set
**Cause**: SSL detection failing.
**Solution**: Ensure `TRUST_PROXY=true` is set.

#### Session not found in database
**Cause**: PostgreSQL connection issues.
**Solution**: Check `PGSSL=false` and `DATABASE_SSL=false` for local PostgreSQL.

### Verification Checklist
1. ✅ `TRUST_PROXY=true` in .env
2. ✅ Proxy detection shows `xForwardedProto: "https"`
3. ✅ Session saves to database (check with test-store)
4. ✅ OAuth state persists (check with test-oauth-state)
5. ✅ Cookies have `secure: true` and `sameSite: "none"`

## Test Scripts

### Quick Test
```bash
cd backend
./test-auth-curl.sh  # Tests production by default
```

### Comprehensive Test
```bash
cd backend
node test-auth-comprehensive.js  # Full test suite with analysis
```

## Security Considerations

1. **Session Secret**: Use a strong, unique secret in production
2. **HTTPS Only**: Always use `SESSION_SECURE=true` in production
3. **CORS**: Currently allows `http://localhost:5173` - update for production frontend
4. **Database**: Session data is stored in PostgreSQL - ensure it's secured
5. **Azure AD**: Using GCC High endpoints (login.microsoftonline.us)

## PM2 Deployment

The app runs under PM2 on the production VM:
```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

## Critical Code Fix Applied

The key fix that made authentication work was in `middleware/http-adapter.js`:
```javascript
// OLD (BROKEN):
req.sessionID = req.cookies['session-id'] || req.ip;

// NEW (FIXED):
// Let express-session middleware handle session IDs
// req.sessionID = req.cookies['session-id'] || req.ip;
```

This single line was preventing sessions from loading from cookies, causing new sessions on every request.