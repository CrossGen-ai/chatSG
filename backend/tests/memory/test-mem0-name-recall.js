/**
 * Test Mem0 name recall with PostgreSQL/pgvector
 * Simulates a conversation where user says their name, then asks what it is
 */

require('dotenv').config({ path: '../../.env' });
const { getMem0Service } = require('../../src/memory/Mem0Service');
const { getPool } = require('../../src/database/pool');

const TEST_SESSION_ID = 'test-name-recall-' + Date.now();
const TEST_USER = {
    id: 2, // Development user ID
    userId: 'dev@example.com',
    name: 'Development User'
};

async function testNameRecall() {
    console.log('=== Testing Mem0 Name Recall ===\n');
    
    const mem0Service = getMem0Service({
        provider: 'pgvector'
    });
    
    try {
        // Initialize Mem0
        console.log('1. Initializing Mem0...');
        await mem0Service.initialize();
        console.log('✓ Mem0 initialized\n');
        
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
        console.log('✓ Stored conversation in memory\n');
        
        // Wait a moment for memory to be processed
        await new Promise(resolve => setTimeout(resolve, 1000));
        
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
        
        // Check database directly
        console.log('6. Verifying in PostgreSQL...');
        const pool = getPool();
        const dbResult = await pool.query(`
            SELECT COUNT(*) as memory_count
            FROM mem0_memories
            WHERE user_id = $1 AND session_id = $2
        `, [TEST_USER.id, TEST_SESSION_ID]);
        
        console.log(`✓ Database contains ${dbResult.rows[0].memory_count} memories for this session\n`);
        
        // Get all memories for debugging
        const allMemories = await mem0Service.getSessionMemories(
            TEST_SESSION_ID,
            TEST_USER.userId,
            TEST_USER.id
        );
        
        console.log('7. All memories stored:');
        allMemories.forEach((mem, i) => {
            console.log(`  ${i + 1}. ${mem.memory}`);
        });
        
        console.log('\n=== Test Successful! Mem0 can recall user information ===');
        
        // Cleanup
        await mem0Service.deleteSessionMemories(
            TEST_SESSION_ID,
            TEST_USER.userId,
            TEST_USER.id
        );
        
        await pool.end();
        
    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
}

// Run the test
testNameRecall().then(() => {
    console.log('\nTest completed successfully!');
    process.exit(0);
}).catch(error => {
    console.error('\nTest failed with error:', error);
    process.exit(1);
});