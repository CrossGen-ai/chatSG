/**
 * Lazy Agent Manager with LRU Caching
 * 
 * Implements on-demand agent creation with intelligent caching to optimize
 * resource usage while maintaining performance for frequently used agents.
 */

import { BaseAgent } from '../core/BaseAgent';
import { IndividualAgentFactory } from './IndividualAgentFactory';

/**
 * LRU Cache entry for agents
 */
interface CacheEntry {
    agent: BaseAgent;
    lastUsed: number;
    useCount: number;
    createdAt: number;
}

/**
 * Agent selection result
 */
export interface AgentSelectionResult {
    agentType: string;
    confidence: number;
    reasons: string[];
}

/**
 * Cache statistics
 */
export interface CacheStats {
    hits: number;
    misses: number;
    evictions: number;
    currentSize: number;
    maxSize: number;
    totalCreated: number;
    hitRate: number;
}

/**
 * Lazy Agent Manager with LRU caching
 */
export class LazyAgentManager {
    private cache: Map<string, CacheEntry> = new Map();
    private maxCacheSize: number;
    private maxAgentIdleTime: number; // milliseconds
    private stats: CacheStats;

    constructor(maxCacheSize: number = 3, maxAgentIdleTimeMinutes: number = 30) {
        this.maxCacheSize = maxCacheSize;
        this.maxAgentIdleTime = maxAgentIdleTimeMinutes * 60 * 1000; // convert to ms
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0,
            currentSize: 0,
            maxSize: maxCacheSize,
            totalCreated: 0,
            hitRate: 0
        };

        // Start cleanup timer
        this.startCleanupTimer();
        
