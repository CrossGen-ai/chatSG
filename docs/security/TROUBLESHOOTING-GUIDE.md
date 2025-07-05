# Security Troubleshooting Guide

## Overview
This guide provides solutions to common security-related issues in ChatSG, including authentication problems, CSRF errors, and streaming issues.

## Quick Diagnosis Flowchart

```
User reports issue
├─> Authentication problem?
│   ├─> Login fails? → Check Azure AD configuration
│   ├─> Session lost? → Check session storage
│   └─> Wrong user data? → Check user mapping
├─> CSRF error?
│   ├─> 403 on POST? → Check CSRF token
│   ├─> Token mismatch? → Check token reuse
│   └─> Missing header? → Check frontend code
└─> Streaming issue?
    ├─> No response? → Check SSE endpoint
    ├─> 403 error? → Check CSRF for SSE
    └─> Partial data? → Check body parsing
```

## Common Issues and Solutions

### 1. Authentication Issues

#### Issue: Login Redirects to Error Page
**Symptoms**: 
- User clicks login
- Redirected to Azure AD
- Returns to error page

**Diagnosis**:
```bash
# Check server logs
grep "Auth] Login error" backend/logs/server.log

# Common errors:
# - AADSTS50011: Reply URL mismatch
# - AADSTS900439: USGClientNotSupportedOnPublicEndpoint
```

**Solutions**:
1. **Reply URL Mismatch**:
   ```bash
   # Verify redirect URI in .env matches Azure AD exactly
   echo $AZURE_REDIRECT_URI
   # Should match app registration in portal.azure.us
   ```

2. **Wrong Authority Endpoint**:
   ```javascript
   // Ensure using .us for GCC High
   authority: 'https://login.microsoftonline.us/${TENANT_ID}'
   // NOT: 'https://login.microsoftonline.com/${TENANT_ID}'
   ```

3. **Client Secret Expired**:
   - Check expiration in Azure portal
   - Generate new secret if needed
   - Update .env file

#### Issue: User Session Not Persisting
**Symptoms**:
- Login successful
- Refreshing page logs out user
- API calls return 401

**Diagnosis**:
```javascript
// Test session storage
curl -v http://localhost:3000/api/auth/user \
  -H "Cookie: connect.sid=..."

// Check PostgreSQL session table
psql -U postgres -d chatsg -c "SELECT * FROM session;"
```

**Solutions**:
1. **Session Configuration**:
   ```javascript
   // Check express-session config
   app.use(session({
     secret: process.env.SESSION_SECRET,
     store: new pgStore({
       pool: pgPool,
       tableName: 'session'
     }),
     resave: false,
     saveUninitialized: false,
     cookie: {
       secure: process.env.NODE_ENV === 'production',
       httpOnly: true,
       maxAge: 86400000 // 24 hours
     }
   }));
   ```

2. **Cookie Issues**:
   - Development: `secure: false`
   - Production: `secure: true` (requires HTTPS)
   - Check SameSite settings for cross-origin

3. **Database Connection**:
   ```bash
   # Test PostgreSQL connection
   node backend/tests/database/test-postgres-connection.js
   ```

#### Issue: Mock Auth Not Working
**Symptoms**:
- Development mode
- USE_MOCK_AUTH=true
- Still requires real login

**Solutions**:
```bash
# Verify environment variables
echo "NODE_ENV=$NODE_ENV"
echo "USE_MOCK_AUTH=$USE_MOCK_AUTH"

# Should be:
# NODE_ENV=development
# USE_MOCK_AUTH=true

# Restart server after changing env
npm run dev
```

### 2. CSRF Protection Issues

#### Issue: 403 Forbidden on POST Requests
**Symptoms**:
- GET requests work
- POST/PUT/DELETE return 403
- Error: "CSRF token validation failed"

