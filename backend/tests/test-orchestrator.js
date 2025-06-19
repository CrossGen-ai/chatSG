/**
 * Multi-Agent Orchestrator Test Suite
 * 
 * Comprehensive tests for the orchestrator system including agent selection,
 * task delegation, conversation handoffs, and backend integration.
 */

const path = require('path');

// Import compiled TypeScript modules
const { 
    createOrchestrationSetup,
    createBackendIntegration 
} = require('./dist/src/orchestrator');

const { StateManager } = require('./dist/src/state/StateManager');

// Mock AgentZero for testing
class MockAgentZero {
    constructor() {
        this.sessions = new Map();
    }

    async processMessage(message, sessionId = 'default') {
        // Store session
        if (!this.sessions.has(sessionId)) {
            this.sessions.set(sessionId, []);
        }
        
        this.sessions.get(sessionId).push({
            type: 'user',
            content: message,
            timestamp: new Date()
        });

        // Generate mock response
        const response = `AgentZero processed: "${message}" for session ${sessionId}`;
        
        this.sessions.get(sessionId).push({
            type: 'assistant',
            content: response,
            timestamp: new Date()
        });

        return {
            success: true,
            message: response,
            sessionId,
            timestamp: new Date().toISOString(),
            llmProvider: 'mock',
            model: 'mock-gpt'
        };
    }

    getSessionInfo(sessionId) {
        return {
            exists: this.sessions.has(sessionId),
            messageCount: this.sessions.get(sessionId)?.length || 0
        };
    }

    async clearSession(sessionId) {
        this.sessions.delete(sessionId);
        return true;
    }
}

// Mock n8n handler
async function mockN8nHandler(message, sessionId) {
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate network delay
    
    return {
        output: `n8n processed: "${message}" for session ${sessionId}`,
        success: true,
        webhook: 'mock-webhook-url'
    };
}

// Mock generic handler
async function mockGenericHandler(message, sessionId) {
    await new Promise(resolve => setTimeout(resolve, 50)); // Simulate processing
    
    return {
        message: `Generic handler processed: "${message}" for session ${sessionId}`,
        simulation: true,
        original_message: message
    };
}

/**
 * Test orchestrator initialization and basic functionality
 */
async function testOrchestratorInitialization() {
    console.log('\n=== Testing Orchestrator Initialization ===');
    
    try {
        // Create orchestration setup
        const setup = createOrchestrationSetup('development');
        console.log('✓ Orchestration setup created successfully');
        
        // Check components
        if (!setup.orchestrator) {
            throw new Error('Orchestrator not created');
        }
        console.log('✓ Orchestrator component available');
        
        if (!setup.middleware) {
            throw new Error('Middleware not created');
        }
        console.log('✓ Middleware component available');
        
        // Get initial stats
        const stats = setup.orchestrator.getStats();
        console.log('✓ Initial orchestrator stats:', {
            registeredAgents: stats.registeredAgents,
            strategies: stats.availableStrategies,
            totalRequests: stats.totalRequests
        });
        
        // Cleanup
        await setup.orchestrator.cleanup();
        console.log('✓ Orchestrator cleanup completed');
        
        return true;
    } catch (error) {
        console.error('✗ Orchestrator initialization failed:', error.message);
        return false;
    }
}

/**
 * Test backend integration with mock agents
 */
async function testBackendIntegration() {
    console.log('\n=== Testing Backend Integration ===');
    
    try {
        // Create orchestration setup
        const setup = createOrchestrationSetup('development');
        
        // Create backend integration
        const integration = createBackendIntegration(setup.orchestrator, setup.middleware);
        console.log('✓ Backend integration created');
        
        // Initialize with mock backends
        const mockAgentZero = new MockAgentZero();
        await integration.initialize({
            agentZero: mockAgentZero,
            n8nHandler: mockN8nHandler,
            genericHandler: mockGenericHandler
        });
        console.log('✓ Backend integration initialized with mock backends');
        
        // Check status
        const status = integration.getStatus();
        console.log('✓ Integration status:', {
            initialized: status.initialized,
            backends: status.registeredBackends,
            agentCount: status.orchestratorStats.registeredAgents
        });
        
        // Test health check
        const health = await integration.healthCheck();
        console.log('✓ Health check completed:', {
            integrationStatus: health.integration.status,
            backendCount: health.backends.length,
            middlewareStatus: health.middleware.status
        });
        
        // Cleanup
        await integration.cleanup();
        console.log('✓ Backend integration cleanup completed');
        
        return true;
    } catch (error) {
        console.error('✗ Backend integration failed:', error.message);
        return false;
    }
}

/**
 * Test agent selection algorithms
 */
