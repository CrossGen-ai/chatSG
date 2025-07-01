/**
 * Mem0Service - Memory Management using mem0ai
 * 
 * Provides intelligent memory layer for chat sessions using mem0's
 * local open-source implementation with vector embeddings and SQLite history.
 */

import { Memory } from 'mem0ai/oss';
import { Message } from '../storage/SessionStorage';
import { STORAGE_CONFIG } from '../config/storage.config';
import * as path from 'path';

export interface Mem0Config {
    apiKey?: string;
    embeddingModel?: string;
    llmModel?: string;
    historyDbPath?: string;
    collectionName?: string;
    dimension?: number;
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
    
    constructor(config?: Mem0Config) {
        this.config = {
            apiKey: process.env.OPENAI_API_KEY,
            embeddingModel: 'text-embedding-3-small',
            llmModel: 'gpt-4o-mini',
            historyDbPath: path.join(STORAGE_CONFIG.sessionPath, 'memory.db'),
            collectionName: 'chatsg_memories',
            dimension: 1536, // for text-embedding-3-small
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
            // Initialize mem0 with local configuration
            this.memory = new Memory({
                version: 'v1.1',
                embedder: {
                    provider: 'openai',
                    config: {
                        apiKey: this.config.apiKey || '',
                        model: this.config.embeddingModel,
                    },
                },
                vectorStore: {
                    provider: 'memory',
                    config: {
                        collectionName: this.config.collectionName,
                        dimension: this.config.dimension,
                    },
                },
                llm: {
                    provider: 'openai',
                    config: {
                        apiKey: this.config.apiKey || '',
                        model: this.config.llmModel,
                    },
                },
                historyDbPath: this.config.historyDbPath,
            });
            
            this.initialized = true;
            console.log('[Mem0Service] Initialized successfully');
        } catch (error) {
            console.error('[Mem0Service] Initialization failed:', error);
            throw error;
        }
    }
    
    /**
     * Add messages to memory
     */
    async addMessages(
        messages: Message[], 
        sessionId: string,
        userId?: string
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
            
            // Add to memory with metadata
            const result = await this.memory.add(mem0Messages, {
                userId: userId || 'default',
                metadata: {
                    sessionId,
                    timestamp: new Date().toISOString()
                }
            });
            
            console.log(`[Mem0Service] Added ${messages.length} messages to memory for session ${sessionId}`);
            return result;
        } catch (error) {
            console.error('[Mem0Service] Failed to add messages:', error);
            throw error;
        }
    }
    
    /**
     * Add a single message to memory
     */
    async addMessage(
        message: Message,
        sessionId: string,
        userId?: string
    ): Promise<MemoryAddResult> {
        return this.addMessages([message], sessionId, userId);
    }
    
    /**
     * Search for relevant memories
     */
    async search(
        query: string,
        options: MemorySearchOptions = {}
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
            
            // Add session filter if provided
            if (options.sessionId) {
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
     * Get all memories for a session
     */
    async getSessionMemories(
        sessionId: string,
        userId?: string,
        limit?: number
    ): Promise<any[]> {
        if (!this.initialized) {
            await this.initialize();
        }
        
        if (!this.memory) {
            throw new Error('Mem0 memory not initialized');
        }
        
        try {
            const result = await this.memory.getAll({
                userId: userId || 'default',
                limit: limit || 100
            });
            
            // Filter by sessionId
            const memories = result.results.filter((mem: any) => 
                mem.metadata?.sessionId === sessionId
            );
            
            console.log(`[Mem0Service] Retrieved ${memories.length} memories for session ${sessionId}`);
            return memories;
        } catch (error) {
            console.error('[Mem0Service] Failed to get session memories:', error);
            throw error;
        }
    }
    
    /**
     * Get context messages for LLM
     * This replaces the old getContextMessages functionality
     */
    async getContextForQuery(
        query: string,
        sessionId: string,
        userId?: string,
        maxMessages: number = 50
    ): Promise<Array<{role: string, content: string}>> {
        if (!this.initialized) {
            await this.initialize();
        }
        
        if (!this.memory) {
            throw new Error('Mem0 memory not initialized');
        }
        
        try {
            // Search for relevant memories
            const searchResults = await this.search(query, {
                sessionId,
                userId,
                limit: maxMessages
            });
            
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
     * Delete memories for a session
     */
    async deleteSessionMemories(sessionId: string, userId?: string): Promise<void> {
        if (!this.initialized) {
            await this.initialize();
        }
        
        if (!this.memory) {
            throw new Error('Mem0 memory not initialized');
        }
        
        try {
            // Get all memories for the session
            const memories = await this.getSessionMemories(sessionId, userId);
            
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
     * Get memory history for a session
     */
    async getMemoryHistory(
        sessionId: string,
        userId?: string
    ): Promise<any[]> {
        if (!this.initialized) {
            await this.initialize();
        }
        
        if (!this.memory) {
            throw new Error('Mem0 memory not initialized');
        }
        
        try {
            const memories = await this.getSessionMemories(sessionId, userId);
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