**Diagnosis**:
```javascript
// Check if token is being sent
// Browser DevTools > Network > Request Headers
// Should see: X-CSRF-Token: xxxxx

// Test token generation
curl -v http://localhost:3000/api/config/security
// Should return: X-CSRF-Token header
```

**Solutions**:
1. **Frontend Not Sending Token**:
   ```javascript
   // Ensure CSRFManager is used
   import { csrfManager } from './security/CSRFManager';
   
   const headers = await csrfManager.addHeaders();
   fetch('/api/endpoint', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       ...headers // Includes X-CSRF-Token
     }
   });
   ```

2. **Token Expired**:
   - Tokens expire after 1 hour
   - Frontend should refresh automatically
   - Force refresh: `csrfManager.refreshToken()`

3. **Token Mismatch** (Old Issue - Should be Fixed):
   ```javascript
   // Verify token reuse is working
   node backend/tests/test-csrf-reuse.js
   // All tokens should be same
   ```

#### Issue: SSE Streaming CSRF Errors
**Symptoms**:
- Chat messages fail to send
- Console shows 403 on /api/chat/stream
- Regular API calls work

**Solutions**:
1. **Check SSE Request**:
   ```javascript
   // Ensure SSE includes CSRF token
   fetch('/api/chat/stream', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'X-CSRF-Token': token, // Required!
       'Accept': 'text/event-stream'
     }
   });
   ```

2. **Verify Endpoint Order**:
   ```javascript
   // In server.js, SSE should be after middleware
   // Correct order:
   // 1. Security middleware
   // 2. Body parsing
   // 3. Route handlers (including SSE)
   ```

### 3. Request Body Issues

#### Issue: POST Requests Timeout
**Symptoms**:
- POST requests hang for 2 minutes
- Then timeout with no response
- GET requests work fine

**Diagnosis**:
```javascript
// Check for double body parsing
// Search for req.on('data') in POST handlers
grep -n "req.on('data')" backend/server.js
```

**Solutions**:
```javascript
// WRONG - Double parsing
req.on('data', chunk => {
  body += chunk;
});

// CORRECT - Use parsed body
const data = req.body; // Already parsed by middleware
```

### 4. User Data Issues

#### Issue: Wrong User in Sessions
**Symptoms**:
- User A sees User B's chats
- User data mixed up
- Inconsistent user info

**Diagnosis**:
```sql
-- Check user sessions
SELECT 
  s.sid,
  s.sess->>'user' as user_data,
  s.expire
FROM session s
WHERE s.expire > NOW();

-- Check user table
SELECT * FROM users;
```

**Solutions**:
1. **Clear Stale Sessions**:
   ```sql
   -- Remove expired sessions
   DELETE FROM session WHERE expire < NOW();
   
   -- Clear all sessions (force re-login)
   TRUNCATE TABLE session;
   ```

2. **Verify User Mapping**:
   ```javascript
   // Check auth middleware user extraction
   console.log('[Auth] Token claims:', tokenResponse.idTokenClaims);
   console.log('[Auth] Mapped user:', {
     azureId: user.azureId,
     email: user.email,
     id: user.id
   });
   ```

### 5. Database Connection Issues

#### Issue: "ECONNREFUSED" PostgreSQL Errors
**Symptoms**:
- Server fails to start
- "Connection refused" errors
- Session storage fails

**Solutions**:
1. **Check PostgreSQL Status**:
   ```bash
   # Check if running
   docker ps | grep postgres
   
   # If not running
   docker start postgres-db
   
   # Check logs
   docker logs postgres-db
   ```

2. **Verify Connection String**:
   ```bash
   # Test connection
   psql $DATABASE_URL
   
   # Should be like:
   # postgresql://postgres:password@localhost:5432/chatsg
   ```

3. **Pool Configuration**:
   ```javascript
   const pool = new Pool({
     connectionString: process.env.DATABASE_URL,
     ssl: process.env.NODE_ENV === 'production' ? 
       { rejectUnauthorized: false } : false,
     max: 20,
     idleTimeoutMillis: 30000,
     connectionTimeoutMillis: 2000,
   });
   ```

