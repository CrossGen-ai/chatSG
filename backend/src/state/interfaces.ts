/**
 * State Management Interfaces
 * 
 * Comprehensive state management system that enables controlled data sharing
 * between agents while maintaining session isolation. Integrates with existing
 * AgentZero session management and provides persistence interfaces.
 */

import { InMemoryChatMessageHistory } from '@langchain/core/chat_history';

/**
 * State persistence interface
 */
export interface StatePersistence {
    /**
     * Store state data
     */
    store(key: string, data: any, ttl?: number): Promise<void>;

    /**
     * Retrieve state data
     */
    retrieve(key: string): Promise<any>;

    /**
     * Delete state data
     */
    delete(key: string): Promise<boolean>;

    /**
     * Check if key exists
     */
    exists(key: string): Promise<boolean>;

    /**
     * List all keys with optional prefix
     */
    listKeys(prefix?: string): Promise<string[]>;

    /**
     * Clear all data with optional prefix
     */
    clear(prefix?: string): Promise<void>;

    /**
     * Get persistence type identifier
     */
    getType(): string;
}

/**
 * Session state interface
 */
export interface SessionState {
    sessionId: string;
    data: Record<string, any>;
    metadata: {
        createdAt: Date;
        updatedAt: Date;
        accessCount: number;
        lastAccess: Date;
        agent?: string;
        userId?: string;
    };
    messageHistory?: InMemoryChatMessageHistory;
}

/**
 * Shared state interface for cross-agent data sharing
 */
export interface SharedState {
    key: string;
    data: any;
    scope: 'global' | 'user' | 'session' | 'agent';
    permissions: {
        read: string[]; // List of agents/users that can read
        write: string[]; // List of agents/users that can write
        delete: string[]; // List of agents/users that can delete
    };
    metadata: {
        createdBy: string;
        createdAt: Date;
        updatedBy: string;
        updatedAt: Date;
        version: number;
        ttl?: number; // Time to live in milliseconds
    };
}

/**
 * State access context
 */
export interface StateContext {
    sessionId: string;
    agentName?: string;
    userId?: string;
    requestId?: string;
    timestamp: Date;
    permissions?: string[];
}

/**
 * State operation result
 */
export interface StateOperationResult<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    metadata?: {
        operation: string;
        timestamp: Date;
        context: StateContext;
        performance?: {
            duration: number;
            cacheHit?: boolean;
        };
    };
}

/**
 * State query interface
 */
export interface StateQuery {
    scope?: 'global' | 'user' | 'session' | 'agent';
    prefix?: string;
    agentName?: string;
    userId?: string;
    sessionId?: string;
    createdAfter?: Date;
    createdBefore?: Date;
    limit?: number;
    offset?: number;
}

/**
 * State event interface
 */
export interface StateEvent {
    type: 'create' | 'update' | 'delete' | 'access';
    key: string;
    scope: string;
    context: StateContext;
    timestamp: Date;
    data?: any;
    previousData?: any;
}

/**
 * State event listener
 */
export type StateEventListener = (event: StateEvent) => void | Promise<void>;

/**
 * State manager interface
 */
export interface StateManagerInterface {
    // Session management
    getSessionState(sessionId: string, context: StateContext): Promise<StateOperationResult<SessionState>>;
    updateSessionState(sessionId: string, updates: Partial<SessionState>, context: StateContext): Promise<StateOperationResult<SessionState>>;
    deleteSessionState(sessionId: string, context: StateContext): Promise<StateOperationResult<boolean>>;
    
    // Shared state management
    getSharedState(key: string, context: StateContext): Promise<StateOperationResult<SharedState>>;
    setSharedState(key: string, data: any, options: Partial<SharedState>, context: StateContext): Promise<StateOperationResult<SharedState>>;
    deleteSharedState(key: string, context: StateContext): Promise<StateOperationResult<boolean>>;
    
    // Query operations
    queryStates(query: StateQuery, context: StateContext): Promise<StateOperationResult<SharedState[]>>;
    
    // Persistence operations
    setPersistence(persistence: StatePersistence): void;
    getPersistence(): StatePersistence | null;
    
    // Event management
    addEventListener(event: string, listener: StateEventListener): void;
    removeEventListener(event: string, listener: StateEventListener): void;
    
    // Utility methods
    clearExpiredStates(): Promise<StateOperationResult<number>>;
    getStats(): Promise<StateOperationResult<StateStats>>;
    
    // Integration with existing session management
    wrapExistingSession(sessionId: string, chatHistory: InMemoryChatMessageHistory): Promise<SessionState>;
    getExistingSession(sessionId: string): InMemoryChatMessageHistory | null;
}

/**
 * State statistics
 */
export interface StateStats {
    totalSessions: number;
    activeSessions: number;
    totalSharedStates: number;
    memoryUsage: {
        sessions: number;
        sharedStates: number;
        total: number;
    };
    performance: {
        averageReadTime: number;
        averageWriteTime: number;
        cacheHitRate: number;
    };
    persistence: {
        type: string;
        connected: boolean;
        operations: {
            reads: number;
            writes: number;
            deletes: number;
            errors: number;
        };
    };
}

/**
 * State configuration
 */
export interface StateConfig {
    // Default TTL for shared states (in milliseconds)
    defaultTTL: number;
    
    // Maximum number of sessions to keep in memory
    maxSessions: number;
    
    // Maximum number of shared states to keep in memory
    maxSharedStates: number;
    
    // Enable/disable persistence
    enablePersistence: boolean;
    
    // Persistence configuration
    persistence?: {
        type: 'memory' | 'file' | 'database';
        config: Record<string, any>;
    };
    
    // Enable/disable state events
    enableEvents: boolean;
    
    // Cleanup interval for expired states (in milliseconds)
    cleanupInterval: number;
    
    // Default permissions for new shared states
    defaultPermissions: {
        read: string[];
        write: string[];
        delete: string[];
    };
} 