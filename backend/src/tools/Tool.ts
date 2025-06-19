/**
 * Tool System Interface Definitions
 * 
 * Comprehensive tool system that enables agents to discover, validate, and execute
 * reusable tools. Builds on existing LLMHelper template system for parameter handling.
 */

import { ValidationResult } from '../types';

/**
 * Tool parameter definition
 */
export interface ToolParameter {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    description: string;
    required: boolean;
    default?: any;
    enum?: any[];
    format?: string; // e.g., 'email', 'url', 'date-time'
    pattern?: string; // regex pattern for string validation
    minimum?: number; // for number types
    maximum?: number; // for number types
    items?: ToolParameter; // for array types
    properties?: Record<string, ToolParameter>; // for object types
}

/**
 * Tool schema definition
 */
export interface ToolSchema {
    name: string;
    description: string;
    parameters: ToolParameter[];
    returns: {
        type: string;
        description: string;
        properties?: Record<string, any>;
    };
    examples?: Array<{
        input: Record<string, any>;
        output: any;
        description: string;
    }>;
}

/**
 * Tool execution parameters
 */
export interface ToolParams {
    [key: string]: any;
}

/**
 * Tool execution result
 */
export interface ToolResult {
    success: boolean;
    data?: any;
    error?: string;
    message?: string;
    metadata?: {
        executionTime?: number;
        toolName?: string;
        toolVersion?: string;
        timestamp?: string;
        [key: string]: any;
    };
}

/**
 * Tool execution context
 */
export interface ToolContext {
    sessionId?: string;
    agentName?: string;
    userId?: string;
    requestId?: string;
    timestamp?: string;
    environment?: string;
    [key: string]: any;
}

/**
 * Tool configuration
 */
export interface ToolConfig {
    enabled: boolean;
    timeout?: number; // execution timeout in milliseconds
    retries?: number; // number of retry attempts
    cacheResults?: boolean;
    cacheTTL?: number; // cache time-to-live in milliseconds
    permissions?: string[]; // required permissions
    rateLimit?: {
        maxCalls: number;
        windowMs: number;
    };
    [key: string]: any;
}

/**
 * Base Tool interface that all tools must implement
 */
export interface Tool {
    /**
     * Tool metadata
     */
    readonly name: string;
    readonly version: string;
    readonly description: string;
    readonly author?: string;
    readonly category?: string;
    readonly tags?: string[];

    /**
     * Get tool schema for validation and documentation
     */
    getSchema(): ToolSchema;

    /**
     * Validate input parameters
     */
    validate(params: ToolParams): ValidationResult;

    /**
     * Execute the tool with given parameters
     */
    execute(params: ToolParams, context?: ToolContext): Promise<ToolResult>;

    /**
     * Get tool configuration
     */
    getConfig(): ToolConfig;

    /**
     * Initialize tool (optional)
     */
    initialize?(config?: ToolConfig): Promise<void>;

    /**
     * Cleanup tool resources (optional)
     */
    cleanup?(): Promise<void>;

    /**
     * Check if tool is available/ready
     */
    isReady?(): boolean;

    /**
     * Get tool health status
     */
    getHealth?(): {
        status: 'healthy' | 'degraded' | 'unhealthy';
        message?: string;
        details?: any;
    };
}

/**
 * Abstract base class for tools
 */
export abstract class BaseTool implements Tool {
    public readonly name: string;
    public readonly version: string;
    public readonly description: string;
    public readonly author?: string;
    public readonly category?: string;
    public readonly tags?: string[];

    protected config: ToolConfig;
    protected initialized: boolean = false;

    constructor(
        name: string,
        version: string,
        description: string,
        config: ToolConfig = { enabled: true },
        metadata?: {
            author?: string;
            category?: string;
            tags?: string[];
        }
    ) {
        this.name = name;
        this.version = version;
        this.description = description;
        this.config = { timeout: 30000, retries: 0, ...config };
        this.author = metadata?.author;
        this.category = metadata?.category;
        this.tags = metadata?.tags;
    }

    abstract getSchema(): ToolSchema;
    abstract execute(params: ToolParams, context?: ToolContext): Promise<ToolResult>;

    /**
     * Basic parameter validation using schema
     */
    validate(params: ToolParams): ValidationResult {
        try {
            const schema = this.getSchema();
            const errors: string[] = [];
            const warnings: string[] = [];

            // Check required parameters
            for (const param of schema.parameters) {
                if (param.required && !(param.name in params)) {
                    errors.push(`Missing required parameter: ${param.name}`);
                    continue;
                }

                const value = params[param.name];
                if (value !== undefined) {
                    // Type validation
                    const validationType = this.validateParameterType(value, param);
                    if (!validationType.valid) {
                        errors.push(`Parameter '${param.name}': ${validationType.error}`);
                    }
                }
            }

            // Check for unknown parameters
            for (const paramName of Object.keys(params)) {
                const paramDef = schema.parameters.find(p => p.name === paramName);
                if (!paramDef) {
                    warnings.push(`Unknown parameter: ${paramName}`);
                }
            }

            return {
                valid: errors.length === 0,
                errors,
                warnings
            };
        } catch (error) {
            return {
                valid: false,
                errors: [`Validation error: ${(error as Error).message}`],
                warnings: []
            };
        }
    }

