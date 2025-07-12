#!/usr/bin/env node

const axios = require('axios');

// Test both local and production
const SERVERS = {
  local: 'http://localhost:3000',
  production: 'https://51.54.96.228'
};

async function testProxyHeaders(serverName, serverUrl) {
  console.log(`\n=== Testing ${serverName} (${serverUrl}) ===\n`);
  
  try {
    // Test 1: Normal request
    console.log('1. Normal request to test-config:');
    const normalResponse = await axios.get(`${serverUrl}/api/auth/test-config`, {
      validateStatus: () => true,
      httpsAgent: serverUrl.startsWith('https') ? new (require('https').Agent)({
        rejectUnauthorized: false
      }) : undefined
    });
    
    console.log('Proxy info:', JSON.stringify(normalResponse.data.proxy, null, 2));
    console.log('Session config:', JSON.stringify(normalResponse.data.session, null, 2));
    console.log('');
    
    // Test 2: Request with proxy headers (simulating Azure Gateway)
    console.log('2. Request with simulated proxy headers:');
    const proxyResponse = await axios.get(`${serverUrl}/api/auth/test-config`, {
      headers: {
        'X-Forwarded-Proto': 'https',
        'X-Forwarded-For': '51.54.96.228, 10.2.0.1',
        'X-Original-Host': '51.54.96.228'
      },
      validateStatus: () => true,
      httpsAgent: serverUrl.startsWith('https') ? new (require('https').Agent)({
        rejectUnauthorized: false
      }) : undefined
    });
    
    console.log('Proxy info with headers:', JSON.stringify(proxyResponse.data.proxy, null, 2));
    console.log('');
    
    // Test 3: Check if cookies would be set
    console.log('3. Cookie analysis:');
    const cookieConfig = normalResponse.data.cookies.actualConfig;
    console.log('Cookie config:', JSON.stringify(cookieConfig, null, 2));
    
    if (cookieConfig.secure && !normalResponse.data.proxy.connectionEncrypted) {
      console.log('⚠️  WARNING: Cookies are secure but connection not detected as encrypted!');
      console.log('   This will prevent cookies from being set.');
      if (!normalResponse.data.proxy.xForwardedProto) {
        console.log('   Azure Gateway may not be sending X-Forwarded-Proto header.');
      }
    } else {
      console.log('✅ Cookie configuration appears correct');
    }
    
  } catch (error) {
    console.error(`Error testing ${serverName}:`, error.message);
  }
}

async function runTests() {
  // Test local first
  await testProxyHeaders('Local', SERVERS.local);
  
  // Then test production
  await testProxyHeaders('Production', SERVERS.production);
  
  console.log('\n=== Recommendations ===');
  console.log('1. Ensure Azure Gateway sends X-Forwarded-Proto: https header');
  console.log('2. Set TRUST_PROXY=true in production .env');
  console.log('3. Verify COOKIE_DOMAIN matches your domain');
  console.log('4. Check Azure Gateway configuration for header passthrough');
}

runTests().catch(console.error);