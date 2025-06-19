/**
 * Tool System TypeScript Test Suite
 * 
 * Comprehensive tests for the tool system including:
 * - Tool registration and discovery
 * - Tool execution and validation
 * - Tool metadata management
 * - Error handling and edge cases
 */

import { 
    Tool, 
    ToolSchema, 
    ToolParams, 
    ToolResult, 
    ToolContext, 
    ToolConfig,
    ToolParameter
} from '../../src/tools/Tool';
import { ValidationResult } from '../../src/types';
import { ToolRegistry } from '../../src/tools/ToolRegistry';

// Test utilities for consistent testing patterns
let testNumber = 0;

function incrementTest(testResult: boolean): void {
    testNumber++;
}

function runTest(testName: string, testFn: () => boolean): boolean {
    try {
        const result = testFn();
        console.log(`✅ ${testName} - PASSED`);
        return result;
    } catch (error) {
        console.log(`❌ ${testName} - FAILED: ${(error as Error).message}`);
        return false;
    }
}

function runAsyncTest(testName: string, testFn: () => Promise<boolean>): Promise<boolean> {
    return testFn()
        .then(result => {
            console.log(`✅ ${testName} - PASSED`);
            return result;
        })
        .catch(error => {
            console.log(`❌ ${testName} - FAILED: ${(error as Error).message}`);
            return false;
        });
}

// Mock Tool for testing
class MockTool implements Tool {
    public readonly name: string = 'mock-tool';
    public readonly version: string = '1.0.0';
    public readonly description: string = 'A mock tool for testing';
    public readonly author?: string = 'Test Suite';
    public readonly category?: string = 'testing';
    public readonly tags?: string[] = ['mock', 'test'];

    getSchema(): ToolSchema {
        return {
            name: this.name,
            description: this.description,
            parameters: [
                {
                    name: 'input',
                    type: 'string',
                    description: 'Input text to process',
                    required: true
                },
                {
                    name: 'mode',
                    type: 'string',
                    description: 'Processing mode',
                    required: false,
                    default: 'normal',
                    enum: ['normal', 'fast', 'detailed']
                }
            ],
            returns: {
                type: 'object',
                description: 'Processed result',
                properties: {
                    output: { type: 'string' },
                    length: { type: 'number' }
                }
            }
        };
    }

    validate(params: ToolParams): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!params.input || typeof params.input !== 'string') {
            errors.push('input parameter is required and must be a string');
        }

        if (params.mode && !['normal', 'fast', 'detailed'].includes(params.mode)) {
            errors.push('mode must be one of: normal, fast, detailed');
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    async execute(params: ToolParams, context?: ToolContext): Promise<ToolResult> {
        const validation = this.validate(params);
        if (!validation.valid) {
            return {
                success: false,
                error: `Validation failed: ${validation.errors.join(', ')}`,
                metadata: {
                    toolName: this.name,
                    timestamp: new Date().toISOString()
                }
            };
        }

        const input = params.input as string;
        const mode = params.mode || 'normal';

        // Simulate processing
        await new Promise(resolve => setTimeout(resolve, 10));

        let output: string;
        switch (mode) {
            case 'fast':
                output = input.toUpperCase();
                break;
            case 'detailed':
                output = `Processed: ${input} (length: ${input.length}, mode: ${mode})`;
                break;
            default:
                output = `Processed: ${input}`;
        }

        return {
            success: true,
            data: {
                output,
                length: output.length,
                mode
            },
            message: 'Processing completed successfully',
            metadata: {
                executionTime: 10,
                toolName: this.name,
                toolVersion: this.version,
                timestamp: new Date().toISOString(),
                context: context?.sessionId ? { sessionId: context.sessionId } : undefined
            }
        };
    }

    getConfig(): ToolConfig {
        return {
            enabled: true,
            timeout: 5000,
            retries: 1,
            cacheResults: false
        };
    }

    isReady(): boolean {
        return true;
    }

    getHealth() {
        return {
            status: 'healthy' as const,
            message: 'Mock tool is operating normally'
        };
    }
}

// Test utilities for tool system testing
class ToolSystemTestUtils {
    static async createTestRegistry(): Promise<ToolRegistry> {
        const registry = ToolRegistry.getInstance();
        await registry.clear();
        return registry;
    }

    static createMockTool(name: string = 'mock-tool'): MockTool {
        const tool = new MockTool();
        (tool as any).name = name; // Override name for testing
        return tool;
    }

    static async waitForAsync(ms: number = 10): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    static validateToolResult(result: ToolResult, expectedSuccess: boolean = true): boolean {
        if (result.success !== expectedSuccess) {
            throw new Error(`Expected success: ${expectedSuccess}, got: ${result.success}`);
        }

        if (expectedSuccess && !result.data) {
            throw new Error('Expected data in successful result');
        }

        if (!expectedSuccess && !result.error) {
            throw new Error('Expected error in failed result');
        }

        return true;
    }
}

/**
 * Main test suite
 */
async function runToolSystemTests(): Promise<boolean> {
    console.log('=== Tool System TypeScript Test Suite ===\n');

    const results: boolean[] = [];
    let testCount = 0;

    // Test 1: ToolRegistry Singleton Pattern
    incrementTest(runTest('ToolRegistry Singleton Pattern', () => {
        const registry1 = ToolRegistry.getInstance();
        const registry2 = ToolRegistry.getInstance();
        
        if (registry1 !== registry2) {
            throw new Error('ToolRegistry should be a singleton');
        }
        
        return true;
    }));

    // Test 2: Tool Registration
    results.push(await runAsyncTest('Tool Registration', async () => {
        const registry = await ToolSystemTestUtils.createTestRegistry();
        const mockTool = new MockTool();
        
        await registry.registerTool(mockTool);
        
        const retrievedTool = registry.getTool('mock-tool');
        if (!retrievedTool) {
            throw new Error('Tool not found after registration');
        }
        
        if (retrievedTool !== mockTool) {
            throw new Error('Retrieved tool is not the same instance');
        }
        
        return true;
    }));

    // Test 3: Tool Schema Validation
    results.push(await runAsyncTest('Tool Schema Validation', async () => {
        const registry = await ToolSystemTestUtils.createTestRegistry();
        const mockTool = new MockTool();
        
        await registry.registerTool(mockTool);
        
        const schema = mockTool.getSchema();
        
        if (schema.name !== 'mock-tool') {
            throw new Error('Schema name mismatch');
        }
        
        if (!schema.parameters || schema.parameters.length === 0) {
            throw new Error('Schema should have parameters');
        }
        
        const inputParam = schema.parameters.find(p => p.name === 'input');
        if (!inputParam || !inputParam.required) {
            throw new Error('Input parameter should be required');
        }
        
        return true;
    }));

    // Test 4: Tool Parameter Validation
    results.push(await runAsyncTest('Tool Parameter Validation', async () => {
        const mockTool = new MockTool();
        
        // Valid parameters
        const validParams = { input: 'test input', mode: 'normal' };
        const validResult = mockTool.validate(validParams);
        
        if (!validResult.valid) {
            throw new Error('Valid parameters should pass validation');
        }
        
        // Invalid parameters
        const invalidParams = { mode: 'invalid' }; // missing required input
        const invalidResult = mockTool.validate(invalidParams);
        
        if (invalidResult.valid) {
            throw new Error('Invalid parameters should fail validation');
        }
        
        if (invalidResult.errors.length === 0) {
            throw new Error('Validation should return errors for invalid parameters');
        }
        
        return true;
    }));

    // Test 5: Tool Execution
    results.push(await runAsyncTest('Tool Execution', async () => {
        const registry = await ToolSystemTestUtils.createTestRegistry();
        const mockTool = new MockTool();
        
        await registry.registerTool(mockTool);
        
        const params = { input: 'Hello World', mode: 'normal' };
        const context: ToolContext = { sessionId: 'test-session' };
        
        const result = await mockTool.execute(params, context);
        
        ToolSystemTestUtils.validateToolResult(result, true);
        
        if (!result.data || !result.data.output) {
            throw new Error('Result should contain output data');
        }
        
        return true;
    }));

    // Test 6: Tool Execution via Registry
    results.push(await runAsyncTest('Tool Execution via Registry', async () => {
        const registry = await ToolSystemTestUtils.createTestRegistry();
        const mockTool = new MockTool();
        
        await registry.registerTool(mockTool);
        
        const params = { input: 'Registry Test', mode: 'fast' };
        const context: ToolContext = { sessionId: 'registry-test' };
        
        const result = await registry.executeTool('mock-tool', params, context);
        
        ToolSystemTestUtils.validateToolResult(result, true);
        
        if (result.data?.output !== 'REGISTRY TEST') {
            throw new Error('Fast mode should return uppercase output');
        }
        
        return true;
    }));

    // Test 7: Tool Discovery and Listing
    results.push(await runAsyncTest('Tool Discovery and Listing', async () => {
        const registry = await ToolSystemTestUtils.createTestRegistry();
        const mockTool1 = ToolSystemTestUtils.createMockTool('tool-1');
        const mockTool2 = ToolSystemTestUtils.createMockTool('tool-2');
        
        await registry.registerTool(mockTool1);
        await registry.registerTool(mockTool2);
        
        const tools = registry.listTools();
        
        if (tools.length < 2) {
            throw new Error('Should have at least 2 registered tools');
        }
        
        const toolNames = tools.map(t => t.name);
        if (!toolNames.includes('tool-1') || !toolNames.includes('tool-2')) {
            throw new Error('Registered tools should be in the list');
        }
        
        return true;
    }));

    // Test 8: Tool Search and Filtering
    results.push(await runAsyncTest('Tool Search and Filtering', async () => {
        const registry = await ToolSystemTestUtils.createTestRegistry();
        const mockTool = new MockTool();
        
        await registry.registerTool(mockTool);
        
        // Search by category
        const testingTools = registry.findTools({ category: 'testing' });
        if (testingTools.length === 0) {
            throw new Error('Should find tools by category');
        }
        
        // Search by tags
        const mockTools = registry.findTools({ tags: ['mock'] });
        if (mockTools.length === 0) {
            throw new Error('Should find tools by tags');
        }
        
        // Search by name
        const namedTools = registry.findTools({ name: 'mock-tool' });
        if (namedTools.length === 0) {
            throw new Error('Should find tools by name');
        }
        
        return true;
    }));

    // Test 9: Tool Error Handling
    results.push(await runAsyncTest('Tool Error Handling', async () => {
        const registry = await ToolSystemTestUtils.createTestRegistry();
        const mockTool = new MockTool();
        
        await registry.registerTool(mockTool);
        
        // Test execution with invalid parameters
        const invalidParams = { mode: 'invalid' }; // missing required input
        const result = await registry.executeTool('mock-tool', invalidParams);
        
        ToolSystemTestUtils.validateToolResult(result, false);
        
        if (!result.error?.includes('Validation failed')) {
            throw new Error('Should return validation error');
        }
        
        return true;
    }));

    // Test 10: Tool Unregistration
    results.push(await runAsyncTest('Tool Unregistration', async () => {
        const registry = await ToolSystemTestUtils.createTestRegistry();
        const mockTool = new MockTool();
        
        await registry.registerTool(mockTool);
        
        // Verify tool is registered
        if (!registry.getTool('mock-tool')) {
            throw new Error('Tool should be registered');
        }
        
        // Unregister tool
        const unregistered = registry.unregisterTool('mock-tool');
        if (!unregistered) {
            throw new Error('Unregistration should succeed');
        }
        
        // Verify tool is no longer available
        if (registry.getTool('mock-tool')) {
            throw new Error('Tool should be unregistered');
        }
        
        return true;
    }));

    // Test 11: Tool Configuration
    results.push(await runAsyncTest('Tool Configuration', async () => {
        const mockTool = new MockTool();
        const config = mockTool.getConfig();
        
        if (!config.enabled) {
            throw new Error('Tool should be enabled by default');
        }
        
        if (!config.timeout || config.timeout <= 0) {
            throw new Error('Tool should have a positive timeout');
        }
        
        return true;
    }));

    // Test 12: Tool Health Check
    results.push(await runAsyncTest('Tool Health Check', async () => {
        const mockTool = new MockTool();
        
        if (!mockTool.isReady || !mockTool.isReady()) {
            throw new Error('Tool should be ready');
        }
        
        if (mockTool.getHealth) {
            const health = mockTool.getHealth();
            if (health.status !== 'healthy') {
                throw new Error('Tool should be healthy');
            }
        }
        
        return true;
    }));

    // Calculate results
    const passedTests = results.filter(r => r).length;
    const totalTests = results.length;

    console.log('\n' + '='.repeat(60));
    console.log('📊 TOOL SYSTEM TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${totalTests - passedTests}`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

    if (passedTests === totalTests) {
        console.log('🎉 All tool system tests passed!');
    } else {
        console.log('⚠️  Some tool system tests failed.');
    }

    return passedTests === totalTests;
}

// Run tests if this file is executed directly
if (require.main === module) {
    runToolSystemTests()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('Test execution failed:', error);
            process.exit(1);
        });
}

// Export test utilities for reuse
export { ToolSystemTestUtils };
export default runToolSystemTests; 