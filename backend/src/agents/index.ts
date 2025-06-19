/**
 * Agent System Exports
 * 
 * Central export point for all agent-related components.
 * Provides a clean API for importing agent functionality.
 */

// Core interfaces and types
export * from './BaseAgent';

// Registry and factory
export { AgentRegistry } from './AgentRegistry';
export { AgentFactory } from './AgentFactory';

// Wrapper classes
export { AgentZeroWrapper } from './wrappers/AgentZeroWrapper';
export { AgentRouterWrapper } from './wrappers/AgentRouterWrapper';

// Import for internal use
import { AgentRegistry } from './AgentRegistry';
import { AgentFactory } from './AgentFactory';

// Convenience functions
export const getAgentRegistry = () => AgentRegistry.getInstance();
export const getAgentFactory = () => AgentFactory.getInstance();

/**
 * Initialize the agent system
 * @returns Promise that resolves when the system is ready
 */
export async function initializeAgentSystem(): Promise<void> {
    console.log('[AgentSystem] Initializing agent system...');
    
    const registry = getAgentRegistry();
    await registry.initialize();
    
    const factory = getAgentFactory();
    
    console.log('[AgentSystem] Agent system initialized successfully');
    console.log(`[AgentSystem] Available agents: ${registry.getAvailableAgents().join(', ')}`);
}

/**
 * Get system statistics
 * @returns Object containing system statistics
 */
export function getSystemStats(): {
    registry: any;
    factory: any;
} {
    const registry = getAgentRegistry();
    const factory = getAgentFactory();
    
    return {
        registry: registry.getStats(),
        factory: factory.getStats()
    };
} 