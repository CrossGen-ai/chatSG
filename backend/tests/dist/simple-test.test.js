"use strict";
/**
 * Simple TypeScript Test
 *
 * A basic test to validate TypeScript compilation and execution
 * in the enhanced testing framework.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleTestUtils = void 0;
exports.testSimpleTypeScript = testSimpleTypeScript;
// Test utilities following existing patterns
function runTest(testName, testFunction) {
    try {
        console.log(`🧪 Test: ${testName}`);
        const result = testFunction();
        if (result === true || result === undefined) {
            console.log('✅ PASSED\n');
            return true;
        }
        else {
            console.log('❌ FAILED\n');
            return false;
        }
    }
    catch (error) {
        console.log(`❌ FAILED: ${error.message}\n`);
        return false;
    }
}
async function runAsyncTest(testName, testFunction) {
    try {
        console.log(`🧪 Test: ${testName}`);
        const result = await testFunction();
        if (result === true || result === undefined) {
            console.log('✅ PASSED\n');
            return true;
        }
        else {
            console.log('❌ FAILED\n');
            return false;
        }
    }
    catch (error) {
        console.log(`❌ FAILED: ${error.message}\n`);
        return false;
    }
}
// Simple test utilities
class SimpleTestUtils {
    static createTestData(name) {
        return {
            name,
            timestamp: new Date(),
            id: Math.floor(Math.random() * 1000)
        };
    }
    static async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    static verifyObject(obj, expectedProperties) {
        for (const prop of expectedProperties) {
            if (!(prop in obj)) {
                throw new Error(`Object missing property: ${prop}`);
            }
        }
    }
}
exports.SimpleTestUtils = SimpleTestUtils;
async function testSimpleTypeScript() {
    console.log('=== Simple TypeScript Test Suite ===\n');
    let testsPassed = 0;
    let testsTotal = 0;
    function incrementTest(passed) {
        testsTotal++;
        if (passed)
            testsPassed++;
    }
    // Test 1: Basic TypeScript Compilation
    incrementTest(runTest('Basic TypeScript Compilation', () => {
        const message = 'Hello TypeScript!';
        const numbers = [1, 2, 3, 4, 5];
        const config = {
            enabled: true,
            timeout: 5000
        };
        if (typeof message !== 'string') {
            throw new Error('Message should be a string');
        }
        if (!Array.isArray(numbers) || numbers.length !== 5) {
            throw new Error('Numbers should be an array of 5 elements');
        }
        if (!config.enabled || config.timeout !== 5000) {
            throw new Error('Config should have enabled=true and timeout=5000');
        }
        console.log('   ✅ TypeScript types working correctly');
        console.log(`   📝 Message: ${message}`);
        console.log(`   🔢 Numbers: [${numbers.join(', ')}]`);
        console.log(`   ⚙️  Config: enabled=${config.enabled}, timeout=${config.timeout}ms`);
        return true;
    }));
    // Test 2: Async/Await Support
    incrementTest(await runAsyncTest('Async/Await Support', async () => {
        const startTime = Date.now();
        await SimpleTestUtils.delay(50);
        const endTime = Date.now();
        const duration = endTime - startTime;
        if (duration < 40) {
            throw new Error('Delay should take at least 40ms');
        }
        console.log('   ✅ Async/await working correctly');
        console.log(`   ⏱️  Delay duration: ${duration}ms`);
        return true;
    }));
    // Test 3: Class and Interface Support
    incrementTest(runTest('Class and Interface Support', () => {
        const testData = SimpleTestUtils.createTestData('TestItem');
        SimpleTestUtils.verifyObject(testData, ['name', 'timestamp', 'id']);
        if (testData.name !== 'TestItem') {
            throw new Error('Test data should have correct name');
        }
        if (!(testData.timestamp instanceof Date)) {
            throw new Error('Test data should have Date timestamp');
        }
        if (typeof testData.id !== 'number') {
            throw new Error('Test data should have numeric id');
        }
        console.log('   ✅ Classes and interfaces working correctly');
        console.log(`   📊 Test data: ${JSON.stringify(testData, null, 2)}`);
        return true;
    }));
    // Test 4: Error Handling
    incrementTest(runTest('Error Handling', () => {
        try {
            SimpleTestUtils.verifyObject({ name: 'test' }, ['name', 'missing']);
            throw new Error('Should have thrown an error for missing property');
        }
        catch (error) {
            if (error.message.includes('missing property: missing')) {
                console.log('   ✅ Error handling working correctly');
                console.log(`   ⚠️  Caught expected error: ${error.message}`);
                return true;
            }
            else {
                throw error;
            }
        }
    }));
    // Test 5: Promise and Concurrent Operations
    incrementTest(await runAsyncTest('Promise and Concurrent Operations', async () => {
        const promises = [
            SimpleTestUtils.delay(30),
            SimpleTestUtils.delay(20),
            SimpleTestUtils.delay(40)
        ];
        const startTime = Date.now();
        await Promise.all(promises);
        const endTime = Date.now();
        const duration = endTime - startTime;
        // Should take around 40ms (longest delay), not 90ms (sum of delays)
        if (duration > 80) {
            throw new Error('Concurrent operations should not take sum of individual delays');
        }
        console.log('   ✅ Promise and concurrent operations working correctly');
        console.log(`   ⚡ Concurrent execution time: ${duration}ms (expected ~40ms)`);
        return true;
    }));
    // Test 6: Module Import/Export (implicit)
    incrementTest(runTest('Module Import/Export', () => {
        // The fact that we can use SimpleTestUtils demonstrates module system is working
        const testClass = SimpleTestUtils;
        if (typeof testClass.createTestData !== 'function') {
            throw new Error('Should be able to use exported class methods');
        }
        if (typeof testClass.delay !== 'function') {
            throw new Error('Should be able to use exported async methods');
        }
        console.log('   ✅ Module import/export working correctly');
        console.log('   📦 Successfully imported and used SimpleTestUtils class');
        return true;
    }));
    // Test Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SIMPLE TYPESCRIPT TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total: ${testsTotal} tests, ${testsPassed} passed, ${testsTotal - testsPassed} failed`);
    if (testsPassed === testsTotal) {
        console.log('🎉 All Simple TypeScript tests passed!');
        console.log('✨ TypeScript compilation and execution working correctly!');
    }
    else {
        console.log('⚠️  Some Simple TypeScript tests failed.');
        process.exit(1);
    }
}
// Run tests if this file is executed directly
if (require.main === module) {
    testSimpleTypeScript().catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });
}
