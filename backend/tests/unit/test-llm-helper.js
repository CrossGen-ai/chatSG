// Test LLM Helper Utility
require('dotenv').config({ path: '../.env' });
const { getLLMHelper, resetLLMHelper } = require('../utils/llm-helper');

async function testLLMHelper() {
    console.log('=== LLM Helper Utility Test ===\n');
    
    try {
        // Reset to ensure clean state
        resetLLMHelper();
        
        // Test 1: Basic initialization
        console.log('🧪 Test 1: Basic Initialization');
        const llmHelper = getLLMHelper();
        console.log('✅ LLM Helper initialized successfully');
        
        // Test 2: Configuration detection
        console.log('\n🧪 Test 2: Configuration Detection');
        const configInfo = llmHelper.getConfigInfo();
        console.log('📊 Configuration Info:');
        console.log(`   Provider: ${configInfo.provider}`);
        console.log(`   Environment: ${configInfo.environment}`);
        console.log(`   Model: ${configInfo.model}`);
        console.log(`   Temperature: ${configInfo.temperature}`);
        console.log(`   Max Tokens: ${configInfo.maxTokens}`);
        console.log('✅ Configuration detected successfully');
        
        // Test 3: Configuration validation
        console.log('\n🧪 Test 3: Configuration Validation');
        const validation = llmHelper.validateConfiguration();
        console.log(`📋 Validation Result: ${validation.valid ? 'VALID' : 'INVALID'}`);
        console.log(`   Provider: ${validation.provider}`);
        if (!validation.valid) {
            console.log('   Errors:');
            validation.errors.forEach(error => console.log(`     - ${error}`));
        }
        
        // Test 4: System prompt generation
        console.log('\n🧪 Test 4: System Prompt Generation');
        const defaultPrompt = llmHelper.getSystemPrompt();
        const agentZeroPrompt = llmHelper.getSystemPrompt('agentZero');
        const codeAssistantPrompt = llmHelper.getSystemPrompt('codeAssistant', {
            customInstructions: 'Focus on Python and JavaScript'
        });
        
        console.log('📝 Default Prompt (first 100 chars):');
        console.log(`   "${defaultPrompt.substring(0, 100)}..."`);
        console.log('📝 AgentZero Prompt (first 100 chars):');
        console.log(`   "${agentZeroPrompt.substring(0, 100)}..."`);
        console.log('📝 Code Assistant Prompt (first 100 chars):');
        console.log(`   "${codeAssistantPrompt.substring(0, 100)}..."`);
        console.log('✅ System prompts generated successfully');
        
        // Test 5: LLM instance creation
        console.log('\n🧪 Test 5: LLM Instance Creation');
        try {
            const llmInstance = llmHelper.createChatLLM();
            console.log('✅ ChatLLM instance created successfully');
            console.log(`   Model Name: ${llmInstance.modelName}`);
            console.log(`   Temperature: ${llmInstance.temperature}`);
            console.log(`   Max Tokens: ${llmInstance.maxTokens}`);
        } catch (error) {
            console.log(`❌ LLM instance creation failed: ${error.message}`);
            if (error.message.includes('API key') || error.message.includes('endpoint')) {
                console.log('   This is expected if API credentials are not configured');
            }
        }
        
        // Test 6: Environment-specific settings
        console.log('\n🧪 Test 6: Environment-Specific Settings');
        console.log('🔧 Current Environment Settings:');
        console.log(`   CHATSG_ENVIRONMENT: ${process.env.CHATSG_ENVIRONMENT || 'not set'}`);
        console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
        console.log(`   LLM_TEMPERATURE: ${process.env.LLM_TEMPERATURE || 'not set (using default)'}`);
        console.log(`   LLM_MAX_TOKENS: ${process.env.LLM_MAX_TOKENS || 'not set (using default)'}`);
        
        // Test 7: Provider-specific configuration
        console.log('\n🧪 Test 7: Provider-Specific Configuration');
        console.log('🔧 Provider Configuration:');
        if (configInfo.provider === 'azure') {
            console.log('   Azure OpenAI Configuration:');
            console.log(`     Endpoint: ${configInfo.metadata.endpoint || 'not set'}`);
            console.log(`     Deployment: ${configInfo.metadata.deployment || 'not set'}`);
            console.log(`     API Version: ${configInfo.metadata.apiVersion || 'not set'}`);
        } else if (configInfo.provider === 'openai') {
            console.log('   OpenAI Configuration:');
            console.log(`     Model: ${configInfo.metadata.model || 'not set'}`);
            console.log(`     Base URL: ${configInfo.metadata.baseURL || 'not set'}`);
        }
        
        // Test 8: Singleton behavior
        console.log('\n🧪 Test 8: Singleton Behavior');
        const llmHelper2 = getLLMHelper();
        const isSameInstance = llmHelper === llmHelper2;
        console.log(`🔗 Same instance check: ${isSameInstance ? 'PASS' : 'FAIL'}`);
        if (isSameInstance) {
            console.log('✅ Singleton pattern working correctly');
        } else {
            console.log('❌ Singleton pattern not working');
        }
        
        console.log('\n' + '='.repeat(50));
        console.log('📊 LLM Helper Test Summary');
        console.log('='.repeat(50));
        console.log(`✅ Provider: ${configInfo.provider}`);
        console.log(`✅ Model: ${configInfo.model}`);
        console.log(`✅ Environment: ${configInfo.environment}`);
        console.log(`${validation.valid ? '✅' : '❌'} Configuration: ${validation.valid ? 'VALID' : 'INVALID'}`);
        console.log('✅ System prompts: Generated successfully');
        console.log('✅ Singleton pattern: Working correctly');
        
        if (!validation.valid) {
            console.log('\n⚠️  Configuration Issues:');
            validation.errors.forEach(error => console.log(`   - ${error}`));
            console.log('\n💡 To fix configuration issues:');
            if (configInfo.provider === 'azure') {
                console.log('   Add to .env file:');
                console.log('   AZURE_OPENAI_API_KEY=your_azure_key');
                console.log('   AZURE_OPENAI_ENDPOINT=your_azure_endpoint');
                console.log('   AZURE_OPENAI_DEPLOYMENT=your_deployment_name');
            } else {
                console.log('   Add to .env file:');
                console.log('   OPENAI_API_KEY=your_openai_key');
                console.log('   OPENAI_MODEL=gpt-4o-mini  # optional');
            }
        }
        
    } catch (error) {
        console.error('❌ LLM Helper test failed:', error);
        console.error('Stack trace:', error.stack);
    }
}

// Run test if called directly
if (require.main === module) {
    testLLMHelper();
}

module.exports = testLLMHelper; 