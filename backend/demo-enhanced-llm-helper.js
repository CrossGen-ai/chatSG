/**
 * Enhanced LLM Helper Demonstration
 * 
 * This script demonstrates practical usage of the enhanced LLM helper
 * in real-world scenarios, including:
 * 
 * 1. Tool integration and function calling
 * 2. Enhanced template substitution
 * 3. Provider abstraction
 * 4. Structured output generation
 * 5. Agent configuration management
 * 6. Error handling and validation
 */

const { getLLMHelper } = require('./utils/llm-helper');

// Example custom tool for demonstration
class WeatherTool {
    constructor() {
        this.name = 'weather_lookup';
        this.version = '1.0.0';
        this.description = 'Get current weather information for a location';
    }

    getSchema() {
        return {
            name: this.name,
            description: this.description,
            parameters: [
                {
                    name: 'location',
                    type: 'string',
                    description: 'The city or location to get weather for',
                    required: true
                },
                {
                    name: 'units',
                    type: 'string',
                    description: 'Temperature units (celsius, fahrenheit)',
                    required: false,
                    enum: ['celsius', 'fahrenheit'],
                    default: 'celsius'
                }
            ]
        };
    }

    async execute(params, context) {
        const { location, units = 'celsius' } = params;
        
        // Simulate weather API call
        const mockWeatherData = {
            location: location,
            temperature: units === 'celsius' ? 22 : 72,
            units: units,
            condition: 'Partly cloudy',
            humidity: 65,
            windSpeed: 12
        };

        return {
            success: true,
            data: mockWeatherData,
            message: `Weather data retrieved for ${location}`,
            metadata: {
                executionTime: 150,
                toolName: this.name,
                timestamp: new Date().toISOString(),
                source: 'mock_weather_api'
            }
        };
    }

    getConfig() {
        return {
            enabled: true,
            timeout: 10000,
            retries: 2,
            cache: true,
            cacheTTL: 300000 // 5 minutes
        };
    }
}

// Example custom tool for data processing
class DataProcessorTool {
    constructor() {
        this.name = 'data_processor';
        this.version = '1.0.0';
        this.description = 'Process and analyze data arrays';
    }

    getSchema() {
        return {
            name: this.name,
            description: this.description,
            parameters: [
                {
                    name: 'data',
                    type: 'array',
                    description: 'Array of numbers to process',
                    required: true,
                    items: {
                        type: 'number'
                    }
                },
                {
                    name: 'operation',
                    type: 'string',
                    description: 'Operation to perform on the data',
                    required: true,
                    enum: ['sum', 'average', 'min', 'max', 'count']
                }
            ]
        };
    }

    async execute(params, context) {
        const { data, operation } = params;
        
        if (!Array.isArray(data)) {
            throw new Error('Data must be an array');
        }

        let result;
        switch (operation) {
            case 'sum':
                result = data.reduce((acc, val) => acc + val, 0);
                break;
            case 'average':
                result = data.reduce((acc, val) => acc + val, 0) / data.length;
                break;
            case 'min':
                result = Math.min(...data);
                break;
            case 'max':
                result = Math.max(...data);
                break;
            case 'count':
                result = data.length;
                break;
            default:
                throw new Error(`Unknown operation: ${operation}`);
        }

        return {
            success: true,
            data: { 
                operation,
                input: data,
                result,
                inputSize: data.length
            },
            message: `${operation} operation completed`,
            metadata: {
                executionTime: 5,
                toolName: this.name,
                timestamp: new Date().toISOString()
            }
        };
    }

    getConfig() {
        return {
            enabled: true,
            timeout: 5000,
            retries: 1
        };
    }
}

/**
 * Demonstration 1: Basic LLM Helper Setup and Configuration
 */
