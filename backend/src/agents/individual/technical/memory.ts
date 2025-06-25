/**
 * Analytical Memory
 * 
 * Specialized memory implementation optimized for analytical data and numerical processing.
 * Extends base memory capabilities with domain-specific features for data analysis.
 */

import { EmbeddingService } from '../../shared/memory/EmbeddingService';

/**
 * Memory entry interface for analytical data
 */
export interface AnalyticalMemoryEntry {
    id: string;
    input: string;
    response: string;
    sessionId: string;
    timestamp: Date;
    analysisType: 'statistical' | 'visualization' | 'research' | 'general';
    dataSize?: number;
    numericalSummary?: {
        mean?: number;
        count?: number;
        range?: [number, number];
    };
    embedding?: number[];
    metadata?: {
        [key: string]: any;
    };
}

/**
 * Search options for analytical memory
 */
export interface AnalyticalSearchOptions {
    maxResults?: number;
    threshold?: number;
    analysisType?: string;
    sessionId?: string;
    dateRange?: {
        start: Date;
        end: Date;
    };
}

/**
 * Analytical Memory Implementation
 * Optimized for storing and retrieving analytical interactions
 */
export class AnalyticalMemory {
    private entries: Map<string, AnalyticalMemoryEntry> = new Map();
    private embeddingService: EmbeddingService;
    private maxSize: number;
    private sessionData: Map<string, string[]> = new Map();

    constructor(maxSize: number = 1000) {
        this.maxSize = maxSize;
        this.embeddingService = EmbeddingService.getInstance();
    }

    /**
     * Store an analytical interaction
     */
    async store(data: {
        input: string;
        response: string;
        sessionId: string;
        timestamp: Date;
        analysisType: string;
        numericalData?: number[];
    }): Promise<void> {
        try {
            const id = this.generateId();
            
            // Generate embedding for the input
            const embedding = await this.embeddingService.generateEmbedding(
                data.input + ' ' + data.response
            );

            // Extract numerical summary if numerical data is provided
            const numericalSummary = data.numericalData ? 
                this.extractNumericalSummary(data.numericalData) : undefined;

            const entry: AnalyticalMemoryEntry = {
                id,
                input: data.input,
                response: data.response,
                sessionId: data.sessionId,
                timestamp: data.timestamp,
                analysisType: data.analysisType as any,
                dataSize: data.numericalData?.length,
                numericalSummary,
                embedding,
                metadata: {
                    hasNumericalData: !!data.numericalData,
                    responseLength: data.response.length
                }
            };

            // Store entry
            this.entries.set(id, entry);

            // Update session data tracking
            if (!this.sessionData.has(data.sessionId)) {
                this.sessionData.set(data.sessionId, []);
            }
            this.sessionData.get(data.sessionId)!.push(id);

            // Cleanup if over size limit
            await this.cleanupOldEntries();

            console.log(`[AnalyticalMemory] Stored entry: ${id}`);
        } catch (error) {
            console.error('[AnalyticalMemory] Failed to store entry:', error);
            throw error;
        }
    }

    /**
     * Search for relevant analytical interactions
     */
    async search(
        query: string, 
        options: AnalyticalSearchOptions = {}
    ): Promise<AnalyticalMemoryEntry[]> {
        try {
            // Generate embedding for search query
            const queryEmbedding = await this.embeddingService.generateEmbedding(query);
            
            // Get all entries as array
            const allEntries = Array.from(this.entries.values());
            
            // Apply filters
            let filteredEntries = allEntries.filter(entry => {
                // Analysis type filter
                if (options.analysisType && entry.analysisType !== options.analysisType) {
                    return false;
                }
                
                // Session filter
                if (options.sessionId && entry.sessionId !== options.sessionId) {
                    return false;
                }
                
                // Date range filter
                if (options.dateRange) {
                    const entryDate = entry.timestamp;
                    if (entryDate < options.dateRange.start || entryDate > options.dateRange.end) {
                        return false;
                    }
                }
                
                return true;
            });

            // Calculate similarity scores
            const scoredEntries = filteredEntries.map(entry => ({
                entry,
                score: entry.embedding ? 
                    this.calculateCosineSimilarity(queryEmbedding, entry.embedding) : 0
            }));

            // Filter by threshold
            const threshold = options.threshold || 0.0;
            const relevantEntries = scoredEntries.filter(item => item.score >= threshold);

            // Sort by relevance
            relevantEntries.sort((a, b) => b.score - a.score);

            // Limit results
            const maxResults = options.maxResults || 5;
            const results = relevantEntries.slice(0, maxResults).map(item => item.entry);

            console.log(`[AnalyticalMemory] Found ${results.length} relevant entries for query: ${query}`);
            
            return results;
        } catch (error) {
            console.error('[AnalyticalMemory] Search failed:', error);
            return [];
        }
    }

    /**
     * Get session data for a specific session
     */
    getSessionData(sessionId: string): AnalyticalMemoryEntry[] {
        const sessionEntryIds = this.sessionData.get(sessionId) || [];
        return sessionEntryIds
            .map(id => this.entries.get(id))
            .filter(entry => entry !== undefined) as AnalyticalMemoryEntry[];
    }

    /**
     * Clear session data
     */
    async clearSession(sessionId: string): Promise<void> {
        const sessionEntryIds = this.sessionData.get(sessionId) || [];
        
        // Remove entries
        sessionEntryIds.forEach(id => this.entries.delete(id));
        
        // Clear session tracking
        this.sessionData.delete(sessionId);
        
        console.log(`[AnalyticalMemory] Cleared ${sessionEntryIds.length} entries for session: ${sessionId}`);
    }

