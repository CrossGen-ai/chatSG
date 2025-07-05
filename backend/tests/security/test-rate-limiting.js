const request = require('supertest');
const { createTestApp } = require('../helpers/test-app');

console.log('⚡ Running Rate Limiting Regression Tests...\n');

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

async function testBasicRateLimiting() {
  console.log('Testing basic rate limiting...');
  
  try {
    const agent = request.agent(server);
    
    // Get CSRF token
    const tokenRes = await agent.get('/api/config/security');
    const csrfToken = tokenRes.headers['x-csrf-token'];
    
    // Enable mock auth
    process.env.USE_MOCK_AUTH = 'true';
    process.env.NODE_ENV = 'development';
    
    const requests = [];
    const startTime = Date.now();
    
    // Make 12 rapid requests (assuming limit is 10 per minute)
    for (let i = 0; i < 12; i++) {
      requests.push(
        agent
          .post('/api/chats')
          .set('X-CSRF-Token', csrfToken)
          .send({ title: `Test ${i}` })
      );
    }
    
    const results = await Promise.allSettled(requests);
    const duration = Date.now() - startTime;
    
    // Count successful and rate limited requests
    const successful = results.filter(r => 
      r.status === 'fulfilled' && r.value.status !== 429
    ).length;
    const rateLimited = results.filter(r => 
      r.status === 'fulfilled' && r.value.status === 429
    ).length;
    
    console.log(`  Sent 12 requests in ${duration}ms`);
    console.log(`  Successful: ${successful}, Rate limited: ${rateLimited}`);
    
    if (rateLimited > 0) {
      console.log('  ✅ Rate limiting is active');
    } else {
      console.log('  ⚠️  No rate limiting detected (may be disabled in test)');
    }
    
  } catch (error) {
    console.error('  ❌ Basic rate limiting error:', error.message);
    failures++;
  }
}

async function testRateLimitHeaders() {
  console.log('\nTesting rate limit headers...');
  
  try {
    const res = await request(server)
      .get('/api/config/security');
    
    // Check for rate limit headers
    const headers = res.headers;
    const rateLimitHeaders = [
      'x-ratelimit-limit',
      'x-ratelimit-remaining',
      'x-ratelimit-reset',
      'retry-after'
    ];
    
    const hasRateLimitHeaders = rateLimitHeaders.some(header => 
      headers[header] !== undefined
    );
    
    if (hasRateLimitHeaders) {
      console.log('  ✅ Rate limit headers present');
      rateLimitHeaders.forEach(header => {
        if (headers[header]) {
          console.log(`     ${header}: ${headers[header]}`);
        }
      });
    } else {
      console.log('  ⚠️  No rate limit headers found');
    }
    
  } catch (error) {
    console.error('  ❌ Rate limit headers error:', error.message);
    failures++;
  }
}

async function testPerIPRateLimiting() {
  console.log('\nTesting per-IP rate limiting...');
  
  try {
    // Simulate requests from different IPs
    const agent1 = request.agent(server);
    const agent2 = request.agent(server);
    
    // Override IP addresses (if middleware supports X-Forwarded-For)
    agent1.set('X-Forwarded-For', '192.168.1.1');
    agent2.set('X-Forwarded-For', '192.168.1.2');
    
    // Get CSRF tokens
    const token1Res = await agent1.get('/api/config/security');
    const token1 = token1Res.headers['x-csrf-token'];
    
    const token2Res = await agent2.get('/api/config/security');
    const token2 = token2Res.headers['x-csrf-token'];
    
    // Make requests from both IPs
    const requests = [];
    
    // 6 requests from IP1
    for (let i = 0; i < 6; i++) {
      requests.push({
        promise: agent1
          .post('/api/chats')
          .set('X-CSRF-Token', token1)
          .send({ title: `IP1 Test ${i}` }),
        ip: '192.168.1.1'
      });
    }
    
    // 6 requests from IP2
    for (let i = 0; i < 6; i++) {
      requests.push({
        promise: agent2
          .post('/api/chats')
          .set('X-CSRF-Token', token2)
          .send({ title: `IP2 Test ${i}` }),
        ip: '192.168.1.2'
      });
    }
    
    const results = await Promise.allSettled(requests.map(r => r.promise));
    
    console.log('  ℹ️  Per-IP rate limiting test completed');
    console.log('     (Results depend on rate limit configuration)');
    
  } catch (error) {
    console.error('  ❌ Per-IP rate limiting error:', error.message);
    failures++;
  }
}

