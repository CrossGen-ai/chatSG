"use strict";
/**
 * State Management Utilities
 *
 * Helper functions for working with the state management system.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStateContext = createStateContext;
exports.validateStatePermissions = validateStatePermissions;
exports.generateScopedKey = generateScopedKey;
exports.parseScopedKey = parseScopedKey;
exports.isStateExpired = isStateExpired;
exports.getExpirationTime = getExpirationTime;
exports.sanitizeStateData = sanitizeStateData;
exports.createDefaultPermissions = createDefaultPermissions;
exports.mergeStateData = mergeStateData;
exports.validateStateKey = validateStateKey;
exports.createOperationResult = createOperationResult;
/**
 * Create a state context for operations
 */
function createStateContext(sessionId, agentName, userId, requestId, permissions) {
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
function validateStatePermissions(sharedState, operation, context) {
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
function generateScopedKey(scope, baseKey, context) {
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
function parseScopedKey(key) {
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
    }
    else {
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
function isStateExpired(createdAt, ttl) {
    if (!ttl)
        return false;
    return Date.now() - createdAt.getTime() > ttl;
}
/**
 * Calculate state expiration time
 */
function getExpirationTime(createdAt, ttl) {
    if (!ttl)
        return null;
    return new Date(createdAt.getTime() + ttl);
}
/**
 * Sanitize state data for logging
 */
function sanitizeStateData(data, maxLength = 100) {
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
function createDefaultPermissions(scope, context) {
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
function mergeStateData(existing, updates) {
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
function validateStateKey(key) {
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
function createOperationResult(success, data, error, operation, context, performance) {
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
//# sourceMappingURL=utils.js.map