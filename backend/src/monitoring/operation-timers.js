/**
 * Operation Timers
 * 
 * Specialized timing utilities for tracking specific operations:
 * - Memory recall (Mem0/Qdrant)
 * - LLM calls (OpenAI/Azure)
 * - Database operations
 * - Agent routing
 */

const { PerformanceTracker, isEnabled } = require('./performance-monitor');

/**
 * Memory operation timer
 */
class MemoryOperationTimer {
    constructor(requestId) {
        this.tracker = isEnabled() ? new PerformanceTracker(requestId, 'memory') : null;
    }
    
    markMemorySearchStart() {
        this.tracker?.mark('search-start');
    }
    
    markMemorySearchEnd(resultCount) {
        if (!this.tracker) return;
        
        this.tracker.mark('search-end');
        const duration = this.tracker.measure('memory-search', 'search-start', 'search-end');
        
        if (duration > 100) {
            console.log(`[PERF:Memory] Search took ${duration.toFixed(2)}ms, found ${resultCount} results`);
        }
    }
    
    markContextBuildStart() {
        this.tracker?.mark('context-build-start');
    }
    
    markContextBuildEnd(messageCount) {
        if (!this.tracker) return;
        
        this.tracker.mark('context-build-end');
        const duration = this.tracker.measure('context-build', 'context-build-start', 'context-build-end');
        
        if (duration > 50) {
            console.log(`[PERF:Memory] Context build took ${duration.toFixed(2)}ms for ${messageCount} messages`);
        }
    }
    
    markMemoryAddStart() {
        this.tracker?.mark('memory-add-start');
    }
    
    markMemoryAddEnd() {
        if (!this.tracker) return;
        
        this.tracker.mark('memory-add-end');
        this.tracker.measure('memory-add', 'memory-add-start', 'memory-add-end');
    }
    
    getReport() {
        return this.tracker?.getReport();
    }
}

/**
 * LLM operation timer
 */
class LLMOperationTimer {
    constructor(requestId, model) {
        this.model = model;
        this.tracker = isEnabled() ? new PerformanceTracker(requestId, 'llm') : null;
    }
    
    markRequestStart(tokenCount) {
        this.tracker?.mark('request-start');
        this.inputTokens = tokenCount;
    }
    
    markFirstTokenReceived() {
        if (!this.tracker) return;
        
        this.tracker.mark('first-token');
        const ttft = this.tracker.measure('time-to-first-token', 'request-start', 'first-token');
        
        if (ttft > 1000) {
            console.log(`[PERF:LLM] Slow TTFT for ${this.model}: ${ttft.toFixed(2)}ms`);
        }
    }
    
    markStreamingComplete(outputTokens) {
        if (!this.tracker) return;
        
        this.tracker.mark('streaming-complete');
        const streamDuration = this.tracker.measure('streaming-duration', 'first-token', 'streaming-complete');
        const totalDuration = this.tracker.measure('total-llm-time', 'request-start', 'streaming-complete');
        
        const tokensPerSecond = outputTokens / (streamDuration / 1000);
        
        console.log(`[PERF:LLM] ${this.model} - Total: ${totalDuration.toFixed(0)}ms, TTFT: ${this.tracker.measurements.get('time-to-first-token')?.duration.toFixed(0)}ms, Stream: ${streamDuration.toFixed(0)}ms, TPS: ${tokensPerSecond.toFixed(1)}`);
    }
    
    markNonStreamingComplete(outputTokens) {
        if (!this.tracker) return;
        
        this.tracker.mark('response-complete');
        const duration = this.tracker.measure('total-llm-time', 'request-start', 'response-complete');
        
        console.log(`[PERF:LLM] ${this.model} - Non-streaming: ${duration.toFixed(0)}ms for ${outputTokens} tokens`);
    }
    
    getReport() {
        return this.tracker?.getReport();
    }
}

/**
 * Database operation timer
 */
