/**
 * Server Integration for Performance Monitoring
 * 
 * Add this to your server.js after loading environment variables
 */

const { 
    performanceMonitoringMiddleware, 
    createSubTracker,
    timingUtils 
} = require('./performance-monitor');

const {
    MemoryOperationTimer,
    LLMOperationTimer,
    DatabaseOperationTimer,
    AgentRoutingTimer,
    generatePerformanceTable
} = require('./operation-timers');

const {
    performanceDashboardHandler,
    clearPerformanceStats,
    recordOperation
} = require('./performance-dashboard');

/**
 * Add performance monitoring to Express app
 */
function addPerformanceMonitoring(app) {
    // Add middleware
    app.use(performanceMonitoringMiddleware);
    
    // Add dashboard routes
    app.get('/api/performance/dashboard', performanceDashboardHandler);
    app.post('/api/performance/clear', clearPerformanceStats);
    
    console.log('[Performance] Monitoring enabled:', process.env.ENABLE_PERFORMANCE_MONITORING === 'true');
    console.log('[Performance] Log threshold:', process.env.PERF_LOG_THRESHOLD_MS || '100', 'ms');
}

/**
 * Wrap memory operations with timing
 */
function wrapMemoryOperations(storageManager, requestId) {
    const timer = new MemoryOperationTimer(requestId);
    
    // Wrap getContextForQuery
    const originalGetContext = storageManager.getContextForQuery.bind(storageManager);
    storageManager.getContextForQuery = async function(...args) {
        timer.markMemorySearchStart();
        const result = await originalGetContext(...args);
        timer.markMemorySearchEnd(result.length);
        recordOperation('memory', 'search', timer.tracker?.measurements.get('memory-search')?.duration || 0);
        return result;
    };
    
    return timer;
}

/**
 * Create timing context for a request
 */
function createTimingContext(req) {
    return {
        memory: new MemoryOperationTimer(req.requestId),
        database: new DatabaseOperationTimer(req.requestId),
        agent: new AgentRoutingTimer(req.requestId),
        llm: null // Created when model is known
    };
}

module.exports = {
    addPerformanceMonitoring,
    wrapMemoryOperations,
    createTimingContext,
    MemoryOperationTimer,
    LLMOperationTimer,
    DatabaseOperationTimer,
    AgentRoutingTimer,
    recordOperation
};