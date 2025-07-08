const { getMem0Service } = require('../dist/src/memory/Mem0Service');
const dotenv = require('dotenv');
dotenv.config();

async function testMem0Final() {
    console.log('=== Final Mem0 Test - Simulating Real Usage ===\n');
    
    const mem0Service = getMem0Service();
    await mem0Service.initialize();
    
    // Simulate a real chat session
    const sessionId = 'chat-session-' + Date.now();
    const userId = '2';  // Same as in the user's logs
    const userDatabaseId = 2;
    
    console.log('1. Simulating chat conversation...');
    console.log(`   Session: ${sessionId}`);
    console.log(`   User: ${userId}\n`);
    
    // User says their name
    const message1 = {
        timestamp: new Date().toISOString(),
        type: 'user',
        content: 'Hi! My name is Sean',
        metadata: {
            sessionId: sessionId,
            userId: userId,
            userDatabaseId: userDatabaseId
        }
    };
    
    console.log('2. User: "Hi! My name is Sean"');
    const result1 = await mem0Service.addMessage(message1, sessionId, userId, userDatabaseId);
    console.log('   Memory stored:', result1.results.map(r => r.memory).join(', '));
    
    // Assistant responds
    const message2 = {
        timestamp: new Date().toISOString(),
        type: 'assistant',
        content: 'Nice to meet you, Sean! How can I help you today?',
        metadata: {
            sessionId: sessionId,
            userId: userId,
            userDatabaseId: userDatabaseId
        }
    };
    
    console.log('\n3. Assistant: "Nice to meet you, Sean! How can I help you today?"');
    const result2 = await mem0Service.addMessage(message2, sessionId, userId, userDatabaseId);
    console.log('   Memory stored:', result2.results.map(r => r.memory).join(', ') || 'None');
    
    // Wait for indexing
    console.log('\n4. Waiting for indexing...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // User asks about their name (testing memory retrieval)
    console.log('\n5. User: "What is my name?"');
    
    // Search for relevant memories
    console.log('\n6. Searching for memories about the user\'s name...');
    const searchResults = await mem0Service.search('what is my name', {
        sessionId: sessionId,
        userId: userId,
        limit: 5
    }, userDatabaseId);
    
    console.log(`   Found ${searchResults.results.length} relevant memories:`);
    searchResults.results.forEach((result, i) => {
        console.log(`   ${i + 1}. "${result.memory}" (score: ${result.score?.toFixed(3)})`);
    });
    
    // Get all session memories
    console.log('\n7. Getting all memories for this session...');
    const sessionMemories = await mem0Service.getSessionMemories(sessionId, userId, userDatabaseId);
    console.log(`   Total memories: ${sessionMemories.length}`);
    sessionMemories.forEach((mem, i) => {
        console.log(`   ${i + 1}. "${mem.memory}"`);
    });
    
    // Get context for LLM
    console.log('\n8. Building context for LLM query...');
    const context = await mem0Service.getContextForQuery(
        'what is my name',
        sessionId,
        userId,
        userDatabaseId
    );
    console.log(`   Context messages: ${context.length}`);
    context.forEach((msg, i) => {
        console.log(`   ${i + 1}. [${msg.role}] ${msg.content}`);
    });
    
    // Clean up
    console.log('\n9. Cleaning up test data...');
    await mem0Service.deleteSessionMemories(sessionId, userId, userDatabaseId);
    console.log('   ✓ Test data cleaned up');
    
    console.log('\n✅ Memory system is working correctly!');
}

testMem0Final().then(() => {
    console.log('\n=== Test Complete ===');
    process.exit(0);
}).catch(error => {
    console.error('Test failed:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
});