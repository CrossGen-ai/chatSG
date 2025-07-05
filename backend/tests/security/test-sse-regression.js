const request = require('supertest');
const { createTestApp } = require('../helpers/test-app');
const EventSource = require('eventsource');

console.log('📡 Running SSE Streaming Regression Tests...\n');

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

async function testSSERequiresAuth() {
  console.log('Testing SSE requires authentication...');
  
  try {
    const res = await request(server)
      .post('/api/chat/stream')
      .send({ message: 'Test', sessionId: 'test' })
      .expect(401);
    
    console.log('  ✅ SSE endpoint requires authentication');
  } catch (error) {
    console.error('  ❌ SSE should require authentication');
    failures++;
  }
}

async function testSSERequiresCSRF() {
  console.log('\nTesting SSE requires CSRF token...');
  
  try {
    // Enable mock auth
    process.env.USE_MOCK_AUTH = 'true';
    process.env.NODE_ENV = 'development';
    
    const agent = request.agent(server);
    
    // Try without CSRF token
    const res1 = await agent
      .post('/api/chat/stream')
      .send({ message: 'Test', sessionId: 'test' })
      .expect(403);
    
    console.log('  ✅ SSE without CSRF token rejected');
    
    // Get CSRF token
    const tokenRes = await agent.get('/api/config/security');
    const csrfToken = tokenRes.headers['x-csrf-token'];
    
    // Try with CSRF token
    const res2 = await agent
      .post('/api/chat/stream')
      .set('X-CSRF-Token', csrfToken)
      .set('Accept', 'text/event-stream')
      .send({ message: 'Test', sessionId: 'test' });
    
    if (res2.status === 403) {
      console.error('  ❌ SSE with valid CSRF token was rejected');
      failures++;
    } else if (res2.headers['content-type'] && res2.headers['content-type'].includes('text/event-stream')) {
      console.log('  ✅ SSE with CSRF token accepted');
    } else {
      console.error('  ❌ SSE response has wrong content type');
      failures++;
    }
    
  } catch (error) {
    console.error('  ❌ SSE CSRF test error:', error.message);
    failures++;
  }
}

async function testSSEDataFlow() {
  console.log('\nTesting SSE data flow...');
  
  try {
    const agent = request.agent(server);
    
    // Get CSRF token
    const tokenRes = await agent.get('/api/config/security');
    const csrfToken = tokenRes.headers['x-csrf-token'];
    
    // Enable mock auth
    process.env.USE_MOCK_AUTH = 'true';
    process.env.NODE_ENV = 'development';
    
    const events = [];
    
    await new Promise((resolve, reject) => {
      const req = agent
        .post('/api/chat/stream')
        .set('X-CSRF-Token', csrfToken)
        .set('Accept', 'text/event-stream')
        .send({ message: 'Hello AI', sessionId: 'test-sse' })
        .buffer(false)
        .parse((res, callback) => {
          let buffer = '';
          
          res.on('data', (chunk) => {
            buffer += chunk.toString();
            const lines = buffer.split('\n');
            
            // Process complete lines
            for (let i = 0; i < lines.length - 1; i++) {
              const line = lines[i].trim();
              if (line.startsWith('event:')) {
                const event = line.substring(6).trim();
                events.push(event);
              }
            }
            
            // Keep the last incomplete line in buffer
            buffer = lines[lines.length - 1];
          });
          
          res.on('end', () => {
            resolve();
          });
          
          res.on('error', reject);
        });
      
      req.end();
      
      // Set timeout
      setTimeout(() => {
        resolve();
      }, 3000);
    });
    
    // Check if we got expected events
    const expectedEvents = ['connected', 'start'];
    const hasExpectedEvents = expectedEvents.every(event => 
      events.includes(event) || events.some(e => e.includes(event))
    );
    
    if (events.length === 0) {
      console.error('  ❌ No SSE events received');
      failures++;
    } else if (!hasExpectedEvents) {
      console.error('  ❌ Missing expected SSE events:', events);
      failures++;
    } else {
      console.log('  ✅ SSE data flow working correctly');
      console.log(`     Received events: ${events.join(', ')}`);
    }
    
  } catch (error) {
    console.error('  ❌ SSE data flow error:', error.message);
    failures++;
  }
}

