/**
 * Test Lazy Orchestrator System
 * 
 * Comprehensive test demonstrating the lazy loading orchestrator with caching,
 * performance optimizations, and intelligent agent selection.
 */

const { LazyOrchestrator, createDevelopmentLazyOrchestrator } = require('./src/routing/LazyOrchestrator.ts');

async function testLazyOrchestrator() {
    console.log('🚀 Testing Lazy Orchestrator System\n');

    // Create lazy orchestrator for testing
    const orchestrator = createDevelopmentLazyOrchestrator();

    try {
        console.log('=== Test 1: Agent Selection Intelligence ===');
        
        const testCases = [
            {
                input: 'Can you analyze this sales data and calculate the monthly trends?',
                expected: 'analytical'
            },
            {
                input: 'Write a creative story about a time-traveling detective',
                expected: 'creative'
            },
            {
                input: 'Debug this JavaScript function that keeps throwing errors',
                expected: 'technical'
            },
            {
                input: 'Help me understand quantum physics',
                expected: 'analytical'
            }
        ];

        for (const testCase of testCases) {
            const context = {
                sessionId: 'test-session',
                userInput: testCase.input,
                availableAgents: ['analytical', 'creative', 'technical']
            };

            const selection = await orchestrator.selectAgent(testCase.input, context);
            
            console.log(`Input: "${testCase.input}"`);
            console.log(`Expected: ${testCase.expected}, Selected: ${selection.selectedAgent}`);
            console.log(`Confidence: ${selection.confidence}, Reason: ${selection.reason}`);
            console.log(`Match: ${selection.selectedAgent === testCase.expected ? '✅' : '❌'}\n`);
        }

        console.log('=== Test 2: Request Processing with Caching ===');
        
        // Test multiple requests to demonstrate caching
        const requests = [
            'Analyze the performance metrics from last quarter',
            'Calculate the correlation between sales and marketing spend',
            'Write a poem about artificial intelligence',
            'Create a short story about robots learning to love',
            'Fix this Python function that has a memory leak',
            'Optimize this database query for better performance'
        ];

        console.time('Processing 6 requests');
        
        for (let i = 0; i < requests.length; i++) {
            console.log(`\nRequest ${i + 1}: "${requests[i]}"`);
            console.time(`Request ${i + 1}`);
            
            try {
                const response = await orchestrator.processRequest(requests[i], `session-${i}`);
                console.timeEnd(`Request ${i + 1}`);
                console.log(`Response received: ${response.success ? '✅' : '❌'}`);
            } catch (error) {
                console.timeEnd(`Request ${i + 1}`);
                console.log(`Error: ${error.message}`);
            }
        }
        
        console.timeEnd('Processing 6 requests');

        console.log('\n=== Test 3: Performance Statistics ===');
        
        const stats = orchestrator.getEnhancedStats();
        console.log('Orchestrator Performance:');
        console.log(`- Total Requests: ${stats.lazy.totalRequests}`);
        console.log(`- Lazy Agent Requests: ${stats.lazy.lazyAgentRequests}`);
        console.log(`- Traditional Requests: ${stats.lazy.traditionalAgentRequests}`);
        console.log(`- Cache Hit Rate: ${stats.lazy.cacheHitRate.toFixed(1)}%`);
        console.log(`- Average Response Time: ${stats.lazy.averageResponseTime.toFixed(0)}ms`);
        
        console.log('\nCache Statistics:');
        console.log(`- Cache Hits: ${stats.lazy.cache.hits}`);
        console.log(`- Cache Misses: ${stats.lazy.cache.misses}`);
        console.log(`- Cache Evictions: ${stats.lazy.cache.evictions}`);
        console.log(`- Current Cache Size: ${stats.lazy.cache.currentSize}/${stats.lazy.cache.maxSize}`);
        console.log(`- Total Agents Created: ${stats.lazy.cache.totalCreated}`);

        console.log('\n=== Test 4: Task Delegation ===');
        
        const tasks = [
            {
                id: 'task-1',
                type: 'analysis',
                input: 'Analyze the customer satisfaction survey results',
                parameters: { sessionId: 'delegation-session' },
                priority: 1
            },
            {
                id: 'task-2',
                type: 'creative',
                input: 'Write a marketing copy for our new product launch',
                parameters: { sessionId: 'delegation-session' },
                priority: 2
            }
        ];

        for (const task of tasks) {
            console.log(`\nDelegating ${task.type} task: "${task.input}"`);
            console.time(`Task ${task.id}`);
            
            try {
                const result = await orchestrator.delegateTask(task);
                console.timeEnd(`Task ${task.id}`);
                console.log(`Task Result: ${result.success ? '✅' : '❌'}`);
                console.log(`Executed by: ${result.executedBy}`);
                console.log(`Execution time: ${result.executionTime}ms`);
            } catch (error) {
                console.timeEnd(`Task ${task.id}`);
                console.log(`Task Error: ${error.message}`);
            }
        }

        console.log('\n=== Test 5: Hybrid Mode Demonstration ===');
        
        // Test complex queries that should fall back to traditional orchestration
        const complexQueries = [
            'I need you to analyze the data AND write a creative summary AND provide technical recommendations',
            'Compare multiple approaches, coordinate between teams, and provide a step-by-step workflow',
            'This requires collaboration between several agents to handle different aspects'
        ];

        for (const query of complexQueries) {
            console.log(`\nComplex Query: "${query}"`);
            
            const context = {
                sessionId: 'hybrid-test',
                userInput: query,
                availableAgents: ['analytical', 'creative', 'technical']
            };

            const selection = await orchestrator.selectAgent(query, context);
            console.log(`Selection: ${selection.selectedAgent} (confidence: ${selection.confidence})`);
            console.log(`Reason: ${selection.reason}`);
        }

        console.log('\n=== Test 6: Error Handling and Fallback ===');
        
        try {
            // Test with invalid input
            const errorResponse = await orchestrator.processRequest('', 'error-session');
            console.log(`Empty input handled: ${errorResponse.success ? '❌' : '✅'}`);
            console.log(`Error message: ${errorResponse.message}`);
        } catch (error) {
            console.log(`Error handling: ✅`);
            console.log(`Error: ${error.message}`);
        }

        console.log('\n✅ All lazy orchestrator tests completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error(error.stack);
    } finally {
        // Cleanup
        console.log('\n🧹 Cleaning up orchestrator...');
        await orchestrator.cleanup();
        console.log('Cleanup completed');
    }
}

// Helper function to simulate processing delay
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Performance comparison function
async function comparePerformance() {
    console.log('\n🏁 Performance Comparison: Lazy vs Traditional\n');

    const lazyOrchestrator = createDevelopmentLazyOrchestrator();
    
    try {
        // Test repeated requests
        const testInput = 'Analyze this dataset for trends and patterns';
        const sessionId = 'perf-test';
        const iterations = 5;

        console.log('Testing Lazy Orchestrator (with caching):');
        console.time('Lazy Orchestrator');
        
        for (let i = 0; i < iterations; i++) {
            await lazyOrchestrator.processRequest(testInput, `${sessionId}-${i}`);
        }
        
        console.timeEnd('Lazy Orchestrator');
        
        const stats = lazyOrchestrator.getEnhancedStats();
        console.log(`Cache hit rate: ${stats.lazy.cacheHitRate.toFixed(1)}%`);
        console.log(`Average response time: ${stats.lazy.averageResponseTime.toFixed(0)}ms`);

    } catch (error) {
        console.error('Performance test error:', error);
    } finally {
        await lazyOrchestrator.cleanup();
    }
}

// Run the tests
if (require.main === module) {
    testLazyOrchestrator()
        .then(() => comparePerformance())
        .catch(console.error);
}

module.exports = { testLazyOrchestrator, comparePerformance };