    /**
     * Get memory statistics
     */
    getStats(): {
        totalEntries: number;
        activeSessions: number;
        analysisTypeBreakdown: { [key: string]: number };
        memoryUsage: number;
    } {
        const analysisTypeBreakdown: { [key: string]: number } = {};
        
        Array.from(this.entries.values()).forEach(entry => {
            analysisTypeBreakdown[entry.analysisType] = 
                (analysisTypeBreakdown[entry.analysisType] || 0) + 1;
        });

        return {
            totalEntries: this.entries.size,
            activeSessions: this.sessionData.size,
            analysisTypeBreakdown,
            memoryUsage: this.entries.size / this.maxSize
        };
    }

    /**
     * Extract numerical summary from data
     */
    private extractNumericalSummary(data: number[]): {
        mean: number;
        count: number;
        range: [number, number];
    } {
        if (!data || data.length === 0) {
            return { mean: 0, count: 0, range: [0, 0] };
        }

        const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
        const min = Math.min(...data);
        const max = Math.max(...data);

        return {
            mean: parseFloat(mean.toFixed(6)),
            count: data.length,
            range: [min, max]
        };
    }

    /**
     * Calculate cosine similarity between two embeddings
     */
    private calculateCosineSimilarity(embedding1: number[], embedding2: number[]): number {
        if (embedding1.length !== embedding2.length) {
            return 0;
        }

        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;

        for (let i = 0; i < embedding1.length; i++) {
            dotProduct += embedding1[i] * embedding2[i];
            norm1 += embedding1[i] * embedding1[i];
            norm2 += embedding2[i] * embedding2[i];
        }

        const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
        return magnitude === 0 ? 0 : dotProduct / magnitude;
    }

    /**
     * Generate unique ID for memory entries
     */
    private generateId(): string {
        return `analytical_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Cleanup old entries if over size limit
     */
    private async cleanupOldEntries(): Promise<void> {
        if (this.entries.size <= this.maxSize) return;

        // Get entries sorted by timestamp (oldest first)
        const sortedEntries = Array.from(this.entries.entries())
            .sort(([, a], [, b]) => a.timestamp.getTime() - b.timestamp.getTime());

        // Remove oldest entries until under limit
        const entriesToRemove = this.entries.size - this.maxSize;
        const removedIds: string[] = [];

        for (let i = 0; i < entriesToRemove; i++) {
            const [id] = sortedEntries[i];
            this.entries.delete(id);
            removedIds.push(id);
        }

        // Update session data tracking
        this.sessionData.forEach((entryIds, sessionId) => {
            const filteredIds = entryIds.filter(id => !removedIds.includes(id));
            if (filteredIds.length === 0) {
                this.sessionData.delete(sessionId);
            } else {
                this.sessionData.set(sessionId, filteredIds);
            }
        });

        console.log(`[AnalyticalMemory] Cleaned up ${entriesToRemove} old entries`);
    }

    /**
     * Cleanup memory resources
     */
    async cleanup(): Promise<void> {
        this.entries.clear();
        this.sessionData.clear();
        console.log('[AnalyticalMemory] Cleaned up all memory resources');
    }

    /**
     * Export memory data for backup
     */
    export(): AnalyticalMemoryEntry[] {
        return Array.from(this.entries.values());
    }

    /**
     * Import memory data from backup
     */
    async import(entries: AnalyticalMemoryEntry[]): Promise<void> {
        this.entries.clear();
        this.sessionData.clear();

        for (const entry of entries) {
            this.entries.set(entry.id, entry);
            
            // Rebuild session tracking
            if (!this.sessionData.has(entry.sessionId)) {
                this.sessionData.set(entry.sessionId, []);
            }
            this.sessionData.get(entry.sessionId)!.push(entry.id);
        }

        console.log(`[AnalyticalMemory] Imported ${entries.length} memory entries`);
    }

    /**
     * Find similar analytical patterns
     */
    async findPatterns(
        analysisType?: string,
        minOccurrences: number = 2
    ): Promise<Array<{
        pattern: string;
        count: number;
        examples: AnalyticalMemoryEntry[];
    }>> {
        const patterns: { [key: string]: AnalyticalMemoryEntry[] } = {};
        
        // Group entries by analysis type if specified
        const relevantEntries = Array.from(this.entries.values())
            .filter(entry => !analysisType || entry.analysisType === analysisType);

        // Simple pattern detection based on numerical summary ranges
        relevantEntries.forEach(entry => {
            if (entry.numericalSummary && entry.numericalSummary.range) {
                const rangeKey = this.getRangePattern(entry.numericalSummary.range);
                if (!patterns[rangeKey]) {
                    patterns[rangeKey] = [];
                }
                patterns[rangeKey].push(entry);
            }
        });

        // Filter patterns by minimum occurrences
        return Object.entries(patterns)
            .filter(([, entries]) => entries.length >= minOccurrences)
            .map(([pattern, entries]) => ({
                pattern,
                count: entries.length,
                examples: entries.slice(0, 3) // Return first 3 examples
            }));
    }

    /**
     * Get range pattern for numerical data
     */
    private getRangePattern(range: [number, number]): string {
        const [min, max] = range;
        const magnitude = Math.max(Math.abs(min), Math.abs(max));
        
        if (magnitude < 1) return 'decimal_range';
        if (magnitude < 100) return 'small_range';
        if (magnitude < 10000) return 'medium_range';
        return 'large_range';
    }
} 