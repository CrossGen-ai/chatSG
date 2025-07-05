/**
 * Alternative CSRF implementation for development with proxy
 * Uses response header instead of cookies for token delivery
 */

const crypto = require('crypto');

// Store tokens in memory (use Redis in production)
const tokens = new Map();

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function initialize(options = {}) {
  return (req, res, next) => {
    // For GET requests, generate and send token in response header
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      const sessionId = req.ip || 'anonymous';
      
      // Check if a valid token already exists
      const existingToken = tokens.get(sessionId);
      let token;
      
      if (existingToken && existingToken.expires > Date.now()) {
        // Use existing valid token
        token = existingToken.token;
        console.log('[CSRF-Header] Using existing token:', {
          sessionId,
          token: token.substring(0, 20) + '...',
          expiresIn: Math.floor((existingToken.expires - Date.now()) / 1000) + 's'
        });
      } else {
        // Generate new token only if needed
        token = generateToken();
        
        // Store token
        tokens.set(sessionId, {
          token,
          created: Date.now(),
          expires: Date.now() + (60 * 60 * 1000) // 1 hour
        });
        
        console.log('[CSRF-Header] Token created:', {
          sessionId,
        token: token.substring(0, 20) + '...',
        ip: req.ip,
        connectionRemoteAddress: req.connection?.remoteAddress,
        socketRemoteAddress: req.socket?.remoteAddress,
          headers: {
            'x-forwarded-for': req.headers['x-forwarded-for'],
            'x-real-ip': req.headers['x-real-ip']
          }
        });
      }
      
      // Send token in response header (accessible to JavaScript)
      res.setHeader('X-CSRF-Token', token);
      
      // Also expose the header for CORS
      const existingHeaders = res.getHeader('Access-Control-Expose-Headers');
      if (existingHeaders) {
        res.setHeader('Access-Control-Expose-Headers', `${existingHeaders}, X-CSRF-Token`);
      } else {
        res.setHeader('Access-Control-Expose-Headers', 'X-CSRF-Token');
      }
    }
    
    console.log(`[CSRF-Header] Calling next() for ${req.method} ${req.url}`);
    next();
  };
}

function verify(req, res, next) {
  // Skip verification for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  const headerToken = req.headers['x-csrf-token'];
  const sessionId = req.ip || 'anonymous';
  
  console.log('[CSRF-Header] Verification:', {
    method: req.method,
    url: req.url,
    headerToken: headerToken ? 'present' : 'missing',
    sessionId,
    tokenValue: headerToken ? headerToken.substring(0, 20) + '...' : 'none',
    storedTokenExists: tokens.has(sessionId),
    headers: {
      'x-forwarded-for': req.headers['x-forwarded-for'],
      'x-real-ip': req.headers['x-real-ip']
    }
  });
  
  if (!headerToken) {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: 'CSRF token validation failed',
      message: 'Missing X-CSRF-Token header'
    }));
    return;
  }
  
  // Verify token
  const storedToken = tokens.get(sessionId);
  
  console.log('[CSRF-Header] Token verification details:', {
    storedTokenExists: !!storedToken,
    storedToken: storedToken ? storedToken.token.substring(0, 20) + '...' : 'none',
    headerToken: headerToken.substring(0, 20) + '...',
    tokensMatch: storedToken && storedToken.token === headerToken,
    isExpired: storedToken && storedToken.expires < Date.now(),
    expiresIn: storedToken ? Math.floor((storedToken.expires - Date.now()) / 1000) + 's' : 'N/A',
    allStoredSessions: Array.from(tokens.keys())
  });
  
  if (!storedToken || storedToken.token !== headerToken || storedToken.expires < Date.now()) {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: 'CSRF token validation failed',
      message: 'Invalid or expired CSRF token',
      debug: {
        sessionId,
        hasStoredToken: !!storedToken,
        tokenExpired: storedToken && storedToken.expires < Date.now()
      }
    }));
    return;
  }
  
  next();
}

// Clean up expired tokens
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, data] of tokens.entries()) {
    if (data.expires < now) {
      tokens.delete(sessionId);
    }
  }
}, 5 * 60 * 1000); // Every 5 minutes

module.exports = {
  initialize,
  verify
};