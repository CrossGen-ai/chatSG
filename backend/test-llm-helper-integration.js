/**
 * LLM Helper Integration Test (No API Keys Required)
 * Tests enhanced functionality without making actual LLM calls
 */

const { getLLMHelper } = require('./utils/llm-helper');

class TestTool {
    constructor(name, description) {
        this.name = name;
        this.version = '1.0.0';
        this.description = description;
    }

    getSchema() {
        return {
            name: this.name,
            description: this.description,
            parameters: [
                {
                    name: 'input',
                    type: 'string',
                    description: 'Input parameter',
                    required: true
                }
            ]
        };
    }

    async execute(params) {
        return {
            success: true,
            data: { result: `Processed: ${params.input}` },
            metadata: { toolName: this.name }
        };
    }

    getConfig() {
        return { enabled: true };
    }
}

function testLLMHelperIntegration() {
    console.log('🔧 Testing LLM Helper Enhanced Integration...\n');

    try {
        const llmHelper = getLLMHelper();
        console.log('✅ LLM Helper initialized');

        // Test enhanced capabilities
        const capabilities = llmHelper.getProviderCapabilities();
        console.log(`✅ Provider: ${capabilities.provider}, Model: ${capabilities.model}`);
        console.log(`✅ Function Calling: ${capabilities.supportsFunctionCalling}`);
        console.log(`✅ Structured Output: ${capabilities.supportsStructuredOutput}`);

        // Test tool registration
        const tool1 = new TestTool('text_processor', 'Process text input');
        const tool2 = new TestTool('data_analyzer', 'Analyze data');
        
        llmHelper.registerTool(tool1);
        llmHelper.registerTool(tool2);
        console.log('✅ Tools registered');

        // Test tool resolution
        const resolvedTools = llmHelper.resolveTools(['text_processor', tool2, 'nonexistent_tool']);
        console.log(`✅ Resolved ${resolvedTools.length} tools from mixed input`);

        // Test OpenAI format conversion
        const openAIFormat = llmHelper.convertToolsToOpenAIFormat(resolvedTools);
        console.log(`✅ Converted ${openAIFormat.length} tools to OpenAI format`);

        // Test enhanced template substitution
        const template = `
LLM Provider: {llm:provider}
Available Tools: {tool:available}
Function Calling: {llm:functionCalling}
Local Tools: {tool:local}
        `;
        
        const result = llmHelper.substituteTemplateVariablesWithTools(template, {
            agentType: 'test'
        });
        
        console.log('✅ Enhanced template substitution:');
        console.log(result);

        // Test enhanced context
        const context = llmHelper.getEnhancedToolContext({ sessionId: 'test' });
        console.log(`✅ Enhanced context: ${context.tools.available} tools, ${context.llm.provider} provider`);

        // Test configuration info
        const config = llmHelper.getConfigInfo();
        console.log(`✅ Config info: ${config.toolIntegration.localToolsRegistered} local tools`);

        console.log('\n🎉 All integration tests passed!');
        return true;

    } catch (error) {
        console.error('\n❌ Integration test failed:', error.message);
        return false;
    }
}

// Run the test
if (require.main === module) {
    const success = testLLMHelperIntegration();
    process.exit(success ? 0 : 1);
}

module.exports = { testLLMHelperIntegration }; 