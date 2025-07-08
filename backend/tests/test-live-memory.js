const axios = require('axios');

async function testLiveMemory() {
    console.log('=== Testing Live Memory System ===\n');
    
    const sessionId = 'test-memory-' + Date.now();
    const baseUrl = 'http://localhost:3000';
    
    try {
        // Send a chat message
        console.log('1. Sending chat message...');
        const chatResponse = await axios.post(`${baseUrl}/api/chat`, {
            message: 'Hello, my name is Sean and I work at OpenAI',
            sessionId: sessionId
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('   Response:', chatResponse.data.message.substring(0, 100) + '...');
        console.log('   Memory status:', chatResponse.data._memoryStatus);
        
        // Wait a bit
        console.log('\n2. Waiting 3 seconds...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Send another message asking about the name
        console.log('\n3. Asking about name...');
        const nameResponse = await axios.post(`${baseUrl}/api/chat`, {
            message: 'What is my name and where do I work?',
            sessionId: sessionId
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('   Response:', nameResponse.data.message);
        console.log('   Memory status:', nameResponse.data._memoryStatus);
        
        // Check session details
        console.log('\n4. Checking session details...');
        const sessionsResponse = await axios.get(`${baseUrl}/api/chats`);
        const testSession = sessionsResponse.data.find(s => s.id === sessionId);
        
        if (testSession) {
            console.log('   Session found:', {
                id: testSession.id,
                title: testSession.title,
                messageCount: testSession.messageCount,
                metadata: testSession.metadata
            });
        } else {
            console.log('   Session not found in list');
        }
        
    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
}

testLiveMemory().then(() => {
    console.log('\n=== Test Complete ===');
    process.exit(0);
}).catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});