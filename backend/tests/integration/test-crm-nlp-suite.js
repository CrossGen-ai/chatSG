/**
 * CRM Natural Language Processing Test Suite Runner
 * 
 * Comprehensive test runner that executes all CRM NLP tests and provides
 * a consolidated report on the agent's natural language understanding capabilities
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const chalk = require('chalk');
const { spawn } = require('child_process');
const path = require('path');

console.log(chalk.blue.bold('\n=== CRM Natural Language Processing Test Suite ===\n'));
console.log(chalk.white('This comprehensive test suite evaluates the CRM agent\'s ability to understand'));
console.log(chalk.white('and process natural language queries across multiple categories.\n'));

// Test suite configuration
const testSuites = [
  {
    name: 'Latest/Recent Queries',
    file: 'test-crm-latest-leads.js',
    description: 'Tests understanding of latest, recent, and newest terminology',
    critical: true
  },
  {
    name: 'Time-Based Queries',
    file: 'test-crm-time-based.js',
    description: 'Tests understanding of time references and date ranges',
    critical: true
  },
  {
    name: 'Superlative Queries',
    file: 'test-crm-superlatives.js',
    description: 'Tests understanding of best, biggest, most valuable, etc.',
    critical: true
  },
  {
    name: 'Complex Natural Language',
    file: 'test-crm-complex-nlp.js',
    description: 'Tests handling of ambiguous, contextual, and conversational queries',
    critical: false
  }
];

// Run a single test suite
function runTestSuite(suite) {
  return new Promise((resolve) => {
    console.log(chalk.cyan(`\nRunning: ${suite.name}`));
    console.log(chalk.gray(`${suite.description}`));
    console.log(chalk.gray('─'.repeat(60)));
    
    const testPath = path.join(__dirname, suite.file);
    const startTime = Date.now();
    
    const child = spawn('node', [testPath], {
      stdio: 'pipe',
      env: process.env
    });
    
    let output = '';
    let passed = false;
    let stats = {
      passed: 0,
      failed: 0,
      total: 0,
      successRate: 0,
      avgProcessingTime: 0,
      avgConfidence: 0
    };
    
    child.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      
      // Extract stats from output
      const passedMatch = text.match(/Passed: (\d+)/);
      const failedMatch = text.match(/Failed: (\d+)/);
      const totalMatch = text.match(/Total: (\d+)/);
      const successRateMatch = text.match(/Success Rate: ([\d.]+)%/);
      const avgTimeMatch = text.match(/Average Processing Time: (\d+)ms/);
      const avgConfMatch = text.match(/Average Confidence Score: ([\d.]+)/);
      
      if (passedMatch) stats.passed = parseInt(passedMatch[1]);
      if (failedMatch) stats.failed = parseInt(failedMatch[1]);
      if (totalMatch) stats.total = parseInt(totalMatch[1]);
      if (successRateMatch) stats.successRate = parseFloat(successRateMatch[1]);
      if (avgTimeMatch) stats.avgProcessingTime = parseInt(avgTimeMatch[1]);
      if (avgConfMatch) stats.avgConfidence = parseFloat(avgConfMatch[1]);
      
      // Check if all tests passed
      if (text.includes('All tests passed!')) {
        passed = true;
      }
    });
    
    child.stderr.on('data', (data) => {
      output += data.toString();
    });
    
    child.on('close', (code) => {
      const duration = Date.now() - startTime;
      
      // Display summary for this suite
      if (passed) {
        console.log(chalk.green(`✅ ${suite.name}: ALL PASSED`));
      } else if (stats.passed > 0) {
        console.log(chalk.yellow(`⚠️  ${suite.name}: ${stats.passed}/${stats.total} PASSED (${stats.successRate}%)`));
      } else {
        console.log(chalk.red(`❌ ${suite.name}: FAILED`));
      }
      
      console.log(chalk.gray(`   Time: ${(duration / 1000).toFixed(1)}s | Avg Processing: ${stats.avgProcessingTime}ms | Avg Confidence: ${stats.avgConfidence.toFixed(2)}`));
      
      resolve({
        suite: suite.name,
        passed,
        stats,
        duration,
        output,
        exitCode: code
      });
    });
  });
}

// Main test runner
async function runAllTests() {
  console.log(chalk.white('Starting comprehensive CRM NLP test suite...'));
  console.log(chalk.white(`Running ${testSuites.length} test categories\n`));
  
  const results = [];
  const startTime = Date.now();
  
  // Run tests sequentially to avoid overwhelming the LLM
  for (const suite of testSuites) {
    const result = await runTestSuite(suite);
    results.push(result);
  }
  
  const totalDuration = Date.now() - startTime;
  
  // Calculate overall statistics
  const totalTests = results.reduce((sum, r) => sum + r.stats.total, 0);
  const totalPassed = results.reduce((sum, r) => sum + r.stats.passed, 0);
  const totalFailed = results.reduce((sum, r) => sum + r.stats.failed, 0);
  const overallSuccessRate = totalTests > 0 ? (totalPassed / totalTests * 100).toFixed(1) : 0;
  
  // Display comprehensive summary
  console.log(chalk.blue.bold('\n=== COMPREHENSIVE TEST SUMMARY ===\n'));
  
  // Suite results
  console.log(chalk.white('Test Suite Results:'));
  results.forEach((result, idx) => {
    const suite = testSuites[idx];
    const icon = result.passed ? '✅' : result.stats.passed > 0 ? '⚠️ ' : '❌';
    const color = result.passed ? chalk.green : result.stats.passed > 0 ? chalk.yellow : chalk.red;
    
    console.log(color(`${icon} ${result.suite}`));
    console.log(chalk.gray(`   Tests: ${result.stats.passed}/${result.stats.total} | Success Rate: ${result.stats.successRate}%`));
    if (result.stats.avgProcessingTime > 0) {
      console.log(chalk.gray(`   Performance: ${result.stats.avgProcessingTime}ms avg | Confidence: ${result.stats.avgConfidence.toFixed(2)} avg`));
    }
    if (suite.critical && !result.passed) {
      console.log(chalk.red(`   ⚠️  CRITICAL TEST SUITE - Requires immediate attention`));
    }
  });
  
  // Overall statistics
  console.log(chalk.blue.bold('\n=== OVERALL STATISTICS ==='));
  console.log(chalk.white(`Total Tests Run: ${totalTests}`));
  console.log(chalk.green(`Tests Passed: ${totalPassed}`));
  console.log(chalk.red(`Tests Failed: ${totalFailed}`));
  console.log(chalk.yellow(`Overall Success Rate: ${overallSuccessRate}%`));
  console.log(chalk.white(`Total Execution Time: ${(totalDuration / 1000).toFixed(1)} seconds`));
  
  // Performance analysis
  const avgProcessingTimes = results
    .filter(r => r.stats.avgProcessingTime > 0)
    .map(r => r.stats.avgProcessingTime);
  
  if (avgProcessingTimes.length > 0) {
    const overallAvgTime = avgProcessingTimes.reduce((a, b) => a + b, 0) / avgProcessingTimes.length;
    console.log(chalk.white(`Average Query Processing Time: ${overallAvgTime.toFixed(0)}ms`));
  }
  
  // Capability assessment
  console.log(chalk.blue.bold('\n=== CAPABILITY ASSESSMENT ==='));
  
  const capabilities = {
    'Time-based Understanding': results.find(r => r.suite.includes('Time-Based'))?.stats.successRate || 0,
    'Superlative Recognition': results.find(r => r.suite.includes('Superlative'))?.stats.successRate || 0,
    'Latest/Recent Queries': results.find(r => r.suite.includes('Latest/Recent'))?.stats.successRate || 0,
    'Complex Natural Language': results.find(r => r.suite.includes('Complex'))?.stats.successRate || 0
  };
  
  Object.entries(capabilities).forEach(([capability, rate]) => {
    const level = rate >= 90 ? 'Excellent' : rate >= 70 ? 'Good' : rate >= 50 ? 'Fair' : 'Needs Improvement';
    const color = rate >= 90 ? chalk.green : rate >= 70 ? chalk.yellow : chalk.red;
    console.log(color(`${capability}: ${rate}% (${level})`));
  });
  
  // Recommendations
  console.log(chalk.blue.bold('\n=== RECOMMENDATIONS ==='));
  
  const criticalFailures = results.filter((r, idx) => testSuites[idx].critical && !r.passed);
  
  if (criticalFailures.length === 0 && overallSuccessRate >= 90) {
    console.log(chalk.green('✅ The CRM agent demonstrates excellent natural language understanding!'));
    console.log(chalk.green('   It can effectively handle various query types and complexities.'));
  } else if (overallSuccessRate >= 70) {
    console.log(chalk.yellow('⚠️  The CRM agent shows good natural language capabilities but has room for improvement:'));
    
    if (criticalFailures.length > 0) {
      console.log(chalk.yellow('\n   Critical areas needing attention:'));
      criticalFailures.forEach(failure => {
        console.log(chalk.yellow(`   - ${failure.suite}: Only ${failure.stats.successRate}% success rate`));
      });
    }
    
    // Specific recommendations based on failures
    results.forEach((result) => {
      if (result.stats.successRate < 70) {
        console.log(chalk.yellow(`\n   ${result.suite} improvements needed:`));
        if (result.suite.includes('Latest')) {
          console.log(chalk.gray('   - Enhance understanding of recency terms (latest, newest, most recent)'));
          console.log(chalk.gray('   - Improve date-based sorting capabilities'));
        } else if (result.suite.includes('Time')) {
          console.log(chalk.gray('   - Better parsing of relative time references'));
          console.log(chalk.gray('   - Improve date range calculations'));
        } else if (result.suite.includes('Superlative')) {
          console.log(chalk.gray('   - Enhance ranking and sorting by various metrics'));
          console.log(chalk.gray('   - Better understanding of comparative language'));
        } else if (result.suite.includes('Complex')) {
          console.log(chalk.gray('   - Improve context understanding'));
          console.log(chalk.gray('   - Better handling of ambiguous queries'));
        }
      }
    });
  } else {
    console.log(chalk.red('❌ The CRM agent needs significant improvements in natural language understanding:'));
    console.log(chalk.red('   - Review the LLM prompts for query understanding'));
    console.log(chalk.red('   - Enhance the tool parameter generation logic'));
    console.log(chalk.red('   - Consider adding more examples to the LLM prompts'));
    console.log(chalk.red('   - Test with different LLM models for better comprehension'));
  }
  
  // Next steps
  console.log(chalk.blue.bold('\n=== NEXT STEPS ==='));
  if (totalFailed > 0) {
    console.log(chalk.white('1. Run individual test suites to debug specific failures'));
    console.log(chalk.white('2. Review the CRM workflow LLM prompts in:'));
    console.log(chalk.gray('   backend/src/agents/individual/crm/workflow.ts'));
    console.log(chalk.white('3. Check tool parameter generation in:'));
    console.log(chalk.gray('   backend/src/agents/individual/crm/nodes.ts'));
    console.log(chalk.white('4. Verify the ContactManagerTool sorting/filtering logic in:'));
    console.log(chalk.gray('   backend/src/tools/crm/ContactManagerTool.ts'));
  } else {
    console.log(chalk.green('1. All tests passing! Consider adding more edge cases'));
    console.log(chalk.green('2. Test with real production data'));
    console.log(chalk.green('3. Monitor user queries to identify new patterns'));
  }
  
  // Exit with appropriate code
  const allCriticalPassed = criticalFailures.length === 0;
  const exitCode = allCriticalPassed ? 0 : 1;
  
  console.log(chalk.blue.bold('\n=== TEST SUITE COMPLETE ===\n'));
  
  return {
    success: allCriticalPassed,
    overallSuccessRate,
    totalTests,
    totalPassed,
    totalFailed,
    results
  };
}

// Run the test suite
runAllTests()
  .then(summary => {
    if (summary.success) {
      console.log(chalk.green.bold('✅ CRM NLP Test Suite: PASSED (All critical tests successful)'));
    } else {
      console.log(chalk.red.bold('❌ CRM NLP Test Suite: FAILED (Critical tests need attention)'));
    }
    process.exit(summary.success ? 0 : 1);
  })
  .catch(error => {
    console.error(chalk.red.bold('\n❌ Test suite runner error:'), error);
    process.exit(1);
  });