/**
 * Integration Example
 * 
 * Shows how to integrate performance monitoring into server.js
 */

// Example code to add to server.js:

/*
// 1. Import performance monitoring
const { 
    performanceMonitoringMiddleware, 
    createSubTracker,
    timingUtils 
} = require('./src/monitoring/performance-monitor');

const {
    MemoryOperationTimer,
    LLMOperationTimer,
    DatabaseOperationTimer,
    AgentRoutingTimer,
    generatePerformanceTable
} = require('./src/monitoring/operation-timers');

const {
    performanceDashboardHandler,
    clearPerformanceStats,
    recordOperation
} = require('./src/monitoring/performance-dashboard');

// 2. Add middleware early in the middleware stack (after body parsing)
app.use(performanceMonitoringMiddleware);

// 3. Add performance dashboard routes
app.get('/api/performance/dashboard', performanceDashboardHandler);
app.post('/api/performance/clear', clearPerformanceStats);

// 4. Example: Timing a chat request with SSE
app.post('/api/chats/:id/messages', async (req, res) => {
    const { sessionId } = req.params;
    const { message } = req.body;
    
    // Create operation timers
    const timers = {
        memory: new MemoryOperationTimer(req.requestId),
        llm: null, // Will be created when we know the model
        database: new DatabaseOperationTimer(req.requestId),
        agent: new AgentRoutingTimer(req.requestId)
    };
    
    try {
        // Time database operations
        const session = await timers.database.timeQuery('get-session', async () => {
            return await storageManager.getSession(sessionId);
        });
        
        // Time memory operations
        timers.memory.markMemorySearchStart();
        const memoryContext = await storageManager.getContextForQuery(
            message,
            sessionId,
            systemPrompt
        );
        timers.memory.markMemorySearchEnd(memoryContext.length);
        
        // Time agent routing
        timers.agent.markRoutingStart();
        const selectedAgent = await orchestrator.selectAgent(message, context);
        timers.agent.markAgentSelected(selectedAgent.name);
        
        // Set up SSE
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Request-ID': req.requestId
        });
        
        // Create LLM timer with model info
        timers.llm = new LLMOperationTimer(req.requestId, selectedAgent.model);
        timers.llm.markRequestStart(tokenCount);
        
        // Time agent execution
        timers.agent.markAgentExecutionStart();
        
        let firstTokenReceived = false;
        let tokenCount = 0;
        
        // Stream response
        const stream = await agent.streamResponse(message, context);
        
        for await (const chunk of stream) {
            if (!firstTokenReceived) {
                timers.llm.markFirstTokenReceived();
                firstTokenReceived = true;
            }
            
            tokenCount++;
            res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
        }
        
        timers.agent.markAgentExecutionEnd();
        timers.llm.markStreamingComplete(tokenCount);
        
        // Time memory storage
        timers.memory.markMemoryAddStart();
        await storageManager.saveMessages(sessionId, messages);
        timers.memory.markMemoryAddEnd();
        
        // Generate performance table
        const perfTable = generatePerformanceTable(timers);
        
        // Send performance data in final SSE event
        res.write(`data: ${JSON.stringify({ 
            type: 'done',
            performance: perfTable 
        })}\n\n`);
        
        res.end();
        
        // Record operations for dashboard
        if (timers.memory.getReport()) {
            const memReport = timers.memory.getReport();
            recordOperation('memory', 'search', memReport.measurements['memory-search']?.duration || 0);
        }
        
        if (timers.llm.getReport()) {
            const llmReport = timers.llm.getReport();
            recordOperation('llm', 'streaming', 
                llmReport.measurements['total-llm-time']?.duration || 0,
                { ttft: llmReport.measurements['time-to-first-token']?.duration || 0 }
            );
        }
        
    } catch (error) {
        console.error('Chat request failed:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 5. Example: Simple timing for non-streaming endpoints
app.get('/api/chats', async (req, res) => {
    const timer = timingUtils.startTimer();
    
    try {
        const chats = await storageManager.listSessions();
        res.json(chats);
        
        timer.end('list-chats');
    } catch (error) {
        timer.end('list-chats-error');
        res.status(500).json({ error: 'Failed to list chats' });
    }
});

// 6. Environment variables to add to .env:
// ENABLE_PERFORMANCE_MONITORING=true
// PERF_LOG_THRESHOLD_MS=100           # Log operations slower than 100ms
// PERF_SUMMARY_INTERVAL_MS=60000      # Log summary every minute
*/

module.exports = {
    // This file is just an example - actual integration happens in server.js
};