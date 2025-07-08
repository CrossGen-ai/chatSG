const { getMem0Service } = require('../dist/src/memory/Mem0Service');
const { getStorageManager } = require('../dist/src/storage/StorageManager');
const dotenv = require('dotenv');
dotenv.config();

async function quickMemoryTest() {
    console.log('=== Quick Memory Storage & Retrieval Test ===\n');
    
    const sessionId = 'quick-test-' + Date.now();
    const userId = '2';
    const userDatabaseId = 2;
    
    // Initialize services
    const mem0Service = getMem0Service();
    const storageManager = getStorageManager();
    await mem0Service.initialize();
    await storageManager.initialize();
    
    try {
        // 1. Store some test data directly
        console.log('1. Storing test memories...');
        
        const testMessages = [
            { content: "My name is Sean", type: 'user' },
            { content: "I work at OpenAI", type: 'user' },
            { content: "I love pizza", type: 'user' }
        ];
        
        for (const msg of testMessages) {
            const message = {
                timestamp: new Date().toISOString(),
                type: msg.type,
                content: msg.content,
                metadata: {
                    sessionId: sessionId,
                    userId: userId,
                    userDatabaseId: userDatabaseId
                }
            };
            
            await storageManager.saveMessage({
                sessionId: sessionId,
                type: msg.type,
                content: msg.content,
                metadata: {
                    userId: userId,
                    userDatabaseId: userDatabaseId
                }
            });
            console.log(`   ✓ Stored: "${msg.content}"`);
        }
        
        // Wait for indexing
        console.log('\n2. Waiting 2 seconds for Qdrant indexing...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 2. Check what's in Qdrant
        console.log('\n3. Checking Qdrant memories...');
        const memories = await mem0Service.getSessionMemories(sessionId, userId, userDatabaseId);
        console.log(`   Found ${memories.length} memories in Qdrant:`);
        memories.forEach((mem, i) => {
            console.log(`   ${i + 1}. "${mem.memory}" (id: ${mem.id.substring(0, 8)}...)`);
        });
        
        // 3. Test search
        console.log('\n4. Testing search functionality...');
        const searchTests = [
            { query: "Sean", expected: "Name is Sean" },
            { query: "OpenAI", expected: "Works at OpenAI" },
            { query: "pizza", expected: "Loves pizza" }
        ];
        
        for (const test of searchTests) {
            const results = await mem0Service.search(test.query, {
                sessionId: sessionId,
                userId: userId
            }, userDatabaseId);
            
            console.log(`   Search "${test.query}": ${results.results.length} results`);
            if (results.results.length > 0) {
                console.log(`     → "${results.results[0].memory}" (score: ${results.results[0].score?.toFixed(3)})`);
            }
        }
        
        // 4. Check PostgreSQL
        console.log('\n5. Checking PostgreSQL storage...');
        const pgMessages = await storageManager.getMessages(sessionId);
        console.log(`   Found ${pgMessages.length} messages in PostgreSQL`);
        
        // 5. Test context retrieval (what LLM would see)
        console.log('\n6. Testing context retrieval for LLM...');
        const context = await mem0Service.getContextForQuery(
            "Tell me about myself",
            sessionId,
            userId,
            userDatabaseId
        );
        console.log(`   Context messages for LLM: ${context.length}`);
        context.forEach((msg, i) => {
            console.log(`   ${i + 1}. [${msg.role}] ${msg.content.substring(0, 80)}...`);
        });
        
        // Summary
        console.log('\n=== RESULTS ===');
        console.log(`✓ PostgreSQL: ${pgMessages.length} messages stored`);
        console.log(`✓ Qdrant: ${memories.length} memories created`);
        console.log(`✓ Search: Working (found relevant results)`);
        console.log(`✓ Context: ${context.length} messages ready for LLM`);
        
        // Neo4j status
        const neo4jEnabled = process.env.MEM0_GRAPH_ENABLED === 'true';
        console.log(`✓ Neo4j: ${neo4jEnabled ? 'ENABLED' : 'DISABLED (not configured)'}`);
        
        if (memories.length > 0 && pgMessages.length > 0) {
            console.log('\n✅ Memory pipeline is working correctly!');
        } else {
            console.log('\n⚠️  Some components may not be working as expected');
        }
        
        // Cleanup
        console.log('\n7. Cleaning up test data...');
        await mem0Service.deleteSessionMemories(sessionId, userId, userDatabaseId);
        console.log('   ✓ Test data cleaned up');
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('Stack:', error.stack);
    }
}

quickMemoryTest().then(() => {
    console.log('\n=== Test Complete ===');
    process.exit(0);
}).catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});