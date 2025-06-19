/**
 * TypeScript Test Runner
 * 
 * Comprehensive test runner for all TypeScript tests in the new architecture.
 * Provides detailed reporting, performance metrics, and test coverage analysis.
 */

import { testAgentRegistry } from './agent-registry.test';
import { testToolSystem } from './tool-system.test';
import { testStateManagement } from './state-management.test';
import { testOrchestrator } from './orchestrator.test';
import { testIntegration } from './integration.test';

interface TestSuite {
    name: string;
    description: string;
    testFunction: () => Promise<void>;
    category: string;
    dependencies?: string[];
}

interface TestResult {
    suite: string;
    passed: boolean;
    duration: number;
    error?: string;
    category: string;
}

interface TestReport {
    totalSuites: number;
    passedSuites: number;
    failedSuites: number;
    totalDuration: number;
    results: TestResult[];
    categorySummary: Record<string, { passed: number; total: number; duration: number }>;
}

class TypeScriptTestRunner {
    private testSuites: TestSuite[] = [
        {
            name: 'AgentRegistry',
            description: 'Tests for agent registration, discovery, and management',
            testFunction: testAgentRegistry,
            category: 'Core Components'
        },
        {
            name: 'ToolSystem',
            description: 'Tests for tool registry, execution, and management',
            testFunction: testToolSystem,
            category: 'Core Components'
        },
        {
            name: 'StateManagement',
            description: 'Tests for session state, persistence, and memory management',
            testFunction: testStateManagement,
            category: 'Core Components'
        },
        {
            name: 'Orchestrator',
            description: 'Tests for agent orchestration, routing, and coordination',
            testFunction: testOrchestrator,
            category: 'Orchestration',
            dependencies: ['AgentRegistry']
        },
        {
            name: 'Integration',
            description: 'End-to-end integration tests for the complete system',
            testFunction: testIntegration,
            category: 'Integration',
            dependencies: ['AgentRegistry', 'ToolSystem', 'StateManagement', 'Orchestrator']
        }
    ];

    async runSingleTest(suite: TestSuite): Promise<TestResult> {
        console.log(`\n🚀 Starting ${suite.name} test suite...`);
        console.log(`📝 ${suite.description}`);
        console.log('─'.repeat(80));

        const startTime = Date.now();
        let passed = false;
        let error: string | undefined;

        try {
            await suite.testFunction();
            passed = true;
            console.log(`✅ ${suite.name} test suite completed successfully`);
        } catch (err) {
            passed = false;
            error = (err as Error).message;
            console.log(`❌ ${suite.name} test suite failed: ${error}`);
        }

        const duration = Date.now() - startTime;
        console.log(`⏱️  Duration: ${duration}ms`);

        return {
            suite: suite.name,
            passed,
            duration,
            error,
            category: suite.category
        };
    }

    async runAllTests(): Promise<TestReport> {
        console.log('🧪 TypeScript Test Runner - New Architecture Validation');
        console.log('='.repeat(80));
        console.log(`📋 Running ${this.testSuites.length} test suites...`);
        console.log(`🏗️  Testing: Agent Registry, Tool System, State Management, Orchestrator, Integration`);
        console.log('='.repeat(80));

        const results: TestResult[] = [];
        const startTime = Date.now();

        // Run tests in dependency order
        const executionOrder = this.resolveDependencies();
        
        for (const suite of executionOrder) {
            const result = await this.runSingleTest(suite);
            results.push(result);

            // Stop on critical failures (for integration tests)
            if (!result.passed && suite.category === 'Core Components') {
                console.log(`\n⚠️  Critical test failure in ${suite.name}. Stopping execution.`);
                break;
            }
        }

        const totalDuration = Date.now() - startTime;
        const report = this.generateReport(results, totalDuration);
        this.printReport(report);

        return report;
    }

    private resolveDependencies(): TestSuite[] {
        const resolved: TestSuite[] = [];
        const remaining = [...this.testSuites];

        while (remaining.length > 0) {
            const readySuites = remaining.filter(suite => {
                if (!suite.dependencies) return true;
                return suite.dependencies.every(dep => 
                    resolved.some(r => r.name === dep)
                );
            });

            if (readySuites.length === 0) {
                throw new Error('Circular dependency detected in test suites');
            }

            // Add ready suites to resolved list
            readySuites.forEach(suite => {
                resolved.push(suite);
                const index = remaining.indexOf(suite);
                remaining.splice(index, 1);
            });
        }

        return resolved;
    }

    private generateReport(results: TestResult[], totalDuration: number): TestReport {
        const passedSuites = results.filter(r => r.passed).length;
        const failedSuites = results.length - passedSuites;

        // Generate category summary
        const categorySummary: Record<string, { passed: number; total: number; duration: number }> = {};
        
        for (const result of results) {
            if (!categorySummary[result.category]) {
                categorySummary[result.category] = { passed: 0, total: 0, duration: 0 };
            }
            
            categorySummary[result.category].total++;
            categorySummary[result.category].duration += result.duration;
            
            if (result.passed) {
                categorySummary[result.category].passed++;
            }
        }

        return {
            totalSuites: results.length,
            passedSuites,
            failedSuites,
            totalDuration,
            results,
            categorySummary
        };
    }

