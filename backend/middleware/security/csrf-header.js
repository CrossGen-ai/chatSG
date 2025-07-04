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
      const token = generateToken();
      const sessionId = req.ip || 'anonymous';
      
      // Store token
      tokens.set(sessionId, {
        token,
        created: Date.now(),
        expires: Date.now() + (60 * 60 * 1000) // 1 hour
      });
      
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
    sessionId
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
  if (!storedToken || storedToken.token !== headerToken || storedToken.expires < Date.now()) {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: 'CSRF token validation failed',
      message: 'Invalid or expired CSRF token'
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