### 6. Performance Issues

#### Issue: Slow Authentication
**Symptoms**:
- Login takes long time
- API calls delayed
- Session queries slow

**Solutions**:
1. **Add Database Indexes**:
   ```sql
   -- Optimize session queries
   CREATE INDEX idx_session_expire ON session(expire);
   CREATE INDEX idx_users_azure_id ON users(azure_id);
   CREATE INDEX idx_users_email ON users(email);
   ```

2. **Enable Query Logging**:
   ```javascript
   // Log slow queries
   pool.on('query', (query) => {
     if (query.duration > 1000) {
       console.warn('Slow query:', query.text, query.duration);
     }
   });
   ```

## Debug Commands

### Check System Status
```bash
# Full system check
npm run check:security

# Individual checks
npm run test:auth
npm run test:csrf
npm run test:db
```

### Enable Debug Logging
```javascript
// Add to .env
DEBUG=auth:*,csrf:*,session:*

// Or in code
process.env.DEBUG = 'auth:*,csrf:*';
```

### Monitor Real-time Logs
```bash
# Backend logs
tail -f backend/logs/server.log | grep -E "(Auth|CSRF|Session)"

# PostgreSQL queries
docker logs -f postgres-db | grep -E "(ERROR|SLOW)"
```

## Emergency Procedures

### 1. Disable Authentication (Emergency Only)
```javascript
// In auth middleware, add bypass
if (process.env.EMERGENCY_BYPASS === 'true') {
  console.warn('⚠️  EMERGENCY: Auth bypassed!');
  req.user = { id: 1, email: 'emergency@admin' };
  req.isAuthenticated = true;
  return next();
}
```

### 2. Reset All Sessions
```sql
-- Force all users to re-login
TRUNCATE TABLE session;

-- Reset specific user
DELETE FROM session 
WHERE sess::jsonb->>'user'->>'email' = 'user@example.com';
```

### 3. Regenerate CSRF Tokens
```javascript
// Clear token cache (restart required)
tokens.clear();

// Or add admin endpoint
app.post('/api/admin/reset-csrf', requireAdmin, (req, res) => {
  tokens.clear();
  res.json({ message: 'CSRF tokens reset' });
});
```

## Monitoring Checklist

### Daily Checks
- [ ] No authentication errors in logs
- [ ] Session table size reasonable
- [ ] CSRF validation working
- [ ] No timeout errors

### Weekly Checks
- [ ] Database indexes healthy
- [ ] Session cleanup running
- [ ] Security headers present
- [ ] Rate limiting active

### Monthly Checks
- [ ] Review failed login attempts
- [ ] Check certificate expiration
- [ ] Update dependencies
- [ ] Security scan results

## Getting Help

### Log Locations
- Backend: `backend/logs/server.log`
- PostgreSQL: `docker logs postgres-db`
- Frontend: Browser console
- Nginx (production): `/var/log/nginx/`

### Support Contacts
- Security Team: security@organization.gov
- Azure AD Admin: azuread@organization.gov
- Database Admin: dba@organization.gov

### Useful Resources
- [Azure AD Troubleshooting](https://docs.microsoft.com/en-us/azure/active-directory/develop/troubleshoot)
- [MSAL.js Known Issues](https://github.com/AzureAD/microsoft-authentication-library-for-js/wiki/Known-issues)
- [Express Session Docs](https://github.com/expressjs/session)
- [PostgreSQL Connection Issues](https://www.postgresql.org/docs/current/runtime-config-connection.html)

## Conclusion

Most security issues fall into predictable categories. This guide covers the most common problems and their solutions. When in doubt:

1. Check the logs
2. Verify configuration
3. Test individual components
4. Look for recent changes

Remember: Security issues should be fixed properly, not worked around.