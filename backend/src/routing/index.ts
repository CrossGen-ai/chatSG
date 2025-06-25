/**
 * Multi-Agent Orchestrator Module
 * 
 * This module provides intelligent agent routing and delegation capabilities
 * that work alongside the existing backend routing system.
 */

// Core orchestrator exports
export { 
    AgentOrchestrator, 
    createDefaultOrchestrator, 
    OrchestratorFactory 
} from './AgentOrchestrator';

// Middleware exports
export { 
    OrchestrationMiddleware, 
    createOrchestrationMiddleware,
    wrapChatHandler 
} from './OrchestrationMiddleware';

// Backend integration exports
export {
    BackendIntegrationManager,
    createBackendIntegration,
    GenericBackendWrapper
} from './BackendIntegration';

// Re-export relevant types from types module
export type {
    AgentOrchestrator as IAgentOrchestrator,
    OrchestrationContext,
    AgentSelection,
    Task,
    TaskResult,
    HandoffContext,
    HandoffResult
} from '../types';

// Import dependencies for setup functions
import { OrchestratorFactory, createDefaultOrchestrator } from './AgentOrchestrator';
import { createOrchestrationMiddleware } from './OrchestrationMiddleware';

/**
 * Quick setup function for development
 */
export function createDevelopmentOrchestrator() {
    const { OrchestratorFactory: Factory } = require('./AgentOrchestrator');
    return Factory.createDevelopmentOrchestrator();
}

/**
 * Quick setup function for production
 */
export function createProductionOrchestrator() {
    const { OrchestratorFactory: Factory } = require('./AgentOrchestrator');
    return Factory.createProductionOrchestrator();
}

/**
 * Create a complete orchestration setup with middleware
 */
export function createOrchestrationSetup(environment: 'development' | 'production' | 'lightweight' = 'development') {
    const { OrchestratorFactory: Factory } = require('./AgentOrchestrator');
    let orchestrator;
    
    switch (environment) {
        case 'production':
            orchestrator = Factory.createProductionOrchestrator();
            break;
        case 'lightweight':
            orchestrator = Factory.createLightweightOrchestrator();
            break;
        default:
            orchestrator = Factory.createDevelopmentOrchestrator();
            break;
    }

    const middleware = createOrchestrationMiddleware(orchestrator, {
        enableOrchestration: true,
        preserveBackendRouting: true,
        orchestrationMode: environment === 'production' ? 'parallel' : 'enhanced',
        enableLogging: environment !== 'production',
        enableMetrics: true
    });

    return {
        orchestrator,
        middleware,
        environment
    };
}

/**
 * Routing Module Exports
 * 
 * Central export point for all routing and orchestration components.
 * Provides agent orchestration, backend integration, and middleware.
 */

export { LazyOrchestrator, createLazyOrchestrator, createDevelopmentLazyOrchestrator, createProductionLazyOrchestrator } from './LazyOrchestrator';
export { BackendIntegrationManager } from './BackendIntegration';
export { OrchestrationMiddleware } from './OrchestrationMiddleware';

// Export types
export type {
    OrchestrationContext,
    AgentSelection,
    Task,
    TaskResult,
    HandoffContext,
    HandoffResult
} from '../types'; 