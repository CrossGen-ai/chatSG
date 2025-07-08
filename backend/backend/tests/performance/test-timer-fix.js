/**
 * Test the timer fix for performance monitoring
 */

// Enable performance monitoring BEFORE loading the module
process.env.ENABLE_PERFORMANCE_MONITORING = 'true';

const { PerformanceTracker } = require('./src/monitoring/performance-monitor');

async function testTimerFix() {
    console.log('Testing timer fix...\n');
    
    // Simulate what happens in server.js
    const requestId = 'test-request-123';
    
    // Create timers at the start (simulating lines 295-297 in server.js)
    const dbTracker = new PerformanceTracker(requestId, 'database');
    
    // Wait 2 seconds to simulate other operations happening
    console.log('Waiting 2 seconds to simulate other operations...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Now perform database operations
    console.log('Starting database operations...');
    dbTracker.mark('query-start');
    
    // Simulate 200ms database query
    await new Promise(resolve => setTimeout(resolve, 200));
    
    dbTracker.mark('query-end');
    const queryDuration = dbTracker.measure('database-query', 'query-start', 'query-end');
    
    // Get the report
    const report = dbTracker.getReport();
    
    console.log('\nResults:');
    console.log('- Query duration (expected ~200ms):', queryDuration.toFixed(2) + 'ms');
    console.log('- Total duration in report (should be ~200ms, not ~2200ms):', report.totalDuration + 'ms');
    console.log('- Full report:', JSON.stringify(report, null, 2));
    
    // Test with no operations
    console.log('\nTesting empty tracker (no operations):');
    const emptyTracker = new PerformanceTracker('empty-test', 'empty');
    const emptyReport = emptyTracker.getReport();
    console.log('- Empty tracker total duration:', emptyReport.totalDuration + 'ms');
    console.log('- Empty tracker report:', JSON.stringify(emptyReport, null, 2));
}

testTimerFix().catch(console.error);