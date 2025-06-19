/**
 * Agent Factory
 * 
 * Factory class for creating and initializing agents consistently.
 * Provides centralized agent creation with configuration management.
 */

import { BaseAgent, AgentFactory as IAgentFactory } from './BaseAgent';
import { AgentRegistry } from './AgentRegistry';
import { ValidationResult } from '../types';

/**
 * Factory for creating agent instances
 */
export class AgentFactory implements IAgentFactory {
    private static instance: AgentFactory;
    private registry: AgentRegistry;
    private agentConfigs: Map<string, any> = new Map();

    private constructor() {
        this.registry = AgentRegistry.getInstance();
        console.log('[AgentFactory] Factory initialized');
    }

    /**
     * Get singleton instance
     */
    public static getInstance(): AgentFactory {
        if (!AgentFactory.instance) {
            AgentFactory.instance = new AgentFactory();
        }
        return AgentFactory.instance;
    }

    /**
     * Create an agent instance
     */
    async createAgent(name: string, config?: any): Promise<BaseAgent> {
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
        let agent: BaseAgent;

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
    getAvailableAgents(): string[] {
        const registeredAgents = this.registry.getAvailableAgents();
        const factoryAgents = ['AgentZero', 'AgentRouter'];
        
        // Combine and deduplicate
        const allAgents = [...new Set([...registeredAgents, ...factoryAgents])];
        return allAgents;
    }

    /**
     * Check if an agent type is available
     */
    isAgentAvailable(name: string): boolean {
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
    private async createAgentZero(config?: any): Promise<BaseAgent> {
        try {
            const { AgentZeroWrapper } = await import('./wrappers/AgentZeroWrapper');
            return new AgentZeroWrapper();
        } catch (error) {
            console.error('[AgentFactory] Failed to create AgentZero:', error);
            throw new Error(`Failed to create AgentZero: ${(error as Error).message}`);
        }
    }

    /**
     * Create AgentRouter instance
     */
    private async createAgentRouter(config?: any): Promise<BaseAgent> {
        try {
            const { AgentRouterWrapper } = await import('./wrappers/AgentRouterWrapper');
            return new AgentRouterWrapper();
        } catch (error) {
            console.error('[AgentFactory] Failed to create AgentRouter:', error);
            throw new Error(`Failed to create AgentRouter: ${(error as Error).message}`);
        }
    }

    /**
     * Set configuration for an agent type
     */
    setAgentConfig(agentType: string, config: any): void {
        this.agentConfigs.set(agentType, config);
        console.log(`[AgentFactory] Set configuration for agent type: ${agentType}`);
    }

    /**
     * Get configuration for an agent type
     */
    getAgentConfig(agentType: string): any {
        return this.agentConfigs.get(agentType) || null;
    }

    /**
     * Validate agent configuration before creation
     */
    validateAgentConfig(agentType: string, config: any): ValidationResult {
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
        } catch (error) {
            return {
                valid: false,
                errors: [`Configuration validation failed: ${(error as Error).message}`],
                warnings: []
            };
        }
    }

    /**
     * Create multiple agents at once
     */
    async createAgents(specs: Array<{ name: string; type: string; config?: any }>): Promise<Map<string, BaseAgent>> {
        const agents = new Map<string, BaseAgent>();
        const errors: string[] = [];

        for (const spec of specs) {
            try {
                const agent = await this.createAgent(spec.type, spec.config);
                agents.set(spec.name, agent);
                console.log(`[AgentFactory] Created agent "${spec.name}" of type "${spec.type}"`);
            } catch (error) {
                const errorMsg = `Failed to create agent "${spec.name}": ${(error as Error).message}`;
                errors.push(errorMsg);
                console.error(`[AgentFactory] ${errorMsg}`);
            }
        }

        if (errors.length > 0) {
            console.warn(`[AgentFactory] Created ${agents.size} agents with ${errors.length} errors:`, errors);
        } else {
            console.log(`[AgentFactory] Successfully created all ${agents.size} agents`);
        }

        return agents;
    }

    /**
     * Get factory statistics
     */
    getStats(): {
        availableTypes: string[];
        registeredAgents: number;
        configuredTypes: string[];
    } {
        return {
            availableTypes: this.getAvailableAgents(),
            registeredAgents: this.registry.getAvailableAgents().length,
            configuredTypes: Array.from(this.agentConfigs.keys())
        };
    }

    /**
     * Reset factory state
     */
    async reset(): Promise<void> {
        console.log('[AgentFactory] Resetting factory state...');
        this.agentConfigs.clear();
        await this.registry.clear();
        console.log('[AgentFactory] Factory reset completed');
    }
} 