const axios = require('axios');

// Test performance with large message lists
async function testPerformance() {
  console.log('Testing chat performance with large message lists...\n');
  
  const API_BASE = 'http://localhost:3000/api';
  
  try {
    // Create a test session
    console.log('1. Creating test session...');
    const createResponse = await axios.post(`${API_BASE}/sessions`, {
      title: 'Performance Test Session',
      userId: 'test-user',
      metadata: {}
    });
    
    const sessionId = createResponse.data.sessionId;
    console.log(`   Created session: ${sessionId}`);
    
    // Add many messages to simulate a long chat
    console.log('\n2. Adding 100 test messages...');
    for (let i = 0; i < 100; i++) {
      // Alternate between user and assistant messages
      if (i % 2 === 0) {
        await axios.post(`${API_BASE}/chat`, {
          message: `Test message ${i + 1}: This is a longer message to test rendering performance with varying content lengths. Sometimes messages can be quite long and contain multiple sentences.`,
          sessionId: sessionId
        });
      }
      
      // Show progress every 10 messages
      if ((i + 1) % 10 === 0) {
        console.log(`   Added ${i + 1} messages...`);
      }
    }
    
    console.log('\n3. Fetching chat history...');
    const startTime = Date.now();
    const historyResponse = await axios.get(`${API_BASE}/sessions/${sessionId}/messages`);
    const fetchTime = Date.now() - startTime;
    
    console.log(`   Fetched ${historyResponse.data.messages.length} messages in ${fetchTime}ms`);
    
    console.log('\n✅ Performance test completed!');
    console.log('   - Session ID:', sessionId);
    console.log('   - Total messages:', historyResponse.data.messages.length);
    console.log('   - Fetch time:', fetchTime + 'ms');
    console.log('\nNow switch between chats in the UI to test rendering performance.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testPerformance();