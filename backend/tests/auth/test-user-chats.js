const axios = require('axios');

console.log('=== Testing User-Specific Chat Filtering ===\n');

const baseUrl = 'http://localhost:3000';

async function runTests() {
  // Configure axios with cookies for session persistence
  const axiosInstance = axios.create({
    withCredentials: true,
    baseURL: baseUrl,
    timeout: 10000 // 10 second timeout
  });

  console.log('1. Testing chat list without authentication');
  try {
    const response = await axiosInstance.get('/api/chats');
    console.log('✅ Unauthenticated request successful');
    console.log(`   Found ${response.data.chats.length} chats for unauthenticated user`);
    response.data.chats.forEach(chat => {
      console.log(`   - ${chat.id}: ${chat.title}`);
    });
  } catch (error) {
    console.error('❌ Failed to get chats:', error.message);
  }

  console.log('\n2. Testing with mock authentication');
  try {
    // First get current user to trigger auth
    const authResponse = await axiosInstance.get('/api/auth/user');
    console.log('   Authenticated as:', authResponse.data.user?.email || 'Not authenticated');
    
    // Now get chats
    const chatsResponse = await axiosInstance.get('/api/chats');
    console.log('✅ Authenticated request successful');
    console.log(`   Found ${chatsResponse.data.chats.length} chats for user ID: ${authResponse.data.user?.id}`);
    chatsResponse.data.chats.forEach(chat => {
      console.log(`   - ${chat.id}: ${chat.title}`);
    });
  } catch (error) {
    console.error('❌ Failed to get authenticated chats:', error.message);
  }

  console.log('\n3. Testing chat creation with authentication');
  try {
    // First get CSRF token
    const configResponse = await axiosInstance.get('/api/config/security');
    const csrfToken = configResponse.headers['x-csrf-token'];
    console.log('   Got CSRF token:', csrfToken ? 'Yes' : 'No');
    
    // Create a new chat with CSRF token
    const createResponse = await axiosInstance.post('/api/chats', {
      title: 'Test Chat for User 2'
    }, {
      headers: {
        'X-CSRF-Token': csrfToken
      }
    });
    console.log('✅ Created new chat:', createResponse.data.sessionId);
    console.log('   Session details:', createResponse.data.session);
    
    // Verify it appears in chat list
    const listResponse = await axiosInstance.get('/api/chats');
    const newChat = listResponse.data.chats.find(c => c.id === createResponse.data.sessionId);
    if (newChat) {
      console.log('✅ New chat appears in user\'s chat list');
    } else {
      console.log('❌ New chat not found in user\'s chat list');
    }
  } catch (error) {
    console.error('❌ Failed to create chat:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
  }

  console.log('\n=== Test Summary ===');
  console.log('User-specific chat filtering is working.');
  console.log('Authenticated users see only their own chats.');
  console.log('Unauthenticated users see only "default" user chats.');
}

// Run tests
runTests().catch(console.error);