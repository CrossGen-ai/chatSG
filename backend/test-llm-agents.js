/**
 * Test LLM Integration with Individual Agents
 * 
 * Simple test to verify that agents are now using LLM instead of hardcoded responses
 */

const { LazyAgentManager } = require('./src/agents/individual/LazyAgentManager');

async function testLLMIntegration() {
    console.log('=== Testing LLM Integration with Individual Agents ===\n');
    
    try {
        // Initialize lazy agent manager
        const agentManager = new LazyAgentManager();
        await agentManager.initialize();
        
        console.log('✅ LazyAgentManager initialized successfully\n');
        
        // Test analytical agent
        console.log('🧪 Testing Analytical Agent...');
        const analyticalResponse = await agentManager.processMessage(
            'Calculate the mean of these numbers: 1, 2, 3, 4, 5',
            'test-session-analytical'
        );
        
        console.log('📊 Analytical Agent Response:');
        console.log(`   Success: ${analyticalResponse.success}`);
        console.log(`   Response: ${analyticalResponse.message.substring(0, 200)}...`);
        console.log(`   LLM Used: ${analyticalResponse.metadata?.llmUsed || 'unknown'}`);
        console.log(`   Response Length: ${analyticalResponse.metadata?.responseLength || 'unknown'}\n`);
        
        // Test creative agent
        console.log('🎨 Testing Creative Agent...');
        const creativeResponse = await agentManager.processMessage(
            'Write a short story about a robot learning to paint',
            'test-session-creative'
        );
        
        console.log('📝 Creative Agent Response:');
        console.log(`   Success: ${creativeResponse.success}`);
        console.log(`   Response: ${creativeResponse.message.substring(0, 200)}...`);
        console.log(`   LLM Used: ${creativeResponse.metadata?.llmUsed || 'unknown'}`);
        console.log(`   Response Length: ${creativeResponse.metadata?.responseLength || 'unknown'}\n`);
        
        // Test technical agent
        console.log('💻 Testing Technical Agent...');
        const technicalResponse = await agentManager.processMessage(
            'Write a Python function to sort a list of dictionaries by a key',
            'test-session-technical'
        );
        
        console.log('🔧 Technical Agent Response:');
        console.log(`   Success: ${technicalResponse.success}`);
        console.log(`   Response: ${technicalResponse.message.substring(0, 200)}...`);
        console.log(`   LLM Used: ${technicalResponse.metadata?.llmUsed || 'unknown'}`);
        console.log(`   Response Length: ${technicalResponse.metadata?.responseLength || 'unknown'}\n`);
        
        // Check if responses are different from hardcoded ones
        const isAnalyticalUsingLLM = !analyticalResponse.message.includes('I can perform statistical analysis on numerical data');
        const isCreativeUsingLLM = !creativeResponse.message.includes('I\'m your creative companion');
        const isTechnicalUsingLLM = !technicalResponse.message.includes('I\'m your comprehensive technical support agent');
        
        console.log('🔍 LLM Integration Analysis:');
        console.log(`   Analytical Agent using LLM: ${isAnalyticalUsingLLM ? '✅ YES' : '❌ NO (still hardcoded)'}`);
        console.log(`   Creative Agent using LLM: ${isCreativeUsingLLM ? '✅ YES' : '❌ NO (still hardcoded)'}`);
        console.log(`   Technical Agent using LLM: ${isTechnicalUsingLLM ? '✅ YES' : '❌ NO (still hardcoded)'}\n`);
        
        if (isAnalyticalUsingLLM && isCreativeUsingLLM && isTechnicalUsingLLM) {
            console.log('🎉 SUCCESS: All agents are now using LLM integration!');
        } else {
            console.log('⚠️  ISSUE DETECTED: Some agents are still using hardcoded responses');
        }
        
        // Cleanup
        await agentManager.cleanup();
        console.log('\n✅ Test completed successfully');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error('Stack trace:', error.stack);
    }
}

// Run the test
testLLMIntegration().catch(console.error); 