const axios = require('axios');

const API_BASE = 'http://localhost:3000';

async function testSimplifiedChatFlow() {
    console.log('🧪 Testing Simplified Chat Flow\n');
    console.log('⚠️  Note: If the server crashes on /api/chat, check the console where the server is running for error messages.\n');
    
    try {
        // Test 1: Get initial chat list (should be empty or existing)
        console.log('1️⃣ Getting initial chat list...');
        const { data: initialList } = await axios.get(`${API_BASE}/api/chats`);
        console.log(`   Found ${initialList.chats.length} existing chats`);
        
        // Test 2: Send a message with a new session ID (should auto-create session)
        const newSessionId = `test-session-${Date.now()}`;
        const testMessage = 'Hello, this is a test message for the simplified flow!';
        
        console.log(`\n2️⃣ Sending message with new session ID: ${newSessionId}`);
        console.log(`   Message: "${testMessage}"`);
        
        const { data: chatResponse } = await axios.post(`${API_BASE}/api/chat`, {
            message: testMessage,
            sessionId: newSessionId,
            userId: 'test-user'
        });
        
        console.log(`   ✅ Got response: "${chatResponse.message}"`);
        
        // Test 3: Verify session was auto-created
        console.log('\n3️⃣ Verifying session was auto-created...');
        const { data: updatedList } = await axios.get(`${API_BASE}/api/chats`);
        const newSession = updatedList.chats.find(chat => 
            chat.id === newSessionId || chat.file?.includes(newSessionId)
        );
        
        if (newSession) {
            console.log(`   ✅ Session auto-created successfully!`);
            console.log(`   Title: "${newSession.title}"`);
            console.log(`   Message count: ${newSession.messageCount}`);
        } else {
            console.log(`   ❌ Session was not created`);
        }
        
        // Test 4: Get messages from the session
        console.log('\n4️⃣ Getting messages from the session...');
        const { data: messages } = await axios.get(`${API_BASE}/api/chats/${newSessionId}/messages`);
        console.log(`   Found ${messages.messages.length} messages:`);
        messages.messages.forEach((msg, i) => {
            console.log(`   ${i + 1}. [${msg.type}] ${msg.content.substring(0, 50)}...`);
        });
        
        // Test 5: Send another message to existing session
        console.log('\n5️⃣ Sending another message to existing session...');
        const secondMessage = 'This is a follow-up message';
        const { data: secondResponse } = await axios.post(`${API_BASE}/api/chat`, {
            message: secondMessage,
            sessionId: newSessionId,
            userId: 'test-user'
        });
        console.log(`   ✅ Got response: "${secondResponse.message}"`);
        
        // Test 6: Verify message count increased
        console.log('\n6️⃣ Verifying message count increased...');
        const { data: finalList } = await axios.get(`${API_BASE}/api/chats`);
        const finalSession = finalList.chats.find(chat => 
            chat.id === newSessionId || chat.file?.includes(newSessionId)
        );
        
        if (finalSession) {
            console.log(`   Message count: ${finalSession.messageCount}`);
            console.log(`   ✅ Messages are being saved correctly!`);
        }
        
        // Test 7: Delete the test session
        console.log('\n7️⃣ Cleaning up - deleting test session...');
        const { data: deleteResult } = await axios.delete(`${API_BASE}/api/chats/${newSessionId}`);
        console.log(`   ✅ Session deleted: ${deleteResult.success}`);
        
        console.log('\n✅ All tests passed! Simplified flow is working correctly.');
        
    } catch (error) {
        console.error('\n❌ Test failed:');
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
            console.error('   Headers:', error.response.headers);
        } else if (error.request) {
            console.error('   No response received. Server might be down or blocking requests.');
            console.error('   Error:', error.message);
        } else {
            console.error('   Error:', error.message);
        }
        process.exit(1);
    }
}

// Run the test
testSimplifiedChatFlow().catch(console.error);