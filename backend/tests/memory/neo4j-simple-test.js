/**
 * Simple Neo4j Connection Test
 * Tests basic Neo4j connectivity without the full Mem0 integration
 */

require('dotenv').config();
const neo4j = require('neo4j-driver');

async function testNeo4j() {
    console.log('🧪 Simple Neo4j Connection Test\n');
    
    // Configuration
    const url = process.env.NEO4J_URL || 'neo4j://localhost:7687';
    const username = process.env.NEO4J_USERNAME || 'neo4j';
    const password = process.env.NEO4J_PASSWORD || 'neo4j';
    
    console.log(`URL: ${url}`);
    console.log(`Username: ${username}`);
    console.log(`Password: ${password ? '***' : 'not set'}\n`);
    
    // Create driver
    const driver = neo4j.driver(url, neo4j.auth.basic(username, password));
    
    try {
        // Test connection
        console.log('1. Testing connection...');
        await driver.verifyConnectivity();
        console.log('✅ Connected to Neo4j!\n');
        
        // Create a session
        const session = driver.session();
        
        try {
            // 2. Create a test node
            console.log('2. Creating test node...');
            const createResult = await session.run(
                'CREATE (n:TestNode {name: $name, timestamp: $timestamp}) RETURN n',
                { 
                    name: 'ChatSG Test',
                    timestamp: new Date().toISOString()
                }
            );
            console.log('✅ Created test node\n');
            
            // 3. Query the node
            console.log('3. Querying test node...');
            const queryResult = await session.run(
                'MATCH (n:TestNode) WHERE n.name = $name RETURN n',
                { name: 'ChatSG Test' }
            );
            
            const node = queryResult.records[0].get('n');
            console.log('✅ Found node:', node.properties);
            console.log('\n');
            
            // 4. Clean up
            console.log('4. Cleaning up...');
            await session.run('MATCH (n:TestNode) DELETE n');
            console.log('✅ Deleted test node\n');
            
            console.log('🎉 Neo4j is working correctly!');
            
        } finally {
            await session.close();
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        
        if (error.code === 'ServiceUnavailable') {
            console.log('\n⚠️  Neo4j is not running or not accessible');
            console.log('Make sure Neo4j is running on localhost:7687');
        } else if (error.code === 'Neo.ClientError.Security.Unauthorized') {
            console.log('\n⚠️  Authentication failed');
            console.log('Check your Neo4j username and password');
        }
    } finally {
        await driver.close();
    }
}

// Run the test
testNeo4j().catch(console.error);