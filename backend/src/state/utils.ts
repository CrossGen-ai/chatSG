/**
 * State Management Utilities
 * 
 * Helper functions for working with the state management system.
 */

import { StateContext, SharedState, SessionState, AgentInteraction, ToolUsage, UserPreferences } from './interfaces';

/**
 * Create a state context for operations
 */
export function createStateContext(
    sessionId: string,
    agentName?: string,
    userId?: string,
    requestId?: string,
    permissions?: string[]
): StateContext {
    return {
        sessionId,
        agentName,
        userId,
        requestId,
        timestamp: new Date(),
        permissions
    };
}

/**
 * Validate state permissions for a given context
 */
export function validateStatePermissions(
    sharedState: SharedState,
    operation: 'read' | 'write' | 'delete',
    context: StateContext
): { valid: boolean; reason?: string } {
    const permissions = sharedState.permissions[operation];
    
    // Check for wildcard permission
    if (permissions.includes('*')) {
        return { valid: true };
    }

    // Check agent name
    if (context.agentName && permissions.includes(context.agentName)) {
        return { valid: true };
    }

    // Check user ID
    if (context.userId && permissions.includes(context.userId)) {
        return { valid: true };
    }

    // Check session ID for session-scoped states
    if (sharedState.scope === 'session' && context.sessionId && permissions.includes(context.sessionId)) {
        return { valid: true };
    }

    // Check context permissions
    if (context.permissions) {
        for (const permission of context.permissions) {
            if (permissions.includes(permission)) {
                return { valid: true };
            }
        }
    }

    return {
        valid: false,
        reason: `Insufficient ${operation} permissions for ${sharedState.scope} scope`
    };
}

/**
 * Generate a scoped key for shared state
 */
export function generateScopedKey(
    scope: 'global' | 'user' | 'session' | 'agent',
    baseKey: string,
    context: StateContext
): string {
    switch (scope) {
        case 'global':
            return `global:${baseKey}`;
        case 'user':
            return `user:${context.userId || 'anonymous'}:${baseKey}`;
        case 'session':
            return `session:${context.sessionId}:${baseKey}`;
        case 'agent':
            return `agent:${context.agentName || 'unknown'}:${baseKey}`;
        default:
            throw new Error(`Invalid scope: ${scope}`);
    }
}

/**
 * Parse a scoped key to extract components
 */
export function parseScopedKey(key: string): {
    scope: string;
    identifier?: string;
    baseKey: string;
} {
    const parts = key.split(':');
    
    if (parts.length < 2) {
        throw new Error(`Invalid scoped key format: ${key}`);
    }

    const scope = parts[0];
    
    if (scope === 'global') {
        return {
            scope,
            baseKey: parts.slice(1).join(':')
        };
    } else {
        return {
            scope,
            identifier: parts[1],
            baseKey: parts.slice(2).join(':')
        };
    }
}

/**
 * Check if a state has expired
 */
export function isStateExpired(createdAt: Date, ttl?: number): boolean {
    if (!ttl) return false;
    return Date.now() - createdAt.getTime() > ttl;
}

/**
 * Calculate state expiration time
 */
export function getExpirationTime(createdAt: Date, ttl?: number): Date | null {
    if (!ttl) return null;
    return new Date(createdAt.getTime() + ttl);
}

/**
 * Sanitize state data for logging
 */
export function sanitizeStateData(data: any, maxLength: number = 100): any {
    if (typeof data === 'string') {
        return data.length > maxLength ? data.substring(0, maxLength) + '...' : data;
    }
    
    if (typeof data === 'object' && data !== null) {
        const serialized = JSON.stringify(data);
        return serialized.length > maxLength ? 
            serialized.substring(0, maxLength) + '...' : 
            data;
    }
    
    return data;
}

/**
 * Create default permissions for a scope
 */
export function createDefaultPermissions(
    scope: 'global' | 'user' | 'session' | 'agent',
    context: StateContext
): { read: string[]; write: string[]; delete: string[] } {
    switch (scope) {
        case 'global':
            return {
                read: ['*'],
                write: [context.agentName || 'unknown'],
                delete: [context.agentName || 'unknown']
            };
        case 'user':
            return {
                read: [context.userId || 'anonymous'],
                write: [context.userId || 'anonymous'],
                delete: [context.userId || 'anonymous']
            };
        case 'session':
            return {
                read: [context.sessionId],
                write: [context.sessionId],
                delete: [context.sessionId]
            };
        case 'agent':
            return {
                read: [context.agentName || 'unknown'],
                write: [context.agentName || 'unknown'],
                delete: [context.agentName || 'unknown']
            };
        default:
            throw new Error(`Invalid scope: ${scope}`);
    }
}

/**
 * Merge state data safely
 */
