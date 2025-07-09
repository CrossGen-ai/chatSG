const { getMem0Service } = require('../dist/src/memory/Mem0Service');
const { getStorageManager } = require('../dist/src/storage/StorageManager');
const dotenv = require('dotenv');
dotenv.config();

async function testCompleteMemory() {
    console.log('=== Complete Memory System Test ===');
    console.log('Testing both cross-session memory AND within-session conversation memory\n');
    
    const userId = 2;
    const sessionAId = 'session-a-' + Date.now();
    const sessionBId = 'session-b-' + Date.now();
    
    // Initialize services
    const mem0Service = getMem0Service();
    const storageManager = getStorageManager();
    await mem0Service.initialize();
    await storageManager.initialize();
    
    try {
        // ========== SESSION A: Store personal info and have a conversation ==========
        console.log('=== SESSION A: Personal info + conversation ===');
        console.log(`Session ID: ${sessionAId}`);
        
        // Store personal information
        await storageManager.saveMessage({
            sessionId: sessionAId,
            type: 'user',
            content: 'My name is Sean and I work at OpenAI',
            metadata: { userId: userId }
        });
        console.log('   ✓ Stored: "My name is Sean and I work at OpenAI"');
        
        // Have a conversation within the session
        await storageManager.saveMessage({
            sessionId: sessionAId,
            type: 'user',
            content: 'Tell me a programming joke',
            metadata: { userId: userId }
        });
        console.log('   ✓ User asked for a programming joke');
        
        await storageManager.saveMessage({
            sessionId: sessionAId,
            type: 'assistant',
            content: 'Why do programmers prefer dark mode? Because light attracts bugs!',
            metadata: { agent: 'CreativeAgent', userId: userId }
        });
        console.log('   ✓ Assistant told a programming joke');
        
        // Wait for indexing
        console.log('\\n⏳ Waiting 3 seconds for memory indexing...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Test within-session context (what the agent sees for next message in Session A)
        console.log('\\n📊 Testing Session A context (within-session):');
        const sessionAContext = await storageManager.getContextForQuery(
            "What joke did you just tell me?",
            sessionAId,
            "You are a helpful assistant"
        );
        
        console.log(`   Context messages: ${sessionAContext.length}`);
        sessionAContext.forEach((msg, i) => {
            const preview = msg.content.length > 60 ? msg.content.substring(0, 60) + '...' : msg.content;
            console.log(`   ${i + 1}. [${msg.role}] ${preview}`);
        });
        
        // Check if the joke is in the context
        const hasJoke = sessionAContext.some(msg => 
            msg.content.toLowerCase().includes('dark mode') || 
            msg.content.toLowerCase().includes('light attracts bugs')
        );
        console.log(`   Can see previous joke: ${hasJoke ? '✅ YES' : '❌ NO'}`);
        
        // ========== SESSION B: New session, test both memories ==========
        console.log('\\n=== SESSION B: Testing cross-session + within-session memory ===');
        console.log(`Session ID: ${sessionBId}`);
        
        // Test cross-session memory first
        console.log('\\n🔍 Testing cross-session memory (personal info):');
        const crossSessionContext = await storageManager.getContextForQuery(
            "What's my name and where do I work?",
            sessionBId,
            "You are a helpful assistant",
            userId  // Pass the userId explicitly for cross-session queries
        );
        
        console.log(`   Context messages: ${crossSessionContext.length}`);
        const hasName = crossSessionContext.some(msg => 
            msg.content.toLowerCase().includes('sean')
        );
        const hasWork = crossSessionContext.some(msg => 
            msg.content.toLowerCase().includes('openai')
        );
        console.log(`   Can remember name: ${hasName ? '✅ YES' : '❌ NO'}`);
        console.log(`   Can remember workplace: ${hasWork ? '✅ YES' : '❌ NO'}`);
        
        // Start a new conversation in Session B
        await storageManager.saveMessage({
            sessionId: sessionBId,
            type: 'user',
            content: 'What types of food do you recommend?',
            metadata: { userId: userId }
        });
        console.log('\\n   ✓ User asked about food recommendations');
        
        await storageManager.saveMessage({
            sessionId: sessionBId,
            type: 'assistant',
            content: 'I recommend trying Mediterranean cuisine - it\'s healthy and delicious!',
            metadata: { agent: 'AnalyticalAgent', userId: userId }
        });
        console.log('   ✓ Assistant recommended Mediterranean cuisine');
        
        // Test within-session memory in Session B
        console.log('\\n📊 Testing Session B within-session memory:');
        const sessionBContext = await storageManager.getContextForQuery(
            "What food did you just recommend?",
            sessionBId,
            "You are a helpful assistant"
        );
        
        console.log(`   Context messages: ${sessionBContext.length}`);
        const hasFoodRec = sessionBContext.some(msg => 
            msg.content.toLowerCase().includes('mediterranean')
        );
        console.log(`   Can see previous food recommendation: ${hasFoodRec ? '✅ YES' : '❌ NO'}`);
        
        // Test that Session B can't see Session A's conversation
        const hasSessionAJoke = sessionBContext.some(msg => 
            msg.content.toLowerCase().includes('dark mode') || 
            msg.content.toLowerCase().includes('light attracts bugs')
        );
        console.log(`   Session isolation (can't see Session A joke): ${!hasSessionAJoke ? '✅ YES' : '❌ NO'}`);
        
        // ========== COMPREHENSIVE RESULTS ==========
        console.log('\\n=== COMPREHENSIVE MEMORY SYSTEM RESULTS ===');
        console.log(`✅ Session A within-session memory: ${hasJoke ? 'WORKING' : 'BROKEN'}`);
        console.log(`✅ Cross-session personal memory: ${hasName && hasWork ? 'WORKING' : 'BROKEN'}`);
        console.log(`✅ Session B within-session memory: ${hasFoodRec ? 'WORKING' : 'BROKEN'}`);
        console.log(`✅ Session isolation: ${!hasSessionAJoke ? 'WORKING' : 'BROKEN'}`);
        
        if (hasJoke && hasName && hasWork && hasFoodRec && !hasSessionAJoke) {
            console.log('\\n🎉 ALL MEMORY SYSTEMS WORKING PERFECTLY!');
            console.log('   - Personal info remembered across sessions');
            console.log('   - Conversations remembered within sessions');
            console.log('   - Sessions properly isolated from each other');
        } else {
            console.log('\\n⚠️  Some memory systems need attention');
        }
        
        // Cleanup
        console.log('\\n🧹 Cleaning up test data...');
        await mem0Service.deleteSessionMemories(sessionAId, userId);
        await mem0Service.deleteSessionMemories(sessionBId, userId);
        console.log('   ✓ Test data cleaned up');
        
    } catch (error) {
        console.error('\\n❌ Error:', error.message);
        console.error('Stack:', error.stack);
    }
}

testCompleteMemory().then(() => {
    console.log('\\n=== Complete Memory System Test Finished ===');
    process.exit(0);
}).catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});