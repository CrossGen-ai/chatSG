// Enhanced auth middleware with Azure AD integration
const crypto = require('crypto');
const { createAuthProvider } = require('../../src/auth/mockAuth');
const { getUserByAzureId, updateLastLogin } = require('../../src/database/userRepository');

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
      res.writeHead(302, {
        'Location': process.env.FRONTEND_URL || 'http://localhost:5173'
      });
      res.end();
      return;
    }
    
    const state = crypto.randomBytes(32).toString('hex');
    const nonce = crypto.randomBytes(32).toString('hex');
    
    if (req.session) {
      req.session.authState = { state, nonce };
    }
    
    const authUrl = await authProvider.getAuthCodeUrl(state, nonce);
    
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
    
    if (error_description) {
      throw new Error(error_description);
    }
    
    if (!req.session || !req.session.authState || req.session.authState.state !== state) {
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
    res.writeHead(302, {
      'Location': process.env.FRONTEND_URL || 'http://localhost:5173'
    });
    res.end();
    
  } catch (error) {
    console.error('[Auth] Callback error:', error);
    const errorMessage = encodeURIComponent(error.message);
    res.writeHead(302, {
      'Location': `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/error?message=${errorMessage}`
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