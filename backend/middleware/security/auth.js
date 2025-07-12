// Enhanced auth middleware with Azure AD integration
const crypto = require('crypto');
const { createAuthProvider } = require('../../src/auth/mockAuth');
const { getUserByAzureId, createUser, updateUser, updateLastLogin } = require('../../src/database/userRepository');

// Initialize auth provider based on environment
const authConfig = {
  clientId: process.env.AZURE_CLIENT_ID,
  clientSecret: process.env.AZURE_CLIENT_SECRET,
  tenantId: process.env.AZURE_TENANT_ID,
  authority: `https://login.microsoftonline.us/${process.env.AZURE_TENANT_ID}`,
  redirectUri: process.env.AZURE_REDIRECT_URI || 'http://localhost:3000/api/auth/callback'
};

const authProvider = createAuthProvider(authConfig);

const authenticate = async (req, res, next) => {
  try {
    // Development mode bypass
    if (process.env.CHATSG_ENVIRONMENT === 'dev' && process.env.USE_MOCK_AUTH === 'true') {
      // Just get the existing dev user from database
      const dbUser = await getUserByAzureId('mock-azure-id');
      
      if (!dbUser) {
        console.error('[Auth] Mock user not found in database. Please ensure dev@example.com user exists.');
        req.user = null;
        req.isAuthenticated = false;
        return next();
      }
      
      // Update last login
      await updateLastLogin(dbUser.azure_id);
      
      req.user = {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        groups: dbUser.groups,
        azureId: dbUser.azure_id
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
        req.user = { 
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          groups: dbUser.groups,
          azureId: dbUser.azure_id
        };
      }
      
      return next();
    }

    // Check for Bearer token (for API calls)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      // In a full implementation, validate JWT token here
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

const authorize = (req, res, next) => {
  // Basic authorization - just check if authenticated
  if (!req.isAuthenticated) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Authentication required',
      message: 'Please authenticate to access this resource'
    }));
    return;
  }
  next();
};

const requireAuth = (req, res, next) => {
  // Middleware to require authentication for specific routes
  if (!req.isAuthenticated) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Authentication required',
      message: 'Please authenticate to access this resource'
    }));
    return;
  }
  next();
};

const requireRole = (role) => {
  return (req, res, next) => {
    // Check if user has required role
    if (!req.user || !req.user.groups || !req.user.groups.includes(role)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Insufficient permissions',
        message: 'You do not have permission to access this resource'
      }));
      return;
    }
    next();
  };
};

// Auth route handlers
const login = async (req, res) => {
  try {
    console.log('[Auth] Login initiated');
    console.log('[Auth] Session exists:', !!req.session);
    
    // Development mode bypass
    if (process.env.CHATSG_ENVIRONMENT === 'dev' && process.env.USE_MOCK_AUTH === 'true') {
      // Just get the existing dev user from database
      const dbUser = await getUserByAzureId('mock-azure-id');
      
      if (!dbUser) {
        console.error('[Auth] Mock user not found in database. Please ensure dev@example.com user exists.');
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Mock user not configured in database' }));
        return;
      }
      
      // Update last login
      await updateLastLogin(dbUser.azure_id);
      
      // In dev mode, set the user in session with real database ID
      if (req.session) {
        req.session.user = {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          groups: dbUser.groups,
          azureId: dbUser.azure_id
        };
      }
      
      // Manual redirect response
      const frontendUrl = process.env.FRONTEND_URL || req.headers.origin || 'http://localhost:5173';
      res.writeHead(302, {
        'Location': frontendUrl
      });
      res.end();
      return;
    }
    
    const state = crypto.randomBytes(32).toString('hex');
    const nonce = crypto.randomBytes(32).toString('hex');
    
    console.log('[Auth] Generated state:', state);
    console.log('[Auth] Session ID:', req.sessionID);
    console.log('[Auth] Session cookie name:', process.env.SESSION_NAME || 'chatsg_session');
    
    if (req.session) {
      req.session.authState = { state, nonce };
      console.log('[Auth] Session authState set:', { state, nonce });
      console.log('[Auth] Full session data:', JSON.stringify(req.session, null, 2));
    } else {
      console.error('[Auth] WARNING: No session object available!');
    }
    
    const authUrl = await authProvider.getAuthCodeUrl(state, nonce);
    console.log('[Auth] Auth provider:', authProvider.constructor.name);
    console.log('[Auth] Redirecting to:', authUrl);
    
    // Manual redirect response
    res.writeHead(302, {
      'Location': authUrl
    });
    res.end();
  } catch (error) {
    console.error('[Auth] Login error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Login failed', message: error.message }));
  }
};

