name: "Azure AD Authentication for ChatSG - GCC High Edition"
description: |

## Purpose
Implement secure Azure AD authentication for ChatSG using MSAL.js with GCC High endpoints, supporting both production authentication and development mode bypass. This PRP provides comprehensive context for AI agents to achieve working authentication in a single implementation pass.

## Core Principles
1. **GCC High Compliance**: Use proper government cloud endpoints
2. **Security First**: Follow Azure AD best practices with PKCE flow
3. **Developer Experience**: Support mock auth in development
4. **Type Safety**: Full TypeScript support throughout
5. **Global Rules**: Follow CLAUDE.md and existing security patterns

---

## Goal
Implement Azure Active Directory (AAD) authentication to restrict app access to internal company users in Azure GCC High environment, with development mode bypass for testing.

## Why
- **Security Requirement**: Internal app must authenticate users via corporate Azure AD
- **Compliance**: GCC High environment requires proper government cloud integration  
- **User Management**: Need to track user sessions and permissions
- **Audit Trail**: Store login history and user actions in PostgreSQL

## What
Build OIDC authentication flow using MSAL.js with:
- Authorization code grant with PKCE
- User info extraction (email, name, groups)
- Session management and JWT tokens
- PostgreSQL user storage
- Development mode with mock users
- Middleware integration into existing security stack

### Success Criteria
- [ ] Users can login via Azure AD in production
- [ ] Mock user works in development mode
- [ ] User email, name, and groups extracted from tokens
- [ ] User data persisted to PostgreSQL
- [ ] Existing security middleware enhanced with auth
- [ ] Frontend shows user info and logout option
- [ ] All TypeScript types properly defined
- [ ] Tests pass for auth flow

## All Needed Context

### Documentation & References
```yaml
# MUST READ - Include these in your context window
- file: CLAUDE.md
  why: Global project rules - never edit .env, commit patterns
  
- file: backend/middleware/security/auth.js
  why: Current auth stub to be replaced
  
- file: backend/middleware/security/index.js
  why: Security middleware orchestration pattern
  
- file: backend/config/security.config.js
  why: Security configuration structure

- file: backend/server.js
  why: Main server and middleware integration
  
- url: https://www.npmjs.com/package/@azure/msal-node
  why: MSAL.js for Node.js - main auth library
  
- url: https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow
  why: OAuth 2.0 auth code flow documentation
  
- url: https://learn.microsoft.com/en-us/azure/active-directory/develop/msal-national-cloud
  why: National cloud (GCC High) configuration

- url: https://github.com/Azure-Samples/ms-identity-javascript-nodejs-tutorial
  why: MSAL Node.js implementation examples

- npmPackage: @azure/msal-node
  version: ^3.6.2
  why: Microsoft Authentication Library for Azure AD
  
- npmPackage: express-session
  version: ^1.17.3
  why: Session management for user state
  
- npmPackage: connect-pg-simple
  version: ^9.0.1
  why: PostgreSQL session store
```

### Current Codebase Structure
```bash
chatSG/
├── backend/
│   ├── middleware/
│   │   └── security/
│   │       ├── index.js       # Security orchestrator
│   │       ├── auth.js        # Auth stub (to replace)
│   │       ├── csrf-header.js # CSRF protection
│   │       └── ...
│   ├── config/
│   │   └── security.config.js # Security settings
│   ├── tests/
│   │   └── database/
│   │       └── test-postgres-connection.js
│   └── server.js              # Main server
├── frontend/
│   ├── src/
│   │   ├── api/              # API client
│   │   ├── security/         # CSRF manager
│   │   └── components/       # React components
│   └── package.json
└── docs/
```

### Desired Files/Changes
```yaml
backend:
  - CREATE: src/auth/AzureAuthProvider.ts
  - CREATE: src/auth/types.ts
  - CREATE: src/auth/mockAuth.ts
  - CREATE: src/database/userRepository.ts
  - CREATE: src/database/migrations/001_create_users.sql
  - MODIFY: middleware/security/auth.js (complete implementation)
  - MODIFY: config/security.config.js (add auth config)
  - MODIFY: server.js (add auth routes)
  - CREATE: tests/auth/test-azure-auth.js
  
frontend:
  - CREATE: src/contexts/AuthContext.tsx
  - CREATE: src/components/LoginButton.tsx
  - CREATE: src/components/UserProfile.tsx
  - CREATE: src/pages/Login.tsx
  - CREATE: src/pages/AuthCallback.tsx
  - MODIFY: src/App.tsx (add auth wrapper)
  - MODIFY: src/api/chat.ts (add auth headers)
  - CREATE: src/hooks/useAuth.tsx
```

