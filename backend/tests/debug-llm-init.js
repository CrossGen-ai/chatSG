// Test LLM initialization issue
const dotenv = require('dotenv');
dotenv.config();

console.log('\n=== Environment Check ===');
console.log('CHAT_MODELS:', process.env.CHAT_MODELS);
console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
console.log('AZURE_OPENAI_API_KEY exists:', !!process.env.AZURE_OPENAI_API_KEY);
console.log('AZURE_OPENAI_DEPLOYMENT:', process.env.AZURE_OPENAI_DEPLOYMENT);
console.log('AZURE_OPENAI_ENDPOINT:', process.env.AZURE_OPENAI_ENDPOINT);

// Test LLMHelper
console.log('\n=== Testing LLMHelper ===');
try {
    const { getLLMHelper } = require('./utils/llm-helper');
    const helper = getLLMHelper();
    console.log('LLMHelper provider:', helper.config.provider);
    console.log('LLMHelper model:', helper.config.modelName);
    
    // Try to create a ChatLLM
    console.log('\n=== Creating ChatLLM ===');
    const llm = helper.createChatLLM();
    console.log('ChatLLM created successfully');
    
    // Test with a simple prompt
    console.log('\n=== Testing LLM ===');
    llm.invoke('Say "Hello, World!"').then(result => {
        console.log('LLM Response:', result.content);
        console.log('\n=== Done ===');
        process.exit(0);
    }).catch(err => {
        console.error('LLM Invoke Error:', err);
        process.exit(1);
    });
    
} catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
}