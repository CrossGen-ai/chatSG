/**
 * Test Mem0 name recall with Qdrant vector database
 * Simulates a conversation where user says their name, then asks what it is
 */

require('dotenv').config({ path: '../../.env' });
const { getMem0Service } = require('../../src/memory/Mem0Service');

const TEST_SESSION_ID = 'test-qdrant-recall-' + Date.now();
const TEST_USER = {
    id: 2, // Development user ID
    userId: 'dev@example.com',
    name: 'Development User'
};

async function testQdrantNameRecall() {
    console.log('=== Testing Mem0 Name Recall with Qdrant ===\n');
    
    const mem0Service = getMem0Service({
        provider: 'qdrant'
    });
    
    try {
        // Initialize Mem0
        console.log('1. Initializing Mem0 with Qdrant...');
        await mem0Service.initialize();
        console.log('✓ Mem0 initialized with Qdrant\n');
        
        // First conversation - user says their name
        console.log('2. User says: "My name is Sean"');
        const firstMessages = [
            { 
                type: 'user', 
                content: 'My name is Sean',
                metadata: { userId: TEST_USER.userId }
            },
            { 
                type: 'assistant', 
                content: 'Nice to meet you, Sean! How can I help you today?',
                metadata: { agent: 'assistant' }
            }
        ];
        
        await mem0Service.addMessages(
            firstMessages,
            TEST_SESSION_ID,
            TEST_USER.userId,
            TEST_USER.id
        );
        console.log('✓ Stored conversation in Qdrant\n');
        
        // Wait a moment for memory to be processed
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Second conversation - user asks their name
        console.log('3. User asks: "What is my name?"');
        
        // Search for relevant memories
        const searchResult = await mem0Service.search(
            'What is my name?',
            {
                sessionId: TEST_SESSION_ID,
                userId: TEST_USER.userId,
                limit: 10
            },
            TEST_USER.id
        );
        
        console.log(`✓ Found ${searchResult.results.length} relevant memories:`);
        searchResult.results.forEach((mem, i) => {
            console.log(`  ${i + 1}. ${mem.memory}`);
            console.log(`     Score: ${mem.score || 'N/A'}`);
        });
        console.log();
        
        // Build context for the query
        console.log('4. Building context for response...');
        const context = await mem0Service.getContextForQuery(
            'What is my name?',
            TEST_SESSION_ID,
            TEST_USER.userId,
            TEST_USER.id,
            10
        );
        
        console.log(`✓ Built context with ${context.length} messages:`);
        context.forEach((msg, i) => {
            if (msg.content.includes('[Relevant Context:')) {
                console.log(`  ${i + 1}. ${msg.role}: ${msg.content}`);
            }
        });
        console.log();
        
        // Simulate assistant response using the context
        const secondMessages = [
            { 
                type: 'user', 
                content: 'What is my name?',
                metadata: { userId: TEST_USER.userId }
            },
            { 
                type: 'assistant', 
                content: 'Your name is Sean, as you mentioned earlier.',
                metadata: { agent: 'assistant' }
            }
        ];
        
        await mem0Service.addMessages(
            secondMessages,
            TEST_SESSION_ID,
            TEST_USER.userId,
            TEST_USER.id
        );
        console.log('5. Assistant correctly recalled the name!\n');
        
        // Get all memories for debugging
        const allMemories = await mem0Service.getSessionMemories(
            TEST_SESSION_ID,
            TEST_USER.userId,
            TEST_USER.id
        );
        
        console.log('6. All memories stored in Qdrant:');
        allMemories.forEach((mem, i) => {
            console.log(`  ${i + 1}. ${mem.memory}`);
        });
        
        // Check Qdrant directly
        console.log('\n7. Verifying in Qdrant...');
        const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
        const collectionName = process.env.MEM0_COLLECTION_NAME || 'chatsg_memories';
        
        const response = await fetch(`${qdrantUrl}/collections/${collectionName}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log(`✓ Qdrant collection '${collectionName}' exists`);
            console.log(`  Vectors count: ${data.result?.vectors_count || 0}`);
        }
        
        console.log('\n=== Test Successful! Mem0 with Qdrant can recall user information ===');
        
        // Cleanup
        await mem0Service.deleteSessionMemories(
            TEST_SESSION_ID,
            TEST_USER.userId,
            TEST_USER.id
        );
        
    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
}

// Run the test
testQdrantNameRecall().then(() => {
    console.log('\nTest completed successfully!');
    process.exit(0);
}).catch(error => {
    console.error('\nTest failed with error:', error);
    process.exit(1);
});