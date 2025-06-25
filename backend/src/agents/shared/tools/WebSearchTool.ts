/**
 * Shared Web Search Tool
 * 
 * An expensive-to-initialize web search tool that should be shared across all agents
 * to avoid duplicate initialization costs. Integrates with existing ToolRegistry patterns.
 */

import { BaseTool, ToolSchema, ToolParams, ToolResult, ToolContext } from '../../../tools/Tool';

export class WebSearchTool extends BaseTool {
    private searchInitialized: boolean = false;
    private searchClient: any = null; // Placeholder for actual search client
    private requestQueue: Map<string, Promise<any>> = new Map();

    constructor() {
        super(
            'web-search',
            '1.0.0',
            'Shared web search tool for all agents with rate limiting and caching',
            { 
                enabled: true, 
                timeout: 15000,
                retries: 2,
                cacheResults: true,
                cacheTTL: 300000, // 5 minutes
                rateLimit: {
                    maxCalls: 10,
                    windowMs: 60000 // 1 minute window
                },
                permissions: ['web-access']
            },
            {
                author: 'ChatSG Shared Tool System',
                category: 'web',
                tags: ['web', 'search', 'research', 'shared', 'expensive']
            }
        );
    }

    getSchema(): ToolSchema {
        return {
            name: this.name,
            description: this.description,
            parameters: [
                {
                    name: 'query',
                    type: 'string',
                    description: 'Search query to execute',
                    required: true,
                    pattern: '^.{1,500}$' // Limit query length
                },
                {
                    name: 'maxResults',
                    type: 'number',
                    description: 'Maximum number of results to return',
                    required: false,
                    default: 5,
                    minimum: 1,
                    maximum: 20
                },
                {
                    name: 'searchType',
                    type: 'string',
                    description: 'Type of search to perform',
                    required: false,
                    default: 'general',
                    enum: ['general', 'news', 'academic', 'images']
                },
                {
                    name: 'freshness',
                    type: 'string',
                    description: 'Freshness filter for results',
                    required: false,
                    default: 'any',
                    enum: ['any', 'day', 'week', 'month']
                }
            ],
            returns: {
                type: 'object',
                description: 'Search results with metadata',
                properties: {
                    results: 'array of search result objects',
                    totalResults: 'number',
                    searchQuery: 'string',
                    searchType: 'string',
                    metadata: 'object with search metadata'
                }
            },
            examples: [
                {
                    input: {
                        query: 'TypeScript best practices',
                        maxResults: 5,
                        searchType: 'general'
                    },
                    output: {
                        results: [
                            {
                                title: 'TypeScript Best Practices Guide',
                                url: 'https://example.com/typescript-guide',
                                snippet: 'Comprehensive guide to TypeScript best practices...',
                                score: 0.95
                            }
                        ],
                        totalResults: 1,
                        searchQuery: 'TypeScript best practices',
                        searchType: 'general'
                    },
                    description: 'Search for TypeScript best practices'
                }
            ]
        };
    }

    async initialize(): Promise<void> {
        if (this.searchInitialized) {
            console.log('[WebSearchTool] Already initialized');
            return;
        }

        console.log('[WebSearchTool] Initializing shared web search client...');
        
        try {
            // Simulate expensive initialization (e.g., API client setup, authentication)
            await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
            
            // In a real implementation, this would initialize actual search service
            this.searchClient = {
                search: this.mockSearchFunction.bind(this),
                isReady: true
            };
            
            this.searchInitialized = true;
            console.log('[WebSearchTool] Successfully initialized shared web search client');
            
        } catch (error) {
            console.error('[WebSearchTool] Failed to initialize:', error);
            throw error;
        }
    }

