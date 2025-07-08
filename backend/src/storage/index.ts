/**
 * Storage Module Exports
 * 
 * Central export point for all storage-related classes and utilities.
 * Uses PostgreSQL for all storage operations.
 */

export { 
    StorageManager, 
    getStorageManager,
    CreateSessionOptions,
    SaveMessageOptions,
    GetMessagesOptions,
    SessionWithMessages
} from './StorageManager';
export { 
    ContextManager, 
    ContextMessage, 
    ContextOptions, 
    ContextResult 
} from './ContextManager';
export { STORAGE_CONFIG } from '../config/storage.config';

// Export PostgreSQL storage types
export { 
    PostgresSessionStorage,
    Message,
    MessageMetadata
} from './PostgresSessionStorage';
export {
    PostgresSessionIndex,
    SessionIndexEntry,
    SessionStatus,
    ListSessionsOptions
} from './PostgresSessionIndex';
export {
    PostgresToolLogger,
    ToolExecution,
    ToolExecutionQuery
} from './PostgresToolLogger';