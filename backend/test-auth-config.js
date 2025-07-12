#!/usr/bin/env node

const axios = require('axios');

// Change this to your server URL
const SERVER_URL = process.env.TEST_SERVER_URL || 'http://localhost:3000';

async function testAuthConfig() {
  console.log('Testing auth configuration...\n');
  
  try {
    // Test 1: Check configuration
    console.log('1. Testing configuration endpoint...');
    const configResponse = await axios.get(`${SERVER_URL}/api/auth/test-config`, {
      withCredentials: true,
      validateStatus: () => true
    });
    
    console.log('Configuration results:');
    console.log(JSON.stringify(configResponse.data, null, 2));
    console.log('\n---\n');
    
    // Test 2: Check if cookies are set
    console.log('2. Checking cookie headers...');
    const cookies = configResponse.headers['set-cookie'];
    if (cookies) {
      console.log('Cookies received:', cookies);
    } else {
      console.log('WARNING: No cookies were set by the server');
    }
    console.log('\n---\n');
    
    // Test 3: Make a second request with cookies
    console.log('3. Testing session persistence...');
    const axiosWithCookies = axios.create({
      withCredentials: true,
      baseURL: SERVER_URL,
      headers: {
        Cookie: cookies ? cookies.join('; ') : ''
      }
    });
    
    const sessionResponse = await axiosWithCookies.get('/api/auth/session-debug');
    console.log('Session debug results:');
    console.log(JSON.stringify(sessionResponse.data, null, 2));
    console.log('\n---\n');
    
    // Test 4: Database connection
    if (configResponse.data.database.poolStatus !== 'connected') {
      console.log('⚠️  WARNING: Database is not connected!');
      console.log('   Error:', configResponse.data.database.poolStatus);
      console.log('   This will prevent sessions from persisting.');
    } else {
      console.log('✅ Database connection is working');
    }
    
    // Test 5: Cookie configuration
    const cookieConfig = configResponse.data.cookies.actualConfig;
    console.log('\n4. Cookie configuration analysis:');
    
    if (cookieConfig.secure && !SERVER_URL.startsWith('https')) {
      console.log('⚠️  WARNING: Secure cookies are enabled but using HTTP');
      console.log('   Cookies will not work over HTTP with secure=true');
    }
    
    if (cookieConfig.sameSite === 'none' && !cookieConfig.secure) {
      console.log('⚠️  WARNING: sameSite=none requires secure=true');
    }
    
    if (!configResponse.data.cookies.COOKIE_DOMAIN) {
      console.log('ℹ️  INFO: No COOKIE_DOMAIN set, using default behavior');
    }
    
    console.log('\n5. Recommendations based on your setup:');
    console.log('Add these to your .env file:');
    console.log('---');
    console.log('# Disable SSL for PostgreSQL if getting SSL errors');
    console.log('PGSSL=false');
    console.log('DATABASE_SSL=false');
    console.log('');
    console.log('# For production with HTTPS:');
    console.log('SESSION_SECURE=true');
    console.log(`COOKIE_DOMAIN=${new URL(SERVER_URL).hostname}`);
    console.log('');
    console.log('# For testing without HTTPS:');
    console.log('SESSION_SECURE=false');
    console.log('NODE_ENV=development');
    console.log('---');
    
  } catch (error) {
    console.error('Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

// Run the test
testAuthConfig().catch(console.error);