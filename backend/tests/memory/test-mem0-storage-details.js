/**
 * Detailed Mem0 Storage Test
 * Shows what gets stored in RAG (vector) vs Graph (Neo4j)
 */

require('dotenv').config();
const neo4j = require('neo4j-driver');

async function testStorageDetails() {
    console.log('🔍 Mem0 Storage Details Test\n');
    
    // Initialize mem0
    const { getMem0Service } = require('../dist/src/memory/Mem0Service');
    const mem0 = getMem0Service();
    await mem0.initialize();
    
    const testSession = 'storage-test-' + Date.now();
    
    // Test message
    const testMessage = {
        type: 'user',
        content: 'My name is Alice. I work at TechCorp with Bob who is my manager. I love Python programming.',
        timestamp: new Date().toISOString()
    };
    
    console.log('📝 Original Message:');
    console.log(`"${testMessage.content}"\n`);
    
    // Add to mem0
    const result = await mem0.addMessage(testMessage, testSession, 'test-user');
    
    console.log('💾 VECTOR STORE (RAG) - Extracted Memories:');
    console.log('These are semantic memories stored as embeddings:\n');
    
    // Get memories from vector store
    const memories = await mem0.getSessionMemories(testSession, 'test-user');
    memories.forEach((m, i) => {
        console.log(`${i + 1}. "${m.memory}"`);
        console.log(`   ID: ${m.id}`);
        console.log(`   (Stored as embedding vector for semantic search)\n`);
    });
    
    // Check Neo4j graph
    console.log('🔗 GRAPH STORE (Neo4j) - Entities & Relationships:');
    console.log('These are entities and their relationships:\n');
    
    const driver = neo4j.driver(
        process.env.NEO4J_URL || 'neo4j://localhost:7687',
        neo4j.auth.basic('neo4j', process.env.NEO4J_PASSWORD || 'neo4j')
    );
    
    const session = driver.session();
    
    try {
        // Query all nodes and relationships created recently
        const result = await session.run(`
            MATCH (n)
            WHERE n.created >= datetime() - duration('PT5M')
            OPTIONAL MATCH (n)-[r]->(m)
            RETURN n, type(r) as relationship, m
            ORDER BY n.created DESC
            LIMIT 20
        `);
        
        console.log('Nodes and Relationships:');
        result.records.forEach(record => {
            const node = record.get('n');
            const rel = record.get('relationship');
            const target = record.get('m');
            
            if (node) {
                console.log(`• Node: ${JSON.stringify(node.properties)}`);
                if (rel && target) {
                    console.log(`  → [${rel}] → ${JSON.stringify(target.properties)}`);
                }
            }
        });
        
        // Also check for specific entities
        console.log('\n📊 Entity Search Results:');
        
        const entities = ['Alice', 'TechCorp', 'Bob', 'Python'];
        for (const entity of entities) {
            const searchResult = await session.run(
                'MATCH (n) WHERE n.name = $name OR n.value = $name RETURN n',
                { name: entity }
            );
            
            if (searchResult.records.length > 0) {
                console.log(`✓ Found "${entity}" in graph`);
            } else {
                console.log(`✗ "${entity}" not found in graph`);
            }
        }
        
    } finally {
        await session.close();
        await driver.close();
    }
    
    console.log('\n📋 Summary:');
    console.log('- VECTOR STORE: Stores compressed semantic memories as embeddings');
    console.log('- GRAPH STORE: Stores entities and their relationships');
    console.log('- Both work together for hybrid retrieval\n');
    
    // Cleanup
    await mem0.deleteSessionMemories(testSession, 'test-user');
    console.log('🧹 Cleaned up test data');
}

testStorageDetails().catch(console.error);