    /**
     * Validate individual parameter type
     */
    private validateParameterType(value: any, param: ToolParameter): { valid: boolean; error?: string } {
        // Type checking
        switch (param.type) {
            case 'string':
                if (typeof value !== 'string') {
                    return { valid: false, error: `Expected string, got ${typeof value}` };
                }
                if (param.pattern) {
                    const regex = new RegExp(param.pattern);
                    if (!regex.test(value)) {
                        return { valid: false, error: `String does not match pattern: ${param.pattern}` };
                    }
                }
                break;

            case 'number':
                if (typeof value !== 'number' || isNaN(value)) {
                    return { valid: false, error: `Expected number, got ${typeof value}` };
                }
                if (param.minimum !== undefined && value < param.minimum) {
                    return { valid: false, error: `Number ${value} is below minimum ${param.minimum}` };
                }
                if (param.maximum !== undefined && value > param.maximum) {
                    return { valid: false, error: `Number ${value} is above maximum ${param.maximum}` };
                }
                break;

            case 'boolean':
                if (typeof value !== 'boolean') {
                    return { valid: false, error: `Expected boolean, got ${typeof value}` };
                }
                break;

            case 'array':
                if (!Array.isArray(value)) {
                    return { valid: false, error: `Expected array, got ${typeof value}` };
                }
                break;

            case 'object':
                if (typeof value !== 'object' || value === null || Array.isArray(value)) {
                    return { valid: false, error: `Expected object, got ${typeof value}` };
                }
                break;
        }

        // Enum validation
        if (param.enum && !param.enum.includes(value)) {
            return { valid: false, error: `Value must be one of: ${param.enum.join(', ')}` };
        }

        return { valid: true };
    }

    getConfig(): ToolConfig {
        return { ...this.config };
    }

    async initialize(config?: ToolConfig): Promise<void> {
        if (config) {
            this.config = { ...this.config, ...config };
        }
        this.initialized = true;
        console.log(`[${this.name}] Tool initialized`);
    }

    async cleanup(): Promise<void> {
        this.initialized = false;
        console.log(`[${this.name}] Tool cleaned up`);
    }

    isReady(): boolean {
        return this.initialized && this.config.enabled;
    }

    getHealth(): { status: 'healthy' | 'degraded' | 'unhealthy'; message?: string } {
        if (!this.config.enabled) {
            return { status: 'unhealthy', message: 'Tool is disabled' };
        }
        if (!this.initialized) {
            return { status: 'unhealthy', message: 'Tool is not initialized' };
        }
        return { status: 'healthy' };
    }

    /**
     * Helper method to create successful result
     */
    protected createSuccessResult(data: any, message?: string, metadata?: any): ToolResult {
        return {
            success: true,
            data,
            message,
            metadata: {
                executionTime: Date.now(),
                toolName: this.name,
                toolVersion: this.version,
                timestamp: new Date().toISOString(),
                ...metadata
            }
        };
    }

    /**
     * Helper method to create error result
     */
    protected createErrorResult(error: string, metadata?: any): ToolResult {
        return {
            success: false,
            error,
            metadata: {
                executionTime: Date.now(),
                toolName: this.name,
                toolVersion: this.version,
                timestamp: new Date().toISOString(),
                ...metadata
            }
        };
    }
}

/**
 * Tool metadata for registry
 */
export interface ToolMetadata {
    name: string;
    version: string;
    description: string;
    category: string;
    tags: string[];
    author?: string;
    schema: ToolSchema;
    config: ToolConfig;
    isLoaded: boolean;
    loadPath?: string;
    lastUsed?: Date;
    usageCount?: number;
}

/**
 * Tool execution statistics
 */
export interface ToolStats {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
    lastExecution?: Date;
    errorRate: number;
}

/**
 * Tool registry interface
 */
export interface ToolRegistryInterface {
    registerTool(tool: Tool): Promise<void>;
    unregisterTool(name: string): boolean;
    getTool(name: string): Tool | null;
    listTools(): ToolMetadata[];
    findTools(criteria: { category?: string; tags?: string[]; name?: string }): ToolMetadata[];
    executeTool(name: string, params: ToolParams, context?: ToolContext): Promise<ToolResult>;
    getToolStats(name: string): ToolStats | null;
    discoverTools(): Promise<void>;
} 