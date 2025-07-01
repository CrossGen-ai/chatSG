/**
 * State Manager
 * 
 * Central state management system that enables controlled data sharing
 * between agents while maintaining session isolation. Integrates with existing
 * AgentZero session management and provides persistence interfaces.
 */

import { InMemoryChatMessageHistory } from '@langchain/core/chat_history';
import {
    StateManagerInterface,
    SessionState,
    SharedState,
    StateContext,
    StateOperationResult,
    StateQuery,
    StateEvent,
    StateEventListener,
    StatePersistence,
    StateStats,
    StateConfig
} from './interfaces';
import { MemoryPersistence } from './persistence/MemoryPersistence';

export class StateManager implements StateManagerInterface {
    private static instance: StateManager;
    
    // Core storage
    private sessions: Map<string, SessionState> = new Map();
    private sharedStates: Map<string, SharedState> = new Map();
    private existingSessions: Map<string, InMemoryChatMessageHistory> = new Map();
    
    // Event management
    private eventListeners: Map<string, StateEventListener[]> = new Map();
    
    // Persistence
    private persistence: StatePersistence | null = null;
    
    // Configuration
    private config: StateConfig;
    
    // Cleanup interval
    private cleanupInterval?: NodeJS.Timeout;
    
    // Performance tracking
    private performanceStats = {
        reads: { count: 0, totalTime: 0 },
        writes: { count: 0, totalTime: 0 },
        cacheHits: 0
    };

    private constructor(config?: Partial<StateConfig>) {
        this.config = {
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
            },
            ...config
        };

        // Initialize default memory persistence
        this.persistence = new MemoryPersistence(this.config.cleanupInterval);

        // Start cleanup interval
        if (this.config.cleanupInterval > 0) {
            this.cleanupInterval = setInterval(() => {
                this.clearExpiredStates();
            }, this.config.cleanupInterval);
        }

