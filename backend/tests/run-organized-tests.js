#!/usr/bin/env node
/**
 * Organized Test Runner for ChatSG Backend
 * Runs tests from the new organized structure
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 ChatSG Backend Test Suite\n');

const testCategories = [
    {
        name: '🔧 Utility Tests',
        tests: [
            { file: 'utils/test-env.js', desc: 'Environment configuration' }
        ]
    },
    {
        name: '📦 Unit Tests',
        tests: [
            { file: 'unit/test-llm-helper.js', desc: 'LLM provider abstraction' },
            { file: 'unit/test-backend.js', desc: 'Backend API basics' },
            { file: 'unit/test-tool-system.js', desc: 'Tool system functionality' }
        ]
    },
    {
        name: '🤖 Agent Tests',
        tests: [
            { file: 'agents/test-agent-architecture.js', desc: 'Agent architecture' },
            { file: 'agents/test-agent-tracking.js', desc: 'Agent interaction tracking' }
        ]
    },
    {
        name: '💾 Memory & Storage Tests',
        tests: [
            { file: 'memory/test-state-management.js', desc: 'State management system' },
            { file: 'memory/test-chat-persistence.js', desc: 'JSONL chat persistence' }
        ]
    },
    {
        name: '🔗 Integration Tests',
        tests: [
            { file: 'integration/test-orchestrator.js', desc: 'Agent orchestration' }
        ]
    }
];

let totalTests = 0;
let passedTests = 0;
let failedTests = [];

async function runTest(testPath, description) {
    return new Promise((resolve) => {
        console.log(`\n📋 Running: ${description}`);
        console.log(`   File: ${testPath}`);
        
        const child = spawn('node', [testPath], {
            cwd: __dirname,
            stdio: 'pipe'
        });
        
        let output = '';
        child.stdout.on('data', (data) => {
            output += data.toString();
        });
        
        child.stderr.on('data', (data) => {
            output += data.toString();
        });
        
        child.on('close', (code) => {
            totalTests++;
            if (code === 0) {
                console.log('   ✅ PASSED');
                passedTests++;
            } else {
                console.log('   ❌ FAILED');
                console.log('   Output:', output.slice(0, 200) + '...');
                failedTests.push({ test: testPath, output });
            }
            resolve();
        });
    });
}

async function runAllTests() {
    const startTime = Date.now();
    
    for (const category of testCategories) {
        console.log(`\n${category.name}`);
        console.log('=' .repeat(40));
        
        for (const test of category.tests) {
            await runTest(test.file, test.desc);
        }
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('\n📊 Test Summary');
    console.log('=' .repeat(40));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests} ✅`);
    console.log(`Failed: ${failedTests.length} ❌`);
    console.log(`Duration: ${duration}s`);
    
    if (failedTests.length > 0) {
        console.log('\n❌ Failed Tests:');
        failedTests.forEach(({ test, output }) => {
            console.log(`\n- ${test}`);
            console.log('  Error:', output.slice(0, 300));
        });
        process.exit(1);
    } else {
        console.log('\n🎉 All tests passed!');
    }
}

// Check if we should run specific category
const args = process.argv.slice(2);
if (args.includes('--neo4j')) {
    console.log('Running Neo4j tests only...');
    runTest('memory/neo4j-status.js', 'Neo4j connection status').then(() => {
        runTest('memory/test-mem0-with-neo4j.js', 'Mem0 + Neo4j integration');
    });
} else if (args.includes('--quick')) {
    console.log('Running quick tests only...');
    runTest('utils/test-env.js', 'Environment check').then(() => {
        runTest('memory/neo4j-status.js', 'Neo4j status');
    });
} else {
    runAllTests();
}