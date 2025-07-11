#!/usr/bin/env node

/**
 * Test Mem0 with Azure configuration
 */

require('dotenv').config();

// Temporarily switch to Azure mode for testing
const originalMem0Models = process.env.MEM0_MODELS;
process.env.MEM0_MODELS = 'azure';

// Ensure Azure deployment is set
if (!process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT) {
    process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT || 'text-embedding-ada-002';
}

console.log('=== Testing Mem0 with Azure Configuration ===\n');
console.log('Environment:');
console.log('  MEM0_MODELS:', process.env.MEM0_MODELS);
console.log('  AZURE_OPENAI_ENDPOINT:', process.env.AZURE_OPENAI_ENDPOINT);
console.log('  AZURE_OPENAI_DEPLOYMENT:', process.env.AZURE_OPENAI_DEPLOYMENT);
console.log('  AZURE_OPENAI_EMBEDDING_DEPLOYMENT:', process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT);
console.log('  AZURE_OPENAI_API_KEY:', process.env.AZURE_OPENAI_API_KEY ? '✓ Set' : '✗ Not set');
console.log('');

async function testAzureConfig() {
    try {
        // Clear require cache to force reload
        delete require.cache[require.resolve('../dist/src/memory/Mem0Service')];
        
        const { getMem0Service } = require('../dist/src/memory/Mem0Service');
        const mem0Service = getMem0Service();
        
        console.log('Initializing Mem0Service...');
        await mem0Service.initialize();
        
        console.log('✅ Mem0Service initialized successfully with Azure!');
        
        // Test adding a simple message
        console.log('\nTesting memory addition...');
        const testMessage = {
            id: 'test-1',
            type: 'user',
            content: 'Testing Azure configuration',
            timestamp: new Date().toISOString()
        };
        
        const result = await mem0Service.addMessage(testMessage, 'test-azure-session', 1);
        console.log('✅ Memory added successfully!');
        console.log('Result:', JSON.stringify(result, null, 2));
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('\nFull error details:');
        console.error(error);
        
        // Check for specific Azure errors
        if (error.message.includes('baseURL') || error.message.includes('endpoint')) {
            console.error('\n⚠️  Configuration conflict detected!');
            console.error('This usually means the Azure configuration format needs adjustment.');
        }
    } finally {
        // Restore original setting
        if (originalMem0Models) {
            process.env.MEM0_MODELS = originalMem0Models;
        } else {
            delete process.env.MEM0_MODELS;
        }
    }
}

testAzureConfig().then(() => {
    console.log('\nTest completed.');
    process.exit(0);
}).catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});