        console.log(`[LazyAgentManager] Initialized with cache size: ${maxCacheSize}, idle timeout: ${maxAgentIdleTimeMinutes}min`);
    }

    /**
     * Get agent by type - creates if not cached, returns cached if available
     */
    async getAgent(agentType: string): Promise<BaseAgent | null> {
        const normalizedType = this.normalizeAgentType(agentType);
        
        // Check cache first
        const cached = this.getFromCache(normalizedType);
        if (cached) {
            this.stats.hits++;
            this.updateHitRate();
            console.log(`[LazyAgentManager] Cache HIT for ${normalizedType} (used ${cached.useCount} times)`);
            return cached.agent;
        }

        // Cache miss - create new agent
        this.stats.misses++;
        console.log(`[LazyAgentManager] Cache MISS for ${normalizedType} - creating new agent`);
        
        const agent = await this.createAndCacheAgent(normalizedType);
        this.updateHitRate();
        
        return agent;
    }

    /**
     * Select best agent type based on input (lightweight operation)
     */
    selectAgentType(input: string): AgentSelectionResult {
        const lowerInput = input.toLowerCase();
        const results: AgentSelectionResult[] = [];

        // Analytical keywords and scoring
        const analyticalKeywords = [
            'analyze', 'data', 'statistics', 'calculate', 'math', 'number', 'chart', 
            'graph', 'average', 'median', 'correlation', 'research', 'study'
        ];
        const analyticalScore = this.calculateKeywordScore(lowerInput, analyticalKeywords);
        if (analyticalScore > 0) {
            results.push({
                agentType: 'analytical',
                confidence: analyticalScore,
                reasons: [`Found ${analyticalScore} analytical keywords`]
            });
        }

        // Creative keywords and scoring
        const creativeKeywords = [
            'write', 'story', 'creative', 'brainstorm', 'idea', 'poem', 'script',
            'character', 'plot', 'narrative', 'inspire', 'imagine', 'design'
        ];
        const creativeScore = this.calculateKeywordScore(lowerInput, creativeKeywords);
        if (creativeScore > 0) {
            results.push({
                agentType: 'creative',
                confidence: creativeScore,
                reasons: [`Found ${creativeScore} creative keywords`]
            });
        }

        // Technical keywords and scoring
        const technicalKeywords = [
            'code', 'programming', 'debug', 'function', 'algorithm', 'software',
            'bug', 'error', 'javascript', 'python', 'typescript', 'react', 'api'
        ];
        const technicalScore = this.calculateKeywordScore(lowerInput, technicalKeywords);
        if (technicalScore > 0) {
            results.push({
                agentType: 'technical',
                confidence: technicalScore,
                reasons: [`Found ${technicalScore} technical keywords`]
            });
        }

        // Return best match or default to analytical
        if (results.length === 0) {
            return {
                agentType: 'analytical',
                confidence: 0.1,
                reasons: ['Default selection - no specific keywords found']
            };
        }

        // Sort by confidence and return best
        results.sort((a, b) => b.confidence - a.confidence);
        const best = results[0];
        
        console.log(`[LazyAgentManager] Selected ${best.agentType} agent (confidence: ${best.confidence})`);
        return best;
    }

    /**
     * Process request with lazy agent creation
     */
    async processRequest(input: string, sessionId: string): Promise<any> {
        // Step 1: Select agent type (lightweight)
        const selection = this.selectAgentType(input);
        
        // Step 2: Get agent (cached or create)
        const agent = await this.getAgent(selection.agentType);
        
        if (!agent) {
            throw new Error(`Failed to create agent of type: ${selection.agentType}`);
        }

        // Step 3: Process with selected agent
        console.log(`[LazyAgentManager] Processing request with ${selection.agentType} agent`);
        return await agent.processMessage(input, sessionId);
    }

    /**
     * Get cache statistics
     */
    getStats(): CacheStats {
        this.stats.currentSize = this.cache.size;
        return { ...this.stats };
    }

    /**
     * Clear cache and cleanup resources
     */
    async cleanup(): Promise<void> {
        console.log(`[LazyAgentManager] Cleaning up ${this.cache.size} cached agents`);
        
        for (const [agentType, entry] of this.cache) {
            try {
                await entry.agent.cleanup?.();
                console.log(`[LazyAgentManager] Cleaned up ${agentType} agent`);
            } catch (error) {
                console.error(`[LazyAgentManager] Error cleaning up ${agentType}:`, error);
            }
        }
        
        this.cache.clear();
        this.stats.currentSize = 0;
    }

    /**
     * Get available agent types
     */
    getAvailableAgentTypes(): string[] {
        return ['analytical', 'creative', 'technical'];
    }

    /**
     * Force evict agent from cache
     */
    evictAgent(agentType: string): boolean {
        const normalizedType = this.normalizeAgentType(agentType);
        const entry = this.cache.get(normalizedType);
        
        if (entry) {
            this.cache.delete(normalizedType);
            this.stats.evictions++;
            console.log(`[LazyAgentManager] Manually evicted ${normalizedType} agent`);
            
            // Cleanup agent resources
            entry.agent.cleanup?.().catch(error => {
                console.error(`[LazyAgentManager] Error during eviction cleanup:`, error);
            });
            
            return true;
        }
        
        return false;
    }

    // Private methods

    private getFromCache(agentType: string): CacheEntry | null {
        const entry = this.cache.get(agentType);
        if (entry) {
            // Update LRU data
            entry.lastUsed = Date.now();
            entry.useCount++;
            return entry;
        }
        return null;
    }

    private async createAndCacheAgent(agentType: string): Promise<BaseAgent | null> {
        try {
            // Create new agent
            const agent = IndividualAgentFactory.createAgent(agentType);
            if (!agent) {
                console.error(`[LazyAgentManager] Failed to create agent: ${agentType}`);
                return null;
            }

            // Initialize agent
            await agent.initialize?.();
            this.stats.totalCreated++;

            // Check if we need to evict before caching
            if (this.cache.size >= this.maxCacheSize) {
                this.evictLeastRecentlyUsed();
            }

            // Cache the new agent
            const entry: CacheEntry = {
                agent,
                lastUsed: Date.now(),
                useCount: 1,
                createdAt: Date.now()
            };

            this.cache.set(agentType, entry);
            console.log(`[LazyAgentManager] Created and cached ${agentType} agent (cache size: ${this.cache.size})`);

            return agent;

        } catch (error) {
            console.error(`[LazyAgentManager] Error creating agent ${agentType}:`, error);
            return null;
        }
    }

    private evictLeastRecentlyUsed(): void {
        let oldestEntry: { key: string; lastUsed: number } | null = null;

        for (const [key, entry] of this.cache) {
            if (!oldestEntry || entry.lastUsed < oldestEntry.lastUsed) {
                oldestEntry = { key, lastUsed: entry.lastUsed };
            }
        }

        if (oldestEntry) {
            const entry = this.cache.get(oldestEntry.key);
            this.cache.delete(oldestEntry.key);
            this.stats.evictions++;
            
            console.log(`[LazyAgentManager] Evicted LRU agent: ${oldestEntry.key}`);
            
            // Cleanup evicted agent
            if (entry) {
                entry.agent.cleanup?.().catch(error => {
                    console.error(`[LazyAgentManager] Error during LRU cleanup:`, error);
                });
            }
        }
    }

    private calculateKeywordScore(input: string, keywords: string[]): number {
        let score = 0;
        for (const keyword of keywords) {
            if (input.includes(keyword)) {
                score += 1;
                // Bonus for exact word matches
                const wordRegex = new RegExp(`\\b${keyword}\\b`, 'i');
                if (wordRegex.test(input)) {
                    score += 0.5;
                }
            }
        }
        return score;
    }

    private normalizeAgentType(agentType: string): string {
        const normalized = agentType.toLowerCase();
        
        // Handle variations
        if (normalized.includes('analyt')) return 'analytical';
        if (normalized.includes('creativ')) return 'creative';
        if (normalized.includes('technic')) return 'technical';
        
        return normalized;
    }

    private startCleanupTimer(): void {
        // Run cleanup every 10 minutes
        setInterval(() => {
            this.cleanupIdleAgents();
        }, 10 * 60 * 1000);
    }

    private cleanupIdleAgents(): void {
        const now = Date.now();
        const toEvict: string[] = [];

        for (const [agentType, entry] of this.cache) {
            if (now - entry.lastUsed > this.maxAgentIdleTime) {
                toEvict.push(agentType);
            }
        }

        for (const agentType of toEvict) {
            this.evictAgent(agentType);
            console.log(`[LazyAgentManager] Evicted idle agent: ${agentType}`);
        }
    }

    private updateHitRate(): void {
        const total = this.stats.hits + this.stats.misses;
        this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
    }
}
