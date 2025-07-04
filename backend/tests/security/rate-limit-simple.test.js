/**
 * Simple Rate Limit Test
 * Tests rate limiting using the /health endpoint (no LLM, no memory)
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testRateLimit() {
  console.log('🚦 Simple Rate Limit Test\n');
  console.log('This test uses the /api/config/security endpoint - no LLM calls, no memory changes!\n');
  
  // Current config: 100 requests per 15 minutes
  console.log('Your current rate limit: 100 requests per 15 minutes');
  console.log('Test plan: Send 110 requests rapidly\n');
  
  let allowed = 0;
  let blocked = 0;
  
  console.log('Sending requests...');
  
  // Send 110 requests as fast as possible
  for (let i = 1; i <= 110; i++) {
    try {
      const response = await axios.get(`${BASE_URL}/api/config/security`, {
        validateStatus: () => true // Don't throw on any status
      });
      
      if (response.status === 200) {
        allowed++;
      } else if (response.status === 429) {
        blocked++;
        console.log(`\n🛑 Request #${i} was BLOCKED! Rate limit is working!`);
      }
      
      // Progress indicator every 10 requests
      if (i % 10 === 0 && response.status === 200) {
        process.stdout.write(`✓ ${i} `);
      }
    } catch (error) {
      console.error(`\nError on request ${i}:`, error.message);
    }
  }
  
  console.log('\n\n' + '='.repeat(40));
  console.log('📊 RESULTS');
  console.log('='.repeat(40));
  console.log(`✅ Allowed requests: ${allowed}`);
  console.log(`❌ Blocked requests: ${blocked}`);
  console.log(`📊 Total requests: ${allowed + blocked}`);
  
  if (blocked > 0) {
    console.log('\n🎉 SUCCESS! Rate limiting is working!');
    console.log(`   After ${allowed} requests, the server started blocking.`);
  } else {
    console.log('\n⚠️  No requests were blocked.');
    console.log('   Possible reasons:');
    console.log('   - Rate limit might be higher than 110');
    console.log('   - Rate limiting might be disabled');
    console.log('   - Try running the test again immediately');
  }
}

// Main
console.log('Starting rate limit test...');
console.log('This only tests the /api/config/security endpoint.\n');

testRateLimit()
  .then(() => {
    console.log('\n✅ Test complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });