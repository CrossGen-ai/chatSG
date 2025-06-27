const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_BASE_URL = 'http://localhost:3000';

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function loadSessionIndex() {
    const indexPath = path.join(__dirname, '../data/sessions/index.json');
    const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    return indexData;
}

async function testBlueDotFeature() {
    console.log('=== Testing Blue Dot Feature ===\n');
    
    try {
        // Step 1: Get existing sessions
        console.log('1. Getting existing sessions...');
        const response = await axios.get(`${API_BASE_URL}/api/chats`);
        const sessions = response.data.chats;
        console.log(`   Found ${sessions.length} sessions`);
        
        if (sessions.length < 2) {
            console.log('   Need at least 2 sessions to test. Creating new sessions...');
            
            // Create first session
            const session1 = await axios.post(`${API_BASE_URL}/api/chats`, {
                title: 'Test Session 1',
                userId: 'default'
            });
            console.log(`   Created session 1: ${session1.data.sessionId}`);
            
            // Create second session  
            const session2 = await axios.post(`${API_BASE_URL}/api/chats`, {
                title: 'Test Session 2',
                userId: 'default'
            });
            console.log(`   Created session 2: ${session2.data.sessionId}`);
            
            // Update sessions list
            const updatedResponse = await axios.get(`${API_BASE_URL}/api/chats`);
            sessions.length = 0;
            sessions.push(...updatedResponse.data.chats);
        }
        
        const session1Id = sessions[0].id;
        const session2Id = sessions[1].id;
        
        console.log(`\n2. Using sessions:`);
        console.log(`   Session 1: ${session1Id}`);
        console.log(`   Session 2: ${session2Id}`);
        
        // Step 2: Check initial unread counts
        console.log('\n3. Checking initial unread counts...');
        let indexData = await loadSessionIndex();
        console.log(`   Session 1 unread: ${indexData[session1Id]?.metadata?.unreadCount || 0}`);
        console.log(`   Session 2 unread: ${indexData[session2Id]?.metadata?.unreadCount || 0}`);
        
        // Step 3: Send message to session 1 while session 2 is active
        console.log('\n4. Sending message to Session 1 (while Session 2 is active)...');
        const message1Response = await axios.post(`${API_BASE_URL}/api/chat`, {
            message: 'Test message to background session',
            sessionId: session1Id,
            activeSessionId: session2Id  // IMPORTANT: This simulates user viewing session 2
        });
        console.log(`   Response received: "${message1Response.data.message.substring(0, 50)}..."`);
        
        // Wait a bit for the backend to process
        await sleep(1000);
        
        // Step 4: Check unread count for session 1
        console.log('\n5. Checking unread count after message...');
        indexData = await loadSessionIndex();
        const session1UnreadCount = indexData[session1Id]?.metadata?.unreadCount || 0;
        const session2UnreadCount = indexData[session2Id]?.metadata?.unreadCount || 0;
        
        console.log(`   Session 1 unread: ${session1UnreadCount} ${session1UnreadCount > 0 ? '✅' : '❌'}`);
        console.log(`   Session 2 unread: ${session2UnreadCount}`);
        
        if (session1UnreadCount > 0) {
            console.log('\n✅ Blue dot feature is working! Background session has unread messages.');
            
            // Step 5: Mark session 1 as read
            console.log('\n6. Marking Session 1 as read...');
            await axios.patch(`${API_BASE_URL}/api/chats/${session1Id}/read`);
            
            await sleep(500);
            
            // Check final state
            indexData = await loadSessionIndex();
            const finalUnreadCount = indexData[session1Id]?.metadata?.unreadCount || 0;
            console.log(`   Session 1 unread after marking as read: ${finalUnreadCount} ${finalUnreadCount === 0 ? '✅' : '❌'}`);
            
            if (finalUnreadCount === 0) {
                console.log('\n✅ Mark as read feature is working!');
            } else {
                console.log('\n❌ Mark as read feature failed!');
            }
        } else {
            console.log('\n❌ Blue dot feature NOT working! Background session should have unread messages.');
        }
        
        // Step 6: Test sending message to active session
        console.log('\n7. Testing message to active session (should NOT increment unread)...');
        const message2Response = await axios.post(`${API_BASE_URL}/api/chat`, {
            message: 'Test message to active session',
            sessionId: session1Id,
            activeSessionId: session1Id  // Same session is active
        });
        console.log(`   Response received: "${message2Response.data.message.substring(0, 50)}..."`);
        
        await sleep(1000);
        
        indexData = await loadSessionIndex();
        const activeSessionUnread = indexData[session1Id]?.metadata?.unreadCount || 0;
        console.log(`   Session 1 unread: ${activeSessionUnread} ${activeSessionUnread === 0 ? '✅' : '❌'}`);
        
        if (activeSessionUnread === 0) {
            console.log('\n✅ Active session handling is correct! No unread count for active session.');
        } else {
            console.log('\n❌ Active session handling failed! Should not have unread count.');
        }
        
        console.log('\n=== Test Complete ===');
        
    } catch (error) {
        console.error('\n❌ Test failed with error:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

// Run the test
testBlueDotFeature();