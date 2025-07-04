# CSRF Protection Implementation for Raw Node.js Servers

## Research Summary

This document contains research findings on implementing CSRF (Cross-Site Request Forgery) protection for raw Node.js HTTP servers, based on OWASP guidelines and security best practices.

## Current Implementation Issues

1. **Server Type Mismatch**: The ChatSG backend uses `http.createServer()` (raw Node.js) but the CSRF middleware assumes Express methods
2. **Cookie Handling**: `req.cookies` and `res.cookie()` are Express-specific and don't exist in raw Node.js
3. **CSRF Currently Disabled**: Security middleware is called with `{ csrf: false }`

## Recommended Solution: Double Submit Cookie Pattern with HMAC

### Why Double Submit Cookie Pattern?

- **Stateless**: No server-side session storage required
- **Scalable**: Works well in distributed environments
- **Simple**: Easier to implement than synchronizer token pattern
- **Secure**: When combined with HMAC signing and proper validation

### Implementation Architecture

```
┌─────────────┐     GET Request      ┌─────────────┐
│   Browser   │ ──────────────────>  │   Server    │
│             │                       │             │
│             │ <── Set-Cookie: ────  │  Generate   │
│             │    csrf-token=xyz     │  HMAC Token │
└─────────────┘                       └─────────────┘
      │
      │ POST Request
      │ Headers: X-CSRF-Token: xyz
      │ Cookie: csrf-token=xyz
      ▼
┌─────────────┐                       ┌─────────────┐
│   Server    │                       │  Validate:  │
│             │ ──────────────────>   │ - Match?    │
│   Verify    │                       │ - Valid?    │
│   Token     │                       │ - Fresh?    │
└─────────────┘                       └─────────────┘
```

### Security Features

1. **HMAC Signing**: Tokens are cryptographically signed with server secret
2. **Session Binding**: Tokens bound to session ID to prevent fixation
3. **Time-based Expiry**: Tokens expire after 1 hour
4. **Origin Validation**: Additional check on Origin/Referer headers
5. **SameSite Cookies**: Prevents CSRF in modern browsers

### Complete Implementation Code

```javascript
const crypto = require('crypto');

// Configuration
const CSRF_SECRET = process.env.CSRF_SECRET || crypto.randomBytes(32).toString('hex');
const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';

// Parse cookies from raw header
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

// Generate HMAC-signed CSRF token
function generateCSRFToken(sessionId) {
  const timestamp = Date.now();
  const random = crypto.randomBytes(16).toString('hex');
  const data = `${sessionId}:${timestamp}:${random}`;
  
  const hmac = crypto.createHmac('sha256', CSRF_SECRET);
  hmac.update(data);
  const signature = hmac.digest('hex');
  
  // Token format: data.signature
  return `${Buffer.from(data).toString('base64')}.${signature}`;
}

// Verify HMAC-signed CSRF token
function verifyCSRFToken(token, sessionId) {
  if (!token) return false;
  
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  
  const [dataBase64, providedSignature] = parts;
  
  try {
    const data = Buffer.from(dataBase64, 'base64').toString();
    const [tokenSessionId, timestamp] = data.split(':');
    
    // Verify session ID matches
    if (tokenSessionId !== sessionId) return false;
    
    // Verify token hasn't expired (1 hour)
    const tokenAge = Date.now() - parseInt(timestamp);
    if (tokenAge > 3600000) return false;
    
    // Verify HMAC signature
    const hmac = crypto.createHmac('sha256', CSRF_SECRET);
    hmac.update(data);
    const expectedSignature = hmac.digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(providedSignature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    return false;
  }
}

// CSRF middleware for raw Node.js
async function csrfProtection(req, res) {
  const cookies = parseCookies(req.headers.cookie);
  
  // Skip CSRF for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    // Generate and set CSRF token for subsequent requests
    const sessionId = cookies['session-id'] || crypto.randomBytes(16).toString('hex');
    const csrfToken = generateCSRFToken(sessionId);
    
    // Set cookie with security flags
    const cookieOptions = [
      `${CSRF_COOKIE_NAME}=${csrfToken}`,
      'Path=/',
      'SameSite=Strict',
      `Max-Age=${3600}` // 1 hour
    ];
    
    if (process.env.NODE_ENV === 'production') {
      cookieOptions.push('Secure'); // HTTPS only in production
    }
    
    res.setHeader('Set-Cookie', cookieOptions.join('; '));
    return true;
  }
  
  // For state-changing requests, verify CSRF token
  const cookieToken = cookies[CSRF_COOKIE_NAME];
  const headerToken = req.headers[CSRF_HEADER_NAME];
  
  // Double submit: token must be in both cookie AND header/body
  if (!cookieToken || !headerToken) {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: 'CSRF token missing',
      message: 'Request must include CSRF token'
    }));
    return false;
  }
  
  // Tokens must match
  if (cookieToken !== headerToken) {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: 'CSRF token mismatch',
      message: 'CSRF tokens do not match'
    }));
    return false;
  }
  
  // Verify token signature and validity
  const sessionId = cookies['session-id'] || 'anonymous';
  if (!verifyCSRFToken(cookieToken, sessionId)) {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: 'Invalid CSRF token',
      message: 'CSRF token validation failed'
    }));
    return false;
  }
  
  // Additional origin validation
  const origin = req.headers.origin || req.headers.referer;
  if (origin) {
    const expectedOrigin = `${req.connection.encrypted ? 'https' : 'http'}://${req.headers.host}`;
    if (!origin.startsWith(expectedOrigin)) {
      res.statusCode = 403;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        error: 'Origin validation failed',
        message: 'Cross-origin request blocked'
      }));
      return false;
    }
  }
  
  return true;
}
```

### Frontend Integration

```javascript
// Get CSRF token from cookie
function getCSRFToken() {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'csrf-token') {
            return decodeURIComponent(value);
        }
    }
    return null;
}