async function testAgentSelection() {
    console.log('\n=== Testing Agent Selection ===');
    
    try {
        const setup = createOrchestrationSetup('development');
        const integration = createBackendIntegration(setup.orchestrator, setup.middleware);
        
        // Initialize with mock backends
        const mockAgentZero = new MockAgentZero();
        await integration.initialize({
            agentZero: mockAgentZero,
            n8nHandler: mockN8nHandler,
            genericHandler: mockGenericHandler
        });
        
        // Test different types of user inputs
        const testInputs = [
            'Hello, I need help with a general question',
            'Can you analyze some data for me?',
            'I want to process a file',
            'Route this message to the appropriate handler',
            'Remember my preferences for next time'
        ];
        
        for (const input of testInputs) {
            const context = {
                sessionId: 'test-session',
                userInput: input,
                availableAgents: ['AgentZero', 'n8n', 'Generic']
            };
            
            const selection = await setup.orchestrator.selectAgent(input, context);
            console.log(`✓ Input: "${input}"`);
            console.log(`  Selected: ${selection.selectedAgent} (confidence: ${selection.confidence.toFixed(2)})`);
            console.log(`  Reason: ${selection.reason}`);
        }
        
        // Cleanup
        await integration.cleanup();
        console.log('✓ Agent selection tests completed');
        
        return true;
    } catch (error) {
        console.error('✗ Agent selection failed:', error.message);
        return false;
    }
}

/**
 * Test task delegation and execution
 */
async function testTaskDelegation() {
    console.log('\n=== Testing Task Delegation ===');
    
    try {
        const setup = createOrchestrationSetup('development');
        const integration = createBackendIntegration(setup.orchestrator, setup.middleware);
        
        // Initialize with mock backends
        const mockAgentZero = new MockAgentZero();
        await integration.initialize({
            agentZero: mockAgentZero,
            n8nHandler: mockN8nHandler,
            genericHandler: mockGenericHandler
        });
        
        // Create test tasks
        const tasks = [
            {
                id: 'task-1',
                type: 'chat',
                input: 'Hello from task delegation test',
                parameters: { sessionId: 'delegation-test' },
                priority: 1
            },
            {
                id: 'task-2',
                type: 'analysis',
                input: 'Analyze this data please',
                parameters: { sessionId: 'delegation-test' },
                priority: 2
            }
        ];
        
        // Test delegation to different agents
        const agents = ['AgentZero', 'n8n', 'Generic'];
        
        for (const task of tasks) {
            for (const agent of agents) {
                try {
                    const result = await setup.orchestrator.delegateTask(task, agent);
                    console.log(`✓ Task ${task.id} delegated to ${agent}:`);
                    console.log(`  Success: ${result.success}`);
                    console.log(`  Execution time: ${result.executionTime}ms`);
                    
                    if (result.result && result.result.message) {
                        console.log(`  Response: ${result.result.message.substring(0, 50)}...`);
                    }
                } catch (error) {
                    console.warn(`⚠ Task ${task.id} failed for ${agent}: ${error.message}`);
                }
            }
        }
        
        // Get final stats
        const stats = setup.orchestrator.getStats();
        console.log('✓ Final orchestrator stats:', {
            totalRequests: stats.totalRequests,
            successfulDelegations: stats.successfulDelegations,
            failedDelegations: stats.failedDelegations
        });
        
        // Cleanup
        await integration.cleanup();
        console.log('✓ Task delegation tests completed');
        
        return true;
    } catch (error) {
        console.error('✗ Task delegation failed:', error.message);
        return false;
    }
}

/**
 * Test conversation handoff functionality
 */
async function testConversationHandoff() {
    console.log('\n=== Testing Conversation Handoff ===');
    
    try {
        const setup = createOrchestrationSetup('development');
        const integration = createBackendIntegration(setup.orchestrator, setup.middleware);
        
        // Initialize with mock backends
        const mockAgentZero = new MockAgentZero();
        await integration.initialize({
            agentZero: mockAgentZero,
            n8nHandler: mockN8nHandler,
            genericHandler: mockGenericHandler
        });
        
        // Test handoff scenarios
        const handoffTests = [
            {
                from: 'AgentZero',
                to: 'n8n',
                reason: 'User needs specialized n8n workflow processing',
                userIntent: 'workflow automation',
                summary: 'User asked about automating their workflow'
            },
            {
                from: 'n8n',
                to: 'Generic',
                reason: 'Fallback to generic handler',
                userIntent: 'general assistance',
                summary: 'n8n workflow failed, need generic response'
            }
        ];
        
        for (const test of handoffTests) {
            const handoffContext = {
                sessionId: 'handoff-test',
                reason: test.reason,
                conversationSummary: test.summary,
                userIntent: test.userIntent,
                metadata: { testCase: true }
            };
            
            const result = await setup.orchestrator.handleConversationHandoff(
                test.from,
                test.to,
                handoffContext
            );
            
            console.log(`✓ Handoff ${test.from} → ${test.to}:`);
            console.log(`  Success: ${result.success}`);
            console.log(`  New agent: ${result.newAgent}`);
            if (result.transitionMessage) {
                console.log(`  Message: ${result.transitionMessage}`);
            }
            if (result.error) {
                console.log(`  Error: ${result.error}`);
            }
        }
        
        // Check handoff stats
        const stats = setup.orchestrator.getStats();
        console.log('✓ Handoff stats:', {
            totalHandoffs: stats.handoffs
        });
        
        // Cleanup
        await integration.cleanup();
        console.log('✓ Conversation handoff tests completed');
        
        return true;
    } catch (error) {
        console.error('✗ Conversation handoff failed:', error.message);
        return false;
    }
}

