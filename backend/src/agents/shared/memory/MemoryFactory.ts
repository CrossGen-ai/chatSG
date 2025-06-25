/**
 * Memory Factory for Agent-Specific Memory Creation
 * 
 * Creates isolated memory instances for each agent while sharing
 * expensive resources like embedding services.
 */

import { StateManager } from '../../../state/StateManager';
import { EmbeddingService } from './EmbeddingService';

export interface AgentMemoryConfig {
    agentId: string;
    sessionId?: string;
    memoryType: 'conversation' | 'semantic' | 'episodic' | 'working';
    maxEntries?: number;
    ttl?: number; // Time to live in milliseconds
    enableEmbeddings?: boolean;
    embeddingDimensions?: number;
}

export interface AgentMemory {
    agentId: string;
    sessionId?: string;
    type: string;
    
    // Core memory operations
    store(key: string, data: any, metadata?: any): Promise<void>;
    retrieve(key: string): Promise<any>;
    search(query: string, options?: any): Promise<any[]>;
    delete(key: string): Promise<boolean>;
    clear(): Promise<void>;
    
    // Memory management
    getStats(): Promise<any>;
    cleanup(): Promise<void>;
}

export class ConversationMemory implements AgentMemory {
    public agentId: string;
    public sessionId?: string;
    public type: string = 'conversation';
    
    private stateManager: StateManager;
    private embeddingService?: EmbeddingService;
    private maxEntries: number;
    private entries: Map<string, any> = new Map();

    constructor(config: AgentMemoryConfig, stateManager: StateManager, embeddingService?: EmbeddingService) {
        this.agentId = config.agentId;
        this.sessionId = config.sessionId;
        this.stateManager = stateManager;
        this.embeddingService = embeddingService;
        this.maxEntries = config.maxEntries || 1000;
        
        console.log(`[ConversationMemory] Created for agent: ${this.agentId}, session: ${this.sessionId || 'global'}`);
    }

    async store(key: string, data: any, metadata?: any): Promise<void> {
        const entry = {
            key,
            data,
            metadata: {
                ...metadata,
                timestamp: new Date().toISOString(),
                agentId: this.agentId,
                sessionId: this.sessionId
            }
        };

        // Store in local memory
        this.entries.set(key, entry);

        // Enforce size limits
        if (this.entries.size > this.maxEntries) {
            const oldestKey = this.entries.keys().next().value;
            if (oldestKey) {
                this.entries.delete(oldestKey);
            }
        }

        // Store in shared state if session-based
        if (this.sessionId) {
            const memoryKey = `memory:${this.agentId}:${key}`;
            await this.stateManager.setSharedState(
                memoryKey,
                entry,
                {}, // 24 hours TTL handled by StateManager
                { agentName: this.agentId, sessionId: this.sessionId, timestamp: new Date() }
            );
        }

        console.log(`[ConversationMemory] Stored entry: ${key} for agent: ${this.agentId}`);
    }

    async retrieve(key: string): Promise<any> {
        // Try local memory first
        const localEntry = this.entries.get(key);
        if (localEntry) {
            return localEntry.data;
        }

        // Try shared state if session-based
        if (this.sessionId) {
            const memoryKey = `memory:${this.agentId}:${key}`;
            const result = await this.stateManager.getSharedState(
                memoryKey,
                { agentName: this.agentId, sessionId: this.sessionId, timestamp: new Date() }
            );
            
            if (result.success && result.data) {
                // Cache locally
                this.entries.set(key, result.data.data);
                return result.data.data.data;
            }
        }

        return null;
    }

    async search(query: string, options?: any): Promise<any[]> {
        const results: any[] = [];
        const maxResults = options?.maxResults || 10;
        
        // Simple text-based search through entries
        for (const [key, entry] of this.entries.entries()) {
            const entryText = JSON.stringify(entry.data).toLowerCase();
            const queryLower = query.toLowerCase();
            
            if (entryText.includes(queryLower)) {
                results.push({
                    key,
                    data: entry.data,
                    metadata: entry.metadata,
                    relevance: this.calculateRelevance(entryText, queryLower)
                });
            }
        }

        // Sort by relevance and limit results
        results.sort((a, b) => b.relevance - a.relevance);
        return results.slice(0, maxResults);
    }

