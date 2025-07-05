# Security Regression Test Documentation

## Overview
This document defines comprehensive regression tests to prevent security-related issues from reoccurring, especially those related to user authentication, CSRF protection, and SSE streaming.

## Critical Test Areas

### 1. Authentication Tests
Tests to ensure authentication functionality remains intact and secure.

#### 1.1 Mock Authentication Test
**Purpose**: Verify mock auth works in development mode
**Regression Prevention**: Ensures development workflow isn't broken

```javascript
// Test: Mock auth returns correct user
describe('Mock Authentication', () => {
  beforeEach(() => {
    process.env.USE_MOCK_AUTH = 'true';
    process.env.NODE_ENV = 'development';
  });

  it('should authenticate mock user', async () => {
    const req = { session: {} };
    const res = {};
    const next = jest.fn();
    
    await authenticate(req, res, next);
    
    expect(req.isAuthenticated).toBe(true);
    expect(req.user).toMatchObject({
      email: 'dev@example.com',
      name: 'Development User',
      groups: ['developers']
    });
    expect(next).toHaveBeenCalled();
  });

  it('should not use mock auth in production', async () => {
    process.env.NODE_ENV = 'production';
    const req = { session: {} };
    
    await authenticate(req, res, next);
    
    expect(req.isAuthenticated).toBe(false);
    expect(req.user).toBeNull();
  });
});
```

#### 1.2 User Session Test
**Purpose**: Verify session management works correctly
**Regression Prevention**: Ensures users stay logged in properly

```javascript
// Test: Session persistence
it('should persist user in session', async () => {
  const user = {
    id: 1,
    email: 'test@example.com',
    azureId: 'test-azure-id'
  };
  
  const req = {
    session: { user }
  };
  
  await authenticate(req, res, next);
  
  expect(req.user).toEqual(user);
  expect(req.isAuthenticated).toBe(true);
});
```

#### 1.3 User-Specific Chat Filtering
**Purpose**: Verify users only see their own chats
**Regression Prevention**: Prevents data leakage between users

```javascript
// Test: Chat filtering by user
it('should filter chats by authenticated user', async () => {
  const userId = '2';
  const req = {
    user: { id: userId },
    isAuthenticated: true
  };
  
  const chats = await getChatsByUser(userId);
  
  expect(chats.every(chat => chat.userId === userId)).toBe(true);
});
```

### 2. CSRF Protection Tests

#### 2.1 CSRF Token Generation Test
**Purpose**: Verify tokens are generated correctly
**Regression Prevention**: Ensures CSRF protection remains active

```javascript
// Test: CSRF token generation
describe('CSRF Token Generation', () => {
  it('should generate token on GET request', async () => {
    const res = await request(app)
      .get('/api/config/security')
      .expect(200);
    
    expect(res.headers['x-csrf-token']).toBeDefined();
    expect(res.headers['x-csrf-token'].length).toBe(64);
  });
});
```

#### 2.2 CSRF Token Reuse Test
**Purpose**: Verify tokens are reused properly
**Regression Prevention**: Prevents token mismatch errors

```javascript
// Test: CSRF token reuse
it('should reuse existing valid token', async () => {
  // First request
  const res1 = await request(app)
    .get('/api/config/security');
  const token1 = res1.headers['x-csrf-token'];
  
  // Second request
  const res2 = await request(app)
    .get('/api/config/markdown');
  const token2 = res2.headers['x-csrf-token'];
  
  expect(token1).toBe(token2);
});
```

#### 2.3 CSRF Token Validation Test
**Purpose**: Verify POST requests require valid tokens
**Regression Prevention**: Ensures state-changing operations are protected

```javascript
// Test: CSRF validation on POST
it('should reject POST without CSRF token', async () => {
  await request(app)
    .post('/api/chats')
    .send({ title: 'Test' })
    .expect(403);
});

it('should accept POST with valid CSRF token', async () => {
  const getRes = await request(app).get('/api/config/security');
  const token = getRes.headers['x-csrf-token'];
  
  await request(app)
    .post('/api/chats')
    .set('X-CSRF-Token', token)
    .send({ title: 'Test' })
    .expect(201);
});
```

### 3. Body Parsing Tests

#### 3.1 POST Body Parsing Test
**Purpose**: Verify request bodies are parsed correctly
**Regression Prevention**: Prevents timeout issues from double parsing