class DatabaseOperationTimer {
    constructor(requestId) {
        this.tracker = isEnabled() ? new PerformanceTracker(requestId, 'database') : null;
    }
    
    async timeQuery(queryName, queryFn) {
        if (!this.tracker) {
            return await queryFn();
        }
        
        this.tracker.mark(`${queryName}-start`);
        try {
            const result = await queryFn();
            this.tracker.mark(`${queryName}-end`);
            const duration = this.tracker.measure(queryName, `${queryName}-start`, `${queryName}-end`);
            
            if (duration > 50) {
                console.log(`[PERF:DB] Slow query '${queryName}': ${duration.toFixed(2)}ms`);
            }
            
            return result;
        } catch (error) {
            this.tracker.mark(`${queryName}-error`);
            throw error;
        }
    }
    
    getReport() {
        return this.tracker?.getReport();
    }
}

/**
 * Agent routing timer
 */
class AgentRoutingTimer {
    constructor(requestId) {
        this.tracker = isEnabled() ? new PerformanceTracker(requestId, 'routing') : null;
    }
    
    markRoutingStart() {
        this.tracker?.mark('routing-start');
    }
    
    markAgentSelected(agentName) {
        if (!this.tracker) return;
        
        this.tracker.mark('agent-selected');
        const duration = this.tracker.measure('agent-selection', 'routing-start', 'agent-selected');
        
        if (duration > 100) {
            console.log(`[PERF:Routing] Agent selection took ${duration.toFixed(2)}ms, selected: ${agentName}`);
        }
        
        this.selectedAgent = agentName;
    }
    
    markAgentExecutionStart() {
        this.tracker?.mark('agent-execution-start');
    }
    
    markAgentExecutionEnd() {
        if (!this.tracker) return;
        
        this.tracker.mark('agent-execution-end');
        const duration = this.tracker.measure('agent-execution', 'agent-execution-start', 'agent-execution-end');
        
        console.log(`[PERF:Agent] ${this.selectedAgent} execution: ${duration.toFixed(2)}ms`);
    }
    
    getReport() {
        return this.tracker?.getReport();
    }
}

/**
 * Create a performance report table
 */
function generatePerformanceTable(timers) {
    if (!isEnabled()) return null;
    
    const table = [];
    
    // Memory operations
    if (timers.memory) {
        const memReport = timers.memory.getReport();
        if (memReport?.measurements) {
            Object.entries(memReport.measurements).forEach(([op, data]) => {
                table.push({
                    Operation: `Memory: ${op}`,
                    Duration: `${data.duration}ms`,
                    Percentage: `${data.percentage}%`
                });
            });
        }
    }
    
    // LLM operations
    if (timers.llm) {
        const llmReport = timers.llm.getReport();
        if (llmReport?.measurements) {
            Object.entries(llmReport.measurements).forEach(([op, data]) => {
                table.push({
                    Operation: `LLM: ${op}`,
                    Duration: `${data.duration}ms`,
                    Percentage: `${data.percentage}%`
                });
            });
        }
    }
    
    // Database operations
    if (timers.database) {
        const dbReport = timers.database.getReport();
        if (dbReport?.measurements) {
            Object.entries(dbReport.measurements).forEach(([op, data]) => {
                table.push({
                    Operation: `DB: ${op}`,
                    Duration: `${data.duration}ms`,
                    Percentage: `${data.percentage}%`
                });
            });
        }
    }
    
    // Agent operations
    if (timers.agent) {
        const agentReport = timers.agent.getReport();
        if (agentReport?.measurements) {
            Object.entries(agentReport.measurements).forEach(([op, data]) => {
                table.push({
                    Operation: `Agent: ${op}`,
                    Duration: `${data.duration}ms`,
                    Percentage: `${data.percentage}%`
                });
            });
        }
    }
    
    return table;
}

module.exports = {
    MemoryOperationTimer,
    LLMOperationTimer,
    DatabaseOperationTimer,
    AgentRoutingTimer,
    generatePerformanceTable
};