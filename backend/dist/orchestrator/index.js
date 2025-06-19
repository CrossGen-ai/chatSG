"use strict";
/**
 * Multi-Agent Orchestrator Module
 *
 * This module provides intelligent agent routing and delegation capabilities
 * that work alongside the existing backend routing system.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenericBackendWrapper = exports.LegacyAgentZeroWrapper = exports.createBackendIntegration = exports.BackendIntegrationManager = exports.wrapChatHandler = exports.createOrchestrationMiddleware = exports.OrchestrationMiddleware = exports.OrchestratorFactory = exports.createDefaultOrchestrator = exports.AgentOrchestrator = void 0;
exports.createDevelopmentOrchestrator = createDevelopmentOrchestrator;
exports.createProductionOrchestrator = createProductionOrchestrator;
exports.createOrchestrationSetup = createOrchestrationSetup;
// Core orchestrator exports
var AgentOrchestrator_1 = require("./AgentOrchestrator");
Object.defineProperty(exports, "AgentOrchestrator", { enumerable: true, get: function () { return AgentOrchestrator_1.AgentOrchestrator; } });
Object.defineProperty(exports, "createDefaultOrchestrator", { enumerable: true, get: function () { return AgentOrchestrator_1.createDefaultOrchestrator; } });
Object.defineProperty(exports, "OrchestratorFactory", { enumerable: true, get: function () { return AgentOrchestrator_1.OrchestratorFactory; } });
// Middleware exports
var OrchestrationMiddleware_1 = require("./OrchestrationMiddleware");
Object.defineProperty(exports, "OrchestrationMiddleware", { enumerable: true, get: function () { return OrchestrationMiddleware_1.OrchestrationMiddleware; } });
Object.defineProperty(exports, "createOrchestrationMiddleware", { enumerable: true, get: function () { return OrchestrationMiddleware_1.createOrchestrationMiddleware; } });
Object.defineProperty(exports, "wrapChatHandler", { enumerable: true, get: function () { return OrchestrationMiddleware_1.wrapChatHandler; } });
// Backend integration exports
var BackendIntegration_1 = require("./BackendIntegration");
Object.defineProperty(exports, "BackendIntegrationManager", { enumerable: true, get: function () { return BackendIntegration_1.BackendIntegrationManager; } });
Object.defineProperty(exports, "createBackendIntegration", { enumerable: true, get: function () { return BackendIntegration_1.createBackendIntegration; } });
Object.defineProperty(exports, "LegacyAgentZeroWrapper", { enumerable: true, get: function () { return BackendIntegration_1.LegacyAgentZeroWrapper; } });
Object.defineProperty(exports, "GenericBackendWrapper", { enumerable: true, get: function () { return BackendIntegration_1.GenericBackendWrapper; } });
const OrchestrationMiddleware_2 = require("./OrchestrationMiddleware");
/**
 * Quick setup function for development
 */
function createDevelopmentOrchestrator() {
    const { OrchestratorFactory: Factory } = require('./AgentOrchestrator');
    return Factory.createDevelopmentOrchestrator();
}
/**
 * Quick setup function for production
 */
function createProductionOrchestrator() {
    const { OrchestratorFactory: Factory } = require('./AgentOrchestrator');
    return Factory.createProductionOrchestrator();
}
/**
 * Create a complete orchestration setup with middleware
 */
function createOrchestrationSetup(environment = 'development') {
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
    const middleware = (0, OrchestrationMiddleware_2.createOrchestrationMiddleware)(orchestrator, {
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
