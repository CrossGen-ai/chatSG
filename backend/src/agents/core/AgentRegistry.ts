/**
 * Agent Registry
 * 
 * Centralized registry for agent discovery, registration, and management.
 * Reuses caching patterns from AgentRouter for optimal performance.
 */

import { BaseAgent, AgentMetadata } from './BaseAgent';
import { AgentCapabilities } from '../../types';

/**
 * Registry for managing agents in the system
 */
export class AgentRegistry {
    private static instance: AgentRegistry;
    private agents: Map<string, BaseAgent> = new Map();
    private metadata: Map<string, AgentMetadata> = new Map();
    private agentCache: Map<string, any> = new Map(); // Reuse AgentRouter caching pattern
    private initialized: boolean = false;

    private constructor() {
        console.log('[AgentRegistry] Initializing agent registry');
    }

    /**
     * Get singleton instance
     */
    public static getInstance(): AgentRegistry {
        if (!AgentRegistry.instance) {
            AgentRegistry.instance = new AgentRegistry();
        }
        return AgentRegistry.instance;
    }

    /**
     * Initialize the registry and discover available agents
     */
    public async initialize(): Promise<void> {
        if (this.initialized) {
            console.log('[AgentRegistry] Already initialized');
            return;
        }

        console.log('[AgentRegistry] Starting agent discovery...');

        try {
            // Discover legacy agents (AgentRouter only - AgentZero removed)
            await this.discoverLegacyAgents();

            // Discover new TypeScript agents
            await this.discoverTypescriptAgents();

            this.initialized = true;
            console.log(`[AgentRegistry] Initialized with ${this.agents.size} agents`);
        } catch (error) {
            console.error('[AgentRegistry] Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Register an agent instance
     */
    public registerAgent(name: string, agent: BaseAgent, metadata?: Partial<AgentMetadata>): void {
        console.log(`[AgentRegistry] Registering agent: ${name}`);

        this.agents.set(name, agent);

        // Create metadata from agent info and provided metadata
        const agentInfo = agent.getInfo();
        const capabilities = agent.getCapabilities();

        const fullMetadata: AgentMetadata = {
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
    public getAgent(name: string): BaseAgent | null {
        return this.agents.get(name) || null;
    }

    /**
     * Get all registered agents
     */
    public getAllAgents(): Map<string, BaseAgent> {
        return new Map(this.agents);
    }

    /**
     * Get agent metadata
     */
    public getAgentMetadata(name: string): AgentMetadata | null {
        return this.metadata.get(name) || null;
    }

    /**
     * Get all agent metadata
     */
    public getAllMetadata(): Map<string, AgentMetadata> {
        return new Map(this.metadata);
    }

    /**
     * Check if an agent is registered
     */
    public hasAgent(name: string): boolean {
        return this.agents.has(name);
    }

    /**
     * Get available agent names
     */
    public getAvailableAgents(): string[] {
        return Array.from(this.agents.keys());
    }

    /**
     * Find agents by capability
     */
    public findAgentsByCapability(capability: keyof AgentCapabilities): string[] {
        const results: string[] = [];

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
    public findAgentsByType(type: string): string[] {
        const results: string[] = [];

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
    public async unregisterAgent(name: string): Promise<boolean> {
        const agent = this.agents.get(name);
        if (!agent) {
            return false;
        }

        // Cleanup agent if it supports cleanup
        if (agent.cleanup) {
            try {
                await agent.cleanup();
            } catch (error) {
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
    public async clear(): Promise<void> {
        console.log('[AgentRegistry] Clearing all agents...');

        // Cleanup all agents
        for (const [name, agent] of this.agents.entries()) {
            if (agent.cleanup) {
                try {
                    await agent.cleanup();
                } catch (error) {
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
    public getStats(): {
        totalAgents: number;
        agentsByType: Record<string, number>;
        legacyAgents: number;
        typescriptAgents: number;
    } {
        const stats = {
            totalAgents: this.agents.size,
            agentsByType: {} as Record<string, number>,
            legacyAgents: 0,
            typescriptAgents: 0
        };

        for (const metadata of this.metadata.values()) {
            // Count by type
            stats.agentsByType[metadata.type] = (stats.agentsByType[metadata.type] || 0) + 1;

            // Count legacy vs TypeScript
            if (metadata.isLegacy) {
                stats.legacyAgents++;
            } else {
                stats.typescriptAgents++;
            }
        }

        return stats;
    }

    /**
     * Legacy agent discovery removed - AgentRouter wrapper no longer available
     */
    private async discoverLegacyAgents(): Promise<void> {
        console.log('[AgentRegistry] Legacy agent discovery disabled - use orchestration system instead');
        // AgentRouter wrapper removed - orchestration system provides intelligent routing
    }

    /**
     * Discover TypeScript agents in the agents directory
     */
    private async discoverTypescriptAgents(): Promise<void> {
        console.log('[AgentRegistry] Discovering TypeScript agents...');

        // For now, we'll implement a simple discovery mechanism
        // In the future, this could scan the agents directory for TypeScript files
        // and automatically register them based on naming conventions

        try {
            // This is where we would dynamically discover and load TypeScript agents
            // For now, we'll implement this as a placeholder
            console.log('[AgentRegistry] TypeScript agent discovery completed (placeholder)');
        } catch (error) {
            console.warn('[AgentRegistry] Error discovering TypeScript agents:', error);
        }
    }

    /**
     * Cache management methods (following AgentRouter patterns)
     */
    public clearCache(agentName?: string): void {
        if (agentName) {
            this.agentCache.delete(agentName);
            console.log(`[AgentRegistry] Cleared cache for agent: ${agentName}`);
        } else {
            this.agentCache.clear();
            console.log('[AgentRegistry] Cleared all agent cache');
        }
    }

    public getCacheInfo(): { size: number; keys: string[] } {
        return {
            size: this.agentCache.size,
            keys: Array.from(this.agentCache.keys())
        };
    }
} 