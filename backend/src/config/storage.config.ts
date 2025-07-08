/**
 * Storage Configuration
 * 
 * Central configuration for the chat storage system.
 * Defines paths, limits, and behavior settings.
 */

import * as path from 'path';
import { CROSS_SESSION_CONFIG } from './cross-session.config';

export const STORAGE_CONFIG = {
    // Storage backend selection ('jsonl' or 'postgres')
    backend: (process.env.STORAGE_BACKEND || 'jsonl') as 'jsonl' | 'postgres',
    
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
    },
    
    // Cross-session memory configuration
    crossSession: CROSS_SESSION_CONFIG,
    
    // Mem0 configuration
    mem0: {
        // Enable mem0 memory service
        enabled: process.env.MEM0_ENABLED !== 'false',
        
        // Vector store provider: 'memory' (SQLite), 'qdrant', 'redis'
        provider: process.env.MEM0_PROVIDER || 'qdrant',
        
        // Embedding model for vector store
        embeddingModel: process.env.MEM0_EMBEDDING_MODEL || 'text-embedding-3-small',
        
        // LLM model for memory generation
        llmModel: process.env.MEM0_LLM_MODEL || 'gpt-4o-mini',
        
        // Path to SQLite history database (only used when provider is 'memory')
        historyDbPath: process.env.MEM0_HISTORY_DB_PATH || path.join(path.resolve('./data/sessions'), 'memory.db'),
        
        // Collection name for vector store
        collectionName: process.env.MEM0_COLLECTION_NAME || 'chatsg_memories',
        
        // Vector dimension (depends on embedding model)
        dimension: parseInt(process.env.MEM0_DIMENSION || '1536', 10),
        
        // Maximum memories to retrieve per search
        maxSearchResults: parseInt(process.env.MEM0_MAX_SEARCH_RESULTS || '10', 10),
        
        // Maximum memories to store per session
        maxMemoriesPerSession: parseInt(process.env.MEM0_MAX_MEMORIES_PER_SESSION || '1000', 10),
        
        // Qdrant configuration (when provider is 'qdrant')
        qdrant: {
            url: process.env.QDRANT_URL || 'http://localhost:6333',
            apiKey: process.env.QDRANT_API_KEY || null,
        },
        
        // PostgreSQL configuration (for user data, not vector storage)
        postgres: {
            // Use DATABASE_URL if available, otherwise use individual settings
            connectionString: process.env.DATABASE_URL || null,
            
            // Individual connection settings (used if connectionString is not provided)
            host: process.env.POSTGRES_HOST || 'localhost',
            port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
            user: process.env.POSTGRES_USER || 'postgres',
            password: process.env.POSTGRES_PASSWORD || '',
            database: process.env.POSTGRES_DB || 'chatsg',
            
            // pgvector specific settings
            enableDiskANN: true, // Enable DiskANN for efficient similarity search
            enableHNSW: false    // Use HNSW index (alternative to IVFFlat)
        },
        
        // Graph store configuration
        graph: {
            // Enable graph store for relationship tracking
            enabled: process.env.MEM0_GRAPH_ENABLED === 'true',
            
            // Neo4j connection settings
            url: process.env.NEO4J_URL || 'neo4j://localhost:7687',
            username: process.env.NEO4J_USERNAME || 'neo4j',
            password: process.env.NEO4J_PASSWORD || ''
        }
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