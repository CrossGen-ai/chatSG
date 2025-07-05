const request = require('supertest');
const { createTestApp } = require('../helpers/test-app');

console.log('📦 Running Body Parsing Regression Tests...\n');

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

async function testJSONBodyParsing() {
  console.log('Testing JSON body parsing...');
  
  try {
    const agent = request.agent(server);
    
    // Get CSRF token
    const tokenRes = await agent.get('/api/config/security');
    const csrfToken = tokenRes.headers['x-csrf-token'];
    
    // Enable mock auth
    process.env.USE_MOCK_AUTH = 'true';
    process.env.NODE_ENV = 'development';
    
    const testData = {
      message: 'Test message',
      sessionId: 'test-session',
      metadata: { key: 'value' }
    };
    
    const startTime = Date.now();
    
    const res = await agent
      .post('/api/chat')
      .set('X-CSRF-Token', csrfToken)
      .set('Content-Type', 'application/json')
      .send(testData)
      .timeout(5000);
    
    const duration = Date.now() - startTime;
    
    if (duration > 1000) {
      console.error(`  ❌ Body parsing took too long: ${duration}ms`);
      failures++;
    } else {
      console.log(`  ✅ Body parsed quickly: ${duration}ms`);
    }
    
    // Verify body was parsed correctly
    if (res.body.error && res.body.error.includes('sessionId')) {
      // Expected error for missing session, but body was parsed
      console.log('  ✅ Body content parsed correctly');
    } else if (res.status === 200 || res.status === 201) {
      console.log('  ✅ Request processed with parsed body');
    } else {
      console.error('  ❌ Unexpected response:', res.status, res.body);
      failures++;
    }
    
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.error('  ❌ Request timed out - possible double parsing issue');
      failures++;
    } else {
      console.error('  ❌ JSON body parsing error:', error.message);
      failures++;
    }
  }
}

async function testLargeBodyHandling() {
  console.log('\nTesting large body handling...');
  
  try {
    const agent = request.agent(server);
    
    // Get CSRF token
    const tokenRes = await agent.get('/api/config/security');
    const csrfToken = tokenRes.headers['x-csrf-token'];
    
    // Create large payload (100KB)
    const largeMessage = 'x'.repeat(100000);
    
    const startTime = Date.now();
    
    const res = await agent
      .post('/api/chat')
      .set('X-CSRF-Token', csrfToken)
      .send({
        message: largeMessage,
        sessionId: 'test-large'
      })
      .timeout(10000);
    
    const duration = Date.now() - startTime;
    
    if (duration > 5000) {
      console.error(`  ❌ Large body parsing too slow: ${duration}ms`);
      failures++;
    } else {
      console.log(`  ✅ Large body handled efficiently: ${duration}ms`);
    }
    
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.error('  ❌ Large body request timed out');
      failures++;
    } else if (error.message.includes('too large')) {
      console.log('  ✅ Large body properly rejected with size limit');
    } else {
      console.error('  ❌ Large body handling error:', error.message);
      failures++;
    }
  }
}

async function testEmptyBodyHandling() {
  console.log('\nTesting empty body handling...');
  
  try {
    const agent = request.agent(server);
    
    // Get CSRF token
    const tokenRes = await agent.get('/api/config/security');
    const csrfToken = tokenRes.headers['x-csrf-token'];
    
    const res = await agent
      .post('/api/chat')
      .set('X-CSRF-Token', csrfToken)
      .send({})
      .timeout(2000);
    
    if (res.status === 400 || (res.body.error && res.body.error.includes('required'))) {
      console.log('  ✅ Empty body properly validated');
    } else {
      console.error('  ❌ Empty body should be rejected');
      failures++;
    }
    
  } catch (error) {
    console.error('  ❌ Empty body handling error:', error.message);
    failures++;
  }
}

async function testMalformedJSONHandling() {
  console.log('\nTesting malformed JSON handling...');
  
  try {
    const agent = request.agent(server);
    
    // Get CSRF token
    const tokenRes = await agent.get('/api/config/security');
    const csrfToken = tokenRes.headers['x-csrf-token'];
    
    const res = await agent
      .post('/api/chat')
      .set('X-CSRF-Token', csrfToken)
      .set('Content-Type', 'application/json')
      .send('{"invalid": json""}') // Malformed JSON
      .timeout(2000);
    
    if (res.status === 400 && res.body.error) {
      console.log('  ✅ Malformed JSON properly rejected');
    } else {
      console.error('  ❌ Malformed JSON should return 400 error');
      failures++;
    }
    
  } catch (error) {
    if (error.status === 400) {
      console.log('  ✅ Malformed JSON rejected with 400');
    } else {
      console.error('  ❌ Malformed JSON handling error:', error.message);
      failures++;
    }
  }
}

async function testContentTypeValidation() {
  console.log('\nTesting content type validation...');
  
  try {
    const agent = request.agent(server);
    
    // Get CSRF token
    const tokenRes = await agent.get('/api/config/security');
    const csrfToken = tokenRes.headers['x-csrf-token'];
    
    // Test with wrong content type
    const res = await agent
      .post('/api/chat')
      .set('X-CSRF-Token', csrfToken)
      .set('Content-Type', 'text/plain')
      .send('plain text data')
      .timeout(2000);
    
    // Should either reject or parse as empty body
    if (res.status === 400 || res.status === 415) {
      console.log('  ✅ Invalid content type properly handled');
    } else if (res.body.error) {
      console.log('  ✅ Non-JSON content handled gracefully');
    } else {
      console.error('  ❌ Should handle non-JSON content type appropriately');
      failures++;
    }
    
  } catch (error) {
    console.error('  ❌ Content type validation error:', error.message);
    failures++;
  }
}

async function testDoubleParsingPrevention() {
  console.log('\nTesting double parsing prevention...');
  
  try {
    // This test ensures we don't have code that tries to parse already-parsed bodies
    const agent = request.agent(server);
    
    // Get CSRF token
    const tokenRes = await agent.get('/api/config/security');
    const csrfToken = tokenRes.headers['x-csrf-token'];
    
    // Make multiple rapid requests
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(
        agent
          .post('/api/chat')
          .set('X-CSRF-Token', csrfToken)
          .send({ message: `Test ${i}`, sessionId: `test-${i}` })
          .timeout(2000)
      );
    }
    
    const results = await Promise.allSettled(promises);
    const timeouts = results.filter(r => 
      r.status === 'rejected' && r.reason.code === 'ECONNABORTED'
    );
    
    if (timeouts.length > 0) {
      console.error(`  ❌ ${timeouts.length} requests timed out - possible double parsing`);
      failures++;
    } else {
      console.log('  ✅ All requests completed without timeout');
    }
    
  } catch (error) {
    console.error('  ❌ Double parsing test error:', error.message);
    failures++;
  }
}

async function runTests() {
  try {
    await setup();
    
    await testJSONBodyParsing();
    await testLargeBodyHandling();
    await testEmptyBodyHandling();
    await testMalformedJSONHandling();
    await testContentTypeValidation();
    await testDoubleParsingPrevention();
    
    console.log('\n📊 Body Parsing Test Results:');
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