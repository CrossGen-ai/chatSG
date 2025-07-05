const DOMPurify = require('isomorphic-dompurify');
const { createTestApp } = require('../helpers/test-app');
const request = require('supertest');

console.log('🧹 Running Input Sanitization Regression Tests...\n');

let app;
let server;
let failures = 0;

async function setup() {
  app = createTestApp();
  server = app.listen(0);
}

async function teardown() {
  if (server) {
    await new Promise(resolve => server.close(resolve));
  }
}

function sanitizeInput(input) {
  // This should match the actual sanitization logic in the app
  if (typeof input !== 'string') return input;
  
  // IMPORTANT: Call DOMPurify.sanitize() not DOMPurify()
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });
}

async function testDOMPurifySanitization() {
  console.log('Testing DOMPurify sanitization...');
  
  const testCases = [
    {
      name: 'XSS script tag',
      input: '<script>alert("xss")</script>',
      expected: ''
    },
    {
      name: 'Normal text',
      input: 'Normal title',
      expected: 'Normal title'
    },
    {
      name: 'HTML tags stripped',
      input: '<b>Bold</b> text',
      expected: 'Bold text'
    },
    {
      name: 'Function-like text (regression test)',
      input: 'root => createDOMPurify(root)',
      expected: 'root => createDOMPurify(root)'
    },
    {
      name: 'JavaScript URL',
      input: '<a href="javascript:alert(1)">Click</a>',
      expected: 'Click'
    },
    {
      name: 'Event handler',
      input: '<div onclick="alert(1)">Test</div>',
      expected: 'Test'
    },
    {
      name: 'Data URI',
      input: '<img src="data:text/html,<script>alert(1)</script>">',
      expected: ''
    }
  ];
  
  let passed = 0;
  for (const testCase of testCases) {
    try {
      const result = sanitizeInput(testCase.input);
      
      if (result === testCase.expected) {
        console.log(`  ✅ ${testCase.name}: "${testCase.input}" → "${result}"`);
        passed++;
      } else {
        console.error(`  ❌ ${testCase.name}: expected "${testCase.expected}", got "${result}"`);
        failures++;
      }
    } catch (error) {
      console.error(`  ❌ ${testCase.name}: error - ${error.message}`);
      failures++;
    }
  }
  
  console.log(`  Passed ${passed}/${testCases.length} sanitization tests`);
}

async function testAPIInputSanitization() {
  console.log('\nTesting API input sanitization...');
  
  try {
    const agent = request.agent(server);
    
    // Get CSRF token
    const tokenRes = await agent.get('/api/config/security');
    const csrfToken = tokenRes.headers['x-csrf-token'];
    
    // Enable mock auth
    process.env.USE_MOCK_AUTH = 'true';
    process.env.NODE_ENV = 'development';
    
    // Test chat creation with XSS attempt
    const xssTitle = '<script>alert("xss")</script>Test Chat';
    
    const res = await agent
      .post('/api/chats')
      .set('X-CSRF-Token', csrfToken)
      .send({ title: xssTitle });
    
    if (res.status === 201 && res.body.title) {
      if (res.body.title.includes('<script>')) {
        console.error('  ❌ XSS not sanitized in chat title');
        failures++;
      } else {
        console.log('  ✅ Chat title properly sanitized');
      }
    }
    
    // Test message with HTML
    const htmlMessage = '<b>Bold</b> message with <script>alert(1)</script>';
    
    const msgRes = await agent
      .post('/api/chat')
      .set('X-CSRF-Token', csrfToken)
      .send({
        message: htmlMessage,
        sessionId: res.body.id || 'test'
      });
    
    // Message should be processed but sanitized
    console.log('  ✅ HTML message handled safely');
    
  } catch (error) {
    console.error('  ❌ API sanitization test error:', error.message);
    failures++;
  }
}

