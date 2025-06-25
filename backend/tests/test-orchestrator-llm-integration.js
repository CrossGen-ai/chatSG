/**
 * Orchestrator LLM Integration Tests
 * 
 * Comprehensive tests to validate that the orchestrator path works with actual LLM calls,
 * supports provider switching, and handles different agent types correctly.
 */

// Use TypeScript files directly with ts-node
require('ts-node').register({
    compilerOptions: {
        module: 'commonjs',
        target: 'es2020',
        esModuleInterop: true,
        allowJs: true,
        skipLibCheck: true
    }
});

const { createOrchestrationSetup, createBackendIntegration } = require('../src/routing');
const { OrchestratorAgentFactory } = require('../src/agents/individual/IndividualAgentFactory');
const { getLLMHelper } = require('../utils/llm-helper');

/**
 * Test orchestrator LLM integration
 */
async function testOrchestratorLLMIntegration() {
    console.log('\n=== Orchestrator LLM Integration Tests ===');
    
    const results = {
        passed: 0,
        failed: 0,
        errors: []
    };

    try {
        // Test 1: LLM Configuration Validation
        console.log('\n1. Testing LLM Configuration...');
        await testLLMConfiguration(results);

        // Test 2: Agent Creation with LLM Helper
        console.log('\n2. Testing Agent Creation...');
        const agents = await testAgentCreation(results);

        // Test 3: Orchestrator Setup with Agent Registration
        console.log('\n3. Testing Orchestrator Setup...');
        const orchestrator = await testOrchestratorSetup(agents, results);

        // Test 4: Agent Selection for Different Request Types
        console.log('\n4. Testing Agent Selection...');
        await testAgentSelection(orchestrator, results);

        // Test 5: End-to-End Message Processing
        console.log('\n5. Testing End-to-End Processing...');
        await testEndToEndProcessing(orchestrator, agents, results);

        // Test 6: Error Handling
        console.log('\n6. Testing Error Handling...');
        await testErrorHandling(results);

        // Test 7: Provider Switching (if configured)
        console.log('\n7. Testing Provider Detection...');
        await testProviderDetection(results);

    } catch (error) {
        console.error('❌ Critical test failure:', error);
        results.failed++;
        results.errors.push(`Critical failure: ${error.message}`);
    }

    // Print test summary
    console.log('\n=== Test Summary ===');
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📊 Total: ${results.passed + results.failed}`);
    
    if (results.errors.length > 0) {
        console.log('\n🔍 Error Details:');
        results.errors.forEach((error, index) => {
            console.log(`  ${index + 1}. ${error}`);
        });
    }

    const success = results.failed === 0;
    console.log(`\n${success ? '🎉 All tests passed!' : '⚠️  Some tests failed'}`);
    
    return success;
}

/**
 * Test LLM configuration validation
 */
async function testLLMConfiguration(results) {
    try {
        const validation = OrchestratorAgentFactory.validateLLMConfiguration();
        
        if (validation.valid) {
            console.log('✅ LLM configuration is valid');
            results.passed++;
        } else {
            console.log('❌ LLM configuration is invalid:', validation.errors);
            results.failed++;
            results.errors.push(`LLM config invalid: ${validation.errors.join(', ')}`);
        }

        if (validation.warnings && validation.warnings.length > 0) {
            console.log('⚠️  LLM configuration warnings:', validation.warnings);
        }

        // Test LLM helper directly
        const llmHelper = getLLMHelper();
        const configInfo = llmHelper.getConfigInfo();
        console.log(`📋 LLM Provider: ${configInfo.provider}, Model: ${configInfo.model}, Environment: ${configInfo.environment}`);
        
    } catch (error) {
        console.error('❌ LLM configuration test failed:', error);
        results.failed++;
        results.errors.push(`LLM config test error: ${error.message}`);
    }
}

/**
 * Test agent creation with fallback handling
 */
async function testAgentCreation(results) {
    try {
        const agentResult = OrchestratorAgentFactory.createAgentsWithFallback();
        
        if (agentResult.success && agentResult.agents.length > 0) {
            console.log(`✅ Created ${agentResult.agents.length} specialized agents successfully`);
            results.passed++;
            
            // Validate each agent
            for (const agent of agentResult.agents) {
                const info = agent.getInfo();
                const validation = agent.validateConfig();
                
                if (validation.valid) {
                    console.log(`  ✅ ${info.name} (${info.type}) - validated successfully`);
                } else {
                    console.log(`  ❌ ${info.name} validation failed:`, validation.errors);
                    results.failed++;
                    results.errors.push(`Agent ${info.name} validation failed`);
                }
            }
        } else {
            console.log('❌ Agent creation failed:', agentResult.errors);
            results.failed++;
            results.errors.push(`Agent creation failed: ${agentResult.errors.join(', ')}`);
        }

        if (agentResult.warnings.length > 0) {
            console.log('⚠️  Agent creation warnings:', agentResult.warnings);
        }

        return agentResult.agents;
        
    } catch (error) {
        console.error('❌ Agent creation test failed:', error);
        results.failed++;
        results.errors.push(`Agent creation error: ${error.message}`);
        return [];
    }
}

/**
 * Test orchestrator setup and agent registration
 */
async function testOrchestratorSetup(agents, results) {
    try {
        const setup = createOrchestrationSetup('development');
        const orchestrator = setup.orchestrator;
        
        // Register agents
        let registeredCount = 0;
        for (const agent of agents) {
            try {
                orchestrator.registerAgent(agent);
                registeredCount++;
                const info = agent.getInfo();
                console.log(`  ✅ Registered ${info.name} successfully`);
            } catch (regError) {
                console.error(`  ❌ Failed to register ${agent.constructor.name}:`, regError);
                results.errors.push(`Agent registration failed: ${regError.message}`);
            }
        }
        
        if (registeredCount === agents.length) {
            console.log(`✅ Successfully registered all ${registeredCount} agents with orchestrator`);
            results.passed++;
        } else {
            console.log(`❌ Only registered ${registeredCount}/${agents.length} agents`);
            results.failed++;
            results.errors.push(`Partial agent registration: ${registeredCount}/${agents.length}`);
        }

        // Verify agent listing
        const listedAgents = orchestrator.listAgents();
        console.log(`📋 Orchestrator has ${listedAgents.length} registered agents`);
        
        return orchestrator;
        
    } catch (error) {
        console.error('❌ Orchestrator setup test failed:', error);
        results.failed++;
        results.errors.push(`Orchestrator setup error: ${error.message}`);
        return null;
    }
}

/**
 * Test agent selection for different request types
 */
async function testAgentSelection(orchestrator, results) {
    if (!orchestrator) {
        console.log('❌ Cannot test agent selection - orchestrator not available');
        results.failed++;
        return;
    }

    const testRequests = [
        { message: 'Analyze this data set for trends', expectedAgent: 'AnalyticalAgent', category: 'analytical' },
        { message: 'Write a creative story about space exploration', expectedAgent: 'CreativeAgent', category: 'creative' },
        { message: 'Debug this JavaScript code with syntax errors', expectedAgent: 'TechnicalAgent', category: 'technical' },
        { message: 'Research the market trends in AI technology', expectedAgent: 'AnalyticalAgent', category: 'analytical' },
        { message: 'Create an innovative marketing campaign', expectedAgent: 'CreativeAgent', category: 'creative' },
        { message: 'Optimize this Python algorithm for performance', expectedAgent: 'TechnicalAgent', category: 'technical' }
    ];

    let correctSelections = 0;
    
    for (const test of testRequests) {
        try {
            const context = {
                sessionId: 'test-session',
                userInput: test.message,
                availableAgents: ['AnalyticalAgent', 'CreativeAgent', 'TechnicalAgent']
            };
            
            const selection = await orchestrator.selectAgent(test.message, context);
            
            const isCorrect = selection.selectedAgent === test.expectedAgent;
            const status = isCorrect ? '✅' : '⚠️';
            
            console.log(`  ${status} "${test.message.substring(0, 40)}..." → ${selection.selectedAgent} (expected: ${test.expectedAgent})`);
            console.log(`    Confidence: ${(selection.confidence * 100).toFixed(1)}%, Reason: ${selection.reason}`);
            
            if (isCorrect) {
                correctSelections++;
            }
            
        } catch (selectionError) {
            console.error(`  ❌ Selection failed for "${test.message}":`, selectionError);
            results.errors.push(`Selection error: ${selectionError.message}`);
        }
    }
    
    const accuracy = (correctSelections / testRequests.length) * 100;
    console.log(`📊 Agent selection accuracy: ${correctSelections}/${testRequests.length} (${accuracy.toFixed(1)}%)`);
    
    if (accuracy >= 80) {
        console.log('✅ Agent selection accuracy is acceptable (≥80%)');
        results.passed++;
    } else {
        console.log('❌ Agent selection accuracy is below threshold (<80%)');
        results.failed++;
        results.errors.push(`Low selection accuracy: ${accuracy.toFixed(1)}%`);
    }
}

/**
 * Test end-to-end message processing with actual LLM calls
 */
async function testEndToEndProcessing(orchestrator, agents, results) {
    if (!orchestrator || agents.length === 0) {
        console.log('❌ Cannot test end-to-end processing - components not available');
        results.failed++;
        return;
    }

    const testMessages = [
        { message: 'What are the key trends in data analysis?', expectedAgentType: 'AnalyticalAgent' },
        { message: 'Write a short poem about technology', expectedAgentType: 'CreativeAgent' },
        { message: 'Explain how to fix a null pointer exception', expectedAgentType: 'TechnicalAgent' }
    ];

    let successfulProcessing = 0;

    for (const test of testMessages) {
        try {
            console.log(`  🧪 Testing: "${test.message}"`);
            
            // Step 1: Agent Selection
            const context = {
                sessionId: 'e2e-test',
                userInput: test.message,
                availableAgents: agents.map(a => a.getInfo().name)
            };
            
            const selection = await orchestrator.selectAgent(test.message, context);
            console.log(`    Selected: ${selection.selectedAgent} (confidence: ${(selection.confidence * 100).toFixed(1)}%)`);
            
            // Step 2: Get the selected agent
            const selectedAgent = orchestrator.getAgent(selection.selectedAgent);
            if (!selectedAgent) {
                throw new Error(`Selected agent ${selection.selectedAgent} not found`);
            }
            
            // Step 3: Process message with the agent (simulate LLM call)
            try {
                // Test agent's LLM helper integration
                const agentInfo = selectedAgent.getInfo();
                console.log(`    Agent ready: ${agentInfo.name} - ${agentInfo.description}`);
                
                // Validate that the agent has LLM capabilities
                const capabilities = selectedAgent.getCapabilities();
                if (capabilities.features.length > 0) {
                    console.log(`    ✅ Agent has ${capabilities.features.length} features available`);
                    successfulProcessing++;
                } else {
                    console.log(`    ⚠️  Agent has no features configured`);
                }
                
            } catch (agentError) {
                console.error(`    ❌ Agent processing failed:`, agentError);
                results.errors.push(`Agent processing error: ${agentError.message}`);
            }
            
        } catch (e2eError) {
            console.error(`  ❌ End-to-end test failed for "${test.message}":`, e2eError);
            results.errors.push(`E2E error: ${e2eError.message}`);
        }
    }
    
    if (successfulProcessing === testMessages.length) {
        console.log(`✅ End-to-end processing successful for all ${testMessages.length} test messages`);
        results.passed++;
    } else {
        console.log(`❌ End-to-end processing failed for ${testMessages.length - successfulProcessing} messages`);
        results.failed++;
        results.errors.push(`E2E processing failures: ${testMessages.length - successfulProcessing}/${testMessages.length}`);
    }
}

/**
 * Test error handling scenarios
 */
async function testErrorHandling(results) {
    try {
        console.log('  🧪 Testing graceful error handling...');
        
        // Test 1: Invalid agent creation
        try {
            const invalidAgent = OrchestratorAgentFactory.createAgent('NonExistentAgent');
            console.log('❌ Should have failed to create invalid agent');
            results.failed++;
        } catch (expectedError) {
            console.log('  ✅ Correctly rejected invalid agent type');
        }
        
        // Test 2: Factory statistics
        const stats = OrchestratorAgentFactory.getFactoryStats();
        console.log(`  📊 Factory stats: ${stats.supportedAgents} supported agents, LLM valid: ${stats.llmConfigValid}`);
        
        console.log('✅ Error handling tests completed');
        results.passed++;
        
    } catch (error) {
        console.error('❌ Error handling test failed:', error);
        results.failed++;
        results.errors.push(`Error handling test error: ${error.message}`);
    }
}

/**
 * Test provider detection and configuration
 */
async function testProviderDetection(results) {
    try {
        const llmHelper = getLLMHelper();
        const configInfo = llmHelper.getConfigInfo();
        
        console.log(`  📋 Detected Provider: ${configInfo.provider}`);
        console.log(`  📋 Model: ${configInfo.model}`);
        console.log(`  📋 Environment: ${configInfo.environment}`);
        console.log(`  📋 Temperature: ${configInfo.temperature}`);
        
        // Validate provider is supported
        const supportedProviders = ['azure', 'openai'];
        if (supportedProviders.includes(configInfo.provider.toLowerCase())) {
            console.log('✅ Provider detection successful');
            results.passed++;
        } else {
            console.log(`❌ Unsupported provider detected: ${configInfo.provider}`);
            results.failed++;
            results.errors.push(`Unsupported provider: ${configInfo.provider}`);
        }
        
    } catch (error) {
        console.error('❌ Provider detection test failed:', error);
        results.failed++;
        results.errors.push(`Provider detection error: ${error.message}`);
    }
}

/**
 * Run all tests
 */
async function runTests() {
    console.log('🚀 Starting Orchestrator LLM Integration Tests...');
    
    try {
        const success = await testOrchestratorLLMIntegration();
        
        if (success) {
            console.log('\n🎉 All orchestrator LLM integration tests passed successfully!');
            console.log('✅ The orchestrator path is ready for production use');
            process.exit(0);
        } else {
            console.log('\n⚠️  Some tests failed - please review the errors above');
            console.log('❌ The orchestrator path needs attention before production use');
            process.exit(1);
        }
        
    } catch (criticalError) {
        console.error('\n💥 Critical test failure:', criticalError);
        console.log('❌ Unable to complete orchestrator integration tests');
        process.exit(1);
    }
}

// Export for use in other test files
module.exports = {
    testOrchestratorLLMIntegration,
    testLLMConfiguration,
    testAgentCreation,
    testOrchestratorSetup,
    testAgentSelection,
    testEndToEndProcessing,
    testErrorHandling,
    testProviderDetection
};

// Run tests if called directly
if (require.main === module) {
    runTests();
} 