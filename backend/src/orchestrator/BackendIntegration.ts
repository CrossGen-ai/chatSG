/**
 * Backend Integration Layer
 * 
 * Integrates the AgentOrchestrator with the existing backend routing system
 * in server.js while preserving all existing functionality and API endpoints.
 */

import { AgentOrchestrator } from './AgentOrchestrator';
import { OrchestrationMiddleware } from './OrchestrationMiddleware';
import { BaseAgent, AgentResponse, AgentCapabilities, ValidationResult } from '../types';

/**
 * Legacy AgentZero wrapper to make it compatible with BaseAgent interface
 */
export class LegacyAgentZeroWrapper implements BaseAgent {
    private agentZero: any;
    private name: string = 'AgentZero';
    private version: string = '1.0.0';

    constructor(agentZero: any) {
        this.agentZero = agentZero;
    }

    async processMessage(input: string, sessionId: string): Promise<AgentResponse> {
        try {
            const result = await this.agentZero.processMessage(input, sessionId);
            
            return {
                success: true,
                message: result.message || 'Response from AgentZero',
                sessionId: result.sessionId || sessionId,
                timestamp: result.timestamp || new Date().toISOString(),
                llmProvider: result.llmProvider,
                model: result.model,
                metadata: result.metadata || {}
            };
        } catch (error) {
            return {
                success: false,
                message: `AgentZero error: ${(error as Error).message}`,
                sessionId,
                timestamp: new Date().toISOString(),
                metadata: { error: (error as Error).message }
            };
        }
    }

    getCapabilities(): AgentCapabilities {
        return {
            name: this.name,
            version: this.version,
            supportedModes: ['interactive', 'chat'],
            features: ['conversation', 'memory', 'context-aware'],
            inputTypes: ['text'],
            outputTypes: ['text'],
            maxSessionMemory: 1000,
            supportsTools: false,
            supportsStateSharing: true
        };
    }

    validateConfig(): ValidationResult {
        return {
            valid: this.agentZero !== null,
            errors: this.agentZero ? [] : ['AgentZero instance not available'],
            warnings: []
        };
    }

    getInfo() {
        return {
            name: this.name,
            version: this.version,
            description: 'Legacy AgentZero wrapper for orchestration compatibility',
            type: 'legacy-agent'
        };
    }

    getName(): string {
        return this.name;
    }

    getVersion(): string {
        return this.version;
    }

    async initialize(): Promise<void> {
        // AgentZero is already initialized
        console.log('[LegacyAgentZeroWrapper] Initialized');
    }

    async cleanup(): Promise<void> {
        // AgentZero cleanup is handled externally
        console.log('[LegacyAgentZeroWrapper] Cleanup completed');
    }

    getSessionInfo(sessionId: string): any {
        if (this.agentZero && this.agentZero.getSessionInfo) {
            return this.agentZero.getSessionInfo(sessionId);
        }
        return null;
    }

    async clearSession(sessionId: string): Promise<void> {
        if (this.agentZero && this.agentZero.clearSession) {
            await this.agentZero.clearSession(sessionId);
        }
    }
}

/**
 * Generic backend handler wrapper
 */
export class GenericBackendWrapper implements BaseAgent {
    private name: string;
    private version: string = '1.0.0';
    private handler: (message: string, sessionId: string) => Promise<any>;

    constructor(name: string, handler: (message: string, sessionId: string) => Promise<any>) {
        this.name = name;
        this.handler = handler;
    }

    async processMessage(input: string, sessionId: string): Promise<AgentResponse> {
        try {
            const result = await this.handler(input, sessionId);
            
            return {
                success: true,
                message: result.message || result.output || 'Response from backend',
                sessionId,
                timestamp: new Date().toISOString(),
                metadata: { backend: this.name, originalResult: result }
            };
        } catch (error) {
            return {
                success: false,
                message: `Backend error: ${(error as Error).message}`,
                sessionId,
                timestamp: new Date().toISOString(),
                metadata: { error: (error as Error).message, backend: this.name }
            };
        }
    }

    getCapabilities(): AgentCapabilities {
        return {
            name: this.name,
            version: this.version,
            supportedModes: ['api', 'webhook'],
            features: ['external-integration'],
            inputTypes: ['text'],
            outputTypes: ['text'],
            supportsTools: false,
            supportsStateSharing: false
        };
    }

    validateConfig(): ValidationResult {
        return {
            valid: typeof this.handler === 'function',
            errors: typeof this.handler === 'function' ? [] : ['Handler function not provided'],
            warnings: []
        };
    }

    getInfo() {
        return {
            name: this.name,
            version: this.version,
            description: `Generic backend wrapper for ${this.name}`,
            type: 'backend-wrapper'
        };
    }

    getName(): string {
        return this.name;
    }

    getVersion(): string {
        return this.version;
    }
}

/**
 * Backend integration manager
 */
export class BackendIntegrationManager {
    private orchestrator: AgentOrchestrator;
    private middleware: OrchestrationMiddleware;
    private registeredBackends: Map<string, BaseAgent> = new Map();
    private isInitialized: boolean = false;

    constructor(orchestrator: AgentOrchestrator, middleware: OrchestrationMiddleware) {
        this.orchestrator = orchestrator;
        this.middleware = middleware;
    }

