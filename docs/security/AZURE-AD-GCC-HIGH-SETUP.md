# Azure AD GCC High Setup Guide for ChatSG

## Overview
This guide provides step-by-step instructions for configuring Azure Active Directory (Azure AD) authentication in the GCC High environment for ChatSG. GCC High is a specialized Microsoft cloud environment designed for U.S. government contractors and agencies handling Controlled Unclassified Information (CUI).

## Prerequisites

### 1. GCC High Tenant Access
- Organization must have a GCC High tenant
- Admin access to Azure portal (https://portal.azure.us)
- Global Administrator or Application Administrator role

### 2. Required Information
- GCC High Tenant ID
- Organization's verified domain
- Redirect URIs for your application

### 3. Development Environment
- Node.js 18+ installed
- PostgreSQL database running
- SSL certificates for HTTPS (production)

## Key Differences: GCC High vs Commercial Azure

| Component | Commercial Azure | GCC High |
|-----------|-----------------|----------|
| Portal URL | portal.azure.com | portal.azure.us |
| Login Authority | login.microsoftonline.com | login.microsoftonline.us |
| Graph API | graph.microsoft.com | graph.microsoft.us |
| Discovery Endpoint | /v2.0/.well-known/openid-configuration | /v2.0/.well-known/openid-configuration |

## Step 1: Azure Portal Configuration

### 1.1 Access GCC High Portal
1. Navigate to https://portal.azure.us (NOT portal.azure.com)
2. Sign in with your GCC High credentials
3. Ensure you're in the correct tenant (check top-right corner)

### 1.2 Register Application
1. Go to **Azure Active Directory** → **App registrations**
2. Click **New registration**
3. Configure application:
   ```
   Name: ChatSG
   Supported account types: Accounts in this organizational directory only
   Redirect URI: 
     - Type: Web
     - URI: https://your-domain.gov/auth/callback
   ```
4. Click **Register**

### 1.3 Configure Authentication
1. In your app registration, go to **Authentication**
2. Add platform configurations:
   ```
   Web platform:
   - Redirect URIs:
     - https://your-domain.gov/auth/callback (production)
     - http://localhost:3000/auth/callback (development)
   - Logout URL: https://your-domain.gov/logout
   - Implicit grant: 
     ☐ Access tokens
     ☐ ID tokens (leave unchecked for security)
   ```
3. Under **Advanced settings**:
   - Allow public client flows: **No**
4. Save changes

### 1.4 Configure API Permissions
1. Go to **API permissions**
2. Click **Add a permission**
3. Select **Microsoft Graph**
4. Choose **Delegated permissions**
5. Add these permissions:
   ```
   - openid (Sign users in)
   - profile (View users' basic profile)
   - email (View users' email address)
   - User.Read (Sign in and read user profile)
   - Group.Read.All (Read all groups) - if using group-based access
   ```
6. Click **Grant admin consent** (requires admin privileges)

### 1.5 Create Client Secret
1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Configure:
   ```
   Description: ChatSG Production Secret
   Expires: 24 months (or per your security policy)
   ```
4. Click **Add**
5. **IMPORTANT**: Copy the secret value immediately (it won't be shown again)

### 1.6 Configure Token Settings
1. Go to **Token configuration**
2. Add optional claims for ID token:
   - email
   - family_name
   - given_name
   - groups (if using group-based access)
3. For groups claim:
   - Click **Add groups claim**
   - Select: Security groups
   - Customize token properties: Group ID

### 1.7 Note Important Values
Copy these values for application configuration:
```
Application (client) ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
Directory (tenant) ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
Client Secret: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Step 2: Application Configuration

### 2.1 Environment Variables
Create/update `.env` file in backend:
```bash
# Azure AD Configuration (GCC High)
AZURE_CLIENT_ID=your-application-client-id
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_SECRET=your-client-secret
AZURE_REDIRECT_URI=http://localhost:3000/auth/callback

# GCC High Specific
AZURE_CLOUD=USGovernment
AZURE_AUTHORITY_HOST=https://login.microsoftonline.us
AZURE_GRAPH_ENDPOINT=https://graph.microsoft.us

# Session Configuration
SESSION_SECRET=generate-32-char-random-string
SESSION_NAME=chatsg_session
SESSION_MAX_AGE=86400000

# PostgreSQL Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/chatsg

# Development
NODE_ENV=development
USE_MOCK_AUTH=false  # Set to true for mock auth
```

### 2.2 MSAL Configuration
Backend configuration (`backend/src/auth/AzureAuthProvider.ts`):
```javascript
const msalConfig = {
  auth: {
    clientId: process.env.AZURE_CLIENT_ID,
    authority: `https://login.microsoftonline.us/${process.env.AZURE_TENANT_ID}`,
    clientSecret: process.env.AZURE_CLIENT_SECRET,
    knownAuthorities: ['login.microsoftonline.us']
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (!containsPii) {
          console.log(`[MSAL ${level}] ${message}`);
        }
      },
      piiLoggingEnabled: false,
      logLevel: 'Info'
    }
  }
};
```

### 2.3 Frontend Configuration
Frontend MSAL config (`frontend/src/config/authConfig.ts`):
```javascript
export const msalConfig = {
  auth: {
    clientId: process.env.REACT_APP_AZURE_CLIENT_ID,
    authority: `https://login.microsoftonline.us/${process.env.REACT_APP_AZURE_TENANT_ID}`,
    redirectUri: window.location.origin + '/auth/callback',
    postLogoutRedirectUri: window.location.origin,
    navigateToLoginRequestUrl: true
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false
  }
};