/**
 * Test enhanced chat handlers
 */
async function testEnhancedChatHandlers() {
    console.log('\n=== Testing Enhanced Chat Handlers ===');
    
    try {
        const setup = createOrchestrationSetup('development');
        const integration = createBackendIntegration(setup.orchestrator, setup.middleware);
        
        // Initialize with mock backends
        const mockAgentZero = new MockAgentZero();
        await integration.initialize({
            agentZero: mockAgentZero,
            n8nHandler: mockN8nHandler,
            genericHandler: mockGenericHandler
        });
        
        // Create enhanced handlers
        const handlers = {
            lang: integration.createEnhancedChatHandler('AgentZero'),
            n8n: integration.createEnhancedChatHandler('n8n'),
            generic: integration.createEnhancedChatHandler('Generic')
        };
        
        // Test each handler
        const testMessage = 'Hello from enhanced chat handler test';
        const sessionId = 'enhanced-test';
        
        for (const [backend, handler] of Object.entries(handlers)) {
            try {
                const response = await handler(testMessage, sessionId);
                console.log(`✓ Enhanced ${backend} handler:`);
                console.log(`  Success: ${response.success !== false}`);
                console.log(`  Backend: ${response._backend || backend}`);
                console.log(`  Agent: ${response._agent || 'unknown'}`);
                
                if (response.message) {
                    console.log(`  Response: ${response.message.substring(0, 50)}...`);
                }
                
                if (response._orchestration) {
                    console.log(`  Orchestration: confidence ${response._orchestration.confidence}`);
                }
            } catch (error) {
                console.warn(`⚠ Enhanced ${backend} handler failed: ${error.message}`);
            }
        }
        
        // Get middleware metrics
        const metrics = setup.middleware.getMetrics();
        console.log('✓ Middleware metrics:', {
            totalRequests: metrics.middleware.totalRequests,
            orchestratedRequests: metrics.middleware.orchestratedRequests,
            errorCount: metrics.middleware.errorCount
        });
        
        // Cleanup
        await integration.cleanup();
        console.log('✓ Enhanced chat handler tests completed');
        
        return true;
    } catch (error) {
        console.error('✗ Enhanced chat handler tests failed:', error.message);
        return false;
    }
}

/**
 * Run all orchestrator tests
 */
async function runAllTests() {
    console.log('🚀 Starting Multi-Agent Orchestrator Test Suite');
    console.log('================================================');
    
    const tests = [
        { name: 'Orchestrator Initialization', fn: testOrchestratorInitialization },
        { name: 'Backend Integration', fn: testBackendIntegration },
        { name: 'Agent Selection', fn: testAgentSelection },
        { name: 'Task Delegation', fn: testTaskDelegation },
        { name: 'Conversation Handoff', fn: testConversationHandoff },
        { name: 'Enhanced Chat Handlers', fn: testEnhancedChatHandlers }
    ];
    
    const results = [];
    
    for (const test of tests) {
        console.log(`\n⏳ Running: ${test.name}`);
        try {
            const result = await test.fn();
            results.push({ name: test.name, success: result });
            console.log(`${result ? '✅' : '❌'} ${test.name}: ${result ? 'PASSED' : 'FAILED'}`);
        } catch (error) {
            results.push({ name: test.name, success: false, error: error.message });
            console.log(`❌ ${test.name}: FAILED - ${error.message}`);
        }
    }
    
    // Summary
    console.log('\n📊 Test Results Summary');
    console.log('========================');
    
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`Total Tests: ${results.length}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
        console.log('\nFailed Tests:');
        results.filter(r => !r.success).forEach(r => {
            console.log(`  - ${r.name}${r.error ? `: ${r.error}` : ''}`);
        });
    }
    
    console.log('\n🎉 Multi-Agent Orchestrator Test Suite Completed!');
    
    return passed === results.length;
}

// Run tests if this file is executed directly
if (require.main === module) {
    runAllTests()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('Fatal test error:', error);
            process.exit(1);
        });
}

module.exports = {
    runAllTests,
    testOrchestratorInitialization,
    testBackendIntegration,
    testAgentSelection,
    testTaskDelegation,
    testConversationHandoff,
    testEnhancedChatHandlers
};