/**
 * Authentication Configuration
 * Supports both commercial and GCC High environments
 */

const isGCCHigh = process.env.AZURE_ENVIRONMENT === 'GCCHIGH';
const tenantId = process.env.AZURE_TENANT_ID;

module.exports = {
  // Azure AD Configuration
  azure: {
    clientId: process.env.AZURE_CLIENT_ID,
    clientSecret: process.env.AZURE_CLIENT_SECRET,
    tenantId: tenantId,
    
    // Authority URLs
    authority: isGCCHigh 
      ? `https://login.microsoftonline.us/${tenantId}`  // GCC High
      : `https://login.microsoftonline.com/${tenantId}`, // Commercial
    
    // Graph API endpoints
    graphEndpoint: isGCCHigh
      ? 'https://graph.microsoft.us'  // GCC High
      : 'https://graph.microsoft.com', // Commercial
    
    // Redirect URI
    redirectUri: process.env.AZURE_REDIRECT_URI || 'http://localhost:3000/api/auth/callback',
    
    // Scopes
    scopes: ['openid', 'profile', 'email', 'User.Read'],
    
    // Response type
    responseType: 'code',
    responseMode: 'query',
    
    // PKCE enabled for enhanced security
    usePKCE: true,
    
    // Session configuration
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    
    // Token cache (in production, use Redis)
    cacheLocation: 'session',
    storeAuthStateInCookie: false
  },
  
  // Mock Auth Configuration (Development)
  mockAuth: {
    enabled: process.env.USE_MOCK_AUTH === 'true',
    defaultUser: {
      azureId: 'mock-azure-id',
      email: 'dev@example.com',
      name: 'Development User',
      groups: ['developers', 'chatsg-users']
    }
  },
  
  // Session Configuration
  session: {
    secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
    name: process.env.SESSION_NAME || 'chatsg.sid',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: parseInt(process.env.SESSION_MAX_AGE) || 24 * 60 * 60 * 1000 // 24 hours
    },
    // Production: Use Redis or PostgreSQL session store
    store: process.env.NODE_ENV === 'production' ? 'postgresql' : 'memory'
  },
  
  // FIPS 140-2 Compliance (for GCC High)
  crypto: {
    // Use FIPS-compliant algorithms
    algorithm: 'aes-256-gcm',
    hashAlgorithm: 'sha256',
    useFIPS: isGCCHigh
  },
  
  // Audit Configuration
  audit: {
    enabled: process.env.AUDIT_LOG_ENABLED === 'true',
    logPath: process.env.AUDIT_LOG_PATH || '/var/log/chatsg/audit.log',
    events: [
      'login',
      'logout',
      'tokenRefresh',
      'authFailure',
      'accessDenied'
    ]
  },
  
  // Security Headers
  security: {
    // CSP for GCC High
    contentSecurityPolicy: isGCCHigh ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://login.microsoftonline.us", "https://graph.microsoft.us"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      }
    } : null
  }
};

// Helper function to get auth config
module.exports.getAuthConfig = function() {
  const config = module.exports;
  
  // Log configuration (without secrets)
  console.log('[Auth Config] Environment:', isGCCHigh ? 'GCC High' : 'Commercial');
  console.log('[Auth Config] Authority:', config.azure.authority);
  console.log('[Auth Config] Graph Endpoint:', config.azure.graphEndpoint);
  console.log('[Auth Config] Mock Auth:', config.mockAuth.enabled);
  
  return config;
};