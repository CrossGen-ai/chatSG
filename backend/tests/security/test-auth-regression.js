const request = require('supertest');
const { createTestApp } = require('../helpers/test-app');
const { authenticate } = require('../../middleware/security/auth');

console.log('🔐 Running Authentication Regression Tests...\n');

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

async function testMockAuth() {
  console.log('Testing mock authentication...');
  
  const originalEnv = {
    USE_MOCK_AUTH: process.env.USE_MOCK_AUTH,
    NODE_ENV: process.env.NODE_ENV
  };
  
  try {
    // Test 1: Mock auth in development
    process.env.USE_MOCK_AUTH = 'true';
    process.env.NODE_ENV = 'development';
    
    const req = { session: {} };
    const res = {};
    const next = () => {};
    
    await authenticate(req, res, next);
    
    if (!req.isAuthenticated || !req.user || req.user.email !== 'dev@example.com') {
      console.error('  ❌ Mock auth failed to authenticate user');
      failures++;
    } else {
      console.log('  ✅ Mock auth works in development');
    }
    
    // Test 2: Mock auth disabled in production
    process.env.NODE_ENV = 'production';
    const req2 = { session: {} };
    
    await authenticate(req2, res, next);
    
    if (req2.isAuthenticated) {
      console.error('  ❌ Mock auth should not work in production');
      failures++;
    } else {
      console.log('  ✅ Mock auth correctly disabled in production');
    }
    
  } finally {
    // Restore environment
    process.env.USE_MOCK_AUTH = originalEnv.USE_MOCK_AUTH;
    process.env.NODE_ENV = originalEnv.NODE_ENV;
  }
}

async function testSessionPersistence() {
  console.log('\nTesting session persistence...');
  
  try {
    const user = {
      id: 1,
      email: 'test@example.com',
      azureId: 'test-azure-id'
    };
    
    const req = {
      session: { user }
    };
    const res = {};
    const next = () => {};
    
    await authenticate(req, res, next);
    
    if (!req.user || req.user.email !== user.email) {
      console.error('  ❌ Session user not persisted correctly');
      failures++;
    } else {
      console.log('  ✅ Session persistence works');
    }
    
  } catch (error) {
    console.error('  ❌ Session persistence error:', error.message);
    failures++;
  }
}

async function testUnauthenticatedAccess() {
  console.log('\nTesting unauthenticated access...');
  
  try {
    const res = await request(server)
      .get('/api/chats')
      .expect(401);
    
    console.log('  ✅ Unauthenticated requests properly rejected');
  } catch (error) {
    console.error('  ❌ Unauthenticated access not properly blocked');
    failures++;
  }
}

async function testUserSpecificData() {
  console.log('\nTesting user-specific data isolation...');
  
  try {
    // Mock authenticated request
    const agent = request.agent(server);
    
    // Set up mock session
    process.env.USE_MOCK_AUTH = 'true';
    process.env.NODE_ENV = 'development';
    
    // Get CSRF token
    const tokenRes = await agent.get('/api/config/security');
    const csrfToken = tokenRes.headers['x-csrf-token'];
    
    // Make authenticated request
    const res = await agent
      .get('/api/chats')
      .set('X-CSRF-Token', csrfToken)
      .expect(200);
    
    if (!Array.isArray(res.body)) {
      console.error('  ❌ Invalid response format');
      failures++;
    } else {
      console.log('  ✅ User data properly isolated');
    }
    
  } catch (error) {
    console.error('  ❌ User data isolation error:', error.message);
    failures++;
  }
}

async function runTests() {
  try {
    await setup();
    
    await testMockAuth();
    await testSessionPersistence();
    await testUnauthenticatedAccess();
    await testUserSpecificData();
    
    console.log('\n📊 Authentication Test Results:');
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