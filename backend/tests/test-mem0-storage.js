const { getMem0Service } = require('../dist/src/memory/Mem0Service');
const dotenv = require('dotenv');
dotenv.config();

async function testMem0Storage() {
    console.log('=== Testing Mem0 Storage and Retrieval ===\n');
    
    const mem0Service = getMem0Service();
    
    try {
        // Initialize service
        console.log('1. Initializing Mem0 service...');
        await mem0Service.initialize();
        console.log('✓ Mem0 service initialized\n');
        
        // Test data
        const testSessionId = 'test-session-' + Date.now();
        const testUserId = '2'; // Using same userId as in logs
        const testUserDatabaseId = 2;
        
        // Add a message
        console.log('2. Adding test message...');
        const testMessage = {
            timestamp: new Date().toISOString(),
            type: 'user',
            content: 'My name is Sean',
            metadata: {
                sessionId: testSessionId,
                userId: testUserId,
                userDatabaseId: testUserDatabaseId
            }
        };
        
        const addResult = await mem0Service.addMessage(
            testMessage, 
            testSessionId, 
            testUserId,
            testUserDatabaseId
        );
        console.log('✓ Add result:', JSON.stringify(addResult, null, 2), '\n');
        
        // Wait a moment for indexing
        console.log('3. Waiting 2 seconds for indexing...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Search with exact same parameters
        console.log('4. Searching for "my name is sean" with exact parameters...');
        const searchResult1 = await mem0Service.search(
            'my name is sean',
            {
                userId: testUserId,
                sessionId: testSessionId,
                limit: 10
            },
            testUserDatabaseId
        );
        console.log('Search result 1 (with all params):', JSON.stringify(searchResult1, null, 2), '\n');
        
        // Search without sessionId filter
        console.log('5. Searching without sessionId filter...');
        const searchResult2 = await mem0Service.search(
            'my name is sean',
            {
                userId: testUserId,
                limit: 10
            },
            testUserDatabaseId
        );
        console.log('Search result 2 (without sessionId):', JSON.stringify(searchResult2, null, 2), '\n');
        
        // Search with default userId
        console.log('6. Searching with default userId...');
        const searchResult3 = await mem0Service.search(
            'my name is sean',
            {
                userId: 'default',
                sessionId: testSessionId,
                limit: 10
            }
        );
        console.log('Search result 3 (default userId):', JSON.stringify(searchResult3, null, 2), '\n');
        
        // Get all memories for session
        console.log('7. Getting all memories for session...');
        const sessionMemories = await mem0Service.getSessionMemories(
            testSessionId,
            testUserId,
            testUserDatabaseId,
            100
        );
        console.log('Session memories:', JSON.stringify(sessionMemories, null, 2), '\n');
        
        // Test the underlying mem0 instance directly
        console.log('8. Testing mem0 getAll directly...');
        const allMemories = await mem0Service.memory.getAll({
            userId: testUserId,
            limit: 100
        });
        console.log('All memories for user:', JSON.stringify(allMemories, null, 2), '\n');
        
        // Clean up
        console.log('9. Cleaning up test data...');
        await mem0Service.deleteSessionMemories(testSessionId, testUserId, testUserDatabaseId);
        console.log('✓ Test data cleaned up\n');
        
    } catch (error) {
        console.error('Error during test:', error);
        console.error('Stack trace:', error.stack);
    }
}

// Run the test
testMem0Storage().then(() => {
    console.log('=== Test Complete ===');
    process.exit(0);
}).catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});