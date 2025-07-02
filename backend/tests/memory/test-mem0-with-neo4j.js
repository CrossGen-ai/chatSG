/**
 * Interactive test for Mem0 with Neo4j Graph Store
 * 
 * This test helps verify your Neo4j setup and demonstrates
 * the hybrid vector + graph memory capabilities.
 */

require('dotenv').config();

console.log(`
====================================
🧪 Mem0 + Neo4j Integration Test
====================================

Current Configuration:
`);

// Show current config
console.log(`NEO4J_URL: ${process.env.NEO4J_URL || 'not set'}`);
console.log(`NEO4J_USERNAME: ${process.env.NEO4J_USERNAME || 'not set'}`);
console.log(`NEO4J_PASSWORD: ${process.env.NEO4J_PASSWORD ? '***' : 'not set'}`);
console.log(`MEM0_GRAPH_ENABLED: ${process.env.MEM0_GRAPH_ENABLED || 'not set'}`);

console.log(`
⚠️  IMPORTANT: To enable Neo4j graph store, add to your .env:

MEM0_GRAPH_ENABLED=true
NEO4J_URL=neo4j://localhost:7687    # Note: Use port 7687, not 7474
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_password_here

The graph store will only be enabled if MEM0_GRAPH_ENABLED=true
`);

async function runTest() {
    const { getMem0Service } = require('../dist/src/memory/Mem0Service');
    const { STORAGE_CONFIG } = require('../dist/src/config/storage.config');
    
    console.log('\n📊 Actual Runtime Configuration:');
    console.log(`Graph enabled: ${STORAGE_CONFIG.mem0.graph.enabled}`);
    console.log(`Neo4j URL: ${STORAGE_CONFIG.mem0.graph.url}`);
    
    if (!STORAGE_CONFIG.mem0.graph.enabled) {
        console.log('\n❌ Graph store is NOT enabled. Add MEM0_GRAPH_ENABLED=true to your .env file.');
        return;
    }
    
    const mem0Service = getMem0Service();
    
    try {
        console.log('\n🔄 Initializing Mem0 with Neo4j...');
        await mem0Service.initialize();
        console.log('✅ Successfully connected to Neo4j!');
        
        // Quick test
        const testSession = 'neo4j-test-' + Date.now();
        await mem0Service.addMessage({
            type: 'user',
            content: 'Testing Neo4j graph store integration',
            timestamp: new Date().toISOString()
        }, testSession, 'test-user');
        
        console.log('✅ Successfully added test message to graph store');
        
        // Cleanup
        await mem0Service.deleteSessionMemories(testSession, 'test-user');
        
        console.log('\n🎉 Neo4j integration is working correctly!');
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        
        if (error.message.includes('ECONNREFUSED')) {
            console.log(`
⚠️  Connection refused. Please check:
1. Neo4j is running (check Docker Desktop or Neo4j Desktop)
2. Using correct port (7687 for bolt, not 7474 for web UI)
3. Neo4j is accessible at localhost:7687
`);
        } else if (error.message.includes('authentication')) {
            console.log(`
⚠️  Authentication failed. Please check:
1. Your Neo4j password is correct
2. Update NEO4J_PASSWORD in .env file
`);
        }
    }
}

// Only run if MEM0_GRAPH_ENABLED is explicitly set
if (process.env.MEM0_GRAPH_ENABLED === 'true') {
    runTest();
} else {
    console.log('\nℹ️  To run the test, set MEM0_GRAPH_ENABLED=true in your .env file');
}