/**
 * Shared Agent Utilities Exports
 * 
 * Export point for shared tools, memory utilities, and common components
 * that can be used across all agents and agencies.
 */

// Shared tools
export * from './tools';

// Shared memory
export * from './memory';

// Shared utilities registry for discovery
export const SHARED_UTILITIES_REGISTRY = {
  tools: ['web-search', 'enhanced-file-manager', 'database'],
  memory: ['embedding-service', 'memory-factory'],
  ui: [] // Will be populated when UI components are added
};

export default SHARED_UTILITIES_REGISTRY; 