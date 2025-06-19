#!/usr/bin/env node
// ChatSG Backend Test Runner - Enhanced with TypeScript Support
const { spawn, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('=== ChatSG Backend Test Runner ===\n');

const tests = [
    {
        name: 'Environment Variables',
        file: 'test-env.js',
        description: 'Tests dotenv loading and environment variable configuration',
        type: 'javascript'
    },
    {
        name: 'LLM Helper',
        file: 'test-llm-helper.js',
        description: 'Tests LLM helper utility for provider configuration',
        type: 'javascript'
    },
    {
        name: 'Backend Routing',
        file: 'test-all-backends.js',
        description: 'Tests all backend routing modes (Generic, n8n, Lang)',
        type: 'javascript'
    },
    {
        name: 'Simple Backend',
        file: 'test-backend.js',
        description: 'Simple backend API test',
        type: 'javascript'
    },
    {
        name: 'AgentZero',
        file: 'test-agent-zero.js',
        description: 'Tests LangGraph AgentZero functionality (requires LLM credentials)',
        type: 'javascript'
    },
    {
        name: 'Agent Prompts',
        file: 'test-agent-prompts.js',
        description: 'Tests agent-specific prompt configuration system',
        type: 'javascript'
    },
    {
        name: 'AgentRouter',
        file: 'test-agent-router.js',
        description: 'Tests AgentRouter intelligent prompt classification functionality',
        type: 'javascript'
    },
    {
        name: 'AgentRouter Integration',
        file: 'test-agent-router-integration.js',
        description: 'Tests AgentRouter integration with AgentZero (requires LLM credentials)',
        type: 'javascript'
    },
    {
        name: 'Orchestrator LLM Integration',
        file: 'test-orchestrator-llm-integration.js',
        description: 'Tests orchestrator path with specialized LLM agents (requires LLM credentials)',
        type: 'javascript'
    }
];

// Discover TypeScript tests
function discoverTypeScriptTests() {
    const typescriptTestsDir = path.join(__dirname, 'typescript');
    const typescriptTests = [];

    if (fs.existsSync(typescriptTestsDir)) {
        const files = fs.readdirSync(typescriptTestsDir);
        
        for (const file of files) {
            if (file.endsWith('.test.ts') || file.endsWith('.spec.ts')) {
                const testName = file.replace(/\.(test|spec)\.ts$/, '');
                typescriptTests.push({
                    name: `TypeScript: ${testName}`,
                    file: path.join('typescript', file),
                    description: `TypeScript test for ${testName}`,
                    type: 'typescript'
                });
            }
        }
    }

    return typescriptTests;
}

// Check if TypeScript compiler is available
function checkTypeScriptSupport() {
    try {
        const result = spawnSync('npx', ['tsc', '--version'], { 
            stdio: 'pipe', 
            shell: true,
            timeout: 10000
        });
        console.log(`   🔍 TypeScript check: status=${result.status}, stdout="${result.stdout?.toString().trim()}", stderr="${result.stderr?.toString().trim()}"`);
        return result.status === 0;
    } catch (error) {
        console.log(`   ⚠️  TypeScript check error: ${error.message}`);
        return false;
    }
}

// Compile TypeScript test if needed
async function compileTypeScriptTest(testFile) {
    return new Promise((resolve) => {
        console.log(`   📦 Compiling TypeScript test: ${testFile}`);
        
        const compileProcess = spawn('npx', [
            'tsc', 
            testFile, 
            '--outDir', 'dist', 
            '--target', 'ES2020', 
            '--module', 'CommonJS',
            '--allowJs',
            '--esModuleInterop',
            '--skipLibCheck',
            '--noImplicitAny', 'false',
            '--moduleResolution', 'node'
        ], {
            cwd: __dirname,
            stdio: 'pipe',
            shell: true
        });
        
        let output = '';
        let errorOutput = '';
        
        compileProcess.stdout.on('data', (data) => {
            output += data.toString();
        });
        
        compileProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });
        
        compileProcess.on('close', (code) => {
            if (code === 0) {
                console.log(`   ✅ Compilation successful`);
                resolve(true);
            } else {
                console.log(`   ❌ Compilation failed (exit code: ${code}):`);
                if (errorOutput) {
                    console.log(errorOutput);
                }
                if (output) {
                    console.log(output);
                }
                resolve(false);
            }
        });
        
        compileProcess.on('error', (error) => {
            console.log(`   ❌ Compilation error: ${error.message}`);
            resolve(false);
        });
    });
}

