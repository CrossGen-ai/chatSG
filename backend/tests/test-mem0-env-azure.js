#!/usr/bin/env node

/**
 * Test Mem0 with Azure using environment variables
 */

require('dotenv').config();
const { Memory } = require('mem0ai/oss');

console.log('=== Mem0 Azure Test with Env Vars ===\n');

// Set the LLM_* environment variables that mem0 might be looking for
process.env.LLM_AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY;
process.env.LLM_AZURE_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;
process.env.LLM_AZURE_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT;
process.env.LLM_AZURE_API_VERSION = process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview';

console.log('Environment variables set:');
console.log('  LLM_AZURE_OPENAI_API_KEY:', !!process.env.LLM_AZURE_OPENAI_API_KEY);
console.log('  LLM_AZURE_ENDPOINT:', process.env.LLM_AZURE_ENDPOINT);
console.log('  LLM_AZURE_DEPLOYMENT:', process.env.LLM_AZURE_DEPLOYMENT);
console.log('  LLM_AZURE_API_VERSION:', process.env.LLM_AZURE_API_VERSION);
console.log('');

async function testWithEnvVars() {
    try {
        // Try minimal configuration relying on env vars
        const config = {
            version: 'v1.1',
            llm: {
                provider: 'azure_openai',
                config: {
                    model: process.env.AZURE_OPENAI_DEPLOYMENT
                }
            },
            embedder: {
                provider: 'azure_openai',
                config: {
                    model: process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || process.env.AZURE_OPENAI_DEPLOYMENT
                }
            }
        };
        
        console.log('Config:', JSON.stringify(config, null, 2));
        console.log('\nCreating Memory instance...');
        
        const memory = new Memory(config);
        console.log('✅ Memory instance created successfully!');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        
        // Try another approach - check if we need to use litellm
        console.log('\n--- Trying with litellm provider ---');
        try {
            const litellmConfig = {
                version: 'v1.1',
                llm: {
                    provider: 'litellm',
                    config: {
                        model: `azure/${process.env.AZURE_OPENAI_DEPLOYMENT}`,
                        api_base: process.env.AZURE_OPENAI_ENDPOINT,
                        api_key: process.env.AZURE_OPENAI_API_KEY
                    }
                }
            };
            
            console.log('LiteLLM Config:', JSON.stringify(litellmConfig, null, 2));
            const memory2 = new Memory(litellmConfig);
            console.log('✅ Memory instance created with litellm!');
        } catch (error2) {
            console.error('❌ LiteLLM also failed:', error2.message);
        }
    }
}

testWithEnvVars().then(() => {
    console.log('\nTest completed.');
    process.exit(0);
}).catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});