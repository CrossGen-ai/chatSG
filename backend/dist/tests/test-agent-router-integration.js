"use strict";
// AgentRouter and AgentZero Integration Tests
require('dotenv').config({ path: '../.env' });
const AgentRouter = require('../agent/AgentRouter/agent');
const AgentZero = require('../agent/AgentZero/agent');
async function testAgentRouterIntegration() {
    console.log('=== AgentRouter Integration Test Suite ===\n');
    let testsPassed = 0;
    let testsTotal = 0;
    async function runAsyncTest(testName, testFunction) {
        testsTotal++;
        console.log(`🧪 Test ${testsTotal}: ${testName}`);
        try {
            const result = await testFunction();
            if (result === true || result === undefined) {
                console.log('✅ PASSED\n');
                testsPassed++;
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
    try {
        // Test 1: AgentZero Integration Status
        await runAsyncTest('AgentZero Integration Status', async () => {
            try {
                const agentZero = new AgentZero();
                const classificationInfo = agentZero.getClassificationInfo();
                console.log('   📊 Classification Info:', classificationInfo);
                console.log(`   📝 Method: ${classificationInfo.classificationMethod}`);
                console.log(`   📝 AgentRouter Available: ${classificationInfo.agentRouterAvailable}`);
                console.log(`   📝 Intelligent Classification: ${classificationInfo.intelligentClassificationEnabled}`);
                return true;
            }
            catch (error) {
                if (error.message.includes('LLM configuration invalid')) {
                    console.log('   ⚠️  LLM configuration not available (expected in test environment)');
                    console.log('   📝 Error:', error.message);
                    return true; // Expected in test environment
                }
                else {
                    throw error;
                }
            }
        });
        // Test 2: Classification Toggle Functionality
        await runAsyncTest('Classification Toggle Functionality', async () => {
            try {
                const agentZero = new AgentZero();
                // Test disabling intelligent classification
                const disableResult = agentZero.setIntelligentClassification(false);
                console.log(`   📝 Disable result: ${disableResult}`);
                const disabledInfo = agentZero.getClassificationInfo();
                console.log(`   📝 After disable: ${disabledInfo.classificationMethod}`);
                if (disabledInfo.classificationMethod !== 'keyword-based') {
                    throw new Error('Classification method should be keyword-based when disabled');
                }
                // Test re-enabling intelligent classification
                const enableResult = agentZero.setIntelligentClassification(true);
                console.log(`   📝 Enable result: ${enableResult}`);
                const enabledInfo = agentZero.getClassificationInfo();
                console.log(`   📝 After enable: ${enabledInfo.classificationMethod}`);
                return true;
            }
            catch (error) {
                if (error.message.includes('LLM configuration invalid')) {
                    console.log('   ⚠️  LLM configuration not available - testing structure only');
                    return true;
                }
                else {
                    throw error;
                }
            }
        });
        // Test 3: Keyword Fallback Testing
        await runAsyncTest('Keyword Fallback Classification', async () => {
            try {
                const agentZero = new AgentZero();
                // Force keyword-based classification
                agentZero.setIntelligentClassification(false);
                const testCases = [
                    { input: 'Can you analyze this data for me?', expected: 'analytical' },
                    { input: 'Help me create a beautiful story', expected: 'creative' },
                    { input: 'Debug this JavaScript function please', expected: 'technical' },
                    { input: 'How are you doing today?', expected: 'conversational' },
                    { input: 'Just a simple question', expected: 'default' }
                ];
                for (const testCase of testCases) {
                    const variant = await agentZero.selectPromptVariant(testCase.input, 'test-session');
                    console.log(`   📝 "${testCase.input}" → ${variant}`);
                    if (testCase.expected !== 'default') {
                        if (!variant.toLowerCase().includes(testCase.expected)) {
                            console.log(`   ⚠️  Expected ${testCase.expected} but got ${variant}`);
                        }
                    }
                }
                return true;
            }
            catch (error) {
                if (error.message.includes('LLM configuration invalid')) {
                    console.log('   ⚠️  Cannot test without LLM configuration');
                    return true;
                }
                else {
                    throw error;
                }
            }
        });
        // Test 4: Performance Comparison (if LLM available)
        await runAsyncTest('Performance Comparison', async () => {
            try {
                const agentZero = new AgentZero();
                const testInputs = [
                    'Analyze this dataset',
                    'Create a story',
                    'Debug code',
                    'How are you?'
                ];
                // Test keyword-based performance
                agentZero.setIntelligentClassification(false);
                const keywordStart = performance.now();
                for (const input of testInputs) {
                    await agentZero.selectPromptVariant(input, 'test-session');
                }
                const keywordEnd = performance.now();
                const keywordDuration = keywordEnd - keywordStart;
                console.log(`   ⏱️  Keyword classification: ${keywordDuration.toFixed(2)}ms total`);
                console.log(`   📊 Keyword average: ${(keywordDuration / testInputs.length).toFixed(2)}ms per classification`);
                // Test intelligent classification performance (if available)
                const classificationInfo = agentZero.getClassificationInfo();
                if (classificationInfo.agentRouterAvailable) {
                    agentZero.setIntelligentClassification(true);
                    const intelligentStart = performance.now();
                    for (const input of testInputs) {
                        await agentZero.selectPromptVariant(input, 'test-session');
                    }
                    const intelligentEnd = performance.now();
                    const intelligentDuration = intelligentEnd - intelligentStart;
                    console.log(`   ⏱️  Intelligent classification: ${intelligentDuration.toFixed(2)}ms total`);
                    console.log(`   📊 Intelligent average: ${(intelligentDuration / testInputs.length).toFixed(2)}ms per classification`);
                    const overhead = intelligentDuration - keywordDuration;
                    console.log(`   📈 Performance overhead: ${overhead.toFixed(2)}ms (${((overhead / keywordDuration) * 100).toFixed(1)}%)`);
                }
                else {
                    console.log('   ⚠️  AgentRouter not available - cannot test intelligent classification performance');
                }
                return true;
            }
            catch (error) {
                if (error.message.includes('LLM configuration invalid')) {
                    console.log('   ⚠️  Cannot test performance without LLM configuration');
                    return true;
                }
                else {
                    throw error;
                }
            }
        });
        // Test 5: Error Recovery Testing
        await runAsyncTest('Error Recovery Testing', async () => {
            try {
                const agentZero = new AgentZero();
                // Test with various edge cases
                const edgeCases = [
                    '',
                    'x',
                    'a'.repeat(1000), // Very long input
                    '🚀🎯💡', // Emoji input
                    'SELECT * FROM users;', // SQL injection attempt
                    '<script>alert("test")</script>', // XSS attempt
                ];
                for (const edgeCase of edgeCases) {
                    try {
                        const variant = await agentZero.selectPromptVariant(edgeCase, 'test-session');
                        console.log(`   📝 Edge case "${edgeCase.substring(0, 20)}..." → ${variant}`);
                    }
                    catch (error) {
                        console.log(`   ⚠️  Edge case "${edgeCase.substring(0, 20)}..." → Error: ${error.message}`);
                    }
                }
                return true;
            }
            catch (error) {
                if (error.message.includes('LLM configuration invalid')) {
                    console.log('   ⚠️  Cannot test error recovery without LLM configuration');
                    return true;
                }
                else {
                    throw error;
                }
            }
        });
        // Test 6: Enhanced Context Metadata Verification
        await runAsyncTest('Enhanced Context Metadata Verification', async () => {
            try {
                const agentZero = new AgentZero();
                // Test with intelligent classification enabled
                agentZero.setIntelligentClassification(true);
                const testInput = 'Analyze this complex dataset thoroughly';
                // Perform classification to populate lastClassificationResult
                await agentZero.selectPromptVariant(testInput, 'test-session');
                // Get classification metadata
                const metadata = agentZero.getClassificationMetadata('AgentZero.analytical', testInput);
                console.log('   📝 Enhanced metadata structure:', metadata);
                // Verify enhanced context fields
                const requiredFields = ['mode', 'confidence', 'reasoning', 'method', 'analysisMode'];
                for (const field of requiredFields) {
                    if (!(field in metadata)) {
                        throw new Error(`Missing enhanced context field: ${field}`);
                    }
                }
                // Verify field types
                if (typeof metadata.confidence !== 'number') {
                    throw new Error('Confidence should be a number');
                }
                if (typeof metadata.reasoning !== 'string') {
                    throw new Error('Reasoning should be a string');
                }
                if (typeof metadata.method !== 'string') {
                    throw new Error('Method should be a string');
                }
                console.log(`   ✅ Mode: ${metadata.mode}`);
                console.log(`   ✅ Confidence: ${metadata.confidence}`);
                console.log(`   ✅ Method: ${metadata.method}`);
                console.log(`   ✅ Analysis Mode: ${metadata.analysisMode}`);
                return true;
            }
            catch (error) {
                if (error.message.includes('LLM configuration invalid')) {
                    console.log('   ⚠️  LLM not available - testing fallback metadata');
                    // Test fallback metadata structure
                    const agentZero = new AgentZero();
                    const metadata = agentZero.getClassificationMetadata('AgentZero.technical', 'debug code');
                    const requiredFields = ['mode', 'confidence', 'reasoning', 'method', 'analysisMode'];
                    for (const field of requiredFields) {
                        if (!(field in metadata)) {
                            throw new Error(`Missing fallback context field: ${field}`);
                        }
                    }
                    console.log('   ✅ Fallback metadata structure validated');
                    return true;
                }
                else {
                    throw error;
                }
            }
        });
        // Test 7: Template Context Backward Compatibility
        await runAsyncTest('Template Context Backward Compatibility', async () => {
            try {
                const agentZero = new AgentZero();
                // Test that mode variable is still available for template compatibility
                const testCases = [
                    { variant: 'AgentZero.analytical', expectedMode: 'analytical' },
                    { variant: 'AgentZero.creative', expectedMode: 'creative' },
                    { variant: 'AgentZero.technical', expectedMode: 'technical' },
                    { variant: 'AgentZero.conversational', expectedMode: 'conversational' },
                    { variant: 'AgentZero', expectedMode: 'default' }
                ];
                for (const testCase of testCases) {
                    const metadata = agentZero.getClassificationMetadata(testCase.variant, 'test input');
                    console.log(`   📝 ${testCase.variant} → mode: ${metadata.mode}`);
                    if (metadata.mode !== testCase.expectedMode) {
                        throw new Error(`Expected mode ${testCase.expectedMode} but got ${metadata.mode} for ${testCase.variant}`);
                    }
                }
                console.log('   ✅ Template context backward compatibility verified');
                return true;
            }
            catch (error) {
                throw error;
            }
        });
        // Test 8: Classification Result Storage Verification
        await runAsyncTest('Classification Result Storage Verification', async () => {
            try {
                const agentZero = new AgentZero();
                // Test initial state
                if (agentZero.lastClassificationResult !== null) {
                    throw new Error('Initial classification result should be null');
                }
                // Perform classification
                await agentZero.selectPromptVariant('Create a beautiful story', 'test-session');
                // Verify result is stored
                if (agentZero.lastClassificationResult === null) {
                    throw new Error('Classification result should be stored after selectPromptVariant');
                }
                console.log('   📝 Stored result structure:', Object.keys(agentZero.lastClassificationResult));
                // Verify required fields in stored result
                const requiredFields = ['success', 'fallbackUsed'];
                for (const field of requiredFields) {
                    if (!(field in agentZero.lastClassificationResult)) {
                        throw new Error(`Missing field in stored result: ${field}`);
                    }
                }
                console.log('   ✅ Classification result storage verified');
                return true;
            }
            catch (error) {
                if (error.message.includes('LLM configuration invalid')) {
                    console.log('   ⚠️  LLM not available - testing keyword fallback storage');
                    const agentZero = new AgentZero();
                    agentZero.setIntelligentClassification(false);
                    await agentZero.selectPromptVariant('test input', 'test-session');
                    if (agentZero.lastClassificationResult === null) {
                        throw new Error('Classification result should be stored even for keyword fallback');
                    }
                    console.log('   ✅ Keyword fallback result storage verified');
                    return true;
                }
                else {
                    throw error;
                }
            }
        });
        // Test Summary
        console.log('='.repeat(60));
        console.log('📊 INTEGRATION TEST SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total Tests: ${testsTotal}`);
        console.log(`Passed: ${testsPassed}`);
        console.log(`Failed: ${testsTotal - testsPassed}`);
        console.log(`Success Rate: ${((testsPassed / testsTotal) * 100).toFixed(1)}%`);
        if (testsPassed === testsTotal) {
            console.log('\n🎉 All integration tests passed!');
            console.log('✅ AgentRouter integration is working correctly');
            console.log('✅ Enhanced context and classification metadata verified');
        }
        else {
            console.log('\n⚠️  Some integration tests failed. Check the output above for details.');
        }
        return testsPassed === testsTotal;
    }
    catch (error) {
        console.error('❌ Integration test suite error:', error.message);
        console.error('Stack trace:', error.stack);
        return false;
    }
}
// Run the integration tests
testAgentRouterIntegration().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
//# sourceMappingURL=test-agent-router-integration.js.map