const axios = require('axios');

console.log('=== Quick Rate Limiting Test ===\n');

const baseUrl = 'http://localhost:3000';

async function testRateLimit() {
  console.log('Testing rate limit (10 requests per minute per IP)...\n');
  
  const axiosInstance = axios.create({
    baseURL: baseUrl,
    timeout: 5000
  });
  
  let successCount = 0;
  let rateLimitedCount = 0;
  
  // Make 15 rapid requests
  console.log('Sending 15 rapid requests to /api/config/security...');
  
  for (let i = 1; i <= 15; i++) {
    try {
      const response = await axiosInstance.get('/api/config/security');
      if (response.status === 200) {
        successCount++;
        console.log(`  Request ${i}: ✅ Success`);
      }
    } catch (error) {
      if (error.response?.status === 429) {
        rateLimitedCount++;
        console.log(`  Request ${i}: 🚫 Rate limited (429)`);
      } else {
        console.log(`  Request ${i}: ❌ Error - ${error.message}`);
      }
    }
    
    // Small delay to ensure requests are processed
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  console.log('\n=== Results ===');
  console.log(`Successful requests: ${successCount}`);
  console.log(`Rate limited requests: ${rateLimitedCount}`);
  console.log(`Total: ${successCount + rateLimitedCount}`);
  
  if (successCount <= 10 && rateLimitedCount > 0) {
    console.log('\n✅ Rate limiting is working correctly!');
    console.log('   (Allowed up to 10 requests, then started blocking)');
  } else if (successCount === 15) {
    console.log('\n⚠️  Rate limiting may not be working');
    console.log('   All 15 requests succeeded');
  } else {
    console.log('\n🤔 Unexpected results - check rate limit configuration');
  }
  
  // Test SSE endpoint rate limit
  console.log('\n\nTesting SSE endpoint rate limit (5 connections per IP)...');
  
  const connections = [];
  let sseSuccessCount = 0;
  let sseRateLimitedCount = 0;
  
  // Try to open 7 SSE connections
  for (let i = 1; i <= 7; i++) {
    try {
      const response = await fetch(`${baseUrl}/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: 'test',
          sessionId: `test-${i}`
        })
      });
      
      if (response.ok) {
        sseSuccessCount++;
        console.log(`  SSE Connection ${i}: ✅ Opened`);
        connections.push(response);
      } else if (response.status === 429) {
        sseRateLimitedCount++;
        console.log(`  SSE Connection ${i}: 🚫 Rate limited (429)`);
      }
    } catch (error) {
      console.log(`  SSE Connection ${i}: ❌ Error - ${error.message}`);
    }
  }
  
  console.log('\n=== SSE Results ===');
  console.log(`Successful connections: ${sseSuccessCount}`);
  console.log(`Rate limited connections: ${sseRateLimitedCount}`);
  
  if (sseSuccessCount <= 5 && sseRateLimitedCount > 0) {
    console.log('\n✅ SSE rate limiting is working correctly!');
    console.log('   (Allowed up to 5 connections, then started blocking)');
  } else {
    console.log('\n⚠️  SSE rate limiting may not be working');
  }
}

testRateLimit().catch(console.error);