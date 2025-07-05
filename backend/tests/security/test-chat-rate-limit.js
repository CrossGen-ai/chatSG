const axios = require('axios');

console.log('=== Testing Rate Limit on Chat Creation ===\n');

const baseUrl = 'http://localhost:3000';

async function testChatRateLimit() {
  const axiosInstance = axios.create({
    withCredentials: true,
    baseURL: baseUrl,
    timeout: 5000
  });
  
  // Get CSRF token once
  const configResponse = await axiosInstance.get('/api/config/security');
  const csrfToken = configResponse.headers['x-csrf-token'];
  
  console.log('Testing rate limit by creating multiple chats rapidly...\n');
  
  let successCount = 0;
  let rateLimitedCount = 0;
  let errorCount = 0;
  
  // Try to create 15 chats rapidly
  for (let i = 1; i <= 15; i++) {
    try {
      await axiosInstance.post('/api/chats', {
        title: `Rate Limit Test ${i}`
      }, {
        headers: {
          'X-CSRF-Token': csrfToken
        }
      });
      successCount++;
      console.log(`  Chat ${i}: ✅ Created`);
    } catch (error) {
      if (error.response?.status === 429) {
        rateLimitedCount++;
        console.log(`  Chat ${i}: 🚫 Rate limited (429)`);
      } else {
        errorCount++;
        console.log(`  Chat ${i}: ❌ Error - ${error.response?.status || error.message}`);
      }
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  console.log('\n=== Results ===');
  console.log(`Created: ${successCount} chats`);
  console.log(`Rate limited: ${rateLimitedCount} requests`);
  console.log(`Errors: ${errorCount}`);
  
  if (rateLimitedCount > 0) {
    console.log('\n✅ Rate limiting is working!');
  } else if (successCount === 15) {
    console.log('\n⚠️  No rate limiting detected - all requests succeeded');
  }
}

// Enable mock auth for testing
process.env.USE_MOCK_AUTH = 'true';

testChatRateLimit().catch(console.error);