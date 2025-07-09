const { getMem0Service } = require('../dist/src/memory/Mem0Service');
const { getStorageManager } = require('../dist/src/storage/StorageManager');
const dotenv = require('dotenv');
dotenv.config();

async function testCrossSessionMemory() {
    console.log('=== Cross-Session Memory Test ===');
    console.log('Testing if personal information like "My name is Sean" is remembered across sessions\n');
    
    const userId = '2';
    const userDatabaseId = 2;
    const session1Id = 'session-1-' + Date.now();
    const session2Id = 'session-2-' + Date.now();
    
    // Initialize services
    const mem0Service = getMem0Service();
    const storageManager = getStorageManager();
    await mem0Service.initialize();
    await storageManager.initialize();
    
    try {
        // ========== SESSION 1: Store personal information ==========
        console.log('=== SESSION 1: Storing personal information ===');
        console.log(`Session ID: ${session1Id}`);
        
        const personalInfo = [
            { content: "My name is Sean", type: 'user' },
            { content: "I work at OpenAI", type: 'user' },
            { content: "I love pizza and coding", type: 'user' }
        ];
        
        for (const info of personalInfo) {
            await storageManager.saveMessage({
                sessionId: session1Id,
                type: info.type,
                content: info.content,
                metadata: {
                    userId: userId,
                    userDatabaseId: userDatabaseId
                }
            });
            console.log(`   ✓ Stored: "${info.content}"`);
        }
        
        // Wait for indexing
        console.log('\n⏳ Waiting 3 seconds for Qdrant indexing...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Verify memories were stored in session 1
        console.log('\n📊 Checking Session 1 memories:');
        const session1Memories = await mem0Service.getSessionMemories(session1Id, userId, userDatabaseId);
        console.log(`   Found ${session1Memories.length} memories in Session 1`);
        session1Memories.forEach((mem, i) => {
            console.log(`   ${i + 1}. "${mem.memory}" (id: ${mem.id.substring(0, 8)}...)`);
        });
        
        // Test search within session 1
        console.log('\n🔍 Testing search within Session 1:');
        const session1Search = await mem0Service.search("What's my name?", {
            sessionId: session1Id,
            userId: userId,
            limit: 5
        }, userDatabaseId);
        console.log(`   Search results: ${session1Search.results.length}`);
        session1Search.results.forEach((result, i) => {
            console.log(`   ${i + 1}. "${result.memory}" (score: ${result.score?.toFixed(3)})`);
        });
        
        // ========== SESSION 2: Try to retrieve information ==========
        console.log('\n=== SESSION 2: Trying to retrieve personal information ===');
        console.log(`Session ID: ${session2Id}`);
        
        // Test search from session 2 (should fail due to session filtering)
        console.log('\n🔍 Testing search from Session 2 (with session filtering):');
        const session2Search = await mem0Service.search("What's my name?", {
            sessionId: session2Id,  // ← This filters to only Session 2
            userId: userId,
            limit: 5
        }, userDatabaseId);
        console.log(`   Search results: ${session2Search.results.length}`);
        session2Search.results.forEach((result, i) => {
            console.log(`   ${i + 1}. "${result.memory}" (score: ${result.score?.toFixed(3)})`);
        });
        
        // Test search from session 2 WITHOUT session filtering
        console.log('\n🔍 Testing search from Session 2 (WITHOUT session filtering):');
        const crossSessionSearch = await mem0Service.search("What's my name?", {
            // sessionId: session2Id,  ← Commenting this out to test cross-session
            userId: userId,
            limit: 5
        }, userDatabaseId);
        console.log(`   Search results: ${crossSessionSearch.results.length}`);
        crossSessionSearch.results.forEach((result, i) => {
            console.log(`   ${i + 1}. "${result.memory}" (score: ${result.score?.toFixed(3)})`);
        });
        
        // Test context retrieval for Session 2 (what the agent actually uses)
        console.log('\n🤖 Testing context retrieval for Session 2 (what agent sees):');
        const session2Context = await mem0Service.getContextForQuery(
            "What's my name?",
            session2Id,
            userId,
            userDatabaseId
        );
        console.log(`   Context messages: ${session2Context.length}`);
        session2Context.forEach((msg, i) => {
            console.log(`   ${i + 1}. [${msg.role}] ${msg.content}`);
        });
        
        // ========== RESULTS ANALYSIS ==========
        console.log('\n=== RESULTS ANALYSIS ===');
        console.log(`Session 1 memories stored: ${session1Memories.length}`);
        console.log(`Session 1 search results: ${session1Search.results.length}`);
        console.log(`Session 2 search WITH filtering: ${session2Search.results.length}`);
        console.log(`Session 2 search WITHOUT filtering: ${crossSessionSearch.results.length}`);
        console.log(`Session 2 context (what agent sees): ${session2Context.length}`);
        
        if (session1Memories.length > 0 && session1Search.results.length > 0) {
            console.log('\n✅ Session 1: Memory storage and retrieval works correctly');
        } else {
            console.log('\n❌ Session 1: Memory storage or retrieval failed');
        }
        
        if (session2Search.results.length === 0 && crossSessionSearch.results.length > 0) {
            console.log('✅ Cross-session issue confirmed: Session filtering blocks cross-session memory');
        } else if (session2Search.results.length > 0) {
            console.log('❓ Unexpected: Session filtering didn\'t block cross-session memory');
        } else {
            console.log('❌ No memories found even without session filtering');
        }
        
        if (session2Context.length === 0 || !session2Context.some(msg => msg.content.toLowerCase().includes('sean'))) {
            console.log('❌ ISSUE CONFIRMED: Agent can\'t see personal info from previous session');
        } else {
            console.log('✅ Agent can see personal info from previous session');
        }
        
        // Cleanup
        console.log('\n🧹 Cleaning up test data...');
        await mem0Service.deleteSessionMemories(session1Id, userId, userDatabaseId);
        await mem0Service.deleteSessionMemories(session2Id, userId, userDatabaseId);
        console.log('   ✓ Test data cleaned up');
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('Stack:', error.stack);
    }
}

testCrossSessionMemory().then(() => {
    console.log('\n=== Cross-Session Memory Test Complete ===');
    process.exit(0);
}).catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});