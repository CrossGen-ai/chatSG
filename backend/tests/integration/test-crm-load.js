/**
 * CRM Load Test
 * Tests rate limiting and concurrent request handling
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

console.log('=== CRM Load Test ===\n');

async function loadTest() {
  const { InsightlyApiTool } = require('../../dist/src/tools/crm/InsightlyApiTool');
  
  console.log('Testing rate limiting with 20 concurrent requests...');
  console.log('(Insightly limit: 10 requests/second)\n');
  
  const api = new InsightlyApiTool();
  await api.initialize();
  
  // Create 20 concurrent requests
  const requests = [];
  const startTime = Date.now();
  
  for (let i = 0; i < 20; i++) {
    requests.push(
      api.searchContacts({ limit: 1 })
        .then(() => {
          const elapsed = Date.now() - startTime;
          console.log(`✅ Request ${i + 1} completed at ${elapsed}ms`);
          return { success: true, time: elapsed };
        })
        .catch(err => {
          const elapsed = Date.now() - startTime;
          console.log(`❌ Request ${i + 1} failed at ${elapsed}ms:`, err.message);
          return { success: false, time: elapsed, error: err.message };
        })
    );
  }
  
  // Wait for all requests
  const results = await Promise.all(requests);
  const totalTime = Date.now() - startTime;
  
  // Analyze results
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log('\n=== Results ===');
  console.log(`Total requests: 20`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total time: ${totalTime}ms`);
  console.log(`Average time: ${Math.round(totalTime / 20)}ms per request`);
  
  // Check if rate limiting worked
  if (totalTime >= 2000) {
    console.log('\n✅ Rate limiting is working correctly!');
    console.log('   (20 requests at 10/sec should take at least 2 seconds)');
  } else {
    console.log('\n⚠️  Rate limiting may not be working properly');
  }
}

loadTest().catch(err => {
  console.error('❌ Load test failed:', err);
  process.exit(1);
});