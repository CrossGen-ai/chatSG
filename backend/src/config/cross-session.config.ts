/**
 * Cross-Session Memory Configuration
 * 
 * Configuration for cross-session context injection feature that allows
 * agents to access context from other active sessions of the same user.
 */

export const CROSS_SESSION_CONFIG = {
    // Maximum messages to retrieve from each cross-session
    maxCrossSessionMessages: 50,
    
    // Maximum number of other active sessions to check
    maxActiveSessions: 5,
    
    // Only include sessions that were active within this time window (ms)
    activeSessionWindow: 7 * 24 * 60 * 60 * 1000, // 7 days
    
    // Minimum messages a session must have to be included
    minMessagesThreshold: 2,
    
    // Enable cross-session memory by default for new sessions
    enabledByDefault: false,
    
    // Context injection format
    contextInjectionFormat: {
        // Header text before cross-session context
        header: "Here are other user conversations that may provide value:",
        
        // Format for each session's context
        sessionFormat: "[Session: {title}] (Last active: {lastActive})",
        
        // Separator between sessions
        sessionSeparator: "\n---\n",
        
        // Maximum length for each session's context snippet
        maxSnippetLength: 1000,
        
        // Include metadata in context
        includeMetadata: true
    },
    
    // Message filtering
    messageFiltering: {
        // Include user messages
        includeUserMessages: true,
        
        // Include assistant messages
        includeAssistantMessages: true,
        
        // Include system messages
        includeSystemMessages: false,
        
        // Filter out messages with these patterns (regex)
        excludePatterns: [
            /^\/\w+/, // Slash commands
            /password/i,
            /secret/i,
            /api[_-]?key/i
        ]
    },
    
    // Performance settings
    performance: {
        // Cache cross-session context for this duration (ms)
        cacheTimeout: 5 * 60 * 1000, // 5 minutes
        
        // Enable parallel session loading
        parallelLoading: true,
        
        // Timeout for loading each session (ms)
        sessionLoadTimeout: 1000
    },
    
    // Debug settings
    debug: {
        // Log cross-session retrievals
        logRetrievals: true,
        
        // Include debug info in context
        includeDebugInfo: false,
        
        // Save cross-session context to debug file
        saveDebugContext: false
    }
};

// Environment variable overrides
if (process.env.CROSS_SESSION_MAX_MESSAGES) {
    CROSS_SESSION_CONFIG.maxCrossSessionMessages = parseInt(process.env.CROSS_SESSION_MAX_MESSAGES, 10);
}

if (process.env.CROSS_SESSION_MAX_ACTIVE) {
    CROSS_SESSION_CONFIG.maxActiveSessions = parseInt(process.env.CROSS_SESSION_MAX_ACTIVE, 10);
}

if (process.env.CROSS_SESSION_ENABLED_DEFAULT) {
    CROSS_SESSION_CONFIG.enabledByDefault = process.env.CROSS_SESSION_ENABLED_DEFAULT === 'true';
}

if (process.env.CROSS_SESSION_DEBUG) {
    CROSS_SESSION_CONFIG.debug.logRetrievals = process.env.CROSS_SESSION_DEBUG === 'true';
    CROSS_SESSION_CONFIG.debug.includeDebugInfo = process.env.CROSS_SESSION_DEBUG === 'true';
}

// Export type for configuration
export type CrossSessionConfig = typeof CROSS_SESSION_CONFIG;