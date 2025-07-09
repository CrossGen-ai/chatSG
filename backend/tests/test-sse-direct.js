/**
 * Direct test of SSE streaming without authentication complications
 * This test directly calls the storage manager to store data, then tests retrieval
 */

require('dotenv').config({ path: '../.env' });

async function testDirectMemoryFlow() {
    console.log('=== Direct Memory Storage and Retrieval Test ===\n');

    try {
        // Import storage manager
        const { getStorageManager } = require('../dist/src/storage');
        const storageManager = getStorageManager();
        
        // Use the actual user ID from mock auth
        const userId = 2; // Assuming this is the ID of the dev@example.com user
        
        // Step 1: Create a session and store personal info
        console.log('1️⃣ Creating session and storing personal info...');
        const session1Id = `test-session-${Date.now()}`;
        
        await storageManager.createSession({
            sessionId: session1Id,
            title: 'Memory Storage Test',
            userId: userId
        });
        
        // Store the user message
        await storageManager.saveMessage({
            sessionId: session1Id,
            type: 'user',
            content: 'My name is Sean and I work at OpenAI',
            metadata: { userId }
        });
        
        // Store assistant response to trigger memory extraction
        await storageManager.saveMessage({
            sessionId: session1Id,
            type: 'assistant',
            content: 'Nice to meet you, Sean! Working at OpenAI must be exciting.',
            metadata: { agentName: 'AnalyticalAgent' }
        });
        
        console.log('   ✓ Messages stored successfully');
        console.log('   ⏳ Waiting 5 seconds for memory indexing...\n');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Step 2: Create new session and test retrieval
        console.log('2️⃣ Creating new session to test memory retrieval...');
        const session2Id = `test-session-${Date.now()}-2`;
        
        await storageManager.createSession({
            sessionId: session2Id,
            title: 'Memory Retrieval Test',
            userId: userId
        });
        
        // Get context for the query
        console.log('3️⃣ Testing context retrieval for "What is my name?"...');
        const context = await storageManager.getContextForQuery(
            'What is my name?',
            session2Id,
            'You are a helpful assistant.',
            userId
        );
        
        console.log(`   Retrieved ${context.length} context messages`);
        
        // Analyze the context
        let foundName = false;
        let foundWorkplace = false;
        
        context.forEach((msg, i) => {
            console.log(`   ${i + 1}. [${msg.role}] ${msg.content.substring(0, 100)}...`);
            const content = msg.content.toLowerCase();
            if (content.includes('sean')) foundName = true;
            if (content.includes('openai')) foundWorkplace = true;
        });
        
        console.log('\n=== RESULTS ===');
        console.log(`Found name "Sean": ${foundName ? '✅ YES' : '❌ NO'}`);
        console.log(`Found workplace "OpenAI": ${foundWorkplace ? '✅ YES' : '❌ NO'}`);
        
        if (foundName || foundWorkplace) {
            console.log('\n✅ SUCCESS: Cross-session memory is working at the storage level!');
            console.log('   The system can retrieve stored personal information.');
        } else {
            console.log('\n❌ FAILURE: Cross-session memory is not working.');
            console.log('   Possible issues:');
            console.log('   - Mem0 not properly configured');
            console.log('   - Qdrant not running or accessible');
            console.log('   - Memory extraction not working');
        }
        
        // Cleanup
        console.log('\n🧹 Cleaning up test sessions...');
        await storageManager.deleteSession(session1Id);
        await storageManager.deleteSession(session2Id);
        console.log('   ✓ Cleanup complete');
        
    } catch (error) {
        console.error('\n❌ Test failed with error:', error.message);
        console.error(error.stack);
    }
}

// Run the test
testDirectMemoryFlow()
    .then(() => {
        console.log('\n=== Test Complete ===');
        process.exit(0);
    })
    .catch(err => {
        console.error('\n=== Test Failed ===');
        console.error(err);
        process.exit(1);
    });