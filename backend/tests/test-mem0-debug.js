const { Memory } = require('mem0ai/oss');
const dotenv = require('dotenv');
dotenv.config();

async function testMem0Direct() {
    console.log('=== Testing Mem0 Direct API ===\n');
    
    // Initialize mem0 directly
    const memoryConfig = {
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
    };
    
    console.log('1. Creating mem0 instance with config:', JSON.stringify(memoryConfig, null, 2));
    const memory = new Memory(memoryConfig);
    
    try {
        // Test 1: Add a simple message
        console.log('\n2. Adding a simple message...');
        const messages = [
            { role: 'user', content: 'My name is Sean and I love pizza' }
        ];
        
        const addOptions = {
            userId: 'test-user-123',
            metadata: {
                sessionId: 'test-session-123',
                timestamp: new Date().toISOString(),
                customField: 'test-value'
            }
        };
        
        console.log('Messages:', JSON.stringify(messages, null, 2));
        console.log('Options:', JSON.stringify(addOptions, null, 2));
        
        const addResult = await memory.add(messages, addOptions);
        console.log('Add result:', JSON.stringify(addResult, null, 2));
        
        // Wait for indexing
        console.log('\n3. Waiting 3 seconds for indexing...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Test 2: Search with different options
        console.log('\n4. Testing different search approaches...');
        
        // Search 1: Basic search with userId
        console.log('\n4a. Basic search with userId:');
        const search1 = await memory.search('sean pizza', {
            userId: 'test-user-123',
            limit: 10
        });
        console.log('Result:', JSON.stringify(search1, null, 2));
        
        // Search 2: Search with filters
        console.log('\n4b. Search with sessionId filter:');
        const search2 = await memory.search('sean pizza', {
            userId: 'test-user-123',
            filters: {
                sessionId: 'test-session-123'
            },
            limit: 10
        });
        console.log('Result:', JSON.stringify(search2, null, 2));
        
        // Search 3: Search with metadata filter
        console.log('\n4c. Search with metadata filter:');
        const search3 = await memory.search('sean pizza', {
            userId: 'test-user-123',
            filters: {
                'metadata.sessionId': 'test-session-123'
            },
            limit: 10
        });
        console.log('Result:', JSON.stringify(search3, null, 2));
        
        // Test 3: Get all memories
        console.log('\n5. Getting all memories for user...');
        const allMemories = await memory.getAll({
            userId: 'test-user-123',
            limit: 100
        });
        console.log('All memories:', JSON.stringify(allMemories, null, 2));
        
        // Test 4: Get memories with filter
        console.log('\n6. Getting memories with sessionId filter...');
        const filteredMemories = await memory.getAll({
            userId: 'test-user-123',
            filters: {
                sessionId: 'test-session-123'
            },
            limit: 100
        });
        console.log('Filtered memories:', JSON.stringify(filteredMemories, null, 2));
        
        // Clean up
        console.log('\n7. Cleaning up...');
        if (allMemories.results && allMemories.results.length > 0) {
            for (const mem of allMemories.results) {
                if (mem.id && mem.metadata?.sessionId === 'test-session-123') {
                    await memory.delete(mem.id);
                    console.log(`Deleted memory ${mem.id}`);
                }
            }
        }
        
    } catch (error) {
        console.error('Error:', error);
        console.error('Stack:', error.stack);
    }
}

// Run the test
testMem0Direct().then(() => {
    console.log('\n=== Test Complete ===');
    process.exit(0);
}).catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});