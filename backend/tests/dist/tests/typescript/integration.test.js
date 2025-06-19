"use strict";
/**
 * Integration TypeScript Test Suite
 *
 * Comprehensive integration tests for the new architecture including:
 * - Full system integration testing
 * - Agent-Tool-State integration
 * - Orchestrator-Registry-Backend integration
 * - End-to-end workflow testing
 * - Performance and reliability testing
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrationTestUtils = void 0;
exports.testIntegration = testIntegration;
const AgentOrchestrator_1 = require("../../src/orchestrator/AgentOrchestrator");
const AgentRegistry_1 = require("../../src/agents/AgentRegistry");
const ToolRegistry_1 = require("../../src/tools/ToolRegistry");
const StateManager_1 = require("../../src/state/StateManager");
// Test utilities following existing patterns
function runTest(testName, testFunction) {
    try {
        console.log(`🧪 Test: ${testName}`);
        const result = testFunction();
        if (result === true || result === undefined) {
            console.log('✅ PASSED\n');
            return true;
        }
        else {
            console.log('❌ FAILED\n');
            return false;
        }
    }
    catch (error) {
        console.log(`❌ FAILED: ${error.message}\n`);
        return false;
    }
}
async function runAsyncTest(testName, testFunction) {
    try {
        console.log(`🧪 Test: ${testName}`);
        const result = await testFunction();
        if (result === true || result === undefined) {
            console.log('✅ PASSED\n');
            return true;
        }
        else {
            console.log('❌ FAILED\n');
            return false;
        }
    }
    catch (error) {
        console.log(`❌ FAILED: ${error.message}\n`);
        return false;
    }
}
// Integration Test Agent with Tool Support
class IntegrationTestAgent extends BaseAgent_1.BaseAgent {
    constructor(name, agentType = 'integration', toolRegistry) {
        super();
        this.name = name;
        this.agentType = agentType;
        this.toolRegistry = toolRegistry;
    }
    getInfo() {
        return {
            name: this.name,
            version: '1.0.0',
            description: `Integration test agent: ${this.name}`,
            type: this.agentType
        };
    }
    getCapabilities() {
        return {
            processMessage: true,
            supportsSessions: true,
            supportsStreaming: false,
            supportsTools: true,
            supportsMemory: true
        };
    }
    async processMessage(message, context) {
        const sessionId = context?.sessionId || 'default-session';
        const tools = this.toolRegistry.listTools();
        // Simulate intelligent tool selection based on message
        let selectedTool = null;
        if (message.includes('analyze')) {
            selectedTool = tools.find(t => t.category === 'analysis');
        }
        else if (message.includes('process')) {
            selectedTool = tools.find(t => t.category === 'processing');
        }
        let toolResult = null;
        if (selectedTool) {
            try {
                toolResult = await this.toolRegistry.executeTool(selectedTool.name, { input: message }, { sessionId, userId: context?.userId });
            }
            catch (error) {
                console.warn(`Tool execution failed: ${error.message}`);
            }
        }
        return {
            response: `${this.name} processed: ${message}`,
            agentName: this.name,
            agentType: this.agentType,
            sessionId,
            timestamp: new Date().toISOString(),
            toolUsed: selectedTool?.name || null,
            toolResult: toolResult?.data || null,
            availableTools: tools.length,
            context: context || {}
        };
    }
    async cleanup() {
        console.log(`Cleaning up integration test agent: ${this.name}`);
    }
}
// Integration Test Tool
class IntegrationTestTool {
    constructor(name, category = 'general') {
        this.version = '1.0.0';
        this.tags = ['integration', 'test'];
        this.author = 'Integration Test Suite';
        this.name = name;
        this.category = category;
        this.description = `Integration test tool: ${name}`;
    }
    getSchema() {
        return {
            type: 'object',
            properties: {
                input: { type: 'string', description: 'Input for the integration test tool' },
                options: { type: 'object', description: 'Optional configuration' }
            },
            required: ['input']
        };
    }
    getConfig() {
        return {
            timeout: 5000,
            retries: 2,
            cache: true
        };
    }
    async initialize() {
        console.log(`Initializing integration test tool: ${this.name}`);
    }
    async execute(params, context) {
        const input = params.input;
        const options = params.options || {};
        return {
            success: true,
            data: {
                processed: input.toUpperCase(),
                category: this.category,
                toolName: this.name,
                sessionId: context?.sessionId,
                timestamp: new Date().toISOString(),
                options
            },
            metadata: {
                timestamp: new Date().toISOString(),
                executionTime: 10
            }
        };
    }
    async cleanup() {
        console.log(`Cleaning up integration test tool: ${this.name}`);
    }
}
// Integration Test Utilities
class IntegrationTestUtils {
    static async setupFullSystem() {
        // Initialize all systems
        const orchestrator = AgentOrchestrator_1.AgentOrchestrator.getInstance();
        const agentRegistry = AgentRegistry_1.AgentRegistry.getInstance();
        const toolRegistry = ToolRegistry_1.ToolRegistry.getInstance();
        const stateManager = StateManager_1.StateManager.getInstance();
        // Clear and initialize
        await stateManager.clearAllSessions();
        await toolRegistry.clear();
        await agentRegistry.clear();
        await orchestrator.initialize();
        return { orchestrator, agentRegistry, toolRegistry, stateManager };
    }
    static async setupTestAgentsAndTools(agentRegistry, toolRegistry) {
        // Register test tools
        const tools = [
            new IntegrationTestTool('AnalysisTool', 'analysis'),
            new IntegrationTestTool('ProcessingTool', 'processing'),
            new IntegrationTestTool('UtilityTool', 'utility')
        ];
        for (const tool of tools) {
            await toolRegistry.registerTool(tool);
        }
        // Register test agents
        const agents = [
            new IntegrationTestAgent('AnalyticalAgent', 'analytical', toolRegistry),
            new IntegrationTestAgent('ProcessingAgent', 'processing', toolRegistry),
            new IntegrationTestAgent('GeneralAgent', 'general', toolRegistry)
        ];
        for (const agent of agents) {
            agentRegistry.registerAgent(agent.getInfo().name, agent);
        }
    }
    static createTestWorkflow() {
        return [
            {
                message: 'Please analyze this data set',
                sessionId: 'workflow-session-1',
                expectedAgent: 'AnalyticalAgent',
                expectedTool: 'AnalysisTool'
            },
            {
                message: 'Process this information',
                sessionId: 'workflow-session-1',
                expectedAgent: 'ProcessingAgent',
                expectedTool: 'ProcessingTool'
            },
            {
                message: 'Hello, how are you?',
                sessionId: 'workflow-session-2',
                expectedAgent: 'GeneralAgent'
            }
        ];
    }
    static verifyWorkflowResponse(response, expected) {
        if (expected.agentName && response.agentName !== expected.agentName) {
            throw new Error(`Expected agent ${expected.agentName}, got ${response.agentName}`);
        }
        if (expected.toolUsed && response.toolUsed !== expected.toolUsed) {
            throw new Error(`Expected tool ${expected.toolUsed}, got ${response.toolUsed}`);
        }
        if (expected.sessionId && response.sessionId !== expected.sessionId) {
            throw new Error(`Expected session ${expected.sessionId}, got ${response.sessionId}`);
        }
        // Verify basic response structure
        const requiredFields = ['response', 'agentName', 'sessionId', 'timestamp'];
        for (const field of requiredFields) {
            if (!(field in response)) {
                throw new Error(`Response missing required field: ${field}`);
            }
        }
    }
    static async measureSystemPerformance(operation, iterations = 1) {
        const times = [];
        for (let i = 0; i < iterations; i++) {
            const start = Date.now();
            await operation();
            times.push(Date.now() - start);
        }
        return {
            averageTime: times.reduce((a, b) => a + b, 0) / times.length,
            minTime: Math.min(...times),
            maxTime: Math.max(...times),
            totalTime: times.reduce((a, b) => a + b, 0)
        };
    }
}
exports.IntegrationTestUtils = IntegrationTestUtils;
async function testIntegration() {
    console.log('=== Integration TypeScript Test Suite ===\n');
    let testsPassed = 0;
    let testsTotal = 0;
    function incrementTest(passed) {
        testsTotal++;
        if (passed)
            testsPassed++;
    }
    // Test 1: Full System Initialization
    incrementTest(await runAsyncTest('Full System Initialization', async () => {
        const { orchestrator, agentRegistry, toolRegistry, stateManager } = await IntegrationTestUtils.setupFullSystem();
        // Verify all systems are initialized
        const orchestratorInfo = orchestrator.getOrchestratorInfo();
        if (!orchestratorInfo.initialized) {
            throw new Error('Orchestrator should be initialized');
        }
        const agentStats = agentRegistry.getStats();
        if (typeof agentStats.totalAgents !== 'number') {
            throw new Error('Agent registry should provide stats');
        }
        const toolStats = toolRegistry.getRegistryStats();
        if (typeof toolStats.totalTools !== 'number') {
            throw new Error('Tool registry should provide stats');
        }
        const stateInfo = await stateManager.getStateInfo();
        if (typeof stateInfo.totalSessions !== 'number') {
            throw new Error('State manager should provide info');
        }
        console.log('   ✅ All systems initialized successfully');
        console.log(`   📊 System stats: ${agentStats.totalAgents} agents, ${toolStats.totalTools} tools, ${stateInfo.totalSessions} sessions`);
        return true;
    }));
    // Test 2: Agent-Tool Integration
    incrementTest(await runAsyncTest('Agent-Tool Integration', async () => {
        const { agentRegistry, toolRegistry } = await IntegrationTestUtils.setupFullSystem();
        await IntegrationTestUtils.setupTestAgentsAndTools(agentRegistry, toolRegistry);
        // Verify tools are registered
        const tools = toolRegistry.listTools();
        if (tools.length !== 3) {
            throw new Error(`Expected 3 tools, got ${tools.length}`);
        }
        // Verify agents are registered
        const agents = agentRegistry.getAvailableAgents();
        if (agents.length !== 3) {
            throw new Error(`Expected 3 agents, got ${agents.length}`);
        }
        // Test agent using tools
        const agent = agentRegistry.getAgent('AnalyticalAgent');
        if (!agent) {
            throw new Error('Should be able to retrieve analytical agent');
        }
        const response = await agent.processMessage('analyze this data', {
            sessionId: 'tool-integration-test',
            userId: 'test-user'
        });
        if (response.toolUsed !== 'AnalysisTool') {
            throw new Error(`Expected AnalysisTool to be used, got ${response.toolUsed}`);
        }
        if (!response.toolResult) {
            throw new Error('Should have tool result');
        }
        console.log('   ✅ Agent-Tool integration working correctly');
        console.log(`   🔧 Tool used: ${response.toolUsed}, Result: ${JSON.stringify(response.toolResult)}`);
        return true;
    }));
    // Test 3: State Management Integration
    incrementTest(await runAsyncTest('State Management Integration', async () => {
        const { agentRegistry, toolRegistry, stateManager } = await IntegrationTestUtils.setupFullSystem();
        await IntegrationTestUtils.setupTestAgentsAndTools(agentRegistry, toolRegistry);
        const sessionId = 'state-integration-test';
        // Create session
        const session = await stateManager.createSession(sessionId, {
            testType: 'state-integration'
        });
        // Set agent state
        const agentState = {
            agentName: 'AnalyticalAgent',
            isActive: true,
            lastUsed: new Date(),
            context: { mode: 'analysis', confidence: 0.8 },
            memory: { lastAnalysis: 'data-set-1' },
            configuration: { maxTokens: 2000 }
        };
        await stateManager.setAgentState(sessionId, 'AnalyticalAgent', agentState);
        // Add conversation history
        await stateManager.addToConversationHistory(sessionId, {
            role: 'user',
            content: 'Analyze this data',
            timestamp: new Date()
        });
        // Verify state persistence
        const retrievedSession = await stateManager.getSession(sessionId);
        if (!retrievedSession) {
            throw new Error('Should be able to retrieve session');
        }
        const retrievedAgentState = await stateManager.getAgentState(sessionId, 'AnalyticalAgent');
        if (!retrievedAgentState || !retrievedAgentState.isActive) {
            throw new Error('Should have active agent state');
        }
        const history = await stateManager.getConversationHistory(sessionId);
        if (history.length !== 1) {
            throw new Error('Should have one message in history');
        }
        console.log('   ✅ State management integration working correctly');
        console.log(`   💾 Session: ${retrievedSession.sessionId}, Agent active: ${retrievedAgentState.isActive}, History: ${history.length} messages`);
        return true;
    }));
    // Test 4: Full Orchestrator Integration
    incrementTest(await runAsyncTest('Full Orchestrator Integration', async () => {
        const { orchestrator, agentRegistry, toolRegistry, stateManager } = await IntegrationTestUtils.setupFullSystem();
        await IntegrationTestUtils.setupTestAgentsAndTools(agentRegistry, toolRegistry);
        // Register agents with orchestrator
        const agents = agentRegistry.getAllAgents();
        for (const [name, agent] of agents) {
            await orchestrator.registerAgent(name, agent);
        }
        // Test orchestrated request
        const request = {
            message: 'Please analyze this dataset',
            sessionId: 'orchestrator-integration-test',
            agentType: 'analytical',
            timestamp: new Date().toISOString(),
            metadata: {
                userAgent: 'integration-test',
                ipAddress: '127.0.0.1'
            }
        };
        const response = await orchestrator.processRequest(request);
        IntegrationTestUtils.verifyWorkflowResponse(response, {
            agentName: 'AnalyticalAgent',
            sessionId: 'orchestrator-integration-test'
        });
        // Verify state was updated
        const session = await stateManager.getSession('orchestrator-integration-test');
        if (!session) {
            throw new Error('Session should be created by orchestrator');
        }
        console.log('   ✅ Full orchestrator integration working correctly');
        console.log(`   🎯 Response: ${response.response}`);
        return true;
    }));
    // Test 5: End-to-End Workflow Testing
    incrementTest(await runAsyncTest('End-to-End Workflow Testing', async () => {
        const { orchestrator, agentRegistry, toolRegistry, stateManager } = await IntegrationTestUtils.setupFullSystem();
        await IntegrationTestUtils.setupTestAgentsAndTools(agentRegistry, toolRegistry);
        // Register agents with orchestrator
        const agents = agentRegistry.getAllAgents();
        for (const [name, agent] of agents) {
            await orchestrator.registerAgent(name, agent);
        }
        const workflow = IntegrationTestUtils.createTestWorkflow();
        const results = [];
        for (const step of workflow) {
            const request = {
                message: step.message,
                sessionId: step.sessionId,
                agentType: step.expectedAgent?.toLowerCase().replace('agent', '') || 'auto',
                timestamp: new Date().toISOString(),
                metadata: { workflowStep: true }
            };
            const response = await orchestrator.processRequest(request);
            results.push(response);
            // Verify expected outcomes
            if (step.expectedAgent && response.agentName !== step.expectedAgent) {
                throw new Error(`Step failed: expected ${step.expectedAgent}, got ${response.agentName}`);
            }
            if (step.expectedTool && response.toolUsed !== step.expectedTool) {
                throw new Error(`Step failed: expected tool ${step.expectedTool}, got ${response.toolUsed}`);
            }
        }
        // Verify workflow completion
        if (results.length !== workflow.length) {
            throw new Error(`Expected ${workflow.length} results, got ${results.length}`);
        }
        // Verify sessions were created
        const sessions = await stateManager.listActiveSessions();
        const workflowSessions = sessions.filter(s => s.startsWith('workflow-session'));
        if (workflowSessions.length !== 2) {
            throw new Error(`Expected 2 workflow sessions, got ${workflowSessions.length}`);
        }
        console.log('   ✅ End-to-end workflow testing working correctly');
        console.log(`   🔄 Completed ${results.length} workflow steps across ${workflowSessions.length} sessions`);
        return true;
    }));
    // Test 6: Concurrent Multi-Agent Processing
    incrementTest(await runAsyncTest('Concurrent Multi-Agent Processing', async () => {
        const { orchestrator, agentRegistry, toolRegistry } = await IntegrationTestUtils.setupFullSystem();
        await IntegrationTestUtils.setupTestAgentsAndTools(agentRegistry, toolRegistry);
        // Register agents with orchestrator
        const agents = agentRegistry.getAllAgents();
        for (const [name, agent] of agents) {
            await orchestrator.registerAgent(name, agent);
        }
        // Create concurrent requests
        const concurrentRequests = [
            {
                message: 'Analyze data set A',
                sessionId: 'concurrent-1',
                agentType: 'analytical'
            },
            {
                message: 'Process information B',
                sessionId: 'concurrent-2',
                agentType: 'processing'
            },
            {
                message: 'General query C',
                sessionId: 'concurrent-3',
                agentType: 'general'
            },
            {
                message: 'Analyze data set D',
                sessionId: 'concurrent-4',
                agentType: 'analytical'
            }
        ];
        const requests = concurrentRequests.map(req => ({
            message: req.message,
            sessionId: req.sessionId,
            agentType: req.agentType,
            timestamp: new Date().toISOString(),
            metadata: { concurrent: true }
        }));
        // Process all requests concurrently
        const startTime = Date.now();
        const responses = await Promise.all(requests.map(request => orchestrator.processRequest(request)));
        const totalTime = Date.now() - startTime;
        // Verify all responses
        if (responses.length !== concurrentRequests.length) {
            throw new Error(`Expected ${concurrentRequests.length} responses, got ${responses.length}`);
        }
        // Verify response correctness
        for (let i = 0; i < responses.length; i++) {
            const response = responses[i];
            const expected = concurrentRequests[i];
            if (response.sessionId !== expected.sessionId) {
                throw new Error(`Response ${i} has wrong session ID`);
            }
            if (!response.response.includes(response.agentName)) {
                throw new Error(`Response ${i} should contain agent name`);
            }
        }
        console.log('   ✅ Concurrent multi-agent processing working correctly');
        console.log(`   ⚡ Processed ${responses.length} concurrent requests in ${totalTime}ms`);
        return true;
    }));
    // Test 7: System Performance and Reliability
    incrementTest(await runAsyncTest('System Performance and Reliability', async () => {
        const { orchestrator, agentRegistry, toolRegistry } = await IntegrationTestUtils.setupFullSystem();
        await IntegrationTestUtils.setupTestAgentsAndTools(agentRegistry, toolRegistry);
        // Register agents with orchestrator
        const agents = agentRegistry.getAllAgents();
        for (const [name, agent] of agents) {
            await orchestrator.registerAgent(name, agent);
        }
        // Performance test
        const testOperation = async () => {
            const request = {
                message: 'Performance test message',
                sessionId: `perf-${Date.now()}`,
                agentType: 'general',
                timestamp: new Date().toISOString(),
                metadata: { performanceTest: true }
            };
            return await orchestrator.processRequest(request);
        };
        const performanceResults = await IntegrationTestUtils.measureSystemPerformance(testOperation, 10);
        if (performanceResults.averageTime > 1000) {
            console.log(`   ⚠️  Warning: Average response time is ${performanceResults.averageTime}ms`);
        }
        // Reliability test - multiple operations
        const reliabilityPromises = [];
        for (let i = 0; i < 20; i++) {
            reliabilityPromises.push(testOperation());
        }
        const reliabilityResults = await Promise.all(reliabilityPromises);
        const successfulResults = reliabilityResults.filter(r => r && r.response);
        if (successfulResults.length !== reliabilityResults.length) {
            throw new Error(`Reliability test failed: ${successfulResults.length}/${reliabilityResults.length} successful`);
        }
        console.log('   ✅ System performance and reliability testing passed');
        console.log(`   📊 Performance: ${performanceResults.averageTime.toFixed(2)}ms avg (${performanceResults.minTime}-${performanceResults.maxTime}ms)`);
        console.log(`   🛡️  Reliability: ${successfulResults.length}/${reliabilityResults.length} operations successful`);
        return true;
    }));
    // Test 8: Error Recovery and Resilience
    incrementTest(await runAsyncTest('Error Recovery and Resilience', async () => {
        const { orchestrator, agentRegistry, toolRegistry } = await IntegrationTestUtils.setupFullSystem();
        await IntegrationTestUtils.setupTestAgentsAndTools(agentRegistry, toolRegistry);
        // Register agents with orchestrator
        const agents = agentRegistry.getAllAgents();
        for (const [name, agent] of agents) {
            await orchestrator.registerAgent(name, agent);
        }
        // Test with invalid agent type
        const invalidRequest = {
            message: 'Test with invalid agent',
            sessionId: 'error-recovery-test',
            agentType: 'nonexistent',
            timestamp: new Date().toISOString(),
            metadata: { errorTest: true }
        };
        try {
            const response = await orchestrator.processRequest(invalidRequest);
            // Should either handle gracefully or fall back to default agent
            if (response.error) {
                console.log('   ✅ Error handled gracefully with error response');
            }
            else if (response.agentName) {
                console.log('   ✅ Fallback to default agent successful');
            }
            else {
                throw new Error('Should either return error or fallback response');
            }
        }
        catch (error) {
            // Exception is also acceptable error handling
            console.log('   ✅ Error handled with exception (acceptable)');
        }
        // Test system recovery after error
        const normalRequest = {
            message: 'Normal request after error',
            sessionId: 'error-recovery-test-2',
            agentType: 'general',
            timestamp: new Date().toISOString(),
            metadata: { postErrorTest: true }
        };
        const recoveryResponse = await orchestrator.processRequest(normalRequest);
        if (!recoveryResponse.response) {
            throw new Error('System should recover and process normal requests');
        }
        console.log('   ✅ Error recovery and resilience working correctly');
        console.log(`   🔄 System recovered successfully: ${recoveryResponse.agentName}`);
        return true;
    }));
    // Test 9: Memory and Resource Management
    incrementTest(await runAsyncTest('Memory and Resource Management', async () => {
        const { orchestrator, agentRegistry, toolRegistry, stateManager } = await IntegrationTestUtils.setupFullSystem();
        await IntegrationTestUtils.setupTestAgentsAndTools(agentRegistry, toolRegistry);
        // Register agents with orchestrator
        const agents = agentRegistry.getAllAgents();
        for (const [name, agent] of agents) {
            await orchestrator.registerAgent(name, agent);
        }
        // Create many sessions and process requests
        const sessionCount = 50;
        const requestPromises = [];
        for (let i = 0; i < sessionCount; i++) {
            const request = {
                message: `Memory test message ${i}`,
                sessionId: `memory-test-${i}`,
                agentType: 'general',
                timestamp: new Date().toISOString(),
                metadata: { memoryTest: true, index: i }
            };
            requestPromises.push(orchestrator.processRequest(request));
        }
        const responses = await Promise.all(requestPromises);
        // Verify all requests were processed
        if (responses.length !== sessionCount) {
            throw new Error(`Expected ${sessionCount} responses, got ${responses.length}`);
        }
        // Check system state
        const stateInfo = await stateManager.getStateInfo();
        if (stateInfo.totalSessions < sessionCount) {
            throw new Error(`Expected at least ${sessionCount} sessions, got ${stateInfo.totalSessions}`);
        }
        // Test cleanup
        await stateManager.clearAllSessions();
        const clearedStateInfo = await stateManager.getStateInfo();
        if (clearedStateInfo.totalSessions !== 0) {
            throw new Error('Sessions should be cleared');
        }
        console.log('   ✅ Memory and resource management working correctly');
        console.log(`   💾 Processed ${sessionCount} sessions, cleaned up successfully`);
        return true;
    }));
    // Test 10: System Statistics and Monitoring
    incrementTest(await runAsyncTest('System Statistics and Monitoring', async () => {
        const { orchestrator, agentRegistry, toolRegistry, stateManager } = await IntegrationTestUtils.setupFullSystem();
        await IntegrationTestUtils.setupTestAgentsAndTools(agentRegistry, toolRegistry);
        // Register agents with orchestrator
        const agents = agentRegistry.getAllAgents();
        for (const [name, agent] of agents) {
            await orchestrator.registerAgent(name, agent);
        }
        // Process some requests to generate statistics
        const requests = [
            { message: 'Analyze data', agentType: 'analytical' },
            { message: 'Process info', agentType: 'processing' },
            { message: 'General query', agentType: 'general' }
        ];
        for (let i = 0; i < requests.length; i++) {
            const request = {
                message: requests[i].message,
                sessionId: `stats-session-${i}`,
                agentType: requests[i].agentType,
                timestamp: new Date().toISOString(),
                metadata: { statsTest: true }
            };
            await orchestrator.processRequest(request);
        }
        // Collect system statistics
        const orchestratorInfo = orchestrator.getOrchestratorInfo();
        const agentStats = agentRegistry.getStats();
        const toolStats = toolRegistry.getRegistryStats();
        const stateInfo = await stateManager.getStateInfo();
        // Verify statistics are meaningful
        if (orchestratorInfo.totalAgents !== 3) {
            throw new Error(`Expected 3 agents in orchestrator, got ${orchestratorInfo.totalAgents}`);
        }
        if (agentStats.totalAgents !== 3) {
            throw new Error(`Expected 3 agents in registry, got ${agentStats.totalAgents}`);
        }
        if (toolStats.totalTools !== 3) {
            throw new Error(`Expected 3 tools in registry, got ${toolStats.totalTools}`);
        }
        if (stateInfo.totalSessions !== 3) {
            throw new Error(`Expected 3 sessions in state manager, got ${stateInfo.totalSessions}`);
        }
        console.log('   ✅ System statistics and monitoring working correctly');
        console.log('   📊 System Overview:');
        console.log(`       Orchestrator: ${orchestratorInfo.totalAgents} agents, ${orchestratorInfo.totalRequests || 0} requests`);
        console.log(`       Agent Registry: ${agentStats.totalAgents} agents`);
        console.log(`       Tool Registry: ${toolStats.totalTools} tools, ${toolStats.totalExecutions} executions`);
        console.log(`       State Manager: ${stateInfo.totalSessions} sessions, ${stateInfo.totalAgents} agent states`);
        return true;
    }));
    // Test Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 INTEGRATION TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total: ${testsTotal} tests, ${testsPassed} passed, ${testsTotal - testsPassed} failed`);
    if (testsPassed === testsTotal) {
        console.log('🎉 All Integration tests passed!');
        console.log('🏗️  New architecture fully validated and operational!');
    }
    else {
        console.log('⚠️  Some Integration tests failed.');
        process.exit(1);
    }
}
// Run tests if this file is executed directly
if (require.main === module) {
    testIntegration().catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });
}
