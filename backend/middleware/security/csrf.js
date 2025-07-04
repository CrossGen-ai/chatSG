const crypto = require('crypto');

// Store CSRF tokens (in production, use Redis or similar)
const csrfTokens = new Map();

// CSRF configuration
const CSRF_SECRET = process.env.CSRF_SECRET || crypto.randomBytes(32).toString('hex');
const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';

// Generate a secure random token
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Parse cookies from raw header (for raw Node.js)
function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  
  cookieHeader.split(';').forEach(cookie => {
    const [name, ...rest] = cookie.trim().split('=');
    if (name && rest.length > 0) {
      cookies[name] = decodeURIComponent(rest.join('='));
    }
  });
  
  return cookies;
}

// Initialize CSRF protection
function initialize(options) {
  return (req, res, next) => {
    // Skip CSRF token generation for non-GET requests
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }
    
    // Parse existing cookies
    const cookies = req.cookies || parseCookies(req.headers.cookie);
    
    // Check if token already exists
    const existingToken = cookies[CSRF_COOKIE_NAME];
    if (existingToken) {
      // Token already set, continue
      if (res.locals) {
        res.locals.csrfToken = existingToken;
      }
      return next();
    }
    
    // Generate new CSRF token
    const token = generateToken();
    const sessionId = req.sessionID || req.ip || 'anonymous';
    
    // Store token server-side for additional validation
    csrfTokens.set(sessionId, {
      token,
      created: Date.now(),
      expires: Date.now() + (60 * 60 * 1000) // 1 hour
    });
    
    // Clean up expired tokens periodically
    if (Math.random() < 0.01) { // 1% chance
      cleanupExpiredTokens();
    }
    
    // Set CSRF cookie (double submit cookie pattern)
    const cookieOptions = [
      `${CSRF_COOKIE_NAME}=${token}`,
      'Path=/',
      // Use Lax for development to work with proxy
      `SameSite=${process.env.NODE_ENV === 'production' ? (options.cookie.sameSite || 'Strict') : 'Lax'}`,
      `Max-Age=${60 * 60}` // 1 hour in seconds
    ];
    
    // HttpOnly=false so JavaScript can read it for double-submit
    if (options.cookie.secure || process.env.NODE_ENV === 'production') {
      cookieOptions.push('Secure');
    }
    
    // Set the cookie
    const existingSetCookie = res.getHeader('Set-Cookie');
    const newCookies = existingSetCookie 
      ? (Array.isArray(existingSetCookie) ? [...existingSetCookie, cookieOptions.join('; ')] : [existingSetCookie, cookieOptions.join('; ')])
      : cookieOptions.join('; ');
    
    res.setHeader('Set-Cookie', newCookies);
    
    // Make token available to response
    if (res.locals) {
      res.locals.csrfToken = token;
    }
    
    next();
  };
}

// Verify CSRF token
function verify(req, res, next) {
  // Skip verification for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  // Parse cookies if not already parsed
  const cookies = req.cookies || parseCookies(req.headers.cookie);
  
  // Get token from header or body
  const headerToken = req.headers[CSRF_HEADER_NAME] || req.headers['csrf-token'];
  const bodyToken = req.body?._csrf || req.body?.csrfToken;
  const cookieToken = cookies[CSRF_COOKIE_NAME];
  
  const providedToken = headerToken || bodyToken;
  
  // Debug logging (always log for now to debug issue)
  console.log('[CSRF] Verification:', {
    method: req.method,
    url: req.url,
    headerToken: headerToken ? 'present' : 'missing',
    headerValue: headerToken ? headerToken.substring(0, 20) + '...' : 'none',
    cookieToken: cookieToken ? 'present' : 'missing',
    cookieValue: cookieToken ? cookieToken.substring(0, 20) + '...' : 'none',
    tokensMatch: providedToken === cookieToken,
    cookies: Object.keys(cookies)
  });
  
  // Verify double submit cookie pattern
  if (!providedToken || !cookieToken) {
    if (res.status && res.json) {
      return res.status(403).json({
        error: 'CSRF token validation failed',
        message: 'Missing CSRF token. Include X-CSRF-Token header with the token from csrf-token cookie.'
      });
    } else {
      // Raw Node.js response
      res.statusCode = 403;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        error: 'CSRF token validation failed',
        message: 'Missing CSRF token. Include X-CSRF-Token header with the token from csrf-token cookie.'
      }));
      return;
    }
  }
  
  // Tokens must match exactly
  if (providedToken !== cookieToken) {
    if (res.status && res.json) {
      return res.status(403).json({
        error: 'CSRF token validation failed',
        message: 'CSRF token mismatch'
      });
    } else {
      res.statusCode = 403;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        error: 'CSRF token validation failed',
        message: 'CSRF token mismatch'
      }));
      return;
    }
  }
  
  // Additional origin validation
  const origin = req.headers.origin || req.headers.referer;
  if (origin) {
    const protocol = req.connection.encrypted ? 'https' : 'http';
    const expectedOrigin = `${protocol}://${req.headers.host}`;
    
    // Allow localhost variations in development
    const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('::1');
    const isValidOrigin = origin.startsWith(expectedOrigin) || (process.env.NODE_ENV !== 'production' && isLocalhost);
    
    if (!isValidOrigin) {
      if (res.status && res.json) {
        return res.status(403).json({
          error: 'Origin validation failed',
          message: 'Cross-origin request blocked'
        });
      } else {
        res.statusCode = 403;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          error: 'Origin validation failed',
          message: 'Cross-origin request blocked'
        }));
        return;
      }
    }
  }
  
  next();
}

// Clean up expired tokens
function cleanupExpiredTokens() {
  const now = Date.now();
  for (const [sessionId, data] of csrfTokens.entries()) {
    if (data.expires < now) {
      csrfTokens.delete(sessionId);
    }
  }
}

// Get current CSRF token for a session
function getToken(req, res) {
  const cookies = req.cookies || parseCookies(req.headers.cookie);
  const sessionId = req.sessionID || req.ip || cookies['session-id'] || 'anonymous';
  
  // Check for existing token in cookie first
  const existingToken = cookies[CSRF_COOKIE_NAME];
  if (existingToken) {
    return existingToken;
  }
  
  // Check server-side storage
  const tokenData = csrfTokens.get(sessionId);
  
  if (!tokenData || tokenData.expires < Date.now()) {
    // Generate new token
    const token = generateToken();
    csrfTokens.set(sessionId, {
      token,
      created: Date.now(),
      expires: Date.now() + (60 * 60 * 1000)
    });
    
    // Set cookie (not httpOnly so JS can read it for double-submit pattern)
    const cookieOptions = [
      `${CSRF_COOKIE_NAME}=${token}`,
      'Path=/',
      // Use Lax for development to work with proxy
      `SameSite=${process.env.NODE_ENV === 'production' ? 'Strict' : 'Lax'}`,
      `Max-Age=${60 * 60}` // 1 hour in seconds
    ];
    
    if (process.env.NODE_ENV === 'production') {
      cookieOptions.push('Secure');
    }
    
    // Set the cookie
    const existingSetCookie = res.getHeader('Set-Cookie');
    const newCookies = existingSetCookie 
      ? (Array.isArray(existingSetCookie) ? [...existingSetCookie, cookieOptions.join('; ')] : [existingSetCookie, cookieOptions.join('; ')])
      : cookieOptions.join('; ');
    
    res.setHeader('Set-Cookie', newCookies);
    
    return token;
  }
  
  return tokenData.token;
}

module.exports = {
  initialize,
  verify,
  getToken,
  generateToken
};