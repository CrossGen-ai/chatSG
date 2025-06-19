"use strict";
/**
 * Agent Registry
 *
 * Centralized registry for agent discovery, registration, and management.
 * Reuses caching patterns from AgentRouter for optimal performance.
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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentRegistry = void 0;
/**
 * Registry for managing agents in the system
 */
class AgentRegistry {
    constructor() {
        this.agents = new Map();
        this.metadata = new Map();
        this.agentCache = new Map(); // Reuse AgentRouter caching pattern
        this.initialized = false;
        console.log('[AgentRegistry] Initializing agent registry');
    }
    /**
     * Get singleton instance
     */
    static getInstance() {
        if (!AgentRegistry.instance) {
            AgentRegistry.instance = new AgentRegistry();
        }
        return AgentRegistry.instance;
    }
    /**
     * Initialize the registry and discover available agents
     */
    async initialize() {
        if (this.initialized) {
            console.log('[AgentRegistry] Already initialized');
            return;
        }
        console.log('[AgentRegistry] Starting agent discovery...');
        try {
            // Discover legacy agents (AgentZero, AgentRouter)
            await this.discoverLegacyAgents();
            // Discover new TypeScript agents
            await this.discoverTypescriptAgents();
            this.initialized = true;
            console.log(`[AgentRegistry] Initialized with ${this.agents.size} agents`);
        }
        catch (error) {
            console.error('[AgentRegistry] Initialization failed:', error);
            throw error;
        }
    }
    /**
     * Register an agent instance
     */
    registerAgent(name, agent, metadata) {
        console.log(`[AgentRegistry] Registering agent: ${name}`);
        this.agents.set(name, agent);
        // Create metadata from agent info and provided metadata
        const agentInfo = agent.getInfo();
        const capabilities = agent.getCapabilities();
        const fullMetadata = {
            name: agentInfo.name,
            version: agentInfo.version,
            description: agentInfo.description,
            type: agentInfo.type,
            capabilities,
            ...metadata
        };
        this.metadata.set(name, fullMetadata);
        console.log(`[AgentRegistry] Registered agent: ${name} (type: ${fullMetadata.type})`);
    }
    /**
     * Get an agent by name
     */
    getAgent(name) {
        return this.agents.get(name) || null;
    }
    /**
     * Get all registered agents
     */
    getAllAgents() {
        return new Map(this.agents);
    }
    /**
     * Get agent metadata
     */
    getAgentMetadata(name) {
        return this.metadata.get(name) || null;
    }
    /**
     * Get all agent metadata
     */
    getAllMetadata() {
        return new Map(this.metadata);
    }
    /**
     * Check if an agent is registered
     */
    hasAgent(name) {
        return this.agents.has(name);
    }
    /**
     * Get available agent names
     */
    getAvailableAgents() {
        return Array.from(this.agents.keys());
    }
    /**
     * Find agents by capability
     */
    findAgentsByCapability(capability) {
        const results = [];
        for (const [name, metadata] of this.metadata.entries()) {
            if (metadata.capabilities[capability]) {
                results.push(name);
            }
        }
        return results;
    }
    /**
     * Find agents by type
     */
    findAgentsByType(type) {
        const results = [];
        for (const [name, metadata] of this.metadata.entries()) {
            if (metadata.type === type) {
                results.push(name);
            }
        }
        return results;
    }
    /**
     * Unregister an agent
     */
    async unregisterAgent(name) {
        const agent = this.agents.get(name);
        if (!agent) {
            return false;
        }
        // Cleanup agent if it supports cleanup
        if (agent.cleanup) {
            try {
                await agent.cleanup();
            }
            catch (error) {
                console.warn(`[AgentRegistry] Error cleaning up agent ${name}:`, error);
            }
        }
        this.agents.delete(name);
        this.metadata.delete(name);
        this.agentCache.delete(name); // Clear cache entry
        console.log(`[AgentRegistry] Unregistered agent: ${name}`);
        return true;
    }
    /**
     * Clear all agents and reset registry
     */
    async clear() {
        console.log('[AgentRegistry] Clearing all agents...');
        // Cleanup all agents
        for (const [name, agent] of this.agents.entries()) {
            if (agent.cleanup) {
                try {
                    await agent.cleanup();
                }
                catch (error) {
                    console.warn(`[AgentRegistry] Error cleaning up agent ${name}:`, error);
                }
            }
        }
        this.agents.clear();
        this.metadata.clear();
        this.agentCache.clear();
        this.initialized = false;
        console.log('[AgentRegistry] Registry cleared');
    }
    /**
     * Get registry statistics
     */
    getStats() {
        const stats = {
            totalAgents: this.agents.size,
            agentsByType: {},
            legacyAgents: 0,
            typescriptAgents: 0
        };
        for (const metadata of this.metadata.values()) {
            // Count by type
            stats.agentsByType[metadata.type] = (stats.agentsByType[metadata.type] || 0) + 1;
            // Count legacy vs TypeScript
            if (metadata.isLegacy) {
                stats.legacyAgents++;
            }
            else {
                stats.typescriptAgents++;
            }
        }
        return stats;
    }
    /**
     * Discover legacy JavaScript agents (AgentZero, AgentRouter)
     */
    async discoverLegacyAgents() {
        console.log('[AgentRegistry] Discovering legacy agents...');
        try {
            // Import wrapper classes for legacy agents
            const { AgentZeroWrapper } = await Promise.resolve().then(() => __importStar(require('./wrappers/AgentZeroWrapper')));
            const { AgentRouterWrapper } = await Promise.resolve().then(() => __importStar(require('./wrappers/AgentRouterWrapper')));
            // Register AgentZero
            try {
                const agentZero = new AgentZeroWrapper();
                this.registerAgent('AgentZero', agentZero, {
                    modulePath: '../../agent/AgentZero/agent.js',
                    isLegacy: true
                });
            }
            catch (error) {
                console.warn('[AgentRegistry] Failed to register AgentZero:', error.message);
            }
            // Register AgentRouter
            try {
                const agentRouter = new AgentRouterWrapper();
                this.registerAgent('AgentRouter', agentRouter, {
                    modulePath: '../../agent/AgentRouter/agent.js',
                    isLegacy: true
                });
            }
            catch (error) {
                console.warn('[AgentRegistry] Failed to register AgentRouter:', error.message);
            }
        }
        catch (error) {
            console.warn('[AgentRegistry] Error discovering legacy agents:', error);
        }
    }
    /**
     * Discover TypeScript agents in the agents directory
     */
    async discoverTypescriptAgents() {
        console.log('[AgentRegistry] Discovering TypeScript agents...');
        // For now, we'll implement a simple discovery mechanism
        // In the future, this could scan the agents directory for TypeScript files
        // and automatically register them based on naming conventions
        try {
            // This is where we would dynamically discover and load TypeScript agents
            // For now, we'll implement this as a placeholder
            console.log('[AgentRegistry] TypeScript agent discovery completed (placeholder)');
        }
        catch (error) {
            console.warn('[AgentRegistry] Error discovering TypeScript agents:', error);
        }
    }
    /**
     * Cache management methods (following AgentRouter patterns)
     */
    clearCache(agentName) {
        if (agentName) {
            this.agentCache.delete(agentName);
            console.log(`[AgentRegistry] Cleared cache for agent: ${agentName}`);
        }
        else {
            this.agentCache.clear();
            console.log('[AgentRegistry] Cleared all agent cache');
        }
    }
    getCacheInfo() {
        return {
            size: this.agentCache.size,
            keys: Array.from(this.agentCache.keys())
        };
    }
}
exports.AgentRegistry = AgentRegistry;
