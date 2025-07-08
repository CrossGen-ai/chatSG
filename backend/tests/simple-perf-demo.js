/**
 * Simple Performance Demo
 * Shows how the monitoring system tracks operations
 */

require('dotenv').config({ path: '../.env' });

console.log('=== Performance Monitoring Demo ===\n');
console.log('Enabled:', process.env.ENABLE_PERFORMANCE_MONITORING);
console.log('Threshold:', process.env.PERF_LOG_THRESHOLD_MS + 'ms\n');

const { PerformanceTracker } = require('../src/monitoring/performance-monitor');

async function demonstrateTracking() {
    // Create a tracker for our operation
    const tracker = new PerformanceTracker('demo-001', 'chat-request');
    
    console.log('Simulating a chat request with multiple operations:\n');
    
    // 1. Database query
    tracker.mark('db-start');
    console.log('1. Querying database...');
    await new Promise(resolve => setTimeout(resolve, 25));
    tracker.mark('db-end');
    const dbTime = tracker.measure('database-query', 'db-start', 'db-end');
    console.log(`   ✓ Database query: ${dbTime.toFixed(2)}ms`);
    
    // 2. Memory search (Qdrant)
    tracker.mark('memory-start');
    console.log('\n2. Searching memory (Qdrant)...');
    await new Promise(resolve => setTimeout(resolve, 150)); // Simulating Qdrant latency
    tracker.mark('memory-end');
    const memoryTime = tracker.measure('memory-search', 'memory-start', 'memory-end');
    console.log(`   ✓ Memory search: ${memoryTime.toFixed(2)}ms ${memoryTime > 100 ? '⚠️ SLOW' : ''}`);
    
    // 3. LLM call
    tracker.mark('llm-start');
    console.log('\n3. Calling LLM (OpenAI)...');
    
    // Time to first token
    await new Promise(resolve => setTimeout(resolve, 450));
    tracker.mark('llm-first-token');
    const ttft = tracker.measure('time-to-first-token', 'llm-start', 'llm-first-token');
    console.log(`   ✓ First token: ${ttft.toFixed(2)}ms`);
    
    // Streaming
    console.log('   Streaming response', '');
    for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 50));
        process.stdout.write('.');
    }
    console.log('');
    
    tracker.mark('llm-end');
    const llmTotal = tracker.measure('llm-total', 'llm-start', 'llm-end');
    console.log(`   ✓ LLM total: ${llmTotal.toFixed(2)}ms`);
    
    // 4. Save to storage
    tracker.mark('save-start');
    console.log('\n4. Saving to storage...');
    await new Promise(resolve => setTimeout(resolve, 30));
    tracker.mark('save-end');
    const saveTime = tracker.measure('save-message', 'save-start', 'save-end');
    console.log(`   ✓ Save complete: ${saveTime.toFixed(2)}ms`);
    
    // Get final report
    const report = tracker.getReport();
    
    console.log('\n=== Performance Report ===\n');
    console.log(`Total time: ${report.totalDuration}ms\n`);
    
    console.log('Operation breakdown:');
    Object.entries(report.measurements).forEach(([op, data]) => {
        const bar = '█'.repeat(Math.round(parseFloat(data.percentage) / 2));
        console.log(`${op.padEnd(20)} ${data.duration.padStart(8)}ms ${bar} ${data.percentage}%`);
    });
    
    console.log('\nBottlenecks identified:');
    if (memoryTime > 100) console.log('- Memory search is slow (>100ms)');
    if (ttft > 1000) console.log('- High LLM latency (TTFT >1s)');
    if (dbTime > 50) console.log('- Database query could be optimized');
    
    console.log('\nRecommendations:');
    if (memoryTime > 100) {
        console.log('- Check Qdrant performance and indices');
        console.log('- Consider reducing memory search scope');
    }
    if (ttft > 1000) {
        console.log('- Consider using a faster model');
        console.log('- Check network latency to OpenAI');
    }
}

demonstrateTracking().catch(console.error);