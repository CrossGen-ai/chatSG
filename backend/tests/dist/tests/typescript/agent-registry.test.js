"use strict";
/**
 * AgentRegistry TypeScript Test Suite
 *
 * Comprehensive tests for the AgentRegistry component including:
 * - Singleton pattern
 * - Agent registration and discovery
 * - Metadata management
 * - Capability-based queries
 * - Cache management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentRegistryTestUtils = void 0;
exports.default = testAgentRegistry;
const AgentRegistry_1 = require("../../src/agents/AgentRegistry");
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
// Mock Agent for testing
class MockAgent {
    constructor(name, version = '1.0.0', description = 'Mock agent for testing', agentType = 'mock', capabilities = {
        name: 'MockAgent',
        version: '1.0.0',
        supportedModes: ['chat'],
        features: ['basic'],
        inputTypes: ['text'],
        outputTypes: ['text']
    }) {
        this.name = name;
        this.version = version;
        this.description = description;
        this.agentType = agentType;
        this.capabilities = capabilities;
    }
    getInfo() {
        return {
            name: this.name,
            version: this.version,
            description: this.description,
            type: this.agentType
        };
    }
    getCapabilities() {
        return this.capabilities;
    }
    validateConfig() {
        return { valid: true, errors: [] };
    }
    async processMessage(input, sessionId) {
        return {
            success: true,
            message: `Mock response for: ${input}`,
            sessionId,
            timestamp: new Date().toISOString()
        };
    }
    async cleanup() {
        console.log(`Cleaning up mock agent: ${this.name}`);
    }
}
// AgentRegistry Test Utilities
class AgentRegistryTestUtils {
    static createMockAgent(name, options = {}) {
        const capabilities = {
            name: name,
            version: options.version || '1.0.0',
            supportedModes: ['chat'],
            features: ['basic'],
            inputTypes: ['text'],
            outputTypes: ['text'],
            supportsTools: false,
            supportsStateSharing: false,
            ...options.capabilities
        };
        return new MockAgent(name, options.version, options.description, options.type, capabilities);
    }
    static async createTestRegistry() {
        const registry = AgentRegistry_1.AgentRegistry.getInstance();
        await registry.clear(); // Start with clean state
        return registry;
    }
    static verifyAgentMetadata(metadata, expectedValues) {
        for (const [key, value] of Object.entries(expectedValues)) {
            if (metadata[key] !== value) {
                throw new Error(`Expected ${key} to be ${value}, got ${metadata[key]}`);
            }
        }
    }
    static verifyCapabilities(capabilities, expectedCapabilities) {
        for (const [capability, expected] of Object.entries(expectedCapabilities)) {
            if (capabilities[capability] !== expected) {
                throw new Error(`Expected capability ${capability} to be ${expected}, got ${capabilities[capability]}`);
            }
        }
    }
}
exports.AgentRegistryTestUtils = AgentRegistryTestUtils;
async function testAgentRegistry() {
    console.log('=== AgentRegistry TypeScript Test Suite ===\n');
    let testsPassed = 0;
    let testsTotal = 0;
    function incrementTest(passed) {
        testsTotal++;
        if (passed)
            testsPassed++;
    }
    // Test 1: Singleton Pattern
    incrementTest(runTest('Singleton Pattern', () => {
        const registry1 = AgentRegistry_1.AgentRegistry.getInstance();
        const registry2 = AgentRegistry_1.AgentRegistry.getInstance();
        if (registry1 !== registry2) {
            throw new Error('AgentRegistry should be a singleton');
        }
        console.log('   ✅ Singleton pattern working correctly');
        return true;
    }));
    // Test 2: Agent Registration
    incrementTest(await runAsyncTest('Agent Registration', async () => {
        const registry = await AgentRegistryTestUtils.createTestRegistry();
        const mockAgent = AgentRegistryTestUtils.createMockAgent('TestAgent', {
            version: '2.0.0',
            description: 'Test agent for registration',
            type: 'test',
            capabilities: { supportsTools: true }
        });
        registry.registerAgent('TestAgent', mockAgent);
        // Verify registration
        if (!registry.hasAgent('TestAgent')) {
            throw new Error('Agent should be registered');
        }
        const retrievedAgent = registry.getAgent('TestAgent');
        if (!retrievedAgent) {
            throw new Error('Should be able to retrieve registered agent');
        }
        if (retrievedAgent !== mockAgent) {
            throw new Error('Retrieved agent should be the same instance');
        }
        console.log('   ✅ Agent registration successful');
        return true;
    }));
    // Test 3: Metadata Management
    incrementTest(await runAsyncTest('Metadata Management', async () => {
        const registry = await AgentRegistryTestUtils.createTestRegistry();
        const mockAgent = AgentRegistryTestUtils.createMockAgent('MetadataAgent', {
            version: '1.5.0',
            description: 'Agent for metadata testing',
            type: 'metadata-test',
            capabilities: { supportsTools: true }
        });
        registry.registerAgent('MetadataAgent', mockAgent, {
            description: 'Custom metadata description'
        });
        const metadata = registry.getAgentMetadata('MetadataAgent');
        if (!metadata) {
            throw new Error('Should have metadata for registered agent');
        }
        AgentRegistryTestUtils.verifyAgentMetadata(metadata, {
            name: 'MetadataAgent',
            version: '1.5.0',
            description: 'Custom metadata description', // Should use provided metadata
            type: 'metadata-test'
        });
        AgentRegistryTestUtils.verifyCapabilities(metadata.capabilities, {
            supportsTools: true,
            supportsStateSharing: false
        });
        console.log('   ✅ Metadata management working correctly');
        return true;
    }));
    // Test 4: Capability-based Queries
    incrementTest(await runAsyncTest('Capability-based Queries', async () => {
        const registry = await AgentRegistryTestUtils.createTestRegistry();
        // Register agents with different capabilities
        const agent1 = AgentRegistryTestUtils.createMockAgent('ToolAgent', {
            capabilities: { supportsTools: true }
        });
        const agent2 = AgentRegistryTestUtils.createMockAgent('StateAgent', {
            capabilities: { supportsStateSharing: true }
        });
        const agent3 = AgentRegistryTestUtils.createMockAgent('BothAgent', {
            capabilities: { supportsTools: true, supportsStateSharing: true }
        });
        registry.registerAgent('ToolAgent', agent1);
        registry.registerAgent('StateAgent', agent2);
        registry.registerAgent('BothAgent', agent3);
        // Test capability queries
        const toolAgents = registry.findAgentsByCapability('supportsTools');
        if (toolAgents.length !== 2 || !toolAgents.includes('ToolAgent') || !toolAgents.includes('BothAgent')) {
            throw new Error('Should find 2 agents with tool capability');
        }
        const stateAgents = registry.findAgentsByCapability('supportsStateSharing');
        if (stateAgents.length !== 2 || !stateAgents.includes('StateAgent') || !stateAgents.includes('BothAgent')) {
            throw new Error('Should find 2 agents with state sharing capability');
        }
        console.log('   ✅ Capability-based queries working correctly');
        return true;
    }));
    // Test 5: Performance and Cache Management
    incrementTest(await runAsyncTest('Performance and Cache Management', async () => {
        const registry = await AgentRegistryTestUtils.createTestRegistry();
        // Register multiple agents
        for (let i = 0; i < 10; i++) {
            const agent = AgentRegistryTestUtils.createMockAgent(`Agent${i}`, {
                version: `1.${i}.0`,
                capabilities: { supportsTools: i % 2 === 0 }
            });
            registry.registerAgent(`Agent${i}`, agent);
        }
        // Test performance of listing
        const start = Date.now();
        const agentNames = registry.getAvailableAgents();
        const duration = Date.now() - start;
        if (agentNames.length !== 10) {
            throw new Error(`Expected 10 agents, got ${agentNames.length}`);
        }
        if (duration > 100) {
            throw new Error(`Listing agents took too long: ${duration}ms`);
        }
        console.log(`   ⚡ Listed ${agentNames.length} agents in ${duration}ms`);
        console.log('   ✅ Performance and cache management working correctly');
        return true;
    }));
    // Test 6: Error Handling
    incrementTest(runTest('Error Handling', () => {
        const registry = AgentRegistry_1.AgentRegistry.getInstance();
        // Test getting non-existent agent
        const nonExistentAgent = registry.getAgent('NonExistentAgent');
        if (nonExistentAgent !== null) {
            throw new Error('Should return null for non-existent agent');
        }
        // Test getting metadata for non-existent agent
        const nonExistentMetadata = registry.getAgentMetadata('NonExistentAgent');
        if (nonExistentMetadata !== null) {
            throw new Error('Should return null for non-existent agent metadata');
        }
        console.log('   ✅ Error handling working correctly');
        return true;
    }));
    // Summary
    console.log('============================================================');
    console.log('📊 TYPESCRIPT TEST SUMMARY');
    console.log('============================================================');
    console.log(`Total: ${testsTotal} tests, ${testsPassed} passed, ${testsTotal - testsPassed} failed`);
    if (testsPassed === testsTotal) {
        console.log('🎉 All AgentRegistry TypeScript tests passed!');
        console.log('✨ TypeScript integration working correctly!');
    }
    else {
        console.log('⚠️  Some AgentRegistry TypeScript tests failed.');
        console.log('Check the output above for details.');
    }
}
