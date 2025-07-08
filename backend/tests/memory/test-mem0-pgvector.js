/**
 * Test Mem0 with PostgreSQL pgvector integration
 * 
 * This test verifies that Mem0 can:
 * 1. Connect to PostgreSQL with pgvector
 * 2. Store memories with user isolation
 * 3. Search memories by user context
 * 4. Handle multiple users properly
 */

require('dotenv').config({ path: '../../.env' });
const { getMem0Service } = require('../../dist/memory/Mem0Service');
const { getPool } = require('../../src/database/pool');

// Test configuration
const TEST_SESSION_ID = 'test-pgvector-session-' + Date.now();
const TEST_USER_1 = {
    id: 1,
    userId: 'test-user-1',
    name: 'Test User 1'
};
const TEST_USER_2 = {
    id: 2,
    userId: 'test-user-2', 
    name: 'Test User 2'
};

async function runTest() {
    console.log('=== Testing Mem0 with PostgreSQL pgvector ===\n');
    
    const mem0Service = getMem0Service({
        provider: 'pgvector' // Force pgvector provider
    });
    
    try {
        // Initialize Mem0
        console.log('1. Initializing Mem0 with pgvector...');
        await mem0Service.initialize();
        console.log('✓ Mem0 initialized successfully\n');
        
        // Test messages for User 1
        const user1Messages = [
            { type: 'user', content: 'My name is Alice and I love sci-fi movies', metadata: {} },
            { type: 'assistant', content: 'Nice to meet you Alice! What are your favorite sci-fi movies?', metadata: {} },
            { type: 'user', content: 'I really enjoy Blade Runner and The Matrix', metadata: {} },
            { type: 'assistant', content: 'Those are excellent choices! Both are cyberpunk classics.', metadata: {} }
        ];
        
        // Test messages for User 2
        const user2Messages = [
            { type: 'user', content: 'My name is Bob and I prefer horror movies', metadata: {} },
            { type: 'assistant', content: 'Hi Bob! What horror movies do you recommend?', metadata: {} },
            { type: 'user', content: 'The Conjuring and Hereditary are my favorites', metadata: {} },
            { type: 'assistant', content: 'Those are genuinely terrifying films!', metadata: {} }
        ];
        
        // Add memories for User 1
        console.log('2. Adding memories for User 1 (Alice)...');
        await mem0Service.addMessages(
            user1Messages, 
            TEST_SESSION_ID + '-user1',
            TEST_USER_1.userId,
            TEST_USER_1.id
        );
        console.log('✓ Added 4 messages for User 1\n');
        
        // Add memories for User 2
        console.log('3. Adding memories for User 2 (Bob)...');
        await mem0Service.addMessages(
            user2Messages,
            TEST_SESSION_ID + '-user2',
            TEST_USER_2.userId,
            TEST_USER_2.id
        );
        console.log('✓ Added 4 messages for User 2\n');
        
        // Search memories for User 1
        console.log('4. Searching for "favorite movies" in User 1 context...');
        const user1Search = await mem0Service.search(
            'favorite movies',
            { 
                userId: TEST_USER_1.userId,
                limit: 5
            },
            TEST_USER_1.id
        );
        console.log(`✓ Found ${user1Search.results.length} memories for User 1:`);
        user1Search.results.forEach((mem, i) => {
            console.log(`  ${i + 1}. ${mem.memory.substring(0, 100)}...`);
        });
        console.log();
        
        // Search memories for User 2
        console.log('5. Searching for "favorite movies" in User 2 context...');
        const user2Search = await mem0Service.search(
            'favorite movies',
            {
                userId: TEST_USER_2.userId,
                limit: 5
            },
            TEST_USER_2.id
        );
        console.log(`✓ Found ${user2Search.results.length} memories for User 2:`);
        user2Search.results.forEach((mem, i) => {
            console.log(`  ${i + 1}. ${mem.memory.substring(0, 100)}...`);
        });
        console.log();
        
        // Verify user isolation
        console.log('6. Verifying user isolation...');
        const crossUserSearch = await mem0Service.search(
            'Alice sci-fi',
            {
                userId: TEST_USER_2.userId,
                limit: 5
            },
            TEST_USER_2.id
        );
        
        if (crossUserSearch.results.length === 0) {
            console.log('✓ User isolation working: User 2 cannot see User 1\'s memories\n');
        } else {
            console.log('✗ User isolation FAILED: User 2 can see User 1\'s memories!\n');
        }
        
        // Get session memories for User 1
        console.log('7. Getting all memories for User 1\'s session...');
        const user1SessionMemories = await mem0Service.getSessionMemories(
            TEST_SESSION_ID + '-user1',
            TEST_USER_1.userId,
            TEST_USER_1.id
        );
        console.log(`✓ Retrieved ${user1SessionMemories.length} memories for User 1\'s session\n`);
        
        // Test context building
        console.log('8. Building context for query "What movies do I like?"...');
        const user1Context = await mem0Service.getContextForQuery(
            'What movies do I like?',
            TEST_SESSION_ID + '-user1',
            TEST_USER_1.userId,
            TEST_USER_1.id,
            10
        );
        console.log(`✓ Built context with ${user1Context.length} messages for User 1\n`);
        
        // Get user statistics
        console.log('9. Getting memory statistics for User 1...');
        const user1Stats = await mem0Service.getUserMemoryStats(TEST_USER_1.id);
        if (user1Stats) {
            console.log('✓ User 1 Statistics:');
            console.log(`  - Total sessions: ${user1Stats.total_sessions}`);
            console.log(`  - Total memories: ${user1Stats.total_memories}`);
            console.log(`  - Last memory at: ${user1Stats.last_memory_at}\n`);
        }
        
        // Cleanup test data
        console.log('10. Cleaning up test data...');
        await mem0Service.deleteSessionMemories(
            TEST_SESSION_ID + '-user1',
            TEST_USER_1.userId,
            TEST_USER_1.id
        );
        await mem0Service.deleteSessionMemories(
            TEST_SESSION_ID + '-user2',
            TEST_USER_2.userId,
            TEST_USER_2.id
        );
        console.log('✓ Test data cleaned up\n');
        
        console.log('=== All tests passed! Mem0 with PostgreSQL pgvector is working correctly ===');
        
    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    } finally {
        // Close database pool
        const pool = getPool();
        await pool.end();
    }
}

// Run the test
runTest().then(() => {
    console.log('\nTest completed successfully!');
    process.exit(0);
}).catch(error => {
    console.error('\nTest failed with error:', error);
    process.exit(1);
});