export function mergeStateData(existing: any, updates: any): any {
    if (typeof existing !== 'object' || existing === null ||
        typeof updates !== 'object' || updates === null) {
        return updates;
    }

    if (Array.isArray(existing) || Array.isArray(updates)) {
        return updates;
    }

    return { ...existing, ...updates };
}

/**
 * Validate state key format
 */
export function validateStateKey(key: string): { valid: boolean; error?: string } {
    if (!key || typeof key !== 'string') {
        return { valid: false, error: 'Key must be a non-empty string' };
    }

    if (key.length > 200) {
        return { valid: false, error: 'Key must be 200 characters or less' };
    }

    // Check for invalid characters
    const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
    if (invalidChars.test(key)) {
        return { valid: false, error: 'Key contains invalid characters' };
    }

    return { valid: true };
}

/**
 * Create a state operation result
 */
export function createOperationResult<T>(
    success: boolean,
    data?: T,
    error?: string,
    operation?: string,
    context?: StateContext,
    performance?: { duration: number; cacheHit?: boolean }
) {
    return {
        success,
        data,
        error,
        metadata: {
            operation: operation || 'unknown',
            timestamp: new Date(),
            context: context || { sessionId: 'unknown', timestamp: new Date() },
            performance
        }
    };
}

/**
 * Add agent interaction to session history
 */
export function addAgentInteraction(
    sessionState: SessionState,
    agentName: string,
    confidence: number,
    reason?: string,
    handoffFrom?: string
): SessionState {
    const interaction: AgentInteraction = {
        agentName,
        timestamp: new Date(),
        confidence,
        reason,
        handoffFrom
    };

    const updatedState = { ...sessionState };
    
    if (!updatedState.agentHistory) {
        updatedState.agentHistory = [];
    }
    
    updatedState.agentHistory.push(interaction);
    
    // Keep only last 50 interactions to prevent memory bloat
    if (updatedState.agentHistory.length > 50) {
        updatedState.agentHistory = updatedState.agentHistory.slice(-50);
    }
    
    // Update metadata
    updatedState.metadata.agent = agentName;
    updatedState.metadata.updatedAt = new Date();
    
    return updatedState;
}

/**
 * Add tool usage to session history
 */
export function addToolUsage(
    sessionState: SessionState,
    toolName: string,
    parameters: any,
    result: any,
    success: boolean,
    executionTime?: number,
    agentName?: string
): SessionState {
    const toolUsage: ToolUsage = {
        toolName,
        timestamp: new Date(),
        parameters: sanitizeStateData(parameters, 500), // Limit parameter size
        result: sanitizeStateData(result, 500), // Limit result size
        success,
        executionTime,
        agentName
    };

    const updatedState = { ...sessionState };
    
    if (!updatedState.toolsUsed) {
        updatedState.toolsUsed = [];
    }
    
    updatedState.toolsUsed.push(toolUsage);
    
    // Keep only last 100 tool usages to prevent memory bloat
    if (updatedState.toolsUsed.length > 100) {
        updatedState.toolsUsed = updatedState.toolsUsed.slice(-100);
    }
    
    // Update metadata
    updatedState.metadata.updatedAt = new Date();
    
    return updatedState;
}

/**
 * Update user preferences in session state
 */
export function updateUserPreferences(
    sessionState: SessionState,
    preferences: Partial<UserPreferences>
): SessionState {
    const updatedState = { ...sessionState };
    
    if (!updatedState.userPreferences) {
        updatedState.userPreferences = {
            crossSessionMemory: false,
            agentLock: false
        };
    }
    
    updatedState.userPreferences = {
        ...updatedState.userPreferences,
        ...preferences
    };
    
    // Update agent lock timestamp if agentLock is being enabled
    if (preferences.agentLock === true && updatedState.userPreferences.agentLock) {
        updatedState.userPreferences.agentLockTimestamp = new Date();
    }
    
    // Update metadata
    updatedState.metadata.updatedAt = new Date();
    
    return updatedState;
}

/**
 * Update session analytics
 */
