"use strict";
/**
 * Tool System Interface Definitions
 *
 * Comprehensive tool system that enables agents to discover, validate, and execute
 * reusable tools. Builds on existing LLMHelper template system for parameter handling.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseTool = void 0;
/**
 * Abstract base class for tools
 */
class BaseTool {
    constructor(name, version, description, config = { enabled: true }, metadata) {
        this.initialized = false;
        this.name = name;
        this.version = version;
        this.description = description;
        this.config = { timeout: 30000, retries: 0, ...config };
        this.author = metadata?.author;
        this.category = metadata?.category;
        this.tags = metadata?.tags;
    }
    /**
     * Basic parameter validation using schema
     */
    validate(params) {
        try {
            const schema = this.getSchema();
            const errors = [];
            const warnings = [];
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
        }
        catch (error) {
            return {
                valid: false,
                errors: [`Validation error: ${error.message}`],
                warnings: []
            };
        }
    }
    /**
     * Validate individual parameter type
     */
    validateParameterType(value, param) {
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
    getConfig() {
        return { ...this.config };
    }
    async initialize(config) {
        if (config) {
            this.config = { ...this.config, ...config };
        }
        this.initialized = true;
        console.log(`[${this.name}] Tool initialized`);
    }
    async cleanup() {
        this.initialized = false;
        console.log(`[${this.name}] Tool cleaned up`);
    }
    isReady() {
        return this.initialized && this.config.enabled;
    }
    getHealth() {
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
    createSuccessResult(data, message, metadata) {
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
    createErrorResult(error, metadata) {
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
exports.BaseTool = BaseTool;
//# sourceMappingURL=Tool.js.map