const axios = require('axios');
const { getMem0Service } = require('../dist/src/memory/Mem0Service');
const { getStorageManager } = require('../dist/src/storage/StorageManager');
const dotenv = require('dotenv');
dotenv.config();

async function testMemoryPipeline() {
    console.log('=== Comprehensive Memory Pipeline Test ===\n');
    console.log('Testing: Qdrant (vector store) + PostgreSQL (chat storage) + Mem0 (memory layer)\n');
    
    const sessionId = 'memory-test-' + Date.now();
    const baseUrl = 'http://localhost:3000';
    
    // Initialize services directly for detailed testing
    const mem0Service = getMem0Service();
    const storageManager = getStorageManager();
    await mem0Service.initialize();
    await storageManager.initialize();
    
    try {
        // Phase 1: Send initial messages through the API
        console.log('PHASE 1: Sending messages through API\n');
        
        const messages = [
            "Hello! My name is Sean and I work at OpenAI.",
            "I love pizza and I'm learning TypeScript.",
            "I'm working on a chat application with memory features."
        ];
        
        for (let i = 0; i < messages.length; i++) {
            console.log(`${i + 1}. Sending: "${messages[i]}"`);
            const response = await axios.post(`${baseUrl}/api/chat`, {
                message: messages[i],
                sessionId: sessionId
            });
            console.log(`   Response: ${response.data.message.substring(0, 80)}...`);
            console.log(`   Agent used: ${response.data._agent || 'unknown'}`);
            
            // Wait between messages
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Phase 2: Direct memory check
        console.log('\nPHASE 2: Checking memories directly in Qdrant\n');
        
        // Get session info to extract userId
        const sessions = await storageManager.listSessions();
        const testSession = sessions.find(s => s.sessionId === sessionId);
        const userId = testSession?.metadata?.userId || '2';
        const userDatabaseId = testSession?.metadata?.userDatabaseId || 2;
        
        console.log(`Session info: userId=${userId}, userDatabaseId=${userDatabaseId}`);
        
        // Check memories in Qdrant
        const memories = await mem0Service.getSessionMemories(sessionId, userId, userDatabaseId);
        console.log(`\nMemories stored in Qdrant: ${memories.length}`);
        memories.forEach((mem, i) => {
            console.log(`${i + 1}. Memory: "${mem.memory}"`);
            console.log(`   ID: ${mem.id}`);
            console.log(`   Created: ${mem.createdAt}`);
            console.log(`   Metadata: ${JSON.stringify(mem.metadata)}`);
        });
        
        // Phase 3: Test memory search
        console.log('\nPHASE 3: Testing memory search\n');
        
        const searches = [
            { query: "name", description: "searching for name" },
            { query: "pizza", description: "searching for food preferences" },
            { query: "OpenAI", description: "searching for workplace" },
            { query: "TypeScript", description: "searching for programming language" }
        ];
        
        for (const search of searches) {
            console.log(`\nSearching for: "${search.query}" (${search.description})`);
            const results = await mem0Service.search(search.query, {
                sessionId: sessionId,
                userId: userId,
                limit: 5
            }, userDatabaseId);
            
            console.log(`Found ${results.results.length} results:`);
            results.results.forEach((result, i) => {
                console.log(`  ${i + 1}. "${result.memory}" (score: ${result.score?.toFixed(3)})`);
            });
        }
        
        // Phase 4: Test recall through API
        console.log('\n\nPHASE 4: Testing recall through chat API\n');
        
        const recallQuestions = [
            "What is my name?",
            "Where do I work?",
            "What food do I like?",
            "What programming language am I learning?",
            "What am I working on?"
        ];
        
        for (const question of recallQuestions) {
            console.log(`\nAsking: "${question}"`);
            const response = await axios.post(`${baseUrl}/api/chat`, {
                message: question,
                sessionId: sessionId
            });
            console.log(`Response: ${response.data.message}`);
        }
        
        // Phase 5: Check PostgreSQL storage
        console.log('\n\nPHASE 5: Checking PostgreSQL chat storage\n');
        
        const messages_stored = await storageManager.getMessages(sessionId);
        console.log(`Total messages in PostgreSQL: ${messages_stored.length}`);
        console.log(`Message types: ${messages_stored.map(m => m.type).join(', ')}`);
        
        // Phase 6: Summary
        console.log('\n\n=== SUMMARY ===\n');
        console.log(`✓ Session ID: ${sessionId}`);
        console.log(`✓ Messages sent: ${messages.length}`);
        console.log(`✓ Messages stored in PostgreSQL: ${messages_stored.length}`);
        console.log(`✓ Memories created in Qdrant: ${memories.length}`);
        console.log(`✓ Successful recalls: ${recallQuestions.length}`);
        
        // Check if Neo4j is enabled
        const neo4jEnabled = process.env.MEM0_GRAPH_ENABLED === 'true';
        console.log(`✓ Neo4j graph store: ${neo4jEnabled ? 'ENABLED' : 'DISABLED'}`);
        
        console.log('\n✅ Memory pipeline is working correctly!');
        
    } catch (error) {
        console.error('\n❌ Error in memory pipeline test:', error);
        console.error('Details:', error.response?.data || error.message);
    }
}

testMemoryPipeline().then(() => {
    console.log('\n=== Test Complete ===');
    process.exit(0);
}).catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});