        console.log('[StateManager] Initialized with config:', {
            defaultTTL: this.config.defaultTTL,
            maxSessions: this.config.maxSessions,
            maxSharedStates: this.config.maxSharedStates,
            enablePersistence: this.config.enablePersistence,
            enableEvents: this.config.enableEvents
        });
    }

    /**
     * Get singleton instance
     */
    public static getInstance(config?: Partial<StateConfig>): StateManager {
        if (!StateManager.instance) {
            StateManager.instance = new StateManager(config);
        }
        return StateManager.instance;
    }

    // Session Management

    async getSessionState(sessionId: string, context: StateContext): Promise<StateOperationResult<SessionState>> {
        const startTime = Date.now();
        
        try {
            let sessionState = this.sessions.get(sessionId);
            let cacheHit = false;

            if (!sessionState) {
                // Check if we have an existing AgentZero session to wrap
                const existingSession = this.existingSessions.get(sessionId);
                
                if (existingSession) {
                    sessionState = await this.wrapExistingSession(sessionId, existingSession);
                    cacheHit = false;
                } else {
                    // Create new session state
                    sessionState = {
                        sessionId,
                        data: {},
                        metadata: {
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            accessCount: 0,
                            lastAccess: new Date(),
                            agent: context.agentName,
                            userId: context.userId
                        }
                    };
                    this.sessions.set(sessionId, sessionState);
                }
            } else {
                cacheHit = true;
            }

            // Update access metadata
            sessionState.metadata.accessCount++;
            sessionState.metadata.lastAccess = new Date();

            // Track performance
            const duration = Date.now() - startTime;
            this.performanceStats.reads.count++;
            this.performanceStats.reads.totalTime += duration;
            if (cacheHit) this.performanceStats.cacheHits++;

            // Emit event
            this.emitEvent({
                type: 'access',
                key: `session:${sessionId}`,
                scope: 'session',
                context,
                timestamp: new Date(),
                data: sessionState
            });

            return {
                success: true,
                data: sessionState,
                metadata: {
                    operation: 'getSessionState',
                    timestamp: new Date(),
                    context,
                    performance: { duration, cacheHit }
                }
            };

        } catch (error) {
            console.error('[StateManager] Error getting session state:', error);
            return {
                success: false,
                error: (error as Error).message,
                metadata: {
                    operation: 'getSessionState',
                    timestamp: new Date(),
                    context,
                    performance: { duration: Date.now() - startTime }
                }
            };
        }
    }

    async updateSessionState(sessionId: string, updates: Partial<SessionState>, context: StateContext): Promise<StateOperationResult<SessionState>> {
        const startTime = Date.now();

        try {
            let sessionState = this.sessions.get(sessionId);

            if (!sessionState) {
                // Get or create session state
                const getResult = await this.getSessionState(sessionId, context);
                if (!getResult.success || !getResult.data) {
                    return {
                        success: false,
                        error: 'Failed to get or create session state',
                        metadata: {
                            operation: 'updateSessionState',
                            timestamp: new Date(),
                            context,
                            performance: { duration: Date.now() - startTime }
                        }
                    };
                }
                sessionState = getResult.data;
            }

            const previousData = { ...sessionState };

            // Apply updates
            if (updates.data) {
                sessionState.data = { ...sessionState.data, ...updates.data };
            }
            if (updates.metadata) {
                sessionState.metadata = { ...sessionState.metadata, ...updates.metadata };
            }
            // Handle other top-level fields (userPreferences, agentHistory, toolsUsed, analytics)
            if (updates.userPreferences) {
                sessionState.userPreferences = { ...sessionState.userPreferences, ...updates.userPreferences };
            }
            if (updates.agentHistory) {
                sessionState.agentHistory = updates.agentHistory;
            }
            if (updates.toolsUsed) {
                sessionState.toolsUsed = updates.toolsUsed;
            }
            if (updates.analytics) {
                sessionState.analytics = { ...sessionState.analytics, ...updates.analytics };
            }
            
            sessionState.metadata.updatedAt = new Date();

            // Persist if enabled
            if (this.config.enablePersistence && this.persistence) {
                await this.persistence.store(`session:${sessionId}`, sessionState);
            }

            // Track performance
            const duration = Date.now() - startTime;
            this.performanceStats.writes.count++;
            this.performanceStats.writes.totalTime += duration;

            // Emit event
            this.emitEvent({
                type: 'update',
                key: `session:${sessionId}`,
                scope: 'session',
                context,
                timestamp: new Date(),
                data: sessionState,
                previousData
            });

            return {
                success: true,
                data: sessionState,
                metadata: {
                    operation: 'updateSessionState',
                    timestamp: new Date(),
                    context,
                    performance: { duration }
                }
            };

        } catch (error) {
            console.error('[StateManager] Error updating session state:', error);
            return {
                success: false,
                error: (error as Error).message,
                metadata: {
                    operation: 'updateSessionState',
                    timestamp: new Date(),
                    context,
                    performance: { duration: Date.now() - startTime }
                }
            };
        }
    }

    async deleteSessionState(sessionId: string, context: StateContext): Promise<StateOperationResult<boolean>> {
        const startTime = Date.now();

        try {
            const existed = this.sessions.has(sessionId);
            const sessionState = this.sessions.get(sessionId);

            this.sessions.delete(sessionId);

            // Remove from persistence
            if (this.config.enablePersistence && this.persistence) {
                await this.persistence.delete(`session:${sessionId}`);
            }

            // Emit event
            if (existed && sessionState) {
                this.emitEvent({
                    type: 'delete',
                    key: `session:${sessionId}`,
                    scope: 'session',
                    context,
                    timestamp: new Date(),
                    previousData: sessionState
                });
            }

            return {
                success: true,
                data: existed,
                metadata: {
                    operation: 'deleteSessionState',
                    timestamp: new Date(),
                    context,
                    performance: { duration: Date.now() - startTime }
                }
            };

        } catch (error) {
            console.error('[StateManager] Error deleting session state:', error);
            return {
                success: false,
                error: (error as Error).message,
                metadata: {
                    operation: 'deleteSessionState',
                    timestamp: new Date(),
                    context,
                    performance: { duration: Date.now() - startTime }
                }
            };
        }
    }

    // Shared State Management

    async getSharedState(key: string, context: StateContext): Promise<StateOperationResult<SharedState>> {
        const startTime = Date.now();

        try {
            const sharedState = this.sharedStates.get(key);

            if (!sharedState) {
                return {
                    success: false,
                    error: `Shared state not found: ${key}`,
                    metadata: {
                        operation: 'getSharedState',
                        timestamp: new Date(),
                        context,
                        performance: { duration: Date.now() - startTime }
                    }
                };
            }

            // Check permissions
            if (!this.checkPermission(sharedState, 'read', context)) {
                return {
                    success: false,
                    error: 'Access denied: insufficient read permissions',
                    metadata: {
                        operation: 'getSharedState',
                        timestamp: new Date(),
                        context,
                        performance: { duration: Date.now() - startTime }
                    }
                };
            }

            // Check if expired
            if (sharedState.metadata.ttl && 
                Date.now() - sharedState.metadata.createdAt.getTime() > sharedState.metadata.ttl) {
                await this.deleteSharedState(key, context);
                return {
                    success: false,
                    error: `Shared state expired: ${key}`,
                    metadata: {
                        operation: 'getSharedState',
                        timestamp: new Date(),
                        context,
                        performance: { duration: Date.now() - startTime }
                    }
                };
            }

            // Track performance
            const duration = Date.now() - startTime;
            this.performanceStats.reads.count++;
            this.performanceStats.reads.totalTime += duration;
            this.performanceStats.cacheHits++;

            // Emit event
            this.emitEvent({
                type: 'access',
                key: `shared:${key}`,
                scope: sharedState.scope,
                context,
                timestamp: new Date(),
                data: sharedState
            });

            return {
                success: true,
                data: sharedState,
                metadata: {
                    operation: 'getSharedState',
                    timestamp: new Date(),
                    context,
                    performance: { duration, cacheHit: true }
                }
            };

        } catch (error) {
            console.error('[StateManager] Error getting shared state:', error);
            return {
                success: false,
                error: (error as Error).message,
                metadata: {
                    operation: 'getSharedState',
                    timestamp: new Date(),
                    context,
                    performance: { duration: Date.now() - startTime }
                }
            };
        }
    }

    async setSharedState(key: string, data: any, options: Partial<SharedState>, context: StateContext): Promise<StateOperationResult<SharedState>> {
        const startTime = Date.now();

        try {
            const existingState = this.sharedStates.get(key);
            let isUpdate = false;

            // Check permissions for updates
            if (existingState) {
                if (!this.checkPermission(existingState, 'write', context)) {
                    return {
                        success: false,
                        error: 'Access denied: insufficient write permissions',
                        metadata: {
                            operation: 'setSharedState',
                            timestamp: new Date(),
                            context,
                            performance: { duration: Date.now() - startTime }
                        }
                    };
                }
                isUpdate = true;
            }

            // Check shared state limits
            if (!isUpdate && this.sharedStates.size >= this.config.maxSharedStates) {
                return {
                    success: false,
                    error: 'Maximum shared states limit reached',
                    metadata: {
                        operation: 'setSharedState',
                        timestamp: new Date(),
                        context,
                        performance: { duration: Date.now() - startTime }
                    }
                };
            }

            const now = new Date();
            const sharedState: SharedState = {
                key,
                data,
                scope: options.scope || 'global',
                permissions: options.permissions || this.config.defaultPermissions,
                metadata: {
                    createdBy: context.agentName || 'unknown',
                    createdAt: existingState?.metadata.createdAt || now,
                    updatedBy: context.agentName || 'unknown',
                    updatedAt: now,
                    version: (existingState?.metadata.version || 0) + 1,
                    ttl: options.metadata?.ttl || this.config.defaultTTL
                }
            };

            this.sharedStates.set(key, sharedState);

            // Persist if enabled
            if (this.config.enablePersistence && this.persistence) {
                await this.persistence.store(`shared:${key}`, sharedState, sharedState.metadata.ttl);
            }

            // Track performance
            const duration = Date.now() - startTime;
            this.performanceStats.writes.count++;
            this.performanceStats.writes.totalTime += duration;

            // Emit event
            this.emitEvent({
                type: isUpdate ? 'update' : 'create',
                key: `shared:${key}`,
                scope: sharedState.scope,
                context,
                timestamp: new Date(),
                data: sharedState,
                previousData: existingState
            });

            return {
                success: true,
                data: sharedState,
                metadata: {
                    operation: 'setSharedState',
                    timestamp: new Date(),
                    context,
                    performance: { duration }
                }
            };

        } catch (error) {
            console.error('[StateManager] Error setting shared state:', error);
            return {
                success: false,
                error: (error as Error).message,
                metadata: {
                    operation: 'setSharedState',
                    timestamp: new Date(),
                    context,
                    performance: { duration: Date.now() - startTime }
                }
            };
        }
    }

    async deleteSharedState(key: string, context: StateContext): Promise<StateOperationResult<boolean>> {
        const startTime = Date.now();

        try {
            const sharedState = this.sharedStates.get(key);

            if (!sharedState) {
                return {
                    success: true,
                    data: false,
                    metadata: {
                        operation: 'deleteSharedState',
                        timestamp: new Date(),
                        context,
                        performance: { duration: Date.now() - startTime }
                    }
                };
            }

            // Check permissions
            if (!this.checkPermission(sharedState, 'delete', context)) {
                return {
                    success: false,
                    error: 'Access denied: insufficient delete permissions',
                    metadata: {
                        operation: 'deleteSharedState',
                        timestamp: new Date(),
                        context,
                        performance: { duration: Date.now() - startTime }
                    }
                };
            }

            this.sharedStates.delete(key);

            // Remove from persistence
            if (this.config.enablePersistence && this.persistence) {
                await this.persistence.delete(`shared:${key}`);
            }

            // Emit event
            this.emitEvent({
                type: 'delete',
                key: `shared:${key}`,
                scope: sharedState.scope,
                context,
                timestamp: new Date(),
                previousData: sharedState
            });

            return {
                success: true,
                data: true,
                metadata: {
                    operation: 'deleteSharedState',
                    timestamp: new Date(),
                    context,
                    performance: { duration: Date.now() - startTime }
                }
            };

        } catch (error) {
            console.error('[StateManager] Error deleting shared state:', error);
            return {
                success: false,
                error: (error as Error).message,
                metadata: {
                    operation: 'deleteSharedState',
                    timestamp: new Date(),
                    context,
                    performance: { duration: Date.now() - startTime }
                }
            };
        }
    }

    // Query Operations

    async queryStates(query: StateQuery, context: StateContext): Promise<StateOperationResult<SharedState[]>> {
        const startTime = Date.now();

        try {
            let results: SharedState[] = [];

            for (const sharedState of this.sharedStates.values()) {
                // Check permissions
                if (!this.checkPermission(sharedState, 'read', context)) {
                    continue;
                }

                // Apply filters
                if (query.scope && sharedState.scope !== query.scope) continue;
                if (query.prefix && !sharedState.key.startsWith(query.prefix)) continue;
                if (query.agentName && sharedState.metadata.createdBy !== query.agentName) continue;
                if (query.userId && sharedState.scope === 'user' && !sharedState.key.includes(query.userId)) continue;
                if (query.sessionId && sharedState.scope === 'session' && !sharedState.key.includes(query.sessionId)) continue;
                if (query.createdAfter && sharedState.metadata.createdAt < query.createdAfter) continue;
                if (query.createdBefore && sharedState.metadata.createdAt > query.createdBefore) continue;

                results.push(sharedState);
            }

            // Apply pagination
            if (query.offset) {
                results = results.slice(query.offset);
            }
            if (query.limit) {
                results = results.slice(0, query.limit);
            }

            return {
                success: true,
                data: results,
                metadata: {
                    operation: 'queryStates',
                    timestamp: new Date(),
                    context,
                    performance: { duration: Date.now() - startTime }
                }
            };

        } catch (error) {
            console.error('[StateManager] Error querying states:', error);
            return {
                success: false,
                error: (error as Error).message,
                metadata: {
                    operation: 'queryStates',
                    timestamp: new Date(),
                    context,
                    performance: { duration: Date.now() - startTime }
                }
            };
        }
    }

    // Persistence Operations

    setPersistence(persistence: StatePersistence): void {
        if (this.persistence && this.persistence !== persistence) {
            // Cleanup old persistence if it has a destroy method
            if ('destroy' in this.persistence && typeof this.persistence.destroy === 'function') {
                (this.persistence as any).destroy();
            }
        }
        
        this.persistence = persistence;
        console.log(`[StateManager] Persistence set to: ${persistence.getType()}`);
    }

    getPersistence(): StatePersistence | null {
        return this.persistence;
    }

    // Event Management

    addEventListener(event: string, listener: StateEventListener): void {
        if (!this.config.enableEvents) return;

        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event)!.push(listener);
        
        console.log(`[StateManager] Added event listener for: ${event}`);
    }

    removeEventListener(event: string, listener: StateEventListener): void {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(listener);
            if (index > -1) {
                listeners.splice(index, 1);
                console.log(`[StateManager] Removed event listener for: ${event}`);
            }
        }
    }

    // Utility Methods

    async clearExpiredStates(): Promise<StateOperationResult<number>> {
        const startTime = Date.now();
        let cleaned = 0;

        try {
            const now = Date.now();
            const expiredSharedStates: string[] = [];

            // Find expired shared states
            for (const [key, sharedState] of this.sharedStates.entries()) {
                if (sharedState.metadata.ttl && 
                    now - sharedState.metadata.createdAt.getTime() > sharedState.metadata.ttl) {
                    expiredSharedStates.push(key);
                }
            }

            // Clean up expired shared states
            for (const key of expiredSharedStates) {
                this.sharedStates.delete(key);
                if (this.persistence) {
                    await this.persistence.delete(`shared:${key}`);
                }
                cleaned++;
            }

            if (cleaned > 0) {
                console.log(`[StateManager] Cleaned up ${cleaned} expired states`);
            }

            return {
                success: true,
                data: cleaned,
                metadata: {
                    operation: 'clearExpiredStates',
                    timestamp: new Date(),
                    context: { sessionId: 'system', timestamp: new Date() },
                    performance: { duration: Date.now() - startTime }
                }
            };

        } catch (error) {
            console.error('[StateManager] Error clearing expired states:', error);
            return {
                success: false,
                error: (error as Error).message,
                metadata: {
                    operation: 'clearExpiredStates',
                    timestamp: new Date(),
                    context: { sessionId: 'system', timestamp: new Date() },
                    performance: { duration: Date.now() - startTime }
                }
            };
        }
    }

    async getStats(): Promise<StateOperationResult<StateStats>> {
        try {
            const stats: StateStats = {
                totalSessions: this.sessions.size,
                activeSessions: this.existingSessions.size,
                totalSharedStates: this.sharedStates.size,
                memoryUsage: {
                    sessions: this.estimateMemoryUsage(this.sessions),
                    sharedStates: this.estimateMemoryUsage(this.sharedStates),
                    total: 0
                },
                performance: {
                    averageReadTime: this.performanceStats.reads.count > 0 ? 
                        this.performanceStats.reads.totalTime / this.performanceStats.reads.count : 0,
                    averageWriteTime: this.performanceStats.writes.count > 0 ? 
                        this.performanceStats.writes.totalTime / this.performanceStats.writes.count : 0,
                    cacheHitRate: this.performanceStats.reads.count > 0 ? 
                        this.performanceStats.cacheHits / this.performanceStats.reads.count : 0
                },
                persistence: {
                    type: this.persistence?.getType() || 'none',
                    connected: this.persistence !== null,
                    operations: {
                        reads: this.performanceStats.reads.count,
                        writes: this.performanceStats.writes.count,
                        deletes: 0, // TODO: Track deletes
                        errors: 0   // TODO: Track errors
                    }
                }
            };

            stats.memoryUsage.total = stats.memoryUsage.sessions + stats.memoryUsage.sharedStates;

            return {
                success: true,
                data: stats,
                metadata: {
                    operation: 'getStats',
                    timestamp: new Date(),
                    context: { sessionId: 'system', timestamp: new Date() }
                }
            };

        } catch (error) {
            console.error('[StateManager] Error getting stats:', error);
            return {
                success: false,
                error: (error as Error).message,
                metadata: {
                    operation: 'getStats',
                    timestamp: new Date(),
                    context: { sessionId: 'system', timestamp: new Date() }
                }
            };
        }
    }

    // Integration with Existing Session Management

    async wrapExistingSession(sessionId: string, chatHistory: InMemoryChatMessageHistory): Promise<SessionState> {
        console.log(`[StateManager] Wrapping existing session: ${sessionId}`);
        
        this.existingSessions.set(sessionId, chatHistory);

        const sessionState: SessionState = {
            sessionId,
            data: {},
            metadata: {
                createdAt: new Date(),
                updatedAt: new Date(),
                accessCount: 0,
                lastAccess: new Date()
            },
            messageHistory: chatHistory
        };

        this.sessions.set(sessionId, sessionState);
        return sessionState;
    }

    getExistingSession(sessionId: string): InMemoryChatMessageHistory | null {
        return this.existingSessions.get(sessionId) || null;
    }

    // Private Helper Methods

    private checkPermission(sharedState: SharedState, operation: 'read' | 'write' | 'delete', context: StateContext): boolean {
        const permissions = sharedState.permissions[operation];
        
        // Check for wildcard permission
        if (permissions.includes('*')) {
            return true;
        }

        // Check agent name
        if (context.agentName && permissions.includes(context.agentName)) {
            return true;
        }

        // Check user ID
        if (context.userId && permissions.includes(context.userId)) {
            return true;
        }

        // Check session ID for session-scoped states
        if (sharedState.scope === 'session' && context.sessionId && permissions.includes(context.sessionId)) {
            return true;
        }

        return false;
    }

    private emitEvent(event: StateEvent): void {
        if (!this.config.enableEvents) return;

        const listeners = this.eventListeners.get('*') || [];
        const specificListeners = this.eventListeners.get(event.type) || [];
        
        [...listeners, ...specificListeners].forEach(listener => {
            try {
                const result = listener(event);
                if (result instanceof Promise) {
                    result.catch(error => {
                        console.warn('[StateManager] Event listener error:', error);
                    });
                }
            } catch (error) {
                console.warn('[StateManager] Event listener error:', error);
            }
        });
    }

    private estimateMemoryUsage(map: Map<string, any>): number {
        let size = 0;
        for (const [key, value] of map.entries()) {
            size += key.length * 2; // UTF-16
            size += JSON.stringify(value).length * 2;
        }
        return size;
    }

    /**
     * Destroy the state manager
     */
    destroy(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = undefined;
        }

        if (this.persistence && 'destroy' in this.persistence && typeof this.persistence.destroy === 'function') {
            (this.persistence as any).destroy();
        }

        this.sessions.clear();
        this.sharedStates.clear();
        this.existingSessions.clear();
        this.eventListeners.clear();

        console.log('[StateManager] Destroyed');
    }
}

/**
 * Get the singleton state manager instance
 */
export function getStateManager(config?: Partial<StateConfig>): StateManager {
    return StateManager.getInstance(config);
}

/**
 * Initialize state manager with configuration
 */
export function initializeStateManager(config?: Partial<StateConfig>): StateManager {
    const stateManager = StateManager.getInstance(config);
    console.log('[StateManager] Initialized');
    return stateManager;
} 