    /**
     * Initialize the integration with existing backend components
     */
    async initialize(backendComponents: {
        agentZero?: any;
        n8nHandler?: (message: string, sessionId: string) => Promise<any>;
        genericHandler?: (message: string, sessionId: string) => Promise<any>;
    }): Promise<void> {
        console.log('[BackendIntegrationManager] Initializing backend integration...');

        // Register AgentZero if available
        if (backendComponents.agentZero) {
            const agentZeroWrapper = new LegacyAgentZeroWrapper(backendComponents.agentZero);
            this.registerBackend('AgentZero', agentZeroWrapper);
            console.log('[BackendIntegrationManager] Registered AgentZero');
        }

        // Register n8n backend if available
        if (backendComponents.n8nHandler) {
            const n8nWrapper = new GenericBackendWrapper('n8n', backendComponents.n8nHandler);
            this.registerBackend('n8n', n8nWrapper);
            console.log('[BackendIntegrationManager] Registered n8n backend');
        }

        // Register generic backend if available
        if (backendComponents.genericHandler) {
            const genericWrapper = new GenericBackendWrapper('Generic', backendComponents.genericHandler);
            this.registerBackend('Generic', genericWrapper);
            console.log('[BackendIntegrationManager] Registered Generic backend');
        }

        this.isInitialized = true;
        console.log(`[BackendIntegrationManager] Initialized with ${this.registeredBackends.size} backends`);
    }

    /**
     * Register a backend as an agent
     */
    registerBackend(name: string, agent: BaseAgent): void {
        this.registeredBackends.set(name, agent);
        this.orchestrator.registerAgent(agent);
        this.middleware.registerAgent(agent);
        
        console.log(`[BackendIntegrationManager] Registered backend: ${name}`);
    }

    /**
     * Unregister a backend
     */
    unregisterBackend(name: string): boolean {
        const removed = this.registeredBackends.delete(name);
        if (removed) {
            this.orchestrator.unregisterAgent(name);
            this.middleware.unregisterAgent(name);
            console.log(`[BackendIntegrationManager] Unregistered backend: ${name}`);
        }
        return removed;
    }

    /**
     * Create an enhanced chat handler that integrates orchestration
     */
    createEnhancedChatHandler(backend: string) {
        return async (message: string, sessionId: string = 'default') => {
            if (!this.isInitialized) {
                throw new Error('Backend integration not initialized');
            }

            // Get the original backend handler
            const backendAgent = this.registeredBackends.get(backend);
            if (!backendAgent) {
                throw new Error(`Backend '${backend}' not registered`);
            }

            // Create original handler function
            const originalHandler = async (msg: string, sid: string) => {
                const result = await backendAgent.processMessage(msg, sid);
                return {
                    message: result.message,
                    success: result.success,
                    sessionId: result.sessionId,
                    timestamp: result.timestamp,
                    _backend: backend,
                    _agent: backendAgent.getInfo().name
                };
            };

            // Use middleware to handle the request with orchestration
            const result = await this.middleware.handleChatRequest(
                message,
                sessionId,
                backend,
                {} as any, // Mock request object
                {} as any, // Mock response object
                originalHandler
            );

            return result.response;
        };
    }

    /**
     * Get integration status and metrics
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            registeredBackends: Array.from(this.registeredBackends.keys()),
            orchestratorStats: this.orchestrator.getStats(),
            middlewareMetrics: this.middleware.getMetrics(),
            backendCapabilities: Array.from(this.registeredBackends.values()).map(agent => ({
                name: agent.getInfo().name,
                capabilities: agent.getCapabilities(),
                validation: agent.validateConfig()
            }))
        };
    }

    /**
     * Health check for all integrated backends
     */
    async healthCheck(): Promise<any> {
        const backendHealth = [];

        for (const [name, agent] of this.registeredBackends.entries()) {
            try {
                const validation = agent.validateConfig();
                const info = agent.getInfo();
                
                backendHealth.push({
                    name,
                    status: validation.valid ? 'healthy' : 'unhealthy',
                    version: info.version,
                    type: info.type,
                    errors: validation.errors,
                    warnings: validation.warnings
                });
            } catch (error) {
                backendHealth.push({
                    name,
                    status: 'error',
                    error: (error as Error).message
                });
            }
        }

        const middlewareHealth = await this.middleware.healthCheck();

        return {
            integration: {
                status: this.isInitialized ? 'initialized' : 'not-initialized',
                registeredBackends: this.registeredBackends.size
            },
            backends: backendHealth,
            middleware: middlewareHealth,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Cleanup all resources
     */
    async cleanup(): Promise<void> {
        console.log('[BackendIntegrationManager] Cleaning up...');

        // Cleanup all registered backends
        for (const agent of this.registeredBackends.values()) {
            if (agent.cleanup) {
                try {
                    await agent.cleanup();
                } catch (error) {
                    console.warn('[BackendIntegrationManager] Error cleaning up backend:', error);
                }
            }
        }

        this.registeredBackends.clear();
        await this.middleware.cleanup();
        
        this.isInitialized = false;
        console.log('[BackendIntegrationManager] Cleanup completed');
    }
}

/**
 * Factory function to create a complete backend integration setup
 */
export function createBackendIntegration(
    orchestrator: AgentOrchestrator,
    middleware: OrchestrationMiddleware
): BackendIntegrationManager {
    return new BackendIntegrationManager(orchestrator, middleware);
}

/**
 * Helper function to create enhanced handlers for existing backend modes
 */
export function createBackendHandlers(integrationManager: BackendIntegrationManager) {
    return {
        lang: integrationManager.createEnhancedChatHandler('AgentZero'),
        n8n: integrationManager.createEnhancedChatHandler('n8n'),
        generic: integrationManager.createEnhancedChatHandler('Generic')
    };
}