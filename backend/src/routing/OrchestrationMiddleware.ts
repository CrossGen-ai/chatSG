/**
 * Orchestration Middleware
 * 
 * Middleware that integrates the AgentOrchestrator with existing backend routing system.
 * Preserves all existing API endpoints while adding intelligent agent routing capabilities.
 */

import { IncomingMessage, ServerResponse } from 'http';
import { AgentOrchestrator } from './AgentOrchestrator';
import { 
    OrchestrationContext, 
    Task, 
    AgentResponse,
    BaseAgent
} from '../types';
import { getStateManager } from '../state';
import { createStateContext } from '../state/utils';

/**
 * Middleware configuration
 */
interface MiddlewareConfig {
    enableOrchestration: boolean;
    preserveBackendRouting: boolean;
    orchestrationMode: 'enhanced' | 'fallback' | 'parallel';
    enableLogging: boolean;
    enableMetrics: boolean;
}

/**
 * Request context for orchestration
 */
interface RequestContext {
    sessionId: string;
    userInput: string;
    backend: string;
    originalRequest: IncomingMessage;
    originalResponse: ServerResponse;
    startTime: number;
}

/**
 * Orchestration result
 */
interface OrchestrationResult {
    success: boolean;
    response: any;
    agentUsed?: string;
    orchestrationTime?: number;
    fallbackUsed?: boolean;
    error?: string;
}

/**
 * Main orchestration middleware class
 */
export class OrchestrationMiddleware {
    private orchestrator: AgentOrchestrator;
    private config: MiddlewareConfig;
    private stateManager = getStateManager();
    
    // Metrics tracking
    private metrics = {
        totalRequests: 0,
        orchestratedRequests: 0,
        fallbackRequests: 0,
        averageOrchestrationTime: 0,
        errorCount: 0,
        backendUsage: new Map<string, number>()
    };

