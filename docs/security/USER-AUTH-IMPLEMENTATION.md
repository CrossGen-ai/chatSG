# User Authentication Implementation Documentation

## Overview
This document provides a comprehensive history of the user authentication implementation for ChatSG, including all issues encountered, fixes applied, and lessons learned during the implementation process.

## Implementation Timeline

### Phase 1: Initial Authentication Setup
**Date**: July 2025  
**Objective**: Implement Azure AD authentication with mock auth support for development

#### Key Components Implemented:
1. **Database Schema** (Already existed from previous attempt)
   - `users` table - Stores Azure AD user information
   - `session` table - Express session storage via connect-pg-simple

2. **Authentication Middleware** (`backend/middleware/security/auth.js`)
   - Azure AD authentication via MSAL
   - Mock authentication for development
   - Session management with PostgreSQL storage
   - User filtering for chat sessions

3. **Frontend Integration**
   - AuthContext for user state management
   - Login/logout UI components
   - Protected routes
   - User-specific chat filtering

### Phase 2: Critical Issues and Fixes

#### Issue 1: POST Request Body Parsing Timeout
**Problem**: POST requests were timing out while GET requests worked fine.
- **Root Cause**: Double body parsing - request body was being consumed by middleware, then POST handlers tried to read it again with `req.on('data')`, causing infinite wait
- **Symptoms**: 
  - GET requests: ✓ Working
  - POST requests: ✗ Timeout after 120s
  - Error: Request hanging indefinitely

**Fix Applied**:
```javascript
// BEFORE (causing timeout)
req.on('data', chunk => {
    body += chunk.toString();
});
req.on('end', () => {
    const data = JSON.parse(body);
    // Process request
});

// AFTER (fixed)
const data = req.body; // Body already parsed by middleware
// Process request directly
```

**Files Modified**:
- `backend/server.js` - Updated POST `/api/chats` endpoint (line 2316)
- `backend/server.js` - Updated POST `/api/chat` endpoint

#### Issue 2: DOMPurify Title Corruption
**Problem**: Chat titles were showing "root => createDOMPurify(root)" instead of actual titles
- **Root Cause**: Calling `DOMPurify()` instead of `DOMPurify.sanitize()`
- **Impact**: All chat titles corrupted in UI

**Fix Applied**:
```javascript
// BEFORE (incorrect)
const clean = DOMPurify(value);

// AFTER (correct)
const clean = DOMPurify.sanitize(value, { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: {},
    KEEP_CONTENT: true 
});
```

**Files Modified**:
- `backend/middleware/security/sanitizer.js` (line 29)

#### Issue 3: Mock User Database Connection
**Problem**: Mock user creation logic was too complex
- **Initial Approach**: Auto-create user if missing from database
- **User Feedback**: "Shouldn't really just have the one until we deliberately add other ones?"

**Fix Applied**:
```javascript
// Simplified to only use existing user
const dbUser = await getUserByAzureId('mock-azure-id');
if (!dbUser) {
    console.error('[Auth] Mock user not found in database');
    req.user = null;
    req.isAuthenticated = false;
    return next();
}
```

**Files Modified**:
- `backend/middleware/security/auth.js` - Removed auto-creation logic

#### Issue 4: SSE Streaming CSRF Token Validation
**Problem**: SSE streaming endpoint failing with "Invalid or expired CSRF token"
- **Root Cause 1**: SSE endpoint was handled before middleware, causing body parsing issues
- **Root Cause 2**: CSRF tokens were being regenerated on EVERY GET request, causing token mismatch

**Symptoms**:
```
[CSRF-Header] Token verification details: {
  storedToken: '9347121668dceac87643...',
  headerToken: 'ccd76d98bdc571270637...',
  tokensMatch: false
}
```

**Fix Applied (Part 1 - SSE Endpoint)**:
```javascript
// BEFORE: Special handling before middleware
if (req.url === '/api/chat/stream' && req.method === 'POST') {
    // Manual body parsing causing issues
    let body = '';
    req.on('data', chunk => { body += chunk; });
    // ...
}

// AFTER: Let it go through normal middleware
// Removed special handling, added endpoint after middleware
} else if (req.url === '/api/chat/stream' && req.method === 'POST') {
    handleSSERequest(req, res);
}
```

