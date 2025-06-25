/**
 * Shared Memory Exports
 * 
 * Central export point for memory factory and embedding services
 * that are shared across all agents.
 */

// Memory factory and interfaces
export { 
    MemoryFactory, 
    ConversationMemory, 
    SemanticMemory,
    type AgentMemory,
    type AgentMemoryConfig 
} from './MemoryFactory';

// Embedding service
export { 
    EmbeddingService, 
    MockEmbeddingModel,
    type EmbeddingModel 
} from './EmbeddingService';

// Import for internal use
import { EmbeddingService } from './EmbeddingService';
import { MemoryFactory } from './MemoryFactory';

/**
 * Initialize shared memory services
 */
export async function initializeSharedMemory(): Promise<void> {
    console.log('[SharedMemory] Initializing shared memory services...');
    
    try {
        // Initialize embedding service (expensive operation done once)
        const embeddingService = EmbeddingService.getInstance();
        await embeddingService.initialize();
        
        // Initialize memory factory
        const memoryFactory = MemoryFactory.getInstance();
        
        console.log('[SharedMemory] Successfully initialized shared memory services:');
        console.log('[SharedMemory] - EmbeddingService (with caching and model loading)');
        console.log('[SharedMemory] - MemoryFactory (agent-specific memory creation)');
        
    } catch (error) {
        console.error('[SharedMemory] Failed to initialize shared memory services:', error);
        throw error;
    }
}

/**
 * Get memory services health status
 */
export async function getSharedMemoryHealth(): Promise<any> {
    const embeddingService = EmbeddingService.getInstance();
    const memoryFactory = MemoryFactory.getInstance();
    
    const healthReport = {
        timestamp: new Date().toISOString(),
        embeddingService: {
            ready: embeddingService.isReady(),
            modelName: embeddingService.getModelName(),
            dimensions: embeddingService.getDimensions(),
            cacheStats: embeddingService.getCacheStats()
        },
        memoryFactory: await memoryFactory.getFactoryStats()
    };
    
    return healthReport;
} 