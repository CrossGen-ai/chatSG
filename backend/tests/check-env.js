require('dotenv').config();

console.log('Environment variables check:');
console.log('MEM0_GRAPH_ENABLED:', process.env.MEM0_GRAPH_ENABLED);
console.log('NEO4J_URL:', process.env.NEO4J_URL ? 'SET (hidden)' : 'NOT SET');
console.log('NEO4J_USERNAME:', process.env.NEO4J_USERNAME ? 'SET (hidden)' : 'NOT SET');
console.log('NEO4J_PASSWORD:', process.env.NEO4J_PASSWORD ? 'SET (hidden)' : 'NOT SET');
console.log('\nOther Mem0 config:');
console.log('MEM0_ENABLED:', process.env.MEM0_ENABLED);
console.log('MEM0_PROVIDER:', process.env.MEM0_PROVIDER);
console.log('QDRANT_URL:', process.env.QDRANT_URL);