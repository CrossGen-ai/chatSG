# Security Configuration Guide

## Overview
This guide documents the security configuration and best practices for the ChatSG application.

## Security Features

### 1. CSRF Protection
- **Implementation**: Header-based tokens (X-CSRF-Token)
- **Configuration**: `/backend/middleware/security/csrf-header.js`
- **Usage**:
  - Tokens are generated on GET requests
  - Must be included in all POST/PATCH/DELETE requests
  - SSE endpoints pass token via query parameter

### 2. Rate Limiting
- **IP-based limiting**: 100 requests per 15 minutes
- **Connection-based limiting**: For SSE endpoints
- **Configuration**: `/backend/config/security.config.js`
```javascript
rateLimit: {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP'
}
```

### 3. Security Headers (Helmet.js)
- Content Security Policy (CSP)
- Strict-Transport-Security (HSTS)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: same-origin

### 4. Input Validation
- Message length validation (max 10,000 characters)
- Session ID format validation
- Content sanitization with DOMPurify
- XSS prevention at multiple layers

### 5. SSE Security
- Special security handling for streaming endpoints
- Connection-based rate limiting
- CSRF token passed via query parameters
- Proper cleanup on connection close

## Configuration Files

### `/backend/config/security.config.js`
Main security configuration:
```javascript
module.exports = {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token']
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 100
  },
  validation: {
    maxMessageLength: 10000
  }
};
```

### Environment Variables
```bash
# CORS configuration
CORS_ORIGIN=http://localhost:5173

# Security settings
NODE_ENV=production  # Enables stricter security in production
USE_HTTPS=true       # Enable HTTPS in production

# Rate limiting (optional overrides)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

## Testing Security

### Run All Security Tests
```bash
npm run test:security
```

### Test Specific Components
```bash
# CSRF protection
node backend/tests/security/csrf.test.js

# Rate limiting
node backend/tests/security/rate-limit-simple.test.js

# SSE security
node backend/tests/test-sse-done.js
```

### Security Test Report
After running tests, check:
- `/backend/tests/SECURITY_TEST_REPORT.md`

## Best Practices

### 1. Never Disable Security in Production
```javascript
// ❌ Bad
if (process.env.NODE_ENV === 'production') {
  app.use(securityMiddleware);
}

// ✅ Good
app.use(securityMiddleware); // Always enabled
```

### 2. Keep Dependencies Updated
```bash
# Check for security vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix
```

### 3. Use Environment Variables for Secrets
```bash
# ❌ Bad - hardcoded secrets
const apiKey = 'sk-1234567890';

# ✅ Good - environment variables
const apiKey = process.env.OPENAI_API_KEY;
```

### 4. Validate All User Input
```javascript
// ✅ Always validate
if (!sessionId || !/^[a-zA-Z0-9_-]+$/.test(sessionId)) {
  return res.status(400).json({ error: 'Invalid session ID' });
}
```

### 5. Log Security Events
```javascript
console.log('[Security] Failed CSRF validation:', {
  ip: req.ip,
  url: req.url,
  timestamp: new Date().toISOString()
});
```

## Troubleshooting

### CSRF Token Issues
1. Check browser network tab for X-CSRF-Token header
2. Ensure token is fetched before making requests
3. Verify CORS is configured correctly

### Rate Limiting Too Strict
1. Adjust limits in `security.config.js`
2. Consider implementing user-based limits
3. Add whitelist for trusted IPs

### SSE Connection Issues
1. Check if CSRF token is in query parameters
2. Verify connection-based rate limiting
3. Check for proper error handling

## Security Checklist

Before deployment:
- [ ] Run `npm run test:security` - all tests pass
- [ ] Enable HTTPS in production
- [ ] Set secure environment variables
- [ ] Review rate limiting thresholds
- [ ] Test CSRF protection
- [ ] Verify XSS prevention
- [ ] Check security headers
- [ ] Review error messages (don't leak sensitive info)
- [ ] Enable audit logging
- [ ] Plan for security updates