    private printReport(report: TestReport): void {
        console.log('\n' + '='.repeat(80));
        console.log('📊 TYPESCRIPT TEST SUITE REPORT');
        console.log('='.repeat(80));

        // Overall summary
        console.log(`📈 Overall Results:`);
        console.log(`   Total Test Suites: ${report.totalSuites}`);
        console.log(`   Passed: ${report.passedSuites} ✅`);
        console.log(`   Failed: ${report.failedSuites} ❌`);
        console.log(`   Success Rate: ${((report.passedSuites / report.totalSuites) * 100).toFixed(1)}%`);
        console.log(`   Total Duration: ${report.totalDuration}ms (${(report.totalDuration / 1000).toFixed(2)}s)`);

        // Category breakdown
        console.log(`\n📋 Category Breakdown:`);
        for (const [category, stats] of Object.entries(report.categorySummary)) {
            const successRate = (stats.passed / stats.total) * 100;
            console.log(`   ${category}:`);
            console.log(`     ${stats.passed}/${stats.total} passed (${successRate.toFixed(1)}%)`);
            console.log(`     Duration: ${stats.duration}ms`);
        }

        // Individual test results
        console.log(`\n🧪 Individual Test Suite Results:`);
        for (const result of report.results) {
            const status = result.passed ? '✅ PASSED' : '❌ FAILED';
            const duration = `${result.duration}ms`;
            console.log(`   ${status} - ${result.suite} (${duration}) [${result.category}]`);
            
            if (!result.passed && result.error) {
                console.log(`     Error: ${result.error}`);
            }
        }

        // Performance analysis
        console.log(`\n⚡ Performance Analysis:`);
        const sortedByDuration = [...report.results].sort((a, b) => b.duration - a.duration);
        console.log(`   Slowest Test: ${sortedByDuration[0].suite} (${sortedByDuration[0].duration}ms)`);
        console.log(`   Fastest Test: ${sortedByDuration[sortedByDuration.length - 1].suite} (${sortedByDuration[sortedByDuration.length - 1].duration}ms)`);
        
        const avgDuration = report.totalDuration / report.totalSuites;
        console.log(`   Average Duration: ${avgDuration.toFixed(2)}ms`);

        // Final verdict
        console.log('\n' + '='.repeat(80));
        if (report.passedSuites === report.totalSuites) {
            console.log('🎉 ALL TYPESCRIPT TESTS PASSED!');
            console.log('🏗️  NEW ARCHITECTURE FULLY VALIDATED AND OPERATIONAL!');
            console.log('✨ The enhanced testing framework is working correctly.');
        } else {
            console.log('⚠️  SOME TYPESCRIPT TESTS FAILED');
            console.log('🔧 Please review the failed tests and fix any issues.');
            
            const failedTests = report.results.filter(r => !r.passed);
            console.log(`📋 Failed Tests: ${failedTests.map(t => t.suite).join(', ')}`);
        }
        console.log('='.repeat(80));
    }

    async runSpecificTest(testName: string): Promise<void> {
        const suite = this.testSuites.find(s => 
            s.name.toLowerCase() === testName.toLowerCase() ||
            s.name.toLowerCase().includes(testName.toLowerCase())
        );

        if (!suite) {
            console.log(`❌ Test suite '${testName}' not found.`);
            console.log(`Available test suites: ${this.testSuites.map(s => s.name).join(', ')}`);
            return;
        }

        console.log(`🎯 Running specific test suite: ${suite.name}`);
        const result = await this.runSingleTest(suite);
        
        console.log('\n' + '─'.repeat(60));
        if (result.passed) {
            console.log(`✅ ${suite.name} test completed successfully!`);
        } else {
            console.log(`❌ ${suite.name} test failed: ${result.error}`);
            process.exit(1);
        }
    }

    listAvailableTests(): void {
        console.log('📋 Available TypeScript Test Suites:');
        console.log('─'.repeat(60));
        
        for (const suite of this.testSuites) {
            console.log(`🧪 ${suite.name}`);
            console.log(`   Description: ${suite.description}`);
            console.log(`   Category: ${suite.category}`);
            if (suite.dependencies) {
                console.log(`   Dependencies: ${suite.dependencies.join(', ')}`);
            }
            console.log();
        }
    }
}

// Main execution
async function main(): Promise<void> {
    const runner = new TypeScriptTestRunner();
    const args = process.argv.slice(2);

    if (args.length === 0) {
        // Run all tests
        const report = await runner.runAllTests();
        
        // Exit with appropriate code
        if (report.passedSuites === report.totalSuites) {
            process.exit(0);
        } else {
            process.exit(1);
        }
    } else if (args[0] === '--list' || args[0] === '-l') {
        // List available tests
        runner.listAvailableTests();
    } else {
        // Run specific test
        const testName = args[0];
        await runner.runSpecificTest(testName);
    }
}

// Run if this file is executed directly
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Test runner failed:', error.message);
        process.exit(1);
    });
}

export { TypeScriptTestRunner }; 