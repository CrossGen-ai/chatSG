"use strict";
/**
 * Agent Factory
 *
 * Factory class for creating and initializing agents consistently.
 * Provides centralized agent creation with configuration management.
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
exports.AgentFactory = void 0;
const AgentRegistry_1 = require("./AgentRegistry");
/**
 * Factory for creating agent instances
 */
class AgentFactory {
    constructor() {
        this.agentConfigs = new Map();
        this.registry = AgentRegistry_1.AgentRegistry.getInstance();
        console.log('[AgentFactory] Factory initialized');
    }
    /**
     * Get singleton instance
     */
    static getInstance() {
        if (!AgentFactory.instance) {
            AgentFactory.instance = new AgentFactory();
        }
        return AgentFactory.instance;
    }
    /**
     * Create an agent instance
     */
    async createAgent(name, config) {
        console.log(`[AgentFactory] Creating agent: ${name}`);
        // Ensure registry is initialized
        await this.registry.initialize();
        // Check if agent is already registered
        const existingAgent = this.registry.getAgent(name);
        if (existingAgent) {
            console.log(`[AgentFactory] Returning existing agent: ${name}`);
            return existingAgent;
        }
        // Try to create new agent based on name
        let agent;
        switch (name.toLowerCase()) {
            case 'agentzero':
                agent = await this.createAgentZero(config);
                break;
            case 'agentrouter':
                agent = await this.createAgentRouter(config);
                break;
            default:
                throw new Error(`Unknown agent type: ${name}`);
        }
        // Validate agent configuration
        const validation = agent.validateConfig();
        if (!validation.valid) {
            throw new Error(`Agent configuration invalid: ${validation.errors.join(', ')}`);
        }
        // Initialize agent if it supports initialization
        if (agent.initialize) {
            await agent.initialize(config);
        }
        // Register the created agent
        this.registry.registerAgent(name, agent);
        console.log(`[AgentFactory] Successfully created and registered agent: ${name}`);
        return agent;
    }
    /**
     * Get available agent types
     */
    getAvailableAgents() {
        const registeredAgents = this.registry.getAvailableAgents();
        const factoryAgents = ['AgentZero', 'AgentRouter'];
        // Combine and deduplicate
        const allAgents = [...new Set([...registeredAgents, ...factoryAgents])];
        return allAgents;
    }
    /**
     * Check if an agent type is available
     */
    isAgentAvailable(name) {
        // Check if already registered
        if (this.registry.hasAgent(name)) {
            return true;
        }
        // Check if can be created
        const lowerName = name.toLowerCase();
        return lowerName === 'agentzero' || lowerName === 'agentrouter';
    }
    /**
     * Create AgentZero instance
     */
    async createAgentZero(config) {
        try {
            const { AgentZeroWrapper } = await Promise.resolve().then(() => __importStar(require('./wrappers/AgentZeroWrapper')));
            return new AgentZeroWrapper();
        }
        catch (error) {
            console.error('[AgentFactory] Failed to create AgentZero:', error);
            throw new Error(`Failed to create AgentZero: ${error.message}`);
        }
    }
    /**
     * Create AgentRouter instance
     */
    async createAgentRouter(config) {
        try {
            const { AgentRouterWrapper } = await Promise.resolve().then(() => __importStar(require('./wrappers/AgentRouterWrapper')));
            return new AgentRouterWrapper();
        }
        catch (error) {
            console.error('[AgentFactory] Failed to create AgentRouter:', error);
            throw new Error(`Failed to create AgentRouter: ${error.message}`);
        }
    }
    /**
     * Set configuration for an agent type
     */
    setAgentConfig(agentType, config) {
        this.agentConfigs.set(agentType, config);
        console.log(`[AgentFactory] Set configuration for agent type: ${agentType}`);
    }
    /**
     * Get configuration for an agent type
     */
    getAgentConfig(agentType) {
        return this.agentConfigs.get(agentType) || null;
    }
    /**
     * Validate agent configuration before creation
     */
    validateAgentConfig(agentType, config) {
        try {
            // Basic validation - can be extended
            if (!agentType || typeof agentType !== 'string') {
                return {
                    valid: false,
                    errors: ['Agent type must be a non-empty string'],
                    warnings: []
                };
            }
            if (!this.isAgentAvailable(agentType)) {
                return {
                    valid: false,
                    errors: [`Agent type "${agentType}" is not available`],
                    warnings: []
                };
            }
            return {
                valid: true,
                errors: [],
                warnings: []
            };
        }
        catch (error) {
            return {
                valid: false,
                errors: [`Configuration validation failed: ${error.message}`],
                warnings: []
            };
        }
    }
    /**
     * Create multiple agents at once
     */
    async createAgents(specs) {
        const agents = new Map();
        const errors = [];
        for (const spec of specs) {
            try {
                const agent = await this.createAgent(spec.type, spec.config);
                agents.set(spec.name, agent);
                console.log(`[AgentFactory] Created agent "${spec.name}" of type "${spec.type}"`);
            }
            catch (error) {
                const errorMsg = `Failed to create agent "${spec.name}": ${error.message}`;
                errors.push(errorMsg);
                console.error(`[AgentFactory] ${errorMsg}`);
            }
        }
        if (errors.length > 0) {
            console.warn(`[AgentFactory] Created ${agents.size} agents with ${errors.length} errors:`, errors);
        }
        else {
            console.log(`[AgentFactory] Successfully created all ${agents.size} agents`);
        }
        return agents;
    }
    /**
     * Get factory statistics
     */
    getStats() {
        return {
            availableTypes: this.getAvailableAgents(),
            registeredAgents: this.registry.getAvailableAgents().length,
            configuredTypes: Array.from(this.agentConfigs.keys())
        };
    }
    /**
     * Reset factory state
     */
    async reset() {
        console.log('[AgentFactory] Resetting factory state...');
        this.agentConfigs.clear();
        await this.registry.clear();
        console.log('[AgentFactory] Factory reset completed');
    }
}
exports.AgentFactory = AgentFactory;
//# sourceMappingURL=AgentFactory.js.map