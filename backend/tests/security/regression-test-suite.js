const { spawn } = require('child_process');
const path = require('path');

const tests = [
  {
    name: 'Authentication Tests',
    file: 'test-auth-regression.js',
    critical: true
  },
  {
    name: 'CSRF Protection Tests',
    file: 'test-csrf-regression.js',
    critical: true
  },
  {
    name: 'Body Parsing Tests',
    file: 'test-body-parsing.js',
    critical: true
  },
  {
    name: 'SSE Streaming Tests',
    file: 'test-sse-regression.js',
    critical: true
  },
  {
    name: 'Input Sanitization Tests',
    file: 'test-sanitization.js',
    critical: false
  },
  {
    name: 'Rate Limiting Tests',
    file: 'test-rate-limiting.js',
    critical: false
  }
];

async function runTest(test) {
  return new Promise((resolve, reject) => {
    console.log(`\n🧪 Running ${test.name}...`);
    
    const child = spawn('node', [path.join(__dirname, test.file)], {
      stdio: 'inherit'
    });
    
    child.on('exit', (code) => {
      if (code === 0) {
        console.log(`✅ ${test.name} passed`);
        resolve(true);
      } else {
        console.error(`❌ ${test.name} failed`);
        resolve(false);
      }
    });
    
    child.on('error', (err) => {
      console.error(`❌ ${test.name} error:`, err);
      resolve(false);
    });
  });
}

async function runAllTests() {
  console.log('🚀 Starting Security Regression Test Suite\n');
  console.log('This suite tests critical security features to prevent regressions.\n');
  
  const results = [];
  let criticalFailure = false;
  
  for (const test of tests) {
    const passed = await runTest(test);
    results.push({ ...test, passed });
    
    if (!passed && test.critical) {
      criticalFailure = true;
    }
  }
  
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  
  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    const critical = result.critical ? ' [CRITICAL]' : '';
    console.log(`${icon} ${result.name}${critical}`);
  });
  
  const totalTests = results.length;
  const passedTests = results.filter(r => r.passed).length;
  const failedTests = totalTests - passedTests;
  
  console.log('\n📈 Statistics:');
  console.log(`Total: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  
  if (criticalFailure) {
    console.error('\n🚨 CRITICAL TESTS FAILED! Do not deploy!');
    process.exit(1);
  } else if (failedTests > 0) {
    console.warn('\n⚠️  Some tests failed, but no critical issues.');
    process.exit(0);
  } else {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { runAllTests };