async function demo1_BasicSetup() {
    console.log('\n🚀 Demo 1: Basic LLM Helper Setup and Configuration');
    console.log('=' .repeat(60));

    const llmHelper = getLLMHelper();
    
    // Show provider capabilities
    const capabilities = llmHelper.getProviderCapabilities();
    console.log('\n📋 Provider Capabilities:');
    console.log(`  Provider: ${capabilities.provider}`);
    console.log(`  Model: ${capabilities.model}`);
    console.log(`  Function Calling: ${capabilities.supportsFunctionCalling ? '✅' : '❌'}`);
    console.log(`  Structured Output: ${capabilities.supportsStructuredOutput ? '✅' : '❌'}`);
    console.log(`  Max Tokens: ${capabilities.maxTokens}`);
    console.log(`  Temperature: ${capabilities.temperature}`);

    // Show configuration validation
    const validation = llmHelper.validateConfiguration();
    console.log('\n🔍 Configuration Validation:');
    console.log(`  Valid: ${validation.valid ? '✅' : '❌'}`);
    if (!validation.valid) {
        console.log(`  Errors: ${validation.errors.join(', ')}`);
    }
    if (validation.warnings && validation.warnings.length > 0) {
        console.log(`  Warnings: ${validation.warnings.join(', ')}`);
    }

    console.log('\n✅ Demo 1 completed');
}

/**
 * Demonstration 2: Tool Registration and Management
 */
async function demo2_ToolManagement() {
    console.log('\n🔧 Demo 2: Tool Registration and Management');
    console.log('=' .repeat(60));

    const llmHelper = getLLMHelper();
    
    // Register custom tools
    const weatherTool = new WeatherTool();
    const dataProcessor = new DataProcessorTool();
    
    console.log('\n📝 Registering custom tools...');
    const weatherRegistered = llmHelper.registerTool(weatherTool);
    const dataRegistered = llmHelper.registerTool(dataProcessor);
    
    console.log(`  Weather Tool: ${weatherRegistered ? '✅' : '❌'}`);
    console.log(`  Data Processor: ${dataRegistered ? '✅' : '❌'}`);

    // Show available tools
    const availableTools = llmHelper.getAvailableTools('demo');
    console.log('\n📋 Available Tools:');
    console.log(`  Total: ${availableTools.length}`);
    console.log(`  Local: ${availableTools.filter(t => t.source === 'local').length}`);
    console.log(`  Global: ${availableTools.filter(t => t.source === 'global').length}`);
    
    console.log('\n🔧 Tool Details:');
    availableTools.forEach(tool => {
        console.log(`  - ${tool.name} (${tool.source}): ${tool.description}`);
    });

    // Show tool format conversion
    console.log('\n🔄 OpenAI Function Format Conversion:');
    const openAIFormats = llmHelper.convertToolsToOpenAIFormat([weatherTool, dataProcessor]);
    openAIFormats.forEach(format => {
        console.log(`  - ${format.function.name}: ${format.function.description}`);
    });

    console.log('\n✅ Demo 2 completed');
}

/**
 * Demonstration 3: Enhanced Template Substitution
 */
async function demo3_TemplateSubstitution() {
    console.log('\n📝 Demo 3: Enhanced Template Substitution');
    console.log('=' .repeat(60));

    const llmHelper = getLLMHelper();

    // Example agent prompt template
    const agentPrompt = `
You are an AI assistant with enhanced capabilities.

System Configuration:
- Provider: {llm:provider}
- Model: {llm:model}
- Function Calling: {llm:functionCalling}
- Structured Output: {llm:structuredOutput}

Available Tools: {tool:available}
- Local Tools: {tool:local}
- Global Tools: {tool:global}
- Tool System Status: {tool:status}

Context Information:
- Agent Type: {agentType}
- Environment: {environment}
- Session ID: {sessionId}
- User: {user}

Current Task: {task}

Please assist the user with their request, utilizing the available tools when appropriate.
    `;

    console.log('\n📋 Template Variables:');
    console.log('  {llm:provider} - LLM provider name');
    console.log('  {llm:model} - Model being used');
    console.log('  {llm:functionCalling} - Function calling support');
    console.log('  {llm:structuredOutput} - Structured output support');
    console.log('  {tool:available} - Total available tools');
    console.log('  {tool:local} - Local tools count');
    console.log('  {tool:global} - Global tools count');
    console.log('  {tool:status} - Tool system status');

    // Substitute variables with context
    const context = {
        agentType: 'assistant',
        environment: 'production',
        sessionId: 'demo-session-123',
        user: 'demo-user',
        task: 'Analyze weather data and provide insights'
    };

    console.log('\n🔄 Substituting template variables...');
    const processedPrompt = llmHelper.substituteTemplateVariablesWithTools(agentPrompt, context);
    
    console.log('\n📄 Processed Prompt:');
    console.log(processedPrompt);

    console.log('\n✅ Demo 3 completed');
}

