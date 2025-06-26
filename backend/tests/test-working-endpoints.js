const axios = require('axios');

const API_BASE = 'http://localhost:3000';

async function testWorkingEndpoints() {
    console.log('🧪 Testing Working Endpoints\n');
    
    try {
        // Test 1: Get chat list
        console.log('1️⃣ Testing GET /api/chats...');
        const { data: chatList } = await axios.get(`${API_BASE}/api/chats`);
        console.log(`   ✅ Found ${chatList.chats.length} chats`);
        if (chatList.chats.length > 0) {
            console.log('   First chat:', chatList.chats[0]);
        }
        
        // Test 2: Get messages from a session if one exists
        if (chatList.chats.length > 0) {
            const sessionId = chatList.chats[0].id;
            console.log(`\n2️⃣ Testing GET /api/chats/${sessionId}/messages...`);
            const { data: messages } = await axios.get(`${API_BASE}/api/chats/${sessionId}/messages`);
            console.log(`   ✅ Found ${messages.messages.length} messages`);
            console.log(`   Total messages: ${messages.totalMessages}`);
            console.log(`   Has more: ${messages.hasMore}`);
        }
        
        // Test 3: Delete a chat
        const testSessionId = `test-delete-${Date.now()}`;
        console.log(`\n3️⃣ Testing DELETE /api/chats/${testSessionId}...`);
        const { data: deleteResult } = await axios.delete(`${API_BASE}/api/chats/${testSessionId}`);
        console.log(`   ✅ Delete result:`, deleteResult);
        
        console.log('\n✅ All working endpoints tested successfully!');
        console.log('\n⚠️  Note: The POST /api/chat endpoint appears to have issues and needs debugging.');
        
    } catch (error) {
        console.error('\n❌ Test failed:');
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        } else {
            console.error('   Error:', error.message);
        }
        process.exit(1);
    }
}

// Run the test
testWorkingEndpoints().catch(console.error);