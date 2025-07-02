/**
 * Neo4j Status Checker
 * Quick diagnostic to check if Neo4j is accessible
 */

const http = require('http');

console.log('🔍 Neo4j Status Check\n');

// Check web interface (port 7474)
console.log('1. Checking Neo4j Browser (port 7474)...');
http.get('http://localhost:7474', (res) => {
    console.log(`   ✅ Web interface is UP (status: ${res.statusCode})`);
    console.log(`   📊 Access Neo4j Browser at: http://localhost:7474\n`);
}).on('error', (err) => {
    console.log(`   ❌ Web interface is DOWN (${err.message})\n`);
});

// Check bolt port (7687) - simple TCP check
const net = require('net');
console.log('2. Checking Bolt Protocol (port 7687)...');
const socket = new net.Socket();

socket.setTimeout(2000);
socket.on('connect', () => {
    console.log('   ✅ Bolt port is OPEN');
    console.log('   🔌 Neo4j database is accessible\n');
    socket.destroy();
    
    console.log('📝 Next Steps:');
    console.log('1. Add to your .env file:');
    console.log('   MEM0_GRAPH_ENABLED=true');
    console.log('   NEO4J_URL=neo4j://localhost:7687');
    console.log('   NEO4J_USERNAME=neo4j');
    console.log('   NEO4J_PASSWORD=your_password\n');
    console.log('2. Run: node tests/neo4j-simple-test.js');
});

socket.on('error', (err) => {
    console.log('   ❌ Bolt port is CLOSED');
    console.log('   🚫 Neo4j database is not accessible\n');
    
    console.log('📝 To start Neo4j:');
    console.log('1. Using Docker Desktop:');
    console.log('   - Open Docker Desktop');
    console.log('   - Start your Neo4j container\n');
    console.log('2. Using Neo4j Desktop:');
    console.log('   - Open Neo4j Desktop');
    console.log('   - Start your database\n');
    console.log('3. Using Docker CLI:');
    console.log('   docker run -d \\');
    console.log('     --name neo4j \\');
    console.log('     -p 7474:7474 -p 7687:7687 \\');
    console.log('     -e NEO4J_AUTH=neo4j/your_password \\');
    console.log('     neo4j:latest');
});

socket.on('timeout', () => {
    console.log('   ⏱️  Connection timed out');
    socket.destroy();
});

socket.connect(7687, 'localhost');