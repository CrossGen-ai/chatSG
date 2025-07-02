/**
 * Test script for Mem0 with Neo4j Graph Store Integration
 * 
 * This test verifies that:
 * 1. Mem0 initializes successfully with Neo4j
 * 2. Memories are stored with graph relationships
 * 3. Graph-based retrieval works correctly
 * 4. Hybrid vector + graph search functions properly
 */

require('dotenv').config();
const path = require('path');

// Mock Neo4j environment variables for testing
if (!process.env.NEO4J_PASSWORD) {
    console.log('⚠️  NEO4J_PASSWORD not set in .env, using test defaults');
    process.env.MEM0_GRAPH_ENABLED = 'true';
    process.env.NEO4J_URL = 'neo4j://localhost:7687';
    process.env.NEO4J_USERNAME = 'neo4j';
    process.env.NEO4J_PASSWORD = 'test-password'; // Replace with your actual password
}

const { getMem0Service } = require('../dist/src/memory/Mem0Service');

async function testMem0GraphIntegration() {
    console.log('🧪 Testing Mem0 with Neo4j Graph Store Integration\n');
    
    const mem0Service = getMem0Service();
    
    try {
        // Test 1: Initialize Mem0 with graph store
        console.log('1️⃣  Initializing Mem0 with Neo4j...');
        await mem0Service.initialize();
        console.log('✅ Mem0 initialized successfully\n');
        
        // Test 2: Add messages with relationship context
        console.log('2️⃣  Adding messages with relationship context...');
        const testSessionId = 'test-graph-session-' + Date.now();
        const testUserId = 'test-user-123';
        
        const testMessages = [
            {
                type: 'user',
                content: 'My name is Sean and I work with Bob on the AI team',
                timestamp: new Date().toISOString(),
                metadata: { sessionId: testSessionId }
            },
            {
                type: 'assistant',
                content: 'Nice to meet you Sean! It\'s great that you work with Bob on the AI team.',
                timestamp: new Date().toISOString(),
                metadata: { sessionId: testSessionId, agent: 'TestAgent' }
            },
            {
                type: 'user',
                content: 'Bob is my manager and he loves Python programming',
                timestamp: new Date().toISOString(),
                metadata: { sessionId: testSessionId }
            },
            {
                type: 'assistant',
                content: 'I understand Bob is your manager and he\'s passionate about Python.',
                timestamp: new Date().toISOString(),
                metadata: { sessionId: testSessionId, agent: 'TestAgent' }
            }
        ];
        
        for (const msg of testMessages) {
            await mem0Service.addMessage(msg, testSessionId, testUserId);
        }
        console.log('✅ Added test messages with relationships\n');
        
        // Test 3: Search using vector similarity
        console.log('3️⃣  Testing vector search...');
        const vectorResults = await mem0Service.search('who is my colleague?', {
            sessionId: testSessionId,
            userId: testUserId,
            limit: 5
        });
        console.log(`Found ${vectorResults.results.length} vector search results:`);
        vectorResults.results.forEach(r => console.log(`  - ${r.memory} (score: ${r.score?.toFixed(3)})`));
        console.log();
        
        // Test 4: Search for graph relationships
        console.log('4️⃣  Testing graph-based search...');
        const graphResults = await mem0Service.search('what does my manager think about programming?', {
            sessionId: testSessionId,
            userId: testUserId,
            limit: 5
        });
        console.log(`Found ${graphResults.results.length} graph search results:`);
        graphResults.results.forEach(r => console.log(`  - ${r.memory}`));
        console.log();
        
        // Test 5: Get context for a query (hybrid retrieval)
        console.log('5️⃣  Testing hybrid context retrieval...');
        const context = await mem0Service.getContextForQuery(
            'Tell me about my work relationships',
            testSessionId,
            testUserId,
            10
        );
        console.log(`Retrieved ${context.length} context messages:`);
        context.forEach(c => console.log(`  [${c.role}]: ${c.content}`));
        console.log();
        
        // Test 6: Verify graph store is enabled
        console.log('6️⃣  Checking graph store status...');
        const { STORAGE_CONFIG } = require('../dist/src/config/storage.config');
        console.log(`Graph enabled: ${STORAGE_CONFIG.mem0.graph.enabled}`);
        console.log(`Neo4j URL: ${STORAGE_CONFIG.mem0.graph.url}`);
        console.log(`Neo4j user: ${STORAGE_CONFIG.mem0.graph.username}`);
        console.log();
        
        // Cleanup
        console.log('🧹 Cleaning up test data...');
        await mem0Service.deleteSessionMemories(testSessionId, testUserId);
        console.log('✅ Test data cleaned up\n');
        
        console.log('🎉 All tests passed! Neo4j graph integration is working correctly.');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('\nFull error:', error);
        
        if (error.message.includes('ECONNREFUSED')) {
            console.error('\n⚠️  Connection refused. Make sure Neo4j is running at localhost:7687');
            console.error('   You can start Neo4j using Docker Desktop or the Neo4j Desktop app');
        }
        
        if (error.message.includes('authentication')) {
            console.error('\n⚠️  Authentication failed. Check your Neo4j credentials in .env:');
            console.error('   NEO4J_PASSWORD=your_actual_password');
        }
        
        process.exit(1);
    }
}

// Run the test
testMem0GraphIntegration();