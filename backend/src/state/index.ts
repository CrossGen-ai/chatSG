/**
 * State Management System
 * 
 * Comprehensive state management that enables controlled data sharing
 * between agents while maintaining session isolation.
 */

// Core interfaces
export * from './interfaces';

// Main state manager
export { StateManager, getStateManager, initializeStateManager } from './StateManager';

// Persistence implementations
export { MemoryPersistence } from './persistence/MemoryPersistence';
export { FilePersistence } from './persistence/FilePersistence';

// Utility functions
export { createStateContext, validateStatePermissions } from './utils';

/**
 * Default state configuration
 */
export const DEFAULT_STATE_CONFIG = {
    defaultTTL: 24 * 60 * 60 * 1000, // 24 hours
    maxSessions: 1000,
    maxSharedStates: 10000,
    enablePersistence: true,
    enableEvents: true,
    cleanupInterval: 5 * 60 * 1000, // 5 minutes
    defaultPermissions: {
        read: ['*'], // Allow all agents to read by default
        write: [],   // No write access by default
        delete: []   // No delete access by default
    }
}; 