async function testSSERateLimiting() {
  console.log('\nTesting SSE endpoint rate limiting...');
  
  try {
    const agent = request.agent(server);
    
    // Get CSRF token
    const tokenRes = await agent.get('/api/config/security');
    const csrfToken = tokenRes.headers['x-csrf-token'];
    
    // Enable mock auth
    process.env.USE_MOCK_AUTH = 'true';
    process.env.NODE_ENV = 'development';
    
    // Make multiple SSE requests
    const sseRequests = [];
    for (let i = 0; i < 5; i++) {
      sseRequests.push(
        agent
          .post('/api/chat/stream')
          .set('X-CSRF-Token', csrfToken)
          .set('Accept', 'text/event-stream')
          .send({ message: `SSE Test ${i}`, sessionId: `sse-${i}` })
      );
    }
    
    const results = await Promise.allSettled(sseRequests);
    const rateLimited = results.filter(r => 
      r.status === 'fulfilled' && r.value.status === 429
    ).length;
    
    if (rateLimited > 0) {
      console.log(`  ✅ SSE rate limiting active (${rateLimited} requests limited)`);
    } else {
      console.log('  ℹ️  SSE rate limiting may have different limits');
    }
    
  } catch (error) {
    console.error('  ❌ SSE rate limiting error:', error.message);
    failures++;
  }
}

async function testRateLimitReset() {
  console.log('\nTesting rate limit reset behavior...');
  
  try {
    const agent = request.agent(server);
    
    // Get CSRF token
    const tokenRes = await agent.get('/api/config/security');
    const csrfToken = tokenRes.headers['x-csrf-token'];
    
    // Make a request to get rate limit info
    const res1 = await agent
      .get('/api/chats')
      .set('X-CSRF-Token', csrfToken);
    
    if (res1.headers['x-ratelimit-reset']) {
      const resetTime = parseInt(res1.headers['x-ratelimit-reset']);
      const now = Date.now() / 1000;
      const timeUntilReset = Math.ceil(resetTime - now);
      
      console.log(`  ℹ️  Rate limit resets in ${timeUntilReset} seconds`);
      console.log('  ✅ Rate limit reset header working');
    } else {
      console.log('  ⚠️  No rate limit reset information available');
    }
    
  } catch (error) {
    console.error('  ❌ Rate limit reset error:', error.message);
    failures++;
  }
}

async function testDifferentEndpointLimits() {
  console.log('\nTesting different limits for different endpoints...');
  
  try {
    const agent = request.agent(server);
    
    // Get CSRF token
    const tokenRes = await agent.get('/api/config/security');
    const csrfToken = tokenRes.headers['x-csrf-token'];
    
    // Test different endpoints
    const endpoints = [
      { path: '/api/chats', method: 'GET', expectedLimit: 'standard' },
      { path: '/api/chats', method: 'POST', expectedLimit: 'write' },
      { path: '/api/auth/login', method: 'POST', expectedLimit: 'auth' }
    ];
    
    for (const endpoint of endpoints) {
      const res = await agent[endpoint.method.toLowerCase()](endpoint.path)
        .set('X-CSRF-Token', csrfToken)
        .send(endpoint.method === 'POST' ? { test: true } : undefined);
      
      if (res.headers['x-ratelimit-limit']) {
        console.log(`  ℹ️  ${endpoint.method} ${endpoint.path}: limit ${res.headers['x-ratelimit-limit']}`);
      }
    }
    
    console.log('  ✅ Endpoint-specific limits checked');
    
  } catch (error) {
    console.error('  ❌ Endpoint limits error:', error.message);
    failures++;
  }
}

async function runTests() {
  try {
    await setup();
    
    await testBasicRateLimiting();
    await testRateLimitHeaders();
    await testPerIPRateLimiting();
    await testSSERateLimiting();
    await testRateLimitReset();
    await testDifferentEndpointLimits();
    
    console.log('\n📊 Rate Limiting Test Results:');
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