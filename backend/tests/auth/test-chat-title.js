const axios = require('axios');

console.log('=== Testing Chat Title Sanitization ===\n');

const baseUrl = 'http://localhost:3000';
let testsPassed = 0;
let testsFailed = 0;

async function testChatTitle(title, expectedTitle, description, expectError = false) {
  const axiosInstance = axios.create({
    withCredentials: true,
    baseURL: baseUrl,
    timeout: 10000
  });

  try {
    // Get CSRF token
    const configResponse = await axiosInstance.get('/api/config/security');
    const csrfToken = configResponse.headers['x-csrf-token'];
    
    // Create a new chat
    const createResponse = await axiosInstance.post('/api/chats', {
      title: title
    }, {
      headers: {
        'X-CSRF-Token': csrfToken
      }
    });
    
    if (expectError) {
      console.log(`❌ ${description}`);
      console.log(`   Expected error but request succeeded`);
      testsFailed++;
      return false;
    }
    
    const actualTitle = createResponse.data.session.title;
    const passed = actualTitle === expectedTitle;
    
    if (passed) {
      console.log(`✅ ${description}`);
      console.log(`   Input: "${title}"`);
      console.log(`   Output: "${actualTitle}"`);
      testsPassed++;
    } else {
      console.log(`❌ ${description}`);
      console.log(`   Input: "${title}"`);
      console.log(`   Expected: "${expectedTitle}"`);
      console.log(`   Actual: "${actualTitle}"`);
      testsFailed++;
    }
    
    return passed;
    
  } catch (error) {
    if (expectError && error.response?.status === 400) {
      console.log(`✅ ${description}`);
      console.log(`   Input: "${title}"`);
      console.log(`   Result: Request blocked with 400 error`);
      testsPassed++;
      return true;
    } else {
      console.error(`❌ ${description} - Error:`, error.message);
      testsFailed++;
      return false;
    }
  }
}

async function runTests() {
  console.log('1. Testing normal text title');
  await testChatTitle('Test Chat Title', 'Test Chat Title', 'Normal text should pass through unchanged');
  
  console.log('\n2. Testing HTML injection blocking');
  await testChatTitle('<script>alert("XSS")</script>Chat', null, 'HTML injection should be blocked', true);
  
  console.log('\n3. Testing special characters');
  await testChatTitle('Chat with @#$% symbols!', 'Chat with @#$% symbols!', 'Special characters should be preserved');
  
  console.log('\n4. Testing empty title fallback');
  await testChatTitle('', 'New Chat', 'Empty title should default to "New Chat"');
  
  console.log('\n5. Testing whitespace handling');
  await testChatTitle('  Trimmed Title  ', 'Trimmed Title', 'Extra whitespace should be trimmed');
  
  console.log('\n=== Test Summary ===');
  console.log(`Passed: ${testsPassed}`);
  console.log(`Failed: ${testsFailed}`);
  
  if (testsFailed > 0) {
    console.log('\n❌ Some tests failed! Title sanitization may have issues.');
    process.exit(1);
  } else {
    console.log('\n✅ All title sanitization tests passed!');
  }
}

runTests().catch(error => {
  console.error('Test suite error:', error);
  process.exit(1);
});