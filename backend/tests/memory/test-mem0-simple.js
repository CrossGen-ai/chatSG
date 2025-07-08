/**
 * Simple test to check Mem0 configuration
 */

require('dotenv').config({ path: '../../.env' });

console.log('=== Mem0 Configuration ===');
console.log('MEM0_ENABLED:', process.env.MEM0_ENABLED);
console.log('MEM0_PROVIDER:', process.env.MEM0_PROVIDER);

// Test with default configuration (SQLite)
const { Memory } = require('mem0ai/oss');

async function testMem0() {
    try {
        // Test 1: Default SQLite configuration
        console.log('\n1. Testing default SQLite configuration...');
        const sqliteMemory = new Memory({
            version: 'v1.1',
            embedder: {
                provider: 'openai',
                config: {
                    apiKey: process.env.OPENAI_API_KEY,
                    model: 'text-embedding-3-small',
                },
            },
            llm: {
                provider: 'openai',
                config: {
                    apiKey: process.env.OPENAI_API_KEY,
                    model: 'gpt-4o-mini',
                },
            },
        });
        
        await sqliteMemory.add('My name is Sean', { userId: 'test-user' });
        const results = await sqliteMemory.search('What is my name?', { userId: 'test-user' });
        console.log('SQLite search results:', results.results.length > 0 ? 'Found memories' : 'No memories found');
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testMem0();