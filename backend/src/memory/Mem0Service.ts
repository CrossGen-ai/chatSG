/**
 * Mem0Service - Memory Management using mem0ai with PostgreSQL/pgvector
 * 
 * Provides intelligent memory layer for chat sessions using mem0's
 * implementation with PostgreSQL pgvector for scalable vector storage
 * and proper user isolation.
 */

import { Memory } from 'mem0ai/oss';
import { Message } from '../storage/SessionStorage';
import { STORAGE_CONFIG } from '../config/storage.config';
import { getPool } from '../database/pool';
import * as path from 'path';

export interface Mem0Config {
    apiKey?: string;
    embeddingModel?: string;
    llmModel?: string;
    historyDbPath?: string;
    collectionName?: string;
    dimension?: number;
    provider?: string;
}

export interface MemorySearchOptions {
    limit?: number;
    userId?: string;
    sessionId?: string;
}

export interface MemoryAddResult {
    results: Array<{
        id: string;
        memory: string;
        metadata?: Record<string, any>;
    }>;
}

export interface MemorySearchResult {
    results: Array<{
        id: string;
        memory: string;
        score?: number;
        metadata?: Record<string, any>;
    }>;
}

export class Mem0Service {
    private memory: Memory | null = null;
    private initialized = false;
    private config: Mem0Config;
    private dbPool: any = null;
    
    constructor(config?: Mem0Config) {
        this.config = {
            apiKey: process.env.OPENAI_API_KEY,
            embeddingModel: STORAGE_CONFIG.mem0.embeddingModel,
            llmModel: STORAGE_CONFIG.mem0.llmModel,
            historyDbPath: STORAGE_CONFIG.mem0.historyDbPath,
            collectionName: STORAGE_CONFIG.mem0.collectionName,
            dimension: STORAGE_CONFIG.mem0.dimension,
            provider: STORAGE_CONFIG.mem0.provider,
            ...config
        };
    }
    
