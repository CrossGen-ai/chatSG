/**
 * Shared Tools Exports
 * 
 * Central export point for all shared tools that are expensive to initialize
 * and should be shared across all agents.
 */

// Shared tool implementations
export { WebSearchTool } from './WebSearchTool';
export { EnhancedFileManagerTool } from './EnhancedFileManagerTool';
export { DatabaseTool } from './DatabaseTool';
export { GenericWebhookTool } from './GenericWebhookTool';

// Tool registry integration
import { ToolRegistry } from '../../../tools/ToolRegistry';
import { WebSearchTool } from './WebSearchTool';
import { EnhancedFileManagerTool } from './EnhancedFileManagerTool';
import { DatabaseTool } from './DatabaseTool';

/**
 * Initialize and register all shared tools with the ToolRegistry
 */
export async function initializeSharedTools(): Promise<void> {
    console.log('[SharedTools] Initializing shared tools...');
    
    const toolRegistry = ToolRegistry.getInstance();
    
    try {
        // Initialize shared tools (expensive operations done once)
        const webSearchTool = new WebSearchTool();
        const fileManagerTool = new EnhancedFileManagerTool();
        const databaseTool = new DatabaseTool();
        
        // Register tools with the registry
        await toolRegistry.registerTool(webSearchTool);
        await toolRegistry.registerTool(fileManagerTool);
        await toolRegistry.registerTool(databaseTool);
        
        console.log('[SharedTools] Successfully initialized and registered shared tools:');
        console.log('[SharedTools] - WebSearchTool (web search with caching)');
        console.log('[SharedTools] - EnhancedFileManagerTool (file operations with security)');
        console.log('[SharedTools] - DatabaseTool (database with connection pooling)');
        
    } catch (error) {
        console.error('[SharedTools] Failed to initialize shared tools:', error);
        throw error;
    }
}

/**
 * Get available shared tool categories
 */
export function getSharedToolCategories(): string[] {
    return ['web', 'file', 'database'];
}

/**
 * Get shared tool health status
 */
export async function getSharedToolsHealth(): Promise<any> {
    const toolRegistry = ToolRegistry.getInstance();
    
    const tools = [
        { name: 'web-search', tool: toolRegistry.getTool('web-search') },
        { name: 'enhanced-file-manager', tool: toolRegistry.getTool('enhanced-file-manager') },
        { name: 'database', tool: toolRegistry.getTool('database') }
    ];
    
    const healthReport: any = {
        timestamp: new Date().toISOString(),
        overallStatus: 'healthy',
        tools: {}
    };
    
    for (const { name, tool } of tools) {
        if (tool && tool.getHealth) {
            healthReport.tools[name] = tool.getHealth();
        } else {
            healthReport.tools[name] = { status: 'unknown', message: 'Tool not found or no health check' };
        }
    }
    
    // Determine overall status
    const statuses = Object.values(healthReport.tools).map((t: any) => t.status);
    if (statuses.includes('unhealthy')) {
        healthReport.overallStatus = 'unhealthy';
    } else if (statuses.includes('degraded')) {
        healthReport.overallStatus = 'degraded';
    }
    
    return healthReport;
} 