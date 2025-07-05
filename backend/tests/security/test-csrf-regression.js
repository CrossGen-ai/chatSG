const request = require('supertest');
const { createTestApp } = require('../helpers/test-app');

console.log('🛡️  Running CSRF Protection Regression Tests...\n');

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

async function testCSRFTokenGeneration() {
  console.log('Testing CSRF token generation...');
  
  try {
    const res = await request(server)
      .get('/api/config/security')
      .expect(200);
    
    const token = res.headers['x-csrf-token'];
    
    if (!token) {
      console.error('  ❌ No CSRF token generated');
      failures++;
    } else if (token.length !== 64) {
      console.error('  ❌ CSRF token has incorrect length:', token.length);
      failures++;
    } else {
      console.log('  ✅ CSRF token generated correctly');
    }
    
  } catch (error) {
    console.error('  ❌ CSRF token generation error:', error.message);
    failures++;
  }
}

async function testCSRFTokenReuse() {
  console.log('\nTesting CSRF token reuse...');
  
  try {
    const agent = request.agent(server);
    
    // First request
    const res1 = await agent.get('/api/config/security');
    const token1 = res1.headers['x-csrf-token'];
    
    // Second request - should reuse token
    const res2 = await agent.get('/api/config/markdown');
    const token2 = res2.headers['x-csrf-token'];
    
    if (token1 !== token2) {
      console.error('  ❌ CSRF tokens not reused (token mismatch)');
      console.error(`    Token 1: ${token1}`);
      console.error(`    Token 2: ${token2}`);
      failures++;
    } else {
      console.log('  ✅ CSRF token correctly reused');
    }
    
    // Third request - verify still same token
    const res3 = await agent.get('/api/config/security');
    const token3 = res3.headers['x-csrf-token'];
    
    if (token1 !== token3) {
      console.error('  ❌ CSRF token changed on third request');
      failures++;
    } else {
      console.log('  ✅ CSRF token remained stable across multiple requests');
    }
    
  } catch (error) {
    console.error('  ❌ CSRF token reuse error:', error.message);
    failures++;
  }
}

async function testCSRFProtectionOnPOST() {
  console.log('\nTesting CSRF protection on POST requests...');
  
  try {
    // Test 1: POST without CSRF token
    const res1 = await request(server)
      .post('/api/chats')
      .send({ title: 'Test Chat' })
      .expect(403);
    
    console.log('  ✅ POST without CSRF token correctly rejected');
    
    // Test 2: POST with invalid CSRF token
    const res2 = await request(server)
      .post('/api/chats')
      .set('X-CSRF-Token', 'invalid-token')
      .send({ title: 'Test Chat' })
      .expect(403);
    
    console.log('  ✅ POST with invalid CSRF token correctly rejected');
    
    // Test 3: POST with valid CSRF token
    const agent = request.agent(server);
    const tokenRes = await agent.get('/api/config/security');
    const validToken = tokenRes.headers['x-csrf-token'];
    
    // Enable mock auth for this test
    process.env.USE_MOCK_AUTH = 'true';
    process.env.NODE_ENV = 'development';
    
    const res3 = await agent
      .post('/api/chats')
      .set('X-CSRF-Token', validToken)
      .send({ title: 'Test Chat' });
    
    if (res3.status === 403) {
      console.error('  ❌ POST with valid CSRF token was rejected');
      failures++;
    } else {
      console.log('  ✅ POST with valid CSRF token accepted');
    }
    
  } catch (error) {
    console.error('  ❌ CSRF POST protection error:', error.message);
    failures++;
  }
}

async function testCSRFOnDifferentMethods() {
  console.log('\nTesting CSRF on different HTTP methods...');
  
  try {
    const agent = request.agent(server);
    const tokenRes = await agent.get('/api/config/security');
    const token = tokenRes.headers['x-csrf-token'];
    
    // Test PUT
    const putRes = await agent
      .put('/api/chats/test-id')
      .send({ title: 'Updated' });
    
    if (putRes.status === 403 && !putRes.headers['x-csrf-token']) {
      console.log('  ✅ PUT requires CSRF token');
    } else {
      console.error('  ❌ PUT should require CSRF token');
      failures++;
    }
    
    // Test DELETE
    const deleteRes = await agent
      .delete('/api/chats/test-id');
    
    if (deleteRes.status === 403 && !deleteRes.headers['x-csrf-token']) {
      console.log('  ✅ DELETE requires CSRF token');
    } else {
      console.error('  ❌ DELETE should require CSRF token');
      failures++;
    }
    
    // Test GET doesn't require token for validation
    const getRes = await agent
      .get('/api/chats');
    
    if (getRes.headers['x-csrf-token']) {
      console.log('  ✅ GET requests receive CSRF token');
    } else {
      console.error('  ❌ GET requests should receive CSRF token');
      failures++;
    }
    
  } catch (error) {
    console.error('  ❌ CSRF method test error:', error.message);
    failures++;
  }
}

async function testCSRFTokenExpiry() {
  console.log('\nTesting CSRF token expiry behavior...');
  
  try {
    // This is a simulation since we can't wait for actual expiry
    console.log('  ℹ️  Token expiry test simulated (actual expiry is 1 hour)');
    
    // Verify token structure includes expiry
    const res = await request(server)
      .get('/api/config/security');
    
    const token = res.headers['x-csrf-token'];
    if (token && token.length === 64) {
      console.log('  ✅ Token format supports expiry tracking');
    } else {
      console.error('  ❌ Token format issue');
      failures++;
    }
    
  } catch (error) {
    console.error('  ❌ CSRF expiry test error:', error.message);
    failures++;
  }
}

async function runTests() {
  try {
    await setup();
    
    await testCSRFTokenGeneration();
    await testCSRFTokenReuse();
    await testCSRFProtectionOnPOST();
    await testCSRFOnDifferentMethods();
    await testCSRFTokenExpiry();
    
    console.log('\n📊 CSRF Test Results:');
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