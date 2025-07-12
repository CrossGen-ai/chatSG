/**
 * Comprehensive Auth System Test for Local Development
 * This tests the authentication system without needing Azure AD
 */

const http = require('http');
const { Pool } = require('pg');

class AuthTester {
  constructor() {
    this.baseUrl = 'http://localhost:3000';
    this.sessionCookie = null;
    this.csrfToken = null;
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0
    };
  }

  // Color output helpers
  log(message, type = 'info') {
    const colors = {
      info: '\x1b[37m',
      success: '\x1b[32m',
      error: '\x1b[31m',
      warning: '\x1b[33m',
      header: '\x1b[36m'
    };
    console.log(`${colors[type]}${message}\x1b[0m`);
  }

  // Make HTTP request
  request(options) {
    return new Promise((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost',
        port: 3000,
        ...options,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...(this.sessionCookie && { 'Cookie': this.sessionCookie }),
          ...(this.csrfToken && options.method !== 'GET' && { 'X-CSRF-Token': this.csrfToken }),
          ...options.headers
        }
      }, (res) => {
        let body = '';
        
        // Capture cookies
        if (res.headers['set-cookie']) {
          res.headers['set-cookie'].forEach(cookie => {
            if (cookie.startsWith('chatsg_session=')) {
              this.sessionCookie = cookie.split(';')[0];
            }
          });
        }
        
        // Capture CSRF token
        if (res.headers['x-csrf-token']) {
          this.csrfToken = res.headers['x-csrf-token'];
        }
        
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const jsonBody = body ? JSON.parse(body) : null;
            resolve({ status: res.statusCode, headers: res.headers, body: jsonBody, rawBody: body });
          } catch {
            resolve({ status: res.statusCode, headers: res.headers, body: body, rawBody: body });
          }
        });
      });
      
      req.on('error', reject);
      
      if (options.data) {
        req.write(JSON.stringify(options.data));
      }
      
      req.end();
    });
  }

  // Test assertions
  assert(condition, passMessage, failMessage) {
    if (condition) {
      this.log(`✓ ${passMessage}`, 'success');
      this.results.passed++;
    } else {
      this.log(`✗ ${failMessage}`, 'error');
      this.results.failed++;
    }
  }

  warn(message) {
    this.log(`⚠ ${message}`, 'warning');
    this.results.warnings++;
  }

  async runTests() {
    this.log('\n╔══════════════════════════════════════════════════════╗', 'header');
    this.log('║     ChatSG Authentication System Test Suite          ║', 'header');
    this.log('╚══════════════════════════════════════════════════════╝\n', 'header');

    // Check environment
    await this.testEnvironment();
    
    // Test auth endpoints
    await this.testAuthEndpoints();
    
    // Test protected vs public endpoints
    await this.testEndpointProtection();
    
    // Test CSRF protection
    await this.testCSRFProtection();
    
    // Test session management
    await this.testSessionManagement();
    
    // Show results
    this.showResults();
  }

  async testEnvironment() {
    this.log('\n▶ Testing Environment Configuration', 'header');
    
    // Check mock auth setting
    const useMockAuth = process.env.USE_MOCK_AUTH === 'true';
    const environment = process.env.CHATSG_ENVIRONMENT;
    
    this.log(`  USE_MOCK_AUTH: ${process.env.USE_MOCK_AUTH || 'not set'}`);
    this.log(`  CHATSG_ENVIRONMENT: ${environment || 'not set'}`);
    
    if (!useMockAuth && environment === 'dev') {
      this.warn('Mock auth is disabled but environment is dev - this may cause issues');
    }
  }

  async testAuthEndpoints() {
    this.log('\n▶ Testing Authentication Endpoints', 'header');
    
    // Test 1: Current user endpoint
    const userCheck = await this.request({ path: '/api/auth/user', method: 'GET' });
    this.assert(
      userCheck.status === 200,
      'GET /api/auth/user returns 200',
      `GET /api/auth/user returned ${userCheck.status}`
    );
    
    if (userCheck.body?.isAuthenticated) {
      this.log(`  Authenticated as: ${userCheck.body.user.email}`);
    } else {
      this.log('  Not authenticated');
    }
    
    // Test 2: Login endpoint
    const loginCheck = await this.request({ path: '/api/auth/login', method: 'GET' });
    this.assert(
      loginCheck.status === 302 || loginCheck.status === 200,
      'GET /api/auth/login is accessible',
      `GET /api/auth/login returned ${loginCheck.status} - may be protected by middleware`
    );
    
    // Test 3: Logout endpoint
    const logoutCheck = await this.request({ path: '/api/auth/logout', method: 'POST' });
    this.assert(
      logoutCheck.status === 200,
      'POST /api/auth/logout is accessible',
      `POST /api/auth/logout returned ${logoutCheck.status}`
    );
  }

  async testEndpointProtection() {
    this.log('\n▶ Testing Endpoint Protection', 'header');
    
    const endpoints = [
      { path: '/api/memory/qdrant/2', method: 'GET', shouldBePublic: true },
      { path: '/api/chat/stream', method: 'POST', shouldBePublic: true },
      { path: '/api/chats', method: 'GET', shouldBePublic: false },
      { path: '/api/sessions', method: 'GET', shouldBePublic: false }
    ];
    
    // First, ensure we're logged out
    await this.request({ path: '/api/auth/logout', method: 'POST' });
    this.sessionCookie = null;
    
    for (const endpoint of endpoints) {
      const response = await this.request({ 
        path: endpoint.path, 
        method: endpoint.method,
        data: endpoint.method === 'POST' ? { test: true } : undefined
      });
      
      const isProtected = response.status === 401;
      
      if (endpoint.shouldBePublic) {
        this.assert(
          !isProtected,
          `${endpoint.path} is publicly accessible`,
          `${endpoint.path} requires authentication but should be public`
        );
      } else {
        this.assert(
          isProtected,
          `${endpoint.path} correctly requires authentication`,
          `${endpoint.path} is public but should require authentication`
        );
      }
    }
  }

  async testCSRFProtection() {
    this.log('\n▶ Testing CSRF Protection', 'header');
    
    // Get CSRF token
    const csrfInit = await this.request({ path: '/api/config/security', method: 'GET' });
    const hasCSRFToken = !!csrfInit.headers['x-csrf-token'];
    
    this.assert(
      hasCSRFToken,
      'CSRF token is provided in response headers',
      'CSRF token not found in response headers'
    );
    
    if (hasCSRFToken) {
      // Save current token
      const savedToken = this.csrfToken;
      this.csrfToken = null;
      
      // Try POST without CSRF token
      const badPost = await this.request({
        path: '/api/chat/stream',
        method: 'POST',
        data: { test: true }
      });
      
      // Chat stream endpoint might not enforce CSRF
      if (badPost.status === 403 || badPost.status === 400) {
        this.log('  ✓ POST without CSRF token was rejected', 'success');
      } else {
        this.warn('POST to /api/chat/stream without CSRF token was accepted - endpoint may not enforce CSRF');
      }
      
      // Restore token
      this.csrfToken = savedToken;
    }
  }

  async testSessionManagement() {
    this.log('\n▶ Testing Session Management', 'header');
    
    // Clear session
    this.sessionCookie = null;
    
    // Check if we're logged out
    const loggedOut = await this.request({ path: '/api/auth/user', method: 'GET' });
    const isLoggedOut = !loggedOut.body?.isAuthenticated;
    
    this.assert(
      isLoggedOut || process.env.USE_MOCK_AUTH === 'true',
      'Session cleared successfully or mock auth is enabled',
      'Still authenticated after clearing session'
    );
    
    // Try to get a new session
    const login = await this.request({ path: '/api/auth/login', method: 'GET' });
    const hasSessionCookie = !!this.sessionCookie;
    
    this.assert(
      hasSessionCookie,
      'New session cookie issued',
      'No session cookie received'
    );
  }

  showResults() {
    this.log('\n╔══════════════════════════════════════════════════════╗', 'header');
    this.log('║                   Test Results                       ║', 'header');
    this.log('╚══════════════════════════════════════════════════════╝', 'header');
    
    this.log(`\n  Passed: ${this.results.passed}`, 'success');
    this.log(`  Failed: ${this.results.failed}`, 'error');
    this.log(`  Warnings: ${this.results.warnings}`, 'warning');
    
    if (this.results.failed === 0) {
      this.log('\n✅ All tests passed!', 'success');
    } else {
      this.log('\n❌ Some tests failed. Check the output above.', 'error');
    }
    
    this.log('\n📝 Recommendations:', 'header');
    
    if (process.env.USE_MOCK_AUTH !== 'true') {
      this.log('  - For local testing, set USE_MOCK_AUTH=true in .env');
    }
    
    this.log('  - Ensure protected endpoints check req.isAuthenticated');
    this.log('  - Consider implementing role-based access control');
    this.log('  - Test with both mock auth and real Azure AD in staging\n');
  }
}

// Run the tests
const tester = new AuthTester();
tester.runTests().catch(console.error);