    async execute(params: ToolParams, context?: ToolContext): Promise<ToolResult> {
        const startTime = Date.now();

        try {
            if (!this.searchInitialized || !this.searchClient) {
                await this.initialize();
            }

            const { query, maxResults = 5, searchType = 'general', freshness = 'any' } = params;

            if (!query || typeof query !== 'string') {
                return this.createErrorResult('Query is required and must be a string');
            }

            // Create a request ID for deduplication
            const requestId = `${query}_${maxResults}_${searchType}_${freshness}`;
            
            // Check if this request is already in progress
            if (this.requestQueue.has(requestId)) {
                console.log(`[WebSearchTool] Deduplicating request: ${requestId}`);
                const result = await this.requestQueue.get(requestId);
                return this.createSuccessResult(result, 'Search completed (deduplicated)', {
                    executionTime: Date.now() - startTime,
                    cached: true,
                    deduplicated: true
                });
            }

            // Create the search promise and add to queue
            const searchPromise = this.performSearch({
                query,
                maxResults,
                searchType,
                freshness
            }, context);

            this.requestQueue.set(requestId, searchPromise);

            try {
                const result = await searchPromise;
                const executionTime = Date.now() - startTime;

                return this.createSuccessResult(result, `Search completed for: ${query}`, {
                    executionTime,
                    cached: false,
                    searchType,
                    agentId: context?.agentName,
                    sessionId: context?.sessionId
                });

            } finally {
                // Clean up the request from queue
                this.requestQueue.delete(requestId);
            }

        } catch (error) {
            return this.createErrorResult(`Search failed: ${(error as Error).message}`);
        }
    }

    private async performSearch(params: {
        query: string;
        maxResults: number;
        searchType: string;
        freshness: string;
    }, context?: ToolContext): Promise<any> {
        
        console.log(`[WebSearchTool] Performing search: "${params.query}" (type: ${params.searchType})`);
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
        
        const results = await this.searchClient.search(params);
        
        return {
            results,
            totalResults: results.length,
            searchQuery: params.query,
            searchType: params.searchType,
            freshness: params.freshness,
            metadata: {
                timestamp: new Date().toISOString(),
                agentId: context?.agentName,
                sessionId: context?.sessionId,
                searchDuration: Math.random() * 1000 + 200
            }
        };
    }

    private async mockSearchFunction(params: any): Promise<any[]> {
        // Mock search results for demonstration
        const { query, maxResults } = params;
        
        const mockResults = [
            {
                title: `Best practices for ${query}`,
                url: `https://example.com/search/${encodeURIComponent(query)}`,
                snippet: `Comprehensive guide and best practices for ${query}. Learn from experts and improve your skills.`,
                score: 0.95,
                source: 'Example Domain'
            },
            {
                title: `${query} - Documentation`,
                url: `https://docs.example.com/${encodeURIComponent(query)}`,
                snippet: `Official documentation for ${query}. Complete reference and tutorials.`,
                score: 0.90,
                source: 'Official Docs'
            },
            {
                title: `Advanced ${query} Techniques`,
                url: `https://advanced.example.com/${encodeURIComponent(query)}`,
                snippet: `Advanced techniques and patterns for ${query}. For experienced developers.`,
                score: 0.85,
                source: 'Advanced Guide'
            }
        ];

        return mockResults.slice(0, maxResults);
    }

    async cleanup(): Promise<void> {
        console.log('[WebSearchTool] Cleaning up shared web search tool...');
        
        // Wait for any pending requests to complete
        if (this.requestQueue.size > 0) {
            console.log(`[WebSearchTool] Waiting for ${this.requestQueue.size} pending requests...`);
            await Promise.allSettled(Array.from(this.requestQueue.values()));
        }
        
        // Clean up search client
        if (this.searchClient) {
            this.searchClient = null;
        }
        
        this.searchInitialized = false;
        this.requestQueue.clear();
        
        console.log('[WebSearchTool] Cleanup completed');
    }

    isReady(): boolean {
        return this.searchInitialized && this.searchClient?.isReady === true;
    }

    getHealth(): { status: 'healthy' | 'degraded' | 'unhealthy'; message?: string } {
        if (!this.searchInitialized) {
            return { status: 'unhealthy', message: 'Not initialized' };
        }
        
        if (!this.searchClient) {
            return { status: 'unhealthy', message: 'Search client not available' };
        }
        
        if (this.requestQueue.size > 10) {
            return { status: 'degraded', message: `High request queue: ${this.requestQueue.size} pending` };
        }
        
        return { status: 'healthy', message: 'Ready for searches' };
    }
} 