    async delete(key: string): Promise<boolean> {
        const deleted = this.entries.delete(key);
        
        // Delete from shared state if session-based
        if (this.sessionId && deleted) {
            const memoryKey = `memory:${this.agentId}:${key}`;
            await this.stateManager.deleteSharedState(
                memoryKey,
                { agentName: this.agentId, sessionId: this.sessionId, timestamp: new Date() }
            );
        }

        return deleted;
    }

    async clear(): Promise<void> {
        this.entries.clear();
        console.log(`[ConversationMemory] Cleared memory for agent: ${this.agentId}`);
    }

    async getStats(): Promise<any> {
        return {
            agentId: this.agentId,
            sessionId: this.sessionId,
            type: this.type,
            entryCount: this.entries.size,
            maxEntries: this.maxEntries,
            memoryUsage: this.estimateMemoryUsage(),
            hasEmbeddings: !!this.embeddingService
        };
    }

    async cleanup(): Promise<void> {
        await this.clear();
    }

    private calculateRelevance(text: string, query: string): number {
        const occurrences = (text.match(new RegExp(query, 'g')) || []).length;
        return occurrences / text.length;
    }

    private estimateMemoryUsage(): number {
        let totalSize = 0;
        for (const entry of this.entries.values()) {
            totalSize += JSON.stringify(entry).length;
        }
        return totalSize;
    }
}

export class SemanticMemory implements AgentMemory {
    public agentId: string;
    public sessionId?: string;
    public type: string = 'semantic';
    
    private embeddingService: EmbeddingService;
    private stateManager: StateManager;
    private vectorStore: Map<string, { vector: number[], data: any, metadata: any }> = new Map();

    constructor(config: AgentMemoryConfig, stateManager: StateManager, embeddingService: EmbeddingService) {
        this.agentId = config.agentId;
        this.sessionId = config.sessionId;
        this.stateManager = stateManager;
        this.embeddingService = embeddingService;
        
        console.log(`[SemanticMemory] Created for agent: ${this.agentId} with embeddings`);
    }

    async store(key: string, data: any, metadata?: any): Promise<void> {
        // Generate embedding for the data
        const text = typeof data === 'string' ? data : JSON.stringify(data);
        const vector = await this.embeddingService.generateEmbedding(text);
        
        const entry = {
            vector,
            data,
            metadata: {
                ...metadata,
                timestamp: new Date().toISOString(),
                agentId: this.agentId,
                sessionId: this.sessionId,
                textLength: text.length
            }
        };

        this.vectorStore.set(key, entry);
        console.log(`[SemanticMemory] Stored semantic entry: ${key} for agent: ${this.agentId}`);
    }

    async retrieve(key: string): Promise<any> {
        const entry = this.vectorStore.get(key);
        return entry ? entry.data : null;
    }

    async search(query: string, options?: any): Promise<any[]> {
        const maxResults = options?.maxResults || 5;
        const threshold = options?.threshold || 0.7;
        
        // Generate embedding for query
        const queryVector = await this.embeddingService.generateEmbedding(query);
        
        const results: any[] = [];
        
        for (const [key, entry] of this.vectorStore.entries()) {
            const similarity = this.cosineSimilarity(queryVector, entry.vector);
            
            if (similarity >= threshold) {
                results.push({
                    key,
                    data: entry.data,
                    metadata: entry.metadata,
                    similarity
                });
            }
        }

        // Sort by similarity
        results.sort((a, b) => b.similarity - a.similarity);
        return results.slice(0, maxResults);
    }

    async delete(key: string): Promise<boolean> {
        return this.vectorStore.delete(key);
    }

    async clear(): Promise<void> {
        this.vectorStore.clear();
        console.log(`[SemanticMemory] Cleared semantic memory for agent: ${this.agentId}`);
    }

    async getStats(): Promise<any> {
        return {
            agentId: this.agentId,
            sessionId: this.sessionId,
            type: this.type,
            entryCount: this.vectorStore.size,
            embeddingDimensions: this.embeddingService.getDimensions(),
            memoryUsage: this.estimateMemoryUsage()
        };
    }

    async cleanup(): Promise<void> {
        await this.clear();
    }

    private cosineSimilarity(a: number[], b: number[]): number {
        const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
        const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
        const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
        return dotProduct / (magnitudeA * magnitudeB);
    }

