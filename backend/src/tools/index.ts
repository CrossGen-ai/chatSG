/**
 * Tools System Index
 * 
 * Central export point for all tool system components.
 * Provides convenient access to tools, registry, and utilities.
 */

// Core tool interfaces and classes
export * from './Tool';
export * from './ToolRegistry';

// Example tools
export { TextProcessorTool } from './examples/TextProcessorTool';
export { DataAnalyzerTool } from './examples/DataAnalyzerTool';
export { FileManagerTool } from './examples/FileManagerTool';

// Registry utilities
export { getToolRegistry, initializeToolRegistry } from './ToolRegistry';

/**
 * Initialize the complete tool system
 */
export async function initializeToolSystem(): Promise<{
    registry: any;
    toolCount: number;
    categories: string[];
}> {
    const { initializeToolRegistry } = await import('./ToolRegistry');
    const registry = await initializeToolRegistry();
    
    const tools = registry.listTools();
    const categories = [...new Set(tools.map((tool: any) => tool.category))];
    
    console.log(`[ToolSystem] Initialized with ${tools.length} tools across ${categories.length} categories`);
    
    return {
        registry,
        toolCount: tools.length,
        categories
    };
}

/**
 * Get tool system statistics
 */
export function getToolSystemStats(): {
    isInitialized: boolean;
    stats?: any;
} {
    try {
        const { getToolRegistry } = require('./ToolRegistry');
        const registry = getToolRegistry();
        
        return {
            isInitialized: true,
            stats: registry.getRegistryStats()
        };
    } catch (error) {
        return {
            isInitialized: false
        };
    }
}

/**
 * Execute a tool by name with parameters
 */
export async function executeTool(
    toolName: string, 
    params: Record<string, any>, 
    context?: Record<string, any>
): Promise<any> {
    const { getToolRegistry } = await import('./ToolRegistry');
    const registry = getToolRegistry();
    
    return registry.executeTool(toolName, params, context);
}

/**
 * List available tools with optional filtering
 */
export function listAvailableTools(criteria?: {
    category?: string;
    tags?: string[];
    name?: string;
}): any[] {
    try {
        const { getToolRegistry } = require('./ToolRegistry');
        const registry = getToolRegistry();
        
        if (criteria) {
            return registry.findTools(criteria);
        }
        
        return registry.listTools();
    } catch (error) {
        console.warn('[ToolSystem] Registry not initialized');
        return [];
    }
}

/**
 * Get tool schema for documentation or validation
 */
export function getToolSchema(toolName: string): any | null {
    try {
        const { getToolRegistry } = require('./ToolRegistry');
        const registry = getToolRegistry();
        const tool = registry.getTool(toolName);
        
        return tool ? tool.getSchema() : null;
    } catch (error) {
        console.warn(`[ToolSystem] Failed to get schema for tool: ${toolName}`);
        return null;
    }
}

/**
 * Validate tool parameters before execution
 */
export function validateToolParams(toolName: string, params: Record<string, any>): {
    valid: boolean;
    errors: string[];
    warnings: string[];
} {
    try {
        const { getToolRegistry } = require('./ToolRegistry');
        const registry = getToolRegistry();
        const tool = registry.getTool(toolName);
        
        if (!tool) {
            return {
                valid: false,
                errors: [`Tool '${toolName}' not found`],
                warnings: []
            };
        }
        
        return tool.validate(params);
    } catch (error) {
        return {
            valid: false,
            errors: [`Validation failed: ${(error as Error).message}`],
            warnings: []
        };
    }
} 