// Ultra-simple Neo4j status check
require('dotenv').config();
const neo4j = require('neo4j-driver');

const driver = neo4j.driver(
    process.env.NEO4J_URL || 'neo4j://localhost:7687',
    neo4j.auth.basic('neo4j', process.env.NEO4J_PASSWORD || 'neo4j')
);

driver.verifyConnectivity()
    .then(() => {
        console.log('✅ Neo4j connected');
        console.log(`🔗 ${process.env.NEO4J_URL || 'neo4j://localhost:7687'}`);
        console.log(`🔑 Graph enabled: ${process.env.MEM0_GRAPH_ENABLED === 'true'}`);
        driver.close();
    })
    .catch(err => {
        console.log('❌ Neo4j not connected');
        console.log(err.message);
        driver.close();
    });