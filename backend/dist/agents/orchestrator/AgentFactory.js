"use strict";
/**
 * Orchestrator Agent Factory
 *
 * Factory class for creating and initializing specialized LLM-powered agents
 * for the orchestrator system. Handles agent creation, validation, and setup
 * while following existing factory patterns.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrchestratorAgentFactory = void 0;
const AnalyticalAgent_1 = require("./AnalyticalAgent");
const CreativeAgent_1 = require("./CreativeAgent");
const TechnicalAgent_1 = require("./TechnicalAgent");
/**
 * Factory for creating orchestrator agent instances
 */
class OrchestratorAgentFactory {
    constructor() {
        this.createdAgents = new Map();
        console.log('[OrchestratorAgentFactory] Factory initialized');
    }
    /**
     * Get singleton instance
     */
    static getInstance() {
        if (!OrchestratorAgentFactory.instance) {
            OrchestratorAgentFactory.instance = new OrchestratorAgentFactory();
        }
        return OrchestratorAgentFactory.instance;
    }
    /**
     * Create all specialized agents for the orchestrator
     * Returns array of properly initialized and validated agents
     */
    static createAllAgents() {
        console.log('[OrchestratorAgentFactory] Creating all specialized agents...');
        const agents = [];
        const errors = [];
        const warnings = [];
        try {
            // Create each specialized agent
            const agentCreators = [
                { name: 'AnalyticalAgent', creator: () => new AnalyticalAgent_1.AnalyticalAgent() },
                { name: 'CreativeAgent', creator: () => new CreativeAgent_1.CreativeAgent() },
                { name: 'TechnicalAgent', creator: () => new TechnicalAgent_1.TechnicalAgent() }
            ];
            for (const { name, creator } of agentCreators) {
                try {
                    console.log(`[OrchestratorAgentFactory] Creating ${name}...`);
                    const agent = creator();
                    // Validate agent configuration
                    const validation = agent.validateConfig();
                    if (!validation.valid) {
                        errors.push(`${name} validation failed: ${validation.errors.join(', ')}`);
                        if (validation.warnings && validation.warnings.length > 0) {
                            warnings.push(`${name} warnings: ${validation.warnings.join(', ')}`);
                        }
                        continue; // Skip this agent but continue with others
                    }
                    // Add any warnings
                    if (validation.warnings && validation.warnings.length > 0) {
                        warnings.push(`${name} warnings: ${validation.warnings.join(', ')}`);
                    }
                    agents.push(agent);
                    console.log(`[OrchestratorAgentFactory] Successfully created ${name}`);
                }
                catch (agentError) {
                    const errorMsg = `Failed to create ${name}: ${agentError.message}`;
                    console.error(`[OrchestratorAgentFactory] ${errorMsg}`);
                    errors.push(errorMsg);
                }
            }
            // Log warnings if any
            if (warnings.length > 0) {
                console.warn(`[OrchestratorAgentFactory] Warnings during agent creation:`, warnings);
            }
            // Check if we have at least one agent
            if (agents.length === 0) {
                throw new Error(`Failed to create any agents. Errors: ${errors.join('; ')}`);
            }
            // Log partial success if some agents failed
            if (errors.length > 0) {
                console.warn(`[OrchestratorAgentFactory] Some agents failed to initialize: ${errors.join('; ')}`);
                console.log(`[OrchestratorAgentFactory] Successfully created ${agents.length} out of ${agentCreators.length} agents`);
            }
            else {
                console.log(`[OrchestratorAgentFactory] Successfully created all ${agents.length} specialized agents`);
            }
            return agents;
        }
        catch (error) {
            console.error('[OrchestratorAgentFactory] Critical error during agent creation:', error);
            throw new Error(`Failed to create orchestrator agents: ${error.message}`);
        }
    }
    /**
     * Create a specific agent by type
     */
    static createAgent(agentType) {
        console.log(`[OrchestratorAgentFactory] Creating specific agent: ${agentType}`);
        let agent;
        switch (agentType.toLowerCase()) {
            case 'analytical':
            case 'analyticalagent':
                agent = new AnalyticalAgent_1.AnalyticalAgent();
                break;
            case 'creative':
            case 'creativeagent':
                agent = new CreativeAgent_1.CreativeAgent();
                break;
            case 'technical':
            case 'technicalagent':
                agent = new TechnicalAgent_1.TechnicalAgent();
                break;
            default:
                throw new Error(`Unknown orchestrator agent type: ${agentType}`);
        }
        // Validate the created agent
        const validation = agent.validateConfig();
        if (!validation.valid) {
            throw new Error(`Agent validation failed for ${agentType}: ${validation.errors.join(', ')}`);
        }
        console.log(`[OrchestratorAgentFactory] Successfully created ${agentType}`);
        return agent;
    }
    /**
     * Get available agent types
     */
    static getAvailableAgentTypes() {
        return ['AnalyticalAgent', 'CreativeAgent', 'TechnicalAgent'];
    }
    /**
     * Check if an agent type is available
     */
    static isAgentTypeAvailable(agentType) {
        const availableTypes = OrchestratorAgentFactory.getAvailableAgentTypes();
        return availableTypes.some(type => type.toLowerCase() === agentType.toLowerCase() ||
            type.toLowerCase().replace('agent', '') === agentType.toLowerCase());
    }
    /**
     * Validate LLM configuration for orchestrator agents
     */
    static validateLLMConfiguration() {
        try {
            // Import and test LLM helper
            const { getLLMHelper } = require('../../../utils/llm-helper');
            const llmHelper = getLLMHelper();
            // Validate LLM configuration
            const validation = llmHelper.validateConfiguration();
            if (!validation.valid) {
                return {
                    valid: false,
                    errors: [`LLM configuration invalid: ${validation.errors.join(', ')}`],
                    warnings: []
                };
            }
            // Get configuration info for additional validation
            const configInfo = llmHelper.getConfigInfo();
            const warnings = [];
            // Check for development vs production settings
            if (configInfo.environment === 'development' && configInfo.temperature > 0.8) {
                warnings.push('High temperature setting detected in development mode');
            }
            if (configInfo.environment === 'production' && configInfo.temperature > 0.5) {
                warnings.push('High temperature setting detected in production mode');
            }
            console.log(`[OrchestratorAgentFactory] LLM configuration valid: ${configInfo.provider} provider, model: ${configInfo.model}`);
            return {
                valid: true,
                errors: [],
                warnings
            };
        }
        catch (error) {
            return {
                valid: false,
                errors: [`LLM configuration validation failed: ${error.message}`],
                warnings: []
            };
        }
    }
    /**
     * Create agents with comprehensive error handling and fallback
     */
    static createAgentsWithFallback() {
        const result = {
            agents: [],
            errors: [],
            warnings: [],
            success: false
        };
        try {
            // First validate LLM configuration
            const llmValidation = OrchestratorAgentFactory.validateLLMConfiguration();
            if (!llmValidation.valid) {
                result.errors.push(...llmValidation.errors);
                return result;
            }
            if (llmValidation.warnings && llmValidation.warnings.length > 0) {
                result.warnings.push(...llmValidation.warnings);
            }
            // Create agents
            result.agents = OrchestratorAgentFactory.createAllAgents();
            result.success = result.agents.length > 0;
            return result;
        }
        catch (error) {
            result.errors.push(`Critical failure in agent creation: ${error.message}`);
            result.success = false;
            return result;
        }
    }
    /**
     * Get factory statistics
     */
    static getFactoryStats() {
        const llmValidation = OrchestratorAgentFactory.validateLLMConfiguration();
        return {
            availableTypes: OrchestratorAgentFactory.getAvailableAgentTypes(),
            supportedAgents: OrchestratorAgentFactory.getAvailableAgentTypes().length,
            llmConfigValid: llmValidation.valid
        };
    }
    /**
     * Reset factory state (useful for testing)
     */
    static reset() {
        OrchestratorAgentFactory.instance = undefined;
        console.log('[OrchestratorAgentFactory] Factory reset');
    }
}
exports.OrchestratorAgentFactory = OrchestratorAgentFactory;
