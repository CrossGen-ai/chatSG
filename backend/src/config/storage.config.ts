/**
 * Storage Configuration
 * 
 * Central configuration for the chat storage system.
 * Defines paths, limits, and behavior settings.
 */

import * as path from 'path';

export const STORAGE_CONFIG = {
    // Maximum number of messages to load for context (user + assistant combined)
    maxContextMessages: 100,
    
    // Path to store session data
    sessionPath: path.resolve('./data/sessions'),
    
    // Index update debounce time in milliseconds
    indexUpdateDebounce: 100,
    
    // Tool log retention period in days (0 = keep forever)
    toolLogRetention: 30,
    
    // Maximum messages to return in a single read operation
    maxMessagesPerRead: 1000,
    
    // Session timeout in milliseconds (for marking as inactive)
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    
    // Enable index backups
    enableIndexBackup: true,
    
    // Message format version (for future migrations)
    messageFormatVersion: '1.0',
    
    // Context window configuration
    context: {
        // Include system messages in context
        includeSystemMessages: true,
        
        // Strategy when context exceeds limit
        overflowStrategy: 'sliding-window' as 'sliding-window' | 'summarize' | 'truncate',
        
        // Number of messages to keep when using sliding window
        slidingWindowSize: 80,
        
        // Reserve space for system prompts
        systemPromptReserve: 10
    },
    
    // Session status auto-transitions
    statusTransitions: {
        // Auto-mark sessions as inactive after this time
        activeToInactiveMs: 30 * 60 * 1000, // 30 minutes
        
        // Auto-archive inactive sessions after this time
        inactiveToArchivedMs: 7 * 24 * 60 * 60 * 1000, // 7 days
        
        // Auto-cleanup deleted sessions after this time
        deletedCleanupMs: 30 * 24 * 60 * 60 * 1000 // 30 days
    },
    
    // File naming configuration
    fileNaming: {
        // Session file prefix
        sessionPrefix: 'session_',
        
        // Tools file suffix
        toolsSuffix: '_tools',
        
        // File extension
        extension: '.jsonl'
    },
    
    // Performance optimizations
    performance: {
        // Enable write stream pooling
        enableStreamPooling: true,
        
        // Maximum concurrent write streams
        maxWriteStreams: 50,
        
        // Write stream idle timeout
        streamIdleTimeout: 5 * 60 * 1000, // 5 minutes
        
        // Enable read caching
        enableReadCache: true,
        
        // Read cache TTL
        readCacheTTL: 60 * 1000 // 1 minute
    },
    
    // Logging configuration
    logging: {
        // Log level: 'debug' | 'info' | 'warn' | 'error'
        level: 'info' as 'debug' | 'info' | 'warn' | 'error',
        
        // Enable performance logging
        logPerformance: true,
        
        // Log file operations
        logFileOps: false
    }
};

// Environment variable overrides
if (process.env.CHAT_STORAGE_PATH) {
    STORAGE_CONFIG.sessionPath = path.resolve(process.env.CHAT_STORAGE_PATH);
}

if (process.env.CHAT_MAX_CONTEXT_MESSAGES) {
    STORAGE_CONFIG.maxContextMessages = parseInt(process.env.CHAT_MAX_CONTEXT_MESSAGES, 10);
}

if (process.env.CHAT_TOOL_LOG_RETENTION) {
    STORAGE_CONFIG.toolLogRetention = parseInt(process.env.CHAT_TOOL_LOG_RETENTION, 10);
}

if (process.env.CHAT_LOG_LEVEL) {
    STORAGE_CONFIG.logging.level = process.env.CHAT_LOG_LEVEL as any;
}

// Export type for configuration
export type StorageConfig = typeof STORAGE_CONFIG;