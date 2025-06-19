/**
 * Tool System Test
 * 
 * Comprehensive test for the reusable tool system including registry,
 * tool execution, validation, and LLMHelper integration.
 */

const { getLLMHelper } = require('./utils/llm-helper');

async function testToolSystem() {
    console.log('🔧 Testing Tool System...\n');

    try {
        // Test 1: LLMHelper Tool Integration
        console.log('1. Testing LLMHelper Tool Integration');
        console.log('=====================================');
        
        const llmHelper = getLLMHelper();
        
        // Test tool system initialization
        console.log('Initializing tool system...');
        const initResult = await llmHelper.initializeToolSystem();
        console.log('Init result:', JSON.stringify(initResult, null, 2));
        
        // Test getting available tools
        console.log('\nGetting available tools...');
        const tools = llmHelper.getAvailableTools();
        console.log(`Found ${tools.length} tools:`);
        tools.forEach(tool => {
            console.log(`  - ${tool.name} (${tool.category}): ${tool.description}`);
        });

        // Test 2: Tool Execution
        console.log('\n2. Testing Tool Execution');
        console.log('==========================');

        if (tools.length > 0) {
            // Test text processor tool
            const textTool = tools.find(t => t.name === 'text-processor');
            if (textTool) {
                console.log('\nTesting TextProcessorTool...');
                
                // Test uppercase operation
                const uppercaseResult = await llmHelper.executeTool('text-processor', {
                    text: 'Hello World!',
                    operation: 'uppercase'
                });
                console.log('Uppercase result:', JSON.stringify(uppercaseResult, null, 2));

                // Test word count operation
                const wordCountResult = await llmHelper.executeTool('text-processor', {
                    text: 'The quick brown fox jumps over the lazy dog.',
                    operation: 'count-words'
                });
                console.log('Word count result:', JSON.stringify(wordCountResult, null, 2));

                // Test sentiment analysis
                const sentimentResult = await llmHelper.executeTool('text-processor', {
                    text: 'I love this amazing tool! It works great.',
                    operation: 'sentiment-analysis'
                });
                console.log('Sentiment result:', JSON.stringify(sentimentResult, null, 2));
            }

            // Test data analyzer tool
            const dataTool = tools.find(t => t.name === 'data-analyzer');
            if (dataTool) {
                console.log('\nTesting DataAnalyzerTool...');
                
                // Test descriptive statistics
                const statsResult = await llmHelper.executeTool('data-analyzer', {
                    data: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
                    operation: 'descriptive-stats'
                });
                console.log('Stats result:', JSON.stringify(statsResult, null, 2));

                // Test outlier detection
                const outlierResult = await llmHelper.executeTool('data-analyzer', {
                    data: [1, 2, 3, 4, 5, 100, 6, 7, 8, 9],
                    operation: 'outliers'
                });
                console.log('Outlier result:', JSON.stringify(outlierResult, null, 2));
            }

            // Test file manager tool
            const fileTool = tools.find(t => t.name === 'file-manager');
            if (fileTool) {
                console.log('\nTesting FileManagerTool...');
                
                // Test file info
                const fileInfoResult = await llmHelper.executeTool('file-manager', {
                    operation: 'file-info',
                    path: 'package.json'
                });
                console.log('File info result:', JSON.stringify(fileInfoResult, null, 2));

                // Test path analysis
                const pathResult = await llmHelper.executeTool('file-manager', {
                    operation: 'analyze-path',
                    path: '/some/example/path/file.txt'
                });
                console.log('Path analysis result:', JSON.stringify(pathResult, null, 2));
            }
        }

        // Test 3: Tool Validation
        console.log('\n3. Testing Tool Validation');
        console.log('===========================');

        if (tools.length > 0) {
            const textTool = tools.find(t => t.name === 'text-processor');
            if (textTool) {
                // Test valid parameters
                const validParams = {
                    text: 'Hello World',
                    operation: 'uppercase'
                };
                const validResult = llmHelper.validateToolParams('text-processor', validParams);
                console.log('Valid params result:', JSON.stringify(validResult, null, 2));

                // Test invalid parameters
                const invalidParams = {
                    text: 'Hello World',
                    operation: 'invalid-operation'
                };
                const invalidResult = llmHelper.validateToolParams('text-processor', invalidParams);
                console.log('Invalid params result:', JSON.stringify(invalidResult, null, 2));

                // Test missing required parameters
                const missingParams = {
                    operation: 'uppercase'
                    // missing 'text' parameter
                };
                const missingResult = llmHelper.validateToolParams('text-processor', missingParams);
                console.log('Missing params result:', JSON.stringify(missingResult, null, 2));
            }
        }

        // Test 4: Tool Schema
        console.log('\n4. Testing Tool Schema');
        console.log('======================');

        if (tools.length > 0) {
            const textTool = tools.find(t => t.name === 'text-processor');
            if (textTool) {
                const schema = llmHelper.getToolSchema('text-processor');
                console.log('Text processor schema:');
                console.log('- Name:', schema.name);
                console.log('- Description:', schema.description);
                console.log('- Parameters:', schema.parameters.length);
                console.log('- Examples:', schema.examples?.length || 0);
            }
        }

        // Test 5: Tool System Statistics
        console.log('\n5. Testing Tool System Statistics');
        console.log('==================================');

        const stats = llmHelper.getToolSystemStats();
        console.log('Tool system stats:', JSON.stringify(stats, null, 2));

        // Test 6: Enhanced Template Substitution
        console.log('\n6. Testing Enhanced Template Substitution');
        console.log('==========================================');

        const template = 'Hello {userInput}! You have {tool:availableTools} tools available. Status: {tool:toolSystemStatus}';
        const context = {
            userInput: 'ChatSG User',
            agentType: 'default'
        };

        const substituted = llmHelper.substituteTemplateVariablesWithTools(template, context);
        console.log('Template:', template);
        console.log('Substituted:', substituted);

        // Test 7: Error Handling
        console.log('\n7. Testing Error Handling');
        console.log('==========================');

        // Test non-existent tool
        const nonExistentResult = await llmHelper.executeTool('non-existent-tool', {});
        console.log('Non-existent tool result:', JSON.stringify(nonExistentResult, null, 2));

        // Test invalid tool parameters
        if (tools.length > 0) {
            const invalidTypeResult = await llmHelper.executeTool('text-processor', {
                text: 123, // should be string
                operation: 'uppercase'
            });
            console.log('Invalid type result:', JSON.stringify(invalidTypeResult, null, 2));
        }

        console.log('\n✅ Tool System Test Completed Successfully!');
        console.log('==========================================');
        
        return {
            success: true,
            toolsFound: tools.length,
            categoriesFound: [...new Set(tools.map(t => t.category))].length,
            toolSystemInitialized: initResult.success
        };

    } catch (error) {
        console.error('❌ Tool System Test Failed:', error);
        console.error('Stack trace:', error.stack);
        return {
            success: false,
            error: error.message
        };
    }
}

// Run the test
if (require.main === module) {
    testToolSystem()
        .then(result => {
            console.log('\nFinal Result:', JSON.stringify(result, null, 2));
            process.exit(result.success ? 0 : 1);
        })
        .catch(error => {
            console.error('Test execution failed:', error);
            process.exit(1);
        });
}

module.exports = { testToolSystem }; 