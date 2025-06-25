/**
 * Shared Embedding Service
 * 
 * Provides embedding generation capabilities shared across all agents.
 * Expensive to initialize but efficient when shared.
 */

export interface EmbeddingModel {
    name: string;
    dimensions: number;
    maxTokens: number;
    initialize(): Promise<void>;
    generateEmbedding(text: string): Promise<number[]>;
    generateBatchEmbeddings(texts: string[]): Promise<number[][]>;
    cleanup(): Promise<void>;
}

export class MockEmbeddingModel implements EmbeddingModel {
    public name: string = 'mock-embedding-model';
    public dimensions: number = 384;
    public maxTokens: number = 512;
    private modelReady: boolean = false;

    async initialize(): Promise<void> {
        console.log('[MockEmbeddingModel] Initializing embedding model...');
        // Simulate expensive model loading
        await new Promise(resolve => setTimeout(resolve, 1500));
        this.modelReady = true;
        console.log('[MockEmbeddingModel] Embedding model initialized');
    }

    async generateEmbedding(text: string): Promise<number[]> {
        if (!this.modelReady) {
            throw new Error('Embedding model not initialized');
        }

        // Generate mock embedding vector
        const vector = new Array(this.dimensions);
        const textHash = this.simpleHash(text);
        
        for (let i = 0; i < this.dimensions; i++) {
            // Create deterministic but realistic embeddings based on text
            vector[i] = Math.sin(textHash + i) * 0.5 + Math.cos(textHash * 2 + i) * 0.3;
        }

        // Normalize vector
        const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
        return vector.map(val => val / magnitude);
    }

    async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
        const embeddings: number[][] = [];
        for (const text of texts) {
            embeddings.push(await this.generateEmbedding(text));
        }
        return embeddings;
    }

    async cleanup(): Promise<void> {
        console.log('[MockEmbeddingModel] Cleaning up embedding model...');
        this.modelReady = false;
    }

    private simpleHash(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }
}

export class EmbeddingService {
    private static instance: EmbeddingService;
    private model: EmbeddingModel;
    private embeddingCache: Map<string, number[]> = new Map();
    private isServiceReady: boolean = false;
    private requestQueue: Promise<any>[] = [];
    private maxCacheSize: number = 10000;

    private constructor() {
        this.model = new MockEmbeddingModel();
        console.log('[EmbeddingService] Initialized embedding service');
    }

    public static getInstance(): EmbeddingService {
        if (!EmbeddingService.instance) {
            EmbeddingService.instance = new EmbeddingService();
        }
        return EmbeddingService.instance;
    }

    async initialize(): Promise<void> {
        if (this.isServiceReady) {
            console.log('[EmbeddingService] Already initialized');
            return;
        }

        try {
            await this.model.initialize();
            this.isServiceReady = true;
            console.log('[EmbeddingService] Service ready for embeddings');
        } catch (error) {
            console.error('[EmbeddingService] Failed to initialize:', error);
            throw error;
        }
    }

    async generateEmbedding(text: string): Promise<number[]> {
        if (!this.isServiceReady) {
            await this.initialize();
        }

        // Check cache first
        const cacheKey = this.createCacheKey(text);
        const cached = this.embeddingCache.get(cacheKey);
        if (cached) {
            return cached;
        }

        try {
            // Truncate text if too long
            const truncatedText = text.length > this.model.maxTokens 
                ? text.substring(0, this.model.maxTokens) 
                : text;

            const embedding = await this.model.generateEmbedding(truncatedText);
            
            // Cache the result
            this.cacheEmbedding(cacheKey, embedding);
            
            return embedding;

        } catch (error) {
            console.error('[EmbeddingService] Failed to generate embedding:', error);
            throw error;
        }
    }

    async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
        if (!this.isServiceReady) {
            await this.initialize();
        }

        const embeddings: number[][] = [];
        const uncachedTexts: string[] = [];
        const uncachedIndices: number[] = [];

        // Check cache for all texts
        for (let i = 0; i < texts.length; i++) {
            const cacheKey = this.createCacheKey(texts[i]);
            const cached = this.embeddingCache.get(cacheKey);
            
            if (cached) {
                embeddings[i] = cached;
            } else {
                uncachedTexts.push(texts[i]);
                uncachedIndices.push(i);
            }
        }

        // Generate embeddings for uncached texts
        if (uncachedTexts.length > 0) {
            const newEmbeddings = await this.model.generateBatchEmbeddings(uncachedTexts);
            
            for (let i = 0; i < newEmbeddings.length; i++) {
                const originalIndex = uncachedIndices[i];
                const embedding = newEmbeddings[i];
                embeddings[originalIndex] = embedding;
                
                // Cache the result
                const cacheKey = this.createCacheKey(uncachedTexts[i]);
                this.cacheEmbedding(cacheKey, embedding);
            }
        }

        return embeddings;
    }

    getDimensions(): number {
        return this.model.dimensions;
    }

    getModelName(): string {
        return this.model.name;
    }

    isReady(): boolean {
        return this.isServiceReady;
    }

    getCacheStats(): any {
        return {
            cacheSize: this.embeddingCache.size,
            maxCacheSize: this.maxCacheSize,
            utilizationRate: (this.embeddingCache.size / this.maxCacheSize) * 100,
            modelName: this.model.name,
            dimensions: this.model.dimensions
        };
    }

    async clearCache(): Promise<void> {
        this.embeddingCache.clear();
        console.log('[EmbeddingService] Cache cleared');
    }

    async cleanup(): Promise<void> {
        console.log('[EmbeddingService] Cleaning up embedding service...');
        
        // Wait for pending requests
        if (this.requestQueue.length > 0) {
            await Promise.allSettled(this.requestQueue);
        }
        
        // Clear cache
        this.embeddingCache.clear();
        
        // Cleanup model
        if (this.model) {
            await this.model.cleanup();
        }
        
        this.isServiceReady = false;
        console.log('[EmbeddingService] Cleanup completed');
    }

    private createCacheKey(text: string): string {
        // Create a hash-based cache key
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return `${Math.abs(hash)}_${text.length}`;
    }

    private cacheEmbedding(key: string, embedding: number[]): void {
        // Implement LRU-like cache eviction
        if (this.embeddingCache.size >= this.maxCacheSize) {
            const firstKey = this.embeddingCache.keys().next().value;
            if (firstKey) {
                this.embeddingCache.delete(firstKey);
            }
        }
        
        this.embeddingCache.set(key, embedding);
    }
} 