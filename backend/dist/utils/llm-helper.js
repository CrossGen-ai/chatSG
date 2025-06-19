"use strict";
const { ChatOpenAI } = require('@langchain/openai');
const fs = require('fs');
const path = require('path');
/**
 * LLM Helper Utility
 * Enhanced with tool integration capabilities, function calling support, and provider abstraction
 * Provides centralized LLM configuration for different environments and providers
 * Supports: OpenAI, Azure OpenAI, and future providers
 */
class LLMHelper {
    constructor() {
        this.provider = this.detectProvider();
        this.config = this.buildConfiguration();
        this.agentConfigs = new Map(); // Cache for agent configurations
        this.registeredTools = new Map(); // Tool registry for this instance
        this.toolRegistry = null; // Reference to global tool registry
        console.log(`[LLMHelper] Initialized with provider: ${this.provider}`);
    }
    /**
     * Detect which LLM provider to use based on environment variables
     */
    detectProvider() {
        // Check for Azure OpenAI configuration
        if (process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT) {
            return 'azure';
        }
        // Check for regular OpenAI configuration
        if (process.env.OPENAI_API_KEY) {
            return 'openai';
        }
        // Default to OpenAI if no specific configuration found
        console.warn('[LLMHelper] No specific LLM configuration found, defaulting to OpenAI');
        return 'openai';
    }
    /**
     * Build configuration object based on detected provider
     */
    buildConfiguration() {
        const environment = process.env.ENVIRONMENT || process.env.NODE_ENV || 'development';
        switch (this.provider) {
            case 'azure':
                return this.buildAzureConfig(environment);
            case 'openai':
                return this.buildOpenAIConfig(environment);
            default:
                throw new Error(`Unsupported LLM provider: ${this.provider}`);
        }
    }
    /**
     * Build Azure OpenAI configuration
     */
    buildAzureConfig(environment) {
        const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-001';
        const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview';
        return {
            provider: 'azure',
            environment: environment,
            modelName: deployment,
            openAIApiKey: process.env.AZURE_OPENAI_API_KEY,
            configuration: {
                baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${deployment}`,
                defaultQuery: { 'api-version': apiVersion },
                defaultHeaders: {
                    'api-key': process.env.AZURE_OPENAI_API_KEY,
                },
            },
            temperature: this.getTemperature(environment),
            maxTokens: this.getMaxTokens(environment),
            metadata: {
                endpoint: process.env.AZURE_OPENAI_ENDPOINT,
                deployment: deployment,
                apiVersion: apiVersion,
            },
            supportsFunctionCalling: true,
            supportsStructuredOutput: this.checkStructuredOutputSupport(deployment)
        };
    }
    /**
     * Build regular OpenAI configuration
     */
    buildOpenAIConfig(environment) {
        const model = process.env.OPENAI_MODEL || 'gpt-4o';
        return {
            provider: 'openai',
            environment: environment,
            modelName: model,
            openAIApiKey: process.env.OPENAI_API_KEY,
            configuration: {
                baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
            },
            temperature: this.getTemperature(environment),
            maxTokens: this.getMaxTokens(environment),
            metadata: {
                model: model,
                baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
            },
            supportsFunctionCalling: true,
            supportsStructuredOutput: this.checkStructuredOutputSupport(model)
        };
    }
    /**
     * Check if the model supports structured output (JSON Schema mode)
     */
    checkStructuredOutputSupport(modelName) {
        const supportedModels = [
            'gpt-4o', 'gpt-4o-mini', 'gpt-4o-2024-08-06', 'gpt-4o-2024-11-20',
            'o1', 'o1-mini', 'o1-preview', 'o3', 'o4-mini'
        ];
        return supportedModels.some(supported => modelName.includes(supported));
    }
    /**
     * Get temperature setting based on environment
     */
    getTemperature(environment) {
        const envTemp = parseFloat(process.env.LLM_TEMPERATURE);
        if (!isNaN(envTemp))
            return envTemp;
        // Default temperatures by environment
        switch (environment) {
            case 'production':
                return 0.3; // More conservative for production
            case 'development':
            case 'dev':
                return 0.7; // More creative for development
            default:
                return 0.5; // Balanced default
        }
    }
    /**
     * Get max tokens setting based on environment
     */
    getMaxTokens(environment) {
        const envTokens = parseInt(process.env.LLM_MAX_TOKENS);
        if (!isNaN(envTokens))
            return envTokens;
        // Default max tokens by environment
        switch (environment) {
            case 'production':
                return 2000; // Conservative for production costs
            case 'development':
            case 'dev':
                return 4000; // More generous for development
            default:
                return 3000; // Balanced default
        }
    }
    /**
     * Create a configured ChatOpenAI instance
     */
    createChatLLM(overrides = {}) {
        const config = { ...this.config, ...overrides };
        console.log(`[LLMHelper] Creating ChatLLM with provider: ${config.provider}, model: ${config.modelName}`);
        return new ChatOpenAI({
            modelName: config.modelName,
            openAIApiKey: config.openAIApiKey,
            configuration: config.configuration,
            temperature: config.temperature,
            maxTokens: config.maxTokens,
            ...overrides
        });
    }
    /**
     * Enhanced Tool Integration Methods
     * Provides comprehensive tool integration capabilities for LLM function calling
     */
    /**
     * Register a tool for use with this LLM instance
     * @param {Object} tool - Tool object conforming to Tool interface
     * @returns {boolean} Success status
     */
    registerTool(tool) {
        try {
            if (!tool || !tool.name) {
                throw new Error('Tool must have a name property');
            }
            // Validate tool structure
            if (typeof tool.getSchema !== 'function') {
                throw new Error('Tool must implement getSchema() method');
            }
            if (typeof tool.execute !== 'function') {
                throw new Error('Tool must implement execute() method');
            }
            this.registeredTools.set(tool.name, tool);
            console.log(`[LLMHelper] Registered tool: ${tool.name}`);
            return true;
        }
        catch (error) {
            console.error(`[LLMHelper] Failed to register tool: ${error.message}`);
            return false;
        }
    }
    /**
     * Get all available tools registered with this instance
     * @returns {Array} Array of tool metadata
     */
    getAvailableTools(agentType = 'default') {
        const tools = [];
        // Add locally registered tools
        for (const tool of this.registeredTools.values()) {
            tools.push({
                name: tool.name,
                description: tool.description,
                schema: tool.getSchema(),
                source: 'local'
            });
        }
        // Add tools from global tool system if available
        try {
            const toolSystem = require('../dist/src/tools');
            const globalTools = toolSystem.listAvailableTools();
            for (const globalTool of globalTools) {
                tools.push({
                    ...globalTool,
                    source: 'global'
                });
            }
            console.log(`[LLMHelper] Found ${tools.length} available tools (${this.registeredTools.size} local, ${globalTools.length} global) for agent: ${agentType}`);
        }
        catch (error) {
            console.warn(`[LLMHelper] Global tool system not available: ${error.message}`);
        }
        return tools;
    }
    /**
     * Convert tools to OpenAI function calling format
     * @param {Array} tools - Array of tools to convert
     * @returns {Array} Array of OpenAI function schemas
     */
    convertToolsToOpenAIFormat(tools) {
        return tools.map(tool => {
            const schema = tool.schema || tool.getSchema();
            return {
                type: 'function',
                function: {
                    name: schema.name,
                    description: schema.description,
                    parameters: this.convertParametersToJSONSchema(schema.parameters)
                }
            };
        });
    }
    /**
     * Convert tool parameters to JSON Schema format
     * @param {Array} parameters - Tool parameters
     * @returns {Object} JSON Schema object
     */
    convertParametersToJSONSchema(parameters) {
        const properties = {};
        const required = [];
        for (const param of parameters) {
            properties[param.name] = {
                type: param.type,
                description: param.description
            };
            // Add additional constraints
            if (param.enum)
                properties[param.name].enum = param.enum;
            if (param.format)
                properties[param.name].format = param.format;
            if (param.pattern)
                properties[param.name].pattern = param.pattern;
            if (param.minimum !== undefined)
                properties[param.name].minimum = param.minimum;
            if (param.maximum !== undefined)
                properties[param.name].maximum = param.maximum;
            // Handle array and object types
            if (param.type === 'array' && param.items) {
                properties[param.name].items = this.convertParametersToJSONSchema([param.items]);
            }
            if (param.type === 'object' && param.properties) {
                const nestedParams = Object.entries(param.properties).map(([name, prop]) => ({
                    name,
                    ...prop
                }));
                properties[param.name].properties = this.convertParametersToJSONSchema(nestedParams).properties;
            }
            if (param.required) {
                required.push(param.name);
            }
        }
        return {
            type: 'object',
            properties,
            required
        };
    }
    /**
     * Create an LLM instance with tools bound for function calling
     * @param {Array} tools - Tools to bind (can be tool objects or tool names)
     * @param {Object} options - Configuration options
     * @returns {Object} ChatOpenAI instance with tools bound
     */
    createLLMWithTools(tools = [], options = {}) {
        const { toolChoice = 'auto', parallelToolCalls = true, strict = false, ...llmOptions } = options;
        // Resolve tool objects from names if needed
        const resolvedTools = this.resolveTools(tools);
        if (resolvedTools.length === 0) {
            console.warn('[LLMHelper] No tools provided or resolved');
            return this.createChatLLM(llmOptions);
        }
        // Check function calling support
        if (!this.config.supportsFunctionCalling) {
            console.warn(`[LLMHelper] Provider ${this.config.provider} does not support function calling`);
            return this.createChatLLM(llmOptions);
        }
        const llm = this.createChatLLM(llmOptions);
        try {
            // Convert tools to OpenAI format
            const openAITools = this.convertToolsToOpenAIFormat(resolvedTools);
            console.log(`[LLMHelper] Binding ${openAITools.length} tools to LLM with choice: ${toolChoice}`);
            return llm.bind_tools(openAITools, {
                tool_choice: toolChoice,
                parallel_tool_calls: parallelToolCalls,
                strict: strict
            });
        }
        catch (error) {
            console.error(`[LLMHelper] Failed to bind tools: ${error.message}`);
            return llm;
        }
    }
    /**
     * Invoke LLM with tools and handle function calling
     * @param {Array} messages - Chat messages
     * @param {Array} tools - Tools to make available
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} LLM response with tool execution results
     */
    async invokeLLMWithTools(messages, tools = [], options = {}) {
        const { executeTools = true, maxToolCalls = 5, toolExecutionContext = {}, ...llmOptions } = options;
        try {
            const llmWithTools = this.createLLMWithTools(tools, llmOptions);
            console.log(`[LLMHelper] Invoking LLM with ${tools.length} tools available`);
            const response = await llmWithTools.invoke(messages);
            // Handle tool calls if present
            if (response.tool_calls && response.tool_calls.length > 0 && executeTools) {
                console.log(`[LLMHelper] Processing ${response.tool_calls.length} tool calls`);
                const toolResults = await this.executeToolCalls(response.tool_calls, toolExecutionContext, maxToolCalls);
                return {
                    message: response,
                    toolCalls: response.tool_calls,
                    toolResults: toolResults,
                    hasToolCalls: true
                };
            }
            return {
                message: response,
                toolCalls: [],
                toolResults: [],
                hasToolCalls: false
            };
        }
        catch (error) {
            console.error(`[LLMHelper] Error in LLM tool invocation: ${error.message}`);
            throw error;
        }
    }
    /**
     * Execute tool calls from LLM response
     * @param {Array} toolCalls - Tool calls from LLM
     * @param {Object} context - Execution context
     * @param {number} maxCalls - Maximum number of tool calls to execute
     * @returns {Promise<Array>} Tool execution results
     */
    async executeToolCalls(toolCalls, context = {}, maxCalls = 5) {
        const results = [];
        const callsToExecute = toolCalls.slice(0, maxCalls);
        for (const toolCall of callsToExecute) {
            try {
                const { name, args } = toolCall;
                console.log(`[LLMHelper] Executing tool call: ${name}`);
                const result = await this.executeTool(name, args, {
                    ...context,
                    toolCallId: toolCall.id,
                    timestamp: new Date().toISOString()
                });
                results.push({
                    toolCall,
                    result,
                    success: result.success
                });
            }
            catch (error) {
                console.error(`[LLMHelper] Tool execution failed for ${toolCall.name}: ${error.message}`);
                results.push({
                    toolCall,
                    result: {
                        success: false,
                        error: error.message,
                        metadata: { timestamp: new Date().toISOString() }
                    },
                    success: false
                });
            }
        }
        return results;
    }
    /**
     * Resolve tool references to tool objects
     * @param {Array} tools - Mix of tool objects and tool names
     * @returns {Array} Array of resolved tool objects
     */
    resolveTools(tools) {
        const resolved = [];
        for (const tool of tools) {
            if (typeof tool === 'string') {
                // Tool name - resolve from registry
                const localTool = this.registeredTools.get(tool);
                if (localTool) {
                    resolved.push(localTool);
                    continue;
                }
                // Try global tool system
                try {
                    const toolSystem = require('../dist/src/tools');
                    const globalTool = toolSystem.getTool(tool);
                    if (globalTool) {
                        resolved.push(globalTool);
                        continue;
                    }
                }
                catch (error) {
                    // Global tool system not available
                }
                console.warn(`[LLMHelper] Tool not found: ${tool}`);
            }
            else if (tool && typeof tool === 'object') {
                // Tool object - use directly
                resolved.push(tool);
            }
        }
        return resolved;
    }
    /**
     * Get current configuration info
     */
    getConfigInfo() {
        return {
            provider: this.provider,
            environment: this.config.environment,
            model: this.config.modelName,
            temperature: this.config.temperature,
            maxTokens: this.config.maxTokens,
            metadata: this.config.metadata,
            capabilities: {
                supportsFunctionCalling: this.config.supportsFunctionCalling,
                supportsStructuredOutput: this.config.supportsStructuredOutput,
                supportsStreaming: true,
                supportsAsyncInvocation: true
            },
            toolIntegration: {
                localToolsRegistered: this.registeredTools.size,
                availableTools: this.getAvailableTools().length,
                toolSystemInitialized: this.getToolSystemStats().isInitialized
            }
        };
    }
    /**
     * Validate current configuration
     */
    validateConfiguration() {
        const errors = [];
        switch (this.provider) {
            case 'azure':
                if (!process.env.AZURE_OPENAI_API_KEY) {
                    errors.push('AZURE_OPENAI_API_KEY is required for Azure provider');
                }
                if (!process.env.AZURE_OPENAI_ENDPOINT) {
                    errors.push('AZURE_OPENAI_ENDPOINT is required for Azure provider');
                }
                break;
            case 'openai':
                if (!process.env.OPENAI_API_KEY) {
                    errors.push('OPENAI_API_KEY is required for OpenAI provider');
                }
                break;
        }
        return {
            valid: errors.length === 0,
            errors: errors,
            provider: this.provider,
        };
    }
    /**
     * Validate configuration with Zod schemas (enhanced validation)
     * @param {Object} config - Configuration to validate
     * @param {string} type - Type of validation ('llm' or 'agent')
     * @param {string} context - Context for error reporting
     * @returns {Object} Validation result with enhanced error reporting
     */
    validateConfigWithSchema(config, type = 'llm', context = '') {
        try {
            // Try to import and use Zod validation if available
            const { getConfigurationManager } = require('../dist/src/config/manager');
            const configManager = getConfigurationManager();
            const result = configManager.validateConfigurationWithDetails(config, type, context);
            // Convert to legacy format for backward compatibility
            return {
                valid: result.valid,
                errors: result.errors,
                warnings: result.warnings || [],
                provider: type === 'llm' ? config.provider : undefined,
                enhanced: true, // Flag to indicate enhanced validation was used
            };
        }
        catch (error) {
            // Fallback to legacy validation if Zod/TypeScript is not available
            console.warn('[LLMHelper] Enhanced validation not available, falling back to legacy validation');
            if (type === 'llm') {
                return this.validateConfiguration();
            }
            else {
                const isValid = this.validateAgentConfig(config, context);
                return {
                    valid: isValid,
                    errors: isValid ? [] : ['Agent configuration validation failed'],
                    enhanced: false,
                };
            }
        }
    }
    /**
     * Load agent configuration from JSON file
     * @param {string} agentType - The agent type (e.g., 'AgentZero', 'CodeAssistant')
     * @returns {Object|null} The agent configuration object or null if not found
     */
    loadAgentConfig(agentType) {
        // Check cache first
        if (this.agentConfigs.has(agentType)) {
            console.log(`[LLMHelper] Using cached config for agent: ${agentType}`);
            return this.agentConfigs.get(agentType);
        }
        try {
            // Construct file path: backend/agent/{agentType}/llm-config.json
            const configPath = path.join(__dirname, '..', 'agent', agentType, 'llm-config.json');
            console.log(`[LLMHelper] Loading config for agent: ${agentType} from ${configPath}`);
            // Check if file exists
            if (!fs.existsSync(configPath)) {
                console.warn(`[LLMHelper] Config file not found for agent: ${agentType} at ${configPath}`);
                return null;
            }
            // Read and parse JSON file
            const configData = fs.readFileSync(configPath, 'utf8');
            const config = JSON.parse(configData);
            // Validate configuration
            if (!this.validateAgentConfig(config, agentType)) {
                console.error(`[LLMHelper] Invalid config structure for agent: ${agentType}`);
                return null;
            }
            // Cache the configuration
            this.agentConfigs.set(agentType, config);
            console.log(`[LLMHelper] Successfully loaded and cached config for agent: ${agentType}`);
            return config;
        }
        catch (error) {
            if (error instanceof SyntaxError) {
                console.error(`[LLMHelper] JSON parsing error for agent ${agentType}: ${error.message}`);
            }
            else {
                console.error(`[LLMHelper] Error loading config for agent ${agentType}: ${error.message}`);
            }
            return null;
        }
    }
    /**
     * Validate agent configuration structure
     * @param {Object} config - The configuration object to validate
     * @param {string} agentType - The agent type for logging
     * @returns {boolean} True if valid, false otherwise
     */
    validateAgentConfig(config, agentType) {
        try {
            // Check required top-level properties
            const requiredProps = ['agentInfo', 'prompts', 'templateVariables', 'metadata'];
            for (const prop of requiredProps) {
                if (!config[prop]) {
                    console.error(`[LLMHelper] Missing required property '${prop}' in config for agent: ${agentType}`);
                    return false;
                }
            }
            // Check agentInfo structure
            if (!config.agentInfo.name || !config.agentInfo.version) {
                console.error(`[LLMHelper] Invalid agentInfo structure for agent: ${agentType}`);
                return false;
            }
            // Check prompts structure
            if (!config.prompts.system || !config.prompts.customInstructions || !config.prompts.userTemplates) {
                console.error(`[LLMHelper] Invalid prompts structure for agent: ${agentType}`);
                return false;
            }
            // Check metadata (support both schemaVersion and schema_version)
            if (!config.metadata.schemaVersion && !config.metadata.schema_version) {
                console.error(`[LLMHelper] Missing schemaVersion or schema_version in metadata for agent: ${agentType}`);
                return false;
            }
            console.log(`[LLMHelper] Config validation passed for agent: ${agentType}`);
            return true;
        }
        catch (error) {
            console.error(`[LLMHelper] Config validation error for agent ${agentType}: ${error.message}`);
            return false;
        }
    }
    /**
     * Get agent configuration with fallback to cached or default
     * @param {string} agentType - The agent type
     * @returns {Object|null} The agent configuration or null
     */
    getAgentConfig(agentType) {
        // Try to load from cache or file
        let config = this.agentConfigs.get(agentType);
        if (!config) {
            config = this.loadAgentConfig(agentType);
        }
        return config;
    }
    /**
     * Clear agent configuration cache
     * @param {string} agentType - Optional specific agent type to clear, or all if not provided
     */
    clearAgentConfigCache(agentType = null) {
        if (agentType) {
            this.agentConfigs.delete(agentType);
            console.log(`[LLMHelper] Cleared cache for agent: ${agentType}`);
        }
        else {
            this.agentConfigs.clear();
            console.log(`[LLMHelper] Cleared all agent config cache`);
        }
    }
    /**
     * Get agent prompt using property-based selection with dot notation
     * @param {string} agentType - The base agent type (e.g., 'AgentZero')
     * @param {string} promptPath - Dot notation path (e.g., 'system.analytical', 'customInstructions.sessionContext')
     * @param {Object} context - Context for template variable substitution
     * @returns {string} The resolved prompt or empty string if not found
     */
    getAgentPrompt(agentType, promptPath, context = {}) {
        try {
            const agentConfig = this.getAgentConfig(agentType);
            if (!agentConfig || !agentConfig.prompts) {
                console.warn(`[LLMHelper] No config or prompts found for agent: ${agentType}`);
                return '';
            }
            // Navigate the prompt path using dot notation
            const pathParts = promptPath.split('.');
            let currentObj = agentConfig.prompts;
            for (const part of pathParts) {
                if (currentObj && typeof currentObj === 'object' && currentObj[part] !== undefined) {
                    currentObj = currentObj[part];
                }
                else {
                    console.warn(`[LLMHelper] Prompt path not found: ${promptPath} for agent: ${agentType}`);
                    return '';
                }
            }
            // If we found a string, perform template substitution
            if (typeof currentObj === 'string') {
                const substitutedPrompt = this.substituteTemplateVariables(currentObj, context);
                console.log(`[LLMHelper] Retrieved prompt from path: ${agentType}.${promptPath}`);
                return substitutedPrompt;
            }
            console.warn(`[LLMHelper] Prompt path does not resolve to string: ${promptPath} for agent: ${agentType}`);
            return '';
        }
        catch (error) {
            console.error(`[LLMHelper] Error retrieving prompt ${promptPath} for agent ${agentType}: ${error.message}`);
            return '';
        }
    }
    /**
     * Substitute template variables in prompt strings
     * @param {string} prompt - The prompt string with template variables
     * @param {Object} context - Context object containing variable values
     * @returns {string} The prompt with substituted variables
     */
    substituteTemplateVariables(prompt, context = {}) {
        if (!prompt || typeof prompt !== 'string') {
            return prompt;
        }
        try {
            // Define default context values
            const defaultContext = {
                sessionId: context.sessionId || 'session_' + Date.now(),
                timestamp: context.timestamp || new Date().toISOString(),
                userPreferences: context.userPreferences || '',
                currentTask: context.currentTask || '',
                mode: context.mode || 'default',
                userInput: context.userInput || '',
                customInstructions: context.customInstructions || ''
            };
            // Merge provided context with defaults
            const fullContext = { ...defaultContext, ...context };
            // Replace template variables using regex
            let result = prompt;
            for (const [key, value] of Object.entries(fullContext)) {
                const regex = new RegExp(`\\{${key}\\}`, 'g');
                result = result.replace(regex, value || '');
            }
            return result;
        }
        catch (error) {
            console.error(`[LLMHelper] Error substituting template variables: ${error.message}`);
            return prompt; // Return original prompt if substitution fails
        }
    }
    /**
     * Parse agent type with property path support
     * @param {string} agentTypeOrPath - Either 'agentType' or 'agentType.property.path'
     * @returns {Object} { agentType, promptPath } parsed components
     */
    parseAgentPath(agentTypeOrPath) {
        if (!agentTypeOrPath || typeof agentTypeOrPath !== 'string') {
            return { agentType: 'default', promptPath: null };
        }
        const parts = agentTypeOrPath.split('.');
        const agentType = parts[0];
        const promptPath = parts.length > 1 ? parts.slice(1).join('.') : null;
        return { agentType, promptPath };
    }
    /**
     * Get system prompt based on agent type and environment
     * Supports both legacy format ('agentZero') and property-based selection ('agentZero.analytical')
     */
    getSystemPrompt(agentTypeOrPath = 'default', context = {}) {
        const { agentType, promptPath } = this.parseAgentPath(agentTypeOrPath);
        let basePrompt;
        // If property path is specified, use property-based selection
        if (promptPath) {
            basePrompt = this.getAgentPrompt(agentType, `system.${promptPath}`, context);
            // If property-based selection fails, fall back to default system prompt
            if (!basePrompt) {
                console.warn(`[LLMHelper] Property-based selection failed, falling back to default for: ${agentTypeOrPath}`);
                basePrompt = this.getBaseSystemPrompt(agentType);
            }
        }
        else {
            // Legacy behavior - get base system prompt
            basePrompt = this.getBaseSystemPrompt(agentType);
        }
        // Apply template substitution to base prompt if not already done
        if (basePrompt && !promptPath) {
            basePrompt = this.substituteTemplateVariables(basePrompt, context);
        }
        // Get environment context and custom instructions
        const environmentContext = this.getEnvironmentContext();
        const customContext = context.customInstructions || '';
        // Apply template substitution to custom context
        const processedCustomContext = this.substituteTemplateVariables(customContext, context);
        return [
            basePrompt,
            environmentContext,
            processedCustomContext
        ].filter(Boolean).join('\n\n');
    }
    /**
     * Get base system prompt for different agent types
     * First attempts to load from agent config file, falls back to hardcoded prompts
     */
    getBaseSystemPrompt(agentType) {
        // Try to load from agent configuration file first
        const agentConfig = this.getAgentConfig(agentType);
        if (agentConfig && agentConfig.prompts && agentConfig.prompts.system) {
            // Use default system prompt from config, or specific variant if available
            const systemPrompts = agentConfig.prompts.system;
            if (typeof systemPrompts === 'string') {
                console.log(`[LLMHelper] Using config-based system prompt for agent: ${agentType}`);
                return systemPrompts;
            }
            else if (systemPrompts.default) {
                console.log(`[LLMHelper] Using config-based default system prompt for agent: ${agentType}`);
                return systemPrompts.default;
            }
        }
        // Fallback to hardcoded prompts for backward compatibility
        console.log(`[LLMHelper] Using fallback hardcoded prompt for agent: ${agentType}`);
        const prompts = {
            default: "You are a helpful AI assistant. Provide accurate, thoughtful responses while maintaining context across the conversation.",
            agentZero: "You are AgentZero, a sophisticated AI assistant with persistent memory. You maintain context across conversations and provide detailed, accurate responses. You can help with a wide range of tasks including analysis, coding, writing, and problem-solving.",
            codeAssistant: "You are a coding assistant. Help users with programming tasks, code review, debugging, and technical explanations. Provide clear, well-commented code examples and explain your reasoning.",
            analyst: "You are a data analyst and researcher. Help users analyze information, identify patterns, and provide insights. Be thorough in your analysis and cite sources when possible."
        };
        return prompts[agentType] || prompts.default;
    }
    /**
     * Get environment-specific context
     */
    getEnvironmentContext() {
        const environment = this.config.environment;
        switch (environment) {
            case 'production':
                return "You are running in production mode. Provide reliable, well-tested responses.";
            case 'development':
            case 'dev':
                return "You are running in development mode. Feel free to be more experimental and provide detailed explanations.";
            default:
                return "";
        }
    }
    /**
     * Tool Integration Methods
     * Provides integration with the tool system for enhanced LLM capabilities
     */
    /**
     * Execute a tool with parameters
     * @param {string} toolName - Name of the tool to execute
     * @param {Object} params - Parameters for the tool
     * @param {Object} context - Execution context
     * @returns {Promise<Object>} Tool execution result
     */
    async executeTool(toolName, params = {}, context = {}) {
        try {
            const toolSystem = require('../dist/src/tools');
            // Add LLM context to tool execution
            const toolContext = {
                ...context,
                llmProvider: this.config.provider,
                environment: this.config.environment,
                timestamp: new Date().toISOString()
            };
            console.log(`[LLMHelper] Executing tool: ${toolName}`);
            const result = await toolSystem.executeTool(toolName, params, toolContext);
            if (result.success) {
                console.log(`[LLMHelper] Tool execution successful: ${toolName}`);
            }
            else {
                console.warn(`[LLMHelper] Tool execution failed: ${toolName} - ${result.error}`);
            }
            return result;
        }
        catch (error) {
            console.error(`[LLMHelper] Tool execution error: ${error.message}`);
            return {
                success: false,
                error: `Tool execution failed: ${error.message}`,
                metadata: {
                    toolName,
                    timestamp: new Date().toISOString()
                }
            };
        }
    }
    /**
     * Validate tool parameters before execution
     * @param {string} toolName - Name of the tool
     * @param {Object} params - Parameters to validate
     * @returns {Object} Validation result
     */
    validateToolParams(toolName, params = {}) {
        try {
            const toolSystem = require('../dist/src/tools');
            return toolSystem.validateToolParams(toolName, params);
        }
        catch (error) {
            console.warn(`[LLMHelper] Tool validation error: ${error.message}`);
            return {
                valid: false,
                errors: [`Tool validation failed: ${error.message}`],
                warnings: []
            };
        }
    }
    /**
     * Get tool schema for documentation or UI generation
     * @param {string} toolName - Name of the tool
     * @returns {Object|null} Tool schema
     */
    getToolSchema(toolName) {
        try {
            const toolSystem = require('../dist/src/tools');
            return toolSystem.getToolSchema(toolName);
        }
        catch (error) {
            console.warn(`[LLMHelper] Failed to get tool schema: ${error.message}`);
            return null;
        }
    }
    /**
     * Initialize tool system integration
     * @returns {Promise<Object>} Initialization result
     */
    async initializeToolSystem() {
        try {
            const toolSystem = require('../dist/src/tools');
            const result = await toolSystem.initializeToolSystem();
            console.log(`[LLMHelper] Tool system initialized: ${result.toolCount} tools in ${result.categories.length} categories`);
            return {
                success: true,
                ...result
            };
        }
        catch (error) {
            console.warn(`[LLMHelper] Tool system initialization failed: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }
    /**
     * Get tool system statistics
     * @returns {Object} Tool system statistics
     */
    getToolSystemStats() {
        try {
            const toolSystem = require('../dist/src/tools');
            return toolSystem.getToolSystemStats();
        }
        catch (error) {
            console.warn(`[LLMHelper] Failed to get tool system stats: ${error.message}`);
            return {
                isInitialized: false,
                error: error.message
            };
        }
    }
    /**
     * Enhanced template substitution with tool integration
     * @param {string} prompt - The prompt string with template variables
     * @param {Object} context - Context object containing variable values
     * @returns {string} The prompt with substituted variables and tool context
     */
    substituteTemplateVariablesWithTools(prompt, context = {}) {
        if (!prompt || typeof prompt !== 'string') {
            return prompt;
        }
        try {
            // Get enhanced context with tool information
            const enhancedContext = this.getEnhancedToolContext(context);
            // First apply standard template substitution with enhanced context
            let result = this.substituteTemplateVariables(prompt, enhancedContext);
            // Add tool-specific template variables
            const toolStats = this.getToolSystemStats();
            if (toolStats.isInitialized || this.registeredTools.size > 0) {
                // Replace tool-specific template variables
                const toolVars = {
                    'tool:available': enhancedContext.tools.available,
                    'tool:local': enhancedContext.tools.local,
                    'tool:global': enhancedContext.tools.global,
                    'tool:status': enhancedContext.tools.systemInitialized ? 'available' : 'limited',
                    'llm:provider': enhancedContext.llm.provider,
                    'llm:model': enhancedContext.llm.model,
                    'llm:functionCalling': enhancedContext.llm.supportsFunctionCalling ? 'supported' : 'not supported',
                    'llm:structuredOutput': enhancedContext.llm.supportsStructuredOutput ? 'supported' : 'not supported'
                };
                for (const [key, value] of Object.entries(toolVars)) {
                    const regex = new RegExp(`\\{${key}\\}`, 'g');
                    result = result.replace(regex, value || '');
                }
            }
            return result;
        }
        catch (error) {
            console.error(`[LLMHelper] Error in enhanced template substitution: ${error.message}`);
            return this.substituteTemplateVariables(prompt, context); // Fallback to standard substitution
        }
    }
    /**
     * Create LLM with structured output support
     * @param {Object} schema - Output schema (Pydantic class, JSON schema, etc.)
     * @param {Object} options - Configuration options
     * @returns {Object} LLM instance with structured output
     */
    createLLMWithStructuredOutput(schema, options = {}) {
        const { method = this.config.supportsStructuredOutput ? 'json_schema' : 'json_mode', includeRaw = false, strict = this.config.supportsStructuredOutput, ...llmOptions } = options;
        const llm = this.createChatLLM(llmOptions);
        try {
            console.log(`[LLMHelper] Creating LLM with structured output using method: ${method}`);
            return llm.with_structured_output(schema, {
                method: method,
                include_raw: includeRaw,
                strict: strict
            });
        }
        catch (error) {
            console.error(`[LLMHelper] Failed to create structured output LLM: ${error.message}`);
            return llm;
        }
    }
    /**
     * Enhanced provider abstraction - get provider capabilities
     * @returns {Object} Provider capabilities and metadata
     */
    getProviderCapabilities() {
        return {
            provider: this.config.provider,
            model: this.config.modelName,
            supportsFunctionCalling: this.config.supportsFunctionCalling,
            supportsStructuredOutput: this.config.supportsStructuredOutput,
            supportsStreaming: true,
            supportsAsyncInvocation: true,
            maxTokens: this.config.maxTokens,
            temperature: this.config.temperature,
            metadata: this.config.metadata
        };
    }
    /**
     * Enhanced tool execution context for template variables
     * @param {Object} context - Base context
     * @returns {Object} Enhanced context with tool information
     */
    getEnhancedToolContext(context = {}) {
        const toolStats = this.getToolSystemStats();
        const availableTools = this.getAvailableTools(context.agentType || 'default');
        return {
            ...context,
            tools: {
                available: availableTools.length,
                local: this.registeredTools.size,
                global: availableTools.length - this.registeredTools.size,
                systemInitialized: toolStats.isInitialized,
                capabilities: this.getProviderCapabilities()
            },
            llm: {
                provider: this.config.provider,
                model: this.config.modelName,
                supportsFunctionCalling: this.config.supportsFunctionCalling,
                supportsStructuredOutput: this.config.supportsStructuredOutput
            }
        };
    }
}
// Singleton instance
let llmHelperInstance = null;
/**
 * Get singleton LLM helper instance
 */
function getLLMHelper() {
    if (!llmHelperInstance) {
        llmHelperInstance = new LLMHelper();
    }
    return llmHelperInstance;
}
/**
 * Reset singleton (useful for testing)
 */
function resetLLMHelper() {
    llmHelperInstance = null;
}
module.exports = {
    LLMHelper,
    getLLMHelper,
    resetLLMHelper,
};
//# sourceMappingURL=llm-helper.js.map