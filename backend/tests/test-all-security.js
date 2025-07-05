#!/usr/bin/env node

/**
 * Comprehensive Security Test Suite
 * Runs all security-related tests to ensure the system is secure before deployment
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// ANSI color codes for output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

// Security test files to run
const securityTests = [
    'security/middleware.test.js',
    'security/csrf.test.js',
    'security/chat-endpoint-security.test.js',
    'security/rate-limit-simple.test.js',
    'security/rate-limit-burst.test.js',
    'security/rate-limit-proof.test.js',
    'test-sse-done.js',
    'test-csrf-only.js',
    'auth/test-chat-title.js'
];

// Track test results
const results = {
    passed: [],
    failed: [],
    skipped: []
};

console.log(`${colors.bright}${colors.blue}🔒 COMPREHENSIVE SECURITY TEST SUITE${colors.reset}`);
console.log(`${colors.cyan}Running all security tests before deployment...${colors.reset}\n`);

// Check if test files exist
function checkTestFiles() {
    console.log(`${colors.yellow}Checking test files...${colors.reset}`);
    const existingTests = [];
    const missingTests = [];
    
    securityTests.forEach(testFile => {
        const testPath = path.join(__dirname, testFile);
        if (fs.existsSync(testPath)) {
            existingTests.push(testFile);
            console.log(`${colors.green}✓${colors.reset} Found: ${testFile}`);
        } else {
            missingTests.push(testFile);
            console.log(`${colors.red}✗${colors.reset} Missing: ${testFile}`);
            results.skipped.push(testFile);
        }
    });
    
    console.log(`\n${colors.cyan}Found ${existingTests.length} of ${securityTests.length} test files${colors.reset}\n`);
    return existingTests;
}

// Run a single test file
function runTest(testFile) {
    return new Promise((resolve, reject) => {
        console.log(`${colors.bright}${colors.blue}Running ${testFile}...${colors.reset}`);
        
        const testPath = path.join(__dirname, testFile);
        const startTime = Date.now();
        
        const child = spawn('node', [testPath], {
            stdio: 'pipe',
            env: { ...process.env, NODE_ENV: 'test' }
        });
        
        let output = '';
        let errorOutput = '';
        
        child.stdout.on('data', (data) => {
            output += data.toString();
            process.stdout.write(data);
        });
        
        child.stderr.on('data', (data) => {
            errorOutput += data.toString();
            process.stderr.write(data);
        });
        
        child.on('close', (code) => {
            const duration = Date.now() - startTime;
            
            if (code === 0) {
                console.log(`${colors.green}✓ ${testFile} passed (${duration}ms)${colors.reset}\n`);
                results.passed.push({ file: testFile, duration });
                resolve();
            } else {
                console.log(`${colors.red}✗ ${testFile} failed with code ${code} (${duration}ms)${colors.reset}\n`);
                results.failed.push({ 
                    file: testFile, 
                    code, 
                    duration,
                    error: errorOutput || 'No error output'
                });
                resolve(); // Don't reject to continue running other tests
            }
        });
        
        child.on('error', (error) => {
            console.error(`${colors.red}Failed to run ${testFile}: ${error.message}${colors.reset}\n`);
            results.failed.push({ 
                file: testFile, 
                error: error.message,
                duration: Date.now() - startTime
            });
            resolve();
        });
    });
}

// Security checks beyond tests
async function performAdditionalSecurityChecks() {
    console.log(`${colors.bright}${colors.blue}Performing additional security checks...${colors.reset}`);
    
    const checks = [];
    
    // Check 1: Ensure .env is not tracked (check parent directory)
    const gitignorePath = path.join(__dirname, '../../.gitignore');
    if (!fs.existsSync(gitignorePath)) {
        checks.push({ name: '.gitignore missing', status: 'failed' });
    } else {
        const gitignore = fs.readFileSync(gitignorePath, 'utf8');
        if (gitignore.includes('.env')) {
            checks.push({ name: '.env in .gitignore', status: 'passed' });
        } else {
            checks.push({ name: '.env not in .gitignore', status: 'failed' });
        }
    }
    
    // Check 2: Security headers configured
    const securityConfigPath = path.join(__dirname, '../config/security.config.js');
    if (fs.existsSync(securityConfigPath)) {
        checks.push({ name: 'Security config exists', status: 'passed' });
    } else {
        checks.push({ name: 'Security config missing', status: 'failed' });
    }
    
    // Check 3: HTTPS in production
    if (process.env.NODE_ENV === 'production' && !process.env.USE_HTTPS) {
        checks.push({ name: 'HTTPS not enabled in production', status: 'warning' });
    }
    
    // Display results
    checks.forEach(check => {
        const icon = check.status === 'passed' ? `${colors.green}✓` : 
                     check.status === 'warning' ? `${colors.yellow}⚠` : 
                     `${colors.red}✗`;
        console.log(`${icon} ${check.name}${colors.reset}`);
    });
    
    console.log();
    return checks;
}

// Main test runner
async function runAllTests() {
    const startTime = Date.now();
    
    // Check which test files exist
    const existingTests = checkTestFiles();
    
    // Run each test sequentially
    for (const testFile of existingTests) {
        try {
            await runTest(testFile);
        } catch (error) {
            console.error(`${colors.red}Unexpected error running ${testFile}: ${error.message}${colors.reset}`);
            results.failed.push({ file: testFile, error: error.message });
        }
    }
    
    // Perform additional security checks
    const additionalChecks = await performAdditionalSecurityChecks();
    
    // Display summary
    const totalDuration = Date.now() - startTime;
    console.log(`${colors.bright}${colors.blue}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.bright}SECURITY TEST SUMMARY${colors.reset}`);
    console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}\n`);
    
    console.log(`Total time: ${colors.cyan}${totalDuration}ms${colors.reset}`);
    console.log(`Tests run: ${colors.cyan}${existingTests.length}${colors.reset}`);
    console.log(`Passed: ${colors.green}${results.passed.length}${colors.reset}`);
    console.log(`Failed: ${colors.red}${results.failed.length}${colors.reset}`);
    console.log(`Skipped: ${colors.yellow}${results.skipped.length}${colors.reset}\n`);
    
    // Detailed results
    if (results.passed.length > 0) {
        console.log(`${colors.green}✓ PASSED TESTS:${colors.reset}`);
        results.passed.forEach(test => {
            console.log(`  - ${test.file} (${test.duration}ms)`);
        });
        console.log();
    }
    
    if (results.failed.length > 0) {
        console.log(`${colors.red}✗ FAILED TESTS:${colors.reset}`);
        results.failed.forEach(test => {
            console.log(`  - ${test.file}`);
            if (test.error) {
                console.log(`    Error: ${test.error}`);
            }
        });
        console.log();
    }
    
    if (results.skipped.length > 0) {
        console.log(`${colors.yellow}⚠ SKIPPED TESTS (files not found):${colors.reset}`);
        results.skipped.forEach(test => {
            console.log(`  - ${test}`);
        });
        console.log();
    }
    
    // Security recommendations
    console.log(`${colors.bright}${colors.blue}SECURITY RECOMMENDATIONS:${colors.reset}`);
    if (results.failed.length === 0) {
        console.log(`${colors.green}✓ All security tests passed! System appears ready for deployment.${colors.reset}`);
    } else {
        console.log(`${colors.red}⚠ ${results.failed.length} security test(s) failed. Fix these issues before deployment:${colors.reset}`);
        results.failed.forEach(test => {
            console.log(`  - Fix issues in ${test.file}`);
        });
    }
    
    // Additional recommendations based on checks
    const warnings = additionalChecks.filter(c => c.status === 'warning');
    if (warnings.length > 0) {
        console.log(`\n${colors.yellow}Additional warnings:${colors.reset}`);
        warnings.forEach(warning => {
            console.log(`  - ${warning.name}`);
        });
    }
    
    console.log(`\n${colors.cyan}Run 'npm run test:security' to re-run all security tests${colors.reset}`);
    
    // Exit with appropriate code
    process.exit(results.failed.length > 0 ? 1 : 0);
}

// Run the tests
runAllTests().catch(error => {
    console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
    process.exit(1);
});