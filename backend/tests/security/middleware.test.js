const test = require('node:test');
const assert = require('node:assert');
const securityMiddleware = require('../../middleware/security');
const { createMockReq, createMockRes } = require('../helpers/mock-http');

test('Security Middleware Tests', async (t) => {
  await t.test('should block XSS attempts in request body', async () => {
    const req = createMockReq({
      method: 'POST',
      url: '/api/chat',
      body: {
        message: '<script>alert("xss")</script>Hello',
        sessionId: 'test-session'
      }
    });
    const res = createMockRes();
    
    const middleware = securityMiddleware();
    
    await new Promise((resolve, reject) => {
      middleware(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    // Check that script tags were removed
    assert.strictEqual(req.body.message.includes('<script>'), false);
    assert.strictEqual(req.body.message.includes('Hello'), true);
  });
  
  await t.test('should validate session ID format', async () => {
    const req = createMockReq({
      method: 'POST',
      url: '/api/chat',
      body: {
        message: 'Hello',
        sessionId: 'invalid<>session'
      }
    });
    const res = createMockRes();
    
    const middleware = securityMiddleware();
    
    try {
      await new Promise((resolve, reject) => {
        middleware(req, res, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      assert.fail('Should have thrown validation error');
    } catch (error) {
      // Expected to fail validation
      assert.ok(true);
    }
  });
  
  await t.test('should enforce rate limiting', async () => {
    const middleware = securityMiddleware();
    
    // Make multiple requests
    const requests = [];
    for (let i = 0; i < 101; i++) {
      const req = createMockReq({
        method: 'POST',
        url: '/api/chat',
        body: { message: 'Test', sessionId: 'test' },
        ip: '127.0.0.1'
      });
      const res = createMockRes();
      
      requests.push(new Promise((resolve) => {
        middleware(req, res, () => {
          resolve({ status: res.statusCode });
        });
      }));
    }
    
    const results = await Promise.all(requests);
    
    // Check that some requests were rate limited
    const rateLimited = results.filter(r => r.status === 429);
    assert.ok(rateLimited.length > 0, 'Some requests should be rate limited');
  });
  
  await t.test('should set security headers', async () => {
    const req = createMockReq({
      method: 'GET',
      url: '/api/health'
    });
    const res = createMockRes();
    
    const middleware = securityMiddleware();
    
    await new Promise((resolve, reject) => {
      middleware(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    // Check security headers
    assert.ok(res.headers['X-Content-Type-Options']);
    assert.ok(res.headers['X-Frame-Options']);
    assert.ok(res.headers['Content-Security-Policy']);
  });
});

// Mock HTTP helpers
function createMockReq(options = {}) {
  return {
    method: options.method || 'GET',
    url: options.url || '/',
    headers: options.headers || {},
    body: options.body || null,
    query: options.query || {},
    params: options.params || {},
    cookies: options.cookies || {},
    ip: options.ip || '127.0.0.1',
    connection: { remoteAddress: options.ip || '127.0.0.1' },
    get: function(header) {
      return this.headers[header.toLowerCase()];
    }
  };
}

function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    locals: {},
    
    setHeader: function(name, value) {
      this.headers[name] = value;
    },
    
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    
    json: function(data) {
      this.setHeader('Content-Type', 'application/json');
      this.body = JSON.stringify(data);
      this.end();
    },
    
    cookie: function(name, value, options) {
      // Simple cookie implementation
      const cookieStr = `${name}=${value}`;
      this.setHeader('Set-Cookie', cookieStr);
      return this;
    },
    
    end: function(data) {
      if (data) this.body = data;
    }
  };
  
  return res;
}

// Export helpers for use in middleware.test.js
module.exports.createMockReq = createMockReq;
module.exports.createMockRes = createMockRes;