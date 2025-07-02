/**
 * Test Mem0 Memory System with Chat API
 * Tests memory extraction and retrieval through actual chat endpoints
 */

require('dotenv').config();
const axios = require('axios');

const API_URL = 'http://localhost:3000/api';
const TEST_SESSION = 'mem0-test-' + Date.now();

async function testChatWithMem0() {
    console.log('🧪 Testing Mem0 with Chat System\n');
    console.log(`Session ID: ${TEST_SESSION}`);
    console.log(`Using model: ${process.env.MEM0_LLM_MODEL || 'gpt-4o-mini'} for memory\n`);
    
    try {
        // Test 1: Send messages with memorable information
        console.log('1️⃣  Sending messages with facts...');
        
        const messages = [
            "My name is Alice and I work at TechCorp as a software engineer",
            "I love Python programming and machine learning",
            "My manager Bob is great at project management"
        ];
        
        for (const msg of messages) {
            console.log(`   → ${msg}`);
            const response = await axios.post(`${API_URL}/chat`, {
                message: msg,
                sessionId: TEST_SESSION
            });
            console.log(`   ← ${response.data.message.substring(0, 50)}...`);
        }
        
        console.log('\n2️⃣  Testing memory retrieval...');
        
        // Test 2: Ask questions that require memory
        const questions = [
            "What's my name?",
            "Where do I work?", 
            "What programming language do I like?"
        ];
        
        for (const q of questions) {
            console.log(`\n   Q: ${q}`);
            const response = await axios.post(`${API_URL}/chat`, {
                message: q,
                sessionId: TEST_SESSION
            });
            console.log(`   A: ${response.data.message}`);
        }
        
        // Test 3: Check what memories were extracted
        console.log('\n3️⃣  Checking stored memories...');
        const { getMem0Service } = require('../dist/src/memory/Mem0Service');
        const mem0 = getMem0Service();
        await mem0.initialize();
        
        const memories = await mem0.getSessionMemories(TEST_SESSION, 'default', 10);
        console.log(`\n   Found ${memories.length} memories:`);
        memories.forEach(m => console.log(`   • ${m.memory}`));
        
        // Cleanup
        console.log('\n🧹 Cleaning up...');
        await mem0.deleteSessionMemories(TEST_SESSION, 'default');
        
        console.log('✅ Test completed!');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error('Response:', error.response.data);
        }
    }
}

// Run the test
testChatWithMem0();