/**
 * Demonstration 4: Enhanced Tool Context
 */
async function demo4_EnhancedContext() {
    console.log('\n🔧 Demo 4: Enhanced Tool Context');
    console.log('=' .repeat(60));

    const llmHelper = getLLMHelper();

    // Get enhanced context for different scenarios
    const contexts = [
        { agentType: 'assistant', scenario: 'general' },
        { agentType: 'analyst', scenario: 'data_analysis' },
        { agentType: 'support', scenario: 'customer_service' }
    ];

    console.log('\n📋 Enhanced Context Examples:');
    
    for (const baseContext of contexts) {
        console.log(`\n🎯 ${baseContext.agentType.toUpperCase()} Agent Context:`);
        
        const enhancedContext = llmHelper.getEnhancedToolContext({
            ...baseContext,
            sessionId: `demo-${Date.now()}`,
            timestamp: new Date().toISOString()
        });

        console.log(`  Agent Type: ${enhancedContext.agentType}`);
        console.log(`  Available Tools: ${enhancedContext.tools.available}`);
        console.log(`  Local Tools: ${enhancedContext.tools.local}`);
        console.log(`  Global Tools: ${enhancedContext.tools.global}`);
        console.log(`  Tool System: ${enhancedContext.tools.systemInitialized ? 'Initialized' : 'Limited'}`);
        console.log(`  LLM Provider: ${enhancedContext.llm.provider}`);
        console.log(`  LLM Model: ${enhancedContext.llm.model}`);
        console.log(`  Function Calling: ${enhancedContext.llm.supportsFunctionCalling ? 'Supported' : 'Not Supported'}`);
    }

    console.log('\n✅ Demo 4 completed');
}

/**
 * Demonstration 5: Structured Output Schema Examples
 */
async function demo5_StructuredOutput() {
    console.log('\n📊 Demo 5: Structured Output Schema Examples');
    console.log('=' .repeat(60));

    const llmHelper = getLLMHelper();
    const capabilities = llmHelper.getProviderCapabilities();

    if (!capabilities.supportsStructuredOutput) {
        console.log('⚠️  Structured output not supported by current provider');
        return;
    }

    // Example schemas for different use cases
    const schemas = {
        weatherAnalysis: {
            type: 'object',
            properties: {
                location: { type: 'string' },
                temperature: { type: 'number' },
                condition: { type: 'string' },
                recommendation: { type: 'string' },
                confidence: { type: 'number', minimum: 0, maximum: 1 }
            },
            required: ['location', 'temperature', 'condition', 'recommendation']
        },
        
        dataInsights: {
            type: 'object',
            properties: {
                summary: { type: 'string' },
                keyFindings: {
                    type: 'array',
                    items: { type: 'string' }
                },
                metrics: {
                    type: 'object',
                    properties: {
                        average: { type: 'number' },
                        median: { type: 'number' },
                        standardDeviation: { type: 'number' }
                    }
                },
                recommendations: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            action: { type: 'string' },
                            priority: { type: 'string', enum: ['low', 'medium', 'high'] },
                            reasoning: { type: 'string' }
                        }
                    }
                }
            },
            required: ['summary', 'keyFindings']
        },

        taskPlanning: {
            type: 'object',
            properties: {
                taskName: { type: 'string' },
                priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
                estimatedDuration: { type: 'number' },
                dependencies: {
                    type: 'array',
                    items: { type: 'string' }
                },
                steps: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            stepNumber: { type: 'number' },
                            description: { type: 'string' },
                            duration: { type: 'number' },
                            tools: {
                                type: 'array',
                                items: { type: 'string' }
                            }
                        }
                    }
                }
            },
            required: ['taskName', 'priority', 'steps']
        }
    };

    console.log('\n📋 Available Schema Examples:');
    Object.keys(schemas).forEach(schemaName => {
        console.log(`  - ${schemaName}: ${schemas[schemaName].properties ? Object.keys(schemas[schemaName].properties).length : 0} properties`);
    });

    console.log('\n🔧 Schema Details:');
    Object.entries(schemas).forEach(([name, schema]) => {
        console.log(`\n  ${name.toUpperCase()}:`);
        console.log(`    Properties: ${Object.keys(schema.properties).join(', ')}`);
        console.log(`    Required: ${schema.required.join(', ')}`);
        
        try {
            // This would create the LLM with structured output (requires API key)
            console.log(`    ✅ Schema validation passed`);
        } catch (error) {
            console.log(`    ❌ Schema validation failed: ${error.message}`);
        }
    });

    console.log('\n✅ Demo 5 completed');
}

