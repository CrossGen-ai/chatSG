/**
 * Burst Rate Limit Test
 * Sends many requests as fast as possible to trigger rate limiting
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function burstTest() {
  console.log('💥 Burst Rate Limit Test\n');
  console.log('Sending 200 requests as fast as possible...\n');
  
  let allowed = 0;
  let blocked = 0;
  const promises = [];
  
  // Send 200 requests in parallel (much faster)
  for (let i = 1; i <= 200; i++) {
    promises.push(
      axios.get(`${BASE_URL}/api/config/security`, {
        validateStatus: () => true
      }).then(response => {
        if (response.status === 200) {
          allowed++;
        } else if (response.status === 429) {
          blocked++;
          return i; // Return request number that was blocked
        }
        return null;
      })
    );
  }
  
  console.log('All requests sent! Waiting for responses...\n');
  const results = await Promise.all(promises);
  
  // Find which requests were blocked
  const blockedRequests = results.filter(r => r !== null);
  
  console.log('='.repeat(40));
  console.log('📊 RESULTS');
  console.log('='.repeat(40));
  console.log(`✅ Allowed requests: ${allowed}`);
  console.log(`❌ Blocked requests: ${blocked}`);
  console.log(`📊 Total requests: 200`);
  
  if (blocked > 0) {
    console.log('\n🎉 SUCCESS! Rate limiting is working!');
    console.log(`   First blocked request: #${Math.min(...blockedRequests)}`);
    console.log(`   Your rate limit appears to be around ${allowed} requests`);
  } else {
    console.log('\n⚠️  No requests were blocked!');
    console.log('\nThis might mean:');
    console.log('1. Rate limit is higher than 200 requests');
    console.log('2. Rate limiting might not be enabled');
    console.log('3. The rate limit window might be per-second, not per-15-minutes');
  }
  
  // Let's also check the headers from one request
  console.log('\n📋 Checking response headers for rate limit info...');
  try {
    const testResponse = await axios.get(`${BASE_URL}/api/config/security`);
    const rateLimitHeaders = Object.entries(testResponse.headers)
      .filter(([key]) => key.toLowerCase().includes('rate') || key.toLowerCase().includes('limit'));
    
    if (rateLimitHeaders.length > 0) {
      console.log('Rate limit headers found:');
      rateLimitHeaders.forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
      });
    } else {
      console.log('No rate limit headers found in response');
    }
  } catch (error) {
    console.log('Could not check headers');
  }
}

// Main
console.log('Starting burst test...\n');

burstTest()
  .then(() => {
    console.log('\n✅ Test complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });