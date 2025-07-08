/**
 * Test Performance Monitoring
 * 
 * Demonstrates the monitoring system with a simulated chat flow
 */

require('dotenv').config({ path: '../.env' });

// Check if monitoring is enabled
console.log('Performance Monitoring Enabled:', process.env.ENABLE_PERFORMANCE_MONITORING);
console.log('Log Threshold:', process.env.PERF_LOG_THRESHOLD_MS || '100', 'ms\n');

const { 
    PerformanceTracker,
    performanceMonitoringMiddleware,
    getPerformanceSummary
} = require('../src/monitoring/performance-monitor');

const {
    MemoryOperationTimer,
    LLMOperationTimer,
    DatabaseOperationTimer,
    AgentRoutingTimer,
    generatePerformanceTable
} = require('../src/monitoring/operation-timers');

const { recordOperation, getDashboardData } = require('../src/monitoring/performance-dashboard');

// Simulate a chat request flow
async function simulateChatRequest() {
    console.log('=== Simulating Chat Request Flow ===\n');
    
    const requestId = 'test-req-' + Date.now();
    const timers = {
        memory: new MemoryOperationTimer(requestId),
        database: new DatabaseOperationTimer(requestId),
        agent: new AgentRoutingTimer(requestId),
        llm: null
    };
    
    // 1. Database operation - Get session
    console.log('1. Database: Getting session...');
    const sessionData = await timers.database.timeQuery('get-session', async () => {
        // Simulate database query
        await new Promise(resolve => setTimeout(resolve, 25));
        return { id: 'session-123', messages: [] };
    });
    
    // 2. Memory search
    console.log('2. Memory: Searching for context...');
    timers.memory.markMemorySearchStart();
    // Simulate Qdrant search
    await new Promise(resolve => setTimeout(resolve, 150));
    const memories = ['User name is Sean', 'Likes sci-fi movies'];
    timers.memory.markMemorySearchEnd(memories.length);
    
    // Record the memory operation
    const memSearchDuration = timers.memory.tracker?.measurements.get('memory-search')?.duration || 0;
    recordOperation('memory', 'search', memSearchDuration);
    
    // 3. Agent routing
    console.log('3. Agent: Selecting best agent...');
    timers.agent.markRoutingStart();
    // Simulate routing logic
    await new Promise(resolve => setTimeout(resolve, 75));
    timers.agent.markAgentSelected('AnalyticalAgent');
    
    // 4. LLM call
    console.log('4. LLM: Generating response...');
    timers.llm = new LLMOperationTimer(requestId, 'gpt-4o-mini');
    timers.llm.markRequestStart(150); // input tokens
    
    // Simulate TTFT
    await new Promise(resolve => setTimeout(resolve, 450));
    timers.llm.markFirstTokenReceived();
    console.log('   - First token received');
    
    // Simulate streaming
    timers.agent.markAgentExecutionStart();
    let outputTokens = 0;
    for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 50));
        outputTokens += 10;
        process.stdout.write('.');
    }
    console.log('\n   - Streaming complete');
    
    timers.agent.markAgentExecutionEnd();
    timers.llm.markStreamingComplete(outputTokens);
    
    // Record LLM operation
    const llmReport = timers.llm.getReport();
    if (llmReport?.measurements) {
        recordOperation('llm', 'streaming', 
            llmReport.measurements['total-llm-time']?.duration || 0,
            { ttft: llmReport.measurements['time-to-first-token']?.duration || 0 }
        );
    }
    
    // 5. Memory storage
    console.log('5. Memory: Storing conversation...');
    timers.memory.markMemoryAddStart();
    await new Promise(resolve => setTimeout(resolve, 30));
    timers.memory.markMemoryAddEnd();
    
    console.log('\n=== Performance Report ===\n');
    
    // Generate performance table
    const perfTable = generatePerformanceTable(timers);
    console.table(perfTable);
    
    // Show individual reports
    console.log('\nDetailed Timing:');
    console.log('- Database:', timers.database.getReport()?.totalDuration + 'ms');
    console.log('- Memory Search:', memSearchDuration.toFixed(2) + 'ms');
    console.log('- Agent Selection:', timers.agent.tracker?.measurements.get('agent-selection')?.duration.toFixed(2) + 'ms');
    console.log('- LLM TTFT:', timers.llm.tracker?.measurements.get('time-to-first-token')?.duration.toFixed(2) + 'ms');
    console.log('- LLM Total:', timers.llm.tracker?.measurements.get('total-llm-time')?.duration.toFixed(2) + 'ms');
}

// Run the simulation
async function main() {
    // Run a few simulations
    for (let i = 0; i < 3; i++) {
        console.log(`\n\n========== REQUEST ${i + 1} ==========\n`);
        await simulateChatRequest();
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Show dashboard data
    console.log('\n\n=== PERFORMANCE DASHBOARD ===\n');
    const dashboard = getDashboardData();
    
    console.log('Summary:', dashboard.summary);
    console.log('\nOperation Statistics:');
    console.table({
        'Memory Search': {
            count: dashboard.operations.memory.search.count,
            avgTime: dashboard.operations.memory.search.avgTime.toFixed(2) + 'ms',
            maxTime: dashboard.operations.memory.search.maxTime.toFixed(2) + 'ms'
        },
        'LLM Streaming': {
            count: dashboard.operations.llm.streaming.count,
            avgTime: dashboard.operations.llm.streaming.avgTime.toFixed(2) + 'ms',
            avgTTFT: dashboard.operations.llm.streaming.avgTTFT.toFixed(2) + 'ms'
        }
    });
    
    if (dashboard.bottlenecks.length > 0) {
        console.log('\nBottlenecks Detected:');
        dashboard.bottlenecks.forEach(b => {
            console.log(`- ${b.type}: ${b.avgTime} (${b.severity})`);
            console.log(`  Impact: ${b.impact}`);
        });
    }
    
    if (dashboard.recommendations.length > 0) {
        console.log('\nRecommendations:');
        dashboard.recommendations.forEach(r => {
            console.log(`\n${r.issue}:`);
            r.suggestions.forEach(s => console.log(`  - ${s}`));
        });
    }
}

main().catch(console.error);