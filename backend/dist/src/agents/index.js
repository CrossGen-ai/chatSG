"use strict";
/**
 * Agent System Exports
 *
 * Central export point for all agent-related components.
 * Provides a clean API for importing agent functionality.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAgentFactory = exports.getAgentRegistry = exports.AgentRouterWrapper = exports.AgentZeroWrapper = exports.AgentFactory = exports.AgentRegistry = void 0;
exports.initializeAgentSystem = initializeAgentSystem;
exports.getSystemStats = getSystemStats;
// Core interfaces and types
__exportStar(require("./BaseAgent"), exports);
// Registry and factory
var AgentRegistry_1 = require("./AgentRegistry");
Object.defineProperty(exports, "AgentRegistry", { enumerable: true, get: function () { return AgentRegistry_1.AgentRegistry; } });
var AgentFactory_1 = require("./AgentFactory");
Object.defineProperty(exports, "AgentFactory", { enumerable: true, get: function () { return AgentFactory_1.AgentFactory; } });
// Wrapper classes
var AgentZeroWrapper_1 = require("./wrappers/AgentZeroWrapper");
Object.defineProperty(exports, "AgentZeroWrapper", { enumerable: true, get: function () { return AgentZeroWrapper_1.AgentZeroWrapper; } });
var AgentRouterWrapper_1 = require("./wrappers/AgentRouterWrapper");
Object.defineProperty(exports, "AgentRouterWrapper", { enumerable: true, get: function () { return AgentRouterWrapper_1.AgentRouterWrapper; } });
// Import for internal use
const AgentRegistry_2 = require("./AgentRegistry");
const AgentFactory_2 = require("./AgentFactory");
// Convenience functions
const getAgentRegistry = () => AgentRegistry_2.AgentRegistry.getInstance();
exports.getAgentRegistry = getAgentRegistry;
const getAgentFactory = () => AgentFactory_2.AgentFactory.getInstance();
exports.getAgentFactory = getAgentFactory;
/**
 * Initialize the agent system
 * @returns Promise that resolves when the system is ready
 */
async function initializeAgentSystem() {
    console.log('[AgentSystem] Initializing agent system...');
    const registry = (0, exports.getAgentRegistry)();
    await registry.initialize();
    const factory = (0, exports.getAgentFactory)();
    console.log('[AgentSystem] Agent system initialized successfully');
    console.log(`[AgentSystem] Available agents: ${registry.getAvailableAgents().join(', ')}`);
}
/**
 * Get system statistics
 * @returns Object containing system statistics
 */
function getSystemStats() {
    const registry = (0, exports.getAgentRegistry)();
    const factory = (0, exports.getAgentFactory)();
    return {
        registry: registry.getStats(),
        factory: factory.getStats()
    };
}
//# sourceMappingURL=index.js.map