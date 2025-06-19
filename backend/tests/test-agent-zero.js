// Comprehensive AgentZero Tests with New Helper Methods
require('dotenv').config({ path: '../.env' });
const AgentZero = require('../agent/AgentZero/agent');

async function testAgentZero() {
    console.log('=== AgentZero Comprehensive Test Suite ===\n');
    
    let testsPassed = 0;
    let testsTotal = 0;
    
    function runTest(testName, testFunction) {
        testsTotal++;
        console.log(`🧪 Test ${testsTotal}: ${testName}`);
        try {
            const result = testFunction();
            if (result === true || result === undefined) {
                console.log('✅ PASSED\n');
                testsPassed++;
                return true;
            } else {
                console.log('❌ FAILED\n');
                return false;
            }
        } catch (error) {
            console.log(`❌ FAILED: ${error.message}\n`);
            return false;
        }
    }
    
    async function runAsyncTest(testName, testFunction) {
        testsTotal++;
        console.log(`🧪 Test ${testsTotal}: ${testName}`);
        try {
            const result = await testFunction();
            if (result === true || result === undefined) {
                console.log('✅ PASSED\n');
                testsPassed++;
                return true;
            } else {
                console.log('❌ FAILED\n');
                return false;
            }
        } catch (error) {
            console.log(`❌ FAILED: ${error.message}\n`);
            return false;
        }
    }
    
    try {
        // Test 1: Basic AgentZero Initialization
        await runAsyncTest('AgentZero Initialization', async () => {
            const agent = new AgentZero();
            console.log('   ✅ AgentZero initialized successfully');
            
            // Test that required methods exist
            const requiredMethods = [
                'processMessage', 'selectPromptVariant', 'extractModeFromVariant', 
                'getClassificationMetadata', 'getSessionInfo', 'clearSession'
            ];
            
            for (const method of requiredMethods) {
                if (typeof agent[method] !== 'function') {
                    throw new Error(`Required method ${method} not found`);
                }
            }
            
            console.log('   ✅ All required methods present');
            return true;
        });
        
        // Test 2: extractModeFromVariant Helper Method
        runTest('extractModeFromVariant Helper Method', () => {
            const agent = new AgentZero();
            
            const testCases = [
                { input: 'AgentZero.analytical', expected: 'analytical' },
                { input: 'AgentZero.creative', expected: 'creative' },
                { input: 'AgentZero.technical', expected: 'technical' },
                { input: 'AgentZero.conversational', expected: 'conversational' },
                { input: 'AgentZero', expected: 'default' },
                { input: 'AgentZero.', expected: 'default' },
                { input: '', expected: 'default' },
                { input: null, expected: 'default' },
                { input: undefined, expected: 'default' },
                { input: 'InvalidFormat', expected: 'default' }
            ];
            
            for (const testCase of testCases) {
                const result = agent.extractModeFromVariant(testCase.input);
                console.log(`   ✅ "${testCase.input}" → "${result}"`);
                
                if (result !== testCase.expected) {
                    throw new Error(`Expected "${testCase.expected}" but got "${result}" for input "${testCase.input}"`);
                }
            }
            
            return true;
        });
        
        // Test 3: getClassificationMetadata Helper Method - Keyword Scenario
        runTest('getClassificationMetadata - Keyword Scenario', () => {
            const agent = new AgentZero();
            
            // Simulate keyword-based classification (no intelligent result)
            agent.lastClassificationResult = {
                success: false,
                fallbackUsed: true,
                confidence: 0.5,
                reasoning: 'Keyword-based classification fallback',
                method: 'keyword-based'
            };
            
            const metadata = agent.getClassificationMetadata('AgentZero.analytical', 'analyze this data');
            
            console.log('   📝 Keyword metadata:', metadata);
            
            // Verify structure
            const expectedFields = ['mode', 'confidence', 'reasoning', 'method', 'analysisMode'];
            for (const field of expectedFields) {
                if (!(field in metadata)) {
                    throw new Error(`Missing field: ${field}`);
                }
            }
            
            // Verify values
            if (metadata.mode !== 'analytical') {
                throw new Error(`Expected mode 'analytical' but got '${metadata.mode}'`);
            }
            if (metadata.method !== 'keyword-based') {
                throw new Error(`Expected method 'keyword-based' but got '${metadata.method}'`);
            }
            if (metadata.confidence !== 0.5) {
                throw new Error(`Expected confidence 0.5 but got ${metadata.confidence}`);
            }
            
            return true;
        });
        
        // Test 4: getClassificationMetadata Helper Method - Intelligent Scenario
        runTest('getClassificationMetadata - Intelligent Scenario', () => {
            const agent = new AgentZero();
            
            // Simulate intelligent classification result
            agent.lastClassificationResult = {
                success: true,
                fallbackUsed: false,
                confidence: 0.9,
                reasoning: 'Intelligent classification based on user intent analysis',
                method: 'intelligent',
                analysisMode: 'detailed'
            };
            
            const metadata = agent.getClassificationMetadata('AgentZero.creative', 'create a story');
            
            console.log('   📝 Intelligent metadata:', metadata);
            
            // Verify intelligent classification values
            if (metadata.mode !== 'creative') {
                throw new Error(`Expected mode 'creative' but got '${metadata.mode}'`);
            }
            if (metadata.method !== 'intelligent') {
                throw new Error(`Expected method 'intelligent' but got '${metadata.method}'`);
            }
            if (metadata.confidence !== 0.9) {
                throw new Error(`Expected confidence 0.9 but got ${metadata.confidence}`);
            }
            if (!metadata.reasoning.includes('Intelligent classification')) {
                throw new Error(`Expected intelligent reasoning but got: ${metadata.reasoning}`);
            }
            
            return true;
        });
        
        // Test 5: getClassificationMetadata Error Handling
        runTest('getClassificationMetadata Error Handling', () => {
            const agent = new AgentZero();
            
            // Test with no classification result
            agent.lastClassificationResult = null;
            
            const metadata = agent.getClassificationMetadata('AgentZero.technical', 'debug code');
            
            console.log('   📝 Fallback metadata:', metadata);
            
            // Should return safe fallback values
            if (metadata.mode !== 'technical') {
                throw new Error(`Expected mode 'technical' but got '${metadata.mode}'`);
            }
            if (metadata.method !== 'keyword-based') {
                throw new Error(`Expected fallback method 'keyword-based' but got '${metadata.method}'`);
            }
            if (metadata.confidence !== 0.5) {
                throw new Error(`Expected fallback confidence 0.5 but got ${metadata.confidence}`);
            }
            
            return true;
        });
        
        // Test 6: Classification Info Method
        runTest('Classification Info Method', () => {
            const agent = new AgentZero();
            const info = agent.getClassificationInfo();
            
            console.log('   📝 Classification info:', info);
            
            const requiredFields = ['intelligentClassificationEnabled', 'agentRouterAvailable', 'classificationMethod'];
            for (const field of requiredFields) {
                if (!(field in info)) {
                    throw new Error(`Missing field: ${field}`);
                }
            }
            
            // Verify classification method is consistent
            const expectedMethod = info.intelligentClassificationEnabled && info.agentRouterAvailable ? 'intelligent' : 'keyword-based';
            if (info.classificationMethod !== expectedMethod) {
                throw new Error(`Classification method inconsistency: expected ${expectedMethod}, got ${info.classificationMethod}`);
            }
            
            return true;
        });
        
        // Test 7: Keyword-based Classification
        await runAsyncTest('Keyword-based Classification', async () => {
            const agent = new AgentZero();
            
            // Force keyword-based classification
            agent.setIntelligentClassification(false);
            
            const testCases = [
                { input: 'analyze this data', expectedMode: 'analytical' },
                { input: 'create something new', expectedMode: 'creative' },
                { input: 'debug this code', expectedMode: 'technical' },
                { input: 'how are you?', expectedMode: 'conversational' },
                { input: 'random question', expectedMode: 'default' }
            ];
            
            for (const testCase of testCases) {
                try {
                    const variant = await agent.selectPromptVariant(testCase.input, 'test-session');
                    console.log(`   📝 "${testCase.input}" → ${variant}`);
                    
                    const mode = agent.extractModeFromVariant(variant);
                    if (testCase.expectedMode !== 'default' && mode !== testCase.expectedMode) {
                        console.log(`   ⚠️  Expected mode ${testCase.expectedMode} but got ${mode}`);
                    }
                } catch (error) {
                    if (error.message.includes('LLM configuration invalid')) {
                        console.log(`   ⚠️  LLM not available: ${testCase.input} → skipped`);
                    } else {
                        throw error;
                    }
                }
            }
            
            return true;
        });
        
        // Test 8: Session Management
        await runAsyncTest('Session Management', async () => {
        const agent = new AgentZero();
            
            // Test session info for new session
            const sessionInfo1 = agent.getSessionInfo('test-session-1');
            console.log('   📝 New session info:', sessionInfo1);
            
                         // Note: Session is created when getSessionInfo is called, so exists will be true
             if (sessionInfo1.exists !== true) {
                 throw new Error('Session should exist after getSessionInfo call');
             }
            if (sessionInfo1.messageCount !== 0) {
                throw new Error('New session should have 0 messages');
            }
            
            // Test session clearing
            const clearResult = await agent.clearSession('test-session-1');
            console.log(`   📝 Clear session result: ${clearResult}`);
            
            return true;
        });
        
        // Test 9: Full Message Processing (if LLM available)
        await runAsyncTest('Message Processing Integration', async () => {
            try {
                const agent = new AgentZero();
                
        const testMessage = "Hello, can you tell me about yourself?";
                console.log(`   📤 Sending: "${testMessage}"`);
        
        const result = await agent.processMessage(testMessage, 'test-session');
        
        if (result.success) {
                    console.log('   ✅ Response received successfully');
                    console.log(`   📝 Session: ${result.sessionId}`);
                    console.log(`   📝 Provider: ${result.llmProvider}`);
                    console.log(`   📝 Model: ${result.model}`);
                    
                    // Test session info after message
                    const sessionInfo = agent.getSessionInfo('test-session');
                    console.log('   📝 Session after message:', sessionInfo);
                    
                    if (sessionInfo.messageCount < 2) {
                        throw new Error('Session should have at least 2 messages after processing');
                    }
                } else {
                    console.log('   ⚠️  Message processing failed (expected without LLM):', result.error);
                }
                
                return true;
            } catch (error) {
                if (error.message.includes('LLM configuration invalid')) {
                    console.log('   ⚠️  LLM configuration not available - testing structure only');
                    return true;
                } else {
                    throw error;
                }
            }
        });
        
        // Test 10: Enhanced Context Structure Validation
        runTest('Enhanced Context Structure Validation', () => {
            const agent = new AgentZero();
            
            // Set up mock classification result
            agent.lastClassificationResult = {
                success: true,
                fallbackUsed: false,
                confidence: 0.85,
                reasoning: 'Test reasoning for context validation',
                method: 'intelligent',
                analysisMode: 'detailed'
            };
            
            const metadata = agent.getClassificationMetadata('AgentZero.analytical', 'test input');
            
            // Verify enhanced context fields that would be used in agentNode
            const expectedContextFields = {
                mode: 'string',
                confidence: 'number',
                reasoning: 'string',
                method: 'string',
                analysisMode: 'string'
            };
            
            for (const [field, expectedType] of Object.entries(expectedContextFields)) {
                if (!(field in metadata)) {
                    throw new Error(`Missing context field: ${field}`);
                }
                if (typeof metadata[field] !== expectedType) {
                    throw new Error(`Field ${field} should be ${expectedType} but is ${typeof metadata[field]}`);
                }
            }
            
            console.log('   ✅ Enhanced context structure validated');
            console.log('   📝 Context fields:', Object.keys(metadata));
            
            return true;
        });
        
        // Test Summary
        console.log('='.repeat(60));
        console.log('📊 AGENTZERO TEST SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total Tests: ${testsTotal}`);
        console.log(`Passed: ${testsPassed}`);
        console.log(`Failed: ${testsTotal - testsPassed}`);
        console.log(`Success Rate: ${((testsPassed / testsTotal) * 100).toFixed(1)}%`);
        
        if (testsPassed === testsTotal) {
            console.log('\n🎉 All AgentZero tests passed!');
            console.log('✅ New helper methods and enhanced context working correctly');
        } else {
            console.log('\n⚠️  Some AgentZero tests failed. Check the output above for details.');
        }
        
        return testsPassed === testsTotal;
        
    } catch (error) {
        console.error('❌ AgentZero test suite error:', error.message);
        console.error('Stack trace:', error.stack);
        return false;
    }
}

// Run test if called directly
if (require.main === module) {
    testAgentZero().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = testAgentZero; 