    constructor(orchestrator: AgentOrchestrator, config?: Partial<MiddlewareConfig>) {
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
    async handleChatRequest(
        userMessage: string,
        sessionId: string,
        backend: string,
        originalRequest: IncomingMessage,
        originalResponse: ServerResponse,
        originalHandler: (message: string, sessionId: string) => Promise<any>
    ): Promise<OrchestrationResult> {
        const startTime = Date.now();
        this.metrics.totalRequests++;

        const context: RequestContext = {
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

        } catch (error) {
            this.metrics.errorCount++;
            console.error('[OrchestrationMiddleware] Error handling request:', error);

            // Always fallback to original handler on error
            return this.executeOriginalHandler(context, originalHandler);
        }
    }

    /**
     * Enhanced orchestration mode - tries orchestrator first, fallback to original
     */
    private async handleEnhancedOrchestration(
        context: RequestContext,
        originalHandler: (message: string, sessionId: string) => Promise<any>
    ): Promise<OrchestrationResult> {
        try {
            // Check if we have registered agents
            const availableAgents = this.orchestrator.listAgents();
            if (availableAgents.length === 0) {
                if (this.config.enableLogging) {
                    console.log('[OrchestrationMiddleware] No agents registered, using original handler');
                }
                return this.executeOriginalHandler(context, originalHandler);
            }

            // Load user preferences from session state
            const userPreferences = await this.loadUserPreferences(context.sessionId);

            // Create orchestration context with user preferences
            const orchestrationContext: OrchestrationContext = {
                sessionId: context.sessionId,
                userInput: context.userInput,
                availableAgents: availableAgents.map(a => a.name),
                userPreferences: userPreferences
            };

            if (this.config.enableLogging) {
                console.log(`[OrchestrationMiddleware] Orchestration context:`, {
                    sessionId: context.sessionId,
                    agentLock: userPreferences?.agentLock,
                    lastAgentUsed: userPreferences?.lastAgentUsed,
                    availableAgents: orchestrationContext.availableAgents.length
                });
            }

            // Select best agent
            const selection = await this.orchestrator.selectAgent(context.userInput, orchestrationContext);
            
            if (this.config.enableLogging) {
                console.log(`[OrchestrationMiddleware] Selected agent: ${selection.selectedAgent} (confidence: ${selection.confidence})`);
            }

            // Create task for delegation
            const task: Task = {
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
                            executionTime: taskResult.executionTime,
                            agentLockUsed: userPreferences?.agentLock || false
                        },
                        success: true
                    },
                    agentUsed: selection.selectedAgent,
                    orchestrationTime
                };
            } else {
                // Task failed, fallback to original handler
                if (this.config.enableLogging) {
                    console.warn('[OrchestrationMiddleware] Task failed, falling back to original handler:', taskResult.error);
                }
                return this.executeOriginalHandler(context, originalHandler, true);
            }

        } catch (error) {
            console.error('[OrchestrationMiddleware] Enhanced orchestration failed:', error);
            return this.executeOriginalHandler(context, originalHandler, true);
        }
    }

    /**
     * Fallback orchestration mode - tries original first, orchestrator on failure
     */
    private async handleFallbackOrchestration(
        context: RequestContext,
        originalHandler: (message: string, sessionId: string) => Promise<any>
    ): Promise<OrchestrationResult> {
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

        } catch (error) {
            console.error('[OrchestrationMiddleware] Fallback orchestration failed:', error);
            return {
                success: false,
                error: (error as Error).message,
                response: {
                    error: 'Both original handler and orchestrator failed',
                    details: (error as Error).message,
                    _backend: context.backend,
                    _orchestrationMode: 'fallback-failed'
                }
            };
        }
    }

    /**
     * Parallel orchestration mode - runs both simultaneously, returns fastest
     */
    private async handleParallelOrchestration(
        context: RequestContext,
        originalHandler: (message: string, sessionId: string) => Promise<any>
    ): Promise<OrchestrationResult> {
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

        } catch (error) {
            console.error('[OrchestrationMiddleware] Parallel orchestration failed:', error);
            return {
                success: false,
                error: (error as Error).message,
                response: {
                    error: 'Parallel orchestration error',
                    details: (error as Error).message,
                    _backend: context.backend,
                    _orchestrationMode: 'parallel-error'
                }
            };
        }
    }

    /**
     * Execute original handler
     */
    private async executeOriginalHandler(
        context: RequestContext,
        originalHandler: (message: string, sessionId: string) => Promise<any>,
        isFallback: boolean = false
    ): Promise<OrchestrationResult> {
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

        } catch (error) {
            return {
                success: false,
                error: (error as Error).message,
                response: {
                    error: 'Original handler failed',
                    details: (error as Error).message,
                    _backend: context.backend
                }
            };
        }
    }

    /**
     * Register an agent with the orchestrator
     */
    registerAgent(agent: BaseAgent): void {
        this.orchestrator.registerAgent(agent);
        
        if (this.config.enableLogging) {
            console.log(`[OrchestrationMiddleware] Registered agent: ${agent.getInfo().name}`);
        }
    }

    /**
     * Unregister an agent
     */
    unregisterAgent(agentName: string): boolean {
        const result = this.orchestrator.unregisterAgent(agentName);
        
        if (this.config.enableLogging && result) {
            console.log(`[OrchestrationMiddleware] Unregistered agent: ${agentName}`);
        }
        
        return result;
    }

    /**
     * Handle conversation handoff requests
     */
    async handleHandoffRequest(
        fromAgent: string,
        toAgent: string,
        sessionId: string,
        reason: string,
        conversationSummary: string,
        userIntent: string
    ): Promise<any> {
        try {
            const handoffResult = await this.orchestrator.handleConversationHandoff(
                fromAgent,
                toAgent,
                {
                    sessionId,
                    reason,
                    conversationSummary,
                    userIntent,
                    metadata: {
                        timestamp: new Date(),
                        requestedBy: 'middleware'
                    }
                }
            );

            return {
                success: handoffResult.success,
                newAgent: handoffResult.newAgent,
                transitionMessage: handoffResult.transitionMessage,
                error: handoffResult.error,
                _orchestration: true
            };

        } catch (error) {
            console.error('[OrchestrationMiddleware] Handoff request failed:', error);
            return {
                success: false,
                error: (error as Error).message,
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
    updateConfig(newConfig: Partial<MiddlewareConfig>): void {
        this.config = { ...this.config, ...newConfig };
        
        if (this.config.enableLogging) {
            console.log('[OrchestrationMiddleware] Configuration updated:', this.config);
        }
    }

    /**
     * Health check for orchestration system
     */
    async healthCheck(): Promise<any> {
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

        } catch (error) {
            return {
                status: 'unhealthy',
                error: (error as Error).message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Update average orchestration time
     */
    private updateAverageOrchestrationTime(newTime: number): void {
        const totalOrchestrated = this.metrics.orchestratedRequests;
        const currentAverage = this.metrics.averageOrchestrationTime;
        
        this.metrics.averageOrchestrationTime = 
            ((currentAverage * (totalOrchestrated - 1)) + newTime) / totalOrchestrated;
    }

    /**
     * Update backend usage statistics
     */
    private updateBackendUsage(backend: string): void {
        const currentCount = this.metrics.backendUsage.get(backend) || 0;
        this.metrics.backendUsage.set(backend, currentCount + 1);
    }

    /**
     * Cleanup resources
     */
    async cleanup(): Promise<void> {
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

    /**
     * Load user preferences from session state
     */
    private async loadUserPreferences(sessionId: string): Promise<Record<string, any> | undefined> {
        try {
            const context = createStateContext(sessionId, 'OrchestrationMiddleware');
            const sessionResult = await this.stateManager.getSessionState(sessionId, context);
            
            if (sessionResult.success && sessionResult.data?.userPreferences) {
                const preferences = sessionResult.data.userPreferences;
                
                if (this.config.enableLogging) {
                    console.log(`[OrchestrationMiddleware] Loaded user preferences for session ${sessionId}:`, preferences);
                }
                
                return preferences;
            }
            
            // Return default preferences if none exist
            return {
                crossSessionMemory: false,
                agentLock: false
            };
            
        } catch (error) {
            console.warn(`[OrchestrationMiddleware] Failed to load user preferences for session ${sessionId}:`, error);
            return undefined;
        }
    }
}

/**
 * Factory function to create orchestration middleware
 */
export function createOrchestrationMiddleware(
    orchestrator: AgentOrchestrator,
    config?: Partial<MiddlewareConfig>
): OrchestrationMiddleware {
    return new OrchestrationMiddleware(orchestrator, config);
}

/**
 * Helper function to wrap existing chat handlers with orchestration
 */
export function wrapChatHandler(
    middleware: OrchestrationMiddleware,
    originalHandler: (message: string, sessionId: string) => Promise<any>,
    backend: string
) {
    return async (message: string, sessionId: string, req?: IncomingMessage, res?: ServerResponse) => {
        if (!req || !res) {
            // If no request/response objects, just use original handler
            return originalHandler(message, sessionId);
        }

        const result = await middleware.handleChatRequest(
            message,
            sessionId,
            backend,
            req,
            res,
            originalHandler
        );

        return result.response;
    };
}