"use strict";
/**
 * Tool Registry
 *
 * Centralized registry for tool discovery, registration, and management.
 * Provides caching, statistics tracking, and dynamic loading capabilities.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function (o, m, k, k2) {
    if (k2 === undefined)
        k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function () { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function (o, m, k, k2) {
    if (k2 === undefined)
        k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function (o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function (o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function (o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o)
                if (Object.prototype.hasOwnProperty.call(o, k))
                    ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule)
            return mod;
        var result = {};
        if (mod != null)
            for (var k = ownKeys(mod), i = 0; i < k.length; i++)
                if (k[i] !== "default")
                    __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolRegistry = void 0;
exports.getToolRegistry = getToolRegistry;
exports.initializeToolRegistry = initializeToolRegistry;
/**
 * Tool registry implementation
 */
class ToolRegistry {
    constructor() {
        this.tools = new Map();
        this.metadata = new Map();
        this.stats = new Map();
        this.cache = new Map();
        this.initialized = false;
        console.log('[ToolRegistry] Initializing tool registry');
    }
    /**
     * Get singleton instance
     */
    static getInstance() {
        if (!ToolRegistry.instance) {
            ToolRegistry.instance = new ToolRegistry();
        }
        return ToolRegistry.instance;
    }
    /**
     * Initialize the registry and discover available tools
     */
    async initialize() {
        if (this.initialized) {
            console.log('[ToolRegistry] Already initialized');
            return;
        }
        console.log('[ToolRegistry] Starting tool discovery...');
        try {
            await this.discoverTools();
            this.initialized = true;
            console.log(`[ToolRegistry] Initialized with ${this.tools.size} tools`);
        }
        catch (error) {
            console.error('[ToolRegistry] Initialization failed:', error);
            throw error;
        }
    }
    /**
     * Register a tool instance
     */
    async registerTool(tool) {
        console.log(`[ToolRegistry] Registering tool: ${tool.name}`);
        this.tools.set(tool.name, tool);
        // Initialize the tool if it supports initialization
        if (tool.initialize) {
            try {
                await tool.initialize();
                console.log(`[ToolRegistry] Initialized tool: ${tool.name}`);
            }
            catch (error) {
                console.warn(`[ToolRegistry] Failed to initialize tool ${tool.name}:`, error);
            }
        }
        // Create metadata
        const metadata = {
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
    unregisterTool(name) {
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
    getTool(name) {
        return this.tools.get(name) || null;
    }
    /**
     * List all registered tools
     */
    listTools() {
        return Array.from(this.metadata.values());
    }
    /**
     * Find tools by criteria
     */
    findTools(criteria) {
        const results = [];
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
    async executeTool(name, params, context) {
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
        let result;
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
        }
        catch (error) {
            console.error(`[ToolRegistry] Error executing tool ${name}:`, error);
            result = {
                success: false,
                error: `Tool execution failed: ${error.message}`,
                metadata: {
                    timestamp: new Date().toISOString(),
                    toolName: name,
                    executionError: error.message
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
    getToolStats(name) {
        return this.stats.get(name) || null;
    }
    /**
     * Discover and load tools
     */
    async discoverTools() {
        console.log('[ToolRegistry] Discovering tools...');
        try {
            // Load example tools
            await this.loadExampleTools();
            console.log('[ToolRegistry] Tool discovery completed');
        }
        catch (error) {
            console.warn('[ToolRegistry] Error during tool discovery:', error);
        }
    }
    /**
     * Load example tools
     */
    async loadExampleTools() {
        try {
            // Import example tools
            const { TextProcessorTool } = await Promise.resolve().then(() => __importStar(require('./examples/TextProcessorTool')));
            const { DataAnalyzerTool } = await Promise.resolve().then(() => __importStar(require('./examples/DataAnalyzerTool')));
            const { FileManagerTool } = await Promise.resolve().then(() => __importStar(require('./examples/FileManagerTool')));
            // Register example tools
            await this.registerTool(new TextProcessorTool());
            await this.registerTool(new DataAnalyzerTool());
            await this.registerTool(new FileManagerTool());
        }
        catch (error) {
            console.warn('[ToolRegistry] Failed to load example tools:', error);
        }
    }
    /**
     * Generate cache key for tool execution
     */
    generateCacheKey(name, params) {
        const paramsHash = JSON.stringify(params, Object.keys(params).sort());
        return `${name}:${Buffer.from(paramsHash).toString('base64')}`;
    }
    /**
     * Get cached result if available and not expired
     */
    getCachedResult(cacheKey) {
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
    cacheResult(cacheKey, result, ttl) {
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
    cleanupExpiredCache() {
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
    updateStats(name, success, executionTime) {
        const stats = this.stats.get(name);
        if (!stats) {
            return;
        }
        stats.totalExecutions++;
        stats.lastExecution = new Date();
        if (success) {
            stats.successfulExecutions++;
        }
        else {
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
    getRegistryStats() {
        const stats = {
            totalTools: this.tools.size,
            toolsByCategory: {},
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
    async clear() {
        console.log('[ToolRegistry] Clearing all tools...');
        // Cleanup all tools
        for (const [name, tool] of this.tools.entries()) {
            if (tool.cleanup) {
                try {
                    await tool.cleanup();
                }
                catch (error) {
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
    exportSchemas() {
        const schemas = {};
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
    validateToolChain(toolNames) {
        const errors = [];
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
exports.ToolRegistry = ToolRegistry;
/**
 * Get the singleton tool registry instance
 */
function getToolRegistry() {
    return ToolRegistry.getInstance();
}
/**
 * Initialize the tool registry
 */
async function initializeToolRegistry() {
    const registry = ToolRegistry.getInstance();
    await registry.initialize();
    return registry;
}
//# sourceMappingURL=ToolRegistry.js.map