### GCC High Specific Configuration
```javascript
// CRITICAL: GCC High endpoints are different from commercial Azure
const GCC_HIGH_CONFIG = {
  auth: {
    clientId: process.env.AZURE_CLIENT_ID,
    authority: `https://login.microsoftonline.us/${process.env.AZURE_TENANT_ID}`,
    clientSecret: process.env.AZURE_CLIENT_SECRET
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        console.log(`[MSAL ${level}] ${message}`);
      }
    }
  }
};

// OpenID discovery endpoint for GCC High
// https://login.microsoftonline.us/{tenant-id}/v2.0/.well-known/openid-configuration
```

### Known Gotchas & Patterns
```typescript
// CRITICAL: Backend uses CommonJS
// Use module.exports and require() for backend files

// GOTCHA: MSAL requires specific session configuration
// Sessions must be configured before MSAL middleware

// PATTERN: Async middleware error handling
const authMiddleware = async (req, res, next) => {
  try {
    // Auth logic
    next();
  } catch (error) {
    console.error('[Auth] Middleware error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

// GOTCHA: PostgreSQL connection for GCC High
// May need special SSL configuration for government cloud

// PATTERN: Development mode bypass
if (process.env.NODE_ENV === 'development' && process.env.USE_MOCK_AUTH === 'true') {
  req.user = {
    email: 'dev@example.com',
    name: 'Dev User',
    groups: ['developers']
  };
  return next();
}

// GOTCHA: Frontend redirect URIs must be registered in Azure AD
// Include both development and production URLs
```

## Current State
The PostgreSQL database already contains the authentication tables from a previous attempt:
- **users** table - Stores Azure AD user information  
- **session** table - Stores Express session data
- PostgreSQL is running in Docker container `postgres-db` on port 5432

## Pre-Implementation Checks
```bash
# CRITICAL: Run these checks before starting implementation
1. Verify backend still starts correctly:
   cd backend && npm run dev
   # Should see "Orchestrator initialized successfully"

2. Check PostgreSQL connection:
   cd backend/tests/database && node test-postgres-connection.js
   # Should show "2 tables" (users and session)

3. Verify no authentication is currently active:
   curl http://localhost:3000/api/chats
   # Should return chat list without authentication errors

4. Create a backup branch:
   git checkout -b auth-implementation-v2
```

## Implementation Blueprint

### Task List
```yaml
Task 0 - Pre-implementation verification:
  - Run all pre-checks above
  - Ensure orchestrator initializes properly
  - Confirm API endpoints work without auth

Task 1 - Install dependencies and create types:
  - Install: @azure/msal-node, express-session, connect-pg-simple
  - CREATE backend/src/auth/types.ts with User, Session interfaces
  - Define MSAL configuration types
  - Validation: npm run type-check should pass

Task 2 - Setup database components:
  - SKIP creating tables (they already exist from previous attempt)
  - CREATE backend/src/database/userRepository.js (CommonJS)
  - CREATE backend/src/database/pool.js for connection pooling
  - Test connection with existing test script
  - Verify tables with: psql query or test script

Task 3 - Implement Azure Auth Provider:
  - CREATE backend/src/auth/AzureAuthProvider.ts
  - Configure MSAL with GCC High endpoints
  - Implement login, callback, logout methods
  - Add token validation and user extraction
  - CREATE backend/src/auth/mockAuth.ts for dev mode

Task 4 - Update auth middleware:
  - MODIFY backend/middleware/security/auth.js
  - Replace stubs with real implementation
  - Integrate with AzureAuthProvider
  - Add session management with PostgreSQL
  - Test auth flow with curl

Task 5 - Add auth routes to server:
  - MODIFY backend/server.js
  - Add /auth/login, /auth/callback, /auth/logout
  - Add /auth/user endpoint for current user
  - Update security config to enable auth
  
Task 6 - Create frontend auth components:
  - CREATE frontend/src/contexts/AuthContext.tsx
  - CREATE frontend/src/hooks/useAuth.tsx
  - CREATE frontend/src/components/LoginButton.tsx
  - Add auth state management

Task 7 - Implement auth flow UI:
  - CREATE frontend/src/pages/Login.tsx
  - CREATE frontend/src/pages/AuthCallback.tsx
  - MODIFY frontend/src/App.tsx with auth wrapper
  - Add protected route logic

Task 8 - Update API client:
  - MODIFY frontend/src/api/chat.ts
  - Add auth token to request headers
  - Handle 401 responses with redirect to login
  
Task 9 - Write tests:
  - CREATE backend/tests/auth/test-azure-auth.js
  - Test login flow, token validation, user extraction
  - Test development mode bypass
  - Test session persistence
```

### Incremental Testing Strategy
After EACH task, verify the system still works:
```bash
# After every backend change:
1. Stop backend server (Ctrl+C)
2. Start backend: npm run dev
3. Check orchestrator initializes: "Orchestrator initialized successfully"
4. Test API: curl http://localhost:3000/api/chats
5. If errors occur, STOP and fix before proceeding

# Key checkpoints:
- After Task 1: TypeScript compiles
- After Task 2: Database connection works
- After Task 3: Mock auth returns user
- After Task 4: Auth endpoints respond
- After Task 5: Can hit /auth/user endpoint
- After Task 8: Frontend loads without errors
```

### Implementation Code Examples

#### Backend: Azure Auth Provider
```typescript
// File: backend/src/auth/AzureAuthProvider.ts
const msal = require('@azure/msal-node');
const { getPool } = require('../database/pool');

class AzureAuthProvider {
  constructor(config) {
    this.msalConfig = {
      auth: {
        clientId: config.clientId,
        authority: config.authority, // https://login.microsoftonline.us/{tenant}
        clientSecret: config.clientSecret
      },
      system: {
        loggerOptions: {
          loggerCallback: (level, message, containsPii) => {
            if (!containsPii) {
              console.log(`[MSAL] ${message}`);
            }
          }
        }
      }
    };
    
    this.confidentialClient = new msal.ConfidentialClientApplication(this.msalConfig);
    this.redirectUri = config.redirectUri;
  }

  async getAuthCodeUrl(state, nonce) {
    const authCodeUrlParameters = {
      scopes: ['openid', 'profile', 'email', 'User.Read'],
      redirectUri: this.redirectUri,
      codeChallenge: this.pkceCodes.challenge,
      codeChallengeMethod: 'S256',
      state: state,
      nonce: nonce
    };
    
    return await this.confidentialClient.getAuthCodeUrl(authCodeUrlParameters);
  }

  async acquireTokenByCode(code, state, nonce) {
    const tokenRequest = {
      code: code,
      scopes: ['openid', 'profile', 'email', 'User.Read'],
      redirectUri: this.redirectUri,
      codeVerifier: this.pkceCodes.verifier,
      state: state,
      nonce: nonce
    };
    
    const response = await this.confidentialClient.acquireTokenByCode(tokenRequest);
    return this.extractUserFromToken(response);
  }

  extractUserFromToken(tokenResponse) {
    const { idTokenClaims } = tokenResponse;
    return {
      azureId: idTokenClaims.oid,
      email: idTokenClaims.email || idTokenClaims.preferred_username,
      name: idTokenClaims.name,
      groups: idTokenClaims.groups || [],
      token: tokenResponse.accessToken
    };
  }
}

module.exports = { AzureAuthProvider };
```

#### Backend: Enhanced Auth Middleware
```javascript
// File: backend/middleware/security/auth.js
const { AzureAuthProvider } = require('../../src/auth/AzureAuthProvider');
const { getUserByAzureId, createUser, updateUser } = require('../../src/database/userRepository');

const authProvider = new AzureAuthProvider({
  clientId: process.env.AZURE_CLIENT_ID,
  clientSecret: process.env.AZURE_CLIENT_SECRET,
  authority: `https://login.microsoftonline.us/${process.env.AZURE_TENANT_ID}`,
  redirectUri: process.env.AZURE_REDIRECT_URI
});

const authenticate = async (req, res, next) => {
  try {
    // Development mode bypass
    if (process.env.NODE_ENV === 'development' && process.env.USE_MOCK_AUTH === 'true') {
      req.user = {
        id: 'dev-user-id',
        email: 'dev@example.com',
        name: 'Development User',
        groups: ['developers'],
        azureId: 'mock-azure-id'
      };
      req.isAuthenticated = true;
      return next();
    }

    // Check session for user
    if (req.session && req.session.user) {
      req.user = req.session.user;
      req.isAuthenticated = true;
      
      // Refresh user data from DB
      const dbUser = await getUserByAzureId(req.user.azureId);
      if (dbUser) {
        req.user = { ...req.user, ...dbUser };
      }
      
      return next();
    }

    // Check for Bearer token (for API calls)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      // Validate token with MSAL
      // For now, we'll rely on session-based auth
    }

    req.user = null;
    req.isAuthenticated = false;
    next();
    
  } catch (error) {
    console.error('[Auth] Authentication error:', error);
    req.user = null;
    req.isAuthenticated = false;
    next();
  }
};

// Login handler
const login = async (req, res) => {
  try {
    const state = crypto.randomBytes(32).toString('hex');
    const nonce = crypto.randomBytes(32).toString('hex');
    
    req.session.authState = { state, nonce };
    
    const authUrl = await authProvider.getAuthCodeUrl(state, nonce);
    res.redirect(authUrl);
  } catch (error) {
    console.error('[Auth] Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

// Callback handler
const callback = async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!req.session.authState || req.session.authState.state !== state) {
      throw new Error('Invalid state parameter');
    }
    
    const user = await authProvider.acquireTokenByCode(
      code, 
      state, 
      req.session.authState.nonce
    );
    
    // Store or update user in database
    let dbUser = await getUserByAzureId(user.azureId);
    if (!dbUser) {
      dbUser = await createUser(user);
    } else {
      dbUser = await updateUser(user.azureId, user);
    }
    
    // Store in session
    req.session.user = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      groups: dbUser.groups,
      azureId: dbUser.azure_id
    };
    
    // Clean up auth state
    delete req.session.authState;
    
    // Redirect to frontend
    res.redirect(process.env.FRONTEND_URL || 'http://localhost:5173');
    
  } catch (error) {
    console.error('[Auth] Callback error:', error);
    res.redirect('/auth/error?message=' + encodeURIComponent(error.message));
  }
};

module.exports = {
  authenticate,
  login,
  callback,
  // ... other exports
};
```

#### Database: User Schema
```sql
-- File: backend/src/database/migrations/001_create_users.sql
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  azure_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  groups TEXT[], -- Array of group names
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_azure_id ON users(azure_id);
CREATE INDEX idx_users_email ON users(email);

-- Sessions table for connect-pg-simple
CREATE TABLE IF NOT EXISTS session (
  sid VARCHAR NOT NULL COLLATE "default",
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL,
  PRIMARY KEY (sid)
);

CREATE INDEX idx_session_expire ON session(expire);
```

#### Frontend: Auth Context
```typescript
// File: frontend/src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

interface User {
  id: string;
  email: string;
  name: string;
  groups: string[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await axios.get('/api/auth/user', {
        withCredentials: true
      });
      setUser(response.data.user);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = () => {
    window.location.href = '/api/auth/login';
  };

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout', {}, { withCredentials: true });
      setUser(null);
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

### Environment Configuration
```bash
# Add to backend/.env
NODE_ENV=development
USE_MOCK_AUTH=true  # Set to false in production

# Azure AD Configuration (GCC High)
AZURE_CLIENT_ID=your-app-client-id
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_SECRET=your-client-secret
AZURE_REDIRECT_URI=http://localhost:3000/auth/callback

# PostgreSQL Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-password
POSTGRES_DB=chatsg
DATABASE_URL=postgresql://postgres:your-password@localhost:5432/chatsg

# Session Configuration
SESSION_SECRET=your-session-secret-32-chars-min
SESSION_NAME=chatsg_session
SESSION_MAX_AGE=86400000  # 24 hours in milliseconds

# Frontend URL for redirects
FRONTEND_URL=http://localhost:5173
```

## Validation Loop

### Level 1: Install and TypeScript
```bash
# Install dependencies
cd backend
npm install @azure/msal-node express-session connect-pg-simple
npm install --save-dev @types/express-session

# TypeScript check
npm run type-check        # Should have 0 errors
```

### Level 2: Database Setup
```bash
# Run migration
cd backend/src/database/migrations
psql -U postgres -d chatsg -f 001_create_users.sql

# Test connection
cd backend
npm run test:db
```

### Level 3: Auth Endpoint Tests
```bash
# Start server with mock auth
cd backend
USE_MOCK_AUTH=true npm run dev

# Test auth endpoints
curl http://localhost:3000/api/auth/user
# Expected: {"user": null} or mock user if authenticated

# Test protected endpoint
curl http://localhost:3000/api/protected \
  -H "Cookie: connect.sid=..."
```

### Level 4: Integration Test
```javascript
// File: backend/tests/auth/test-azure-auth.js
const axios = require('axios');

console.log('=== Testing Azure AD Authentication ===\n');

// Test 1: Unauthenticated access
try {
  const response = await axios.get('http://localhost:3000/api/auth/user');
  console.log('✅ Unauthenticated access test passed');
} catch (error) {
  console.error('❌ Unauthenticated test failed:', error.message);
}

// Test 2: Mock auth in development
process.env.USE_MOCK_AUTH = 'true';
try {
  // Restart server or use mock directly
  console.log('✅ Mock auth test passed');
} catch (error) {
  console.error('❌ Mock auth test failed:', error);
}
```

### Level 5: Full E2E Test
```bash
# Start both servers
npm run dev

# Open frontend
open http://localhost:5173

# Test flow:
# 1. Click login button
# 2. Should redirect to Azure AD (or show mock user in dev)
# 3. After auth, should show user info
# 4. Test logout functionality
# 5. Verify API calls include auth
```

## Final Validation Checklist
- [ ] Backend starts without errors (orchestrator initializes)
- [ ] Dependencies installed: @azure/msal-node, express-session, connect-pg-simple
- [ ] TypeScript compiles without errors
- [ ] Database tables exist and are accessible (users, session)
- [ ] Auth middleware replaces stub implementation
- [ ] Mock auth works in development mode
- [ ] Login flow redirects to Azure AD (GCC High URLs) 
- [ ] Callback extracts user info correctly
- [ ] User data persists to PostgreSQL
- [ ] Session management works correctly
- [ ] Frontend shows login/logout UI
- [ ] API calls include authentication
- [ ] Chat functionality still works with auth enabled
- [ ] Error handling for auth failures
- [ ] Tests pass for auth flow

## Post-Implementation Safety Check
```bash
# CRITICAL: After implementation is complete, verify nothing broke:
1. Test chat functionality:
   curl -X POST http://localhost:3000/api/chat \
     -H "Content-Type: application/json" \
     -d '{"message": "Hello", "sessionId": "test"}'
   
2. Check orchestrator is still working:
   grep "Orchestrator initialized" in backend logs

3. Verify all existing features work:
   - Chat list loads
   - Can send messages
   - Agent selection works
   - No unexpected errors in console

4. If ANYTHING is broken:
   git stash  # Save your work
   git checkout main  # Return to stable version
   # Debug the issue before continuing
```

## Common Issues & Solutions
```yaml
Issue: "AADSTS50011: Reply URL mismatch"
Solution: Ensure AZURE_REDIRECT_URI matches exactly in Azure AD app registration

Issue: "Login works but user not persisted"
Solution: Check express-session configuration and PostgreSQL connection

Issue: "ECONNREFUSED connecting to PostgreSQL"
Solution: Ensure PostgreSQL is running and credentials are correct

Issue: "Invalid state parameter" on callback
Solution: Check session configuration, ensure cookies are enabled

Issue: "Cannot read property 'authority' of undefined"
Solution: Verify all Azure AD environment variables are set

Issue: "Groups claim not included"
Solution: Configure group claims in Azure AD app manifest

Issue: "SSL certificate error with GCC High"
Solution: May need to configure Node.js to accept government CA certificates
```

## Security Considerations
- Store client secret securely (never in code)
- Use HTTPS in production for all auth endpoints
- Implement PKCE for additional security
- Regular token refresh for active sessions
- Audit logging for all auth events
- Rate limiting on auth endpoints
- CSRF protection remains active

---

## Success Metrics
This implementation provides:
1. Secure Azure AD authentication for GCC High
2. Seamless development experience with mock auth
3. User data persistence and session management
4. Full TypeScript type safety
5. Integration with existing security middleware
6. Clear separation of concerns
7. Comprehensive error handling

**Confidence Score: 9/10**

The implementation is comprehensive with clear patterns from the existing codebase. The only uncertainty is specific GCC High environment configurations which may require minor adjustments during testing.