/**
 * Mem0Service - Memory Management using Python service
 * 
 * This service communicates with a Python FastAPI service that handles
 * Mem0 operations, providing proper Azure OpenAI support.
 */

import axios, { AxiosInstance } from 'axios';
import { Message } from '../storage/PostgresSessionStorage';
import { STORAGE_CONFIG } from '../config/storage.config';

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
    userId?: number;
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
    private apiClient: AxiosInstance;
    private initialized = false;
    private config: Mem0Config;
    private pythonServiceUrl: string;
    
    constructor(config?: Mem0Config) {
        this.pythonServiceUrl = process.env.MEM0_PYTHON_SERVICE_URL || 'http://localhost:8001';
        this.config = {
            apiKey: this.detectApiKey(),
            embeddingModel: this.detectEmbeddingModel(),
            llmModel: this.detectLLMModel(),
            historyDbPath: STORAGE_CONFIG.mem0.historyDbPath,
            collectionName: STORAGE_CONFIG.mem0.collectionName,
            dimension: this.detectDimension(),
            provider: STORAGE_CONFIG.mem0.provider,
            ...config
        };
        
        // Initialize axios client
        this.apiClient = axios.create({
            baseURL: this.pythonServiceUrl,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    private detectProvider(): 'azure' | 'openai' {
        const provider = (process.env.MEM0_MODELS || '').toLowerCase();
        console.log(`[Mem0Service] Detecting provider from MEM0_MODELS=${process.env.MEM0_MODELS}`);
        
        if (provider === 'azure') {
            console.log('[Mem0Service] Provider detected: azure');
            if (!process.env.AZURE_OPENAI_API_KEY || !process.env.AZURE_OPENAI_ENDPOINT) {
                console.error('[Mem0Service] Azure provider selected but missing required env vars');
                throw new Error('[Mem0Service] MEM0_MODELS=azure but AZURE_OPENAI_API_KEY or AZURE_OPENAI_ENDPOINT is missing.');
            }
            if (!process.env.AZURE_OPENAI_DEPLOYMENT || !process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT) {
                console.error('[Mem0Service] Azure provider selected but missing deployment env vars');
                throw new Error('[Mem0Service] MEM0_MODELS=azure but AZURE_OPENAI_DEPLOYMENT or AZURE_OPENAI_EMBEDDING_DEPLOYMENT is missing.');
            }
            return 'azure';
        }
        if (provider === 'openai') {
            console.log('[Mem0Service] Provider detected: openai');
            if (!process.env.OPENAI_API_KEY) {
                console.error('[Mem0Service] OpenAI provider selected but OPENAI_API_KEY is missing');
                throw new Error('[Mem0Service] MEM0_MODELS=openai but OPENAI_API_KEY is missing.');
            }
            if (!process.env.MEM0_LLM_MODEL || !process.env.MEM0_EMBEDDING_MODEL) {
                console.error('[Mem0Service] OpenAI provider selected but missing model env vars');
                throw new Error('[Mem0Service] MEM0_MODELS=openai but MEM0_LLM_MODEL or MEM0_EMBEDDING_MODEL is missing.');
            }
            return 'openai';
        }
        console.error('[Mem0Service] Invalid MEM0_MODELS value:', process.env.MEM0_MODELS);
        throw new Error('[Mem0Service] MEM0_MODELS must be set to "openai" or "azure".');
    }

    private detectApiKey(): string {
        const provider = this.detectProvider();
        const apiKey = provider === 'azure' ? process.env.AZURE_OPENAI_API_KEY! : process.env.OPENAI_API_KEY!;
        console.log(`[Mem0Service] Using ${provider} API key (length: ${apiKey?.length || 0})`);
        return apiKey;
    }

    private detectEmbeddingModel(): string {
        const provider = this.detectProvider();
        const model = provider === 'azure' ? process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT! : process.env.MEM0_EMBEDDING_MODEL!;
        console.log(`[Mem0Service] Using ${provider} embedding model: ${model}`);
        return model;
    }

    private detectLLMModel(): string {
        const provider = this.detectProvider();
        const model = provider === 'azure' ? process.env.AZURE_OPENAI_DEPLOYMENT! : process.env.MEM0_LLM_MODEL!;
        console.log(`[Mem0Service] Using ${provider} LLM model: ${model}`);
        return model;
    }

    private detectDimension(): number {
        // Both text-embedding-ada-002 and text-embedding-3-small use 1536 dims
        return 1536;
    }

    /**
     * Initialize the memory service
     */
    async initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }
        
        try {
            // Check if Python service is healthy
            const health = await this.apiClient.get('/health');
            console.log('[Mem0Service] Python service health:', health.data);
            
            if (health.data.status === 'healthy' || health.data.status === 'initializing') {
                this.initialized = true;
                console.log('[Mem0Service] Connected to Python service successfully');
                
                // Get configuration info
                const config = await this.apiClient.get('/config');
                console.log('[Mem0Service] Python service config:', config.data);
            } else {
                throw new Error('Python service is not healthy');
            }
        } catch (error: any) {
            console.error('[Mem0Service] Failed to connect to Python service:', error.message);
            if (error.code === 'ECONNREFUSED') {
                console.error('[Mem0Service] Python service is not running. Start it with: cd python-mem0 && ./scripts/start.sh');
            }
            throw error;
        }
    }
    
    /**
     * Add messages to memory with user context
     */
    async addMessages(
        messages: Message[], 
        sessionId: string,
        userId?: number
    ): Promise<MemoryAddResult> {
        if (!this.initialized) {
            await this.initialize();
        }
        
        try {
            const response = await this.apiClient.post('/add', {
                messages: messages.map(msg => ({
                    id: msg.id,
                    type: msg.type,
                    content: msg.content,
                    timestamp: msg.timestamp
                })),
                session_id: sessionId,
                user_id: userId
            });
            
            console.log(`[Mem0Service] Added ${messages.length} messages to memory for session ${sessionId}, user ${userId}`);
            return response.data.results || { results: [] };
        } catch (error: any) {
            console.error('[Mem0Service] Failed to add messages:', error.message);
            throw error;
        }
    }
    
    /**
     * Add a single message to memory
     */
    async addMessage(
        message: Message,
        sessionId: string,
        userId?: number
    ): Promise<MemoryAddResult> {
        return this.addMessages([message], sessionId, userId);
    }
    
    /**
     * Search for relevant memories with user context
     */
    async search(
        query: string,
        options: MemorySearchOptions = {}
    ): Promise<MemorySearchResult> {
        if (!this.initialized) {
            await this.initialize();
        }
        
        try {
            const response = await this.apiClient.post('/search', {
                query: query,
                session_id: options.sessionId,
                user_id: options.userId,
                limit: options.limit || 10
            });
            
            console.log(`[Mem0Service] Search for "${query}" returned ${response.data.results?.length || 0} results`);
            return response.data;
        } catch (error: any) {
            console.error('[Mem0Service] Search failed:', error.message);
            throw error;
        }
    }
    
    /**
     * Get all memories for a session with user context
     */
    async getSessionMemories(
        sessionId: string,
        userId?: number,
        limit?: number
    ): Promise<any[]> {
        if (!this.initialized) {
            await this.initialize();
        }
        
        try {
            const response = await this.apiClient.post('/get-session-memories', {
                session_id: sessionId,
                user_id: userId,
                limit: limit || 100
            });
            
            const memories = response.data.memories || [];
            console.log(`[Mem0Service] Retrieved ${memories.length} memories for session ${sessionId}`);
            return memories;
        } catch (error: any) {
            console.error('[Mem0Service] Failed to get session memories:', error.message);
            throw error;
        }
    }
    
    /**
     * Get context messages for LLM with user awareness
     */
    async getContextForQuery(
        query: string,
        sessionId: string,
        userId?: number,
        maxMessages: number = 50
    ): Promise<Array<{role: string, content: string}>> {
        if (!this.initialized) {
            await this.initialize();
        }
        
        try {
            const response = await this.apiClient.post('/get-context', {
                query: query,
                session_id: sessionId,
                user_id: userId,
                max_messages: maxMessages
            });
            
            const contextMessages = response.data.context_messages || [];
            console.log(`[Mem0Service] Built context with ${contextMessages.length} relevant memories`);
            return contextMessages;
        } catch (error: any) {
            console.error('[Mem0Service] Failed to get context:', error.message);
            throw error;
        }
    }
    
    /**
     * Delete memories for a session with user context
     */
    async deleteSessionMemories(
        sessionId: string, 
        userId?: number
    ): Promise<void> {
        if (!this.initialized) {
            await this.initialize();
        }
        
        try {
            const response = await this.apiClient.post('/delete-session-memories', {
                session_id: sessionId,
                user_id: userId
            });
            
            console.log(`[Mem0Service] Deleted ${response.data.deleted_count || 0} memories for session ${sessionId}`);
        } catch (error: any) {
            console.error('[Mem0Service] Failed to delete session memories:', error.message);
            throw error;
        }
    }
    
    /**
     * Get memory history for a session with user context
     */
    async getMemoryHistory(
        sessionId: string,
        userId?: number
    ): Promise<any[]> {
        // This method is not implemented in the Python service yet
        console.warn('[Mem0Service] getMemoryHistory is not implemented in Python service');
        return [];
    }
    
    /**
     * Get all memories for a user across all sessions
     */
    async getAllUserMemories(userId: number, limit: number = 1000): Promise<any[]> {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            const response = await this.apiClient.post('/get-all-user-memories', {
                user_id: userId,
                limit: limit
            });

            const memories = response.data.memories || [];
            console.log(`[Mem0Service] Retrieved ${memories.length} total memories for user ${userId}`);
            return memories;

        } catch (error: any) {
            console.error('[Mem0Service] Failed to get all user memories:', error.message);
            return [];
        }
    }

    /**
     * Get user statistics (not implemented in Python service)
     */
    async getUserMemoryStats(userId: number): Promise<any> {
        // This would need to be implemented in the Python service
        return null;
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