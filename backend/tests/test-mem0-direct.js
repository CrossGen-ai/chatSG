#!/usr/bin/env node

/**
 * Direct test of mem0ai Memory with Azure configuration
 */

require('dotenv').config();
const { Memory } = require('mem0ai/oss');

console.log('=== Direct Mem0 Azure Test ===\n');

async function testDirect() {
    try {
        // Test configuration based on Python examples
        const config = {
            version: 'v1.1',
            llm: {
                provider: 'azure_openai',
                config: {
                    model: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-001',
                    apiKey: process.env.AZURE_OPENAI_API_KEY,
                    modelProperties: {
                        endpoint: process.env.AZURE_OPENAI_ENDPOINT,
                        apiVersion: '2024-02-15-preview',
                        deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-001'
                    }
                }
            },
            embedder: {
                provider: 'azure_openai',
                config: {
                    model: process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || process.env.AZURE_OPENAI_DEPLOYMENT || 'text-embedding-ada-002',
                    apiKey: process.env.AZURE_OPENAI_API_KEY,
                    modelProperties: {
                        endpoint: process.env.AZURE_OPENAI_ENDPOINT,
                        apiVersion: '2024-02-15-preview',
                        deploymentName: process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || process.env.AZURE_OPENAI_DEPLOYMENT || 'text-embedding-ada-002'
                    }
                }
            }
        };
        
        console.log('Config:', JSON.stringify(config, null, 2));
        console.log('\nCreating Memory instance...');
        
        const memory = new Memory(config);
        console.log('✅ Memory instance created successfully!');
        
        // Try to add a simple memory
        const messages = [
            { role: 'user', content: 'My name is Test User' },
            { role: 'assistant', content: 'Nice to meet you, Test User!' }
        ];
        
        console.log('\nAdding memory...');
        const result = await memory.add(messages, { userId: 'test-user' });
        console.log('✅ Memory added:', result);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('\nStack:', error.stack);
        
        // Additional debugging
        if (error.message.includes('baseURL') || error.message.includes('endpoint')) {
            console.error('\n⚠️  This appears to be a configuration format issue.');
            console.error('The error suggests there\'s a conflict between baseURL and endpoint properties.');
        }
    }
}

testDirect().then(() => {
    console.log('\nTest completed.');
    process.exit(0);
}).catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});