**Fix Applied (Part 2 - CSRF Token Reuse)**:
```javascript
// BEFORE: Always create new token
const token = generateToken();
tokens.set(sessionId, { token, expires: ... });

// AFTER: Reuse existing valid tokens
const existingToken = tokens.get(sessionId);
if (existingToken && existingToken.expires > Date.now()) {
    token = existingToken.token;
    console.log('[CSRF-Header] Using existing token');
} else {
    token = generateToken();
    tokens.set(sessionId, { token, expires: ... });
}
```

**Files Modified**:
- `backend/server.js` - Removed lines 474-512 (special SSE handling)
- `backend/server.js` - Added SSE endpoint at line 628
- `backend/middleware/security/csrf-header.js` - Added token reuse logic

## Architecture Decisions

### 1. Session-Based Authentication
**Decision**: Use session-based auth with PostgreSQL storage
**Rationale**: 
- Better security for server-side session management
- Integrates well with existing Express middleware
- PostgreSQL already in use for data persistence

### 2. Mock Authentication
**Decision**: Implement comprehensive mock auth for development
**Rationale**:
- Allows development without Azure AD setup
- Faster iteration during development
- Consistent user experience for testing

### 3. User-Specific Chat Filtering
**Decision**: Filter chats by authenticated user ID
**Rationale**:
- Privacy and security requirement
- Each user only sees their own conversations
- Admin users can be granted access to all chats

### 4. CSRF Protection Strategy
**Decision**: Header-based CSRF tokens instead of cookies
**Rationale**:
- Works better with Vite proxy in development
- Simpler implementation for SPA
- Avoids cookie configuration complexities

## Security Considerations

### 1. Authentication Flow
- Azure AD OAuth 2.0 with PKCE
- Secure session storage in PostgreSQL
- Automatic session expiration
- Proper logout clearing sessions

### 2. CSRF Protection
- Token validation on all state-changing requests
- Tokens tied to user sessions
- 1-hour token expiration
- Token reuse to prevent race conditions

### 3. Input Validation
- All user inputs sanitized with DOMPurify
- SQL injection prevention via parameterized queries
- XSS protection through proper escaping

### 4. Rate Limiting
- Applied to all endpoints
- IP-based limiting
- Protects against brute force attacks

## Lessons Learned

### 1. Body Parsing in Node.js
- **Lesson**: Request body streams can only be read once
- **Impact**: Caused major debugging confusion with timeouts
- **Best Practice**: Always use pre-parsed `req.body` when available

### 2. CSRF Token Management
- **Lesson**: Token generation on every request causes race conditions
- **Impact**: Streaming endpoints failed intermittently
- **Best Practice**: Implement token caching with proper expiration

### 3. Library Usage
- **Lesson**: Always check correct method names (DOMPurify.sanitize not DOMPurify)
- **Impact**: UI corruption that was visible to users
- **Best Practice**: Verify library API documentation

### 4. Incremental Implementation
- **Lesson**: Test after each change to catch issues early
- **Impact**: Easier debugging and rollback
- **Best Practice**: Implement features in small, testable chunks

### 5. Mock Authentication Value
- **Lesson**: Mock auth is crucial for development productivity
- **Impact**: Faster development cycles
- **Best Practice**: Implement mock auth from the start

## Testing Strategy

### Unit Tests
- Authentication middleware logic
- CSRF token generation and validation
- User repository functions
- Session management

### Integration Tests
- Full authentication flow
- CSRF protection with real requests
- SSE streaming with authentication
- Database persistence

### E2E Tests
- Login/logout flow
- Protected route access
- Chat filtering by user
- Session expiration

## Monitoring and Debugging

### Key Log Points
```javascript
console.log('[Auth] User authenticated:', user.email);
console.log('[CSRF-Header] Token verification:', { tokenMatch, expired });
console.log('[SSE] Stream started for session:', sessionId);
```

### Debug Procedures
1. Check authentication logs for user state
2. Verify CSRF tokens in request/response headers
3. Monitor PostgreSQL for session data
4. Use browser DevTools for frontend auth state

## Future Improvements

1. **Token Refresh**: Implement automatic token refresh for long sessions
2. **MFA Support**: Add multi-factor authentication
3. **Role-Based Access**: Implement granular permissions
4. **Audit Logging**: Enhanced logging for security events
5. **Session Analytics**: Track user activity patterns

## Conclusion

The authentication implementation successfully provides secure access control for ChatSG while maintaining a good developer experience. The issues encountered and resolved during implementation have strengthened the overall security posture and provided valuable lessons for future development.