"use strict";
/**
 * Tools System Index
 *
 * Central export point for all tool system components.
 * Provides convenient access to tools, registry, and utilities.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeToolRegistry = exports.getToolRegistry = exports.FileManagerTool = exports.DataAnalyzerTool = exports.TextProcessorTool = void 0;
exports.initializeToolSystem = initializeToolSystem;
exports.getToolSystemStats = getToolSystemStats;
exports.executeTool = executeTool;
exports.listAvailableTools = listAvailableTools;
exports.getToolSchema = getToolSchema;
exports.validateToolParams = validateToolParams;
// Core tool interfaces and classes
__exportStar(require("./Tool"), exports);
__exportStar(require("./ToolRegistry"), exports);
// Example tools
var TextProcessorTool_1 = require("./examples/TextProcessorTool");
Object.defineProperty(exports, "TextProcessorTool", { enumerable: true, get: function () { return TextProcessorTool_1.TextProcessorTool; } });
var DataAnalyzerTool_1 = require("./examples/DataAnalyzerTool");
Object.defineProperty(exports, "DataAnalyzerTool", { enumerable: true, get: function () { return DataAnalyzerTool_1.DataAnalyzerTool; } });
var FileManagerTool_1 = require("./examples/FileManagerTool");
Object.defineProperty(exports, "FileManagerTool", { enumerable: true, get: function () { return FileManagerTool_1.FileManagerTool; } });
// Registry utilities
var ToolRegistry_1 = require("./ToolRegistry");
Object.defineProperty(exports, "getToolRegistry", { enumerable: true, get: function () { return ToolRegistry_1.getToolRegistry; } });
Object.defineProperty(exports, "initializeToolRegistry", { enumerable: true, get: function () { return ToolRegistry_1.initializeToolRegistry; } });
/**
 * Initialize the complete tool system
 */
async function initializeToolSystem() {
    const { initializeToolRegistry } = await Promise.resolve().then(() => __importStar(require('./ToolRegistry')));
    const registry = await initializeToolRegistry();
    const tools = registry.listTools();
    const categories = [...new Set(tools.map((tool) => tool.category))];
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
function getToolSystemStats() {
    try {
        const { getToolRegistry } = require('./ToolRegistry');
        const registry = getToolRegistry();
        return {
            isInitialized: true,
            stats: registry.getRegistryStats()
        };
    }
    catch (error) {
        return {
            isInitialized: false
        };
    }
}
/**
 * Execute a tool by name with parameters
 */
async function executeTool(toolName, params, context) {
    const { getToolRegistry } = await Promise.resolve().then(() => __importStar(require('./ToolRegistry')));
    const registry = getToolRegistry();
    return registry.executeTool(toolName, params, context);
}
/**
 * List available tools with optional filtering
 */
function listAvailableTools(criteria) {
    try {
        const { getToolRegistry } = require('./ToolRegistry');
        const registry = getToolRegistry();
        if (criteria) {
            return registry.findTools(criteria);
        }
        return registry.listTools();
    }
    catch (error) {
        console.warn('[ToolSystem] Registry not initialized');
        return [];
    }
}
/**
 * Get tool schema for documentation or validation
 */
function getToolSchema(toolName) {
    try {
        const { getToolRegistry } = require('./ToolRegistry');
        const registry = getToolRegistry();
        const tool = registry.getTool(toolName);
        return tool ? tool.getSchema() : null;
    }
    catch (error) {
        console.warn(`[ToolSystem] Failed to get schema for tool: ${toolName}`);
        return null;
    }
}
/**
 * Validate tool parameters before execution
 */
function validateToolParams(toolName, params) {
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
    }
    catch (error) {
        return {
            valid: false,
            errors: [`Validation failed: ${error.message}`],
            warnings: []
        };
    }
}
//# sourceMappingURL=index.js.map