# Enhanced LLM Helper Documentation

## Overview

The Enhanced LLM Helper is a comprehensive utility that provides advanced integration capabilities for Large Language Models (LLMs), including tool integration, function calling, structured output generation, and provider abstraction. It serves as a centralized configuration and management system for LLM operations across different environments and use cases.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [API Reference](#api-reference)
- [Tool Integration](#tool-integration)
- [Template System](#template-system)
- [Provider Abstraction](#provider-abstraction)
- [Structured Output](#structured-output)
- [Configuration](#configuration)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)

## Features

### 🚀 Core Features

- **Provider Abstraction**: Unified interface for OpenAI, Azure OpenAI, and future providers
- **Tool Integration**: Comprehensive tool registration and function calling system
- **Enhanced Templates**: Advanced template substitution with LLM and tool context
- **Structured Output**: JSON Schema-based structured response generation
- **Configuration Management**: Environment-aware configuration with validation
- **Error Handling**: Robust error handling and graceful degradation

### 🔧 Advanced Features

- **Function Calling**: Native support for LLM function calling capabilities
- **Tool Registry**: Global and local tool registration and discovery
- **Context Enhancement**: Rich context generation for agent systems
- **Schema Validation**: Comprehensive parameter and output validation
- **Caching**: Tool execution caching and performance optimization
- **Monitoring**: Built-in logging and performance metrics

## Installation

The Enhanced LLM Helper is part of the chatSG backend system. No additional installation is required if you have the main project set up.

```bash
# Ensure dependencies are installed
npm install

# Run tests to verify installation
node test-enhanced-llm-helper.js

# Run demonstrations
node demo-enhanced-llm-helper.js
```

## Quick Start

### Basic Usage

```javascript
const { getLLMHelper } = require('./utils/llm-helper');

// Get singleton instance
const llmHelper = getLLMHelper();

// Check capabilities
const capabilities = llmHelper.getProviderCapabilities();
console.log(`Provider: ${capabilities.provider}`);
console.log(`Function Calling: ${capabilities.supportsFunctionCalling}`);

// Create basic LLM
const llm = llmHelper.createChatLLM();

// Use enhanced templates
const prompt = llmHelper.substituteTemplateVariablesWithTools(
    'Provider: {llm:provider}, Tools: {tool:available}',
    { agentType: 'assistant' }
);
```

### Tool Integration

```javascript
// Define a custom tool
class WeatherTool {
    constructor() {
        this.name = 'weather_lookup';
        this.description = 'Get weather information';
    }

    getSchema() {
        return {
            name: this.name,
            description: this.description,
            parameters: [
                {
                    name: 'location',
                    type: 'string',
                    description: 'City name',
                    required: true
                }
            ]
        };
    }

    async execute(params, context) {
        // Implementation here
        return {
            success: true,
            data: { temperature: 22, condition: 'sunny' },
            message: 'Weather retrieved successfully'
        };
    }
}

// Register and use the tool
const weatherTool = new WeatherTool();
llmHelper.registerTool(weatherTool);

// Create LLM with tools
const llmWithTools = llmHelper.createLLMWithTools([weatherTool], {
    toolChoice: 'auto'
});
```

## Core Concepts

### Provider Abstraction

The LLM Helper abstracts different LLM providers behind a unified interface:

```javascript
// Automatically detects provider based on environment variables
const llmHelper = getLLMHelper();

// Works with OpenAI
// OPENAI_API_KEY=your_key

// Works with Azure OpenAI
// AZURE_OPENAI_API_KEY=your_key
// AZURE_OPENAI_ENDPOINT=your_endpoint
// AZURE_OPENAI_DEPLOYMENT=your_deployment
```

### Tool System

Tools are modular components that extend LLM capabilities:

- **Local Tools**: Registered directly with the LLM Helper instance
- **Global Tools**: Discovered through the tool registry system
- **Tool Schemas**: JSON Schema-based parameter definitions
- **Tool Execution**: Asynchronous execution with context passing

### Template Variables

Enhanced template substitution supports both standard and LLM-specific variables:

```javascript
// Standard variables
const template = 'Hello {user}, environment: {environment}';

// LLM-specific variables
const llmTemplate = `
Provider: {llm:provider}
Model: {llm:model}
Function Calling: {llm:functionCalling}
Available Tools: {tool:available}
`;
```

## API Reference

### LLMHelper Class

#### Constructor

```javascript
const llmHelper = new LLMHelper();
```

#### Core Methods

##### `createChatLLM(overrides = {})`
Creates a basic ChatLLM instance.

```javascript
const llm = llmHelper.createChatLLM({
    temperature: 0.5,
    maxTokens: 2000
});
```

##### `createLLMWithTools(tools = [], options = {})`
Creates an LLM instance with tools bound for function calling.

```javascript
const llmWithTools = llmHelper.createLLMWithTools([tool1, tool2], {
    toolChoice: 'auto',
    parallelToolCalls: true
});
```

##### `createLLMWithStructuredOutput(schema, options = {})`
Creates an LLM instance with structured output support.

```javascript
const schema = {
    type: 'object',
    properties: {
        answer: { type: 'string' },
        confidence: { type: 'number' }
    },
    required: ['answer']
};

const structuredLLM = llmHelper.createLLMWithStructuredOutput(schema);
```

#### Tool Management

##### `registerTool(tool)`
Registers a tool for use with this LLM instance.

```javascript
const success = llmHelper.registerTool(myTool);
```

##### `getAvailableTools(agentType = 'default')`
Returns all available tools (local and global).

```javascript
const tools = llmHelper.getAvailableTools('assistant');
```

##### `convertToolsToOpenAIFormat(tools)`
Converts tools to OpenAI function calling format.

```javascript
const openAITools = llmHelper.convertToolsToOpenAIFormat([tool1, tool2]);
```

#### Template System

##### `substituteTemplateVariablesWithTools(prompt, context = {})`
Enhanced template substitution with tool and LLM context.

```javascript
const processedPrompt = llmHelper.substituteTemplateVariablesWithTools(
    template,
    { agentType: 'assistant', user: 'john' }
);
```

##### `getEnhancedToolContext(context = {})`
Generates enhanced context with tool and LLM information.

```javascript
const enhancedContext = llmHelper.getEnhancedToolContext({
    agentType: 'analyst',
    sessionId: 'session-123'
});
```

#### Configuration and Validation

##### `getProviderCapabilities()`
Returns provider capabilities and metadata.

```javascript
const capabilities = llmHelper.getProviderCapabilities();
// Returns: { provider, model, supportsFunctionCalling, ... }
```

##### `validateConfiguration()`
Validates current configuration.

```javascript
const validation = llmHelper.validateConfiguration();
// Returns: { valid, errors, warnings }
```

##### `getConfigInfo()`
Returns detailed configuration information.

```javascript
const config = llmHelper.getConfigInfo();
```

## Tool Integration

### Tool Interface

All tools must implement the following interface:

```javascript
class MyTool {
    constructor() {
        this.name = 'my_tool';
        this.description = 'Tool description';
    }

    // Required: Return tool schema
    getSchema() {
        return {
            name: this.name,
            description: this.description,
            parameters: [
                {
                    name: 'param1',
                    type: 'string',
                    description: 'Parameter description',
                    required: true
                }
            ]
        };
    }

    // Required: Execute tool with parameters
    async execute(params, context) {
        return {
            success: true,
            data: { result: 'value' },
            message: 'Operation completed',
            metadata: {
                executionTime: 100,
                toolName: this.name,
                timestamp: new Date().toISOString()
            }
        };
    }

    // Optional: Return tool configuration
    getConfig() {
        return {
            enabled: true,
            timeout: 5000,
            retries: 1
        };
    }
}
```

### Parameter Types

Tools support various parameter types:

```javascript
parameters: [
    {
        name: 'stringParam',
        type: 'string',
        description: 'A string parameter',
        required: true,
        enum: ['option1', 'option2'] // Optional
    },
    {
        name: 'numberParam',
        type: 'number',
        description: 'A number parameter',
        minimum: 0,
        maximum: 100
    },
    {
        name: 'arrayParam',
        type: 'array',
        description: 'An array parameter',
        items: {
            type: 'string'
        }
    },
    {
        name: 'objectParam',
        type: 'object',
        description: 'An object parameter',
        properties: {
            subField: { type: 'string' }
        }
    }
]
```

## Template System

### Standard Variables

```javascript
const context = {
    user: 'john',
    environment: 'production',
    agentType: 'assistant'
};

const template = 'Hello {user} in {environment}';
const result = llmHelper.substituteTemplateVariables(template, context);
// Result: "Hello john in production"
```

### Enhanced Variables

```javascript
const template = `
System: {llm:provider} ({llm:model})
Capabilities: {llm:functionCalling}, {llm:structuredOutput}
Tools: {tool:available} total ({tool:local} local, {tool:global} global)
Status: {tool:status}
`;

const result = llmHelper.substituteTemplateVariablesWithTools(template, context);
```

Available enhanced variables:

- `{llm:provider}` - LLM provider name
- `{llm:model}` - Model being used
- `{llm:functionCalling}` - Function calling support status
- `{llm:structuredOutput}` - Structured output support status
- `{tool:available}` - Total available tools count
- `{tool:local}` - Local tools count
- `{tool:global}` - Global tools count
- `{tool:status}` - Tool system status

## Provider Abstraction

### Supported Providers

#### OpenAI

```bash
# Environment variables
OPENAI_API_KEY=your_api_key
OPENAI_MODEL=gpt-4o                    # Optional, defaults to gpt-4o
OPENAI_BASE_URL=https://api.openai.com/v1  # Optional
```

#### Azure OpenAI

```bash
# Environment variables
AZURE_OPENAI_API_KEY=your_api_key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=gpt-4o-001    # Optional
AZURE_OPENAI_API_VERSION=2024-02-15-preview  # Optional
```

### Provider Detection

The system automatically detects the provider based on available environment variables:

1. If `AZURE_OPENAI_API_KEY` and `AZURE_OPENAI_ENDPOINT` are set → Azure OpenAI
2. If `OPENAI_API_KEY` is set → OpenAI
3. Otherwise → Defaults to OpenAI with warning

### Provider Capabilities

Different providers support different features:

```javascript
const capabilities = llmHelper.getProviderCapabilities();

if (capabilities.supportsFunctionCalling) {
    // Use function calling
    const llmWithTools = llmHelper.createLLMWithTools(tools);
}

if (capabilities.supportsStructuredOutput) {
    // Use structured output
    const structuredLLM = llmHelper.createLLMWithStructuredOutput(schema);
}
```

## Structured Output

### Schema Definition

Define JSON schemas for structured output:

```javascript
const responseSchema = {
    type: 'object',
    properties: {
        summary: {
            type: 'string',
            description: 'Brief summary of the analysis'
        },
        confidence: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            description: 'Confidence score'
        },
        recommendations: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    action: { type: 'string' },
                    priority: {
                        type: 'string',
                        enum: ['low', 'medium', 'high']
                    }
                },
                required: ['action', 'priority']
            }
        }
    },
    required: ['summary', 'confidence']
};
```

### Usage

```javascript
const structuredLLM = llmHelper.createLLMWithStructuredOutput(responseSchema, {
    method: 'json_schema',  // or 'json_mode'
    strict: true,           // Enable strict mode if supported
    includeRaw: false       // Include raw response
});

const response = await structuredLLM.invoke([
    { role: 'user', content: 'Analyze this data...' }
]);

// Response will conform to the schema
console.log(response.summary);
console.log(response.confidence);
console.log(response.recommendations);
```

## Configuration

### Environment Variables

#### Core LLM Settings

```bash
# Provider selection (auto-detected)
OPENAI_API_KEY=your_openai_key
AZURE_OPENAI_API_KEY=your_azure_key
AZURE_OPENAI_ENDPOINT=your_azure_endpoint

# Model configuration
OPENAI_MODEL=gpt-4o
AZURE_OPENAI_DEPLOYMENT=gpt-4o-001

# Generation settings
LLM_TEMPERATURE=0.7        # 0.0 to 1.0
LLM_MAX_TOKENS=4000        # Maximum tokens

# Environment
ENVIRONMENT=development    # development, production, etc.
NODE_ENV=development
```

#### Environment-Specific Defaults

The system provides different defaults based on environment:

| Setting | Development | Production | Default |
|---------|-------------|------------|---------|
| Temperature | 0.7 | 0.3 | 0.5 |
| Max Tokens | 4000 | 2000 | 3000 |

### Configuration Validation

```javascript
const validation = llmHelper.validateConfiguration();

if (!validation.valid) {
    console.error('Configuration errors:', validation.errors);
    console.warn('Configuration warnings:', validation.warnings);
}
```

Common validation errors:

- Missing API keys
- Invalid model names
- Incorrect endpoint URLs
- Invalid parameter ranges

## Error Handling

### Graceful Degradation

The Enhanced LLM Helper implements graceful degradation:

```javascript
// If function calling is not supported
const llmWithTools = llmHelper.createLLMWithTools(tools);
// Returns basic LLM without tools instead of failing

// If structured output is not supported
const structuredLLM = llmHelper.createLLMWithStructuredOutput(schema);
// Falls back to JSON mode or basic LLM

// If tool registration fails
const success = llmHelper.registerTool(invalidTool);
// Returns false instead of throwing
```

### Error Categories

1. **Configuration Errors**: Missing API keys, invalid settings
2. **Tool Errors**: Invalid tool schemas, execution failures
3. **Provider Errors**: Unsupported features, API failures
4. **Validation Errors**: Invalid parameters, schema mismatches

### Error Handling Patterns

```javascript
try {
    const llm = llmHelper.createChatLLM();
    const response = await llm.invoke(messages);
} catch (error) {
    if (error.message.includes('API key')) {
        // Handle authentication error
        console.error('Please configure your API key');
    } else if (error.message.includes('rate limit')) {
        // Handle rate limiting
        console.warn('Rate limited, retrying...');
    } else {
        // Handle other errors
        console.error('Unexpected error:', error.message);
    }
}
```

## Best Practices

### Tool Development

1. **Clear Naming**: Use descriptive, unique tool names
2. **Comprehensive Schemas**: Define all parameters with descriptions
3. **Error Handling**: Implement robust error handling in tool execution
4. **Performance**: Consider execution time and resource usage
5. **Testing**: Test tools with various parameter combinations

```javascript
// Good tool example
class DataAnalyzerTool {
    constructor() {
        this.name = 'analyze_dataset';  // Clear, specific name
        this.description = 'Analyze numerical datasets and provide statistical insights';
    }

    getSchema() {
        return {
            name: this.name,
            description: this.description,
            parameters: [
                {
                    name: 'data',
                    type: 'array',
                    description: 'Array of numerical values to analyze',
                    required: true,
                    items: { type: 'number' }
                },
                {
                    name: 'analysisType',
                    type: 'string',
                    description: 'Type of analysis to perform',
                    required: false,
                    enum: ['basic', 'advanced', 'full'],
                    default: 'basic'
                }
            ]
        };
    }

    async execute(params, context) {
        try {
            // Validate input
            if (!Array.isArray(params.data) || params.data.length === 0) {
                throw new Error('Data must be a non-empty array');
            }

            // Perform analysis
            const result = this.performAnalysis(params.data, params.analysisType);

            return {
                success: true,
                data: result,
                message: `Analysis completed for ${params.data.length} data points`,
                metadata: {
                    executionTime: Date.now() - context.startTime,
                    toolName: this.name,
                    timestamp: new Date().toISOString(),
                    analysisType: params.analysisType
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                metadata: {
                    toolName: this.name,
                    timestamp: new Date().toISOString()
                }
            };
        }
    }
}
```

### Template Design

1. **Semantic Variables**: Use meaningful variable names
2. **Fallback Values**: Provide defaults for optional variables
3. **Context Awareness**: Design templates for specific agent types
4. **Maintainability**: Keep templates readable and well-documented

```javascript
// Good template example
const agentPrompt = `
You are a {agentType} AI assistant with the following capabilities:

System Configuration:
- Provider: {llm:provider} ({llm:model})
- Function Calling: {llm:functionCalling}
- Available Tools: {tool:available}

Your Role: {agentRole|General Assistant}
Environment: {environment|development}
User Context: {userContext|No specific context}

Available Tools:
{tool:available} tools are available for your use.
{tool:status} - Use tools when appropriate to help the user.

Please assist the user with their request.
`;
```

### Configuration Management

1. **Environment Separation**: Use different configs for different environments
2. **Validation**: Always validate configuration at startup
3. **Secrets Management**: Use secure methods for API key storage
4. **Monitoring**: Monitor configuration changes and validation status

### Performance Optimization

1. **Tool Caching**: Cache tool results when appropriate
2. **Lazy Loading**: Load tools and providers on demand
3. **Connection Pooling**: Reuse LLM instances when possible
4. **Monitoring**: Track performance metrics and optimize bottlenecks

## Examples

### Complete Agent Implementation

```javascript
const { getLLMHelper } = require('./utils/llm-helper');

class WeatherAgent {
    constructor() {
        this.llmHelper = getLLMHelper();
        this.setupTools();
    }

    setupTools() {
        // Register weather tool
        const weatherTool = new WeatherTool();
        this.llmHelper.registerTool(weatherTool);
    }

    async processRequest(userMessage, context = {}) {
        // Get enhanced context
        const enhancedContext = this.llmHelper.getEnhancedToolContext({
            agentType: 'weather_assistant',
            sessionId: context.sessionId,
            user: context.user
        });

        // Create system prompt
        const systemPrompt = this.llmHelper.substituteTemplateVariablesWithTools(`
You are a weather assistant with access to {tool:available} tools.

Your capabilities:
- Provider: {llm:provider} ({llm:model})
- Function Calling: {llm:functionCalling}
- Tools Available: {tool:status}

Please help the user with weather-related queries.
        `, enhancedContext);

        // Create LLM with tools
        const availableTools = this.llmHelper.getAvailableTools('weather_assistant');
        const llm = this.llmHelper.createLLMWithTools(availableTools, {
            toolChoice: 'auto'
        });

        // Process request
        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
        ];

        try {
            const response = await llm.invoke(messages);
            return this.formatResponse(response);
        } catch (error) {
            return this.handleError(error);
        }
    }

    formatResponse(response) {
        return {
            success: true,
            message: response.content,
            toolCalls: response.tool_calls || [],
            metadata: {
                timestamp: new Date().toISOString(),
                agent: 'weather_assistant'
            }
        };
    }

    handleError(error) {
        console.error('Weather agent error:', error);
        return {
            success: false,
            error: 'I apologize, but I encountered an error processing your request.',
            metadata: {
                timestamp: new Date().toISOString(),
                agent: 'weather_assistant',
                errorType: error.constructor.name
            }
        };
    }
}

// Usage
const agent = new WeatherAgent();
const response = await agent.processRequest(
    "What's the weather like in New York?",
    { sessionId: 'session-123', user: 'john' }
);
```

### Structured Output Example

```javascript
async function generateReport(data) {
    const llmHelper = getLLMHelper();
    
    // Define report schema
    const reportSchema = {
        type: 'object',
        properties: {
            title: { type: 'string' },
            summary: { type: 'string' },
            keyFindings: {
                type: 'array',
                items: { type: 'string' }
            },
            recommendations: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        action: { type: 'string' },
                        priority: { type: 'string', enum: ['low', 'medium', 'high'] },
                        timeline: { type: 'string' }
                    },
                    required: ['action', 'priority']
                }
            },
            confidence: {
                type: 'number',
                minimum: 0,
                maximum: 1
            }
        },
        required: ['title', 'summary', 'keyFindings']
    };

    // Create structured LLM
    const structuredLLM = llmHelper.createLLMWithStructuredOutput(reportSchema);

    // Generate report
    const prompt = `Analyze the following data and generate a comprehensive report:
    
${JSON.stringify(data, null, 2)}

Please provide a structured analysis with key findings and actionable recommendations.`;

    const report = await structuredLLM.invoke([
        { role: 'user', content: prompt }
    ]);

    return report;
}
```

## Troubleshooting

### Common Issues

#### 1. API Key Not Found

```
Error: OpenAI or Azure OpenAI API key or Token Provider not found
```

**Solution**: Set the appropriate environment variable:
```bash
export OPENAI_API_KEY=your_key
# or
export AZURE_OPENAI_API_KEY=your_key
```

#### 2. Tool Registration Fails

```
Error: Tool must implement getSchema() method
```

**Solution**: Ensure your tool implements all required methods:
```javascript
class MyTool {
    getSchema() { /* implementation */ }
    async execute(params, context) { /* implementation */ }
}
```

#### 3. Function Calling Not Working

**Solution**: Check provider capabilities:
```javascript
const capabilities = llmHelper.getProviderCapabilities();
if (!capabilities.supportsFunctionCalling) {
    console.log('Function calling not supported by current provider/model');
}
```

#### 4. Template Variables Not Substituted

**Solution**: Use the enhanced substitution method:
```javascript
// Use this
const result = llmHelper.substituteTemplateVariablesWithTools(template, context);

// Instead of this
const result = llmHelper.substituteTemplateVariables(template, context);
```

### Debug Mode

Enable debug logging by setting environment variables:

```bash
export DEBUG=llm-helper:*
export LOG_LEVEL=debug
```

### Validation Tools

Use built-in validation methods:

```javascript
// Validate configuration
const configValidation = llmHelper.validateConfiguration();
console.log('Config valid:', configValidation.valid);

// Check provider capabilities
const capabilities = llmHelper.getProviderCapabilities();
console.log('Capabilities:', capabilities);

// Test tool registration
const tool = new MyTool();
const registered = llmHelper.registerTool(tool);
console.log('Tool registered:', registered);
```

## Migration Guide

### From Basic LLM Helper

If you're migrating from a basic LLM helper implementation:

1. **Update imports**: No changes needed if using `getLLMHelper()`
2. **Tool registration**: Replace manual tool handling with `registerTool()`
3. **Template variables**: Update templates to use enhanced variables
4. **Configuration**: Use new validation methods

### Breaking Changes

- Tool interface has been standardized
- Template variable syntax has been enhanced
- Configuration validation is now required

### Migration Example

```javascript
// Old approach
const llm = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: 'gpt-4o'
});

// New approach
const llmHelper = getLLMHelper();
const llm = llmHelper.createChatLLM();
```

## Contributing

To contribute to the Enhanced LLM Helper:

1. Follow the existing code patterns
2. Add comprehensive tests for new features
3. Update documentation for any API changes
4. Ensure backward compatibility when possible

## License

This Enhanced LLM Helper is part of the chatSG project and follows the same licensing terms. 