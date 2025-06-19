/**
 * Tool Registry
 * 
 * Centralized registry for tool discovery, registration, and management.
 * Provides caching, statistics tracking, and dynamic loading capabilities.
 */

import { Tool, ToolMetadata, ToolStats, ToolParams, ToolResult, ToolContext, ToolRegistryInterface } from './Tool';

/**
 * Tool execution cache entry
 */
interface CacheEntry {
    result: ToolResult;
    timestamp: number;
    ttl: number;
}

/**
 * Tool registry implementation
 */
export class ToolRegistry implements ToolRegistryInterface {
    private static instance: ToolRegistry;
    private tools: Map<string, Tool> = new Map();
    private metadata: Map<string, ToolMetadata> = new Map();
    private stats: Map<string, ToolStats> = new Map();
    private cache: Map<string, CacheEntry> = new Map();
    private initialized: boolean = false;

    private constructor() {
        console.log('[ToolRegistry] Initializing tool registry');
    }

    /**
     * Get singleton instance
     */
    public static getInstance(): ToolRegistry {
        if (!ToolRegistry.instance) {
            ToolRegistry.instance = new ToolRegistry();
        }
        return ToolRegistry.instance;
    }

    /**
     * Initialize the registry and discover available tools
     */
    public async initialize(): Promise<void> {
        if (this.initialized) {
            console.log('[ToolRegistry] Already initialized');
            return;
        }

        console.log('[ToolRegistry] Starting tool discovery...');

        try {
            await this.discoverTools();
            this.initialized = true;
            console.log(`[ToolRegistry] Initialized with ${this.tools.size} tools`);
        } catch (error) {
            console.error('[ToolRegistry] Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Register a tool instance
     */
    public async registerTool(tool: Tool): Promise<void> {
        console.log(`[ToolRegistry] Registering tool: ${tool.name}`);

        this.tools.set(tool.name, tool);

        // Initialize the tool if it supports initialization
        if (tool.initialize) {
            try {
                await tool.initialize();
                console.log(`[ToolRegistry] Initialized tool: ${tool.name}`);
            } catch (error) {
                console.warn(`[ToolRegistry] Failed to initialize tool ${tool.name}:`, error);
            }
        }

        // Create metadata
        const metadata: ToolMetadata = {
            name: tool.name,
            version: tool.version,
            description: tool.description,
            category: tool.category || 'general',
            tags: tool.tags || [],
            author: tool.author,
            schema: tool.getSchema(),
            config: tool.getConfig(),
            isLoaded: true
        };

        this.metadata.set(tool.name, metadata);

        // Initialize stats
        this.stats.set(tool.name, {
            totalExecutions: 0,
            successfulExecutions: 0,
            failedExecutions: 0,
            averageExecutionTime: 0,
            errorRate: 0
        });

        console.log(`[ToolRegistry] Registered tool: ${tool.name} (category: ${metadata.category})`);
    }

    /**
     * Unregister a tool
     */
    public unregisterTool(name: string): boolean {
        const tool = this.tools.get(name);
        if (!tool) {
            return false;
        }

        // Cleanup tool if it supports cleanup
        if (tool.cleanup) {
            tool.cleanup().catch(error => {
                console.warn(`[ToolRegistry] Error cleaning up tool ${name}:`, error);
            });
        }

        this.tools.delete(name);
        this.metadata.delete(name);
        this.stats.delete(name);

        // Clear cache entries for this tool
        for (const [key] of this.cache.entries()) {
            if (key.startsWith(`${name}:`)) {
                this.cache.delete(key);
            }
        }

        console.log(`[ToolRegistry] Unregistered tool: ${name}`);
        return true;
    }

    /**
     * Get a tool by name
     */
    public getTool(name: string): Tool | null {
        return this.tools.get(name) || null;
    }

    /**
     * List all registered tools
     */
    public listTools(): ToolMetadata[] {
        return Array.from(this.metadata.values());
    }

    /**
     * Find tools by criteria
     */
    public findTools(criteria: { category?: string; tags?: string[]; name?: string }): ToolMetadata[] {
        const results: ToolMetadata[] = [];

        for (const metadata of this.metadata.values()) {
            let matches = true;

            // Check category
            if (criteria.category && metadata.category !== criteria.category) {
                matches = false;
            }

            // Check tags
            if (criteria.tags && criteria.tags.length > 0) {
                const hasAllTags = criteria.tags.every(tag => metadata.tags.includes(tag));
                if (!hasAllTags) {
                    matches = false;
                }
            }

            // Check name (partial match)
            if (criteria.name && !metadata.name.toLowerCase().includes(criteria.name.toLowerCase())) {
                matches = false;
            }

            if (matches) {
                results.push(metadata);
            }
        }

        return results;
    }

    /**
     * Execute a tool with caching and statistics tracking
     */
    public async executeTool(name: string, params: ToolParams, context?: ToolContext): Promise<ToolResult> {
        const tool = this.tools.get(name);
        if (!tool) {
            return {
                success: false,
                error: `Tool '${name}' not found`,
                metadata: {
                    timestamp: new Date().toISOString()
                }
            };
        }

        const startTime = Date.now();
        let result: ToolResult;

        try {
            // Check cache if enabled
            const cacheKey = this.generateCacheKey(name, params);
            const cached = this.getCachedResult(cacheKey);
            if (cached) {
                console.log(`[ToolRegistry] Using cached result for ${name}`);
                return cached;
            }

            // Validate parameters
            const validation = tool.validate(params);
            if (!validation.valid) {
                return {
                    success: false,
                    error: `Parameter validation failed: ${validation.errors.join(', ')}`,
                    metadata: {
                        timestamp: new Date().toISOString(),
                        toolName: name,
                        validationErrors: validation.errors,
                        validationWarnings: validation.warnings
                    }
                };
            }

            // Check if tool is ready
            if (tool.isReady && !tool.isReady()) {
                return {
                    success: false,
                    error: `Tool '${name}' is not ready`,
                    metadata: {
                        timestamp: new Date().toISOString(),
                        toolName: name
                    }
                };
            }

            // Execute the tool
            console.log(`[ToolRegistry] Executing tool: ${name}`);
            result = await tool.execute(params, context);

            // Cache result if enabled
            const config = tool.getConfig();
            if (config.cacheResults && result.success) {
                this.cacheResult(cacheKey, result, config.cacheTTL || 300000); // 5 minutes default
            }

        } catch (error) {
            console.error(`[ToolRegistry] Error executing tool ${name}:`, error);
            result = {
                success: false,
                error: `Tool execution failed: ${(error as Error).message}`,
                metadata: {
                    timestamp: new Date().toISOString(),
                    toolName: name,
                    executionError: (error as Error).message
                }
            };
        }

        // Update statistics
        const executionTime = Date.now() - startTime;
        this.updateStats(name, result.success, executionTime);

        return result;
    }

    /**
     * Get tool execution statistics
     */
    public getToolStats(name: string): ToolStats | null {
        return this.stats.get(name) || null;
    }

    /**
     * Discover and load tools
     */
    public async discoverTools(): Promise<void> {
        console.log('[ToolRegistry] Discovering tools...');

        try {
            // Load example tools
            await this.loadExampleTools();

            console.log('[ToolRegistry] Tool discovery completed');
        } catch (error) {
            console.warn('[ToolRegistry] Error during tool discovery:', error);
        }
    }

    /**
     * Load example tools
     */
    private async loadExampleTools(): Promise<void> {
        try {
            // Import example tools
            const { TextProcessorTool } = await import('./examples/TextProcessorTool');
            const { DataAnalyzerTool } = await import('./examples/DataAnalyzerTool');
            const { FileManagerTool } = await import('./examples/FileManagerTool');

            // Register example tools
            await this.registerTool(new TextProcessorTool());
            await this.registerTool(new DataAnalyzerTool());
            await this.registerTool(new FileManagerTool());

        } catch (error) {
            console.warn('[ToolRegistry] Failed to load example tools:', error);
        }
    }

    /**
     * Generate cache key for tool execution
     */
    private generateCacheKey(name: string, params: ToolParams): string {
        const paramsHash = JSON.stringify(params, Object.keys(params).sort());
        return `${name}:${Buffer.from(paramsHash).toString('base64')}`;
    }

    /**
     * Get cached result if available and not expired
     */
    private getCachedResult(cacheKey: string): ToolResult | null {
        const entry = this.cache.get(cacheKey);
        if (!entry) {
            return null;
        }

        const now = Date.now();
        if (now - entry.timestamp > entry.ttl) {
            this.cache.delete(cacheKey);
            return null;
        }

        return entry.result;
    }

    /**
     * Cache tool execution result
     */
    private cacheResult(cacheKey: string, result: ToolResult, ttl: number): void {
        this.cache.set(cacheKey, {
            result,
            timestamp: Date.now(),
            ttl
        });

        // Clean up expired entries periodically
        if (this.cache.size % 100 === 0) {
            this.cleanupExpiredCache();
        }
    }

    /**
     * Clean up expired cache entries
     */
    private cleanupExpiredCache(): void {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > entry.ttl) {
                this.cache.delete(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            console.log(`[ToolRegistry] Cleaned up ${cleaned} expired cache entries`);
        }
    }

    /**
     * Update tool execution statistics
     */
    private updateStats(name: string, success: boolean, executionTime: number): void {
        const stats = this.stats.get(name);
        if (!stats) {
            return;
        }

        stats.totalExecutions++;
        stats.lastExecution = new Date();

        if (success) {
            stats.successfulExecutions++;
        } else {
            stats.failedExecutions++;
        }

        // Update average execution time
        const totalTime = stats.averageExecutionTime * (stats.totalExecutions - 1) + executionTime;
        stats.averageExecutionTime = totalTime / stats.totalExecutions;

        // Update error rate
        stats.errorRate = stats.failedExecutions / stats.totalExecutions;

        this.stats.set(name, stats);
    }

    /**
     * Get registry statistics
     */
    public getRegistryStats(): {
        totalTools: number;
        toolsByCategory: Record<string, number>;
        totalExecutions: number;
        cacheSize: number;
        cacheHitRate: number;
    } {
        const stats = {
            totalTools: this.tools.size,
            toolsByCategory: {} as Record<string, number>,
            totalExecutions: 0,
            cacheSize: this.cache.size,
            cacheHitRate: 0
        };

        // Count tools by category
        for (const metadata of this.metadata.values()) {
            stats.toolsByCategory[metadata.category] = (stats.toolsByCategory[metadata.category] || 0) + 1;
        }

        // Calculate total executions
        for (const toolStats of this.stats.values()) {
            stats.totalExecutions += toolStats.totalExecutions;
        }

        return stats;
    }

    /**
     * Clear all tools and reset registry
     */
    public async clear(): Promise<void> {
        console.log('[ToolRegistry] Clearing all tools...');

        // Cleanup all tools
        for (const [name, tool] of this.tools.entries()) {
            if (tool.cleanup) {
                try {
                    await tool.cleanup();
                } catch (error) {
                    console.warn(`[ToolRegistry] Error cleaning up tool ${name}:`, error);
                }
            }
        }

        this.tools.clear();
        this.metadata.clear();
        this.stats.clear();
        this.cache.clear();
        this.initialized = false;

        console.log('[ToolRegistry] Registry cleared');
    }

    /**
     * Export tool schemas for documentation
     */
    public exportSchemas(): Record<string, any> {
        const schemas: Record<string, any> = {};

        for (const [name, metadata] of this.metadata.entries()) {
            schemas[name] = {
                name: metadata.name,
                version: metadata.version,
                description: metadata.description,
                category: metadata.category,
                tags: metadata.tags,
                schema: metadata.schema
            };
        }

        return schemas;
    }

    /**
     * Validate tool chain compatibility
     */
    public validateToolChain(toolNames: string[]): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        for (const toolName of toolNames) {
            if (!this.tools.has(toolName)) {
                errors.push(`Tool '${toolName}' not found`);
            }
        }

        // Additional chain validation logic could be added here
        // For example, checking if output of one tool matches input of next

        return {
            valid: errors.length === 0,
            errors
        };
    }
}

/**
 * Get the singleton tool registry instance
 */
export function getToolRegistry(): ToolRegistry {
    return ToolRegistry.getInstance();
}

/**
 * Initialize the tool registry
 */
export async function initializeToolRegistry(): Promise<ToolRegistry> {
    const registry = ToolRegistry.getInstance();
    await registry.initialize();
    return registry;
} 