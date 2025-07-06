# Security Quick Action Checklist

**CRITICAL - Immediate Action Required Before Production**

## 🚨 Critical Fixes (Do First - Today)

### 1. Session Secret Security
- [ ] **URGENT:** Generate cryptographically secure session secret
  ```bash
  # Generate secure secret
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  ```
- [ ] Set `SESSION_SECRET` environment variable in production
- [ ] Add startup validation to fail if secret not set
- [ ] Remove default fallback in `backend/server.js:446`

### 2. Command Injection Fix
- [ ] **URGENT:** Replace `exec('hostname -I')` in `backend/server.js:210`
  ```javascript
  // Replace with:
  const os = require('os');
  const networkInterfaces = os.networkInterfaces();
  ```
- [ ] Audit all `child_process` usage
- [ ] Remove any dynamic command execution

### 3. CSRF Origin Validation
- [ ] **URGENT:** Fix overly permissive localhost bypass
- [ ] Replace `origin.includes('localhost')` check in `backend/middleware/security/csrf.js:170`
- [ ] Implement strict origin allowlist for all environments

## 🔥 High Priority (This Week)

### 4. Dependency Vulnerabilities
- [ ] **HIGH:** Update vulnerable packages found in npm audit:
  - [ ] Update `axios` (SSRF vulnerability)
  - [ ] Update `undici` (DoS vulnerability)
  - [ ] Update `@qdrant/js-client-rest`
  - [ ] Update `mem0ai` package
- [ ] Run `npm audit fix` for non-breaking changes
- [ ] Test after updates to ensure no functionality breaks

### 5. CSRF Token Storage
- [ ] Implement Redis/database storage for CSRF tokens
- [ ] Replace `Map()` storage in `backend/middleware/security/csrf.js:4`
- [ ] Add distributed token validation
- [ ] Implement token cleanup mechanism

### 6. Authentication Rate Limiting
- [ ] Add rate limiting to `/api/auth/*` endpoints
- [ ] Implement progressive delays for failed login attempts
- [ ] Add CAPTCHA after 3 failed attempts
- [ ] Monitor authentication anomalies

### 7. Hardcoded Localhost Cleanup
- [ ] Replace 91 hardcoded localhost references with environment variables
- [ ] Update all test files to use configurable hosts
- [ ] Set production-appropriate defaults
- [ ] Review CORS configuration

## 📋 Medium Priority (Next 2 Weeks)

### 8. Debug Logging Removal
- [ ] Remove CSRF debug logging from production
- [ ] Implement conditional logging based on environment
- [ ] Sanitize sensitive data from all log outputs
- [ ] Add structured logging system

### 9. Input Validation Strengthening
- [ ] Reduce `maxMessageLength` from 10000 to reasonable limit (e.g., 2000)
- [ ] Add request body size limits at server level
- [ ] Implement memory usage monitoring
- [ ] Add payload compression limits

### 10. Security Headers Enhancement
- [ ] Add `Permissions-Policy` header
- [ ] Implement CSP with nonces
- [ ] Add `X-Content-Type-Options: nosniff`
- [ ] Enable HSTS preload

### 11. Error Handling Improvement
- [ ] Implement generic error responses for production
- [ ] Remove stack traces from client responses
- [ ] Add comprehensive server-side error logging
- [ ] Use error codes instead of descriptive messages

## ⚡ Low Priority (Next Month)

### 12. Session Security
- [ ] Implement session regeneration on privilege changes
- [ ] Add session timeout warnings
- [ ] Use secure session storage options
- [ ] Implement concurrent session limits

### 13. Security Monitoring
- [ ] Set up security event monitoring
- [ ] Implement automated vulnerability scanning
- [ ] Add real-time security alerts
- [ ] Create security incident response procedures

### 14. Testing & CI/CD
- [ ] Add security testing to CI/CD pipeline
- [ ] Implement automated OWASP ZAP scanning
- [ ] Add dependency vulnerability checks to builds
- [ ] Set up security regression testing

## Environment Configuration Checklist

### Production Environment Variables Required:
```bash
# Required for production
SESSION_SECRET=<64-character-hex-string>
CSRF_SECRET=<64-character-hex-string>
NODE_ENV=production

# Database
POSTGRES_HOST=<production-db-host>
POSTGRES_PASSWORD=<secure-password>
REDIS_URL=<redis-connection-string>

# Azure Auth
AZURE_CLIENT_SECRET=<secure-secret>
AZURE_TENANT_ID=<tenant-id>

# API Keys (if using)
AZURE_OPENAI_API_KEY=<secure-key>
```

### Security Configuration Validation:
- [ ] All secrets are environment variables (no hardcoded values)
- [ ] HTTPS enforced in production
- [ ] Secure cookie settings enabled
- [ ] Rate limiting configured appropriately
- [ ] CORS origins restricted to production domains
- [ ] Debug logging disabled
- [ ] Error messages sanitized

## Quick Verification Commands

```bash
# Check for hardcoded secrets
grep -r "secret\|password\|key" --include="*.js" backend/ | grep -v "process.env"

# Check for localhost references
grep -r "localhost\|127.0.0.1" --include="*.js" backend/ | grep -v "test"

# Audit dependencies
npm audit --audit-level=moderate

# Check environment setup
node -e "console.log('NODE_ENV:', process.env.NODE_ENV)"
node -e "console.log('Session secret set:', !!process.env.SESSION_SECRET)"
```

---

**Next Steps:**
1. Start with Critical fixes (items 1-3) immediately
2. Address High Priority items within 7 days
3. Schedule Medium Priority items for next sprint
4. Set up ongoing security monitoring

**Risk Assessment:** Until Critical and High Priority items are completed, the application should **NOT** be deployed to production.