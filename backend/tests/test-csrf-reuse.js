const http = require('http');

async function makeRequest(path) {
  return new Promise((resolve, reject) => {
    http.get({
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET'
    }, (res) => {
      const token = res.headers['x-csrf-token'];
      resolve(token);
    }).on('error', reject);
  });
}

async function testTokenReuse() {
  console.log('Testing CSRF token reuse...\n');
  
  // Make multiple requests
  const token1 = await makeRequest('/api/config/security');
  console.log('Request 1 token:', token1 ? token1.substring(0, 20) + '...' : 'none');
  
  const token2 = await makeRequest('/api/config/markdown');
  console.log('Request 2 token:', token2 ? token2.substring(0, 20) + '...' : 'none');
  
  const token3 = await makeRequest('/api/config/security');
  console.log('Request 3 token:', token3 ? token3.substring(0, 20) + '...' : 'none');
  
  const token4 = await makeRequest('/api/config/markdown');
  console.log('Request 4 token:', token4 ? token4.substring(0, 20) + '...' : 'none');
  
  // Check if tokens are the same
  console.log('\nToken comparison:');
  console.log('Token 1 === Token 2:', token1 === token2);
  console.log('Token 2 === Token 3:', token2 === token3);
  console.log('Token 3 === Token 4:', token3 === token4);
  console.log('All tokens same:', token1 === token2 && token2 === token3 && token3 === token4);
  
  if (token1 === token2 && token2 === token3 && token3 === token4) {
    console.log('\n✅ SUCCESS: Tokens are being reused properly!');
  } else {
    console.log('\n❌ FAIL: Tokens are still being regenerated');
  }
}

testTokenReuse().catch(console.error);