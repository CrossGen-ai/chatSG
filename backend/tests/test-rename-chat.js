const axios = require('axios');

const API_URL = 'http://localhost:3000';

async function testRenameChat() {
    console.log('Testing chat rename functionality...\n');

    try {
        // Step 1: Create a test chat
        console.log('1. Creating test chat...');
        const createResponse = await axios.post(`${API_URL}/api/chats`, {
            title: 'Test Chat Original Title',
            metadata: {}
        });
        
        const chatId = createResponse.data.sessionId;
        console.log(`   ✓ Created chat: ${chatId}`);
        console.log(`   Title: ${createResponse.data.session.title}\n`);

        // Step 2: Rename the chat
        console.log('2. Renaming chat...');
        const newTitle = 'Test Chat Renamed Title';
        const renameResponse = await axios.patch(`${API_URL}/api/chats/${chatId}`, {
            title: newTitle
        });

        console.log(`   ✓ Rename response:`, renameResponse.data);
        
        // Step 3: Verify the rename by fetching all chats
        console.log('\n3. Fetching all chats to verify rename...');
        const chatsResponse = await axios.get(`${API_URL}/api/chats`);
        const renamedChat = chatsResponse.data.chats.find(chat => chat.id === chatId);
        
        if (renamedChat && renamedChat.title === newTitle) {
            console.log(`   ✓ Chat successfully renamed to: "${renamedChat.title}"`);
        } else {
            console.log(`   ✗ Rename failed - chat title is: "${renamedChat?.title || 'not found'}"`);
        }

        // Step 4: Clean up - delete the test chat
        console.log('\n4. Cleaning up test chat...');
        await axios.delete(`${API_URL}/api/chats/${chatId}`);
        console.log('   ✓ Test chat deleted');

        console.log('\n✅ Test completed successfully!');
    } catch (error) {
        console.error('\n❌ Test failed:', error.response?.data || error.message);
        if (error.response?.status === 401) {
            console.log('\nNote: This test requires authentication to be disabled or a valid session.');
        }
    }
}

// Run the test
testRenameChat();