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

async function checkFileExists(filePath) {
    try {
        await fs.promises.access(filePath);
        return true;
    } catch {
        return false;
    }
}

async function testSoftDeleteFeature() {
    console.log('=== Testing Soft Delete Feature ===\n');
    
    try {
        // Step 1: Create a new test session
        console.log('1. Creating test session for deletion...');
        const createResponse = await axios.post(`${API_BASE_URL}/api/chats`, {
            title: 'Test Session for Deletion',
            userId: 'test-user'
        });
        
        const sessionId = createResponse.data.sessionId;
        console.log(`   Created session: ${sessionId}`);
        
        // Step 2: Add some messages to the session
        console.log('\n2. Adding test messages to session...');
        const message1 = await axios.post(`${API_BASE_URL}/api/chat`, {
            message: 'This is a test message 1',
            sessionId: sessionId,
            activeSessionId: sessionId
        });
        console.log(`   Added message 1`);
        
        const message2 = await axios.post(`${API_BASE_URL}/api/chat`, {
            message: 'This is a test message 2',
            sessionId: sessionId,
            activeSessionId: sessionId
        });
        console.log(`   Added message 2`);
        
        await sleep(1000);
        
        // Step 3: Check initial state
        console.log('\n3. Checking initial state...');
        let indexData = await loadSessionIndex();
        const sessionInfo = indexData[sessionId];
        
        if (!sessionInfo) {
            throw new Error('Session not found in index!');
        }
        
        console.log(`   Session status: ${sessionInfo.status}`);
        console.log(`   Message count: ${sessionInfo.messageCount}`);
        console.log(`   Session file: ${sessionInfo.file}`);
        
        // Check if JSONL files exist
        const sessionFilePath = path.join(__dirname, '../data/sessions', sessionInfo.file);
        const toolsFilePath = path.join(__dirname, '../data/sessions', sessionInfo.toolsFile);
        
        const sessionFileExists = await checkFileExists(sessionFilePath);
        const toolsFileExists = await checkFileExists(toolsFilePath);
        
        console.log(`   Session JSONL exists: ${sessionFileExists ? '✅' : '❌'}`);
        console.log(`   Tools JSONL exists: ${toolsFileExists ? '✅' : '❌'}`);
        
        // Step 4: Delete the session
        console.log('\n4. Deleting session via API...');
        const deleteResponse = await axios.delete(`${API_BASE_URL}/api/chats/${sessionId}`);
        console.log(`   Delete response: ${deleteResponse.data.success ? 'Success' : 'Failed'}`);
        
        await sleep(1000);
        
        // Step 5: Check post-deletion state
        console.log('\n5. Checking post-deletion state...');
        indexData = await loadSessionIndex();
        const deletedSessionInfo = indexData[sessionId];
        
        if (deletedSessionInfo) {
            console.log(`   Session still in index: ✅`);
            console.log(`   Session status: ${deletedSessionInfo.status} ${deletedSessionInfo.status === 'deleted' ? '✅' : '❌'}`);
            console.log(`   Deleted at: ${deletedSessionInfo.deletedAt || 'Not set'}`);
            
            // Check if JSONL files still exist
            const sessionFileStillExists = await checkFileExists(sessionFilePath);
            const toolsFileStillExists = await checkFileExists(toolsFilePath);
            
            console.log(`   Session JSONL preserved: ${sessionFileStillExists ? '✅' : '❌'}`);
            console.log(`   Tools JSONL preserved: ${toolsFileStillExists ? '✅' : '❌'}`);
            
            // Step 6: Verify session doesn't appear in active chats list
            console.log('\n6. Verifying session is not in active chats list...');
            const chatsResponse = await axios.get(`${API_BASE_URL}/api/chats`);
            const activeChats = chatsResponse.data.chats;
            const isInActiveList = activeChats.some(chat => chat.id === sessionId);
            
            console.log(`   Session in active chats: ${isInActiveList ? '❌ (Should not be!)' : '✅ (Correctly hidden)'}`);
            
            // Test summary
            console.log('\n=== Test Summary ===');
            if (deletedSessionInfo.status === 'deleted' && 
                sessionFileStillExists && 
                toolsFileStillExists && 
                !isInActiveList) {
                console.log('✅ Soft delete is working correctly!');
                console.log('   - Session marked as deleted in index');
                console.log('   - JSONL files preserved for recovery');
                console.log('   - Session hidden from active chats list');
            } else {
                console.log('❌ Soft delete has issues:');
                if (deletedSessionInfo.status !== 'deleted') {
                    console.log('   - Session status not updated to "deleted"');
                }
                if (!sessionFileStillExists || !toolsFileStillExists) {
                    console.log('   - JSONL files were physically deleted (should be preserved)');
                }
                if (isInActiveList) {
                    console.log('   - Deleted session still appears in active chats');
                }
            }
        } else {
            console.log('   ❌ Session completely removed from index (should be soft deleted)');
        }
        
    } catch (error) {
        console.error('\n❌ Test failed with error:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

// Run the test
testSoftDeleteFeature();