    private estimateMemoryUsage(): number {
        let totalSize = 0;
        for (const entry of this.vectorStore.values()) {
            totalSize += entry.vector.length * 8; // 8 bytes per float
            totalSize += JSON.stringify(entry.data).length;
            totalSize += JSON.stringify(entry.metadata).length;
        }
        return totalSize;
    }
}

export class MemoryFactory {
    private static instance: MemoryFactory;
    private stateManager: StateManager;
    private embeddingService: EmbeddingService;
    private memoryInstances: Map<string, AgentMemory> = new Map();

    private constructor() {
        this.stateManager = StateManager.getInstance();
        this.embeddingService = EmbeddingService.getInstance();
        console.log('[MemoryFactory] Initialized memory factory');
    }

    public static getInstance(): MemoryFactory {
        if (!MemoryFactory.instance) {
            MemoryFactory.instance = new MemoryFactory();
        }
        return MemoryFactory.instance;
    }

    async createMemory(config: AgentMemoryConfig): Promise<AgentMemory> {
        const memoryKey = `${config.agentId}:${config.sessionId || 'global'}:${config.memoryType}`;
        
        // Return existing instance if already created
        const existing = this.memoryInstances.get(memoryKey);
        if (existing) {
            console.log(`[MemoryFactory] Returning existing memory: ${memoryKey}`);
            return existing;
        }

        let memory: AgentMemory;

        switch (config.memoryType) {
            case 'conversation':
                memory = new ConversationMemory(
                    config, 
                    this.stateManager, 
                    config.enableEmbeddings ? this.embeddingService : undefined
                );
                break;

            case 'semantic':
                if (!config.enableEmbeddings) {
                    throw new Error('Semantic memory requires embeddings to be enabled');
                }
                memory = new SemanticMemory(config, this.stateManager, this.embeddingService);
                break;

            case 'episodic':
            case 'working':
                // Use conversation memory as base for now
                memory = new ConversationMemory(config, this.stateManager, this.embeddingService);
                break;

            default:
                throw new Error(`Unknown memory type: ${config.memoryType}`);
        }

        this.memoryInstances.set(memoryKey, memory);
        console.log(`[MemoryFactory] Created new memory: ${memoryKey}`);
        
        return memory;
    }

    async getMemory(agentId: string, sessionId?: string, memoryType: string = 'conversation'): Promise<AgentMemory | null> {
        const memoryKey = `${agentId}:${sessionId || 'global'}:${memoryType}`;
        return this.memoryInstances.get(memoryKey) || null;
    }

    async getAllMemories(agentId: string): Promise<AgentMemory[]> {
        const memories: AgentMemory[] = [];
        for (const [key, memory] of this.memoryInstances.entries()) {
            if (key.startsWith(`${agentId}:`)) {
                memories.push(memory);
            }
        }
        return memories;
    }

    async clearMemory(agentId: string, sessionId?: string, memoryType?: string): Promise<void> {
        if (memoryType) {
            const memoryKey = `${agentId}:${sessionId || 'global'}:${memoryType}`;
            const memory = this.memoryInstances.get(memoryKey);
            if (memory) {
                await memory.clear();
                this.memoryInstances.delete(memoryKey);
            }
        } else {
            // Clear all memories for agent
            const keysToDelete: string[] = [];
            for (const key of this.memoryInstances.keys()) {
                if (key.startsWith(`${agentId}:`)) {
                    const memory = this.memoryInstances.get(key);
                    if (memory) {
                        await memory.clear();
                    }
                    keysToDelete.push(key);
                }
            }
            keysToDelete.forEach(key => this.memoryInstances.delete(key));
        }
    }

    async getFactoryStats(): Promise<any> {
        const memoryStats: any[] = [];
        
        for (const [key, memory] of this.memoryInstances.entries()) {
            const stats = await memory.getStats();
            memoryStats.push({
                key,
                ...stats
            });
        }

        return {
            totalMemories: this.memoryInstances.size,
            embeddingServiceReady: this.embeddingService.isReady(),
            stateManagerReady: true,
            memoryInstances: memoryStats
        };
    }

    async cleanup(): Promise<void> {
        console.log('[MemoryFactory] Cleaning up all memories...');
        
        for (const memory of this.memoryInstances.values()) {
            await memory.cleanup();
        }
        
        this.memoryInstances.clear();
        console.log('[MemoryFactory] Cleanup completed');
    }
} 