/**
 * Test Lazy Agent Manager with Caching
 * 
 * Demonstrates the efficiency gains of lazy loading with LRU caching
 */

const { LazyAgentManager } = require('./src/agents/individual/LazyAgentManager.ts');

async function testLazyAgentManager() {
    console.log('🚀 Testing Lazy Agent Manager with Caching\n');

    // Create manager with small cache for testing
    const manager = new LazyAgentManager(2, 1); // Max 2 agents, 1 minute idle timeout

    try {
        console.log('=== Test 1: Agent Selection Logic ===');
        
        // Test different input types
        const testInputs = [
            'Can you analyze this data and show me statistics?',
            'Write a creative story about a robot',
            'Debug this JavaScript function for me',
            'Help me with something general'
        ];

        for (const input of testInputs) {
            const selection = manager.selectAgentType(input);
            console.log(`Input: "${input}"`);
            console.log(`Selected: ${selection.agentType} (confidence: ${selection.confidence})`);
            console.log(`Reasons: ${selection.reasons.join(', ')}\n`);
        }

        console.log('=== Test 2: Lazy Loading and Caching ===');
        
        // First request - should create agent
        console.log('First analytical request...');
        const response1 = await manager.processRequest('Analyze this data set', 'session1');
        console.log('Response received\n');

        // Second request - should use cached agent
        console.log('Second analytical request...');
        const response2 = await manager.processRequest('Calculate the average', 'session1');
        console.log('Response received\n');

        // Different agent type - should create new agent
        console.log('Creative request...');
        const response3 = await manager.processRequest('Write a poem', 'session2');
        console.log('Response received\n');

        // Third agent type - should create and evict oldest
        console.log('Technical request (will trigger eviction)...');
        const response4 = await manager.processRequest('Fix this bug in my code', 'session3');
        console.log('Response received\n');

        console.log('=== Test 3: Cache Statistics ===');
        const stats = manager.getStats();
        console.log('Cache Statistics:');
        console.log(`- Hits: ${stats.hits}`);
        console.log(`- Misses: ${stats.misses}`);
        console.log(`- Hit Rate: ${stats.hitRate.toFixed(1)}%`);
        console.log(`- Evictions: ${stats.evictions}`);
        console.log(`- Current Size: ${stats.currentSize}/${stats.maxSize}`);
        console.log(`- Total Created: ${stats.totalCreated}\n`);

        console.log('=== Test 4: Manual Cache Management ===');
        
        // Get available agent types
        console.log('Available agent types:', manager.getAvailableAgentTypes());
        
        // Manual eviction
        const evicted = manager.evictAgent('analytical');
        console.log(`Manually evicted analytical agent: ${evicted}`);
        
        // Try to evict non-existent agent
        const notEvicted = manager.evictAgent('nonexistent');
        console.log(`Tried to evict non-existent agent: ${notEvicted}\n`);

        console.log('=== Test 5: Performance Comparison ===');
        
        // Test repeated requests to show caching benefits
        console.time('5 requests with caching');
        for (let i = 0; i < 5; i++) {
            await manager.processRequest('Analyze this data', `session${i}`);
        }
        console.timeEnd('5 requests with caching');
        
        const finalStats = manager.getStats();
        console.log(`Final hit rate: ${finalStats.hitRate.toFixed(1)}%\n`);

        console.log('✅ All tests completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error(error.stack);
    } finally {
        // Cleanup
        await manager.cleanup();
        console.log('\n🧹 Cleanup completed');
    }
}

// Helper function to simulate some processing time
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the test
if (require.main === module) {
    testLazyAgentManager().catch(console.error);
}

module.exports = { testLazyAgentManager }; 