```javascript
// Test: Body parsing doesn't cause timeout
it('should parse POST body without timeout', async () => {
  const start = Date.now();
  
  await request(app)
    .post('/api/chat')
    .send({ message: 'Test message', sessionId: 'test' })
    .timeout(5000)
    .expect(200);
  
  const duration = Date.now() - start;
  expect(duration).toBeLessThan(1000); // Should complete quickly
});
```

#### 3.2 Large Body Test
**Purpose**: Verify large payloads are handled
**Regression Prevention**: Ensures body size limits work

```javascript
// Test: Large body handling
it('should handle large message bodies', async () => {
  const largeMessage = 'x'.repeat(10000);
  
  await request(app)
    .post('/api/chat')
    .send({ message: largeMessage, sessionId: 'test' })
    .expect(200);
});
```

### 4. SSE Streaming Tests

#### 4.1 SSE Authentication Test
**Purpose**: Verify SSE endpoint respects authentication
**Regression Prevention**: Ensures streaming is secure

```javascript
// Test: SSE requires authentication
it('should require authentication for SSE', async () => {
  await request(app)
    .post('/api/chat/stream')
    .send({ message: 'Test' })
    .expect(401);
});
```

#### 4.2 SSE CSRF Test
**Purpose**: Verify SSE endpoint validates CSRF tokens
**Regression Prevention**: Prevents CSRF attacks on streaming

```javascript
// Test: SSE CSRF validation
it('should validate CSRF token for SSE', async () => {
  // Get CSRF token
  const tokenRes = await request(app).get('/api/config/security');
  const token = tokenRes.headers['x-csrf-token'];
  
  // Test SSE with token
  const response = await request(app)
    .post('/api/chat/stream')
    .set('X-CSRF-Token', token)
    .set('Accept', 'text/event-stream')
    .send({ message: 'Test', sessionId: 'test' })
    .expect(200);
  
  expect(response.headers['content-type']).toBe('text/event-stream');
});
```

#### 4.3 SSE Data Flow Test
**Purpose**: Verify SSE streams data correctly
**Regression Prevention**: Ensures streaming functionality works

```javascript
// Test: SSE data streaming
it('should stream data through SSE', (done) => {
  const events = [];
  
  request(app)
    .post('/api/chat/stream')
    .set('X-CSRF-Token', validToken)
    .send({ message: 'Hello', sessionId: 'test' })
    .buffer(false)
    .parse((res, callback) => {
      res.on('data', (chunk) => {
        const lines = chunk.toString().split('\n');
        lines.forEach(line => {
          if (line.startsWith('event:')) {
            events.push(line.substring(7).trim());
          }
        });
      });
      res.on('end', () => {
        expect(events).toContain('connected');
        expect(events).toContain('start');
        expect(events).toContain('token');
        expect(events).toContain('done');
        done();
      });
    })
    .end();
});
```

### 5. Input Sanitization Tests

#### 5.1 DOMPurify Test
**Purpose**: Verify input sanitization works correctly
**Regression Prevention**: Prevents XSS and title corruption

```javascript
// Test: DOMPurify sanitization
it('should sanitize input correctly', () => {
  const inputs = [
    { input: '<script>alert("xss")</script>', expected: '' },
    { input: 'Normal title', expected: 'Normal title' },
    { input: '<b>Bold</b> text', expected: 'Bold text' },
    { input: 'root => createDOMPurify(root)', expected: 'root => createDOMPurify(root)' }
  ];
  
  inputs.forEach(({ input, expected }) => {
    const result = sanitizeInput(input);
    expect(result).toBe(expected);
  });
});
```

### 6. Rate Limiting Tests

#### 6.1 Rate Limit Enforcement Test
**Purpose**: Verify rate limiting works
**Regression Prevention**: Ensures DoS protection remains active

```javascript
// Test: Rate limiting
it('should enforce rate limits', async () => {
  const requests = [];
  
  // Make 15 rapid requests
  for (let i = 0; i < 15; i++) {
    requests.push(
      request(app)
        .post('/api/chats')
        .set('X-CSRF-Token', validToken)
        .send({ title: `Test ${i}` })
    );
  }
  
  const results = await Promise.all(requests);
  const rateLimited = results.filter(r => r.status === 429);
  
  expect(rateLimited.length).toBeGreaterThan(0);
});
```