export const loginRequest = {
  scopes: ['openid', 'profile', 'email', 'User.Read']
};

export const graphConfig = {
  graphMeEndpoint: 'https://graph.microsoft.us/v1.0/me'
};
```

## Step 3: Implementation Code

### 3.1 Install Dependencies
```bash
# Backend
cd backend
npm install @azure/msal-node express-session connect-pg-simple

# Frontend
cd frontend
npm install @azure/msal-browser @azure/msal-react
```

### 3.2 Backend Auth Implementation
Key implementation file: `backend/middleware/security/auth.js`
```javascript
const msal = require('@azure/msal-node');
const { msalConfig } = require('../../config/auth.config');

// Create MSAL application instance
const cca = new msal.ConfidentialClientApplication(msalConfig);

// Auth endpoints
const login = async (req, res) => {
  const authCodeUrlParameters = {
    scopes: ['openid', 'profile', 'email', 'User.Read'],
    redirectUri: process.env.AZURE_REDIRECT_URI,
    responseMode: 'query',
    prompt: 'select_account'
  };

  try {
    const authUrl = await cca.getAuthCodeUrl(authCodeUrlParameters);
    res.redirect(authUrl);
  } catch (error) {
    console.error('[Auth] Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

const callback = async (req, res) => {
  const tokenRequest = {
    code: req.query.code,
    scopes: ['openid', 'profile', 'email', 'User.Read'],
    redirectUri: process.env.AZURE_REDIRECT_URI
  };

  try {
    const response = await cca.acquireTokenByCode(tokenRequest);
    
    // Extract user info
    const user = {
      azureId: response.account.homeAccountId,
      email: response.account.username,
      name: response.account.name,
      groups: response.idTokenClaims.groups || []
    };
    
    // Store in session
    req.session.user = user;
    req.session.accessToken = response.accessToken;
    
    res.redirect(process.env.FRONTEND_URL || 'http://localhost:5173');
  } catch (error) {
    console.error('[Auth] Callback error:', error);
    res.redirect('/auth/error');
  }
};
```

### 3.3 Frontend Auth Implementation
```typescript
// frontend/src/App.tsx
import { MsalProvider } from '@azure/msal-react';
import { PublicClientApplication } from '@azure/msal-browser';
import { msalConfig } from './config/authConfig';

const msalInstance = new PublicClientApplication(msalConfig);

function App() {
  return (
    <MsalProvider instance={msalInstance}>
      <AuthenticatedApp />
    </MsalProvider>
  );
}

// frontend/src/hooks/useAuth.ts
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../config/authConfig';

export const useAuth = () => {
  const { instance, accounts } = useMsal();
  
  const login = () => {
    instance.loginRedirect(loginRequest);
  };
  
  const logout = () => {
    instance.logoutRedirect({
      postLogoutRedirectUri: '/'
    });
  };
  
  return {
    isAuthenticated: accounts.length > 0,
    user: accounts[0],
    login,
    logout
  };
};
```

## Step 4: Testing and Validation

### 4.1 Local Development Testing
1. Start PostgreSQL database
2. Run database migrations
3. Start backend server:
   ```bash
   cd backend
   npm run dev
   ```
4. Start frontend:
   ```bash
   cd frontend
   npm start
   ```

### 4.2 Test Authentication Flow
1. Navigate to http://localhost:5173
2. Click "Login with Azure AD"
3. Should redirect to: https://login.microsoftonline.us/...
4. Enter GCC High credentials
5. Grant consent if prompted
6. Should redirect back to application
7. Verify user info displayed

### 4.3 Verify Endpoints
Test these endpoints:
```bash
# Get current user
curl http://localhost:3000/api/auth/user -H "Cookie: [session-cookie]"

# Test protected endpoint
curl http://localhost:3000/api/chats -H "Cookie: [session-cookie]"

# Logout
curl -X POST http://localhost:3000/api/auth/logout -H "Cookie: [session-cookie]"
```

### 4.4 Common Issues and Solutions

#### Issue: AADSTS900439 Error
**Error**: "USGClientNotSupportedOnPublicEndpoint"
**Solution**: Ensure using https://login.microsoftonline.us not .com

#### Issue: AADSTS50011 Error  
**Error**: "Reply URL mismatch"
**Solution**: Verify redirect URI matches exactly in Azure AD app registration

#### Issue: Groups not included in token
**Solution**: 
1. Configure groups claim in Token configuration
2. May need to use Graph API to fetch groups if > 200 groups

#### Issue: SSL Certificate errors
**Solution**: For GCC High, may need to configure Node.js to trust government CA:
```javascript
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0; // Development only!
```

## Step 5: Production Deployment

### 5.1 Update Configuration
1. Update redirect URIs in Azure AD to production URLs
2. Update environment variables for production
3. Use secure session configuration
4. Enable HTTPS

### 5.2 Security Checklist
- [ ] Client secret stored securely (Key Vault recommended)
- [ ] HTTPS enabled for all endpoints
- [ ] Session cookies marked as secure, httpOnly, sameSite
- [ ] CSRF protection enabled
- [ ] Rate limiting on auth endpoints
- [ ] Audit logging enabled
- [ ] Token expiration configured appropriately

### 5.3 Monitoring
Monitor these metrics:
- Failed login attempts
- Token refresh failures
- Session expiration events
- Unauthorized access attempts

## Step 6: Group-Based Access Control (Optional)

### 6.1 Configure Groups in Azure AD
1. Create security groups in Azure AD
2. Assign users to appropriate groups
3. Note group Object IDs

### 6.2 Implement Group Checking
```javascript
const authorize = (requiredGroups) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const userGroups = req.user.groups || [];
    const hasAccess = requiredGroups.some(group => userGroups.includes(group));
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    next();
  };
};

// Usage
app.get('/api/admin', authorize(['admin-group-id']), (req, res) => {
  // Admin only endpoint
});
```

## Appendix: Useful Commands and Scripts

### Generate Session Secret
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Test Azure AD Connectivity
```javascript
// test-azure-connection.js
const msal = require('@azure/msal-node');

const config = {
  auth: {
    clientId: process.env.AZURE_CLIENT_ID,
    authority: `https://login.microsoftonline.us/${process.env.AZURE_TENANT_ID}`,
    clientSecret: process.env.AZURE_CLIENT_SECRET
  }
};

const cca = new msal.ConfidentialClientApplication(config);

async function testConnection() {
  try {
    const result = await cca.getAuthCodeUrl({
      scopes: ['openid'],
      redirectUri: 'http://localhost:3000/auth/callback'
    });
    console.log('✅ Successfully connected to Azure AD GCC High');
    console.log('Auth URL:', result);
  } catch (error) {
    console.error('❌ Failed to connect:', error);
  }
}

testConnection();
```

## Support Resources

- [Azure Government Documentation](https://docs.microsoft.com/en-us/azure/azure-government/)
- [MSAL.js Documentation](https://github.com/AzureAD/microsoft-authentication-library-for-js)
- [Microsoft Graph API for GCC High](https://docs.microsoft.com/en-us/graph/deployments)
- [Azure Government Portal](https://portal.azure.us)

## Conclusion

This guide provides comprehensive steps for implementing Azure AD authentication in GCC High environments. Always test thoroughly in development before deploying to production, and ensure compliance with your organization's security policies.