const callback = async (req, res) => {
  try {
    const { code, state, error_description } = req.query;
    
    console.log('[Auth] Callback received');
    console.log('[Auth] Query params:', req.query);
    console.log('[Auth] State from query:', state);
    console.log('[Auth] Code present:', !!code);
    console.log('[Auth] Session ID:', req.sessionID);
    console.log('[Auth] Session exists:', !!req.session);
    console.log('[Auth] Session authState:', req.session?.authState);
    console.log('[Auth] Full session data:', req.session ? JSON.stringify(req.session, null, 2) : 'No session');
    
    if (error_description) {
      console.error('[Auth] OAuth error:', error_description);
      throw new Error(error_description);
    }
    
    if (!req.session || !req.session.authState || req.session.authState.state !== state) {
      console.error('[Auth] State validation failed:', {
        hasSession: !!req.session,
        hasAuthState: !!req.session?.authState,
        expectedState: req.session?.authState?.state,
        receivedState: state,
        sessionID: req.sessionID
      });
      throw new Error('Invalid state parameter');
    }
    
    console.log('[Auth] State validation passed');
    
    console.log('[Auth] Acquiring token with code...');
    const user = await authProvider.acquireTokenByCode(
      code, 
      state, 
      req.session.authState.nonce
    );
    console.log('[Auth] Token acquired, user info:', {
      azureId: user.azureId,
      email: user.email,
      name: user.name
    });
    
    // Store or update user in database
    console.log('[Auth] Looking up user in database...');
    let dbUser = await getUserByAzureId(user.azureId);
    if (!dbUser) {
      console.log('[Auth] User not found, creating new user...');
      dbUser = await createUser(user);
      console.log('[Auth] New user created with ID:', dbUser.id);
    } else {
      console.log('[Auth] Existing user found, updating...');
      dbUser = await updateUser(user.azureId, user);
      console.log('[Auth] User updated');
    }
    
    // Store in session
    if (req.session) {
      req.session.user = {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        groups: dbUser.groups,
        azureId: dbUser.azure_id
      };
      
      // Clean up auth state
      delete req.session.authState;
    }
    
    // Redirect to frontend
    const frontendUrl = process.env.FRONTEND_URL || req.headers.origin || 'http://localhost:5173';
    res.writeHead(302, {
      'Location': frontendUrl
    });
    res.end();
    
  } catch (error) {
    console.error('[Auth] Callback error:', error);
    const errorMessage = encodeURIComponent(error.message);
    const frontendUrl = process.env.FRONTEND_URL || req.headers.origin || 'http://localhost:5173';
    res.writeHead(302, {
      'Location': `${frontendUrl}/auth/error?message=${errorMessage}`
    });
    res.end();
  }
};

const logout = async (req, res) => {
  try {
    // Clear session
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          console.error('[Auth] Session destroy error:', err);
        }
      });
    }
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Logged out successfully' }));
  } catch (error) {
    console.error('[Auth] Logout error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Logout failed', message: error.message }));
  }
};

const getCurrentUser = (req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  if (req.isAuthenticated && req.user) {
    res.end(JSON.stringify({ 
      user: req.user,
      isAuthenticated: true 
    }));
  } else {
    res.end(JSON.stringify({ 
      user: null,
      isAuthenticated: false 
    }));
  }
};

module.exports = {
  authenticate,
  authorize,
  requireAuth,
  requireRole,
  login,
  callback,
  logout,
  getCurrentUser
};