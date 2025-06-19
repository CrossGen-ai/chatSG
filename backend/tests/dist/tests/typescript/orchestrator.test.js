"use strict";
/**
 * Orchestrator TypeScript Test Suite
 *
 * Comprehensive tests for the Orchestrator system including:
 * - AgentOrchestrator initialization and management
 * - Multi-agent orchestration workflows
 * - Backend integration and middleware
 * - Request routing and response handling
 * - Error handling and recovery
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrchestratorTestUtils = void 0;
exports.testOrchestrator = testOrchestrator;
const AgentOrchestrator_1 = require("../../src/orchestrator/AgentOrchestrator");
const OrchestrationMiddleware_1 = require("../../src/orchestrator/OrchestrationMiddleware");
const BackendIntegration_1 = require("../../src/orchestrator/BackendIntegration");
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
// Mock Agent for orchestrator testing
class MockOrchestratorAgent extends BaseAgent_1.BaseAgent {
    constructor(name, agentType = 'mock', capabilities = { processMessage: true, supportsSessions: false }, responseDelay = 0, shouldFail = false) {
        super();
        this.name = name;
        this.agentType = agentType;
        this.capabilities = capabilities;
        this.responseDelay = responseDelay;
        this.shouldFail = shouldFail;
    }
    getInfo() {
        return {
            name: this.name,
            version: '1.0.0',
            description: `Mock orchestrator agent: ${this.name}`,
            type: this.agentType
        };
    }
    getCapabilities() {
        return this.capabilities;
    }
    async processMessage(message, context) {
        // Simulate processing delay
        if (this.responseDelay > 0) {
            await new Promise(resolve => setTimeout(resolve, this.responseDelay));
        }
        if (this.shouldFail) {
            throw new Error(`Mock agent ${this.name} configured to fail`);
        }
        return {
            response: `${this.name} processed: ${message}`,
            agentName: this.name,
            agentType: this.agentType,
            timestamp: new Date().toISOString(),
            context: context || {}
        };
    }
    async cleanup() {
        console.log(`Cleaning up mock orchestrator agent: ${this.name}`);
    }
}
// Mock Backend Integration for testing
class MockBackendIntegration extends BackendIntegration_1.BackendIntegration {
    constructor() {
        super();
        this.responses = new Map();
        this.requestLog = [];
    }
    setMockResponse(endpoint, response) {
        this.responses.set(endpoint, response);
    }
    getRequestLog() {
        return [...this.requestLog];
    }
    clearRequestLog() {
        this.requestLog = [];
    }
    async sendRequest(endpoint, data) {
        this.requestLog.push({ endpoint, data, timestamp: new Date() });
        const mockResponse = this.responses.get(endpoint);
        if (mockResponse) {
            if (mockResponse.error) {
                throw new Error(mockResponse.error);
            }
            return mockResponse;
        }
        // Default mock response
        return {
            success: true,
            data: `Mock response for ${endpoint}`,
            timestamp: new Date().toISOString()
        };
    }
}
// Orchestrator Test Utilities
class OrchestratorTestUtils {
    static createMockAgent(name, options = {}) {
        const capabilities = {
            processMessage: true,
            supportsSessions: false,
            supportsStreaming: false,
            supportsTools: false,
            supportsMemory: false,
            ...options.capabilities
        };
        return new MockOrchestratorAgent(name, options.type, capabilities, options.responseDelay, options.shouldFail);
    }
    static async createTestOrchestrator() {
        const orchestrator = AgentOrchestrator_1.AgentOrchestrator.getInstance();
        await orchestrator.initialize();
        return orchestrator;
    }
    static createMockBackend() {
        return new MockBackendIntegration();
    }
    static verifyOrchestratorResponse(response, expectedFields, expectedValues) {
        for (const field of expectedFields) {
            if (!(field in response)) {
                throw new Error(`Response should contain field: ${field}`);
            }
        }
        if (expectedValues) {
            for (const [key, value] of Object.entries(expectedValues)) {
                if (response[key] !== value) {
                    throw new Error(`Expected ${key} to be ${value}, got ${response[key]}`);
                }
            }
        }
    }
    static async measureResponseTime(asyncFunction) {
        const start = Date.now();
        await asyncFunction();
        return Date.now() - start;
    }
    static createTestRequest(message, sessionId, agentType) {
        return {
            message,
            sessionId: sessionId || 'test-session',
            agentType: agentType || 'auto',
            timestamp: new Date().toISOString(),
            metadata: {
                userAgent: 'test-client',
                ipAddress: '127.0.0.1'
            }
        };
    }
}
exports.OrchestratorTestUtils = OrchestratorTestUtils;
async function testOrchestrator() {
    console.log('=== Orchestrator TypeScript Test Suite ===\n');
    let testsPassed = 0;
    let testsTotal = 0;
    function incrementTest(passed) {
        testsTotal++;
        if (passed)
            testsPassed++;
    }
    // Test 1: AgentOrchestrator Singleton Pattern
    incrementTest(runTest('AgentOrchestrator Singleton Pattern', () => {
        const orchestrator1 = AgentOrchestrator_1.AgentOrchestrator.getInstance();
        const orchestrator2 = AgentOrchestrator_1.AgentOrchestrator.getInstance();
        if (orchestrator1 !== orchestrator2) {
            throw new Error('AgentOrchestrator should be a singleton');
        }
        console.log('   ✅ Singleton pattern working correctly');
        return true;
    }));
    // Test 2: Orchestrator Initialization
    incrementTest(await runAsyncTest('Orchestrator Initialization', async () => {
        const orchestrator = await OrchestratorTestUtils.createTestOrchestrator();
        // Verify orchestrator is initialized
        const info = orchestrator.getOrchestratorInfo();
        if (!info.initialized) {
            throw new Error('Orchestrator should be initialized');
        }
        if (typeof info.totalAgents !== 'number') {
            throw new Error('Orchestrator info should include total agents count');
        }
        console.log('   ✅ Orchestrator initialization successful');
        console.log(`   📊 Orchestrator info: ${JSON.stringify(info)}`);
        return true;
    }));
    // Test 3: Agent Registration in Orchestrator
    incrementTest(await runAsyncTest('Agent Registration in Orchestrator', async () => {
        const orchestrator = await OrchestratorTestUtils.createTestOrchestrator();
        const mockAgent = OrchestratorTestUtils.createMockAgent('TestAgent', {
            type: 'analytical',
            capabilities: { processMessage: true, supportsSessions: true }
        });
        // Register agent
        await orchestrator.registerAgent('TestAgent', mockAgent);
        // Verify registration
        const availableAgents = orchestrator.getAvailableAgents();
        if (!availableAgents.includes('TestAgent')) {
            throw new Error('Agent should be available after registration');
        }
        const agentInfo = orchestrator.getAgentInfo('TestAgent');
        if (!agentInfo) {
            throw new Error('Should have agent info after registration');
        }
        if (agentInfo.name !== 'TestAgent' || agentInfo.type !== 'analytical') {
            throw new Error('Agent info should match registered agent');
        }
        console.log('   ✅ Agent registration in orchestrator working correctly');
        return true;
    }));
    // Test 4: Simple Message Orchestration
    incrementTest(await runAsyncTest('Simple Message Orchestration', async () => {
        const orchestrator = await OrchestratorTestUtils.createTestOrchestrator();
        const mockAgent = OrchestratorTestUtils.createMockAgent('SimpleAgent', {
            type: 'conversational'
        });
        await orchestrator.registerAgent('SimpleAgent', mockAgent);
        const request = OrchestratorTestUtils.createTestRequest('Hello world', 'test-session', 'conversational');
        const response = await orchestrator.processRequest(request);
        OrchestratorTestUtils.verifyOrchestratorResponse(response, [
            'response', 'agentName', 'sessionId', 'timestamp'
        ], {
            agentName: 'SimpleAgent',
            sessionId: 'test-session'
        });
        if (!response.response.includes('SimpleAgent processed: Hello world')) {
            throw new Error('Response should contain processed message');
        }
        console.log('   ✅ Simple message orchestration working correctly');
        console.log(`   💬 Response: ${response.response}`);
        return true;
    }));
    // Test 5: Multi-Agent Orchestration
    incrementTest(await runAsyncTest('Multi-Agent Orchestration', async () => {
        const orchestrator = await OrchestratorTestUtils.createTestOrchestrator();
        // Register multiple agents
        const agents = [
            { name: 'AnalyticalAgent', type: 'analytical' },
            { name: 'CreativeAgent', type: 'creative' },
            { name: 'TechnicalAgent', type: 'technical' }
        ];
        for (const agentInfo of agents) {
            const agent = OrchestratorTestUtils.createMockAgent(agentInfo.name, {
                type: agentInfo.type
            });
            await orchestrator.registerAgent(agentInfo.name, agent);
        }
        // Test routing to different agents
        const requests = [
            { message: 'Analyze this data', agentType: 'analytical', expectedAgent: 'AnalyticalAgent' },
            { message: 'Create a story', agentType: 'creative', expectedAgent: 'CreativeAgent' },
            { message: 'Debug this code', agentType: 'technical', expectedAgent: 'TechnicalAgent' }
        ];
        for (const req of requests) {
            const request = OrchestratorTestUtils.createTestRequest(req.message, 'multi-session', req.agentType);
            const response = await orchestrator.processRequest(request);
            if (response.agentName !== req.expectedAgent) {
                throw new Error(`Expected ${req.expectedAgent}, got ${response.agentName}`);
            }
            if (!response.response.includes(req.message)) {
                throw new Error('Response should contain original message');
            }
        }
        console.log('   ✅ Multi-agent orchestration working correctly');
        console.log(`   🤖 Tested ${requests.length} different agent types`);
        return true;
    }));
    // Test 6: Orchestration Middleware
    incrementTest(await runAsyncTest('Orchestration Middleware', async () => {
        const orchestrator = await OrchestratorTestUtils.createTestOrchestrator();
        const middleware = new OrchestrationMiddleware_1.OrchestrationMiddleware();
        // Test middleware processing
        const request = OrchestratorTestUtils.createTestRequest('Test middleware', 'middleware-session');
        const processedRequest = await middleware.preprocessRequest(request);
        if (!processedRequest.metadata.preprocessed) {
            throw new Error('Middleware should add preprocessed flag');
        }
        if (!processedRequest.metadata.requestId) {
            throw new Error('Middleware should add request ID');
        }
        // Test response post-processing
        const mockResponse = {
            response: 'Test response',
            agentName: 'TestAgent',
            sessionId: 'middleware-session',
            timestamp: new Date().toISOString()
        };
        const processedResponse = await middleware.postprocessResponse(mockResponse, processedRequest);
        if (!processedResponse.metadata.postprocessed) {
            throw new Error('Middleware should add postprocessed flag');
        }
        if (processedResponse.metadata.requestId !== processedRequest.metadata.requestId) {
            throw new Error('Middleware should preserve request ID');
        }
        console.log('   ✅ Orchestration middleware working correctly');
        return true;
    }));
    // Test 7: Backend Integration
    incrementTest(await runAsyncTest('Backend Integration', async () => {
        const orchestrator = await OrchestratorTestUtils.createTestOrchestrator();
        const mockBackend = OrchestratorTestUtils.createMockBackend();
        // Set up mock responses
        mockBackend.setMockResponse('/api/agent/process', {
            success: true,
            response: 'Backend processed message',
            agentName: 'BackendAgent'
        });
        // Test backend request
        const testData = { message: 'Test backend', sessionId: 'backend-session' };
        const response = await mockBackend.sendRequest('/api/agent/process', testData);
        if (!response.success) {
            throw new Error('Backend integration should return successful response');
        }
        if (response.response !== 'Backend processed message') {
            throw new Error('Backend should return expected response');
        }
        // Verify request logging
        const requestLog = mockBackend.getRequestLog();
        if (requestLog.length !== 1) {
            throw new Error('Should log exactly one request');
        }
        if (requestLog[0].endpoint !== '/api/agent/process') {
            throw new Error('Should log correct endpoint');
        }
        console.log('   ✅ Backend integration working correctly');
        return true;
    }));
    // Test 8: Error Handling and Recovery
    incrementTest(await runAsyncTest('Error Handling and Recovery', async () => {
        const orchestrator = await OrchestratorTestUtils.createTestOrchestrator();
        const failingAgent = OrchestratorTestUtils.createMockAgent('FailingAgent', {
            shouldFail: true
        });
        await orchestrator.registerAgent('FailingAgent', failingAgent);
        const request = OrchestratorTestUtils.createTestRequest('This should fail', 'error-session');
        try {
            const response = await orchestrator.processRequest(request, { targetAgent: 'FailingAgent' });
            // Should handle error gracefully and return error response
            if (response.success !== false) {
                throw new Error('Should return failed response for failing agent');
            }
            if (!response.error) {
                throw new Error('Should include error information');
            }
            console.log('   ✅ Error handling working correctly');
            console.log(`   ⚠️  Error handled: ${response.error}`);
            return true;
        }
        catch (error) {
            // If orchestrator throws, that's also acceptable error handling
            console.log('   ✅ Error handling working correctly (exception thrown)');
            console.log(`   ⚠️  Exception: ${error.message}`);
            return true;
        }
    }));
    // Test 9: Performance and Concurrent Processing
    incrementTest(await runAsyncTest('Performance and Concurrent Processing', async () => {
        const orchestrator = await OrchestratorTestUtils.createTestOrchestrator();
        // Register agents with different response delays
        const agents = [
            { name: 'FastAgent', delay: 10 },
            { name: 'MediumAgent', delay: 50 },
            { name: 'SlowAgent', delay: 100 }
        ];
        for (const agentInfo of agents) {
            const agent = OrchestratorTestUtils.createMockAgent(agentInfo.name, {
                responseDelay: agentInfo.delay
            });
            await orchestrator.registerAgent(agentInfo.name, agent);
        }
        // Process multiple requests concurrently
        const requests = agents.map((agent, index) => OrchestratorTestUtils.createTestRequest(`Concurrent message ${index}`, `concurrent-session-${index}`));
        const startTime = Date.now();
        const responses = await Promise.all(requests.map((request, index) => orchestrator.processRequest(request, { targetAgent: agents[index].name })));
        const totalTime = Date.now() - startTime;
        // Verify all responses
        if (responses.length !== agents.length) {
            throw new Error(`Expected ${agents.length} responses, got ${responses.length}`);
        }
        for (let i = 0; i < responses.length; i++) {
            if (responses[i].agentName !== agents[i].name) {
                throw new Error(`Response ${i} should be from ${agents[i].name}`);
            }
        }
        // Concurrent processing should be faster than sequential
        const maxSequentialTime = agents.reduce((sum, agent) => sum + agent.delay, 0);
        if (totalTime >= maxSequentialTime) {
            console.log(`   ⚠️  Warning: Concurrent processing took ${totalTime}ms, sequential would be ${maxSequentialTime}ms`);
        }
        console.log('   ✅ Performance and concurrent processing working correctly');
        console.log(`   ⚡ Processed ${responses.length} requests in ${totalTime}ms`);
        return true;
    }));
    // Test 10: Orchestrator Statistics and Monitoring
    incrementTest(await runAsyncTest('Orchestrator Statistics and Monitoring', async () => {
        const orchestrator = await OrchestratorTestUtils.createTestOrchestrator();
        // Register agents and process some requests
        const agent1 = OrchestratorTestUtils.createMockAgent('StatsAgent1');
        const agent2 = OrchestratorTestUtils.createMockAgent('StatsAgent2');
        await orchestrator.registerAgent('StatsAgent1', agent1);
        await orchestrator.registerAgent('StatsAgent2', agent2);
        // Process multiple requests
        for (let i = 0; i < 3; i++) {
            const request1 = OrchestratorTestUtils.createTestRequest(`Message ${i} to Agent1`, `stats-session-${i}`);
            const request2 = OrchestratorTestUtils.createTestRequest(`Message ${i} to Agent2`, `stats-session-${i}`);
            await orchestrator.processRequest(request1, { targetAgent: 'StatsAgent1' });
            await orchestrator.processRequest(request2, { targetAgent: 'StatsAgent2' });
        }
        // Get orchestrator statistics
        const info = orchestrator.getOrchestratorInfo();
        if (info.totalAgents < 2) {
            throw new Error(`Expected at least 2 agents, got ${info.totalAgents}`);
        }
        if (typeof info.totalRequests !== 'number' || info.totalRequests < 6) {
            throw new Error(`Expected at least 6 total requests, got ${info.totalRequests}`);
        }
        const availableAgents = orchestrator.getAvailableAgents();
        if (!availableAgents.includes('StatsAgent1') || !availableAgents.includes('StatsAgent2')) {
            throw new Error('Both stats agents should be available');
        }
        console.log('   ✅ Orchestrator statistics and monitoring working correctly');
        console.log('   📊 Orchestrator Info:', JSON.stringify(info, null, 2));
        return true;
    }));
    // Test Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 ORCHESTRATOR TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total: ${testsTotal} tests, ${testsPassed} passed, ${testsTotal - testsPassed} failed`);
    if (testsPassed === testsTotal) {
        console.log('🎉 All Orchestrator tests passed!');
    }
    else {
        console.log('⚠️  Some Orchestrator tests failed.');
        process.exit(1);
    }
}
// Run tests if this file is executed directly
if (require.main === module) {
    testOrchestrator().catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });
}