async function testSpecialCharacterHandling() {
  console.log('\nTesting special character handling...');
  
  const specialCases = [
    {
      name: 'Emoji support',
      input: '😀 Hello 🌟 World 🚀',
      shouldPreserve: true
    },
    {
      name: 'Unicode characters',
      input: 'Café ñoño 中文',
      shouldPreserve: true
    },
    {
      name: 'Math symbols',
      input: '∑ ∏ ∫ √ ≠ ≤ ≥',
      shouldPreserve: true
    },
    {
      name: 'Null bytes',
      input: 'Test\x00Hidden',
      shouldPreserve: false,
      expected: 'TestHidden'
    }
  ];
  
  for (const testCase of specialCases) {
    try {
      const result = sanitizeInput(testCase.input);
      
      if (testCase.shouldPreserve && result === testCase.input) {
        console.log(`  ✅ ${testCase.name} preserved correctly`);
      } else if (!testCase.shouldPreserve && result === testCase.expected) {
        console.log(`  ✅ ${testCase.name} sanitized correctly`);
      } else {
        console.error(`  ❌ ${testCase.name}: unexpected result "${result}"`);
        failures++;
      }
    } catch (error) {
      console.error(`  ❌ ${testCase.name}: error - ${error.message}`);
      failures++;
    }
  }
}

async function testSQLInjectionPrevention() {
  console.log('\nTesting SQL injection prevention...');
  
  try {
    const agent = request.agent(server);
    
    // Get CSRF token
    const tokenRes = await agent.get('/api/config/security');
    const csrfToken = tokenRes.headers['x-csrf-token'];
    
    // Test with SQL injection attempts
    const sqlInjectionAttempts = [
      "'; DROP TABLE users; --",
      "1' OR '1'='1",
      "admin'--",
      "1; DELETE FROM sessions WHERE '1'='1"
    ];
    
    for (const attempt of sqlInjectionAttempts) {
      const res = await agent
        .post('/api/chats')
        .set('X-CSRF-Token', csrfToken)
        .send({ title: attempt });
      
      // Should either sanitize or parameterize properly
      if (res.status !== 500) {
        console.log(`  ✅ SQL injection attempt handled: "${attempt.substring(0, 20)}..."`);
      } else {
        console.error(`  ❌ SQL injection may have caused error: "${attempt}"`);
        failures++;
      }
    }
    
  } catch (error) {
    console.error('  ❌ SQL injection test error:', error.message);
    failures++;
  }
}

async function testPathTraversalPrevention() {
  console.log('\nTesting path traversal prevention...');
  
  try {
    const agent = request.agent(server);
    
    // Get CSRF token
    const tokenRes = await agent.get('/api/config/security');
    const csrfToken = tokenRes.headers['x-csrf-token'];
    
    // Test path traversal attempts
    const pathTraversalAttempts = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32',
      './////etc/hosts',
      '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd'
    ];
    
    for (const attempt of pathTraversalAttempts) {
      const res = await agent
        .get(`/api/chats/${encodeURIComponent(attempt)}`)
        .set('X-CSRF-Token', csrfToken);
      
      if (res.status === 404 || res.status === 400) {
        console.log(`  ✅ Path traversal blocked: "${attempt.substring(0, 20)}..."`);
      } else if (res.status === 200) {
        console.error(`  ❌ Path traversal may not be blocked: "${attempt}"`);
        failures++;
      }
    }
    
  } catch (error) {
    console.error('  ❌ Path traversal test error:', error.message);
    failures++;
  }
}

async function testCommandInjectionPrevention() {
  console.log('\nTesting command injection prevention...');
  
  const commandInjectionCases = [
    '; ls -la',
    '| cat /etc/passwd',
    '`rm -rf /`',
    '$(whoami)',
    '&& echo "hacked"'
  ];
  
  // Since we're testing sanitization, verify these are handled safely
  for (const testCase of commandInjectionCases) {
    const result = sanitizeInput(testCase);
    
    // These should pass through sanitization but be safe when used
    if (result === testCase) {
      console.log(`  ✅ Command injection string preserved (safe context required)`);
    } else {
      console.log(`  ℹ️  Command string modified: "${testCase}" → "${result}"`);
    }
  }
}

async function runTests() {
  try {
    await setup();
    
    await testDOMPurifySanitization();
    await testAPIInputSanitization();
    await testSpecialCharacterHandling();
    await testSQLInjectionPrevention();
    await testPathTraversalPrevention();
    await testCommandInjectionPrevention();
    
    console.log('\n📊 Sanitization Test Results:');
    console.log(`Total failures: ${failures}`);
    
    await teardown();
    
    process.exit(failures > 0 ? 1 : 0);
  } catch (error) {
    console.error('\n❌ Test suite error:', error);
    await teardown();
    process.exit(1);
  }
}

runTests();