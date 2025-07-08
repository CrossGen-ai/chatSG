const { getMem0Service } = require('../dist/src/memory/Mem0Service');
const { Memory } = require('mem0ai/oss');
const dotenv = require('dotenv');
dotenv.config();

async function testMem0Fix() {
    console.log('=== Testing Mem0 Fix ===\n');
    
    // Test 1: Direct API (working)
    console.log('1. Testing direct mem0 API (known to work)...');
    const directMemory = new Memory({
        version: 'v1.1',
        embedder: {
            provider: 'openai',
            config: {
                apiKey: process.env.OPENAI_API_KEY || '',
                model: 'text-embedding-3-small',
            },
        },
        llm: {
            provider: 'openai',
            config: {
                apiKey: process.env.OPENAI_API_KEY || '',
                model: 'gpt-4o-mini',
            },
        },
        vectorStore: {
            provider: 'qdrant',
            config: {
                url: 'http://localhost:6333',
                collectionName: 'chatsg_memories',
                embeddingDimensions: 1536,
            },
        },
    });
    
    const directResult = await directMemory.add(
        [{ role: 'user', content: 'Direct test: My name is Bob' }],
        {
            userId: 'direct-user',
            sessionId: 'direct-session-123',
            timestamp: new Date().toISOString()
        }
    );
    console.log('Direct API result:', JSON.stringify(directResult, null, 2));
    
    // Test 2: Our wrapper
    console.log('\n2. Testing our wrapper...');
    const mem0Service = getMem0Service();
    await mem0Service.initialize();
    
    const wrapperMessage = {
        timestamp: new Date().toISOString(),
        type: 'user',
        content: 'Wrapper test: My name is Alice',
        metadata: {
            sessionId: 'wrapper-session-456',
            userId: 'wrapper-user',
            custom: 'test'
        }
    };
    
    console.log('Calling addMessage with:', JSON.stringify(wrapperMessage, null, 2));
    const wrapperResult = await mem0Service.addMessage(
        wrapperMessage,
        'wrapper-session-456',
        'wrapper-user',
        123
    );
    console.log('Wrapper result:', JSON.stringify(wrapperResult, null, 2));
    
    // Wait and search
    console.log('\n3. Waiting 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Search for both
    console.log('\n4. Searching for memories...');
    
    // Direct search
    const directSearch = await directMemory.search('Bob', {
        userId: 'direct-user',
        filters: { sessionId: 'direct-session-123' }
    });
    console.log('Direct search results:', JSON.stringify(directSearch, null, 2));
    
    // Wrapper search
    const wrapperSearch = await mem0Service.search('Alice', {
        userId: 'wrapper-user',
        sessionId: 'wrapper-session-456'
    }, 123);
    console.log('Wrapper search results:', JSON.stringify(wrapperSearch, null, 2));
    
    // Get all for both users
    console.log('\n5. Getting all memories...');
    const directAll = await directMemory.getAll({
        userId: 'direct-user',
        filters: { sessionId: 'direct-session-123' }
    });
    console.log('Direct getAll:', JSON.stringify(directAll, null, 2));
    
    const wrapperAll = await mem0Service.getSessionMemories(
        'wrapper-session-456',
        'wrapper-user',
        123
    );
    console.log('Wrapper getAll:', JSON.stringify(wrapperAll, null, 2));
    
    // Clean up
    console.log('\n6. Cleaning up...');
    if (directAll.results && directAll.results.length > 0) {
        for (const mem of directAll.results) {
            await directMemory.delete(mem.id);
        }
    }
    if (wrapperAll && wrapperAll.length > 0) {
        for (const mem of wrapperAll) {
            if (mem.id) {
                await mem0Service.memory.delete(mem.id);
            }
        }
    }
}

testMem0Fix().then(() => {
    console.log('\n=== Test Complete ===');
    process.exit(0);
}).catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});