// Test Mem0 service
require('dotenv').config();

async function testMem0() {
    console.log('=== Testing Mem0 Service ===');
    
    try {
        const { getMem0Service } = require('./dist/src/memory/Mem0Service');
        const mem0 = getMem0Service();
        
        console.log('✅ Mem0 service loaded');
        console.log('Provider:', mem0.provider);
        console.log('Enabled:', process.env.MEM0_ENABLED);
        
        // Test adding messages
        const testMessages = [
            { 
                id: 1,
                role: 'user', 
                content: 'My name is John and I love pizza',
                timestamp: new Date().toISOString(),
                sessionId: 'test-session-456'
            },
            { 
                id: 2,
                role: 'assistant', 
                content: 'Nice to meet you John! Pizza is great.',
                timestamp: new Date().toISOString(),
                sessionId: 'test-session-456'
            }
        ];
        
        console.log('\n=== Testing Memory Addition ===');
        const result = await mem0.addMessages(testMessages, 'test-session-456', 123);
        
        console.log('Memory added:', result);
        
        // Test getting memories
        console.log('\n=== Testing Memory Retrieval ===');
        const memories = await mem0.getMemories('test-session-456', 123);
        
        console.log('Retrieved memories:', memories);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
    }
}

testMem0().then(() => {
    console.log('\n=== Test Complete ===');
    process.exit(0);
}).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});