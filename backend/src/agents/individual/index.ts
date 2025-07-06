/**
 * Individual Agents Exports
 * 
 * Export point for all individual autonomous agents.
 * Each agent is self-contained with its own tools, memory, config, and UI.
 */

// Individual agents will be exported here as they are created
// Example: export { AnalyticalAgent } from './analytical/agent';
// Example: export { CreativeAgent } from './creative/agent';
// Example: export { TechnicalAgent } from './technical/agent';

// Placeholder for future individual agents
export const INDIVIDUAL_AGENTS_REGISTRY = {
  // Will be populated as agents are added
};

export default INDIVIDUAL_AGENTS_REGISTRY;

export { AnalyticalAgent } from './analytical/agent';
export { CreativeAgent } from './creative/agent';
export { TechnicalAgent } from './technical/agent';
export { IndividualAgentFactory } from './IndividualAgentFactory';
export { LazyAgentManager } from './LazyAgentManager';
export type { AgentSelectionResult, CacheStats } from './LazyAgentManager';
export { FinancialAgent } from './financial/agent';
