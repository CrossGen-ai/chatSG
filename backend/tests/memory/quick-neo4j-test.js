/**
 * Quick Neo4j + Mem0 Test
 * Minimal test to verify graph store is working
 */

require('dotenv').config();

async function quickTest() {
    const { STORAGE_CONFIG } = require('../dist/src/config/storage.config');
    
    console.log('🚀 Quick Neo4j Test\n');
    console.log(`Graph enabled: ${STORAGE_CONFIG.mem0.graph.enabled}`);
    
    if (!STORAGE_CONFIG.mem0.graph.enabled) {
        console.log('❌ Graph not enabled. Set MEM0_GRAPH_ENABLED=true');
        return;
    }
    
    const { getMem0Service } = require('../dist/src/memory/Mem0Service');
    const mem0 = getMem0Service();
    
    try {
        await mem0.initialize();
        console.log('✅ Mem0 + Neo4j initialized');
        
        // Quick add
        await mem0.addMessage({
            type: 'user',
            content: 'Quick test',
            timestamp: new Date().toISOString()
        }, 'test-session', 'test-user');
        
        console.log('✅ Graph store working!');
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
}

quickTest();