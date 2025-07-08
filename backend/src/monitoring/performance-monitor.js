/**
 * Performance Monitoring Middleware
 * 
 * Tracks timing for all major operations in the ChatSG backend
 * Enable with ENABLE_PERFORMANCE_MONITORING=true
 */

const { performance } = require('perf_hooks');

// Store timing data for analysis
const timingData = new Map();
const timingSummary = new Map();

// Configuration
const ENABLED = process.env.ENABLE_PERFORMANCE_MONITORING === 'true';
const LOG_THRESHOLD_MS = parseInt(process.env.PERF_LOG_THRESHOLD_MS || '100', 10);
const SUMMARY_INTERVAL_MS = parseInt(process.env.PERF_SUMMARY_INTERVAL_MS || '60000', 10);

/**
 * Performance tracker class for detailed timing
 */
class PerformanceTracker {
    constructor(requestId, operation) {
        this.requestId = requestId;
        this.operation = operation;
        this.marks = new Map();
        this.measurements = new Map();
        this.startTime = performance.now();
        
        if (ENABLED) {
            this.mark('start');
        }
    }
    
    /**
     * Mark a point in time
     */
    mark(label) {
        if (!ENABLED) return;
        
        const markName = `${this.requestId}-${this.operation}-${label}`;
        performance.mark(markName);
        this.marks.set(label, performance.now());
    }
    
    /**
     * Measure time between two marks
     */
    measure(label, startMark = 'start', endMark = null) {
        if (!ENABLED) return 0;
        
        const endTime = endMark ? this.marks.get(endMark) : performance.now();
        const startTime = this.marks.get(startMark) || this.startTime;
        const duration = endTime - startTime;
        
        this.measurements.set(label, {
            duration,
            startMark,
            endMark: endMark || 'now'
        });
        
        return duration;
    }
    
    /**
     * Get all measurements
     */
    getMeasurements() {
        return Object.fromEntries(this.measurements);
    }
    
    /**
     * Get total duration
     */
    getTotalDuration() {
        return performance.now() - this.startTime;
    }
    
    /**
     * Generate timing report
     */
    getReport() {
        // Calculate total duration based on actual operation measurements
        let actualStartTime = Infinity;
        let actualEndTime = 0;
        
        // Find the earliest and latest marks, excluding the initial 'start' mark
        for (const [label, time] of this.marks) {
            // Skip the initial 'start' mark that's created on instantiation
            if (label === 'start') continue;
            
            actualStartTime = Math.min(actualStartTime, time);
            actualEndTime = Math.max(actualEndTime, time);
        }
        
        // If no operation marks exist, use 0 duration
        const totalDuration = (actualStartTime === Infinity || actualEndTime === 0) 
            ? 0 
            : actualEndTime - actualStartTime;
        
        const measurements = {};
        
        // Calculate all measurements
        for (const [label, data] of this.measurements) {
            measurements[label] = {
                duration: data.duration.toFixed(2),
                percentage: totalDuration > 0 ? ((data.duration / totalDuration) * 100).toFixed(1) : '0.0'
            };
        }
        
        return {
            operation: this.operation,
            totalDuration: totalDuration.toFixed(2),
            measurements,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Express middleware for request timing
 */
function performanceMonitoringMiddleware(req, res, next) {
    if (!ENABLED) {
        return next();
    }
    
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const tracker = new PerformanceTracker(requestId, 'request');
    
    // Attach tracker to request
    req.perfTracker = tracker;
    req.requestId = requestId;
    
    // Track request details
    tracker.mark('middleware-start');
    
    // Store request info
    timingData.set(requestId, {
        method: req.method,
        path: req.path,
        startTime: Date.now(),
        tracker
    });
    
    // Override res.json to capture response timing
    const originalJson = res.json;
    res.json = function(data) {
        tracker.mark('response-start');
        
        // Measure key phases
        tracker.measure('total-processing', 'start', 'response-start');
        
        const report = tracker.getReport();
        
        // Log if exceeds threshold
        if (report.totalDuration > LOG_THRESHOLD_MS) {
            console.log(`[PERF] Slow request detected: ${req.method} ${req.path}`);
            console.log(`[PERF] Total: ${report.totalDuration}ms`);
            console.log('[PERF] Breakdown:', JSON.stringify(report.measurements, null, 2));
        }
        
        // Update summary statistics
        updateSummaryStats(req.path, report.totalDuration);
        
        // Clean up
        timingData.delete(requestId);
        
        // Add timing header
        res.set('X-Response-Time', `${report.totalDuration}ms`);
        
        return originalJson.call(this, data);
    };
    
    next();
}

/**
 * Create a sub-tracker for specific operations
 */
function createSubTracker(req, operation) {
    if (!ENABLED || !req.perfTracker) {
        return null;
    }
    
    return new PerformanceTracker(req.requestId, operation);
}

/**
 * Update summary statistics
 */
function updateSummaryStats(path, duration) {
    if (!ENABLED) return;
    
    if (!timingSummary.has(path)) {
        timingSummary.set(path, {
            count: 0,
            totalTime: 0,
            minTime: Infinity,
            maxTime: 0,
            avgTime: 0
        });
    }
    
    const stats = timingSummary.get(path);
    stats.count++;
    stats.totalTime += duration;
    stats.minTime = Math.min(stats.minTime, duration);
    stats.maxTime = Math.max(stats.maxTime, duration);
    stats.avgTime = stats.totalTime / stats.count;
}

/**
 * Get performance summary
 */
function getPerformanceSummary() {
    const summary = {};
    
    for (const [path, stats] of timingSummary) {
        summary[path] = {
            requests: stats.count,
            avgTime: stats.avgTime.toFixed(2) + 'ms',
            minTime: stats.minTime.toFixed(2) + 'ms',
            maxTime: stats.maxTime.toFixed(2) + 'ms'
        };
    }
    
    return summary;
}

/**
 * Log performance summary periodically
 */
if (ENABLED && SUMMARY_INTERVAL_MS > 0) {
    setInterval(() => {
        const summary = getPerformanceSummary();
        if (Object.keys(summary).length > 0) {
            console.log('[PERF] Performance Summary:');
            console.table(summary);
            
            // Reset summary after logging
            timingSummary.clear();
        }
    }, SUMMARY_INTERVAL_MS);
}

/**
 * Timing utilities for use in routes
 */
const timingUtils = {
    /**
     * Time an async operation
     */
    async timeOperation(tracker, operationName, asyncFn) {
        if (!ENABLED || !tracker) {
            return await asyncFn();
        }
        
        tracker.mark(`${operationName}-start`);
        try {
            const result = await asyncFn();
            tracker.mark(`${operationName}-end`);
            tracker.measure(operationName, `${operationName}-start`, `${operationName}-end`);
            return result;
        } catch (error) {
            tracker.mark(`${operationName}-error`);
            tracker.measure(`${operationName}-error`, `${operationName}-start`, `${operationName}-error`);
            throw error;
        }
    },
    
    /**
     * Create a simple timer
     */
    startTimer() {
        const start = performance.now();
        return {
            end: (label) => {
                const duration = performance.now() - start;
                if (ENABLED && duration > LOG_THRESHOLD_MS) {
                    console.log(`[PERF] ${label}: ${duration.toFixed(2)}ms`);
                }
                return duration;
            }
        };
    }
};

module.exports = {
    performanceMonitoringMiddleware,
    createSubTracker,
    PerformanceTracker,
    getPerformanceSummary,
    timingUtils,
    isEnabled: () => ENABLED
};