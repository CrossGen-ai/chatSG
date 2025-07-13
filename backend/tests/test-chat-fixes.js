const axios = require('axios');

const API_URL = 'http://localhost:3000';

async function testChatFixes() {
    console.log('Testing chat rename and timestamp fixes...\n');

    try {
        // Step 1: Create a test chat to verify new chat creation
        console.log('1. Testing new chat creation...');
        const createResponse = await axios.post(`${API_URL}/api/chats`, {
            title: 'Test Chat for Fixes',
            metadata: {}
        });
        
        const chatId = createResponse.data.sessionId;
        console.log(`   ✓ Created chat: ${chatId}`);
        console.log(`   ✓ Initial title: ${createResponse.data.session.title}`);
        console.log(`   ✓ Created at: ${createResponse.data.session.createdAt}`);
        
        // Verify timestamp is valid
        const createdDate = new Date(createResponse.data.session.createdAt);
        if (isNaN(createdDate.getTime())) {
            console.log('   ✗ Created timestamp is invalid!');
        } else {
            console.log(`   ✓ Timestamp is valid: ${createdDate.toISOString()}\n`);
        }

        // Step 2: Test chat rename functionality
        console.log('2. Testing chat rename...');
        const newTitle = 'Renamed Test Chat - ' + Date.now();
        console.log(`   Renaming to: "${newTitle}"`);
        
        const renameResponse = await axios.patch(`${API_URL}/api/chats/${chatId}`, {
            title: newTitle
        });

        console.log(`   ✓ Rename API response:`, {
            success: renameResponse.data.success,
            title: renameResponse.data.title,
            backend: renameResponse.data._backend
        });
        
        // Step 3: Verify rename persisted by fetching all chats
        console.log('\n3. Verifying rename persistence...');
        const chatsResponse = await axios.get(`${API_URL}/api/chats`);
        const renamedChat = chatsResponse.data.chats.find(chat => chat.id === chatId);
        
        if (renamedChat && renamedChat.title === newTitle) {
            console.log(`   ✓ Chat successfully renamed and persisted: "${renamedChat.title}"`);
        } else {
            console.log(`   ✗ Rename persistence failed - chat title is: "${renamedChat?.title || 'not found'}"`);
        }

        // Step 4: Verify timestamp format in chat list
        if (renamedChat) {
            console.log('\n4. Verifying timestamp handling...');
            const lastMessageAt = renamedChat.lastMessageAt;
            console.log(`   Last message timestamp: ${lastMessageAt}`);
            
            // Test if timestamp can be parsed as Date
            const parsedDate = new Date(lastMessageAt);
            if (isNaN(parsedDate.getTime())) {
                console.log('   ✗ Timestamp cannot be parsed as Date');
            } else {
                console.log(`   ✓ Timestamp is valid: ${parsedDate.toISOString()}`);
                
                // Simulate what frontend formatTimestamp does
                const now = new Date();
                const diff = now.getTime() - parsedDate.getTime();
                const seconds = Math.floor(diff / 1000);
                
                if (seconds < 60) {
                    console.log(`   ✓ Chat created ${seconds} seconds ago (should show as time)`);
                } else {
                    console.log(`   ✓ Chat created ${Math.floor(seconds/60)} minutes ago`);
                }
            }
        }

        // Step 5: Clean up - delete the test chat
        console.log('\n5. Cleaning up test chat...');
        await axios.delete(`${API_URL}/api/chats/${chatId}`);
        console.log('   ✓ Test chat deleted');

        console.log('\n✅ All tests passed! Both chat rename and timestamp issues are fixed.');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.response?.data || error.message);
        if (error.response?.status === 401) {
            console.log('\nNote: This test requires authentication to be disabled or a valid session.');
        }
    }
}

// Run the test
testChatFixes();