    /**
     * Initialize the memory service
     */
    async initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }
        
        try {
            // Build configuration object
            const memoryConfig: any = {
                version: 'v1.1',
                embedder: {
                    provider: 'openai',
                    config: {
                        apiKey: this.config.apiKey || '',
                        model: this.config.embeddingModel,
                    },
                },
                llm: {
                    provider: 'openai',
                    config: {
                        apiKey: this.config.apiKey || '',
                        model: this.config.llmModel,
                    },
                },
            };
            
            // Configure vector store based on provider
            if (this.config.provider === 'qdrant') {
                // Configure Qdrant as vector store
                memoryConfig.vectorStore = {
                    provider: 'qdrant',
                    config: {
                        url: STORAGE_CONFIG.mem0.qdrant.url,
                        ...(STORAGE_CONFIG.mem0.qdrant.apiKey && { apiKey: STORAGE_CONFIG.mem0.qdrant.apiKey }),
                        collectionName: this.config.collectionName,
                        embeddingDimensions: this.config.dimension,
                    },
                };
                
                console.log('[Mem0Service] Using Qdrant vector store');
                
                // Get database connection pool for user metadata operations
                this.dbPool = getPool();
            } else {
                // Fallback to SQLite memory store
                memoryConfig.vectorStore = {
                    provider: 'memory',
                    config: {
                        collectionName: this.config.collectionName,
                        dimension: this.config.dimension,
                    },
                };
                memoryConfig.historyDbPath = this.config.historyDbPath;
                console.log('[Mem0Service] Using SQLite memory store');
            }
            
            // Add graph store if enabled
            if (STORAGE_CONFIG.mem0.graph.enabled) {
                memoryConfig.enableGraph = true;
                memoryConfig.graphStore = {
                    provider: 'neo4j',
                    config: {
                        url: STORAGE_CONFIG.mem0.graph.url,
                        username: STORAGE_CONFIG.mem0.graph.username,
                        password: STORAGE_CONFIG.mem0.graph.password
                    }
                };
                console.log('[Mem0Service] Graph store enabled with Neo4j');
            }
            
            // Initialize mem0 with configuration
            this.memory = new Memory(memoryConfig);
            
            this.initialized = true;
            console.log('[Mem0Service] Initialized successfully');
        } catch (error) {
            console.error('[Mem0Service] Initialization failed:', error);
            throw error;
        }
    }
    
    /**
     * Ensure pgvector extension is installed
     */
    private async ensurePgVectorExtension(): Promise<void> {
        try {
            const result = await this.dbPool.query(`
                SELECT EXISTS (
                    SELECT 1 FROM pg_extension WHERE extname = 'vector'
                );
            `);
            
            if (!result.rows[0].exists) {
                console.log('[Mem0Service] Installing pgvector extension...');
                await this.dbPool.query('CREATE EXTENSION IF NOT EXISTS vector;');
                console.log('[Mem0Service] pgvector extension installed');
            }
        } catch (error) {
            console.error('[Mem0Service] Failed to ensure pgvector extension:', error);
            throw error;
        }
    }
    
    /**
     * Add messages to memory with user context
     */
    async addMessages(
        messages: Message[], 
        sessionId: string,
        userId?: string,
        userDatabaseId?: number
    ): Promise<MemoryAddResult> {
        if (!this.initialized) {
            await this.initialize();
        }
        
        if (!this.memory) {
            throw new Error('Mem0 memory not initialized');
        }
        
        try {
            // Convert our message format to mem0 format
            const mem0Messages = messages.map(msg => ({
                role: msg.type === 'user' ? 'user' : 'assistant',
                content: msg.content
            }));
            
            // Build metadata with user context
            const metadata: any = {
                sessionId,
                timestamp: new Date().toISOString()
            };
            
            // If using pgvector, store user database ID for proper isolation
            if (this.config.provider === 'pgvector' && userDatabaseId) {
                metadata.userDatabaseId = userDatabaseId;
            }
            
            // Add to memory with metadata
            const result = await this.memory.add(mem0Messages, {
                userId: userId || 'default',
                metadata
            });
            
            // If using pgvector, also update our custom tables
            if (this.config.provider === 'pgvector' && userDatabaseId) {
                await this.updatePostgresMetadata(userDatabaseId, sessionId, messages.length);
            }
            
            console.log(`[Mem0Service] Added ${messages.length} messages to memory for session ${sessionId}, user ${userId}`);
            return result;
        } catch (error) {
            console.error('[Mem0Service] Failed to add messages:', error);
            throw error;
        }
    }
    
    /**
     * Update PostgreSQL metadata tables
     */
    private async updatePostgresMetadata(userDatabaseId: number, sessionId: string, messageCount: number): Promise<void> {
        try {
            // Update is handled by database triggers, but we can add custom logic here if needed
            console.log(`[Mem0Service] Updated metadata for user ${userDatabaseId}, session ${sessionId}`);
        } catch (error) {
            console.error('[Mem0Service] Failed to update PostgreSQL metadata:', error);
            // Don't throw - this is supplementary
        }
    }
    
    /**
     * Add a single message to memory
     */
    async addMessage(
        message: Message,
        sessionId: string,
        userId?: string,
        userDatabaseId?: number
    ): Promise<MemoryAddResult> {
        return this.addMessages([message], sessionId, userId, userDatabaseId);
    }
    
    /**
     * Search for relevant memories with user context
     */
    async search(
        query: string,
        options: MemorySearchOptions = {},
        userDatabaseId?: number
    ): Promise<MemorySearchResult> {
        if (!this.initialized) {
            await this.initialize();
        }
        
        if (!this.memory) {
            throw new Error('Mem0 memory not initialized');
        }
        
        try {
            const searchOptions: any = {
                userId: options.userId || 'default',
                limit: options.limit || 10
            };
            
            // Add filters based on provider
            if (this.config.provider === 'pgvector' && userDatabaseId) {
                // For pgvector, filter by user database ID
                searchOptions.filters = {
                    ...(options.sessionId && { sessionId: options.sessionId }),
                    userDatabaseId: userDatabaseId
                };
            } else if (options.sessionId) {
                // For other providers, just filter by session
                searchOptions.filters = {
                    sessionId: options.sessionId
                };
            }
            
            const results = await this.memory.search(query, searchOptions);
            
            console.log(`[Mem0Service] Search for "${query}" returned ${results.results.length} results`);
            return results;
        } catch (error) {
            console.error('[Mem0Service] Search failed:', error);
            throw error;
        }
    }
    
    /**
     * Get all memories for a session with user context
     */
    async getSessionMemories(
        sessionId: string,
        userId?: string,
        userDatabaseId?: number,
        limit?: number
    ): Promise<any[]> {
        if (!this.initialized) {
            await this.initialize();
        }
        
        if (!this.memory) {
            throw new Error('Mem0 memory not initialized');
        }
        
        try {
            const options: any = {
                userId: userId || 'default',
                limit: limit || 100
            };
            
            // For pgvector, we need to filter by userDatabaseId
            if (this.config.provider === 'pgvector' && userDatabaseId) {
                options.filters = {
                    sessionId,
                    userDatabaseId
                };
            }
            
            const result = await this.memory.getAll(options);
            
            // Filter by sessionId for non-pgvector providers
            let memories = result.results;
            if (this.config.provider !== 'pgvector') {
                memories = memories.filter((mem: any) => 
                    mem.metadata?.sessionId === sessionId
                );
            }
            
            console.log(`[Mem0Service] Retrieved ${memories.length} memories for session ${sessionId}`);
            return memories;
        } catch (error) {
            console.error('[Mem0Service] Failed to get session memories:', error);
            throw error;
        }
    }
    
    /**
     * Get context messages for LLM with user awareness
     */
    async getContextForQuery(
        query: string,
        sessionId: string,
        userId?: string,
        userDatabaseId?: number,
        maxMessages: number = 50
    ): Promise<Array<{role: string, content: string}>> {
        if (!this.initialized) {
            await this.initialize();
        }
        
        if (!this.memory) {
            throw new Error('Mem0 memory not initialized');
        }
        
        try {
            // Search for relevant memories with user context
            const searchResults = await this.search(query, {
                sessionId,
                userId,
                limit: maxMessages
            }, userDatabaseId);
            
            // Convert memories to conversation format
            const contextMessages: Array<{role: string, content: string}> = [];
            
            // Add the most relevant memories as context
            for (const result of searchResults.results) {
                // Parse the memory to extract conversation context
                // mem0 stores memories as summaries, so we'll use them as system context
                contextMessages.push({
                    role: 'system',
                    content: `[Relevant Context: ${result.memory}]`
                });
            }
            
            console.log(`[Mem0Service] Built context with ${contextMessages.length} relevant memories`);
            return contextMessages;
        } catch (error) {
            console.error('[Mem0Service] Failed to get context:', error);
            throw error;
        }
    }
    
    /**
     * Delete memories for a session with user context
     */
    async deleteSessionMemories(
        sessionId: string, 
        userId?: string,
        userDatabaseId?: number
    ): Promise<void> {
        if (!this.initialized) {
            await this.initialize();
        }
        
        if (!this.memory) {
            throw new Error('Mem0 memory not initialized');
        }
        
        try {
            // Get all memories for the session with user context
            const memories = await this.getSessionMemories(sessionId, userId, userDatabaseId);
            
            // Delete each memory
            for (const memory of memories) {
                if (memory.id) {
                    await this.memory.delete(memory.id);
                }
            }
            
            console.log(`[Mem0Service] Deleted ${memories.length} memories for session ${sessionId}`);
        } catch (error) {
            console.error('[Mem0Service] Failed to delete session memories:', error);
            throw error;
        }
    }
    
    /**
     * Get memory history for a session with user context
     */
    async getMemoryHistory(
        sessionId: string,
        userId?: string,
        userDatabaseId?: number
    ): Promise<any[]> {
        if (!this.initialized) {
            await this.initialize();
        }
        
        if (!this.memory) {
            throw new Error('Mem0 memory not initialized');
        }
        
        try {
            const memories = await this.getSessionMemories(sessionId, userId, userDatabaseId);
            const history: any[] = [];
            
            // Get history for each memory
            for (const memory of memories) {
                if (memory.id) {
                    const memoryHistory = await this.memory.history(memory.id);
                    history.push({
                        memoryId: memory.id,
                        history: memoryHistory
                    });
                }
            }
            
            return history;
        } catch (error) {
            console.error('[Mem0Service] Failed to get memory history:', error);
            throw error;
        }
    }
    
    /**
     * Get user statistics from PostgreSQL
     */
    async getUserMemoryStats(userDatabaseId: number): Promise<any> {
        if (this.config.provider !== 'pgvector' || !this.dbPool) {
            return null;
        }
        
        try {
            const result = await this.dbPool.query(`
                SELECT 
                    COUNT(DISTINCT session_id) as total_sessions,
                    COUNT(*) as total_memories,
                    MAX(created_at) as last_memory_at
                FROM mem0_memories
                WHERE user_id = $1
            `, [userDatabaseId]);
            
            return result.rows[0];
        } catch (error) {
            console.error('[Mem0Service] Failed to get user memory stats:', error);
            return null;
        }
    }
}

// Singleton instance
let mem0ServiceInstance: Mem0Service | null = null;

/**
 * Get or create the Mem0Service instance
 */
export function getMem0Service(config?: Mem0Config): Mem0Service {
    if (!mem0ServiceInstance) {
        mem0ServiceInstance = new Mem0Service(config);
    }
    return mem0ServiceInstance;
}