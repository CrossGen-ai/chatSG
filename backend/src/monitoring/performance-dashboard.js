/**
 * Performance Dashboard
 * 
 * Provides real-time performance metrics and analysis
 * Access at: GET /api/performance/dashboard
 */

const { getPerformanceSummary } = require('./performance-monitor');

// Store recent operation timings
const recentOperations = [];
const MAX_RECENT_OPERATIONS = 100;

// Store operation statistics
const operationStats = {
    memory: {
        search: { count: 0, totalTime: 0, avgTime: 0, maxTime: 0 },
        contextBuild: { count: 0, totalTime: 0, avgTime: 0, maxTime: 0 },
        add: { count: 0, totalTime: 0, avgTime: 0, maxTime: 0 }
    },
    llm: {
        streaming: { count: 0, totalTime: 0, avgTime: 0, maxTime: 0, avgTTFT: 0 },
        nonStreaming: { count: 0, totalTime: 0, avgTime: 0, maxTime: 0 }
    },
    database: {
        queries: { count: 0, totalTime: 0, avgTime: 0, maxTime: 0 }
    },
    routing: {
        selection: { count: 0, totalTime: 0, avgTime: 0, maxTime: 0 },
        execution: { count: 0, totalTime: 0, avgTime: 0, maxTime: 0 }
    }
};

/**
 * Record an operation timing
 */
function recordOperation(category, operation, duration, metadata = {}) {
    // Add to recent operations
    const record = {
        category,
        operation,
        duration,
        metadata,
        timestamp: new Date().toISOString()
    };
    
    recentOperations.unshift(record);
    if (recentOperations.length > MAX_RECENT_OPERATIONS) {
        recentOperations.pop();
    }
    
    // Update statistics
    if (operationStats[category]?.[operation]) {
        const stats = operationStats[category][operation];
        stats.count++;
        stats.totalTime += duration;
        stats.avgTime = stats.totalTime / stats.count;
        stats.maxTime = Math.max(stats.maxTime, duration);
        
        // Special handling for LLM TTFT
        if (category === 'llm' && operation === 'streaming' && metadata.ttft) {
            stats.avgTTFT = ((stats.avgTTFT * (stats.count - 1)) + metadata.ttft) / stats.count;
        }
    }
}

/**
 * Get performance dashboard data
 */
function getDashboardData() {
    const enabled = process.env.ENABLE_PERFORMANCE_MONITORING === 'true';
    
    if (!enabled) {
        return {
            enabled: false,
            message: 'Performance monitoring is disabled. Set ENABLE_PERFORMANCE_MONITORING=true to enable.'
        };
    }
    
    // Calculate percentiles for recent operations
    const sortedDurations = recentOperations
        .map(op => op.duration)
        .sort((a, b) => a - b);
    
    const p50 = sortedDurations[Math.floor(sortedDurations.length * 0.5)] || 0;
    const p90 = sortedDurations[Math.floor(sortedDurations.length * 0.9)] || 0;
    const p99 = sortedDurations[Math.floor(sortedDurations.length * 0.99)] || 0;
    
    // Get current endpoint statistics
    const endpointStats = getPerformanceSummary();
    
    // Calculate bottlenecks
    const bottlenecks = identifyBottlenecks();
    
    return {
        enabled: true,
        timestamp: new Date().toISOString(),
        summary: {
            totalOperations: recentOperations.length,
            percentiles: {
                p50: (parseFloat(p50) || 0).toFixed(2) + 'ms',
                p90: (parseFloat(p90) || 0).toFixed(2) + 'ms',
                p99: (parseFloat(p99) || 0).toFixed(2) + 'ms'
            }
        },
        endpoints: endpointStats,
        operations: operationStats,
        bottlenecks,
        recentOperations: recentOperations.slice(0, 20), // Last 20 operations
        recommendations: generateRecommendations(bottlenecks)
    };
}

/**
 * Identify performance bottlenecks
 */
function identifyBottlenecks() {
    const bottlenecks = [];
    
    // Check memory operations
    if (operationStats.memory.search.avgTime > 200) {
        bottlenecks.push({
            type: 'memory-search',
            severity: 'high',
            avgTime: operationStats.memory.search.avgTime.toFixed(2) + 'ms',
            impact: 'Slow memory searches delay responses'
        });
    }
    
    // Check LLM operations
    if (operationStats.llm.streaming.avgTTFT > 2000) {
        bottlenecks.push({
            type: 'llm-ttft',
            severity: 'high',
            avgTime: operationStats.llm.streaming.avgTTFT.toFixed(2) + 'ms',
            impact: 'Slow time to first token affects user experience'
        });
    }
    
    // Check database operations
    if (operationStats.database.queries.avgTime > 100) {
        bottlenecks.push({
            type: 'database-queries',
            severity: 'medium',
            avgTime: operationStats.database.queries.avgTime.toFixed(2) + 'ms',
            impact: 'Database queries slowing down operations'
        });
    }
    
    // Check routing
    if (operationStats.routing.selection.avgTime > 150) {
        bottlenecks.push({
            type: 'agent-routing',
            severity: 'medium',
            avgTime: operationStats.routing.selection.avgTime.toFixed(2) + 'ms',
            impact: 'Agent selection taking too long'
        });
    }
    
    return bottlenecks;
}

/**
 * Generate optimization recommendations
 */
function generateRecommendations(bottlenecks) {
    const recommendations = [];
    
    bottlenecks.forEach(bottleneck => {
        switch (bottleneck.type) {
            case 'memory-search':
                recommendations.push({
                    issue: 'Slow memory searches',
                    suggestions: [
                        'Ensure Qdrant indices are optimized',
                        'Consider reducing the number of memories searched',
                        'Check if Qdrant container has sufficient resources'
                    ]
                });
                break;
                
            case 'llm-ttft':
                recommendations.push({
                    issue: 'High time to first token',
                    suggestions: [
                        'Consider using a faster model for initial responses',
                        'Implement response caching for common queries',
                        'Check network latency to LLM provider'
                    ]
                });
                break;
                
            case 'database-queries':
                recommendations.push({
                    issue: 'Slow database queries',
                    suggestions: [
                        'Add database indices for frequently queried fields',
                        'Consider connection pooling optimization',
                        'Review query complexity and optimize'
                    ]
                });
                break;
                
            case 'agent-routing':
                recommendations.push({
                    issue: 'Slow agent selection',
                    suggestions: [
                        'Simplify routing logic',
                        'Cache routing decisions for similar queries',
                        'Consider reducing the number of agents'
                    ]
                });
                break;
        }
    });
    
    return recommendations;
}

/**
 * Express route handler for dashboard
 */
function performanceDashboardHandler(req, res) {
    const dashboard = getDashboardData();
    res.json(dashboard);
}

/**
 * Express route handler for clearing stats
 */
function clearPerformanceStats(req, res) {
    // Clear recent operations
    recentOperations.length = 0;
    
    // Reset operation statistics
    Object.keys(operationStats).forEach(category => {
        Object.keys(operationStats[category]).forEach(operation => {
            operationStats[category][operation] = {
                count: 0,
                totalTime: 0,
                avgTime: 0,
                maxTime: 0
            };
            if (category === 'llm' && operation === 'streaming') {
                operationStats[category][operation].avgTTFT = 0;
            }
        });
    });
    
    res.json({ message: 'Performance statistics cleared' });
}

module.exports = {
    recordOperation,
    getDashboardData,
    performanceDashboardHandler,
    clearPerformanceStats
};