## Automated Test Suite

### Complete Regression Test Runner
Create `backend/tests/security/regression-test-suite.js`:

```javascript
const { spawn } = require('child_process');
const path = require('path');

const tests = [
  {
    name: 'Authentication Tests',
    file: 'test-auth-regression.js',
    critical: true
  },
  {
    name: 'CSRF Protection Tests',
    file: 'test-csrf-regression.js',
    critical: true
  },
  {
    name: 'Body Parsing Tests',
    file: 'test-body-parsing.js',
    critical: true
  },
  {
    name: 'SSE Streaming Tests',
    file: 'test-sse-regression.js',
    critical: true
  },
  {
    name: 'Input Sanitization Tests',
    file: 'test-sanitization.js',
    critical: false
  },
  {
    name: 'Rate Limiting Tests',
    file: 'test-rate-limiting.js',
    critical: false
  }
];

async function runTest(test) {
  return new Promise((resolve, reject) => {
    console.log(`\n🧪 Running ${test.name}...`);
    
    const child = spawn('node', [path.join(__dirname, test.file)], {
      stdio: 'inherit'
    });
    
    child.on('exit', (code) => {
      if (code === 0) {
        console.log(`✅ ${test.name} passed`);
        resolve(true);
      } else {
        console.error(`❌ ${test.name} failed`);
        resolve(false);
      }
    });
    
    child.on('error', (err) => {
      console.error(`❌ ${test.name} error:`, err);
      resolve(false);
    });
  });
}

async function runAllTests() {
  console.log('🚀 Starting Security Regression Test Suite\n');
  console.log('This suite tests critical security features to prevent regressions.\n');
  
  const results = [];
  let criticalFailure = false;
  
  for (const test of tests) {
    const passed = await runTest(test);
    results.push({ ...test, passed });
    
    if (!passed && test.critical) {
      criticalFailure = true;
    }
  }
  
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  
  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    const critical = result.critical ? ' [CRITICAL]' : '';
    console.log(`${icon} ${result.name}${critical}`);
  });
  
  const totalTests = results.length;
  const passedTests = results.filter(r => r.passed).length;
  const failedTests = totalTests - passedTests;
  
  console.log('\n📈 Statistics:');
  console.log(`Total: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  
  if (criticalFailure) {
    console.error('\n🚨 CRITICAL TESTS FAILED! Do not deploy!');
    process.exit(1);
  } else if (failedTests > 0) {
    console.warn('\n⚠️  Some tests failed, but no critical issues.');
    process.exit(0);
  } else {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { runAllTests };
```

## CI/CD Integration

### GitHub Actions Workflow
```yaml
name: Security Regression Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  security-tests:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: testpass
          POSTGRES_DB: chatsg_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: |
          cd backend
          npm ci
      
      - name: Run database migrations
        run: |
          cd backend
          npm run migrate:test
        env:
          DATABASE_URL: postgresql://postgres:testpass@localhost:5432/chatsg_test
      
      - name: Run security regression tests
        run: |
          cd backend
          npm run test:security:regression
        env:
          NODE_ENV: test
          USE_MOCK_AUTH: true
          DATABASE_URL: postgresql://postgres:testpass@localhost:5432/chatsg_test
          SESSION_SECRET: test-secret-key
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: backend/test-results/
```

## Test Maintenance

### Adding New Tests
When adding new security features:
1. Create corresponding regression test
2. Add to regression test suite
3. Mark as critical if failure would be security issue
4. Document expected behavior

### Test Categories
- **Critical**: Must pass for deployment
  - Authentication
  - CSRF protection
  - Authorization
  - Data isolation
- **Important**: Should pass but not blocking
  - Rate limiting
  - Input validation
  - Error handling
- **Nice-to-have**: Informational
  - Performance
  - UX features

### Test Frequency
- **Every commit**: Critical tests via git hooks
- **Every PR**: Full regression suite
- **Nightly**: Extended security scan
- **Weekly**: Performance regression tests

## Conclusion

This comprehensive regression test suite ensures that critical security features remain functional and prevents the reintroduction of previously fixed issues. Regular execution of these tests is essential for maintaining the security posture of ChatSG.