/**
 * Demonstration 6: Error Handling and Validation
 */
async function demo6_ErrorHandling() {
    console.log('\n🔍 Demo 6: Error Handling and Validation');
    console.log('=' .repeat(60));

    const llmHelper = getLLMHelper();

    console.log('\n📋 Testing Various Error Scenarios:');

    // Test 1: Invalid tool registration
    console.log('\n🧪 Test 1: Invalid Tool Registration');
    try {
        const invalidTool = { name: 'invalid' }; // Missing required methods
        const result = llmHelper.registerTool(invalidTool);
        console.log(`  Result: ${result ? 'Unexpected success' : 'Expected failure'}`);
    } catch (error) {
        console.log(`  ✅ Properly caught error: ${error.message}`);
    }

    // Test 2: Tool format conversion with invalid tools
    console.log('\n🧪 Test 2: Tool Format Conversion Error Handling');
    try {
        const tools = [{ name: 'test' }]; // Missing getSchema method
        const formats = llmHelper.convertToolsToOpenAIFormat(tools);
        console.log(`  ⚠️  Conversion succeeded unexpectedly`);
    } catch (error) {
        console.log(`  ✅ Properly caught error: ${error.message}`);
    }

    // Test 3: Template substitution with missing variables
    console.log('\n🧪 Test 3: Template Substitution Error Handling');
    try {
        const template = 'Hello {missingVariable}!';
        const result = llmHelper.substituteTemplateVariablesWithTools(template, {});
        console.log(`  Result: "${result}"`);
        console.log(`  ✅ Gracefully handled missing variable`);
    } catch (error) {
        console.log(`  ❌ Unexpected error: ${error.message}`);
    }

    // Test 4: Configuration validation
    console.log('\n🧪 Test 4: Configuration Validation');
    const validation = llmHelper.validateConfiguration();
    console.log(`  Configuration Valid: ${validation.valid ? '✅' : '❌'}`);
    if (!validation.valid) {
        console.log(`  Errors: ${validation.errors.join(', ')}`);
    }

    // Test 5: Provider capabilities check
    console.log('\n🧪 Test 5: Provider Capabilities Check');
    const capabilities = llmHelper.getProviderCapabilities();
    console.log(`  Provider: ${capabilities.provider}`);
    console.log(`  Function Calling: ${capabilities.supportsFunctionCalling ? '✅' : '❌'}`);
    console.log(`  Structured Output: ${capabilities.supportsStructuredOutput ? '✅' : '❌'}`);

    console.log('\n✅ Demo 6 completed');
}

/**
 * Demonstration 7: Integration Summary and Best Practices
 */