async function testSSEErrorHandling() {
  console.log('\nTesting SSE error handling...');
  
  try {
    const agent = request.agent(server);
    
    // Get CSRF token
    const tokenRes = await agent.get('/api/config/security');
    const csrfToken = tokenRes.headers['x-csrf-token'];
    
    // Test with invalid session ID
    const res = await agent
      .post('/api/chat/stream')
      .set('X-CSRF-Token', csrfToken)
      .set('Accept', 'text/event-stream')
      .send({ message: 'Test', sessionId: '' }); // Empty session ID
    
    if (res.status === 400 || (res.body && res.body.error)) {
      console.log('  ✅ SSE properly handles invalid input');
    } else {
      console.error('  ❌ SSE should validate input');
      failures++;
    }
    
  } catch (error) {
    console.error('  ❌ SSE error handling test failed:', error.message);
    failures++;
  }
}

async function testSSEConcurrentConnections() {
  console.log('\nTesting SSE concurrent connections...');
  
  try {
    const agent = request.agent(server);
    
    // Get CSRF token
    const tokenRes = await agent.get('/api/config/security');
    const csrfToken = tokenRes.headers['x-csrf-token'];
    
    // Enable mock auth
    process.env.USE_MOCK_AUTH = 'true';
    process.env.NODE_ENV = 'development';
    
    // Create multiple concurrent SSE connections
    const connections = [];
    for (let i = 0; i < 3; i++) {
      connections.push(
        agent
          .post('/api/chat/stream')
          .set('X-CSRF-Token', csrfToken)
          .set('Accept', 'text/event-stream')
          .send({ message: `Concurrent ${i}`, sessionId: `test-concurrent-${i}` })
          .timeout(2000)
      );
    }
    
    const results = await Promise.allSettled(connections);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    
    if (successful === connections.length) {
      console.log('  ✅ All concurrent SSE connections handled');
    } else {
      console.error(`  ❌ Only ${successful}/${connections.length} connections succeeded`);
      failures++;
    }
    
  } catch (error) {
    console.error('  ❌ SSE concurrent connection error:', error.message);
    failures++;
  }
}

async function testSSETokenInResponse() {
  console.log('\nTesting SSE includes CSRF token in response...');
  
  try {
    const agent = request.agent(server);
    
    // Get initial CSRF token
    const tokenRes = await agent.get('/api/config/security');
    const csrfToken = tokenRes.headers['x-csrf-token'];
    
    // Make SSE request
    const res = await agent
      .post('/api/chat/stream')
      .set('X-CSRF-Token', csrfToken)
      .set('Accept', 'text/event-stream')
      .send({ message: 'Test', sessionId: 'test-token' });
    
    // Check if response includes CSRF token header
    if (res.headers['x-csrf-token']) {
      console.log('  ✅ SSE response includes CSRF token');
      
      // Verify it's the same token (reuse)
      if (res.headers['x-csrf-token'] === csrfToken) {
        console.log('  ✅ SSE correctly reuses existing token');
      } else {
        console.error('  ❌ SSE generated new token instead of reusing');
        failures++;
      }
    } else {
      console.error('  ❌ SSE response missing CSRF token header');
      failures++;
    }
    
  } catch (error) {
    console.error('  ❌ SSE token test error:', error.message);
    failures++;
  }
}

async function runTests() {
  try {
    await setup();
    
    await testSSERequiresAuth();
    await testSSERequiresCSRF();
    await testSSEDataFlow();
    await testSSEErrorHandling();
    await testSSEConcurrentConnections();
    await testSSETokenInResponse();
    
    console.log('\n📊 SSE Streaming Test Results:');
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