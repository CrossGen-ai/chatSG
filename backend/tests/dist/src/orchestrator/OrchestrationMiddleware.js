"use strict";
/**
 * Orchestration Middleware
 *
 * Middleware that integrates the AgentOrchestrator with existing backend routing system.
 * Preserves all existing API endpoints while adding intelligent agent routing capabilities.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrchestrationMiddleware = void 0;
exports.createOrchestrationMiddleware = createOrchestrationMiddleware;
exports.wrapChatHandler = wrapChatHandler;
const state_1 = require("../state");
/**
 * Main orchestration middleware class
 */
class OrchestrationMiddleware {
    constructor(orchestrator, config) {
        this.stateManager = (0, state_1.getStateManager)();
        // Metrics tracking
        this.metrics = {
            totalRequests: 0,
            orchestratedRequests: 0,
            fallbackRequests: 0,
            averageOrchestrationTime: 0,
            errorCount: 0,
            backendUsage: new Map()
        };
        this.orchestrator = orchestrator;
        this.config = {
            enableOrchestration: true,
            preserveBackendRouting: true,
            orchestrationMode: 'enhanced',
            enableLogging: true,
            enableMetrics: true,
            ...config
        };
        console.log('[OrchestrationMiddleware] Initialized with config:', this.config);
    }
    /**
     * Main middleware function for chat requests
     */
    async handleChatRequest(userMessage, sessionId, backend, originalRequest, originalResponse, originalHandler) {
        const startTime = Date.now();
        this.metrics.totalRequests++;
        const context = {
            sessionId,
            userInput: userMessage,
            backend,
            originalRequest,
            originalResponse,
            startTime
        };
        try {
            if (!this.config.enableOrchestration) {
                // Orchestration disabled - use original handler
                return this.executeOriginalHandler(context, originalHandler);
            }
            // Determine orchestration strategy
            switch (this.config.orchestrationMode) {
                case 'enhanced':
                    return await this.handleEnhancedOrchestration(context, originalHandler);
                case 'fallback':
                    return await this.handleFallbackOrchestration(context, originalHandler);
                case 'parallel':
                    return await this.handleParallelOrchestration(context, originalHandler);
                default:
                    return await this.handleEnhancedOrchestration(context, originalHandler);
            }
        }
        catch (error) {
            this.metrics.errorCount++;
            console.error('[OrchestrationMiddleware] Error handling request:', error);
            // Always fallback to original handler on error
            return this.executeOriginalHandler(context, originalHandler);
        }
    }
    /**
     * Enhanced orchestration mode - tries orchestrator first, fallback to original
     */
    async handleEnhancedOrchestration(context, originalHandler) {
        try {
            // Check if we have registered agents
            const availableAgents = this.orchestrator.listAgents();
            if (availableAgents.length === 0) {
                if (this.config.enableLogging) {
                    console.log('[OrchestrationMiddleware] No agents registered, using original handler');
                }
                return this.executeOriginalHandler(context, originalHandler);
            }
            // Create orchestration context
            const orchestrationContext = {
                sessionId: context.sessionId,
                userInput: context.userInput,
                availableAgents: availableAgents.map(a => a.name)
            };
            // Select best agent
            const selection = await this.orchestrator.selectAgent(context.userInput, orchestrationContext);
            if (this.config.enableLogging) {
                console.log(`[OrchestrationMiddleware] Selected agent: ${selection.selectedAgent} (confidence: ${selection.confidence})`);
            }
            // Create task for delegation
            const task = {
                id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type: 'chat',
                input: context.userInput,
                parameters: { sessionId: context.sessionId },
                priority: 1
            };
            // Delegate to selected agent
            const taskResult = await this.orchestrator.delegateTask(task, selection.selectedAgent);
            if (taskResult.success) {
                this.metrics.orchestratedRequests++;
                const orchestrationTime = Date.now() - context.startTime;
                this.updateAverageOrchestrationTime(orchestrationTime);
                return {
                    success: true,
                    response: {
                        message: taskResult.result?.message || 'Response from orchestrated agent',
                        _backend: 'orchestrator',
                        _agent: selection.selectedAgent,
                        _session: context.sessionId,
                        _timestamp: new Date().toISOString(),
                        _orchestration: {
                            confidence: selection.confidence,
                            reason: selection.reason,
                            executionTime: taskResult.executionTime
                        },
                        success: true
                    },
                    agentUsed: selection.selectedAgent,
                    orchestrationTime
                };
            }
            else {
                // Task failed, fallback to original handler
                if (this.config.enableLogging) {
                    console.warn('[OrchestrationMiddleware] Task failed, falling back to original handler:', taskResult.error);
                }
                return this.executeOriginalHandler(context, originalHandler, true);
            }
        }
        catch (error) {
            console.error('[OrchestrationMiddleware] Enhanced orchestration failed:', error);
            return this.executeOriginalHandler(context, originalHandler, true);
        }
    }
    /**
     * Fallback orchestration mode - tries original first, orchestrator on failure
     */
    async handleFallbackOrchestration(context, originalHandler) {
        try {
            // Try original handler first
            const originalResult = await originalHandler(context.userInput, context.sessionId);
            // Check if original handler succeeded
            if (originalResult && !originalResult.error) {
                this.updateBackendUsage(context.backend);
                return {
                    success: true,
                    response: {
                        ...originalResult,
                        _orchestrationMode: 'fallback-original'
                    }
                };
            }
            // Original failed, try orchestrator
            if (this.config.enableLogging) {
                console.log('[OrchestrationMiddleware] Original handler failed, trying orchestrator');
            }
            const orchestrationResult = await this.handleEnhancedOrchestration(context, originalHandler);
            return {
                ...orchestrationResult,
                fallbackUsed: true,
                response: {
                    ...orchestrationResult.response,
                    _orchestrationMode: 'fallback-orchestrator'
                }
            };
        }
        catch (error) {
            console.error('[OrchestrationMiddleware] Fallback orchestration failed:', error);
            return {
                success: false,
                error: error.message,
                response: {
                    error: 'Both original handler and orchestrator failed',
                    details: error.message,
                    _backend: context.backend,
                    _orchestrationMode: 'fallback-failed'
                }
            };
        }
    }
    /**
     * Parallel orchestration mode - runs both simultaneously, returns fastest
     */
    async handleParallelOrchestration(context, originalHandler) {
        try {
            // Run both original handler and orchestrator in parallel
            const [originalResult, orchestrationResult] = await Promise.allSettled([
                this.executeOriginalHandler(context, originalHandler),
                this.handleEnhancedOrchestration(context, originalHandler)
            ]);
            // Prefer successful orchestration result if available
            if (orchestrationResult.status === 'fulfilled' && orchestrationResult.value.success) {
                return {
                    ...orchestrationResult.value,
                    response: {
                        ...orchestrationResult.value.response,
                        _orchestrationMode: 'parallel-orchestrator'
                    }
                };
            }
            // Fall back to original result
            if (originalResult.status === 'fulfilled' && originalResult.value.success) {
                return {
                    ...originalResult.value,
                    response: {
                        ...originalResult.value.response,
                        _orchestrationMode: 'parallel-original'
                    }
                };
            }
            // Both failed
            const error = orchestrationResult.status === 'rejected' ? orchestrationResult.reason : 'Both handlers failed';
            return {
                success: false,
                error: error.toString(),
                response: {
                    error: 'Parallel orchestration failed',
                    details: error.toString(),
                    _backend: context.backend,
                    _orchestrationMode: 'parallel-failed'
                }
            };
        }
        catch (error) {
            console.error('[OrchestrationMiddleware] Parallel orchestration failed:', error);
            return {
                success: false,
                error: error.message,
                response: {
                    error: 'Parallel orchestration error',
                    details: error.message,
                    _backend: context.backend,
                    _orchestrationMode: 'parallel-error'
                }
            };
        }
    }
    /**
     * Execute original handler
     */
    async executeOriginalHandler(context, originalHandler, isFallback = false) {
        try {
            const result = await originalHandler(context.userInput, context.sessionId);
            if (isFallback) {
                this.metrics.fallbackRequests++;
            }
            this.updateBackendUsage(context.backend);
            return {
                success: true,
                response: {
                    ...result,
                    _orchestrationMode: isFallback ? 'fallback' : 'original'
                },
                fallbackUsed: isFallback
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message,
                response: {
                    error: 'Original handler failed',
                    details: error.message,
                    _backend: context.backend
                }
            };
        }
    }
    /**
     * Register an agent with the orchestrator
     */
    registerAgent(agent) {
        this.orchestrator.registerAgent(agent);
        if (this.config.enableLogging) {
            console.log(`[OrchestrationMiddleware] Registered agent: ${agent.getInfo().name}`);
        }
    }
    /**
     * Unregister an agent
     */
    unregisterAgent(agentName) {
        const result = this.orchestrator.unregisterAgent(agentName);
        if (this.config.enableLogging && result) {
            console.log(`[OrchestrationMiddleware] Unregistered agent: ${agentName}`);
        }
        return result;
    }
    /**
     * Handle conversation handoff requests
     */
    async handleHandoffRequest(fromAgent, toAgent, sessionId, reason, conversationSummary, userIntent) {
        try {
            const handoffResult = await this.orchestrator.handleConversationHandoff(fromAgent, toAgent, {
                sessionId,
                reason,
                conversationSummary,
                userIntent,
                metadata: {
                    timestamp: new Date(),
                    requestedBy: 'middleware'
                }
            });
            return {
                success: handoffResult.success,
                newAgent: handoffResult.newAgent,
                transitionMessage: handoffResult.transitionMessage,
                error: handoffResult.error,
                _orchestration: true
            };
        }
        catch (error) {
            console.error('[OrchestrationMiddleware] Handoff request failed:', error);
            return {
                success: false,
                error: error.message,
                _orchestration: true
            };
        }
    }
    /**
     * Get orchestration and middleware metrics
     */
    getMetrics() {
        return {
            middleware: this.metrics,
            orchestrator: this.orchestrator.getStats(),
            config: this.config
        };
    }
    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        if (this.config.enableLogging) {
            console.log('[OrchestrationMiddleware] Configuration updated:', this.config);
        }
    }
    /**
     * Health check for orchestration system
     */
    async healthCheck() {
        try {
            const orchestratorStats = this.orchestrator.getStats();
            const availableAgents = this.orchestrator.listAgents();
            return {
                status: 'healthy',
                orchestrator: {
                    registeredAgents: orchestratorStats.registeredAgents,
                    availableStrategies: orchestratorStats.availableStrategies,
                    totalRequests: orchestratorStats.totalRequests
                },
                middleware: {
                    totalRequests: this.metrics.totalRequests,
                    orchestratedRequests: this.metrics.orchestratedRequests,
                    errorRate: this.metrics.totalRequests > 0 ?
                        (this.metrics.errorCount / this.metrics.totalRequests) * 100 : 0
                },
                agents: availableAgents.map(agent => ({
                    name: agent.name,
                    version: agent.version,
                    features: agent.features,
                    supportsTools: agent.supportsTools,
                    supportsStateSharing: agent.supportsStateSharing
                })),
                timestamp: new Date().toISOString()
            };
        }
        catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
    /**
     * Update average orchestration time
     */
    updateAverageOrchestrationTime(newTime) {
        const totalOrchestrated = this.metrics.orchestratedRequests;
        const currentAverage = this.metrics.averageOrchestrationTime;
        this.metrics.averageOrchestrationTime =
            ((currentAverage * (totalOrchestrated - 1)) + newTime) / totalOrchestrated;
    }
    /**
     * Update backend usage statistics
     */
    updateBackendUsage(backend) {
        const currentCount = this.metrics.backendUsage.get(backend) || 0;
        this.metrics.backendUsage.set(backend, currentCount + 1);
    }
    /**
     * Cleanup resources
     */
    async cleanup() {
        if (this.config.enableLogging) {
            console.log('[OrchestrationMiddleware] Cleaning up...');
        }
        await this.orchestrator.cleanup();
        // Reset metrics
        this.metrics = {
            totalRequests: 0,
            orchestratedRequests: 0,
            fallbackRequests: 0,
            averageOrchestrationTime: 0,
            errorCount: 0,
            backendUsage: new Map()
        };
        if (this.config.enableLogging) {
            console.log('[OrchestrationMiddleware] Cleanup completed');
        }
    }
}
exports.OrchestrationMiddleware = OrchestrationMiddleware;
/**
 * Factory function to create orchestration middleware
 */
function createOrchestrationMiddleware(orchestrator, config) {
    return new OrchestrationMiddleware(orchestrator, config);
}
/**
 * Helper function to wrap existing chat handlers with orchestration
 */
function wrapChatHandler(middleware, originalHandler, backend) {
    return async (message, sessionId, req, res) => {
        if (!req || !res) {
            // If no request/response objects, just use original handler
            return originalHandler(message, sessionId);
        }
        const result = await middleware.handleChatRequest(message, sessionId, backend, req, res, originalHandler);
        return result.response;
    };
}