async function runTest(test) {
    return new Promise(async (resolve) => {
        console.log(`\n🧪 Running: ${test.name}`);
        console.log(`📝 Description: ${test.description}`);
        console.log(`📁 File: ${test.file}`);
        console.log(`🔧 Type: ${test.type}`);
        console.log('─'.repeat(50));
        
        let testCommand = 'node';
        let testArgs = [test.file];
        let testCwd = __dirname;
        
        // Handle TypeScript tests
        if (test.type === 'typescript') {
            const tsSupported = checkTypeScriptSupport();
            if (!tsSupported) {
                console.log(`❌ ${test.name} - SKIPPED (TypeScript not available)`);
                resolve(false);
                return;
            }
            
            // Compile TypeScript test
            const compiled = await compileTypeScriptTest(test.file);
            if (!compiled) {
                console.log(`❌ ${test.name} - FAILED (compilation error)`);
                resolve(false);
                return;
            }
            
            // Run compiled JavaScript from backend directory so paths work
            const fileName = path.basename(test.file).replace(/\.ts$/, '.js');
            const relativePath = path.dirname(test.file);
            testArgs = [path.join('tests', 'dist', relativePath, fileName)];
            testCwd = path.dirname(__dirname); // Run from backend directory
        }
        
        const testProcess = spawn(testCommand, testArgs, {
            cwd: testCwd,
            stdio: 'inherit',
            shell: true
        });
        
        testProcess.on('close', (code) => {
            if (code === 0) {
                console.log(`✅ ${test.name} - PASSED`);
            } else {
                console.log(`❌ ${test.name} - FAILED (exit code: ${code})`);
            }
            resolve(code === 0);
        });
        
        testProcess.on('error', (error) => {
            console.error(`❌ ${test.name} - ERROR: ${error.message}`);
            resolve(false);
        });
    });
}

async function runAllTests() {
    // Discover TypeScript tests
    const typescriptTests = discoverTypeScriptTests();
    const allTests = [...tests, ...typescriptTests];
    
    console.log('Available tests:');
    allTests.forEach((test, index) => {
        console.log(`${index + 1}. ${test.name} - ${test.description} [${test.type}]`);
    });
    
    if (typescriptTests.length > 0) {
        console.log(`\n📦 TypeScript Support Check:`);
        const tsSupported = checkTypeScriptSupport();
        console.log(`   Status: ${tsSupported ? 'Available ✅' : 'Not Available ❌'}`);
        if (!tsSupported) {
            console.log('   ⚠️  TypeScript tests will be skipped. Install TypeScript: npm install -g typescript');
        }
    }
    
    console.log('\n🚀 Starting test execution...\n');
    
    const results = [];
    for (const test of allTests) {
        const passed = await runTest(test);
        results.push({ test: test.name, passed, type: test.type });
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    
    let passedCount = 0;
    let jsPassedCount = 0;
    let tsPassedCount = 0;
    let jsTotal = 0;
    let tsTotal = 0;
    
    results.forEach(result => {
        const status = result.passed ? '✅ PASSED' : '❌ FAILED';
        console.log(`${status} - ${result.test} [${result.type}]`);
        
        if (result.passed) passedCount++;
        
        if (result.type === 'javascript') {
            jsTotal++;
            if (result.passed) jsPassedCount++;
        } else if (result.type === 'typescript') {
            tsTotal++;
            if (result.passed) tsPassedCount++;
        }
    });
    
    console.log('─'.repeat(60));
    console.log(`Total: ${results.length} tests, ${passedCount} passed, ${results.length - passedCount} failed`);
    console.log(`JavaScript: ${jsPassedCount}/${jsTotal} passed`);
    console.log(`TypeScript: ${tsPassedCount}/${tsTotal} passed`);
    
    if (passedCount === results.length) {
        console.log('🎉 All tests passed!');
    } else {
        console.log('⚠️  Some tests failed. Check the output above for details.');
    }
}

// Check if specific test was requested
const testArg = process.argv[2];
if (testArg) {
    const typescriptTests = discoverTypeScriptTests();
    const allTests = [...tests, ...typescriptTests];
    
    const test = allTests.find(t => 
        t.file === testArg || 
        t.name.toLowerCase().includes(testArg.toLowerCase()) ||
        t.file.includes(testArg)
    );
    
    if (test) {
        console.log(`Running specific test: ${test.name}\n`);
        runTest(test);
    } else {
        console.log(`Test not found: ${testArg}`);
        console.log('Available tests:');
        allTests.forEach(test => console.log(`- ${test.file} (${test.name}) [${test.type}]`));
    }
} else {
    runAllTests();
} 