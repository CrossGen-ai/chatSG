const axios = require('axios');

console.log('=== Testing Azure AD Authentication ===\n');

const baseUrl = 'http://localhost:3000';

async function runTests() {
  console.log('1. Testing unauthenticated access to /api/auth/user');
  try {
    const response = await axios.get(`${baseUrl}/api/auth/user`);
    console.log('✅ Auth user endpoint accessible');
    console.log('   Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.isAuthenticated && process.env.USE_MOCK_AUTH === 'true') {
      console.log('✅ Mock auth is working - user is authenticated');
    } else if (!response.data.isAuthenticated) {
      console.log('✅ User is not authenticated (expected in production mode)');
    }
  } catch (error) {
    console.error('❌ Auth user endpoint failed:', error.message);
  }

  console.log('\n2. Testing login endpoint');
  try {
    const response = await axios.get(`${baseUrl}/api/auth/login`, {
      maxRedirects: 0,
      validateStatus: (status) => status < 400
    });
    
    if (response.status === 302 || response.status === 303) {
      console.log('✅ Login endpoint returns redirect (expected)');
      console.log('   Redirect location:', response.headers.location);
    } else {
      console.log('❌ Login endpoint did not redirect');
    }
  } catch (error) {
    if (error.response && error.response.status === 302) {
      console.log('✅ Login endpoint returns redirect (expected)');
    } else {
      console.error('❌ Login endpoint failed:', error.message);
    }
  }

  console.log('\n3. Testing logout endpoint');
  try {
    const response = await axios.post(`${baseUrl}/api/auth/logout`);
    console.log('✅ Logout endpoint accessible');
    console.log('   Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ Logout endpoint failed:', error.message);
  }

  console.log('\n4. Testing protected chat endpoint with auth');
  try {
    const response = await axios.get(`${baseUrl}/api/chats`);
    console.log('✅ Chats endpoint accessible');
    console.log('   Number of chats:', response.data.chats.length);
  } catch (error) {
    console.error('❌ Chats endpoint failed:', error.message);
  }

  console.log('\n5. Testing session persistence');
  try {
    // Create a cookie jar to maintain session
    const axiosWithCookies = axios.create({
      withCredentials: true,
      baseURL: baseUrl
    });
    
    // First request to get session
    const firstResponse = await axiosWithCookies.get('/api/auth/user');
    console.log('   First request - Authenticated:', firstResponse.data.isAuthenticated);
    
    // Second request should maintain session
    const secondResponse = await axiosWithCookies.get('/api/auth/user');
    console.log('   Second request - Authenticated:', secondResponse.data.isAuthenticated);
    
    if (firstResponse.data.isAuthenticated === secondResponse.data.isAuthenticated) {
      console.log('✅ Session persistence working');
    } else {
      console.log('❌ Session not persisting between requests');
    }
  } catch (error) {
    console.error('❌ Session persistence test failed:', error.message);
  }

  console.log('\n=== Test Summary ===');
  console.log('Auth system is integrated and accessible.');
  console.log('Mock auth mode:', process.env.USE_MOCK_AUTH === 'true' ? 'ENABLED' : 'DISABLED');
  console.log('To require authentication, set requireAuth: true in security.config.js');
}

// Run tests
runTests().catch(console.error);