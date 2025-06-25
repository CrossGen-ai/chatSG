/**
 * Core Agent Infrastructure Exports
 * 
 * Central export point for all core agent components.
 * Provides clean imports for agent functionality.
 */

// Core interfaces and base classes
export * from './BaseAgent';

// Factory and registry components
export * from './AgentFactory';
export * from './AgentRegistry';

// Convenience re-exports for common usage patterns
export { AgentFactory } from './AgentFactory';
export { AgentRegistry } from './AgentRegistry';
export type { BaseAgent, AgentMetadata, AgentFactory as IAgentFactory } from './BaseAgent'; 