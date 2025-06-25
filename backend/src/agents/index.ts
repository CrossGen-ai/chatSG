/**
 * Agent System Exports
 * 
 * Central export point for all agent-related components.
 * Provides a clean API for importing agent functionality.
 */

// Core interfaces and types (now from core/)
export * from './core/BaseAgent';

// Registry and factory (now from core/)
export { AgentRegistry } from './core/AgentRegistry';
export { AgentFactory } from './core/AgentFactory';

// Re-export all core components for convenience
export * from './core';

// Wrapper classes removed - orchestration system works independently

// Import for internal use
import { AgentRegistry } from './core/AgentRegistry';
import { AgentFactory } from './core/AgentFactory';

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