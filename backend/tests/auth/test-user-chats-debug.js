const axios = require('axios');

console.log('=== Testing User-Specific Chat Creation (Debug) ===\n');

const baseUrl = 'http://localhost:3000';

async function runTest() {
  // Configure axios with cookies for session persistence
  const axiosInstance = axios.create({
    withCredentials: true,
    baseURL: baseUrl,
    timeout: 10000 // 10 second timeout
  });

  console.log('1. Getting CSRF token...');
  try {
    const configResponse = await axiosInstance.get('/api/config/security');
    const csrfToken = configResponse.headers['x-csrf-token'];
    console.log('   Got CSRF token:', csrfToken ? csrfToken.substring(0, 20) + '...' : 'None');
    
    console.log('\n2. Creating a new chat with CSRF token...');
    const startTime = Date.now();
    
    const createResponse = await axiosInstance.post('/api/chats', {
      title: 'Test Chat for User 2'
    }, {
      headers: {
        'X-CSRF-Token': csrfToken
      }
    });
    
    const duration = Date.now() - startTime;
    console.log(`✅ Created new chat in ${duration}ms:`, createResponse.data.sessionId);
    console.log('   Session details:', JSON.stringify(createResponse.data.session, null, 2));
    
  } catch (error) {
    console.error('❌ Failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Response:', error.response.data);
    }
    if (error.code === 'ECONNABORTED') {
      console.error('   Request timed out after 10 seconds');
    }
  }
}

// Run test
runTest().catch(console.error);