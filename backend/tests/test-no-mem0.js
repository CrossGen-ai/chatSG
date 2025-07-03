const { spawn } = require('child_process');
const path = require('path');

console.log('=== Performance Test WITHOUT Mem0 ===\n');

// Set environment variables to disable Mem0
const env = {
    ...process.env,
    MEM0_ENABLED: 'false'
};

// Spawn the performance test with Mem0 disabled
const testProcess = spawn('node', [path.join(__dirname, 'test-performance.js')], {
    env: env,
    stdio: 'inherit'
});

testProcess.on('exit', (code) => {
    console.log('\n=== Mem0 Disabled Test Complete ===');
    console.log('Exit code:', code);
    
    console.log('\n💡 Compare these results with Mem0 enabled:');
    console.log('- If delays are significantly reduced, Mem0 is the bottleneck');
    console.log('- Consider implementing caching or optimizing Mem0 initialization');
    console.log('- Check if Neo4j connection is causing delays');
});

testProcess.on('error', (err) => {
    console.error('Failed to run test:', err);
});