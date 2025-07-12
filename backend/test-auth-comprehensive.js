#!/usr/bin/env node

const axios = require('axios');
const https = require('https');

// Configuration
const SERVER_URL = process.env.TEST_SERVER_URL || 'https://51.54.96.228';
const USE_LOCAL = process.env.USE_LOCAL === 'true';

// Create axios instance with proper config
const api = axios.create({
  baseURL: USE_LOCAL ? 'http://localhost:3000' : SERVER_URL,
  withCredentials: true,
  httpsAgent: SERVER_URL.startsWith('https') ? new https.Agent({
    rejectUnauthorized: false
  }) : undefined,
  validateStatus: () => true
});

async function runTests() {
  console.log(`\n=== Comprehensive Auth Testing Suite ===`);
  console.log(`Testing: ${USE_LOCAL ? 'LOCAL' : SERVER_URL}`);
  console.log(`Time: ${new Date().toISOString()}\n`);

  try {
    // Test 1: Environment Check
    console.log('1. Environment Configuration:');
    const envCheck = await api.get('/api/auth/check-env');
    console.log(JSON.stringify(envCheck.data, null, 2));
    console.log('\n---\n');

    // Test 2: Session Store
    console.log('2. Session Store Status:');
    const storeCheck = await api.get('/api/auth/test-store');
    console.log(JSON.stringify(storeCheck.data, null, 2));
    console.log('\n---\n');

    // Test 3: Auth Flow Test
    console.log('3. Auth Flow Test:');
    const flowTest = await api.get('/api/auth/test-flow');
    console.log(JSON.stringify(flowTest.data, null, 2));
    console.log('\n---\n');

    // Test 4: Cookie Test
    console.log('4. Cookie Test:');
    const cookieTest = await api.get('/api/auth/test-cookies');
    const cookies = cookieTest.headers['set-cookie'];
    console.log('Response:', JSON.stringify(cookieTest.data, null, 2));
    console.log('Set-Cookie headers:', cookies);
    console.log('\n---\n');

    // Test 5: OAuth State Test - Set
    console.log('5. OAuth State Test - Setting state:');
    const setState = await api.get('/api/auth/test-oauth-state?action=set', {
      headers: cookies ? { 'Cookie': cookies.join('; ') } : {}
    });
    console.log(JSON.stringify(setState.data, null, 2));
    const sessionCookie = setState.headers['set-cookie'] || cookies;
    console.log('\n---\n');

    // Test 6: OAuth State Test - Get (with cookie)
    console.log('6. OAuth State Test - Getting state (with cookie):');
    const getState = await api.get('/api/auth/test-oauth-state?action=get', {
      headers: sessionCookie ? { 'Cookie': sessionCookie.join ? sessionCookie.join('; ') : sessionCookie } : {}
    });
    console.log(JSON.stringify(getState.data, null, 2));
    console.log('\n---\n');

    // Analysis
    console.log('=== Analysis ===');
    const analysis = {
      environment: {
        configured: envCheck.data.environment.TRUST_PROXY === 'true' ? '✅' : '❌',
        issues: []
      },
      session: {
        working: flowTest.data.tests.sessionSave?.success ? '✅' : '❌',
        issues: []
      },
      cookies: {
        working: cookieTest.headers['set-cookie'] ? '✅' : '❌',
        issues: []
      },
      oauth: {
        working: getState.data.authState ? '✅' : '❌',
        issues: []
      }
    };

    // Check for issues
    if (envCheck.data.environment.TRUST_PROXY !== 'true' && !USE_LOCAL) {
      analysis.environment.issues.push('TRUST_PROXY not set to true');
    }
    if (!flowTest.data.tests.sessionSave?.success) {
      analysis.session.issues.push('Session not saving to database');
    }
    if (!cookieTest.headers['set-cookie']) {
      analysis.cookies.issues.push('No cookies being set');
    }
    if (!getState.data.authState && setState.data.saved) {
      analysis.oauth.issues.push('OAuth state not persisting across requests');
    }

    console.log('Environment:', analysis.environment.configured, analysis.environment.issues.join(', ') || 'No issues');
    console.log('Session:', analysis.session.working, analysis.session.issues.join(', ') || 'No issues');
    console.log('Cookies:', analysis.cookies.working, analysis.cookies.issues.join(', ') || 'No issues');
    console.log('OAuth State:', analysis.oauth.working, analysis.oauth.issues.join(', ') || 'No issues');

  } catch (error) {
    console.error('Test suite error:', error.message);
  }
}

// Command line usage
console.log('Usage:');
console.log('  Test production: node test-auth-comprehensive.js');
console.log('  Test local: USE_LOCAL=true node test-auth-comprehensive.js');
console.log('');

runTests().catch(console.error);