// Include in API requests
async function makeAPIRequest(endpoint, data) {
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': getCSRFToken() // Include CSRF token
        },
        credentials: 'include', // Send cookies
        body: JSON.stringify(data)
    });
    
    if (response.status === 403) {
        const error = await response.json();
        if (error.error.includes('CSRF')) {
            // Handle CSRF error - maybe refresh token
            console.error('CSRF validation failed:', error);
        }
    }
    
    return response;
}
```

### Server Integration Pattern

```javascript
const server = http.createServer(async (req, res) => {
    // CORS headers (if needed)
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.statusCode = 200;
        res.end();
        return;
    }
    
    // Apply CSRF protection for API routes
    if (req.url.startsWith('/api/')) {
        const csrfValid = await csrfProtection(req, res);
        if (!csrfValid) {
            return; // Response already sent by CSRF middleware
        }
    }
    
    // Continue with route handling...
});
```

## Security Best Practices

### 1. Cookie Security Attributes

```javascript
// Development
'SameSite=Strict; Path=/; HttpOnly=false; Max-Age=3600'

// Production
'SameSite=Strict; Path=/; HttpOnly=false; Secure; Max-Age=3600'
```

- **SameSite=Strict**: Maximum CSRF protection
- **HttpOnly=false**: Required for double-submit pattern (JS needs to read)
- **Secure**: HTTPS only in production
- **Path=/**: Limit cookie scope

### 2. Token Security

- **HMAC Signing**: Prevents token tampering
- **Session Binding**: Prevents token reuse across sessions
- **Time Expiry**: Limits token lifetime
- **Cryptographic Randomness**: Uses crypto.randomBytes()

### 3. Defense in Depth

1. **Primary Defense**: Double-submit cookie pattern
2. **Secondary Defense**: Origin/Referer validation
3. **Tertiary Defense**: SameSite cookie attribute
4. **Additional**: Custom headers, user interaction

## Comparison: Implementation Patterns

| Pattern | Synchronizer Token | Double Submit | Encrypted Token |
|---------|-------------------|---------------|-----------------|
| **State** | Stateful | Stateless | Stateless |
| **Storage** | Server session | None | None |
| **Security** | Highest | High | High |
| **Complexity** | High | Medium | Medium |
| **Scalability** | Requires shared storage | Excellent | Excellent |
| **Best For** | Traditional apps | APIs/SPAs | Microservices |

## Testing Strategy

### Unit Tests
```javascript
describe('CSRF Protection', () => {
  test('should generate valid HMAC token', () => {
    const token = generateCSRFToken('session123');
    expect(token).toMatch(/^[A-Za-z0-9+/=]+\.[a-f0-9]{64}$/);
  });
  
  test('should verify valid token', () => {
    const sessionId = 'session123';
    const token = generateCSRFToken(sessionId);
    expect(verifyCSRFToken(token, sessionId)).toBe(true);
  });
  
  test('should reject expired token', () => {
    // Mock old timestamp
    const oldToken = generateOldToken();
    expect(verifyCSRFToken(oldToken, 'session123')).toBe(false);
  });
});
```

### Integration Tests
1. **Missing Token**: POST without CSRF token → 403
2. **Mismatched Tokens**: Cookie ≠ Header → 403
3. **Cross-Origin**: Different Origin header → 403
4. **Valid Request**: Matching tokens + same origin → 200
5. **Token Refresh**: GET request sets new token

## Migration Path

1. **Phase 1**: Implement cookie parsing for raw Node.js
2. **Phase 2**: Add CSRF token generation/validation
3. **Phase 3**: Update frontend to include tokens
4. **Phase 4**: Enable CSRF in security middleware
5. **Phase 5**: Monitor and adjust based on logs

## Alternative Approaches

### 1. Convert to Express
- **Pros**: Better middleware ecosystem, easier cookie handling
- **Cons**: Major refactor, additional dependency

### 2. Use Node.js Frameworks
- **Fastify**: Modern, fast, good plugin system
- **Koa**: Lightweight, async-first
- **Hapi**: Enterprise-ready, built-in security

### 3. Custom Token Storage
- **Redis**: For distributed token storage
- **JWT**: Self-contained tokens (larger size)
- **Database**: Persistent token storage

## Recommendations

1. **Immediate**: Implement double-submit pattern for current raw Node.js server
2. **Short-term**: Add comprehensive CSRF tests
3. **Medium-term**: Consider Express migration for better middleware support
4. **Long-term**: Implement additional security layers (rate limiting, WAF)

## References

- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [MDN: SameSite Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [NIST SP 800-63B: Authentication Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)