export function updateSessionAnalytics(
    sessionState: SessionState,
    updates: {
        messageCount?: number;
        responseTime?: number;
        tokensUsed?: number;
        error?: { error: string; agent?: string };
    }
): SessionState {
    const updatedState = { ...sessionState };
    
    if (!updatedState.analytics) {
        updatedState.analytics = {
            messageCount: 0,
            averageResponseTime: 0,
            errorCount: 0
        };
    }
    
    const analytics = updatedState.analytics;
    
    // Update message count
    if (updates.messageCount !== undefined) {
        analytics.messageCount += updates.messageCount;
    }
    
    // Update average response time
    if (updates.responseTime !== undefined) {
        const totalMessages = analytics.messageCount || 1;
        analytics.averageResponseTime = 
            ((analytics.averageResponseTime * (totalMessages - 1)) + updates.responseTime) / totalMessages;
    }
    
    // Update token usage
    if (updates.tokensUsed !== undefined) {
        analytics.totalTokensUsed = (analytics.totalTokensUsed || 0) + updates.tokensUsed;
    }
    
    // Update error tracking
    if (updates.error) {
        analytics.errorCount++;
        analytics.lastError = {
            timestamp: new Date(),
            error: updates.error.error,
            agent: updates.error.agent
        };
    }
    
    // Update metadata
    updatedState.metadata.updatedAt = new Date();
    
    return updatedState;
}

/**
 * Get the last agent used in session
 */
export function getLastAgentUsed(sessionState: SessionState): string | undefined {
    if (sessionState.agentHistory && sessionState.agentHistory.length > 0) {
        return sessionState.agentHistory[sessionState.agentHistory.length - 1].agentName;
    }
    return sessionState.metadata.agent;
}

/**
 * Check if agent lock is active and valid
 */
export function isAgentLockActive(sessionState: SessionState, lockTimeoutMs: number = 30 * 60 * 1000): boolean {
    if (!sessionState.userPreferences?.agentLock) {
        return false;
    }
    
    if (!sessionState.userPreferences.agentLockTimestamp) {
        return true; // Lock is active but no timestamp, assume permanent
    }
    
    const lockAge = Date.now() - sessionState.userPreferences.agentLockTimestamp.getTime();
    return lockAge < lockTimeoutMs;
}

/**
 * Get tool usage statistics for session
 */
export function getToolUsageStats(sessionState: SessionState): {
    totalUsage: number;
    successRate: number;
    mostUsedTool?: string;
    averageExecutionTime?: number;
} {
    if (!sessionState.toolsUsed || sessionState.toolsUsed.length === 0) {
        return {
            totalUsage: 0,
            successRate: 0
        };
    }
    
    const tools = sessionState.toolsUsed;
    const totalUsage = tools.length;
    const successCount = tools.filter(t => t.success).length;
    const successRate = successCount / totalUsage;
    
    // Find most used tool
    const toolCounts = tools.reduce((acc, tool) => {
        acc[tool.toolName] = (acc[tool.toolName] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    
    const mostUsedTool = Object.keys(toolCounts).reduce((a, b) => 
        toolCounts[a] > toolCounts[b] ? a : b
    );
    
    // Calculate average execution time
    const executionTimes = tools
        .filter(t => t.executionTime !== undefined)
        .map(t => t.executionTime!);
    
    const averageExecutionTime = executionTimes.length > 0 
        ? executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length 
        : undefined;
    
    return {
        totalUsage,
        successRate,
        mostUsedTool,
        averageExecutionTime
    };
}

/**
 * Compress session history to manage memory usage
 */
export function compressSessionHistory(sessionState: SessionState): SessionState {
    const updatedState = { ...sessionState };
    
    // Compress agent history - keep first, last, and key transitions
    if (updatedState.agentHistory && updatedState.agentHistory.length > 20) {
        const history = updatedState.agentHistory;
        const compressed = [
            history[0], // First interaction
            ...history.slice(-10), // Last 10 interactions
        ];
        
        // Add key agent transitions (when agent changes)
        for (let i = 1; i < history.length - 10; i++) {
            if (history[i].agentName !== history[i-1].agentName) {
                compressed.splice(-10, 0, history[i]);
            }
        }
        
        updatedState.agentHistory = compressed;
    }
    
    // Compress tool usage - keep recent and failed attempts
    if (updatedState.toolsUsed && updatedState.toolsUsed.length > 50) {
        const tools = updatedState.toolsUsed;
        const recent = tools.slice(-30); // Last 30 tool usages
        const failures = tools.slice(0, -30).filter(t => !t.success); // All failures from earlier
        
        updatedState.toolsUsed = [...failures, ...recent];
    }
    
    return updatedState;
}

/**
 * Initialize session state with default tracking fields
 */
export function initializeSessionTracking(sessionState: SessionState): SessionState {
    const updatedState = { ...sessionState };
    
    if (!updatedState.agentHistory) {
        updatedState.agentHistory = [];
    }
    
    if (!updatedState.toolsUsed) {
        updatedState.toolsUsed = [];
    }
    
    if (!updatedState.userPreferences) {
        updatedState.userPreferences = {
            crossSessionMemory: false,
            agentLock: false
        };
    }
    
    if (!updatedState.analytics) {
        updatedState.analytics = {
            messageCount: 0,
            averageResponseTime: 0,
            errorCount: 0
        };
    }
    
    return updatedState;
} 