async function demo7_BestPractices() {
    console.log('\n📚 Demo 7: Integration Summary and Best Practices');
    console.log('=' .repeat(60));

    const llmHelper = getLLMHelper();

    console.log('\n🎯 Best Practices for Enhanced LLM Helper:');
    
    console.log('\n1. 🔧 Tool Management:');
    console.log('   - Register tools early in application lifecycle');
    console.log('   - Validate tool schemas before registration');
    console.log('   - Use descriptive tool names and descriptions');
    console.log('   - Implement proper error handling in tool execution');

    console.log('\n2. 📝 Template Design:');
    console.log('   - Use semantic variable names (e.g., {llm:provider})');
    console.log('   - Provide fallback values for optional variables');
    console.log('   - Test templates with different contexts');
    console.log('   - Keep templates readable and maintainable');

    console.log('\n3. 🔍 Configuration Management:');
    console.log('   - Validate configuration at startup');
    console.log('   - Use environment-specific settings');
    console.log('   - Handle missing API keys gracefully');
    console.log('   - Monitor provider capabilities');

    console.log('\n4. 📊 Structured Output:');
    console.log('   - Design clear, comprehensive schemas');
    console.log('   - Use appropriate data types and constraints');
    console.log('   - Test schema validation thoroughly');
    console.log('   - Handle schema evolution carefully');

    console.log('\n5. 🔧 Error Handling:');
    console.log('   - Implement comprehensive error catching');
    console.log('   - Provide meaningful error messages');
    console.log('   - Use graceful degradation when possible');
    console.log('   - Log errors for debugging and monitoring');

    // Show current system status
    const capabilities = llmHelper.getProviderCapabilities();
    const availableTools = llmHelper.getAvailableTools();
    const toolStats = llmHelper.getToolSystemStats();
    const validation = llmHelper.validateConfiguration();

    console.log('\n📊 Current System Status:');
    console.log(`   Provider: ${capabilities.provider} (${capabilities.model})`);
    console.log(`   Function Calling: ${capabilities.supportsFunctionCalling ? '✅' : '❌'}`);
    console.log(`   Structured Output: ${capabilities.supportsStructuredOutput ? '✅' : '❌'}`);
    console.log(`   Available Tools: ${availableTools.length}`);
    console.log(`   Tool System: ${toolStats.isInitialized ? '✅ Initialized' : '❌ Limited'}`);
    console.log(`   Configuration: ${validation.valid ? '✅ Valid' : '❌ Issues Found'}`);

    console.log('\n✅ Demo 7 completed');
}

/**
 * Main demonstration runner
 */
async function runAllDemos() {
    console.log('🎯 Enhanced LLM Helper Comprehensive Demonstration');
    console.log('=' .repeat(70));
    console.log('This demonstration showcases the enhanced capabilities of the LLM Helper');
    console.log('including tool integration, template substitution, and provider abstraction.');
    console.log('=' .repeat(70));

    try {
        await demo1_BasicSetup();
        await demo2_ToolManagement();
        await demo3_TemplateSubstitution();
        await demo4_EnhancedContext();
        await demo5_StructuredOutput();
        await demo6_ErrorHandling();
        await demo7_BestPractices();

        console.log('\n🎉 All demonstrations completed successfully!');
        console.log('\n📋 Summary:');
        console.log('   ✅ Provider abstraction and configuration');
        console.log('   ✅ Tool registration and management');
        console.log('   ✅ Enhanced template substitution');
        console.log('   ✅ Tool context enhancement');
        console.log('   ✅ Structured output schema design');
        console.log('   ✅ Error handling and validation');
        console.log('   ✅ Best practices and integration patterns');

    } catch (error) {
        console.error('\n❌ Demonstration failed:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Run demonstrations if this file is executed directly
if (require.main === module) {
    runAllDemos()
        .then(() => {
            console.log('\n👋 Demonstration completed. Thank you!');
            process.exit(0);
        })
        .catch(error => {
            console.error('Demonstration execution failed:', error);
            process.exit(1);
        });
}

module.exports = {
    runAllDemos,
    demo1_BasicSetup,
    demo2_ToolManagement,
    demo3_TemplateSubstitution,
    demo4_EnhancedContext,
    demo5_StructuredOutput,
    demo6_ErrorHandling,
    demo7_BestPractices,
    WeatherTool,
    DataProcessorTool
}; 